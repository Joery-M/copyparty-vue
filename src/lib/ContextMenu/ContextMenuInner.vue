<script setup lang="ts">
import { reactiveOmit } from '@vueuse/core';
import {
    ContextMenuContent,
    ContextMenuPortal,
    injectContextMenuRootContext,
    useForwardPropsEmits,
    type ContextMenuContentEmits,
    type ContextMenuContentProps
} from 'reka-ui';
import { injectPopperRootContext } from 'reka-ui/internal';
import { readonly, shallowRef, type HTMLAttributes } from 'vue';
import { cn } from '../utils';
import { provideCustomContextMenuRootContext } from './ContextMenuRoot.vue';

const props = defineProps<ContextMenuContentProps & { class?: HTMLAttributes['class'] }>();
const emits = defineEmits<ContextMenuContentEmits>();

const delegatedProps = reactiveOmit(props, 'class');

const forwarded = useForwardPropsEmits(delegatedProps, emits);

const originalRootContext = injectContextMenuRootContext();
const popperRootContext = injectPopperRootContext();

const curData = shallowRef<any>();

provideCustomContextMenuRootContext({
    data: readonly(curData),
    open(data, point, elem) {
        originalRootContext.triggerElement.value = elem;
        popperRootContext.anchor.value = {
            getBoundingClientRect: () =>
                ({
                    width: 0,
                    height: 0,
                    left: point.x,
                    right: point.x,
                    top: point.y,
                    bottom: point.y
                }) as DOMRect
        };
        curData.value = data;
        originalRootContext.onOpenChange(true);
    }
});
</script>

<template>
    <slot />
    <ContextMenuPortal>
        <ContextMenuContent
            data-slot="context-menu-content"
            v-bind="{ ...$attrs, ...forwarded }"
            :class="
                cn(
                    'data-open:animate-in data-closed:animate-out data-closed:fade-out-0 data-open:fade-in-0 data-closed:zoom-out-95 data-open:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 ring-foreground/10 bg-popover text-popover-foreground min-w-32 rounded-lg p-1 shadow-md ring-1 duration-100 cn-menu-translucent z-50 max-h-(--reka-context-menu-content-available-height) origin-(--reka-context-menu-content-transform-origin) overflow-x-hidden overflow-y-auto',
                    props.class
                )
            "
        >
            <slot name="menu" :data="curData" />
        </ContextMenuContent>
    </ContextMenuPortal>
</template>
