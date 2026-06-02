<script setup lang="ts">
import { ContextMenuRoot } from 'reka-ui';

import ContextMenuInner from './ContextMenuInner.vue';

defineOptions({ inheritAttrs: false });
</script>

<template>
    <ContextMenuRoot>
        <ContextMenuInner v-bind="$attrs">
            <slot></slot>
            <!-- Forward slots -->
            <template v-slot:menu="{ data }">
                <slot name="menu" :data />
            </template>
        </ContextMenuInner>
    </ContextMenuRoot>
</template>

<script lang="ts">
import type { DeepReadonly, ShallowRef } from 'vue';

import { createContext } from 'reka-ui';

export interface Point {
    x: number;
    y: number;
}
type ContextMenuRootContext = {
    data: DeepReadonly<ShallowRef<any>>;
    open(data: any, point: Point, elem: HTMLElement): void;
};

export const [injectCustomContextMenuRootContext, provideCustomContextMenuRootContext] =
    createContext<ContextMenuRootContext>('CustomContextMenuRoot');
</script>
