<script setup lang="ts">
import { Tooltip, TooltipContent, TooltipTrigger } from '@shadcn/tooltip';
import { useElementVisibility, useEventListener } from '@vueuse/core';
import { shallowRef, useTemplateRef } from 'vue';

defineProps<{ content: string; useViewportTest?: boolean }>();

const tester = useTemplateRef('tester');
const isVisible = useElementVisibility(tester);

const fullscreenElem = shallowRef<HTMLElement | undefined>();
useEventListener(document, 'fullscreenchange', (ev) => {
    fullscreenElem.value = ev.target instanceof HTMLElement ? ev.target : undefined;
});
</script>

<template>
    <div v-if="useViewportTest" id="pos-tester" ref="tester"></div>
    <Tooltip v-if="!useViewportTest || isVisible">
        <TooltipTrigger as-child>
            <slot> &nbsp; </slot>
        </TooltipTrigger>
        <TooltipContent :attach-to="fullscreenElem">
            <p>{{ content }}</p>
        </TooltipContent>
    </Tooltip>
    <slot v-else> &nbsp; </slot>
</template>

<style scoped>
@reference "@/style.css";

#pos-tester {
    @apply size-0 m-0 p-0 box-content;
}
</style>
