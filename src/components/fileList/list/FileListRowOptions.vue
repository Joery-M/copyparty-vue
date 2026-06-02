<script setup lang="ts">
import type { Row } from '@tanstack/vue-table';

import { useElementBounding } from '@vueuse/core';
import { MoreHorizontal } from 'lucide-vue-next';
import { useTemplateRef } from 'vue';

import type { AnyDirectoryEntry } from '@/lib/interop';

import { injectCustomContextMenuRootContext } from '@/lib/ContextMenu/ContextMenuRoot.vue';

import { Button } from '@shadcn/button';

const props = defineProps<{ row: Row<AnyDirectoryEntry> }>();

const btn = useTemplateRef('btn');
const btnBounds = useElementBounding(btn);
const rootContext = injectCustomContextMenuRootContext();

function handleClick(el: HTMLButtonElement) {
    rootContext.open(
        props.row.original,
        { x: btnBounds.x.value + 5, y: btnBounds.y.value + btnBounds.height.value + 5 },
        el
    );
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
