<script setup lang="ts">
import { useDark } from '@vueuse/core';
import { TooltipProvider } from 'reka-ui';
import { RouterView } from 'vue-router';
import 'vue-sonner/style.css';

import { Toaster } from '@shadcn/sonner';

useDark();
</script>

<template>
    <TooltipProvider>
        <RouterView />
    </TooltipProvider>
    <Toaster position="bottom-right" close-button />
</template>
