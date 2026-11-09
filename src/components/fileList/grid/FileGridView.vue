<script setup lang="ts">
import type { TableType } from '@/components/fileList/FileList.vue';
import type { AnyDirectoryEntry } from '@/lib/interop.ts';

import LoadingGrid from '@/components/fileList/grid/LoadingGrid.vue';
import { useRouteState } from '@/stores/useRouteState';
import { useSettings } from '@/stores/useSettings';

import FileGridEntry from './FileGridEntry.vue';

const settings = useSettings();
const routeState = useRouteState();

const props = defineProps<{
    isLoading: boolean;
    table: TableType;
    data: AnyDirectoryEntry[];
}>();
</script>

<template>
    <div class="wrapper">
        <LoadingGrid v-if="isLoading" />
        <FileGridEntry
            v-else
            v-for="entry in table.getRowModel().rows"
            :key="entry.id"
            :dir="routeState.dir"
            :data="() => data"
            :entry
        />
    </div>
</template>

<style scoped>
@reference "@/style.css";

.wrapper {
    @apply grid gap-5 gap-x-8 transition-[grid-template-columns] max-lg:place-content-evenly;
    display: grid;
    grid-template-columns: repeat(
        auto-fill,
        minmax(
            calc(var(--spacing) * 25),
            calc(var(--spacing) * v-bind('settings.fileView.gridSize'))
        )
    );
}
</style>
