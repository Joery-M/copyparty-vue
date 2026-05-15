<script setup lang="ts">
import ConfirmDialog from '@/components/ConfirmDialog.vue';
import FileListView from '@/components/fileList/FileListView.vue';
import LoginDialog from '@/components/LoginDialog.vue';
import RouteBreadCrumb from '@/components/RouteBreadCrumb.vue';
import Toolbar from '@/components/Toolbar.vue';
import FileViewer from '@/components/viewers/FileViewer.vue';
import { useRouteState } from '@/stores/useRouteState';
import { useUploader } from '@/stores/useUploader';
import { Separator } from '@shadcn/separator';
import { useDropZone, useEventListener, useLocalStorage } from '@vueuse/core';
import TreeView from '../components/TreeView.vue';

const fileListType = useLocalStorage<'list' | 'grid'>('list-type', 'list');

const uploader = useUploader();
const routeState = useRouteState();

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
</script>

<template>
    <Toolbar />

    <div class="flex flex-col flex-1">
        <Separator class="my-4" />
        <TreeView wrapper-class="inline-flex flex-1" class="p-6 flex flex-col gap-3">
            <RouteBreadCrumb />
            <FileListView v-if="fileListType === 'list'" />
        </TreeView>
    </div>

    <!-- Overlays -->
    <FileViewer />
    <ConfirmDialog />
    <LoginDialog />
</template>
