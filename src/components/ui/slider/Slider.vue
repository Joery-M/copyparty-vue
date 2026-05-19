<script setup lang="ts">
import type { SliderRootEmits, SliderRootProps } from 'reka-ui'
import type { HTMLAttributes } from 'vue'
import { reactiveOmit } from '@vueuse/core'
import { SliderRange, SliderRoot, SliderThumb, SliderTrack, useForwardPropsEmits } from 'reka-ui'
import { cn } from '@/lib/utils'
import Tooltip from '@/components/Tooltip.vue'

const props = defineProps<SliderRootProps & { class?: HTMLAttributes['class'], loaded?: number, formattedValue?: string | number, tooltip?: boolean }>()
const emits = defineEmits<SliderRootEmits>()

const delegatedProps = reactiveOmit(props, ['class', 'loaded', 'formattedValue', 'tooltip'])

const forwarded = useForwardPropsEmits(delegatedProps, emits)
</script>

<template>
  <SliderRoot
    v-slot="{ modelValue }"
    data-slot="slider"
    :data-vertical="props.orientation === 'vertical' ? '' : undefined"
    :class="cn(
      'data-vertical:min-h-40 relative flex w-full touch-none items-center select-none data-disabled:opacity-50 data-vertical:h-full data-vertical:w-auto data-vertical:flex-col',
      props.class,
    )"
    v-bind="forwarded"
  >
    <SliderTrack
      data-slot="slider-track"
      :data-horizontal="props.orientation !== 'vertical' ? '' : undefined"
      :data-vertical="props.orientation === 'vertical' ? '' : undefined"
      class="bg-black/40 rounded-md data-horizontal:h-1 data-vertical:w-1 relative grow overflow-hidden data-horizontal:w-full data-vertical:h-full"
    >
      <SliderRange
        data-slot="slider-range"
        :data-horizontal="props.orientation !== 'vertical' ? '' : undefined"
        :data-vertical="props.orientation === 'vertical' ? '' : undefined"
        class="bg-primary absolute select-none data-horizontal:h-full data-vertical:w-full"
      />
      <div class="loaded" v-if="props.max != null && props.loaded != null" :style="{width: `${(props.loaded / props.max) * 100}%`}"></div>
    </SliderTrack>

    <template v-for="(v, key) in modelValue" :key="key">
      <Tooltip v-if="tooltip" :content="formattedValue ?? v" disable-closing-trigger>
        <SliderThumb
          data-slot="slider-thumb"
          :data-vertical="props.orientation === 'vertical' ? '' : undefined"
          class="relative size-3 rounded-md border bg-foreground ring-foreground transition-[color,box-shadow] after:absolute after:-inset-2 hover:ring-1 focus-visible:ring-1 focus-visible:outline-hidden block shrink-0 select-none disabled:pointer-events-none disabled:opacity-50"
        />
      </Tooltip>
      <SliderThumb
          v-else
          data-slot="slider-thumb"
          :data-vertical="props.orientation === 'vertical' ? '' : undefined"
          class="relative size-3 rounded-md border bg-foreground ring-foreground transition-[color,box-shadow] after:absolute after:-inset-2 hover:ring-1 focus-visible:ring-1 focus-visible:outline-hidden block shrink-0 select-none disabled:pointer-events-none disabled:opacity-50"
        />
    </template>
  </SliderRoot>
</template>

<style scoped>
@reference "@/style.css";

.loaded {
  @apply h-full bg-accent-foreground/20 rounded-r-full;
}
</style>