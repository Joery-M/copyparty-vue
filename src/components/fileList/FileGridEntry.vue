<script setup lang="ts">
import FileContextMenu from '@/components/fileList/FileContextMenu.vue';
import { getApiUrl } from '@/lib/api';
import { FileClassification } from '@/lib/classifyExt';
import { Directory, type AnyDirectoryEntry } from '@/lib/interop';
import { HSVtoRGB, seededRandom } from '@/lib/utils';
import { Card, CardTitle } from '@shadcn/card';
import { ContextMenu, ContextMenuTrigger } from '@shadcn/context-menu';
import { computedAsync } from '@vueuse/core';
import { extname } from 'pathe';
import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';

const router = useRouter();

const props = defineProps<{ entry: AnyDirectoryEntry; dir: string[] }>();

const imageUrls = computed(() => ({
    webp: getApiUrl(props.entry.fullPath, { th: 'w', no_fallback: '', cache: '' }),
    jxl: getApiUrl(props.entry.fullPath, { th: 'x', no_fallback: '', cache: '' }),
    jpeg: getApiUrl(props.entry.fullPath, { th: 'j', no_fallback: '', cache: '' })
}));

const ext = computed(() => extname(props.entry.name));
const color = computedAsync(() => seededRandom(ext.value), 0);
const fallbackBg = computed(() => HSVtoRGB(color.value, 0.9, 0.2));
const fallbackText = computed(() => HSVtoRGB(color.value, 0.8, 1));

const hasLoaded = ref(false);

function onDoubleClick() {
    if (
        props.entry instanceof Directory ||
        props.entry.classification === FileClassification.Directory
    ) {
        return router.push({ name: 'viewer', params: { path: props.entry.fullPath.concat('') } });
    }

    switch (props.entry.classification) {
        case FileClassification.PlainText:
        case FileClassification.RichText:
        case FileClassification.RasterImage:
        case FileClassification.VectorImage:
        case FileClassification.Video:
            return router.push({
                name: 'viewer',
                params: { path: props.dir.concat('') },
                hash: '#' + props.entry.name
            });

        default:
            location.href = getApiUrl(props.entry.fullPath);
    }
}

const openNewTab = () => {
    const url =
        props.entry.classification === FileClassification.Directory
            ? router.resolve({
                  name: 'viewer',
                  params: { path: props.entry.fullPath.concat('') }
              }).href
            : getApiUrl(props.entry.fullPath);
    const aTag = document.createElement('a');
    aTag.setAttribute('href', url);
    aTag.setAttribute('target', '_blank');
    aTag.click();
    aTag.remove();
};
</script>

<template>
    <ContextMenu>
        <ContextMenuTrigger as-child>
            <Card
                @pointerup.middle="openNewTab()"
                @dblclick.prevent="onDoubleClick()"
                role="gridcell"
                class="gap-2 py-2"
            >
                <div class="thumbnail">
                    <picture :aria-hidden="!hasLoaded">
                        <source :srcset="imageUrls.webp" type="image/webp" />
                        <source :srcset="imageUrls.jxl" type="image/jxl" />
                        <img
                            :src="imageUrls.jpeg"
                            aria-labelledby="filename"
                            loading="lazy"
                            fetchpriority="low"
                            @load="hasLoaded = true"
                        />
                    </picture>
                    <div
                        class="fallback"
                        role="image"
                        aria-labelledby="filename"
                        :style="{
                            backgroundColor: `rgb(${fallbackBg})`,
                            opacity: hasLoaded ? 0 : 1
                        }"
                        :aria-hidden="hasLoaded"
                    >
                        <p aria-hidden="true" :style="{ color: `rgb(${fallbackText})` }">
                            {{
                                entry.classification === FileClassification.Directory
                                    ? $t('folder')
                                    : ext
                            }}
                        </p>
                    </div>
                </div>
                <CardTitle>
                    <label id="filename">{{ entry.tags.get('title') || entry.name }}</label>
                </CardTitle>
            </Card>
        </ContextMenuTrigger>
        <FileContextMenu :file="entry" :dir />
    </ContextMenu>
</template>

<style scoped>
@reference "@/style.css";

.thumbnail {
    @apply relative rounded-md w-full aspect-5/4;

    .fallback {
        @apply absolute left-0 top-0 size-full grid place-items-center transition-opacity;
        > p {
            @apply text-center text-accent-foreground text-2xl font-mono;
        }
    }

    img {
        @apply size-full object-contain;
    }
}

[data-slot='card-title'] {
    @apply flex-1 grid place-items-center w-full;
    > label {
        @apply line-clamp-2 px-2 text-center text-base;
        word-break: break-word;
    }
}
</style>
