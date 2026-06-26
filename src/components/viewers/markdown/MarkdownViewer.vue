<script setup lang="ts">
import { MilkdownProvider } from '@milkdown/vue';

import type { MarkdownViewerProps } from './MarkdownViewerInner.vue';

import MarkdownViewer from './MarkdownViewerInner.vue';

defineProps<MarkdownViewerProps>();
</script>

<template>
    <MilkdownProvider>
        <MarkdownViewer v-bind="$props" />
    </MilkdownProvider>
</template>
