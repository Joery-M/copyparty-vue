<script setup lang="ts">
import { computedAsync } from '@vueuse/core';
import { extname } from 'pathe';
import { computed, ref, toRaw } from 'vue';
import { useRouter } from 'vue-router';

import type { AnyDirectoryEntry } from '@/lib/interop';

import { getApiUrl } from '@/lib/api';
import { canView, FileClassification } from '@/lib/classifyExt';
import ContextMenuTarget from '@/lib/ContextMenu/ContextMenuTarget.vue';
import { Directory } from '@/lib/interop';
import { deselectAll, HSVtoRGB, seededRandom } from '@/lib/utils';
import { useFileSelection } from '@/stores/useFileSelection';

const router = useRouter();
const fileSelection = useFileSelection();

const props = defineProps<{
    entry: AnyDirectoryEntry;
    dir: string[];
    data: () => AnyDirectoryEntry[];
}>();

const isSelected = computed(() => fileSelection.selectedFiles.has(toRaw(props.entry)));

const imageUrls = computed(() => ({
    webp: getApiUrl(props.entry.fullPath, { th: 'w', no_fallback: '', cache: '' }),
    jxl: getApiUrl(props.entry.fullPath, { th: 'x', no_fallback: '', cache: '' }),
    jpeg: getApiUrl(props.entry.fullPath, { th: 'j', no_fallback: '', cache: '' }),
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

    if (canView(props.entry.classification)) {
        router.push({
            name: 'viewer',
            params: { path: props.dir.concat('') },
            hash: '#' + props.entry.name,
        });
    } else {
        location.href = getApiUrl(props.entry.fullPath);
    }
}

const openNewTab = () => {
    const url =
        props.entry.classification === FileClassification.Directory
            ? router.resolve({
                  name: 'viewer',
                  params: { path: props.entry.fullPath.concat('') },
              }).href
            : getApiUrl(props.entry.fullPath);
    const aTag = document.createElement('a');
    aTag.setAttribute('href', url);
    aTag.setAttribute('target', '_blank');
    aTag.click();
    aTag.remove();
};

function onClick(event: MouseEvent) {
    if (event.ctrlKey) {
        fileSelection.toggleEntry(props.entry);
    } else if (event.shiftKey && fileSelection.lastSelectedNonRange) {
        // Not so fancy inject
        const rows = props.data();
        const lastSelectedIndex = rows.indexOf(fileSelection.lastSelectedNonRange);
        const curIndex = rows.indexOf(props.entry);
        if (lastSelectedIndex >= 0 && curIndex >= 0 && lastSelectedIndex !== curIndex) {
            const lowerBound = Math.min(lastSelectedIndex, curIndex);
            const upperBound = Math.max(lastSelectedIndex, curIndex);
            fileSelection.selectedFiles = new Set(rows.slice(lowerBound, upperBound + 1));
            fileSelection.lastSelected = props.entry;
            deselectAll();
        }
    } else {
        fileSelection.selectNone();
        fileSelection.setEntry(props.entry, true);
    }
}
</script>

<template>
    <ContextMenuTarget :data="entry" @open="fileSelection.setEntry(entry, true)">
        <div
            @pointerup.middle="openNewTab()"
            @dblclick.prevent="onDoubleClick()"
            @click="onClick"
            role="gridcell"
            :data-state="isSelected ? 'selected' : undefined"
            :data-active="fileSelection.lastSelected === entry ? 'active' : undefined"
            class="entry group/card"
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
                        opacity: hasLoaded ? 0 : 1,
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
            <div class="entry-title">
                <label id="filename">{{ entry.tags.get('title') || entry.name }}</label>
            </div>
        </div>
    </ContextMenuTarget>
</template>

<style scoped>
@reference "@/style.css";

.thumbnail {
    @apply relative rounded-md w-full aspect-5/4;

    .fallback {
        @apply absolute left-0 top-0 size-full grid place-items-center transition-opacity;
        > p {
            @apply text-center text-accent-foreground text-2xl font-mono select-none;
        }
    }

    img {
        @apply size-full object-contain;
    }
}

.entry {
    @apply bg-card text-card-foreground overflow-hidden rounded-lg text-xs/relaxed has-[>img:first-child]:pt-0 has-[>.thumbnail:first-child]:pt-0 *:[img:first-child]:rounded-t-lg *:[img:last-child]:rounded-b-lg flex flex-col gap-2 py-2 ring-0 ring-muted transition-all not-dark:outline hover:bg-muted;

    &[data-state='selected'] {
        @apply bg-muted ring-3 ring-ring/80;
    }
    &[data-active='active'] {
        @apply ring-3 ring-primary;
    }

    .entry-title {
        @apply text-sm font-medium flex-1 grid place-items-center w-full;
        > label {
            @apply line-clamp-2 px-2 text-center text-base;
            word-break: break-word;
        }
    }
}
</style>
