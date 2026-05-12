import { FileClassification } from '@/lib/classifyExt';
import { useRouteQuery } from '@vueuse/router';
import { defineStore } from 'pinia';
import { computed } from 'vue';
import { type RouteParamsGeneric, useRoute } from 'vue-router';

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
        dir: computed(() => getDirFromRouteParams(route.params)),
        file: computed(() => (route.hash.startsWith('#') ? route.hash.slice(1) : null)),
        forceEditorType
    };
});

export function getDirFromRouteParams(params: RouteParamsGeneric) {
    if (typeof params.path === 'string') {
        return [params.path].filter((v) => !!v);
    } else if (Array.isArray(params.path)) {
        return params.path.filter((v) => !!v);
    } else {
        return [];
    }
}
