<script setup lang="ts">
import { useQuery } from '@pinia/colada';
import { refThrottled, unrefElement } from '@vueuse/core';
import { ref, useTemplateRef, watch } from 'vue';

import SearchEntry from '@/components/searchBar/SearchEntry.vue';
import { Popover, PopoverContent } from '@/components/ui/popover';
import { API } from '@/lib/api.ts';
import { useShortcut, useShortcutGuard } from '@/lib/keyboard';

import SearchBarInput from './SearchBarInput.vue';

const query = ref('');

const isOpen = ref(false);
const selectedIndex = ref(-1);

const input = useTemplateRef('input');
const items = useTemplateRef('items');

useShortcutGuard('search', isOpen);

useShortcut('Escape', () => {
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
    query.value = '';
});

const queryDebounced = refThrottled(query, 500, true);
watch(
    () => [isOpen.value, queryDebounced.value],
    () => (selectedIndex.value = -1),
    { immediate: true }
);

useShortcut('ArrowDown', () => {
    if (selectedIndex.value + 1 >= (items.value?.length ?? 0)) {
        selectedIndex.value = -1;
    } else {
        selectedIndex.value++;
    }
});
useShortcut('ArrowUp', () => {
    if (selectedIndex.value - 1 < -1) {
        selectedIndex.value = (items.value?.length ?? 0) - 1;
    } else {
        selectedIndex.value--;
    }
});

watch(selectedIndex, (index) => {
    if (index < 0) {
        const inputElem = unrefElement(input.value?.input);
        console.log(inputElem);
        inputElem?.focus();
    } else if (index < (items.value?.length ?? 0)) {
        const item = items.value?.[index];
        unrefElement(item)?.focus();
    }
});

const searchQuery = useQuery({
    enabled: isOpen,
    key: () => ['search', queryDebounced.value] as const,
    gcTime: 10_000,
    query: async ({ signal }) =>
        query.value.trim().length > 0 ? API.search(signal, query.value, 10) : [],
    refetchOnMount: false,
    refetchOnReconnect: false,
    refetchOnWindowFocus: false,
});
</script>

<template>
    <Popover v-model:open="isOpen" modal>
        <SearchBarInput class="max-w-full" ref="input" v-model="query" />
        <PopoverContent class="w-150" :trap-focus="false">
            <div id="search-autocomplete-menu" role="listbox">
                <SearchEntry
                    v-for="entry in searchQuery.data.value ?? []"
                    :key="entry.fullPath"
                    ref="items"
                    :entry
                />
                <p v-if="!searchQuery.data.value?.length" class="text-center text-muted-foreground">
                    {{ $t('search_empty') }}
                </p>
            </div>
        </PopoverContent>
    </Popover>
</template>
