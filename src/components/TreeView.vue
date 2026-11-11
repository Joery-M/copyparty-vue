<script lang="ts" setup>
import type { HTMLAttributes } from 'vue';

import { useEventBus, watchImmediate, whenever } from '@vueuse/core';
import { cn } from 'cn';
import { ref, useTemplateRef } from 'vue';

import DiskUsage from '@/components/DiskUsage.vue';
import { useRouteState } from '@/stores/useRouteState';
import { useTreeView } from '@/stores/useTreeView';

import TreeViewList from './TreeViewList.vue';

import {
    Sidebar,
    SidebarContent,
    SidebarHeader,
    SidebarInset,
    SidebarMenu,
    SidebarProvider,
} from '@shadcn/sidebar';

const sidebar = useTemplateRef('sidebar');

const props = defineProps<{
    class?: HTMLAttributes['class'];
    wrapperClass?: HTMLAttributes['class'];
}>();

const routeState = useRouteState();
const treeViewStore = useTreeView();

watchImmediate(
    () => routeState.dir,
    (dir) => treeViewStore.openPath(dir)
);

const isOpen = ref(true);

whenever(
    () => !sidebar.value?.isMobile,
    () => {
        sidebar.value?.setOpenMobile(false);
    }
);

const bus = useEventBus(sidebarBusKey);
bus.on(() => sidebar.value?.setOpenMobile(true));
</script>

<script lang="ts">
import type { EventBusKey } from '@vueuse/core';

export const sidebarBusKey: EventBusKey<boolean> = Symbol('sidebar-bus-key');
</script>

<template>
    <SidebarProvider
        :open="sidebar?.isMobile ? isOpen : true"
        @update:open="sidebar?.isMobile ? (isOpen = $event) : false"
        :class="wrapperClass"
    >
        <Sidebar
            ref="sidebar"
            :variant="sidebar?.isMobile ? 'sidebar' : 'floating'"
            :collapsible="sidebar?.isMobile ? 'icon' : 'offcanvas'"
        >
            <DiskUsage v-if="sidebar?.isMobile" class="mx-5 mt-5" />
            <SidebarHeader>
                <SidebarMenu> </SidebarMenu>
            </SidebarHeader>
            <SidebarContent>
                <TreeViewList dirName="/" :path="[]" />
            </SidebarContent>
        </Sidebar>
        <SidebarInset :class="cn('min-w-0', props.class)">
            <slot />
        </SidebarInset>
    </SidebarProvider>
</template>
