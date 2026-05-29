<script setup lang="ts" generic="V">
import { computed, type HTMLAttributes } from 'vue'
import { cn } from '@/lib/utils'

const props = defineProps<{
  class?: HTMLAttributes['class'],
  cell: import('@tanstack/vue-table').Cell<any, any>
}>()
const value = computed(() => props.cell.getValue<V>())
</script>

<template>
  <td
    data-slot="table-cell"
    :class="cn('p-2 align-middle whitespace-nowrap [&:has([role=checkbox])]:pr-0', props.class)"
  >
    <slot v-if="value != null" :value />
  </td>
</template>
