<script setup lang="ts">
import {
    Breadcrumb,
    BreadcrumbEllipsis,
    BreadcrumbItem,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator
} from '@/components/ui/breadcrumb';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { useRouteState } from '@/stores/useRouteState';
import { computed } from 'vue';
import { RouterLink } from 'vue-router';

const routeState = useRouteState();

const last5 = computed(() => routeState.dir.map((v, i) => [v, i] as const).slice(-5));
const other = computed(() => routeState.dir.slice(0, -5));
</script>

<template>
    <Breadcrumb>
        <BreadcrumbList>
            <BreadcrumbItem>
                <RouterLink
                    :to="{
                        name: 'viewer',
                        params: { path: [] }
                    }"
                >
                    /
                </RouterLink>
            </BreadcrumbItem>
            <template v-if="other.length > 0">
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                    <DropdownMenu>
                        <DropdownMenuTrigger class="flex items-center gap-1">
                            <BreadcrumbEllipsis class="h-4 w-4" />
                            <span class="sr-only">Toggle menu</span>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start">
                            <DropdownMenuItem v-for="(dir, i) in other">
                                <RouterLink
                                    class="w-full"
                                    :to="{
                                        name: 'viewer',
                                        params: { path: routeState.dir.slice(0, i + 1).concat('') }
                                    }"
                                >
                                    {{ dir }}
                                </RouterLink>
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </BreadcrumbItem>
            </template>
            <template v-for="[dir, i] in last5">
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                    <RouterLink
                        v-if="i < routeState.dir.length - 1"
                        :to="{
                            name: 'viewer',
                            params: { path: routeState.dir.slice(0, i + 1).concat('') }
                        }"
                    >
                        {{ dir }}
                    </RouterLink>
                    <BreadcrumbPage v-else> {{ dir }}</BreadcrumbPage>
                </BreadcrumbItem>
            </template>
        </BreadcrumbList>
    </Breadcrumb>
</template>
