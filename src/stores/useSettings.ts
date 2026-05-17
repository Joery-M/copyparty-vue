import { defineStore } from 'pinia';
import { reactive } from 'vue';

export type PreviewBackgroundType = 'transparent' | 'black' | 'white' | 'grid';

export const useSettings = defineStore(
    'settings',
    () =>
        reactive({
            format: {
                fileSizes: {
                    type: 'IEC' as 'IEC' | 'SI',
                    bits: false
                }
            },
            preview: {
                bgType: 'transparent' as PreviewBackgroundType,
                pixelated: false,
                video: {
                    volume: 1,
                    muted: false
                }
            },
            fileView: {
                type: 'list' as 'list' | 'grid'
            }
        }),
    { persist: { key: 'cpp-settings' } }
);
