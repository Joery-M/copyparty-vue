<script setup lang="ts">
import type { HTMLAttributes } from 'vue';

import { Crepe } from '@milkdown/crepe';
import { rootCtx } from '@milkdown/kit/core';
import { Milkdown, useEditor } from '@milkdown/vue';
import { parseURL } from 'ufo';

import { getApiUrl } from '@/lib/api';
import { useRouteState } from '@/stores/useRouteState';

export interface MarkdownViewerProps {
    input: string;
    class?: HTMLAttributes['class'];
}

const props = defineProps<MarkdownViewerProps>();

const routeState = useRouteState();

useEditor((root) => {
    const crepe = new Crepe({
        defaultValue: props.input,
        featureConfigs: {
            [Crepe.Feature.ImageBlock]: {
                proxyDomURL: (url) => {
                    if (!url) return url;
                    const parsedUrl = parseURL(url);
                    if (parsedUrl.host) return url;
                    return getApiUrl(routeState.dir.concat(...url.split('/')), { raw: '' });
                },
            },
        },
        features: {
            [Crepe.Feature.AI]: false,
        },
    });
    crepe.editor.config((ctx) => {
        ctx.set(rootCtx, root);
    });
    crepe.setReadonly(true);

    return crepe;
});
</script>

<template>
    <Milkdown :class />
</template>

<style src="./milkdown.css"></style>
