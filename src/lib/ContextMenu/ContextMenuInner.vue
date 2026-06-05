<script setup lang="ts">
import { ContextMenuContent, ContextMenuPortal, injectContextMenuRootContext, Slot } from 'reka-ui';
import { injectPopperRootContext } from 'reka-ui/internal';
import { nextTick, provide, readonly, ref, shallowRef } from 'vue';

import type { ContextMenuPayload, ContextMenuRootContext } from './utils.ts';

import { injectionKeyCustomContextMenuRootContext } from './utils.ts';

const originalRootContext = injectContextMenuRootContext();
const popperRootContext = injectPopperRootContext();

const curTarget = shallowRef<[Element, ContextMenuPayload] | null>(null);

const rootContext: ContextMenuRootContext = {
    curTarget: readonly(curTarget),
    isOpen: readonly(originalRootContext.open),
    elemMap: new Map(),
    async open(payload, point, elem) {
        originalRootContext.triggerElement.value = undefined;
        popperRootContext.anchor.value = undefined;
        curTarget.value = null;
        originalRootContext.onOpenChange(false);
        await nextTick();
        originalRootContext.triggerElement.value = elem;
        popperRootContext.anchor.value = {
            getBoundingClientRect: () =>
                ({
                    width: 0,
                    height: 0,
                    left: point.x,
                    right: point.x,
                    top: point.y,
                    bottom: point.y,
                }) as DOMRect,
        };
        curTarget.value = [elem, payload];
        originalRootContext.onOpenChange(true);
        elem.setAttribute('data-context-menu', 'open');
        payload.onOpen?.();
    },
};

provide(injectionKeyCustomContextMenuRootContext, rootContext);

function isTouchOrPen(event: PointerEvent) {
    return event.pointerType !== 'mouse';
}

const longPressTimer = ref(0);
function clearLongPress() {
    window.clearTimeout(longPressTimer.value);
}

function handleOpen(event: MouseEvent | PointerEvent) {
    if (!(event.target instanceof Element)) return handleUndefinedOpen(event);

    const targetElem = event.target.closest('[data-context-menu]');
    if (!(targetElem instanceof HTMLElement)) return handleUndefinedOpen(event);

    const payload = rootContext.elemMap.get(targetElem);
    if (!payload) return handleUndefinedOpen(event);

    rootContext.open(payload, { x: event.clientX, y: event.clientY }, targetElem);
}
function handleUndefinedOpen(event: MouseEvent | PointerEvent) {
    if (!(event.target instanceof HTMLElement)) return;
    rootContext.open({ data: undefined }, { x: event.clientX, y: event.clientY }, event.target);
}

async function handleContextMenu(event: PointerEvent) {
    await nextTick();
    if (!event.defaultPrevented) {
        event.preventDefault();
        clearLongPress();
        handleOpen(event);
    }
}

async function handlePointerDown(event: PointerEvent) {
    await nextTick();

    if (isTouchOrPen(event) && !event.defaultPrevented) {
        // clear the long press here in case there's multiple touch points
        clearLongPress();
        longPressTimer.value = window.setTimeout(handleOpen, 700, event);
    }
}

async function handlePointerEvent(event: PointerEvent) {
    await nextTick();
    if (isTouchOrPen(event) && !event.defaultPrevented) clearLongPress();
}
</script>

<template>
    <Slot
        @contextmenu="handleContextMenu"
        @pointerdown="handlePointerDown"
        @pointermove="handlePointerEvent"
        @pointercancel="handlePointerEvent"
        @pointerup="handlePointerEvent"
    >
        <slot />
    </Slot>
    <ContextMenuPortal>
        <ContextMenuContent
            data-slot="context-menu-content"
            class="data-open:animate-in data-closed:animate-out data-closed:fade-out-0 data-open:fade-in-0 data-closed:zoom-out-95 data-open:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 ring-foreground/10 bg-popover text-popover-foreground min-w-32 rounded-lg p-1 shadow-md ring-1 duration-100 cn-menu-translucent z-50 max-h-(--reka-context-menu-content-available-height) origin-(--reka-context-menu-content-transform-origin) overflow-x-hidden overflow-y-auto"
            v-bind="curTarget?.[1].menuProps ?? {}"
            @close-auto-focus="
                () => {
                    // This kinda works as a fully closed event
                    if (curTarget) {
                        const elem = curTarget[0];
                        // Keep the attribute if it exists in the map, otherwise delete it
                        if (rootContext.elemMap.has(elem)) {
                            elem.setAttribute('data-context-menu', '');
                        } else {
                            elem.removeAttribute('data-context-menu');
                        }
                    }
                    curTarget = null;
                }
            "
        >
            <slot v-if="curTarget" name="menu" :data="curTarget?.[1].data" />
        </ContextMenuContent>
    </ContextMenuPortal>
</template>
