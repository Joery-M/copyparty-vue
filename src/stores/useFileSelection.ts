import { whenever } from '@vueuse/core';
import { defineStore } from 'pinia';
import { computed, shallowRef, triggerRef } from 'vue';

import type { AnyDirectoryEntry } from '@/lib/interop';

import { useListDirQuery } from '@/pages/Files.vue';

export const useFileSelection = defineStore('file-selection', () => {
    const listDirQuery = useListDirQuery();

    const selectedFiles = shallowRef(new Set<AnyDirectoryEntry>());
    const lastSelected = shallowRef<AnyDirectoryEntry | null>(null);
    // Same as lastSelected but doesn't update after a range selection
    const lastSelectedNonRange = shallowRef<AnyDirectoryEntry | null>(null);
    const dirEntries = computed(() => listDirQuery.data.value?.entries ?? null);

    // Whenever ls gets reloaded, try to keep the selection intact
    whenever(
        () => dirEntries.value,
        (entries) => {
            const newSelection = new Set<AnyDirectoryEntry>();
            for (const entry of selectedFiles.value) {
                const found = entries.find((v) => v.name === entry.name);
                if (found) newSelection.add(found);
            }
            selectedFiles.value = newSelection;
            lastSelected.value = entries.find((v) => v.name === lastSelected.value?.name) ?? null;
            lastSelectedNonRange.value =
                entries.find((v) => v.name === lastSelectedNonRange.value?.name) ?? null;
        },
        { flush: 'pre' }
    );

    return {
        selectedFiles,
        lastSelected,
        lastSelectedNonRange,
        invertSelection() {
            if (!dirEntries.value) return;
            const newSelection = new Set(dirEntries.value);
            selectedFiles.value.forEach((f) => newSelection.delete(f));
            selectedFiles.value = newSelection;
        },
        selectAll() {
            if (!dirEntries.value) return;
            selectedFiles.value = new Set(dirEntries.value);
        },
        selectNone() {
            lastSelected.value = null;
            lastSelectedNonRange.value = lastSelected.value;
            selectedFiles.value = new Set();
        },
        setSelectedNames(names: string[]) {
            if (!dirEntries.value) return;
            selectedFiles.value = new Set(
                dirEntries.value.filter(({ name }) => names.includes(name))
            );
        },
        toggleEntry(entry: AnyDirectoryEntry) {
            selectedFiles.value.has(entry)
                ? selectedFiles.value.delete(entry)
                : selectedFiles.value.add(entry);
            triggerRef(selectedFiles);
            lastSelected.value = selectedFiles.value.size === 0 ? null : entry;
            lastSelectedNonRange.value = lastSelected.value;
        },
        setEntry(entry: AnyDirectoryEntry, selected: boolean) {
            if (selected) {
                if (!selectedFiles.value.has(entry)) {
                    selectedFiles.value.add(entry);
                    triggerRef(selectedFiles);
                    lastSelected.value = entry;
                    lastSelectedNonRange.value = lastSelected.value;
                }
            } else {
                if (selectedFiles.value.has(entry)) {
                    selectedFiles.value.delete(entry);
                    triggerRef(selectedFiles);
                    if (selectedFiles.value.size === 0) {
                        lastSelected.value = null;
                        lastSelectedNonRange.value = lastSelected.value;
                    }
                }
            }
        },
    };
});
