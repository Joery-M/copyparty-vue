import { API } from '@/lib/api';
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
        }
    };
});
