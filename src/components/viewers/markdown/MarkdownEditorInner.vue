<script setup lang="ts">
import type { Uploader } from '@milkdown/kit/plugin/upload';
import type { Node } from '@milkdown/kit/prose/model';

import { Crepe } from '@milkdown/crepe';
import { uploadConfig } from '@milkdown/kit/plugin/upload';
import { replaceAll } from '@milkdown/utils';
import { Milkdown, useEditor } from '@milkdown/vue';
import { useQuery, useQueryCache } from '@pinia/colada';
import { computedAsync, useDebounceFn, whenever } from '@vueuse/core';
import { parseURL } from 'ufo';
import { computed, onBeforeUnmount, watchEffect } from 'vue';

import type { FileEntry } from '@/lib/interop';

import { getApiUrl } from '@/lib/api';
import { refWithInit } from '@/lib/utils';
import { useAuth } from '@/stores/useAuth';
import { useRouteState } from '@/stores/useRouteState';
import { useUploader } from '@/stores/useUploader';

export interface MarkdownEditorProps {
    file: FileEntry;
}

const props = defineProps<MarkdownEditorProps>();
const fileData = useQuery({
    key: ['file', ...props.file.fullPath],
    query: ({ signal }) => fetch(getApiUrl(props.file.fullPath), { signal }).then((r) => r.text()),
    enabled: () => !!props.file,
});

const model = refWithInit(() => fileData.data.value ?? '');

const authStore = useAuth();
const uploader = useUploader();
const routeState = useRouteState();

const routePerms = computedAsync(() => authStore.getPermissions(routeState.dir));
const canWrite = computed(() => !!routePerms.value?.includes('write'));

const mdUploader: Uploader = async (files, schema) => {
    const images: File[] = [];

    for (let i = 0; i < files.length; i++) {
        const file = files.item(i);
        if (!file) {
            continue;
        }

        // You can handle whatever the file type you want, we handle image here.
        if (!file.type.includes('image')) {
            continue;
        }

        images.push(file);
    }

    const uploaded = await uploader.upload(images, routeState.dir);
    const nodes: Node[] = [];

    for (const [path, file] of uploaded.entries()) {
        nodes.push(
            schema.nodes.image.createAndFill({
                src: getApiUrl(routeState.dir.concat(...path.split('/')), { raw: '' }),
                alt: file.name,
            }) as Node
        );
    }

    return nodes;
};

useEditor((root) => {
    const crepe = new Crepe({
        defaultValue: model.value,
        root,
        featureConfigs: {
            [Crepe.Feature.ImageBlock]: {
                proxyDomURL: (url) => {
                    if (!url) return url;
                    const parsedUrl = parseURL(url);
                    if (parsedUrl.host) return url;
                    return getApiUrl(routeState.dir.concat(...url.split('/')), { raw: '' });
                },
                async onUpload(file) {
                    const successMap = await uploader.upload(file, routeState.dir);
                    const path = Array.from(successMap.keys())[0];
                    return path;
                },
            },
        },
        features: {
            [Crepe.Feature.AI]: false,
        },
    });
    crepe.editor.config((ctx) => {
        ctx.update(uploadConfig.key, (prev) => ({
            ...prev,
            uploader: mdUploader,
        }));
    });
    crepe.on((events) => {
        events.markdownUpdated((_, code) => {
            model.value = code;
            saveFn();
        });
    });
    watchEffect(() => crepe.setReadonly(!canWrite.value));
    whenever(fileData.data, () => crepe.editor.action(replaceAll(model.value)), { once: true });

    return crepe;
});

let didEdit = false;
const queryCache = useQueryCache();
async function doSave() {
    if (!canWrite.value) return;
    const data = model.value;
    if (fileData.data.value === data) return;
    await fetch(getApiUrl(props.file.fullPath, { replace: '' }), {
        method: 'PUT',
        headers: { replace: 'true' },
        body: data,
    });
    queryCache.setQueryData(['file', ...props.file.fullPath], data);
    didEdit = true;
}

const saveFn = useDebounceFn(() => doSave(), 2500);
onBeforeUnmount(async () => {
    await doSave();
    if (didEdit) {
        queryCache.invalidateQueries({ key: ['ls', ...routeState.dir] }, false);
    }
});
</script>

<template>
    <Milkdown />
</template>

<style src="./milkdown.css"></style>
