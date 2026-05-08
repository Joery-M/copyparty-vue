<script lang="ts" setup>
import { API, getApiUrl, useLoadingState } from '@/lib/api';
import { FileClassification } from '@/lib/classifyExt';
import { Directory, type AnyDirectoryEntry } from '@/lib/interop';
import { formatFileSize } from '@/lib/utils';
import { useRouteState } from '@/stores/useRouteState';
import { useSettings } from '@/stores/useSettings';
import { useQuery, type _JSONPrimitive } from '@pinia/colada';
import { computed, h } from 'vue';
import { RouterLink } from 'vue-router';
import MarkdownViewer from './viewers/MarkdownViewer.vue';

import { useAuth } from '@/stores/useAuth';
import { Skeleton } from '@shadcn/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@shadcn/table';
import { FlexRender, getCoreRowModel, useVueTable, type ColumnDef } from '@tanstack/vue-table';
import { whenever } from '@vueuse/core';

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

const columns = computed<ColumnDef<AnyDirectoryEntry>[]>(() => {
    const tags = (listDirQuery.data.value?.tags ?? []).map((tag) => {
        return {
            accessorKey: 'tags',
            header: tag,
            cell: ({ getValue }) => getValue<Map<string, _JSONPrimitive>>().get(tag)
        } satisfies ColumnDef<AnyDirectoryEntry>;
    });
    return [
        {
            accessorKey: 'name',
            header: () => 'File name',
            cell: ({ row: { original } }) => getEntryRenderFunction(original)
        },
        {
            accessorKey: 'classification',
            header: () => 'File name',
            cell: ({ getValue }) => FileClassification[getValue<FileClassification>()]
        },
        {
            accessorKey: 'size',
            header: () => 'Size',
            cell: ({ getValue }) =>
                formatFileSize(
                    getValue<number>(),
                    settings.format.fileSizes.type,
                    settings.format.fileSizes.bits
                )
        },
        ...tags
    ];
});

const table = computed(() =>
    useVueTable({
        get data() {
            return listDirQuery.data.value?.entries ?? [];
        },
        columns: columns.value,
        getCoreRowModel: getCoreRowModel()
    })
);
</script>

<template>
    <div class="border rounded-md">
        <Table v-if="isLoading" class="loader-table">
            <TableHeader>
                <TableRow>
                    <TableHead v-for="i in 4">
                        <Skeleton :data-i="i" class="h-2"></Skeleton>
                    </TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                <TableRow v-for="i in 8">
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
@for $i from 1 through 12 {
    [data-i='#{$i}'] {
        animation-delay: $i * 200ms;
    }
}
</style>
