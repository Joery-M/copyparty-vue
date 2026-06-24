<script setup lang="ts">
import type { UseTransitionOptions } from '@vueuse/core';

import {
    TransitionPresets,
    useIntervalFn,
    useThrottleFn,
    useTransition,
    whenever,
} from '@vueuse/core';
import { TaskPool } from 'up2k';
import { computed, shallowRef, triggerRef } from 'vue';

import { formatFileSize } from '@/lib/format';

import { Progress } from '@shadcn/progress';

const props = defineProps<{
    pool: TaskPool;
    files: File[];
}>();

const totalSize = props.files.reduce((s, f) => s + f.size, 0);
const totalSizeFormatted = formatFileSize(totalSize);

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

// This is a counter that collects the amount of bytes uploaded and gets reset in an interval
let uploadTally = 0;
let hashTally = 0;

props.pool.events.on('hash-progress', (file, hashed) => {
    const status = fileStatus.value.get(file.file) ?? { hashed: 0, uploaded: 0, done: false };
    status.hashed = hashed;
    fileStatus.value.set(file.file, status);
    hashTally += hashed;
    updater();
});
props.pool.events.on('upload-progress', (file, uploaded) => {
    const status = fileStatus.value.get(file.file) ?? { hashed: 0, uploaded: 0, done: false };
    status.uploaded = uploaded;
    fileStatus.value.set(file.file, status);
    uploadTally += uploaded;
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
    let d = 0;
    for (const { hashed, uploaded, done, error } of fileStatus.value.values()) {
        h += hashed;
        u += uploaded;
        if (done || error) d++;
    }
    return [h, u, d] as const;
});
const totalHashed = computed(() => totalStatus.value[0]);
const totalUploaded = computed(() => totalStatus.value[1]);
const totalDone = computed(() => totalStatus.value[2]);

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

let startUploadTime = performance.now();
const uploadSpeed = shallowRef(0);
let startHashTime = performance.now();
const hashSpeed = shallowRef(0);

// This one's pretty good to proof check https://www.omnicalculator.com/other/bandwidth
function calculateUploadSpeed() {
    const duration = (performance.now() - startUploadTime) / 1000;
    const s = uploadTally / duration;
    uploadSpeed.value = Number.isFinite(s) ? s : 0;
}
function calculateHashSpeed() {
    const duration = (performance.now() - startHashTime) / 1000;
    const s = hashTally / duration;
    hashSpeed.value = Number.isFinite(s) ? s : 0;
}
const uploadSpeedInterval = useIntervalFn(() => calculateUploadSpeed(), 100, { immediate: false });
const hashSpeedInterval = useIntervalFn(() => calculateHashSpeed(), 100, { immediate: false });
whenever(
    () => totalUploaded.value > 0 && totalUploaded.value < totalSize,
    () => ((startUploadTime = performance.now()), uploadSpeedInterval.resume()),
    { once: true }
);
whenever(
    () => totalUploaded.value === totalSize,
    () => (uploadSpeedInterval.pause(), calculateUploadSpeed()),
    { once: true }
);
whenever(
    () => totalHashed.value > 0 && totalHashed.value < totalSize,
    () => ((startHashTime = performance.now()), hashSpeedInterval.resume()),
    { once: true }
);
whenever(
    () => totalHashed.value === totalSize,
    () => (hashSpeedInterval.pause(), calculateHashSpeed()),
    { once: true }
);
</script>

<template>
    <div class="section">
        <label class="spaced-label">
            <span> {{ $t('toast.hashed') }} </span>
            <span> {{ formatFileSize(totalHashedSmooth) }} / {{ totalSizeFormatted }} </span>
        </label>
        <Progress :model-value="totalHashedPerc" />
    </div>
    <div class="section">
        <label class="spaced-label">
            <span> {{ $t('toast.uploaded') }} </span>
            <span> {{ formatFileSize(totalUploadedSmooth) }} / {{ totalSizeFormatted }} </span>
        </label>
        <Progress :model-value="totalUploadedPerc" />
    </div>
    <label class="spaced-label">
        <span> {{ formatFileSize(hashSpeed, 'SI', true, true) }} </span>
        <span> {{ formatFileSize(uploadSpeed, 'SI', true, true) }} </span>
    </label>
    <hr />
    <div class="section">
        <label class="spaced-label">
            <span> {{ $t('toast.queue') }} </span>
            <span> {{ totalDone.toLocaleString() }} / {{ files.length.toLocaleString() }} </span>
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
    </div>
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

hr {
    @apply mt-2;
}
.section {
    @apply mt-2;
}
</style>
