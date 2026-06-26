<script setup lang="ts">
import { MilkdownProvider } from '@milkdown/vue';

import type { MarkdownEditorProps } from './MarkdownEditorInner.vue';

import MarkdownEditor from './MarkdownEditorInner.vue';

defineProps<MarkdownEditorProps>();
</script>

<template>
    <MilkdownProvider>
        <MarkdownEditor v-bind="$props" />
    </MilkdownProvider>
</template>
