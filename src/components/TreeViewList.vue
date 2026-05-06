<script lang="ts" setup>
import { useQuery } from '@pinia/colada';
import { whenever } from '@vueuse/core';
import { ref } from 'vue';

import { API, useLoadingState } from '@/lib/api';
import { arrayStartsWith } from '@/lib/utils';

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

const props = withDefaults(
    defineProps<{
        base?: string[];
        dir: string;
        // From useRouteDirectory()
        routePath: string[];
    }>(),
    {
        base: () => []
    }
);

const isOpen = ref(false);
// Set to true if we ever enter the dir
whenever(
    () => arrayStartsWith(props.routePath, props.base),
    () => {
        isOpen.value = true;
    },
    {
        immediate: true,
        once: true
    }
);

const treeQuery = useQuery(() => ({ ...API.getFileTreeQuery(props.base), enabled: isOpen.value }));
const isLoading = useLoadingState(treeQuery.isLoading, 200);
</script>

<template>
    <SidebarGroup class="py-0">
        <Collapsible v-model:open="isOpen">
            <SidebarGroupLabel class="h-fit">
                <SidebarMenuButton
                    @click="$router.push({ name: 'viewer', params: { path: base.concat('') } })"
                    class="pl-0"
                >
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
                                <TreeViewList :base="base.concat(dir)" :dir :route-path />
                            </SidebarMenuItem>
                        </template>
                    </SidebarMenu>
                </CollapsibleContent>
            </SidebarGroupContent>
        </Collapsible>
    </SidebarGroup>
</template>
