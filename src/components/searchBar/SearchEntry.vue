<script setup lang="ts">
import type { SearchFileEntry } from '@/lib/interop';

const props = defineProps<{ entry: SearchFileEntry; active: boolean }>();

const path = [...props.entry.path];
path.pop();
const pathString = '/' + path.join('/');
</script>

<template>
    <div
        role="option"
        class="search-result"
        tabindex="-1"
        @click="$emit('selected')"
        @keydown.enter="$emit('selected')"
        :data-active="active ? '' : undefined"
    >
        <label>
            <span class="path">{{ pathString }}</span><span class="name">/{{ entry.name }}</span>
        </label>
    </div>
</template>

<style>
@reference "@/style.css";

.search-result {
    @apply py-1 px-1 rounded-md;
    .path {
        @apply text-muted-foreground text-ellipsis overflow-x-clip shrink min-w-0;
    }
    .name {
        @apply text-foreground text-sm grow text-ellipsis overflow-x-clip max-w-full;
    }
    > label {
        @apply flex items-baseline whitespace-nowrap max-w-full;
    }
    cursor: pointer;

    &[data-active],
    &:hover {
        @apply bg-accent;
        outline: none;
    }
}
</style>
