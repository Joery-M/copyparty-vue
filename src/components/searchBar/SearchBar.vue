<script setup lang="ts">
import { useQuery } from '@pinia/colada';
import { refThrottled, useFocusWithin, whenever } from '@vueuse/core';
import { extname } from 'pathe';
import { computed, ref, useTemplateRef, watch } from 'vue';
import { useRouter } from 'vue-router';

import type { SearchFileEntry } from '@/lib/interop.ts';

import { Popover, PopoverContent } from '@/components/ui/popover';
import { API } from '@/lib/api.ts';
import { canView, classifyExtension } from '@/lib/classifyExt.ts';
import { useShortcut, useShortcutGuard } from '@/lib/keyboard';

import SearchBarInput from './SearchBarInput.vue';
import SearchEntry from './SearchEntry.vue';

const query = ref('');

const isOpen = ref(false);
const selectedIndex = ref(-1);

const input = useTemplateRef('input');

useShortcutGuard('search', isOpen);

useShortcut('Escape', () => {
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
    query.value = '';
});

const queryDebounced = refThrottled(query, 500, true);
watch(
    () => [isOpen.value, queryDebounced.value] as const,
    ([isOpen]) => isOpen && (selectedIndex.value = 0),
    { immediate: true }
);

const { focused } = useFocusWithin(computed(() => input.value?.input));
whenever(
    () => focused,
    () => {
        selectedIndex.value = -1;
    }
);

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

const router = useRouter();
function navigate(entry: SearchFileEntry) {
    const path = [...entry.path];
    if (path.length > 1) path[path.length - 1] = '';

    if (canView(classifyExtension(extname(entry.name)))) {
        router.push({
            name: 'viewer',
            params: { path },
            hash: '#' + entry.name,
            query: { s: JSON.stringify(entry.name) },
        });
    } else {
        router.push({
            name: 'viewer',
            params: { path },
            query: { s: JSON.stringify(entry.name) },
        });
    }
    isOpen.value = false;
}

function search() {
    const index = Math.max(selectedIndex.value, 0);
    const entry = searchQuery.data.value?.[index];
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
    if (entry) navigate(entry);
}

function moveSelection(dir: number) {
    const newI = selectedIndex.value + dir;
    const items = searchQuery.data.value?.length ?? 0;
    if (newI >= items) {
        selectedIndex.value = -1;
    } else if (newI < -1) {
        if (items <= 0) return;

        let j = newI;
        while (j < -1) {
            j += items;
        }
        selectedIndex.value = j + 1;
    } else {
        selectedIndex.value = newI;
    }
}
</script>

<template>
    <Popover v-model:open="isOpen" modal>
        <SearchBarInput
            class="max-w-full"
            ref="input"
            :item-count="searchQuery.data.value?.length ?? 0"
            v-model="query"
            v-model:selected-index="selectedIndex"
            @search="search"
            @move-selection="moveSelection($event)"
        />
        <PopoverContent class="w-150" :trap-focus="false">
            <div id="search-autocomplete-menu" role="listbox">
                <SearchEntry
                    v-for="(entry, i) in searchQuery.data.value ?? []"
                    :key="entry.fullPath"
                    :entry
                    :active="i === selectedIndex"
                    @selected="navigate(entry)"
                />
                <p v-if="!searchQuery.data.value?.length" class="text-center text-muted-foreground">
                    {{ $t('search_empty') }}
                </p>
            </div>
        </PopoverContent>
    </Popover>
</template>
