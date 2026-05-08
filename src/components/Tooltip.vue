<script setup lang="ts">
import { Tooltip, TooltipContent, TooltipTrigger } from '@shadcn/tooltip';

defineProps<{ content: string }>();
</script>

<template>
    <Tooltip>
        <TooltipTrigger as-child>
            <slot />
        </TooltipTrigger>
        <TooltipContent>
            <p>{{ content }}</p>
        </TooltipContent>
    </Tooltip>
</template>
