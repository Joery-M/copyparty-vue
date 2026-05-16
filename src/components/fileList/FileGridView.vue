<script setup lang="ts">
import FileGridEntry from '@/components/fileList/FileGridEntry.vue';
import { API, getApiUrl } from '@/lib/api';
import { FileClassification } from '@/lib/classifyExt';
import { Directory, type AnyDirectoryEntry } from '@/lib/interop';
import { dedupedComputed } from '@/lib/utils';
import { useListDirQuery } from '@/pages/Files.vue';
import { useAuth } from '@/stores/useAuth';
import { useRouteState } from '@/stores/useRouteState';
import { whenever } from '@vueuse/core';
import { h } from 'vue';
import { RouterLink } from 'vue-router';

const listDirQuery = useListDirQuery();
const routeState = useRouteState();
const authStore = useAuth();

whenever(listDirQuery.error, (err) => {
    if (err instanceof API.ApiError) {
        if (err.cause.code === 403) {
            authStore.loginDialog.reveal({
                path: routeState.dir,
                reason: 'unauthorized',
                canCancel: false
            });
        } else if (err.cause.code === 401) {
            authStore.loginDialog.reveal({
                path: routeState.dir,
                reason: 'not found',
                canCancel: false
            });
        }
    }
});

const data = dedupedComputed(() => listDirQuery.data.value?.entries ?? null);

function getEntryRenderFunction(entry: AnyDirectoryEntry) {
    if (entry instanceof Directory || entry.classification === FileClassification.Directory) {
        return h(
            RouterLink,
            { to: { name: 'viewer', params: { path: entry.fullPath.concat('') } } },
            () => h(FileGridEntry, { entry })
        );
    }

    switch (entry.classification) {
        case FileClassification.PlainText:
        case FileClassification.RichText:
        case FileClassification.RasterImage:
        case FileClassification.VectorImage:
        case FileClassification.Video:
            return h(
                RouterLink,
                {
                    to: {
                        name: 'viewer',
                        params: { path: routeState.dir.concat('') },
                        hash: '#' + entry.name
                    }
                },
                () => h(FileGridEntry, { entry })
            );

        default:
            return h(
                'a',
                { href: getApiUrl(entry.fullPath), download: entry.name, target: '_blank' },
                h(FileGridEntry, { entry })
            );
    }
}
</script>

<template>
    <div class="wrapper">
        <component v-for="entry in data" :key="entry.name" :is="getEntryRenderFunction(entry)" />
    </div>
</template>

<style scoped>
@reference "@/style.css";

.wrapper {
    @apply grid gap-4 justify-around;
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(110px, 240px));
}
.grid-item {
    @apply w-80 h-56;
}

.wrapper > a {
    @apply flex flex-col bg-sidebar p-1.5 rounded-md gap-1;
}
</style>
