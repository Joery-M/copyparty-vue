<script lang="ts" setup>
import { API, getApiUrl, useLoadingState } from '@/lib/api';
import { FileClassification } from '@/lib/classifyExt';
import { formatFileSize, formatTime } from '@/lib/format';
import { Directory, type AnyDirectoryEntry } from '@/lib/interop';
import { useRouteState } from '@/stores/useRouteState';
import { useSettings } from '@/stores/useSettings';
import { useQuery, type _JSONPrimitive } from '@pinia/colada';
import { computed, h, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { RouterLink } from 'vue-router';
import MarkdownViewer from './viewers/MarkdownViewer.vue';

import { useAuth } from '@/stores/useAuth';
import { Button } from '@shadcn/button';
import { Skeleton } from '@shadcn/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@shadcn/table';
import { valueUpdater } from '@shadcn/table/utils';
import {
    FlexRender,
    getCoreRowModel,
    getSortedRowModel,
    useVueTable,
    type Column,
    type ColumnDef,
    type SortingState
} from '@tanstack/vue-table';
import { whenever } from '@vueuse/core';
import { SortAsc, SortDesc } from 'lucide-vue-next';
import Tooltip from './Tooltip.vue';

const authStore = useAuth();
const routeState = useRouteState();
const settings = useSettings();

const listDirQuery = useQuery(() => API.getListDirectoryQuery(routeState.dir));
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
        case '.vq': {
            const sizeFormat = settings.format.fileSizes;
            if (typeof value === 'number' && !Number.isNaN(Number(value)))
                return wrapWithTooltip(
                    formatFileSize(value * 1000, sizeFormat.type, sizeFormat.bits, true),
                    value
                );
            else return value;
        }

        default:
            return value;
    }
}

const tags = computed(() => listDirQuery.data.value?.tags ?? []);

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

whenever(
    () => listDirQuery.data.value?.sort,
    (v) => (sorting.value = [{ id: v, desc: true }]),
    { once: true, immediate: true }
);

const table = computed(() =>
    useVueTable({
        get data() {
            return listDirQuery.data.value?.entries ?? [];
        },
        columns: columns.value,
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel(),
        onSortingChange: (updaterOrValue) => valueUpdater(updaterOrValue, sorting),
        state: {
            get sorting() {
                return sorting.value;
            }
        }
    })
);
</script>

<template>
    <div id="wrapper">
        <Table v-if="isLoading" class="loader-table">
            <TableHeader>
                <TableRow>
                    <TableHead v-for="i in 4">
                        <Skeleton :data-i="i" class="h-2"></Skeleton>
                    </TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                <TableRow v-for="i in 12">
                    <TableCell colspan="4">
                        <Skeleton :data-i="i + 4" class="h-2"></Skeleton>
                    </TableCell>
                </TableRow>
            </TableBody>
        </Table>
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
        </Table>
    </div>

    <br />

    <template v-for="readme in readmes">
        <MarkdownViewer :input="readme"></MarkdownViewer>
    </template>
</template>

<style lang="scss" scoped>
// Delay the skeleton animations and stagger them
@for $i from 1 through 16 {
    [data-i='#{$i}'] {
        animation-delay: $i * 200ms;
    }
}
</style>

<style scoped>
@reference "@/style.css";

#wrapper {
    @apply my-12 ml-6 mr-5 border rounded-md;
}
[data-slot='table-container'] {
    @apply pb-2;
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
    @apply px-2 py-2 not-last:border-r;
}
</style>
