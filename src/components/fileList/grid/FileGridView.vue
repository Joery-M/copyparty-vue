<script setup lang="ts">
import { SortAsc, SortDesc, Undo2 } from '@lucide/vue';
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

import { useFileTable } from '@/components/fileList/file-list.ts';
import LoadingGrid from '@/components/fileList/grid/LoadingGrid.vue';
import { Button } from '@/components/ui/button';
import { ButtonGroup } from '@/components/ui/button-group';
import {
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { useRouteState } from '@/stores/useRouteState';
import { useSettings } from '@/stores/useSettings';

import FileGridEntry from './FileGridEntry.vue';

const settings = useSettings();
const routeState = useRouteState();

const { table, isLoading, sorting, setSorting, resetSorting } = useFileTable();

const i18n = useI18n();

const tagHeaders = computed(() => {
    const tags = i18n.tm('filelist.tags');
    return Object.fromEntries(
        Object.entries(tags)
            .map(([k, v]) => [k, i18n.rt(v)])
            .concat([['href', i18n.t('filename')]])
    );
});
const sortableColumns = computed(() =>
    table
        .getAllColumns()
        .filter((v) => v.id != 'prefix' && v.id != 'isFile')
        .map((v) => ({ label: tagHeaders.value[v.id] ?? v.id, value: v.id }))
);

const sortedColumn = computed({
    get: () => sorting.value?.id,
    set: (v) => v && setSorting(v, true),
});
const sortDirection = computed({
    get: () => sorting.value?.desc,
    set: (v) => {
        if (sortedColumn.value) {
            setSorting(sortedColumn.value, v);
        }
    },
});
</script>

<template>
    <div class="mb-2">
        <ButtonGroup>
            <Button variant="outline" @click="sortDirection = !sortDirection">
                <SortAsc v-if="sortDirection === false" class="size-4" />
                <SortDesc v-else class="size-4" />
            </Button>
            <Select :items="sortableColumns" v-model:model-value="sortedColumn">
                <SelectTrigger class="bg-clip-padding border-border">
                    <SelectValue :placeholder="$t('sorting')" />
                </SelectTrigger>
                <SelectContent>
                    <SelectGroup>
                        <SelectItem
                            v-for="item in sortableColumns"
                            :key="item.value"
                            :value="item.value"
                        >
                            {{ item.label }}
                        </SelectItem>
                    </SelectGroup>
                </SelectContent>
            </Select>
            <Button variant="outline" @click="resetSorting()">
                <Undo2 />
            </Button>
        </ButtonGroup>
    </div>
    <div class="wrapper">
        <LoadingGrid v-if="isLoading" />
        <FileGridEntry
            v-else
            v-for="entry in table.getRowModel().rows"
            :key="entry.id"
            :dir="routeState.dir"
            :entry
        />
    </div>
</template>

<style scoped>
@reference "@/style.css";

.wrapper {
    @apply grid gap-5 gap-x-8 transition-[grid-template-columns] max-lg:place-content-evenly;
    display: grid;
    grid-template-columns: repeat(
        auto-fill,
        minmax(
            calc(var(--spacing) * 25),
            calc(var(--spacing) * v-bind('settings.fileView.gridSize'))
        )
    );
}
</style>
