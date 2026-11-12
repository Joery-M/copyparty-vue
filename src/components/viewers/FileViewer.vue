<script setup lang="ts">
import { computedAsync, whenever } from '@vueuse/core';
import { computed, shallowRef } from 'vue';
import { useI18n } from 'vue-i18n';

import type { FileEntry } from '@/lib/interop';

import { FileClassification } from '@/lib/classifyExt';
import { usePreview } from '@/stores/usePreview';
import { useRouteState } from '@/stores/useRouteState';

import DialogViewer from './DialogViewer.vue';
import DrawerViewer from './DrawerViewer.vue';

const routeState = useRouteState();
const previewStore = usePreview();

const viewerType = computed(() => {
    switch (previewStore.openedFile?.classification) {
        case FileClassification.RichText:
        case FileClassification.PlainText:
            return 'drawer';
        case FileClassification.RasterImage:
        case FileClassification.VectorImage:
        case FileClassification.Video:
            return 'dialog';
    }
    return undefined;
});

const currentEditor = computedAsync(async () => {
    // If you are changing this, make sure to update `canView` in `classifyExt.ts`
    switch (previewStore.openedFile?.classification) {
        case FileClassification.PlainText:
            return import('./PlainTextEditor.vue').then((r) => r.default);
        case FileClassification.RichText:
            return import('./RichTextEditor.vue').then((r) => r.default);
        case FileClassification.RasterImage:
        case FileClassification.VectorImage:
        case FileClassification.Video:
            return import('./MediaViewer.vue').then((r) => r.default);
    }
});

const lastDrawerFile = shallowRef<FileEntry | null>(null);
const lastDialogFile = shallowRef<FileEntry | null>(null);
const lastFile = computed({
    get: () => (viewerType.value === 'drawer' ? lastDrawerFile.value : lastDialogFile.value),
    set: (f) =>
        viewerType.value === 'drawer' ? (lastDrawerFile.value = f) : (lastDialogFile.value = f),
});
whenever(
    () => previewStore.openedFile,
    (f) => (lastFile.value = f),
    { immediate: true }
);

const i18n = useI18n();
const title = computed(() => {
    if (lastFile.value?.name) {
        return lastFile.value.name;
    } else {
        return i18n.t('viewer.default_title');
    }
});
const description = computed(() => {
    if (lastFile.value?.name) {
        return i18n.t('viewer.description', [lastFile.value.name]);
    } else {
        return i18n.t('viewer.default_description');
    }
});

function closing(type: string) {
    if (type !== viewerType.value) return;
    previewStore.close();
}
function closed(type: string) {
    if (type === 'drawer') {
        lastDrawerFile.value = null;
    } else if (type === 'dialog') {
        lastDialogFile.value = null;
    }
}
</script>

<template>
    <drawer-viewer
        :open="!!routeState.file && viewerType === 'drawer' && !lastDialogFile"
        :title
        :description
        @closing="closing('drawer')"
        @closed="closed('drawer')"
    >
        <suspense v-if="lastDrawerFile && currentEditor">
            <component :is="currentEditor" :file="lastDrawerFile" />
        </suspense>
    </drawer-viewer>
    <dialog-viewer
        :open="!!routeState.file && viewerType === 'dialog' && !lastDrawerFile"
        :title
        :description
        @closed="
            closing('dialog');
            closed('dialog');
        "
    >
        <suspense v-if="lastDialogFile && currentEditor">
            <component :is="currentEditor" :file="lastDialogFile" />
        </suspense>
    </dialog-viewer>
</template>

<style>
[data-vaul-overlay],
[data-vaul-drawer] {
    animation-duration: 0.3s !important;
    animation-timing-function: cubic-bezier(0.61, 1, 0.88, 1);
}
</style>
