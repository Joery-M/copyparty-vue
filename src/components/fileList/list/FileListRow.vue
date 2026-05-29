<script setup lang="ts">
import { getApiUrl } from '@/lib/api.ts';
import { canView, FileClassification } from '@/lib/classifyExt.ts';
import { formatFileSize, formatTime } from '@/lib/format.ts';
import type { AnyDirectoryEntry } from '@/lib/interop';
import { dedupedComputed, getTableCellFormat, TableCellFormat } from '@/lib/utils.ts';
import { useRouteState } from '@/stores/useRouteState';
import { useSettings } from '@/stores/useSettings.ts';
import { TableCell, TableCellGeneric, TableRow } from '@shadcn/table';
import { type Row } from '@tanstack/vue-table';
import { computed } from 'vue';
import FileListRowOptions from './FileListRowOptions.vue';

const routeState = useRouteState();
const settings = useSettings();
const sizeFormat = dedupedComputed(() => settings.format.fileSizes);

const props = defineProps<{ row: Row<AnyDirectoryEntry> }>();
const entry = computed(() => props.row.original);
</script>

<template>
    <TableRow
        :data-state="row.getIsSelected() ? 'selected' : undefined"
        @click="row.toggleSelected()"
    >
        <template v-for="cell in row.getVisibleCells()" :key="cell.id" v-once>
            <!-- Options -->
            <TableCell v-if="cell.column.id === 'prefix'">
                <FileListRowOptions />
            </TableCell>
            <!-- Header -->
            <TableCell v-else-if="cell.column.id === 'href'">
                <RouterLink
                    v-if="entry.classification === FileClassification.Directory"
                    :to="{ name: 'viewer', params: { path: entry.fullPath.concat('') } }"
                    @click.stop
                >
                    {{ entry.name }}
                </RouterLink>
                <RouterLink
                    v-else-if="canView(entry.classification)"
                    :to="{
                        name: 'viewer',
                        params: { path: routeState.dir.concat('') },
                        hash: '#' + entry.name
                    }"
                    @click.stop
                >
                    {{ entry.name }}
                </RouterLink>
                <a
                    v-else
                    :href="getApiUrl(entry.fullPath)"
                    :download="entry.name"
                    target="_blank"
                    @click.stop
                >
                    {{ entry.name }}
                </a>
            </TableCell>

            <!-- @vue-generic {number} -->
            <TableCellGeneric
                v-else-if="getTableCellFormat(cell.column.id) === TableCellFormat.DataSize"
                :cell
                v-slot="{ value }"
            >
                {{ formatFileSize(value, sizeFormat.type, sizeFormat.bits) }}
            </TableCellGeneric>

            <!-- @vue-generic {Date} -->
            <TableCellGeneric
                v-else-if="getTableCellFormat(cell.column.id) === TableCellFormat.DateTime"
                :cell
                v-slot="{ value }"
            >
                {{ value.toLocaleString() }}
            </TableCellGeneric>

            <!-- @vue-generic {number} -->
            <TableCellGeneric
                v-else-if="getTableCellFormat(cell.column.id) === TableCellFormat.Duration"
                :cell
                v-slot="{ value }"
            >
                {{ formatTime(value) }}
            </TableCellGeneric>

            <!-- @vue-generic {any} -->
            <TableCellGeneric v-else :cell v-slot="{ value }">
                {{ value }}
            </TableCellGeneric>
        </template>
    </TableRow>
</template>

<style scoped>
@reference "@/style.css";

td {
    @apply px-2 align-middle not-last:border-r;

    &:has(> button) {
        @apply p-0;
    }
}
</style>
