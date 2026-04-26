<script setup lang="ts">
import { FileClassification } from "@/lib/classifyExt";
import type { File } from "@/lib/interop";
import { usePreview } from "@/stores/usePreview";
import { useRouteState } from "@/stores/useRouteState";
import { computedAsync, whenever } from "@vueuse/core";
import { computed, defineComponent, h, shallowRef } from "vue";
import DrawerViewer from "./DrawerViewer.vue";

import DialogViewer from "./DialogViewer.vue";

const routeState = useRouteState();
const previewStore = usePreview();

type ViewerType = "drawer" | "dialog";

const defaultComponent = defineComponent((_) => {
    return () => h("div");
});

const viewerType = computed<ViewerType>((last) => {
    if (!previewStore.openedFile) return last ?? "dialog";

    switch (previewStore.forceEditorType || previewStore.openedFile?.classification) {
        case FileClassification.RichText:
        case FileClassification.PlainText:
            return "drawer";
        default:
            return "dialog";
    }
});

const currentEditor = computedAsync(async () => {
    switch (previewStore.forceEditorType || previewStore.openedFile?.classification) {
        case FileClassification.PlainText:
            return import("./PlainTextEditor.vue").then((r) => r.default);
        case FileClassification.RichText:
            return import("./RichTextEditor.vue").then((r) => r.default);
        case FileClassification.RasterImage:
        case FileClassification.VectorImage:
        case FileClassification.Video:
            return import("./MediaViewer.vue").then((r) => r.default);
        default:
            return defaultComponent;
    }
});

const lastFile = shallowRef<File | null>(null);
whenever(
    () => previewStore.openedFile,
    (f) => (lastFile.value = f),
    { immediate: true },
);

const title = computed(() => {
    if (lastFile.value?.name) {
        return lastFile.value.name;
    } else {
        return "File viewer";
    }
});
const description = computed(() => {
    if (lastFile.value?.name) {
        return `File viewer for '${lastFile.value.name}'`;
    } else {
        return "Empty file viewer";
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
        <suspense v-if="lastFile">
            <component :is="currentEditor" :file="lastFile" />
        </suspense>
    </drawer-viewer>
    <dialog-viewer
        v-else
        :open="!!routeState.file"
        :title
        :description
        @closed="
            previewStore.close();
            lastFile = null;
        "
    >
        <suspense v-if="lastFile">
            <component :is="currentEditor" :file="lastFile" />
        </suspense>
    </dialog-viewer>
</template>
