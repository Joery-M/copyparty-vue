import type { FileClassification } from '@/lib/classifyExt';
import { File } from '@/lib/interop';
import { useRouteState } from '@/stores/useRouteState';
import { whenever } from '@vueuse/core';
import { useRouteHash } from '@vueuse/router';
import { basename, extname } from 'pathe';
import { defineStore } from 'pinia';
import { computed, shallowRef } from 'vue';

export const usePreview = defineStore('preview', () => {
    const routeState = useRouteState();
    const openedFile = computed(() => {
        if (routeState.file) {
            return new File(routeState.dir, {
                ext: extname(routeState.file),
                href: basename(routeState.file)
            });
        } else {
            return null;
        }
    });
    const forceEditorType = shallowRef<FileClassification | null>(null);

    whenever(
        () => !openedFile.value,
        () => {
            forceEditorType.value = null;
        }
    );

    const routeHash = useRouteHash();
    return {
        openedFile,
        forceEditorType,
        close() {
            routeHash.value = null;
        }
    };
});
