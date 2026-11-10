<script setup lang="ts">
import type { Column } from '@tanstack/vue-table';

import { SortAsc, SortDesc } from '@lucide/vue';
import { computed } from 'vue';

import type { TableFeatures } from '@/components/fileList/file-list';
import type { AnyDirectoryEntry } from '@/lib/interop';

import { useFileTable } from '@/components/fileList/file-list';
import Tooltip from '@/components/Tooltip.vue';

import { Button } from '@shadcn/button';

const props = defineProps<{
    tag: string;
    text: string;
    column: Column<TableFeatures, AnyDirectoryEntry>;
}>();

const { resetSorting } = useFileTable();

function click() {
    const curSort = props.column.getIsSorted();
    if (!curSort) {
        props.column.toggleSorting(true);
    } else if (curSort === 'desc') {
        props.column.toggleSorting(false);
    } else {
        resetSorting();
    }
}

const isSorted = computed(() => props.column.getIsSorted());
</script>

<template>
    <Tooltip :content="tag">
        <Button variant="ghost" @click="click()">
            {{ text }}
            <SortAsc v-if="isSorted === 'asc'" class="size-4" />
            <SortDesc v-else-if="isSorted === 'desc'" class="size-4" />
        </Button>
    </Tooltip>
</template>

<style scoped>
@reference "@/style.css";

button {
    @apply size-full px-2 rounded-none;
}
</style>
