<script setup lang="ts">
import {
    Pagination,
    PaginationContent,
    PaginationEllipsis,
    PaginationItem,
    PaginationNext,
    PaginationPrevious,
} from '@shadcn/pagination';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@shadcn/select';

const props = defineProps<{
    total: number;
    pageSizes: number[];
}>();

const pageIndex = defineModel<number>('pageIndex', { required: true });
const pageSize = defineModel<number>('pageSize', { required: true });
</script>

<template>
    <div class="flex not-lg:justify-evenly">
        <Select v-model:model-value="pageSize">
            <SelectTrigger class="w-full max-w-20">
                <SelectValue />
            </SelectTrigger>
            <SelectContent>
                <SelectItem v-for="size in pageSizes" :value="size">
                    {{ size }}
                </SelectItem>
            </SelectContent>
        </Select>
        <div class="w-full lg:hidden"></div>
        <Pagination
            v-slot="{ page }"
            v-model:page="pageIndex"
            :items-per-page="pageSize"
            :total
            show-edges
        >
            <PaginationContent v-slot="{ items }">
                <PaginationPrevious />
                <template v-for="(item, index) in items" :key="index">
                    <PaginationItem
                        v-if="item.type === 'page'"
                        :value="item.value"
                        :is-active="item.value === page"
                    >
                        {{ item.value }}
                    </PaginationItem>
                    <PaginationEllipsis v-else />
                </template>
                <PaginationNext />
            </PaginationContent>
        </Pagination>
        <div class="w-full max-w-20 not-lg:hidden"></div>
    </div>
</template>
