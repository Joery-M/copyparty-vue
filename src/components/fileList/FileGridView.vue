<script setup lang="ts">
import FileGridEntry from '@/components/fileList/FileGridEntry.vue';
import { dedupedComputed } from '@/lib/utils';
import { useListDirQuery } from '@/pages/Files.vue';
import { useRouteState } from '@/stores/useRouteState';

const listDirQuery = useListDirQuery();
const routeState = useRouteState();

const data = dedupedComputed(() => listDirQuery.data.value?.entries ?? null);
</script>

<template>
    <div class="wrapper">
        <FileGridEntry v-for="entry in data" :key="entry.name" :entry :dir="routeState.dir" />
    </div>
</template>

<style scoped>
@reference "@/style.css";

.wrapper {
    @apply grid gap-5 gap-x-8;
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(110px, 240px));
}
.grid-item {
    @apply w-80 h-56;
}
</style>
