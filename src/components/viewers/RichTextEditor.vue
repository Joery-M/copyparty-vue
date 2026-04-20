<script setup lang="ts">
import { getApiUrl } from '@/lib/api';
import type { File } from '@/lib/interop';
import { useQuery } from '@pinia/colada';
import { whenever } from '@vueuse/core';
import Quill from 'quill';
import { effect, shallowRef, useTemplateRef } from 'vue';
import DrawerViewer from './DrawerViewer.vue';

const props = defineProps<{ file: File }>();

const editorElem = useTemplateRef('editor');

const quill = shallowRef<Quill | null>(null);

const fileData = useQuery({
    key: ['file', ...props.file.fullPath],
    query: ({ signal }) => fetch(getApiUrl(props.file.fullPath), { signal }).then((r) => r.text())
});
whenever(
    editorElem,
    (elem) => {
        quill.value = new Quill(elem);
    },
    { once: true }
);

effect(() => {
    if (typeof fileData.data.value === 'string') {
        quill.value?.setText(fileData.data.value);
    }
});
</script>

<template>
    <DrawerViewer :title="file.name" :description="`Markdown editor for file '${file.name}'`">
        <div ref="editor" />
    </DrawerViewer>
</template>
