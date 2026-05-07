import { API } from '@/lib/api';
import { useQuery, useQueryCache } from '@pinia/colada';
import { useConfirmDialog } from '@vueuse/core';
import { defineStore } from 'pinia';
import { computed } from 'vue';

export type LoginReason = 'forbidden' | '';

export interface LoginDialogPayload {
    /**
     * The path that was attempted to be accessed
     */
    path?: string[];
    canCancel?: boolean;
}

export const useAuth = defineStore('auth', () => {
    const queryCache = useQueryCache();
    const helloPageData = useQuery(API.getHelloPageDataQuery);

    const dialog = useConfirmDialog<LoginDialogPayload>();

    return {
        usernameRequired: computed(() => helloPageData.data.value?.usernames),
        username: computed(() => helloPageData.data.value?.username),
        readable: computed(() => helloPageData.data.value?.readable),
        writable: computed(() => helloPageData.data.value?.writable),
        async getPermissions(dir: string[]) {
            const query = queryCache.ensure(API.getListDirectoryQuery(dir));
            const res = await queryCache.refresh(query);
            return res.data?.perms ?? [];
        },
        loginDialog: dialog,
        logout: () =>
            API.login('x').finally(() => {
                queryCache.invalidateQueries({ key: ['ls'] }, true);
                queryCache.invalidateQueries({ key: ['tree'] }, true);
                queryCache.invalidateQueries({ key: ['hello'] }, true);
            })
    };
});
