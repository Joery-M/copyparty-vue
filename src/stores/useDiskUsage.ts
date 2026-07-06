import { defineStore } from 'pinia';
import { ref } from 'vue';

export const useDiskUsage = defineStore('disk-usage', () => ({
    total: ref<number>(),
    free: ref<number>(),
}));
