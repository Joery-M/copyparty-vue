<script setup lang="ts">
import Tooltip from '@/components/Tooltip.vue';
import { getApiUrl } from '@/lib/api.ts';
import { canView, FileClassification } from '@/lib/classifyExt.ts';
import { formatFileSize, formatTime } from '@/lib/format.ts';
import type { AnyDirectoryEntry } from '@/lib/interop';
import { dedupedComputed, getTableCellFormat, TableCellFormat } from '@/lib/utils.ts';
import { useListDirQuery } from '@/pages/Files.vue';
import { useRouteState } from '@/stores/useRouteState';
import { useSettings } from '@/stores/useSettings.ts';
import { ContextMenu, ContextMenuTrigger } from '@shadcn/context-menu';
import { TableCell, TableCellGeneric, TableRow } from '@shadcn/table';
import { type Row } from '@tanstack/vue-table';
import { computed } from 'vue';
import FileContextMenu from '../FileContextMenu.vue';
import FileListRowOptions from './FileListRowOptions.vue';

const routeState = useRouteState();
const listDirQuery = useListDirQuery();
const settings = useSettings();
const sizeFormat = dedupedComputed(() => settings.format.fileSizes);

const props = defineProps<{ row: Row<AnyDirectoryEntry> }>();
const entry = computed(() => props.row.original);
</script>

<template>
    <ContextMenu as-child>
        <ContextMenuTrigger as-child>
            <TableRow
                :data-state="row.getIsSelected() ? 'selected' : undefined"
                @click="row.toggleSelected()"
            >
                <template v-for="cell in row.getVisibleCells()" :key="cell.id">
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
                        <Tooltip :content="value">
                            <span>
                                {{ formatFileSize(value, sizeFormat.type, sizeFormat.bits) }}
                            </span>
                        </Tooltip>
                    </TableCellGeneric>

                    <!-- @vue-generic {Date} -->
                    <TableCellGeneric
                        v-else-if="getTableCellFormat(cell.column.id) === TableCellFormat.DateTime"
                        :cell
                        v-slot="{ value }"
                    >
                        <Tooltip :content="value.toString()">
                            <span>{{ value.toLocaleString() }}</span>
                        </Tooltip>
                    </TableCellGeneric>

                    <!-- @vue-generic {number} -->
                    <TableCellGeneric
                        v-else-if="getTableCellFormat(cell.column.id) === TableCellFormat.Duration"
                        :cell
                        v-slot="{ value }"
                    >
                        <Tooltip :content="value">
                            <span>{{ formatTime(value) }}</span>
                        </Tooltip>
                    </TableCellGeneric>

                    <!-- @vue-generic {any} -->
                    <TableCellGeneric v-else :cell v-slot="{ value }">
                        {{ value }}
                    </TableCellGeneric>
                </template>
            </TableRow>
        </ContextMenuTrigger>
        <FileContextMenu
            :file="row.original"
            :dir="routeState.dir"
            :perms="listDirQuery.data.value?.perms ?? []"
        />
    </ContextMenu>
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
