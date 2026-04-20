<script lang="ts" setup>
import { API, getApiUrl } from '@/lib/api';
import { FileClassification } from '@/lib/classifyExt';
import { Directory, File, type AnyDirectoryEntry } from '@/lib/interop';
import { byteSizeFormatter, type RouteState } from '@/lib/utils';
import { usePreview } from '@/stores/usePreview';
import { useQuery } from '@pinia/colada';

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@shadcn/table';
import { FlexRender, getCoreRowModel, useVueTable, type ColumnDef } from '@tanstack/vue-table';
import { computed, effect, h } from 'vue';
import { RouterLink } from 'vue-router';
import MarkdownViewer from './viewers/MarkdownViewer.vue';

const props = defineProps<{ routeDir: RouteState }>();

const listDirQuery = useQuery({
    key: () => ['ls', ...props.routeDir.dir],
    query: ({ signal }) => API.getListDirectory(props.routeDir.dir, signal)
});

const readmes = computed(() => (listDirQuery.data.value?.raw.readmes ?? []).filter((v) => !!v));

const previewStore = usePreview();

effect(() => {
    const lsDir = listDirQuery.data.value;
    const routeFile = props.routeDir.file;
    const entry = lsDir?.entries.find((ent) => ent.name == routeFile);
    if (entry instanceof File) {
        previewStore.openedFile = entry;
    }
});

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
            return h(
                RouterLink,
                {
                    to: {
                        name: 'viewer',
                        params: { path: props.routeDir.dir.concat('') },
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

    <template v-for="readme in readmes">
        <MarkdownViewer :input="readme"></MarkdownViewer>
    </template>
</template>
