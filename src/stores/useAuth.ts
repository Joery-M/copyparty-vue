import { API, getApiUrl } from '@/lib/api';
import { useQuery, useQueryCache } from '@pinia/colada';
import { defineStore } from 'pinia';
import { computed } from 'vue';

export const useAuth = defineStore('auth', () => {
    const queryCache = useQueryCache();
    const helloPageData = useQuery(API.getHelloPageDataQuery);

    return {
        username: computed(() => helloPageData.data.value?.username),
        readable: computed(() => helloPageData.data.value?.readable),
        writable: computed(() => helloPageData.data.value?.writable),
        async getPermissions(dir: string[]) {
            const query = queryCache.ensure(API.getListDirectoryQuery(dir));
            const res = await queryCache.refresh(query);
            return res.data?.perms ?? [];
        },
        async login(password: string, username?: string) {
            const form = new FormData();
            form.set('act', 'login');
            if (username) form.set('uname', username);
            form.set('cppwd', password);
            form.set('uhash', '');

            await fetch(getApiUrl([]), { method: 'POST', body: form })
                .then((r) => r.text())
                .then((res) => res.includes('<h1>hi '))
                .catch(() => false);
            queryCache.invalidateQueries({ key: ['ls'] }, true);
            queryCache.invalidateQueries({ key: ['tree'] }, true);
            queryCache.invalidateQueries({ key: ['hello'] }, true);
        }
    };
});
