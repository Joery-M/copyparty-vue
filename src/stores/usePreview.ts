import type { FileClassification } from '@/lib/classifyExt';
import type { File } from '@/lib/interop';
import { useRouteState } from '@/stores/useRouteState';
import { whenever } from '@vueuse/core';
import { useRouteHash } from '@vueuse/router';
import { defineStore } from 'pinia';
import { shallowRef } from 'vue';

export const usePreview = defineStore('preview', () => {
    const openedFile = shallowRef<File | null>(null);
    const forceEditorType = shallowRef<FileClassification | null>(null);

    whenever(
        () => !openedFile.value,
        () => {
            forceEditorType.value = null;
        }
    );
    const routeState = useRouteState();
    whenever(
        () => !routeState.file,
        () => {
            openedFile.value = null;
        }
    );

    const routeHash = useRouteHash();
    return {
        openedFile,
        forceEditorType,
        close() {
            openedFile.value = null;
            routeHash.value = null;
        }
    };
});
