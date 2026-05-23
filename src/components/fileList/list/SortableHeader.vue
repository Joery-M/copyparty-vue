<script setup lang="ts">
import type { AnyDirectoryEntry } from '@/lib/interop';
import { Button } from '@shadcn/button';
import type { Column } from '@tanstack/vue-table';
import { SortAsc, SortDesc } from 'lucide-vue-next';
import { computed } from 'vue';

const props = defineProps<{ text: string; column: Column<AnyDirectoryEntry> }>();
const emit = defineEmits<{ 'resetSort': [] }>();

function click() {
    const curSort = props.column.getIsSorted();
    if (!curSort) {
        props.column.toggleSorting(true);
    } else if (curSort === 'desc') {
        props.column.toggleSorting(false);
    } else {
        emit('resetSort');
    }
}

const isSorted = computed(() => props.column.getIsSorted());
</script>

<template>
    <Button variant="ghost" @click="click()">
        {{ text }}
        <SortAsc v-if="isSorted === 'asc'" class="size-4" />
        <SortDesc v-else-if="isSorted === 'desc'" class="size-4" />
    </Button>
</template>
