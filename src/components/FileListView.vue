<script lang="ts" setup>
import { API, getApiUrl } from '@/lib/api';
import { FileClassification } from '@/lib/classifyExt';
import { type AnyDirectoryEntry } from '@/lib/interop';
import { byteSizeFormatter } from '@/lib/utils';
import { useQuery } from '@pinia/colada';

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@shadcn/table';
import { FlexRender, getCoreRowModel, useVueTable, type ColumnDef } from '@tanstack/vue-table';
import { h } from 'vue';
import { RouterLink } from 'vue-router';

const props = defineProps<{ cwd: string[] }>();

const listDirQuery = useQuery({
    key: () => ['ls', ...props.cwd],
    query: ({ signal }) => API.getListDirectory(props.cwd, signal)
});

function getEntryRenderFunction(entry: AnyDirectoryEntry) {
    switch (entry.classification) {
        case FileClassification.Directory:
            return h(
                RouterLink,
                { to: { name: 'viewer', params: { path: entry.fullPath.concat('') } } },
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
        cell: ({ getValue }) => byteSizeFormatter.format(getValue<number>())
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
</template>
