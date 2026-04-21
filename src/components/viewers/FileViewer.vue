<script setup lang="ts">
import { FileClassification } from '@/lib/classifyExt';
import { useLastDefined } from '@/lib/utils';
import { usePreview } from '@/stores/usePreview';
import { useRouteState } from '@/stores/useRouteState';
import { computedAsync } from '@vueuse/core';
import { computed, defineComponent, h } from 'vue';
import DrawerViewer from './DrawerViewer.vue';

const routeState = useRouteState();
const previewStore = usePreview();

type ViewerType = 'drawer' | 'dialog';

const defaultComponent = defineComponent((_) => {
    return () => h('div');
});

const viewerType = computed<ViewerType>((last) => {
    if (!previewStore.openedFile) return last ?? 'dialog';

    switch (previewStore.forceEditorType || previewStore.openedFile?.classification) {
        case FileClassification.RichText:
        case FileClassification.PlainText:
            return 'drawer';
        default:
            return 'dialog';
    }
});

const currentEditor = computedAsync(async () => {
    switch (previewStore.forceEditorType || previewStore.openedFile?.classification) {
        case FileClassification.PlainText:
            return import('./PlainTextEditor.vue').then((r) => r.default);
        case FileClassification.RichText:
            return import('./RichTextEditor.vue').then((r) => r.default);
        default:
            return defaultComponent;
    }
});

const lastFile = useLastDefined(() => previewStore.openedFile!);

const title = computed(() => {
    if (lastFile.value?.name) {
        return lastFile.value.name;
    } else {
        return 'File viewer';
    }
});
const description = computed(() => {
    if (lastFile.value?.name) {
        return `File viewer for '${lastFile.value.name}'`;
    } else {
        return 'Empty file viewer';
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
        @closed="previewStore.close()"
    >
        <suspense v-if="lastFile">
            <component :is="currentEditor" :file="lastFile" />
        </suspense>
    </drawer-viewer>
    <template v-else>
        <suspense v-if="lastFile">
            <component :is="currentEditor" :file="lastFile" />
        </suspense>
    </template>
</template>
