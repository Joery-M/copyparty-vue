<script lang="ts">
import { isEqual } from '@ver0/deep-equal';
import { defineStore } from 'pinia';
import { onBeforeRouteUpdate } from 'vue-router';
import { defineColadaLoader } from 'vue-router/experimental/pinia-colada';

import type { AnyDirectoryEntry } from '@/lib/interop';

import { API } from '@/lib/api';
import ContextMenuRoot from '@/lib/ContextMenu/ContextMenuRoot.vue';
import ContextMenuTarget from '@/lib/ContextMenu/ContextMenuTarget.vue';
import { useShortcut } from '@/lib/keyboard.ts';
import { useAuth } from '@/stores/useAuth';
import { getDirFromRouteParams } from '@/stores/useRouteState';

export const useListDirQuery = defineColadaLoader({
    key: (to) => ['ls', ...getDirFromRouteParams(to.params)],
    query: (to, { signal }) => API.getListDirectory(getDirFromRouteParams(to.params), signal),
    refetchOnWindowFocus: false,
    staleTime: 30_000,
    errors: true,
    lazy: true,
});

export const useFileSelection = defineStore('file-selection', () => {
    const listDirQuery = useListDirQuery();

    const selectedFiles = shallowRef(new Set<AnyDirectoryEntry>());
    const dirEntries = computed(() => listDirQuery.data.value?.entries ?? null);

    return {
        selectedFiles,
        invertSelection() {
            if (!dirEntries.value) return;
            const newSelection = new Set(dirEntries.value);
            selectedFiles.value.forEach((f) => newSelection.delete(f));
            selectedFiles.value = newSelection;
        },
        selectAll() {
            if (!dirEntries.value) return;
            selectedFiles.value = new Set(dirEntries.value);
        },
        selectNone() {
            selectedFiles.value = new Set();
        },
        setSelectedNames(names: string[]) {
            if (!dirEntries.value) return;
            selectedFiles.value = new Set(
                dirEntries.value.filter(({ name }) => names.includes(name))
            );
        },
        toggleEntry(entry: AnyDirectoryEntry) {
            selectedFiles.value.has(entry)
                ? selectedFiles.value.delete(entry)
                : selectedFiles.value.add(entry);
            triggerRef(selectedFiles); // Dont ask, idk
        },
    };
});
</script>

<script setup lang="ts">
import { useDropZone, useEventListener, useTitle, whenever } from '@vueuse/core';
import { computed, defineAsyncComponent, shallowRef, triggerRef } from 'vue';

import ConfirmDialog from '@/components/ConfirmDialog.vue';
import FileViewContextMenu from '@/components/fileList/FileViewContextMenu.vue';
import FileGridView from '@/components/fileList/grid/FileGridView.vue';
import FileListView from '@/components/fileList/list/FileListView.vue';
import OnlyUploadCard from '@/components/fileList/OnlyUploadCard.vue';
import ViewSelector from '@/components/fileList/ViewSelector.vue';
import LoginDialog from '@/components/LoginDialog.vue';
import RouteBreadCrumb from '@/components/RouteBreadCrumb.vue';
import Toolbar from '@/components/Toolbar.vue';
import FileViewer from '@/components/viewers/FileViewer.vue';
import { useRouteState } from '@/stores/useRouteState';
import { useSettings } from '@/stores/useSettings';
import { useUploader } from '@/stores/useUploader';

import TreeView from '../components/TreeView.vue';

import { Separator } from '@shadcn/separator';

const settings = useSettings();
const uploader = useUploader();
const routeState = useRouteState();
const authStore = useAuth();
const fileSelection = useFileSelection();

const listDirQuery = useListDirQuery();

const readmes = computed(() => (listDirQuery.data.value?.readmes ?? []).filter((v) => !!v));
const MarkdownViewer = defineAsyncComponent(
    () => import('@/components/viewers/MarkdownViewer.vue')
);

const dropzone = useDropZone(document.body, {
    onDrop(files, event) {
        const f = event.dataTransfer?.items ?? files;
        if (f && f.length > 0) uploader.upload(f, routeState.dir);
    },
});
useEventListener(document, 'paste', (ev) => {
    const f = ev.clipboardData?.items;
    if (f && f.length > 0) uploader.upload(ev.clipboardData.items, routeState.dir);
});

useTitle(() => {
    if (routeState.file) {
        return `${routeState.file} - copyparty`;
    } else {
        return routeState.dir.length > 0 ? `${routeState.dir.at(-1)} - copyparty` : `copyparty`;
    }
});

whenever(listDirQuery.error, (err) => {
    if (err instanceof API.ApiError) {
        if (err.cause.code === 403 || err.cause.code === 401) {
            authStore.loginDialog.reveal({
                path: routeState.dir,
                reason: 'unauthorized',
                canCancel: false,
            });
        } else if (err.cause.code === 404) {
            authStore.loginDialog.reveal({
                path: routeState.dir,
                reason: 'not found',
                canCancel: false,
            });
        }
    }
});
const canOnlyUpload = computed(
    () =>
        listDirQuery.data.value &&
        listDirQuery.data.value.perms.length > 0 &&
        listDirQuery.data.value.perms.includes('write') &&
        !listDirQuery.data.value.perms.includes('read')
);
onBeforeRouteUpdate((to, from) => {
    if (!isEqual(getDirFromRouteParams(to.params), getDirFromRouteParams(from.params))) {
        fileSelection.selectNone();
    }
});

useShortcut('Escape', () => fileSelection.selectNone());
useShortcut('g', () =>
    settings.fileView.type === 'grid'
        ? (settings.fileView.type = 'list')
        : (settings.fileView.type = 'grid')
);
useShortcut(
    (e) => e.key === 'i' && e.ctrlKey,
    (e) => (e.preventDefault(), fileSelection.invertSelection())
);
</script>

<template>
    <Toolbar />
    <div class="flex flex-col flex-1 mb-[env(safe-area-inset-bottom)]">
        <Separator class="mb-2" />
        <TreeView wrapper-class="inline-flex flex-1" class="p-6 flex flex-col gap-3">
            <ContextMenuRoot>
                <ContextMenuTarget :data="undefined">
                    <div class="flex flex-col gap-3" :class="{ 'min-h-full': !readmes.length }">
                        <div class="flex sm:items-center sm:h-7 max-sm:flex-col max-sm:gap-2">
                            <RouteBreadCrumb class="flex-1" />
                            <ViewSelector v-if="!canOnlyUpload" />
                        </div>
                        <OnlyUploadCard
                            v-if="canOnlyUpload"
                            :file-over="dropzone.isOverDropZone.value"
                        />
                        <FileListView v-else-if="settings.fileView.type === 'list'" />
                        <FileGridView v-else-if="settings.fileView.type === 'grid'" />
                        <Separator v-if="readmes.length" class="my-5" />
                    </div>
                </ContextMenuTarget>
                <template v-slot:menu="{ data }">
                    <FileViewContextMenu
                        :dir="routeState.dir"
                        :file="data"
                        :perms="listDirQuery.data.value?.perms ?? []"
                    />
                </template>
            </ContextMenuRoot>
            <template v-for="readme in readmes">
                <MarkdownViewer :input="readme"></MarkdownViewer>
            </template>
        </TreeView>
    </div>

    <!-- Overlays -->
    <FileViewer />
    <ConfirmDialog />
    <!-- Only show login dialog if there is no preview open -->
    <LoginDialog v-if="!routeState.file" />
</template>
