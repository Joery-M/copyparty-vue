<script setup lang="ts">
import type { UseTransitionOptions } from '@vueuse/core';

import { TransitionPresets, useThrottleFn, useTransition } from '@vueuse/core';
import { TaskPool } from 'up2k';
import { computed, shallowRef, triggerRef } from 'vue';

import { formatFileSize } from '@/lib/format';

import { Progress } from '@shadcn/progress';

const props = defineProps<{
    pool: TaskPool;
    files: File[];
}>();

const totalSize = props.files.reduce((s, f) => s + f.size, 0);

interface FileStatus {
    hashed: number;
    uploaded: number;
    done: boolean;
    error?: Error;
}

// Since this is a shallow ref, it won't immediately get updated when we call .set on the map
// So then we can use a triggerRef inside a throttled function to only update the status every so often
// This makes the UI less laggy with many many files
const fileStatus = shallowRef(new Map<File, FileStatus>());
const updateSpeed = 100;
const updater = useThrottleFn(() => triggerRef(fileStatus), updateSpeed, true, true);

props.pool.events.on('hash-progress', (file, hashed) => {
    const status = fileStatus.value.get(file.file) ?? { hashed: 0, uploaded: 0, done: false };
    status.hashed = hashed;
    fileStatus.value.set(file.file, status);
    updater();
});
props.pool.events.on('upload-progress', (file, uploaded) => {
    const status = fileStatus.value.get(file.file) ?? { hashed: 0, uploaded: 0, done: false };
    status.uploaded = uploaded;
    fileStatus.value.set(file.file, status);
    updater();
});
props.pool.events.on('file-error', (file, error) => {
    const status = fileStatus.value.get(file.file) ?? { hashed: 0, uploaded: 0, done: false };
    status.error = error;
    fileStatus.value.set(file.file, status);
    updater();
});
props.pool.events.on('upload-done', (file) => {
    const status = fileStatus.value.get(file.file) ?? { hashed: 0, uploaded: 0, done: false };
    status.done = true;
    fileStatus.value.set(file.file, status);
    updater();
});

for (const file of props.files) {
    fileStatus.value.set(file, { hashed: 0, uploaded: 0, done: false });
}
updater();

const totalStatus = computed(() => {
    let h = 0;
    let u = 0;
    for (const { hashed, uploaded } of fileStatus.value.values()) {
        h += hashed;
        u += uploaded;
    }
    return [h, u] as const;
});
const totalHashed = computed(() => totalStatus.value[0]);
const totalUploaded = computed(() => totalStatus.value[1]);

const transitionOptions: UseTransitionOptions<number> = {
    easing: TransitionPresets.easeOutCubic,
    duration: updateSpeed * 2,
};
const totalHashedSmooth = useTransition(totalHashed, transitionOptions);
const totalUploadedSmooth = useTransition(totalUploaded, transitionOptions);
const totalHashedPerc = computed(() => (totalHashedSmooth.value / totalSize) * 100);
const totalUploadedPerc = computed(() => (totalUploadedSmooth.value / totalSize) * 100);

const topSorted = computed(() =>
    Array.from(fileStatus.value.entries())
        .sort(
            ([fileA, statA], [fileB, statB]) =>
                statA.uploaded - statB.uploaded ||
                +(statA.hashed > 0) - +(statB.hashed > 0) ||
                fileA.name.localeCompare(fileB.name)
        )
        .slice(0, 50)
);
</script>

<template>
    <label class="spaced-label">
        <span>Hashed</span>
        <span> {{ formatFileSize(totalHashedSmooth) }} / {{ formatFileSize(totalSize) }} </span>
    </label>
    <Progress :model-value="totalHashedPerc" />
    <label class="spaced-label">
        <span>Uploaded</span>
        <span> {{ formatFileSize(totalUploadedSmooth) }} / {{ formatFileSize(totalSize) }} </span>
    </label>
    <Progress :model-value="totalUploadedPerc" />
    <label class="spaced-label">
        Files
        <span> {{ formatFileSize(totalUploadedSmooth) }} / {{ formatFileSize(totalSize) }} </span>
    </label>
    <ul class="file-list">
        <li
            v-for="[file, status] in topSorted"
            class="spaced-label"
            :class="{ error: status.error, done: status.done }"
        >
            <span>{{ file.name }}</span>
            <span>
                {{
                    (status.uploaded / file.size).toLocaleString(undefined, {
                        style: 'percent',
                    })
                }}
            </span>
        </li>
    </ul>
</template>

<style scoped>
@reference "@/style.css";

.file-list {
    @apply font-mono mt-2;

    .spaced-label {
        &.error {
            @apply text-red-600;
            > span:first-child {
                @apply line-through;
            }
        }
        &.done {
            @apply text-foreground/50;
        }
    }
}
.spaced-label {
    @apply flex gap-4 overflow-y-scroll max-h-48;
    > span {
        @apply text-nowrap;
        &:first-child {
            @apply grow overflow-x-hidden text-ellipsis;
        }
    }
}

label.spaced-label {
    @apply mt-2;
}
</style>
