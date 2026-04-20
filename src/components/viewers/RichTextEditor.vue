<script setup lang="ts">
import { getApiUrl } from '@/lib/api';
import type { File } from '@/lib/interop';
import { useQuery } from '@pinia/colada';
import Quill, { Delta } from 'quill';
import { computed, effect, useTemplateRef } from 'vue';

const props = defineProps<{ file: File }>();

const editorElem = useTemplateRef('editor');

const quill = computed<Quill | undefined>((old) => {
    if (!editorElem.value) return old;
    return new Quill(editorElem.value, { theme: 'snow' });
});

const fileData = useQuery({
    key: ['file', ...props.file.fullPath],
    query: ({ signal }) => fetch(getApiUrl(props.file.fullPath), { signal }).then((r) => r.text())
});

effect(() => {
    if (fileData.data.value != null && quill.value) {
        quill.value.setContents(
            new Delta({
                ops: [{ delete: quill.value.getLength() }, { insert: fileData.data.value }]
            })
        );
    }
});
</script>

<template>
    <div class="wrapper">
        <div ref="editor"></div>
    </div>
</template>

<style></style>

<style src="quill/dist/quill.snow.css"></style>
<style lang="scss" scoped>
.wrapper {
    height: 100%;
}
</style>
