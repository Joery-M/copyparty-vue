<script setup lang="ts">
import { Progress } from '@/components/ui/progress';
import { formatFileSize } from '@/lib/format';
import { useDiskUsage } from '@/stores/useDiskUsage';

const diskUsage = useDiskUsage();
</script>

<template>
    <div v-if="diskUsage.free && diskUsage.total">
        <p class="text-xs text-foreground/80 mb-1">
            {{ $t('free_of', [formatFileSize(diskUsage.free), formatFileSize(diskUsage.total)]) }}
        </p>
        <Progress
            :model-value="100 - (diskUsage.free / diskUsage.total) * 100"
            class="*:transition-none"
        />
    </div>
</template>
