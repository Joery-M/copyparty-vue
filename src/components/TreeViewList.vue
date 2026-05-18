<script lang="ts" setup>
import { useLoadingState } from '@/lib/api';
import { refWithInit } from '@/lib/utils';
import { useTreeView } from '@/stores/useTreeView';
import { useQueryState } from '@pinia/colada';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@shadcn/collapsible';
import {
    SidebarGroup,
    SidebarGroupContent,
    SidebarGroupLabel,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarMenuSkeleton
} from '@shadcn/sidebar';
import { whenever } from '@vueuse/core';
import { ChevronRight } from 'lucide-vue-next';

const props = defineProps<{
    path: string[];
    dirName: string;
}>();

const treeViewStore = useTreeView();

const treeQuery = useQueryState(() => ['tree', ...props.path]);
const isLoading = useLoadingState(
    // Is true when loading for first time and if enabled
    () => treeQuery.isPending.value && treeQuery.asyncStatus.value === 'loading'
);
const isOpen = refWithInit(() => treeViewStore.isPathOpen(props.path));
whenever(isOpen, () => treeViewStore.openPath(props.path), { once: true });
</script>

<template>
    <SidebarGroup class="py-0">
        <Collapsible v-model:open="isOpen">
            <SidebarGroupLabel class="h-fit">
                <SidebarMenuButton
                    @click="
                        $router.push({
                            name: 'viewer',
                            params: { path: path.map(decodeURIComponent).concat('') }
                        })
                    "
                    class="pl-0"
                >
                    <CollapsibleTrigger @click.stop>
                        <ChevronRight
                            :class="{ ['rotate-90']: isOpen }"
                            class="transition-transform m-2"
                        />
                    </CollapsibleTrigger>
                    <span>{{ decodeURIComponent(dirName) }}</span>
                </SidebarMenuButton>
            </SidebarGroupLabel>
            <SidebarGroupContent>
                <CollapsibleContent>
                    <SidebarMenu v-if="isOpen">
                        <template v-if="isLoading" v-for="_ in 8">
                            <SidebarMenuSkeleton show-icon />
                        </template>
                        <template v-for="dir in treeViewStore.getPathItems(path)" :key="dir">
                            <SidebarMenuItem>
                                <TreeViewList :path="path.concat(dir)" :dirName="dir" />
                            </SidebarMenuItem>
                        </template>
                    </SidebarMenu>
                </CollapsibleContent>
            </SidebarGroupContent>
        </Collapsible>
    </SidebarGroup>
</template>
