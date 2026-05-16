<script setup lang="ts">
import { useSettings } from '@/stores/useSettings';
import { ToggleGroup, ToggleGroupItem } from '@shadcn/toggle-group';
import { Grid2X2, List } from 'lucide-vue-next';

const settings = useSettings();
</script>

<template>
    <ToggleGroup type="single" required orientation="horizontal" v-model:model-value="settings.fileView.type">
        <ToggleGroupItem value="list" :aria-label="$t('list_view')">
            <List />
        </ToggleGroupItem>
        <ToggleGroupItem value="grid" :aria-label="$t('grid_view')">
            <Grid2X2 />
        </ToggleGroupItem>
    </ToggleGroup>
</template>
