<script lang="ts" setup>
import type { Column, ColumnDef, RowSelectionState, SortingState } from '@tanstack/vue-table';

import { valueUpdater } from '@shadcn/table/utils';
import {
    columnSizingFeature,
    columnVisibilityFeature,
    createPaginatedRowModel,
    createSortedRowModel,
    rowPaginationFeature,
    rowSelectionFeature,
    rowSortingFeature,
    tableFeatures,
    useTable,
} from '@tanstack/vue-table';
import { isEqual } from '@ver0/deep-equal';
import { watchImmediate, whenever } from '@vueuse/core';
import { computed, h, ref, watch, watchEffect } from 'vue';
import { useI18n } from 'vue-i18n';
import { onBeforeRouteUpdate } from 'vue-router';

import type { AnyDirectoryEntry } from '@/lib/interop';

import FileGridView from '@/components/fileList/grid/FileGridView.vue';
import ColumnOptions from '@/components/fileList/list/ColumnOptions.vue';
import FileListView from '@/components/fileList/list/FileListView.vue';
import SortableHeader from '@/components/fileList/list/SortableHeader.vue';
import Paginator from '@/components/fileList/Paginator.vue';
import { useLoadingState } from '@/lib/api';
import { dedupedComputed } from '@/lib/utils';
import { useListDirQuery } from '@/pages/Files.vue';
import { useFileSelection } from '@/stores/useFileSelection.ts';
import { getDirFromRouteParams } from '@/stores/useRouteState';
import { useSettings } from '@/stores/useSettings';

const fileSelection = useFileSelection();
const settings = useSettings();

const props = defineProps<{ gridView: boolean }>();

const listDirQuery = useListDirQuery();

const isLoading = useLoadingState(listDirQuery.isPending);

const i18n = useI18n();

const tags = dedupedComputed(() => listDirQuery.data.value?.tags ?? []);
const tagHeaders = computed(() => {
    const tags = i18n.tm('filelist.tags');
    return Object.fromEntries(Object.entries(tags).map(([k, v]) => [k, i18n.rt(v)]));
});

const features = tableFeatures({
    rowSortingFeature,
    sortedRowModel: createSortedRowModel(),
    rowPaginationFeature,
    paginatedRowModel: createPaginatedRowModel(),
    rowSelectionFeature,
    columnVisibilityFeature,
    columnSizingFeature,
});

export type TableFeatures = typeof features;

const columns = computed<ColumnDef<TableFeatures, AnyDirectoryEntry>[]>(() => {
    const getSortableHeader = (text: string, column: Column<TableFeatures, AnyDirectoryEntry>) =>
        h(SortableHeader, {
            tag: column.id,
            text,
            column,
            onResetSort: () => resetSorting(),
        });

    return [
        {
            id: 'prefix',
            size: 32,
            maxSize: 21,
            header: () => h(ColumnOptions),
        },
        {
            id: 'href',
            accessorKey: 'name',
            minSize: 300,
            header: ({ column }) => getSortableHeader(i18n.t('filename'), column),
        },
        {
            id: 'sz',
            accessorKey: 'size',
            header: ({ column }) => getSortableHeader(i18n.t('filelist.tags.sz'), column),
        },
        {
            id: 'ts',
            accessorKey: 'created',
            header: ({ column }) => getSortableHeader(i18n.t('filelist.tags.ts'), column),
        },
        ...tags.value.map((tag) => {
            return {
                id: tag,
                accessorFn: (v) => v.tags.get(tag),
                header: ({ column }) => getSortableHeader(tagHeaders.value[tag] ?? tag, column),
            } satisfies ColumnDef<TableFeatures, AnyDirectoryEntry>;
        }),
    ];
});

const sorting = ref<SortingState>([]);

function resetSorting() {
    const sortKey = listDirQuery.data.value?.sort;
    if (sortKey) {
        const asc = sortKey.startsWith('-');
        const id = asc ? sortKey.slice(1) : sortKey;
        sorting.value = [{ id, desc: !asc }];
    } else {
        sorting.value = [];
    }
}
whenever(
    () => listDirQuery.data.value?.sort,
    () => resetSorting(),
    { once: true }
);

const rowSelectionDeduped = dedupedComputed<RowSelectionState>(() =>
    Object.fromEntries(
        Array.from(fileSelection.selectedFiles.keys()).map(({ name }) => [name, true])
    )
);
const rowSelection = computed<RowSelectionState>({
    get: () => rowSelectionDeduped.value,
    set: (v) => fileSelection.setSelectedNames(Object.keys(v)),
});

const data = computed(() => listDirQuery.data.value?.entries ?? []);

const table = useTable<TableFeatures, AnyDirectoryEntry>({
    data: computed(() => data.value),
    state: computed(() => ({
        sorting: sorting.value,
        rowSelection: rowSelection.value,
    })),
    features,
    columns,
    onSortingChange: (u) => valueUpdater(u, sorting),
    enableRowSelection: true,
    enableMultiRowSelection: true,
    getRowId: (r) => r.name,
    onRowSelectionChange: (u) => valueUpdater(u, rowSelection),
});

export type TableType = typeof table;

const pageSizes = [50, 100, 250, 500];
const pageIndex = ref(1);

// Reset if we go to a different route since we might not have multiple pages there
onBeforeRouteUpdate((to, from) => {
    if (!isEqual(getDirFromRouteParams(to.params), getDirFromRouteParams(from.params))) {
        pageIndex.value = 1;
    }
});

watchEffect(() => table.setPageIndex(pageIndex.value - 1));
watchImmediate(
    () => settings.fileView.pageSize,
    (size) => table.setPageSize(size)
);

const hiddenCols = computed(() => settings.fileView.hiddenListColumns);
watch(
    hiddenCols,
    (hiddenCols) => {
        const def = Object.fromEntries(hiddenCols.map((k) => [k, false]));
        table.setColumnVisibility(def);
    },
    { deep: 2, immediate: true }
);
</script>

<template>
    <div id="wrapper" :class="{ gridView, listView: !gridView }">
        <FileGridView v-if="gridView" :isLoading :table :data />
        <FileListView v-else :isLoading :table />
        <div class="paginator" v-if="data.length > 50">
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

#wrapper.listView {
    @apply border rounded-md overflow-x-auto;

    .paginator {
        @apply border-t;
    }
}
#wrapper.gridView .paginator {
    @apply mt-4 rounded-xl;
}

.paginator {
    @apply bg-muted/50 font-medium [&>tr]:last:border-b-0 sticky left-0 w-full p-2;
}
</style>
