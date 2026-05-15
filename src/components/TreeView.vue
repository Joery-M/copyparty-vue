<script lang="ts" setup>
import { cn } from '@/lib/utils';
import { useRouteState } from '@/stores/useRouteState';
import {
    Sidebar,
    SidebarContent,
    SidebarHeader,
    SidebarInset,
    SidebarMenu,
    SidebarProvider
} from '@shadcn/sidebar';
import { ref, type HTMLAttributes } from 'vue';
import TreeViewList from './TreeViewList.vue';

const props = defineProps<{
    class?: HTMLAttributes['class'];
    wrapperClass?: HTMLAttributes['class'];
}>();

const routePath = useRouteState();

const isOpen = ref(true);
</script>

<template>
    <SidebarProvider v-model:open="isOpen" :class="wrapperClass">
        <Sidebar collapsible="offcanvas" variant="floating">
            <SidebarHeader>
                <SidebarMenu> </SidebarMenu>
            </SidebarHeader>
            <SidebarContent>
                <TreeViewList dir="/" :route-path="routePath.dir" />
            </SidebarContent>
        </Sidebar>
        <SidebarInset :class="cn('min-w-0', props.class)">
            <slot />
        </SidebarInset>
    </SidebarProvider>
</template>
