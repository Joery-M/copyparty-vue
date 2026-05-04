<script setup lang="ts">
import { useDark } from '@vueuse/core';
import { defineAsyncComponent } from 'vue';
import { RouterView } from 'vue-router';

const PiniaColadaDevtools =
    __DEV__ &&
    defineAsyncComponent({
        loader: () => import('@pinia/colada-devtools').then((c) => c.PiniaColadaDevtools)
    });

useDark();
</script>

<template>
    <RouterView />
    <component v-if="PiniaColadaDevtools" :is="PiniaColadaDevtools" />
</template>
