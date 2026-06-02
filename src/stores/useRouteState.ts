import type { RouteParamsGeneric } from 'vue-router';

import { defineStore } from 'pinia';
import { computed } from 'vue';
import { useRoute } from 'vue-router';

export const useRouteState = defineStore('route-state', () => {
    const route = useRoute();

    return {
        dir: computed(() => getDirFromRouteParams(route.params)),
        file: computed(() => (route.hash.startsWith('#') ? route.hash.slice(1) : null)),
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
