<script lang="ts" setup>
import LoadingTable from '@/components/fileList/LoadingTable.vue';
import Tooltip from '@/components/Tooltip.vue';
import { API, getApiUrl, useLoadingState } from '@/lib/api';
import { FileClassification } from '@/lib/classifyExt';
import { formatFileSize, formatTime } from '@/lib/format';
import { Directory, type AnyDirectoryEntry } from '@/lib/interop';
import { dedupedComputed } from '@/lib/utils';
import { useListDirQuery } from '@/pages/Files.vue';
import { useAuth } from '@/stores/useAuth';
import { useRouteState } from '@/stores/useRouteState';
import { useSettings } from '@/stores/useSettings';
import { type _JSONPrimitive } from '@pinia/colada';
import { Button } from '@shadcn/button';
import { ContextMenu, ContextMenuTrigger } from '@shadcn/context-menu';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@shadcn/table';
import { valueUpdater } from '@shadcn/table/utils';
import {
    FlexRender,
    getCoreRowModel,
    getPaginationRowModel,
    getSortedRowModel,
    useVueTable,
    type Column,
    type ColumnDef,
    type SortingState
} from '@tanstack/vue-table';
import { watchImmediate, whenever } from '@vueuse/core';
import { SortAsc, SortDesc } from 'lucide-vue-next';
import { computed, h, ref, watchEffect } from 'vue';
import { useI18n } from 'vue-i18n';
import { onBeforeRouteUpdate, RouterLink } from 'vue-router';
import FileContextMenu from './FileContextMenu.vue';
import FileListRowOptions from './FileListRowOptions.vue';
import Paginator from './Paginator.vue';

const authStore = useAuth();
const routeState = useRouteState();
const settings = useSettings();

const listDirQuery = useListDirQuery();

whenever(listDirQuery.error, (err) => {
    if (err instanceof API.ApiError) {
        if (err.cause.code === 403) {
            authStore.loginDialog.reveal({
                path: routeState.dir,
                reason: 'unauthorized',
                canCancel: false
            });
        } else if (err.cause.code === 401) {
            authStore.loginDialog.reveal({
                path: routeState.dir,
                reason: 'not found',
                canCancel: false
            });
        }
    }
});

const isLoading = useLoadingState(listDirQuery.isPending);

function getEntryRenderFunction(entry: AnyDirectoryEntry) {
    if (entry instanceof Directory || entry.classification === FileClassification.Directory) {
        return h(
            RouterLink,
            { to: { name: 'viewer', params: { path: entry.fullPath.concat('') } } },
            () => entry.name
        );
    }

    switch (entry.classification) {
        case FileClassification.PlainText:
        case FileClassification.RichText:
        case FileClassification.RasterImage:
        case FileClassification.VectorImage:
        case FileClassification.Video:
            return h(
                RouterLink,
                {
                    to: {
                        name: 'viewer',
                        params: { path: routeState.dir.concat('') },
                        hash: '#' + entry.name
                    }
                },
                () => entry.name
            );

        default:
            return h(
                'a',
                { href: getApiUrl(entry.fullPath), download: entry.name, target: '_blank' },
                entry.name
            );
    }
}

const i18n = useI18n();

function wrapWithTooltip(text: any, raw: any) {
    return h(Tooltip, { content: String(raw), useViewportTest: true }, () => h('span', text));
}

function getTagRenderFunction(tag: string, value?: _JSONPrimitive) {
    switch (tag) {
        case '.dur':
            if (typeof value === 'number' && !Number.isNaN(Number(value)))
                return wrapWithTooltip(formatTime(Number(value)), value);
            else return value;
        case 'tdate':
            if (typeof value === 'string')
                return wrapWithTooltip(new Date(value).toLocaleString(), value);
            else return value;
        case '.q':
        case '.aq':
        case '.vq':
            if (typeof value === 'number' && !Number.isNaN(Number(value)))
                return wrapWithTooltip(formatFileSize(value * 1000, 'SI', false, true), value);
            else return value;

        default:
            return value;
    }
}

const tags = dedupedComputed(() => listDirQuery.data.value?.tags ?? []);
const tagHeaders = computed(() => {
    const tags = i18n.tm('filelist.tags');
    return Object.fromEntries(Object.entries(tags).map(([k, v]) => [k, i18n.rt(v)]));
});

