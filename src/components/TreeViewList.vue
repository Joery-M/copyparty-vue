<script lang="ts" setup>
import { useQuery } from '@pinia/colada';
import { ref } from 'vue';
import { getTreeOptions } from '../stores/fileStore';

import { useLoadingState } from '@/lib/api';
import { arrayStartsWith, useRouteDirectory } from '@/lib/utils';
import Collapsible from '@shadcn/collapsible/Collapsible.vue';
import CollapsibleContent from '@shadcn/collapsible/CollapsibleContent.vue';
import CollapsibleTrigger from '@shadcn/collapsible/CollapsibleTrigger.vue';
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

const props = withDefaults(
    defineProps<{
        base?: string[];
        dir: string;
    }>(),
    {
        base: () => []
    }
);

const routePath = useRouteDirectory();

const isOpen = ref(false);
// Set to true if we ever enter the dir
whenever(
    () => arrayStartsWith(routePath.value, props.base),
    () => {
        isOpen.value = true;
    },
    {
        immediate: true,
        once: true
    }
);

const treeQuery = useQuery({
    ...getTreeOptions(() => props.base)(),
    enabled: isOpen
});
const isLoading = useLoadingState(treeQuery.isLoading, 200);
</script>

<template>
    <SidebarGroup class="py-0">
        <Collapsible v-model:open="isOpen">
            <SidebarGroupLabel class="h-fit">
                <SidebarMenuButton @click="$router.push({ params: { path: base } })" class="pl-0">
                    <CollapsibleTrigger>
                        <ChevronRight
                            :class="{ ['rotate-90']: isOpen }"
                            class="transition-transform m-2"
                        />
                    </CollapsibleTrigger>
                    <span>{{ dir }}</span>
                </SidebarMenuButton>
            </SidebarGroupLabel>
            <SidebarGroupContent>
                <CollapsibleContent>
                    <SidebarMenu v-if="isOpen">
                        <template v-if="isLoading" v-for="_ in 8">
                            <SidebarMenuSkeleton show-icon />
                        </template>
                        <template
                            v-else-if="treeQuery.data.value"
                            v-for="dir in treeQuery.data.value"
                            :key="dir"
                        >
                            <SidebarMenuItem>
                                <TreeViewList :base="base.concat(dir)" :dir />
                            </SidebarMenuItem>
                        </template>
                    </SidebarMenu>
                </CollapsibleContent>
            </SidebarGroupContent>
        </Collapsible>
    </SidebarGroup>
</template>
