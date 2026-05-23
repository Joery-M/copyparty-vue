<script setup lang="ts">
import FileGridEntry from '@/components/fileList/FileGridEntry.vue';
import { dedupedComputed } from '@/lib/utils';
import { useListDirQuery } from '@/pages/Files.vue';
import { useRouteState } from '@/stores/useRouteState';
import { useSettings } from '@/stores/useSettings';

const settings = useSettings();
const listDirQuery = useListDirQuery();
const routeState = useRouteState();

const data = dedupedComputed(() => listDirQuery.data.value?.entries ?? null);
</script>

<template>
    <div class="wrapper">
        <FileGridEntry
            v-for="entry in data"
            :key="entry.name"
            :entry
            :dir="routeState.dir"
            :perms="listDirQuery.data.value?.perms ?? []"
        />
    </div>
</template>

<style scoped>
@reference "@/style.css";

.wrapper {
    @apply grid gap-5 gap-x-8 transition-[grid-template-columns];
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