const columns = computed<ColumnDef<AnyDirectoryEntry>[]>(() => {
    const sizeFormat = settings.format.fileSizes;

    const getSortableHeader = (text: string, column: Column<AnyDirectoryEntry>) =>
        h(
            Button,
            {
                variant: 'ghost',
                onClick: () => {
                    const curSort = column.getIsSorted();
                    if (!curSort) {
                        column.toggleSorting(true);
                    } else if (curSort === 'desc') {
                        column.toggleSorting(false);
                    } else {
                        resetSorting();
                    }
                }
            },
            () => [
                text,
                column.getIsSorted()
                    ? h(column.getIsSorted() === 'asc' ? SortAsc : SortDesc, {
                          class: 'size-4'
                      })
                    : undefined
            ]
        );

    return [
        {
            id: 'prefix',
            size: 32,
            maxSize: 21,
            cell: () => h(FileListRowOptions)
        },
        {
            id: 'href',
            accessorKey: 'name',
            minSize: 300,
            header: ({ column }) => getSortableHeader(i18n.t('filename'), column),
            cell: ({ row: { original } }) => getEntryRenderFunction(original)
        },
        {
            id: 'sz',
            accessorKey: 'size',
            header: ({ column }) => getSortableHeader(i18n.t('filelist.tags.sz'), column),
            cell: ({ getValue }) => {
                const value = getValue<number>();
                return wrapWithTooltip(
                    formatFileSize(value, sizeFormat.type, sizeFormat.bits),
                    value
                );
            }
        },
        {
            id: 'ts',
            accessorKey: 'created',
            header: ({ column }) => getSortableHeader(i18n.t('filelist.tags.ts'), column),
            cell: ({ getValue }) => {
                const value = getValue<Date>();
                return wrapWithTooltip(value.toLocaleString(), value);
            }
        },
        ...tags.value.map((tag) => {
            return {
                id: tag,
                accessorFn: (v) => v.tags.get(tag),
                header: ({ column }) => getSortableHeader(tagHeaders.value[tag] ?? tag, column),
                cell: ({ getValue }) => getTagRenderFunction(tag, getValue<_JSONPrimitive>())
            } satisfies ColumnDef<AnyDirectoryEntry>;
        })
    ];
});

const sorting = ref<SortingState>([]);

function resetSorting() {
    if (listDirQuery.data.value?.sort) {
        sorting.value = [{ id: listDirQuery.data.value.sort, desc: true }];
    } else {
        sorting.value = [{ id: 'name', desc: true }];
    }
}

whenever(
    () => listDirQuery.data.value?.sort,
    () => resetSorting(),
    { immediate: true }
);

const data = dedupedComputed(() => listDirQuery.data.value?.entries ?? null);
const table = computed(() =>
    useVueTable({
        data: computed(() => data.value ?? []),
        state: {
            sorting: sorting.value
        },
        columns: columns.value,
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel(),
        onSortingChange: (u) => valueUpdater(u, sorting),
        getPaginationRowModel: getPaginationRowModel()
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
                <ContextMenu v-for="row in table.getRowModel().rows" :key="row.id" as-child>
                    <ContextMenuTrigger as-child>
                        <TableRow :data-state="row.getIsSelected() ? 'selected' : undefined">
                            <TableCell v-for="cell in row.getVisibleCells()" :key="cell.id">
                                <FlexRender
                                    :render="cell.column.columnDef.cell"
                                    :props="cell.getContext()"
                                />
                            </TableCell>
                        </TableRow>
                    </ContextMenuTrigger>
                    <FileContextMenu :file="row.original" :dir="routeState.dir" />
                </ContextMenu>
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
    > button {
        @apply size-full px-2 rounded-none;
    }
    > [data-slot='skeleton'] {
        @apply mx-2;
    }
}

.paginator {
    @apply bg-muted/50 border-t font-medium [&>tr]:last:border-b-0 sticky left-0 w-full p-2;
}
td {
    @apply px-2 align-middle not-last:border-r;

    &:has(> button) {
        @apply p-0;
        > button {
            @apply m-0 rounded-none size-8;
        }
    }
}
</style>
