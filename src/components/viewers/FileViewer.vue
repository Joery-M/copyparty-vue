<script setup lang="ts">
import { FileClassification } from '@/lib/classifyExt';
import type { File } from '@/lib/interop';
import { defineAsyncComponent } from 'vue';

const props = defineProps<{ file: File }>();

const editorComponent = defineAsyncComponent({
    loader: () => {
        switch (props.file.classification) {
            case FileClassification.PlainText:
                return import('./PlainTextEditor.vue');
            case FileClassification.RichText:
                return import('./RichTextEditor.vue');

            default:
                throw "This shouldn't have happened";
        }
    }
});
</script>

<template>
    <component :is="editorComponent" :file />
</template>
