<script lang="ts" setup>
import { useLoadingState } from '@/lib/api';
import { refWithInit } from '@/lib/utils';
import { useTreeView } from '@/stores/useTreeView';
import { useQueryState } from '@pinia/colada';
import { Button } from '@shadcn/button';
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
import { ChevronRight } from 'lucide-vue-next';
import { watch } from 'vue';

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
watch(isOpen, (isOpen) => {
    if (isOpen) treeViewStore.openPath(props.path);
    else treeViewStore.closeChildPaths(props.path);
});
</script>

<template>
    <SidebarGroup class="py-0">
        <Collapsible v-model:open="isOpen" :data-not-root="path.length > 0">
            <SidebarGroupLabel>
                <CollapsibleTrigger :as="Button" variant="ghost" size="icon" :aria-expanded="false">
                    <ChevronRight
                        :class="{ ['rotate-90']: isOpen }"
                        class="transition-transform duration-100! m-2"
                    />
                </CollapsibleTrigger>
                <SidebarMenuButton
                    @click="
                        $router.push({
                            name: 'viewer',
                            params: { path: path.map(decodeURIComponent).concat('') }
                        })
                    "
                    class="pl-0"
                >
                    <span>{{ decodeURIComponent(dirName) }}</span>
                </SidebarMenuButton>
            </SidebarGroupLabel>
            <SidebarGroupContent>
                <CollapsibleContent>
                    <SidebarMenu>
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

<style scoped>
@reference "@/style.css";

[data-slot='sidebar-group-label'] {
    @apply h-7 pl-0.5;

    [data-slot='collapsible-trigger'] {
        /* All this is just to make it look like the menu button */
        @apply rounded-r-none border-none h-full w-fit hover:text-sidebar-accent-foreground hover:bg-sidebar-accent focus-visible:ring-2 ring-sidebar-ring transition-transform;
        > svg {
            @apply mx-1 my-0;
        }
    }
    [data-sidebar='menu-button'] {
        @apply rounded-l-none border-none active:translate-y-px p-0 pl-1 h-full;
    }
}

[data-slot='collapsible'][data-not-root='true'] {
    @apply border-l border-accent ml-1;
}
</style>
