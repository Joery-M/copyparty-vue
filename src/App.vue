<script setup lang="ts">
import { PiniaColadaDevtools } from "@pinia/colada-devtools";
import { useDark } from "@vueuse/core";
import { RouterView } from "vue-router";

useDark();
</script>

<template>
  <RouterView />
  <PiniaColadaDevtools />
</template>
