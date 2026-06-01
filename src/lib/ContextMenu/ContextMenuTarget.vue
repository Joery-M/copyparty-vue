<script setup lang="ts">
import { Slot, useForwardExpose } from 'reka-ui';
import { nextTick, ref, toRefs } from 'vue';
import { injectCustomContextMenuRootContext } from './ContextMenuRoot.vue';

function isTouchOrPen(event: PointerEvent) {
    return event.pointerType !== 'mouse';
}

defineOptions({
    inheritAttrs: false
});

const { forwardRef, currentElement } = useForwardExpose();
const props = defineProps<{ data: any; disabled?: boolean }>();
const { disabled } = toRefs(props);

const rootContext = injectCustomContextMenuRootContext();

const longPressTimer = ref(0);
function clearLongPress() {
    window.clearTimeout(longPressTimer.value);
}

function handleOpen(event: MouseEvent | PointerEvent) {
    if (currentElement.value) {
        rootContext.open(props.data, { x: event.clientX, y: event.clientY }, currentElement.value);
    }
}

async function handleContextMenu(event: PointerEvent) {
    if (!disabled.value) {
        await nextTick();
        if (!event.defaultPrevented) {
            event.preventDefault();
            clearLongPress();
            handleOpen(event);
        }
    }
}

async function handlePointerDown(event: PointerEvent) {
    if (!disabled.value) {
        await nextTick();

        if (isTouchOrPen(event) && !event.defaultPrevented) {
            // clear the long press here in case there's multiple touch points
            clearLongPress();
            longPressTimer.value = window.setTimeout(handleOpen, 700, event);
        }
    }
}

async function handlePointerEvent(event: PointerEvent) {
    if (!disabled.value) {
        await nextTick();
        if (isTouchOrPen(event) && !event.defaultPrevented) clearLongPress();
    }
}
</script>

<template>
    <Slot
        :ref="forwardRef"
        @contextmenu="handleContextMenu"
        @pointerdown="handlePointerDown"
        @pointermove="handlePointerEvent"
        @pointercancel="handlePointerEvent"
        @pointerup="handlePointerEvent"
        :style="{
            WebkitTouchCallout: 'none',
            pointerEvents: 'auto'
        }"
    >
        <slot />
    </Slot>
</template>
