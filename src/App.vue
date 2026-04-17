<script setup lang="ts">
import { RouterView } from "vue-router";
import { PiniaColadaDevtools } from "@pinia/colada-devtools";
</script>

<template>
  <RouterView />
  <PiniaColadaDevtools />
</template>
