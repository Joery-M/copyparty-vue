<script setup lang="ts">
import { computed } from 'vue';

import { useListDirQuery } from '@/pages/Files.vue';
import { useRouteState } from '@/stores/useRouteState';
import { useSettings } from '@/stores/useSettings';

import FileGridEntry from './FileGridEntry.vue';

const settings = useSettings();
const listDirQuery = useListDirQuery();
const routeState = useRouteState();

const data = computed(() => listDirQuery.data.value?.entries ?? []);
</script>

<template>
    <div class="wrapper">
        <FileGridEntry
            v-for="entry in data"
            :key="entry.name"
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
