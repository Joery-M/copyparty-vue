<script setup lang="ts">
import type { Row } from '@tanstack/vue-table';

import { unrefElement } from '@vueuse/core';
import { MoreHorizontal } from 'lucide-vue-next';
import { useTemplateRef } from 'vue';

import type { AnyDirectoryEntry } from '@/lib/interop';

import { injectCustomContextMenuRootContext } from '@/lib/ContextMenu/ContextMenuRoot.vue';

import { Button } from '@shadcn/button';

const props = defineProps<{ row: Row<AnyDirectoryEntry> }>();

const btn = useTemplateRef('btn');
const rootContext = injectCustomContextMenuRootContext();

function handleClick(el: HTMLButtonElement) {
    const bounds = unrefElement(btn)?.getBoundingClientRect();
    if (!bounds) return;
    rootContext.open(props.row.original, { x: bounds.x + 5, y: bounds.y + bounds.height + 5 }, el);
    props.row.toggleSelected(true);
}
</script>

<template>
    <Button
        ref="btn"
        size="icon"
        variant="ghost"
        @click.stop="handleClick($el)"
        class="h-8 w-full px-2 rounded-none min-h-full"
    >
        <MoreHorizontal />
    </Button>
</template>
