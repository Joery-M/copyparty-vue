<script setup lang="ts">
import { getApiUrl } from '@/lib/api';
import { type File } from '@/lib/interop';
import { fetchWithProgress } from '@/lib/utils';
import { useQuery } from '@pinia/colada';
import { useTimeoutFn, whenever } from '@vueuse/core';
import { effect, ref } from 'vue';

const props = defineProps<{ file: File }>();

const showProgress = ref(true);
const loadProgress = ref(0);

whenever(
    () => loadProgress.value === 1,
    () => useTimeoutFn(() => (showProgress.value = false), 200)
);
// If we are still loading after a second, show the progress
useTimeoutFn(() => {
    if (loadProgress.value < 1 && !sourceText.value) showProgress.value = true;
}, 1000);

const fileData = useQuery({
    key: () => ['file', ...(props.file.fullPath ?? [])],
    query: ({ signal }) =>
        fetchWithProgress(
            (p) => (loadProgress.value = Math.min(p.transferred / p.size, 1)),
            getApiUrl(props.file.fullPath),
            { signal }
        ).then((r) => r.text()),
    gcTime: 0,
    refetchOnReconnect: false,
    refetchOnWindowFocus: false
});

const sourceText = ref('');

effect(() => {
    if (typeof fileData.data.value === 'string') {
        sourceText.value = fileData.data.value;
    }
});
</script>

<template>
    <div :style="{ width: loadProgress * 100 + '%', opacity: showProgress ? 1 : 0 }" />
    <textarea v-model="sourceText" />
</template>

<style scoped>
@reference "@/style.css";

div {
    @apply absolute top-0 left-0 transition-all h-0.5 bg-ring;
}
textarea {
    @apply size-full resize-none text-base outline-accent outline px-4;
}
</style>
