<script setup lang="ts">
import type { Row, Table } from '@tanstack/vue-table';

import { computed } from 'vue';
import { useRouter } from 'vue-router';

import type { AnyDirectoryEntry } from '@/lib/interop';

import { getApiUrl } from '@/lib/api.ts';
import { canView, FileClassification } from '@/lib/classifyExt.ts';
import ContextMenuTarget from '@/lib/ContextMenu/ContextMenuTarget.vue';
import { formatFileSize, formatTime } from '@/lib/format.ts';
import { Directory } from '@/lib/interop';
import { dedupedComputed, getTableCellFormat, TableCellFormat } from '@/lib/utils.ts';
import { useFileSelection } from '@/stores/useFileSelection.ts';
import { useRouteState } from '@/stores/useRouteState';
import { useSettings } from '@/stores/useSettings.ts';

import FileListRowOptions from './FileListRowOptions.vue';

import { TableCell, TableCellGeneric } from '@shadcn/table';

const router = useRouter();
const routeState = useRouteState();
const fileSelection = useFileSelection();
const settings = useSettings();
const sizeFormat = dedupedComputed(() => settings.format.fileSizes);

const props = defineProps<{ row: Row<AnyDirectoryEntry>; table: Table<AnyDirectoryEntry> }>();
const entry = computed(() => props.row.original);

function onDoubleClick() {
    window.getSelection()?.empty();
    const entry = props.row.original;
    if (entry instanceof Directory || entry.classification === FileClassification.Directory) {
        router.push({ name: 'viewer', params: { path: entry.fullPath.concat('') } });
    }

    if (canView(entry.classification)) {
        router.push({
            name: 'viewer',
            params: { path: routeState.dir.concat('') },
            hash: '#' + entry.name,
        });
    } else {
        location.href = getApiUrl(entry.fullPath);
    }
}

function onClick(event: MouseEvent) {
    if (event.ctrlKey) {
        fileSelection.toggleEntry(entry.value);
    } else if (event.shiftKey && fileSelection.lastSelectedNonRange) {
        const rows = props.table.getRowModel().rows;
        const lastSelectedIndex = rows.findIndex((v) =>
            Object.is(v.original, fileSelection.lastSelectedNonRange)
        );
        const curIndex = rows.indexOf(props.row);
        if (lastSelectedIndex >= 0 && curIndex >= 0 && lastSelectedIndex !== curIndex) {
            const lowerBound = Math.min(lastSelectedIndex, curIndex);
            const upperBound = Math.max(lastSelectedIndex, curIndex);
            fileSelection.selectedFiles = new Set(
                rows.slice(lowerBound, upperBound + 1).map((v) => v.original)
            );
            fileSelection.lastSelected = props.row.original;
            window.getSelection()?.empty();
        }
    } else {
        fileSelection.selectNone();
        fileSelection.setEntry(entry.value, true);
    }
}
</script>

<template>
    <ContextMenuTarget :data="entry" @open="fileSelection.setEntry(entry, true)">
        <tr
            tabindex="0"
            :data-state="row.getIsSelected() ? 'selected' : undefined"
            :data-active="fileSelection.lastSelected === entry ? 'active' : undefined"
            @click="onClick"
            @dblclick.prevent="onDoubleClick()"
        >
            <template v-for="cell in row.getVisibleCells()" :key="cell.id" v-once>
                <!-- Options -->
                <TableCell v-if="cell.column.id === 'prefix'">
                    <FileListRowOptions :row />
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
                            hash: '#' + entry.name,
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
        </tr>
    </ContextMenuTarget>
</template>

<style scoped>
@reference "@/style.css";

td {
    @apply px-2 align-middle not-last:border-r;

    &:has(> button) {
        @apply p-0;
    }
}
tr {
    @apply ring-primary ring-0 ring-inset transition-all duration-150 last:rounded-b
            hover:bg-muted/50 data-[state=selected]:bg-muted border-b;
    &[data-context-menu='open'],
    &[data-active='active'] {
        @apply outline-none ring-1 border-b-transparent;
    }
    &:has(+ tr[data-context-menu='open']),
    &:has(+ tr[data-active='active']) {
        @apply border-b-transparent;
    }
}
</style>
