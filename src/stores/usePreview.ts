import { whenever } from '@vueuse/core';
import { basename, extname } from 'pathe';
import { defineStore } from 'pinia';
import { computed, shallowRef } from 'vue';
import { useRouter } from 'vue-router';

import type { FileClassification } from '@/lib/classifyExt';

import { FileEntry } from '@/lib/interop';
import { useRouteState } from '@/stores/useRouteState';

export const usePreview = defineStore('preview', () => {
    const routeState = useRouteState();
    const router = useRouter();
    const openedFile = computed(() => {
        if (routeState.file) {
            return new FileEntry(routeState.dir, {
                ext: extname(routeState.file),
                // Slightly stupid since @vueuse/router decodes, then we encode, and then decode again in the constructor, but idc really
                href: encodeURIComponent(basename(routeState.file)),
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

    return {
        openedFile,
        forceEditorType,
        close() {
            // Go to the exact same route, just without a hash
            router.push({ ...router.currentRoute.value, hash: undefined });
            // Find all opengraph meta tags and remove them
            const meta = document.head.querySelectorAll('meta');
            for (const elem of meta) {
                const property = elem.getAttribute('property');
                if (property && (property.startsWith('og:') || property.startsWith('twitter:'))) {
                    elem.remove();
                }
            }
        },
    };
});
