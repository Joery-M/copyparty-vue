<script lang="ts">
import { defineColadaLoader } from 'vue-router/experimental/pinia-colada';

import { API } from '@/lib/api';
import { getDirFromRouteParams } from '@/stores/useRouteState';

export const useListDirQuery = defineColadaLoader({
    key: (to) => ['ls', ...getDirFromRouteParams(to.params)],
    query: (to, { signal }) => API.getListDirectory(getDirFromRouteParams(to.params), signal),
    refetchOnWindowFocus: false,
    staleTime: 30_000,
    errors: true,
    lazy: true,
});
</script>

<script setup lang="ts">
import { isEqual } from '@ver0/deep-equal';
import { useDropZone, useEventListener, useTitle, whenever } from '@vueuse/core';
import { computed, defineAsyncComponent } from 'vue';
import { useI18n } from 'vue-i18n';
import { onBeforeRouteUpdate } from 'vue-router';
import { toast } from 'vue-sonner';

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
import ContextMenuRoot from '@/lib/ContextMenu/ContextMenuRoot.vue';
import { useShortcut } from '@/lib/keyboard.ts';
import { useAuth } from '@/stores/useAuth';
import { useFileSelection } from '@/stores/useFileSelection.ts';
import { useHandlers } from '@/stores/useHandlers.ts';
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
const handlers = useHandlers();
const i18n = useI18n();

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
useEventListener('paste', (ev) => {
    const f = ev.clipboardData?.items;
    console.log(ev.clipboardData?.items);
    ev.clipboardData?.items[0].getAsString((r) => {
        console.log(r);
    });
    console.log(ev.clipboardData?.types);
    console.log(ev.clipboardData?.files);
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

function onCopy(event: ClipboardEvent) {
    if (!window.getSelection()?.isCollapsed || fileSelection.selectedFiles.size === 0) return;
    event.preventDefault();

    const entries = Array.from(fileSelection.selectedFiles);
    handlers
        .copyEntriesToClipboard(entries)
        .then(() => toast(() => i18n.t('toast.copied', entries.length)))
        .catch((error) => {
            console.error(error);
            toast.error(() => i18n.t('toast.error'), {
                description: () => i18n.t('error.couldnt_copy', 1),
            });
        });
}
</script>

<template>
    <Toolbar />
    <div class="flex flex-col flex-1 mb-[env(safe-area-inset-bottom)]">
        <Separator class="mb-2" />
        <TreeView wrapper-class="inline-flex flex-1" class="flex flex-col gap-3" @copy="onCopy">
            <ContextMenuRoot>
                <div class="flex flex-col gap-3 p-6" :class="{ grow: !readmes.length }">
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
                    <Separator v-if="readmes.length" class="mt-5" />
                </div>
                <template v-slot:menu="{ data }">
                    <FileViewContextMenu
                        :dir="routeState.dir"
                        :file="data"
                        :perms="listDirQuery.data.value?.perms ?? []"
                    />
                </template>
            </ContextMenuRoot>
            <template v-for="readme in readmes">
                <MarkdownViewer class="p-6 pt-0 grow" :input="readme"></MarkdownViewer>
            </template>
            <footer>
                <p class="text-xs text-neutral-600 text-right px-6 mb-1">
                    <a
                        class="transition-colors hover:underline hover:text-foreground"
                        href="https://github.com/9001/copyparty"
                        target="_blank"
                        >copyparty</a
                    >
                    -
                    <a
                        class="transition-colors hover:underline hover:text-foreground"
                        href="https://github.com/Joery-M/copyparty-vue"
                        target="_blank"
                        >frontend</a
                    >
                </p>
            </footer>
        </TreeView>
    </div>

    <!-- Overlays -->
    <FileViewer />
    <ConfirmDialog />
    <!-- Only show login dialog if there is no preview open -->
    <LoginDialog v-if="!routeState.file" />
</template>
