<script lang="ts" setup>
import ColumnOptions from '@/components/fileList/list/ColumnOptions.vue';
import SortableHeader from '@/components/fileList/list/SortableHeader.vue';
import { useLoadingState } from '@/lib/api';
import { type AnyDirectoryEntry } from '@/lib/interop';
import { dedupedComputed } from '@/lib/utils';
import { useFileSelection, useListDirQuery } from '@/pages/Files.vue';
import { useSettings } from '@/stores/useSettings';
import { Table, TableBody, TableHead, TableHeader, TableRow } from '@shadcn/table';
import { valueUpdater } from '@shadcn/table/utils';
import {
    FlexRender,
    getCoreRowModel,
    getPaginationRowModel,
    getSortedRowModel,
    useVueTable,
    type Column,
    type ColumnDef,
    type RowSelectionState,
    type SortingState
} from '@tanstack/vue-table';
import { watchImmediate } from '@vueuse/core';
import { computed, h, ref, watch, watchEffect } from 'vue';
import { useI18n } from 'vue-i18n';
import { onBeforeRouteUpdate } from 'vue-router';
import Paginator from '../Paginator.vue';
import FileListRow from './FileListRow.vue';
import LoadingTable from './LoadingTable.vue';

const fileSelection = useFileSelection();
const settings = useSettings();

const listDirQuery = useListDirQuery();

const isLoading = useLoadingState(listDirQuery.isPending);

const i18n = useI18n();

const tags = dedupedComputed(() => listDirQuery.data.value?.tags ?? []);
const tagHeaders = computed(() => {
    const tags = i18n.tm('filelist.tags');
    return Object.fromEntries(Object.entries(tags).map(([k, v]) => [k, i18n.rt(v)]));
});

const columns = computed<ColumnDef<AnyDirectoryEntry>[]>(() => {
    const getSortableHeader = (text: string, column: Column<AnyDirectoryEntry>) =>
        h(SortableHeader, {
            tag: column.id,
            text,
            column,
            onResetSort: () => resetSorting()
        });

    return [
        {
            id: 'prefix',
            size: 32,
            maxSize: 21,
            header: () => h(ColumnOptions)
        },
        {
            id: 'href',
            accessorKey: 'name',
            minSize: 300,
            header: ({ column }) => getSortableHeader(i18n.t('filename'), column)
        },
        {
            id: 'sz',
            accessorKey: 'size',
            header: ({ column }) => getSortableHeader(i18n.t('filelist.tags.sz'), column)
        },
        {
            id: 'ts',
            accessorKey: 'created',
            header: ({ column }) => getSortableHeader(i18n.t('filelist.tags.ts'), column)
        },
        ...tags.value.map((tag) => {
            return {
                id: tag,
                accessorFn: (v) => v.tags.get(tag),
                header: ({ column }) => getSortableHeader(tagHeaders.value[tag] ?? tag, column)
            } satisfies ColumnDef<AnyDirectoryEntry>;
        })
    ];
});

const sorting = ref<SortingState>([]);

function resetSorting() {
    const sortKey = listDirQuery.data.value?.sort;
    if (sortKey && sortKey !== 'href') {
        const asc = sortKey.startsWith('-');
        const id = asc ? sortKey.slice(1) : sortKey;
        sorting.value = [{ id, desc: !asc }];
    } else {
        sorting.value = [];
    }
}
watchEffect(() => resetSorting());

const rowSelectionDeduped = dedupedComputed(() =>
    Object.fromEntries(
        Array.from(fileSelection.selectedFiles.keys()).map(({ name }) => [name, true])
    )
);
const rowSelection = computed<RowSelectionState>({
    get: () => rowSelectionDeduped.value,
    set: (v) => fileSelection.setSelectedNames(Object.keys(v))
});

const data = dedupedComputed(() => listDirQuery.data.value?.entries ?? null);
const table = computed(() =>
    useVueTable({
        data: computed(() => data.value ?? []),
        state: {
            sorting: sorting.value,
            rowSelection: rowSelection.value
        },
        columns: columns.value,
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel(),
        onSortingChange: (u) => valueUpdater(u, sorting),
        getPaginationRowModel: getPaginationRowModel(),
        enableRowSelection: true,
        enableMultiRowSelection: true,
        getRowId: (r) => r.name,
        onRowSelectionChange: (u) => {
            console.log(typeof u === 'function' ? u(rowSelection.value) : u);
            valueUpdater(u, rowSelection);
        }
    })
);

const pageSizes = [50, 100, 250, 500];
const pageIndex = ref(1);

// Reset if we go to a different route since we might not have multiple pages there
onBeforeRouteUpdate(() => {
    pageIndex.value = 1;
});

watchEffect(() => table.value.setPageIndex(pageIndex.value - 1));
watchImmediate(
    () => [settings.fileView.pageSize, table.value] as const,
    ([size, table]) => table.setPageSize(size)
);

const hiddenCols = computed(() => settings.fileView.hiddenListColumns);
watch(
    () => [hiddenCols.value, table.value] as const,
    ([hiddenCols, table]) => {
        const def = Object.fromEntries(hiddenCols.map((k) => [k, false]));
        table.setColumnVisibility(def);
    },
    { deep: 2, immediate: true }
);
</script>

<template>
    <div id="wrapper">
        <LoadingTable v-if="isLoading || !table" />
        <Table v-else>
            <TableHeader>
                <TableRow v-for="headerGroup in table.getHeaderGroups()" :key="headerGroup.id">
                    <TableHead
                        v-for="header in headerGroup.headers"
                        :key="header.id"
                        :style="{ width: `${header.getSize()}px` }"
                    >
                        <FlexRender
                            v-if="!header.isPlaceholder"
                            :render="header.column.columnDef.header"
                            :props="header.getContext()"
                        />
                    </TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                <FileListRow v-for="row in table.getRowModel().rows" :key="row.id" :row />
            </TableBody>
        </Table>
        <div class="paginator" v-if="data != null && data.length > 50">
            <Paginator
                v-model:page-index="pageIndex"
                v-model:page-size="settings.fileView.pageSize"
                :page-sizes
                :total="data.length"
            />
        </div>
    </div>
</template>

<style scoped>
@reference "@/style.css";

#wrapper {
    @apply border rounded-md overflow-x-auto;
}

th {
    @apply text-center not-last:border-r px-0;
}

.paginator {
    @apply bg-muted/50 border-t font-medium [&>tr]:last:border-b-0 sticky left-0 w-full p-2;
}

td {
    @apply px-2 align-middle not-last:border-r;

    &:has(> button) {
        @apply p-0;
    }
}
</style>
