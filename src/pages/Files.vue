<script lang="ts">
import { API } from '@/lib/api';
import { useAuth } from '@/stores/useAuth';
import { getDirFromRouteParams } from '@/stores/useRouteState';
import { defineColadaLoader } from 'vue-router/experimental/pinia-colada';

export const useListDirQuery = defineColadaLoader({
    key: (to) => ['ls', ...getDirFromRouteParams(to.params)],
    query: (to, { signal }) => API.getListDirectory(getDirFromRouteParams(to.params), signal),
    staleTime: 30_000
});
</script>

<script setup lang="ts">
import ConfirmDialog from '@/components/ConfirmDialog.vue';
import FileGridView from '@/components/fileList/FileGridView.vue';
import FileListView from '@/components/fileList/FileListView.vue';
import ViewSelector from '@/components/fileList/ViewSelector.vue';
import LoginDialog from '@/components/LoginDialog.vue';
import RouteBreadCrumb from '@/components/RouteBreadCrumb.vue';
import Toolbar from '@/components/Toolbar.vue';
import FileViewer from '@/components/viewers/FileViewer.vue';
import { useRouteState } from '@/stores/useRouteState';
import { useSettings } from '@/stores/useSettings';
import { useUploader } from '@/stores/useUploader';
import { Separator } from '@shadcn/separator';
import { useDropZone, useEventListener, whenever } from '@vueuse/core';
import { computed, defineAsyncComponent } from 'vue';
import TreeView from '../components/TreeView.vue';

const settings = useSettings();
const uploader = useUploader();
const routeState = useRouteState();
const authStore = useAuth();

const listDirQuery = useListDirQuery();

const readmes = computed(() => (listDirQuery.data.value?.readmes ?? []).filter((v) => !!v));
const MarkdownViewer = defineAsyncComponent(
    () => import('@/components/viewers/MarkdownViewer.vue')
);

useDropZone(document.body, {
    onDrop(files, event) {
        const f = event.dataTransfer?.items ?? files;
        if (f && f.length > 0) uploader.upload(f, routeState.dir);
    }
});
useEventListener(document, 'paste', (ev) => {
    const f = ev.clipboardData?.items;
    if (f && f.length > 0) uploader.upload(ev.clipboardData.items, routeState.dir);
});

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
</script>

<template>
    <Toolbar />

    <div class="flex flex-col flex-1 mb-[env(safe-area-inset-bottom)]">
        <Separator class="mb-2" />
        <TreeView wrapper-class="inline-flex flex-1" class="p-6 flex flex-col gap-3">
            <div class="flex sm:items-center max-sm:flex-col max-sm:gap-2">
                <RouteBreadCrumb class="flex-1" />
                <ViewSelector />
            </div>
            <FileListView v-if="settings.fileView.type === 'list'" />
            <FileGridView v-else-if="settings.fileView.type === 'grid'" />
            <Separator v-if="readmes.length" class="mb-10" />
            <template v-for="readme in readmes">
                <MarkdownViewer :input="readme"></MarkdownViewer>
            </template>
        </TreeView>
    </div>

    <!-- Overlays -->
    <FileViewer />
    <ConfirmDialog />
    <LoginDialog />
</template>
