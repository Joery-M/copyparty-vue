import { defineStore } from 'pinia';
import { getByPath, setByPath, type Path } from 'dot-path-value';
import { toRaw } from 'vue';

export type PreviewBackgroundType = 'transparent' | 'black' | 'white' | 'grid';

const DEFAULT_SETTINGS = {
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
        type: 'list' as 'list' | 'grid',
        pageSize: 50,
        gridSize: 60,
        hiddenListColumns: ['ac', 'fmt', 'res', 'tdate', 'vc', '.aq', '.fps', '.vq', '.q']
    }
};

export const useSettings = defineStore('settings', {
    state: () => structuredClone(DEFAULT_SETTINGS),
    actions: {
        resetPath(path?: Path<typeof DEFAULT_SETTINGS>) {
            if (path == null) {
                this.$patch(DEFAULT_SETTINGS);
                return;
            }
            const state = structuredClone(toRaw(this.$state));
            setByPath(state, path, getByPath(DEFAULT_SETTINGS, path));
            this.$patch(state);
        }
    },
    persist: { key: 'cpp-settings' }
});
