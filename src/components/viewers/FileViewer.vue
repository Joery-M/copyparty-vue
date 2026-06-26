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
    switch (lastFile.value?.classification) {
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
            return import('./markdown/MarkdownEditor.vue').then((r) => r.default);
        case FileClassification.RasterImage:
        case FileClassification.VectorImage:
        case FileClassification.Video:
            return import('./MediaViewer.vue').then((r) => r.default);
    }
});

const lastFile = shallowRef<FileEntry | null>(null);
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
</script>

<template>
    <drawer-viewer
        v-if="viewerType === 'drawer'"
        :open="!!routeState.file"
        :title
        :description
        @closing="previewStore.close()"
        @closed="lastFile = null"
    >
        <suspense v-if="lastFile && currentEditor">
            <component :is="currentEditor" :file="lastFile" />
        </suspense>
    </drawer-viewer>
    <dialog-viewer
        v-else-if="viewerType === 'dialog'"
        :open="!!routeState.file"
        :title
        :description
        @closed="
            previewStore.close();
            lastFile = null;
        "
    >
        <suspense v-if="lastFile && currentEditor">
            <component :is="currentEditor" :file="lastFile" />
        </suspense>
    </dialog-viewer>
</template>
