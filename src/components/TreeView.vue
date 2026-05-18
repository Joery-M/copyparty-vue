<script lang="ts" setup>
import { cn } from '@/lib/utils';
import { useRouteState } from '@/stores/useRouteState';
import { useTreeView } from '@/stores/useTreeView';
import {
    Sidebar,
    SidebarContent,
    SidebarHeader,
    SidebarInset,
    SidebarMenu,
    SidebarProvider
} from '@shadcn/sidebar';
import { watchImmediate } from '@vueuse/core';
import { ref, type HTMLAttributes } from 'vue';
import TreeViewList from './TreeViewList.vue';

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
</script>

<template>
    <SidebarProvider v-model:open="isOpen" :class="wrapperClass">
        <Sidebar collapsible="offcanvas" variant="floating">
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
