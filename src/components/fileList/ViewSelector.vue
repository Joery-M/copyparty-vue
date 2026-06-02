<script setup lang="ts">
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@shadcn/hover-card';
import { Slider } from '@shadcn/slider';
import { ToggleGroup, ToggleGroupItem } from '@shadcn/toggle-group';
import { usePreferredReducedMotion } from '@vueuse/core';
import { Grid2X2, List } from 'lucide-vue-next';

import { refWithInit } from '@/lib/utils';
import { useSettings } from '@/stores/useSettings';

const settings = useSettings();
const preferrersReducedMotion = usePreferredReducedMotion();

// We do this to make users with reduced motion happier
const gridSize = refWithInit(() => settings.fileView.gridSize);
function commit() {
    settings.fileView.gridSize = gridSize.value;
    gridSize.reset();
}
</script>

<template>
    <ToggleGroup
        type="single"
        required
        orientation="horizontal"
        :model-value="settings.fileView.type"
        @update:model-value="$event && (settings.fileView.type = $event as 'grid' | 'list')"
    >
        <ToggleGroupItem variant="outline" value="list" :aria-label="$t('list_view')">
            <List />
        </ToggleGroupItem>
        <HoverCard v-if="settings.fileView.type === 'grid'">
            <HoverCardTrigger as-child>
                <ToggleGroupItem variant="outline" value="grid" :aria-label="$t('grid_view')">
                    <Grid2X2 />
                </ToggleGroupItem>
            </HoverCardTrigger>
            <HoverCardContent class="max-w-36! p-0 px-2.5" align="end">
                <Slider
                    class="py-2.5"
                    :model-value="[gridSize]"
                    @update:model-value="
                        $event &&
                        (preferrersReducedMotion === 'no-preference'
                            ? (settings.fileView.gridSize = $event[0])
                            : (gridSize = $event[0]))
                    "
                    @value-commit="
                        gridSize = Math.min(Math.max($event[0], 28), 150);
                        commit();
                    "
                    :min="25"
                    :max="150"
                    tooltip
                    @dblclick="
                        gridSize = 60;
                        commit();
                    "
                />
            </HoverCardContent>
        </HoverCard>
        <ToggleGroupItem v-else variant="outline" value="grid" :aria-label="$t('grid_view')">
            <Grid2X2 />
        </ToggleGroupItem>
    </ToggleGroup>
</template>
