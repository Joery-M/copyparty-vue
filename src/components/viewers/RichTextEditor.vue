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
    <div class="a">
        <MarkdownViewer v-if="fileData.data.value" :input="fileData.data.value" />
    </div>
</template>

<style lang="scss" scoped>
.a {
    display: contents;
    &:deep(.wrapper) {
        height: 100%;
    }
}
</style>
