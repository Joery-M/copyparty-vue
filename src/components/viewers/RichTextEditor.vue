<script setup lang="ts">
import { getApiUrl } from '@/lib/api';
import type { File } from '@/lib/interop';
import { useQuery } from '@pinia/colada';

import MarkdownViewer from './MarkdownViewer.vue';

const props = defineProps<{ file: File }>();

const fileData = useQuery({
    key: ['file', ...props.file.fullPath],
    query: ({ signal }) => fetch(getApiUrl(props.file.fullPath), { signal }).then((r) => r.text())
});
</script>

<template>
    <MarkdownViewer v-if="fileData.data.value" :input="fileData.data.value" class="h-full" />
</template>
