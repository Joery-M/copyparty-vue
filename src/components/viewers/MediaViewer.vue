<script setup lang="ts">
import { getApiUrl } from '@/lib/api';
import { FileClassification } from '@/lib/classifyExt';
import type { File } from '@/lib/interop';

const props = defineProps<{ file: File }>();

const mediaUrl = getApiUrl(props.file.fullPath);
</script>

<template>
    <div class="size-full overflow-y-auto grid place-items-center">
        <template
            v-if="
                file.classification === FileClassification.RasterImage ||
                file.classification === FileClassification.VectorImage
            "
        >
            <img
                class="max-h-[calc(100%-5rem)] max-w-[calc(100%-5rem)] min-h-0"
                :src="mediaUrl"
                :alt="file.name"
            />
        </template>
    </div>
    <div>
        <Buttongrou
    </div>
</template>
