<script setup lang="ts">
import { useQuery } from '@pinia/colada';

import type { FileEntry } from '@/lib/interop';

import { getApiUrl } from '@/lib/api';

import MarkdownViewer from './MarkdownViewer.vue';

const props = defineProps<{ file: FileEntry }>();

const fileData = useQuery({
    key: ['file', ...props.file.fullPath],
    query: ({ signal }) => fetch(getApiUrl(props.file.fullPath), { signal }).then((r) => r.text()),
});
</script>

<template>
    <MarkdownViewer v-if="fileData.data.value" :input="fileData.data.value" class="h-full" />
</template>
