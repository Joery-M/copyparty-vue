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
import { ChevronLeftIcon } from 'lucide-vue-next';
import { ref } from 'vue';
import TreeViewList from './TreeViewList.vue';

const routePath = useRouteState();

const isOpen = ref(true);
</script>

<template>
    <SidebarProvider v-model:open="isOpen">
        <Sidebar collapsible="offcanvas" variant="floating">
            <SidebarHeader>
                <button
                    id="open-button"
                    :class="{ closed: !isOpen }"
                    class="transition-all"
                    @click="isOpen = !isOpen"
                >
                    <ChevronLeftIcon />
                </button>
                <SidebarMenu> </SidebarMenu>
            </SidebarHeader>
            <SidebarContent class="overflow-y-auto max-h-screen pb-5">
                <TreeViewList dir="/" :route-path="routePath.dir" />
            </SidebarContent>
        </Sidebar>
        <SidebarInset>
            <slot />
        </SidebarInset>
    </SidebarProvider>
</template>

<style lang="scss" scoped>
#open-button {
    display: grid;
    place-content: center;
    position: absolute;
    border-radius: 100%;
    width: calc(var(--spacing) * 8);
    height: calc(var(--spacing) * 8);
    right: calc(var(--spacing) * -2);

    background-color: var(--sidebar-accent);
    border: solid 1px var(--color-sidebar-border);

    cursor: pointer;
    z-index: 10;

    transition-property: right;

    &.closed {
        right: calc(var(--spacing) * -10);
        transform: rotate(180deg);
    }
}
</style>
