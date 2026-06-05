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
