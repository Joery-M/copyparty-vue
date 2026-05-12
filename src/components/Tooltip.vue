<script setup lang="ts">
import { Tooltip, TooltipContent, TooltipTrigger } from '@shadcn/tooltip';
import { useElementVisibility } from '@vueuse/core';
import { useTemplateRef } from 'vue';

defineProps<{ content: string }>();

const tester = useTemplateRef('tester');
const isVisible = useElementVisibility(tester);
</script>

<template>
    <div id="pos-tester" ref="tester"></div>
    <Tooltip v-if="isVisible">
        <TooltipTrigger as-child>
            <slot />
        </TooltipTrigger>
        <TooltipContent>
            <p>{{ content }}</p>
        </TooltipContent>
    </Tooltip>
    <slot v-else />
</template>

<style scoped>
@reference "@/style.css";

#pos-tester {
    @apply size-0 m-0 p-0 box-content;
}
</style>
