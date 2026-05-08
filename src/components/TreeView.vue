<script lang="ts" setup>
import { useRouteState } from '@/stores/useRouteState';
import {
    Sidebar,
    SidebarContent,
    SidebarHeader,
    SidebarInset,
    SidebarMenu,
    SidebarProvider
} from '@shadcn/sidebar';
import { ref } from 'vue';
import TreeViewList from './TreeViewList.vue';

const routePath = useRouteState();

const isOpen = ref(true);
</script>

<template>
    <SidebarProvider v-model:open="isOpen">
        <Sidebar collapsible="offcanvas" variant="floating">
            <SidebarHeader>
                <SidebarMenu> </SidebarMenu>
            </SidebarHeader>
            <SidebarContent>
                <TreeViewList dir="/" :route-path="routePath.dir" />
            </SidebarContent>
        </Sidebar>
        <SidebarInset class="min-w-0">
            <slot />
        </SidebarInset>
    </SidebarProvider>
</template>
