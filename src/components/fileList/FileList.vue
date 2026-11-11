<script lang="ts" setup>
import type { Column, ColumnDef, RowSelectionState, SortingState } from '@tanstack/vue-table';

import { valueUpdater } from '@shadcn/table/utils';
import { useTable } from '@tanstack/vue-table';
import { isEqual } from '@ver0/deep-equal';
import { watchImmediate, whenever } from '@vueuse/core';
import { computed, h, onMounted, ref, watch, watchEffect } from 'vue';
import { useI18n } from 'vue-i18n';
import { onBeforeRouteUpdate } from 'vue-router';

import type { TableFeatures, TableType } from '@/components/fileList/file-list';
import type { AnyDirectoryEntry } from '@/lib/interop';

import { createTableFeatures, provideFileTable } from '@/components/fileList/file-list';
import FileGridView from '@/components/fileList/grid/FileGridView.vue';
import ColumnOptions from '@/components/fileList/list/ColumnOptions.vue';
import FileListView from '@/components/fileList/list/FileListView.vue';
import SortableHeader from '@/components/fileList/list/SortableHeader.vue';
import Paginator from '@/components/fileList/Paginator.vue';
import { useLoadingState } from '@/lib/api';
import { FileEntry } from '@/lib/interop';
import { dedupedComputed, refWithInit } from '@/lib/utils';
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

const columns = computed<ColumnDef<TableFeatures, AnyDirectoryEntry>[]>(() => {
    const getSortableHeader = (text: string, column: Column<TableFeatures, AnyDirectoryEntry>) =>
        h(SortableHeader, {
            tag: column.id,
            text,
            column,
            onResetSort: () => sorting.reset(),
        });

    return [
        {
            id: 'prefix',
            size: 32,
            maxSize: 21,
            enableSorting: false,
            header: () => h(ColumnOptions),
        },
        {
            id: 'isFile',
            sortFn: 'basic',
            accessorFn: (v) => v instanceof FileEntry,
        },
        {
            id: 'href',
            accessorKey: 'name',
            minSize: 300,
            sortFn: 'alphanumeric',
            header: ({ column }) => getSortableHeader(i18n.t('filename'), column),
        },
        {
            id: 'sz',
            accessorKey: 'size',
            sortFn: 'basic',
            header: ({ column }) => getSortableHeader(i18n.t('filelist.tags.sz'), column),
        },
        {
            id: 'ts',
            accessorKey: 'created',
            sortFn: 'basic',
            header: ({ column }) => getSortableHeader(i18n.t('filelist.tags.ts'), column),
        },
        ...tags.value.map((tag) => {
            return {
                id: tag,
                accessorFn: (v) => v.tags.get(tag),
                sortFn: 'alphanumeric',
                header: ({ column }) => getSortableHeader(tagHeaders.value[tag] ?? tag, column),
            } satisfies ColumnDef<TableFeatures, AnyDirectoryEntry>;
        }),
    ];
});

const defaultSorting = computed<SortingState>(() => {
    const sortKey = listDirQuery.data.value?.sort ?? 'href';
    const desc = !sortKey.startsWith('-');
    const id = desc ? sortKey : sortKey.slice(1);
    return id === 'href'
        ? [
              { id: 'isFile', desc: !desc },
              { id, desc },
          ]
        : [{ id, desc }];
});
const sorting = refWithInit(defaultSorting);

const sortedColumn = computed(() =>
    sorting.value.find((v) => v.id !== 'isFile' && v.id !== 'prefix')
);

function setSorting(id: string, desc = true) {
    if (id === 'href') {
        table.setSorting([
            { id: 'isFile', desc: !desc },
            { id: 'href', desc },
        ]);
        return;
    }
    table.setSorting([{ id, desc }]);
}

function toggleSortDirection() {
    if (!sortedColumn.value) return;
    setSorting(sortedColumn.value.id, !sortedColumn.value.desc);
}

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

const table: TableType = useTable<TableFeatures, AnyDirectoryEntry>({
    data: computed(() => data.value),
    state: {
        get sorting() {
            return sorting.value;
        },
        get rowSelection() {
            return rowSelection.value;
        },
    },
    features: createTableFeatures(),
    columns,
    onSortingChange: (u) => valueUpdater(u, sorting),
    enableRowSelection: true,
    enableMultiRowSelection: true,
    getRowId: (r) => r.name,
    onRowSelectionChange: (u) => valueUpdater(u, rowSelection),
});

const pageSizes = [50, 100, 250, 500];
const pageIndex = ref(1);

// Reset if we go to a different route since we might not have multiple pages there
onBeforeRouteUpdate((to, from) => {
    if (!isEqual(getDirFromRouteParams(to.params), getDirFromRouteParams(from.params))) {
        pageIndex.value = 1;
        sorting.reset();
    }
});

watchEffect(() => table.setPageIndex(pageIndex.value - 1));
watchImmediate(
    () => settings.fileView.pageSize,
    (size) => table.setPageSize(size)
);

const hiddenCols = computed(() => settings.fileView.hiddenListColumns.concat('isFile'));
watch(
    hiddenCols,
    (hiddenCols) => {
        const def = Object.fromEntries(hiddenCols.map((k) => [k, false]));
        table.setColumnVisibility(def);
    },
    { deep: 2, immediate: true }
);

provideFileTable({
    isLoading: computed(() => isLoading.value),
    table,
    sorting: sortedColumn,
    setSorting,
    resetSorting: () => sorting.reset(),
    toggleSortDirection,
});
</script>

<template>
    <template v-if="gridView">
        <FileGridView />
        <div class="paginator gridView" v-if="data.length > 50">
            <Paginator
                v-model:page-index="pageIndex"
                v-model:page-size="settings.fileView.pageSize"
                :page-sizes
                :total="data.length"
            />
        </div>
    </template>
    <div id="listView-wrapper" v-else>
        <FileListView />
        <div class="paginator listView" v-if="data.length > 50">
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

#listView-wrapper {
    @apply border rounded-md overflow-x-auto;
}
.paginator.listView {
    @apply border-t;
}
.paginator.gridView {
    @apply mt-1 rounded-xl;
}

.paginator {
    @apply bg-muted/50 font-medium [&>tr]:last:border-b-0 sticky left-0 w-full p-2;
}
</style>
