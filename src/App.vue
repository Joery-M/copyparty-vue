<script setup lang="ts">
import 'vue-sonner/style.css';
import { useDark } from '@vueuse/core';
import { TooltipProvider } from 'reka-ui';
import { defineAsyncComponent } from 'vue';
import { RouterView } from 'vue-router';

import { Toaster } from '@shadcn/sonner';

const PiniaColadaDevtools =
    __DEV__ &&
    defineAsyncComponent({
        loader: () => import('@pinia/colada-devtools').then((c) => c.PiniaColadaDevtools),
    });

useDark();
</script>

<template>
    <TooltipProvider>
        <RouterView />
    </TooltipProvider>
    <component v-if="PiniaColadaDevtools" :is="PiniaColadaDevtools" />
    <Toaster position="bottom-right" close-button />
</template>
