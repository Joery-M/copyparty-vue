<script setup lang="ts">
import { useTransition } from '@vueuse/core';
import { TaskPool } from 'up2k';
import { computed, reactive } from 'vue';

import { Progress } from '@shadcn/progress';

const props = defineProps<{
    pool: TaskPool;
    files: File[];
}>();

const totalSize = props.files.reduce((s, f) => s + f.size, 0);

interface FileStatus {
    hashed: number;
    uploaded: number;
    error?: Error;
}

const fileStatus = reactive(new Map<File, FileStatus>());

props.pool.events.on('hash-progress', (file, hashed) => {
    const status = fileStatus.get(file.file) ?? { hashed: 0, uploaded: 0 };
    status.hashed = hashed;
    fileStatus.set(file.file, status);
});
props.pool.events.on('upload-progress', (file, uploaded) => {
    const status = fileStatus.get(file.file) ?? { hashed: 0, uploaded: 0 };
    status.uploaded = uploaded;
    fileStatus.set(file.file, status);
});

for (const file of props.files) {
    fileStatus.set(file, { hashed: 0, uploaded: 0 });
}

const totalHashed = computed(() => {
    let v = 0;
    for (const { hashed } of fileStatus.values()) {
        v += hashed;
    }
    return (v / totalSize) * 100;
});
const totalUploaded = computed(() => {
    let v = 0;
    for (const { uploaded } of fileStatus.values()) {
        v += uploaded;
    }
    return (v / totalSize) * 100;
});
const totalHashedSmooth = useTransition(totalHashed, { duration: 100 });
const totalUploadedSmooth = useTransition(totalUploaded, { duration: 100 });
</script>

<template>
    <label>Hashed</label>
    <Progress :model-value="totalHashedSmooth" />
    <label>Uploaded</label>
    <Progress :model-value="totalUploadedSmooth" />
</template>
