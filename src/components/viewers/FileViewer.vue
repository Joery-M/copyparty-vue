<script setup lang="ts">
import { FileClassification } from "@/lib/classifyExt";
import type { File } from "@/lib/interop";
import { defineAsyncComponent } from "vue";

const props = defineProps<{ file: File }>();

const editorComponent = defineAsyncComponent({
    loader: () => {
        switch (props.file.classification) {
            case FileClassification.PlainText:
            case FileClassification.RichText:
                return import("./TextEditor.vue");

            default:
                throw "This shouldn't have happened";
        }
    },
});
</script>

<template>
    <component :is="editorComponent" :file />
</template>
