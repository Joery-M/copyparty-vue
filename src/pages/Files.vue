<script setup lang="ts">
import { useQuery } from "@pinia/colada";
import { useRoute } from "vue-router";
import { getTreeOptions } from "../stores/fileStore";
import TreeView from "../components/TreeView.vue";

const route = useRoute();
</script>

<template>
  Main folder viewer {{ route.params }}
  <TreeView />
</template>
