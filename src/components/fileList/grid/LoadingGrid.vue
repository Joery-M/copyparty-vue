<script setup lang="ts">
import { Skeleton } from '@shadcn/skeleton';
</script>

<template>
    <template v-for="i in 18">
        <Skeleton :data-i="i" class="aspect-5/4"></Skeleton>
    </template>
</template>

<style lang="scss" scoped>
// Delay the skeleton animations and stagger them

@for $i from 1 through 18 {
    [data-i='#{$i}'] {
        animation-delay: $i * 250ms;
    }
}

[data-slot='skeleton'] {
    --animate-pulse: pulse2 5s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}
</style>

<style>
@keyframes pulse2 {
    0%,
    40% {
        opacity: 1;
    }
    20% {
        opacity: 0.5;
    }
}
</style>
