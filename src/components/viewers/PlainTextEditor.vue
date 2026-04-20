<script setup lang="ts">
import { getApiUrl } from '@/lib/api';
import { type File } from '@/lib/interop';
import { useQuery } from '@pinia/colada';
import { effect, ref } from 'vue';

const props = defineProps<{ file: File }>();

const fileData = useQuery({
    key: () => ['file', ...(props.file.fullPath ?? [])],
    query: ({ signal }) => fetch(getApiUrl(props.file.fullPath), { signal }).then((r) => r.text())
});

const sourceText = ref('');

effect(() => {
    if (typeof fileData.data.value === 'string') {
        sourceText.value = fileData.data.value;
    }
});
</script>

<template>
    <textarea v-model="sourceText" class="outline-accent outline px-4" />
</template>

<style lang="scss" scoped>
textarea {
    width: 100%;
    height: 100%;
    resize: none;
    font-size: var(--text-base);
}
</style>
