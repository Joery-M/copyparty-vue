<script setup lang="ts">
import FileListView from '@/components/FileListView.vue';
import FileViewer from '@/components/viewers/FileViewer.vue';
import { useDropZone, useEventListener, useLocalStorage } from '@vueuse/core';
import TreeView from '../components/TreeView.vue';

import ConfirmDialog from '@/components/ConfirmDialog.vue';
import Toolbar from '@/components/Toolbar.vue';
import { useRouteState } from '@/stores/useRouteState';
import { useUploader } from '@/stores/useUploader';
import { Separator } from '@shadcn/separator';
import { ref } from 'vue';
import { useAuth } from '@/stores/useAuth';

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

const auth = useAuth();
const username = ref('');
const password = ref('');
</script>

<template>
    <Toolbar />

    <div class="flex flex-col flex-1">
        <Separator class="my-4" />
        <TreeView class="inline-flex flex-1">
            <div class="my-12 mx-6">
                <input v-model="username" />
                <input v-model="password" />
                <button type="button" @click="auth.login(password, username)">Login</button>
                <FileListView v-if="fileListType === 'list'" />
            </div>
        </TreeView>
    </div>

    <!-- Overlays -->
    <FileViewer />
    <ConfirmDialog />
</template>
