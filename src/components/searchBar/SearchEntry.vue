<script setup lang="ts">
import { extname } from 'pathe';
import { injectPopoverRootContext } from 'reka-ui';
import { useRouter } from 'vue-router';

import type { SearchFileEntry } from '@/lib/interop';

import { canView, classifyExtension } from '@/lib/classifyExt';
import { pathToParts } from '@/lib/utils';

const props = defineProps<{ entry: SearchFileEntry }>();
const rootContext = injectPopoverRootContext();

const path = pathToParts(props.entry.fullPath).map(decodeURIComponent);
path.pop();

let prefixSections: string | undefined;
let suffixSections: string | undefined;

let chars = 0;
const total = path.reduce((i, s) => i + s.length, 0);
let cutStart;
let cutEnd;
if (total > 60) {
    for (let i = 0; i < path.length; i++) {
        const section = path[i];
        chars += section.length;
        if (chars > 20 && cutStart === undefined) {
            cutStart = i;
        }
        if (cutStart !== undefined && total - chars < 20 && cutEnd === undefined) {
            cutEnd = i;
        }
    }
}
if (cutStart === cutEnd) {
    prefixSections = path.join('/');
} else {
    prefixSections = path.slice(0, cutStart).join('/');
    suffixSections = path.slice(cutEnd).join('/');
}

const router = useRouter();
async function navigate() {
    if (canView(classifyExtension(extname(props.entry.name)))) {
        router.push({
            name: 'viewer',
            params: { path: path.concat('') },
            hash: '#' + props.entry.name,
        });
    } else {
        router.push({
            name: 'viewer',
            params: { path: path.concat('') },
            query: { s: JSON.stringify(props.entry.name) },
        });
    }
    rootContext.open.value = false;
}
</script>

<template>
    <div role="option" class="search-result" tabindex="-1" @click="navigate">
        <label>
            <span class="path">
                <span class="prefix">/{{ prefixSections }}</span>
                <template v-if="suffixSections">
                    ...
                    <span class="suffix">{{ suffixSections }}</span>
                </template>
            </span>
            <span class="name">/{{ entry.name }}</span>
        </label>
    </div>
</template>

<style>
@reference "@/style.css";

.search-result {
    @apply py-1;
    .path {
        @apply text-muted-foreground;
    }
    .name {
        @apply text-foreground text-sm;
    }
}
</style>
