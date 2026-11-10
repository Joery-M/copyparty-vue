<script lang="ts" setup>
import { FlexRender } from '@tanstack/vue-table';

import { useFileTable } from '@/components/fileList/file-list';

import FileListRow from './FileListRow.vue';
import LoadingTable from './LoadingTable.vue';

import { Table, TableBody, TableHead, TableHeader, TableRow } from '@shadcn/table';

const { isLoading, table } = useFileTable();
</script>

<template>
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
            <FileListRow v-for="row in table.getRowModel().rows" :key="row.id" :row :table />
        </TableBody>
    </Table>
</template>

<style scoped>
@reference "@/style.css";

th {
    @apply text-center not-last:border-r px-0;
}
table:has(tbody > tr:first-child[data-active='active']) thead > tr {
    @apply border-b-transparent;
}

td {
    @apply px-2 align-middle not-last:border-r;

    &:has(> button) {
        @apply p-0;
    }
}
</style>
