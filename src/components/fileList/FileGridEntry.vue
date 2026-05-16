<script setup lang="ts">
import { getApiUrl } from '@/lib/api';
import type { AnyDirectoryEntry } from '@/lib/interop';
import { FileClassification } from '@/lib/classifyExt';
import { HSVtoRGB, seededRandom } from '@/lib/utils';
import { computedAsync } from '@vueuse/core';
import { extname } from 'pathe';
import { computed, ref } from 'vue';

const props = defineProps<{ entry: AnyDirectoryEntry }>();

const imageUrls = computed(() => ({
    webp: getApiUrl(props.entry.fullPath, { th: 'w', no_fallback: '' }),
    jxl: getApiUrl(props.entry.fullPath, { th: 'x', no_fallback: '' }),
    jpeg: getApiUrl(props.entry.fullPath, { th: 'j', no_fallback: '' })
}));

const ext = computed(() => extname(props.entry.name));
const color = computedAsync(() => seededRandom(ext.value), 0);
const fallbackBg = computed(() => HSVtoRGB(color.value, 0.9, 0.2));
const fallbackText = computed(() => HSVtoRGB(color.value, 0.8, 1));

const hasLoaded = ref(false);
</script>

<template>
    <div v-if="!hasLoaded" class="fallback" :style="{ backgroundColor: `rgb(${fallbackBg})` }">
        <p :style="{color: `rgb(${fallbackText})`}">{{ entry.classification === FileClassification.Directory ? $t('folder') : ext }}</p>
    </div>
    <picture :class="{ 'sr-only': !hasLoaded }">
        <source :srcset="imageUrls.webp" type="image/webp" />
        <source :srcset="imageUrls.jxl" type="image/jxl" />
        <img :src="imageUrls.jpeg" loading="lazy" fetchpriority="low" @load="hasLoaded = true" />
    </picture>
    <p>
        {{ entry.name }}
    </p>
</template>

<style scoped>
@reference "@/style.css";

.fallback,
img {
    @apply rounded-md flex-1;
}
.fallback {
    aspect-ratio: 5/4;
    @apply grid place-items-center;
    > p {
        @apply text-center text-accent-foreground text-2xl font-mono;
    }
}

p {
    /* Dunno why i have to do flex here instead of just align-middle */
    @apply line-clamp-2 text-center text-ellipsis flex justify-center items-center flex-1;
    word-break: break-word;
}
</style>
