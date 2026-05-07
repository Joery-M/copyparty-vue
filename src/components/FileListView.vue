<script lang="ts" setup>
import { API, getApiUrl } from '@/lib/api';
import { FileClassification } from '@/lib/classifyExt';
import { Directory, type AnyDirectoryEntry } from '@/lib/interop';
import { formatFileSize } from '@/lib/utils';
import { useRouteState } from '@/stores/useRouteState';
import { useSettings } from '@/stores/useSettings';
import { useQuery } from '@pinia/colada';
import { computed, h } from 'vue';
import { RouterLink } from 'vue-router';
import MarkdownViewer from './viewers/MarkdownViewer.vue';

import { useAuth } from '@/stores/useAuth';
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

const columns: ColumnDef<AnyDirectoryEntry>[] = [
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
    }
];

const table = useVueTable({
    get data() {
        return listDirQuery.data.value?.entries ?? [];
    },
    columns,
    getCoreRowModel: getCoreRowModel()
});
</script>

<template>
    <div class="border rounded-md">
        <Table>
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
