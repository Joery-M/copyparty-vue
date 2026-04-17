<script setup lang="ts">
import { RouterView } from "vue-router";
import { PiniaColadaDevtools } from "@pinia/colada-devtools";
import { useDark, usePreferredDark } from "@vueuse/core";

useDark();
</script>

<template>
  <RouterView />
  <PiniaColadaDevtools />
</template>
