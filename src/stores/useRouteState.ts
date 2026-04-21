import { FileClassification } from '@/lib/classifyExt';
import { useRouteQuery } from '@vueuse/router';
import { defineStore } from 'pinia';
import { computed } from 'vue';
import { useRoute } from 'vue-router';

export const useRouteState = defineStore('route-state', () => {
    const route = useRoute();
    const forceEditorType = useRouteQuery('editor', null, {
        transform(v: string | string[] | null | undefined): FileClassification | undefined {
            if (v == null) return undefined;
            const elem = Array.isArray(v) ? v[0] : v;
            const num = parseInt(elem);
            return Number.isNaN(num) ? undefined : num in FileClassification ? num : undefined;
        }
    });

    return {
        dir: computed(() => {
            if (typeof route.params.path === 'string') {
                return [route.params.path].filter((v) => !!v);
            } else if (Array.isArray(route.params.path)) {
                return route.params.path.filter((v) => !!v);
            } else {
                return [];
            }
        }),
        file: computed(() => (route.hash.startsWith('#') ? route.hash.slice(1) : null)),
        forceEditorType
    };
});
