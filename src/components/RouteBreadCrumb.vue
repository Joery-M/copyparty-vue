<script setup lang="ts">
import { computed } from 'vue';
import { RouterLink } from 'vue-router';

import { useRouteState } from '@/stores/useRouteState';

import {
    Breadcrumb,
    BreadcrumbEllipsis,
    BreadcrumbItem,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from '@shadcn/breadcrumb';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@shadcn/dropdown-menu';

const routeState = useRouteState();

const last5 = computed(() => routeState.dir.map((v, i) => [v, i] as const).slice(-5));
const dropdownItems = computed(() =>
    routeState.dir.slice(0, -1).map((_, i, dir) => dir.slice(0, i + 1))
);
</script>

<template>
    <Breadcrumb>
        <BreadcrumbList>
            <template v-if="dropdownItems.length > 5">
                <BreadcrumbItem>
                    <DropdownMenu>
                        <DropdownMenuTrigger class="flex items-center gap-1">
                            <BreadcrumbEllipsis class="h-4 w-4" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start" class="w-max min-w-40">
                            <DropdownMenuItem>
                                <RouterLink
                                    class="w-full"
                                    :to="{ name: 'viewer', params: { path: [] } }"
                                >
                                    /
                                </RouterLink>
                            </DropdownMenuItem>
                            <DropdownMenuItem v-for="dir in dropdownItems">
                                <RouterLink
                                    class="w-full"
                                    :to="{ name: 'viewer', params: { path: dir.concat('') } }"
                                >
                                    {{ dir.at(-1) }}
                                </RouterLink>
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </BreadcrumbItem>
            </template>
            <BreadcrumbItem v-else>
                <RouterLink
                    :to="{
                        name: 'viewer',
                        params: { path: [] },
                    }"
                    class="hover:underline hover:text-foreground"
                >
                    /
                </RouterLink>
            </BreadcrumbItem>

            <template v-for="[dir, i] in last5">
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                    <RouterLink
                        v-if="i < routeState.dir.length - 1"
                        :to="{
                            name: 'viewer',
                            params: { path: routeState.dir.slice(0, i + 1).concat('') },
                        }"
                        class="hover:underline hover:text-foreground"
                    >
                        {{ dir }}
                    </RouterLink>
                    <BreadcrumbPage v-else> {{ dir }}</BreadcrumbPage>
                </BreadcrumbItem>
            </template>
        </BreadcrumbList>
    </Breadcrumb>
</template>
