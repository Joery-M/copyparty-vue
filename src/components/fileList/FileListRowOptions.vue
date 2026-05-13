<script setup lang="ts">
import { Button } from '@shadcn/button';
import { useElementBounding } from '@vueuse/core';
import { MoreHorizontal } from 'lucide-vue-next';
import { useTemplateRef } from 'vue';

const btn = useTemplateRef('btn');
const btnBounds = useElementBounding(btn);

// Me no likey, but me no find better solution
function handleClick(event: MouseEvent, el: HTMLButtonElement) {
    const ev = new Event('contextmenu', event) as Event & { clientX: number; clientY: number };
    ev.clientX = btnBounds.x.value + 5;
    ev.clientY = btnBounds.y.value + btnBounds.height.value + 5;
    el.dispatchEvent(ev);
}
</script>

<template>
    <Button ref="btn" size="icon" variant="ghost" @click="handleClick($event, $el)">
        <MoreHorizontal />
    </Button>
</template>
