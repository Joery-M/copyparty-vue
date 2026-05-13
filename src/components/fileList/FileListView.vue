<script lang="ts">
import LoadingTable from '@/components/fileList/LoadingTable.vue';
import { API } from '@/lib/api';
import { defineColadaLoader } from 'vue-router/experimental/pinia-colada';

export const useListDirQuery = defineColadaLoader({
    key: (to) => ['ls', ...getDirFromRouteParams(to.params)],
    query: (to, { signal }) => API.getListDirectory(getDirFromRouteParams(to.params), signal)
});
</script>

<script lang="ts" setup>
import Tooltip from '@/components/Tooltip.vue';
import { getApiUrl, useLoadingState } from '@/lib/api';
import { FileClassification } from '@/lib/classifyExt';
import { formatFileSize, formatTime } from '@/lib/format';
import { Directory, type AnyDirectoryEntry } from '@/lib/interop';
import { dedupedComputed } from '@/lib/utils';
import { useAuth } from '@/stores/useAuth';
import { getDirFromRouteParams, useRouteState } from '@/stores/useRouteState';
import { useSettings } from '@/stores/useSettings';
import { type _JSONPrimitive } from '@pinia/colada';
import { Button } from '@shadcn/button';
import {
    Pagination,
    PaginationContent,
    PaginationEllipsis,
    PaginationItem,
    PaginationNext,
    PaginationPrevious
} from '@shadcn/pagination';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@shadcn/select';
import {
    Table,
    TableBody,
    TableCell,
    TableFooter,
    TableHead,
    TableHeader,
    TableRow
} from '@shadcn/table';
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
import { MoreHorizontal, SortAsc, SortDesc } from 'lucide-vue-next';
import { computed, defineAsyncComponent, h, ref, watchEffect } from 'vue';
import { useI18n } from 'vue-i18n';
import { RouterLink } from 'vue-router';

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

const readmes = computed(() => (listDirQuery.data.value?.readmes ?? []).filter((v) => !!v));
const MarkdownViewer = defineAsyncComponent(() => import('../viewers/MarkdownViewer.vue'));

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
    return h(Tooltip, { content: String(raw) }, () => h('span', text));
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
            size: 0,
            cell: () => h(Button, { size: 'icon', variant: 'ghost' }, () => h(MoreHorizontal))
        },
        {
            id: 'href',
            accessorKey: 'name',
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
                header: ({ column }) =>
                    getSortableHeader(
                        i18n.t(`filelist.tags["${tag}"]`, tag, { missingWarn: false }),
                        column
                    ),
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
        sorting.value = [];
    }
}

whenever(
    () => listDirQuery.data.value?.sort,
    () => resetSorting(),
    { once: true, immediate: true }
);

const data = dedupedComputed(() => listDirQuery.data.value?.entries ?? null);
const table = computed(() =>
    useVueTable({
        data: computed(() => data.value ?? []),
        columns: columns.value,
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel(),
        onSortingChange: (u) => valueUpdater(u, sorting),
        getPaginationRowModel: getPaginationRowModel()
    })
);

const pageSizes = [50, 100, 250, 500];
const pageSize = ref(50);
const pageIndex = ref(1);

watchEffect(() => table.value.setPageIndex(pageIndex.value - 1));
watchImmediate(pageSize, (size) => table.value.setPageSize(size));
watchEffect(() => table.value.setSorting(sorting.value));
</script>

<template>
    <div id="wrapper">
        <LoadingTable v-if="isLoading || !table" />
        <Table v-else>
            <TableHeader>
                <TableRow v-for="headerGroup in table.getHeaderGroups()" :key="headerGroup.id">
                    <TableHead v-for="header in headerGroup.headers" :key="header.id">
                        <FlexRender
                            v-if="!header.isPlaceholder"
                            :render="header.column.columnDef.header"
                            :props="header.getContext()"
                        />
                    </TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                <TableRow
                    v-for="row in table.getRowModel().rows"
                    :key="row.id"
                    :data-state="row.getIsSelected() ? 'selected' : undefined"
                >
                    <TableCell v-for="cell in row.getVisibleCells()" :key="cell.id">
                        <FlexRender
                            :render="cell.column.columnDef.cell"
                            :props="cell.getContext()"
                        />
                    </TableCell>
                </TableRow>
            </TableBody>
            <TableFooter v-if="data != null && data.length > 50">
                <TableCell :colspan="table.getVisibleFlatColumns().length">
                    <div class="flex not-lg:justify-evenly">
                        <Select v-model:model-value="pageSize">
                            <SelectTrigger class="w-full max-w-20">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem v-for="size in pageSizes" :value="size">
                                    {{ size }}
                                </SelectItem>
                            </SelectContent>
                        </Select>
                        <div class="w-full lg:hidden"></div>
                        <Pagination
                            v-slot="{ page }"
                            v-model:page="pageIndex"
                            :items-per-page="pageSize"
                            :total="data.length"
                            show-edges
                        >
                            <PaginationContent v-slot="{ items }">
                                <PaginationPrevious />
                                <template v-for="(item, index) in items" :key="index">
                                    <PaginationItem
                                        v-if="item.type === 'page'"
                                        :value="item.value"
                                        :is-active="item.value === page"
                                    >
                                        {{ item.value }}
                                    </PaginationItem>
                                    <PaginationEllipsis v-else />
                                </template>
                                <PaginationNext />
                            </PaginationContent>
                        </Pagination>
                        <div class="w-full max-w-20 not-lg:hidden"></div>
                    </div>
                </TableCell>
            </TableFooter>
        </Table>
    </div>

    <br />

    <template v-for="readme in readmes">
        <MarkdownViewer :input="readme"></MarkdownViewer>
    </template>
</template>

<style scoped>
@reference "@/style.css";

#wrapper {
    @apply my-12 ml-6 mr-5 border rounded-md;
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
