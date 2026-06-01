<script setup lang="ts">
import { injectCustomContextMenuRootContext } from '@/lib/ContextMenu/ContextMenuRoot.vue';
import type { AnyDirectoryEntry } from '@/lib/interop';
import { Button } from '@shadcn/button';
import { useElementBounding } from '@vueuse/core';
import { MoreHorizontal } from 'lucide-vue-next';
import { useTemplateRef } from 'vue';

const props = defineProps<{ entry: AnyDirectoryEntry }>();

const btn = useTemplateRef('btn');
const btnBounds = useElementBounding(btn);
const rootContext = injectCustomContextMenuRootContext();

function handleClick(el: HTMLButtonElement) {
    rootContext.open(
        props.entry,
        { x: btnBounds.x.value + 5, y: btnBounds.y.value + btnBounds.height.value + 5 },
        el
    );
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
