<script lang="ts" setup>
import { useQuery } from "@pinia/colada";
import { getTreeOptions } from "../stores/fileStore";
import { reactive } from "vue";

const props = withDefaults(defineProps<{ base?: string[] }>(), {
  base: () => [],
});

const treeQuery = useQuery(getTreeOptions(() => props.base));
const dirsOpen = reactive(new Set<string>());

function toggleOpen(event: ToggleEvent, dir: string) {
  if (event.newState === "open") {
    dirsOpen.add(dir);
  } else {
    dirsOpen.delete(dir);
  }
}
</script>

<template>
  <ul>
    <template
      v-if="treeQuery.data.value"
      v-for="dir in treeQuery.data.value"
      :key="dir"
    >
      <li>
        <details :open="dirsOpen.has(dir)" @toggle="toggleOpen($event, dir)">
          <summary>
            {{ decodeURIComponent(dir) }}
          </summary>
          <TreeView v-if="dirsOpen.has(dir)" :base="base.concat(dir)" />
        </details>
      </li>
    </template>
  </ul>
</template>
