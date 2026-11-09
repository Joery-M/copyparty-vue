<script setup lang="ts">
import type { AcceptableValue } from 'reka-ui';

import { Grid2X2, List } from '@lucide/vue';
import { createReusableTemplate, syncRef, usePreferredReducedMotion } from '@vueuse/core';
import { ref } from 'vue';

import { refWithInit } from '@/lib/utils';
import { useSettings } from '@/stores/useSettings';

import { HoverCard, HoverCardContent, HoverCardTrigger } from '@shadcn/hover-card';
import { Slider } from '@shadcn/slider';
import { ToggleGroup, ToggleGroupItem } from '@shadcn/toggle-group';

const settings = useSettings();
const preferrersReducedMotion = usePreferredReducedMotion();

// We do this to make users with reduced motion happier
const gridSize = refWithInit(() => settings.fileView.gridSize);
function commit() {
    settings.fileView.gridSize = gridSize.value;
    gridSize.reset();
}

const gridView = defineModel<boolean>('gridView', { default: false });
const curView = ref<AcceptableValue | AcceptableValue[]>();

syncRef(gridView, curView, {
    transform: {
        ltr: (v) => (v ? 'grid' : 'list'),
        rtl: (v) => {
            if (v === undefined) return gridView.value;
            const v1 = Array.isArray(v) ? v[0] : v;
            return v1 === 'grid';
        },
    },
});

const [DefineGridToggleItem, ReuseGridToggleItem] = createReusableTemplate();
</script>

<template>
    <ToggleGroup type="single" required orientation="horizontal" v-model="curView">
        <ToggleGroupItem variant="outline" value="list" :aria-label="$t('list_view')">
            <List />
        </ToggleGroupItem>

        <DefineGridToggleItem>
            <ToggleGroupItem variant="outline" value="grid" :aria-label="$t('grid_view')">
                <Grid2X2 />
            </ToggleGroupItem>
        </DefineGridToggleItem>

        <HoverCard v-if="gridView">
            <HoverCardTrigger as-child>
                <ReuseGridToggleItem />
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
        <ReuseGridToggleItem v-else />
    </ToggleGroup>
</template>
