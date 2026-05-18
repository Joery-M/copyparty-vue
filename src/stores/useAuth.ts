import { API } from '@/lib/api';
import { pathToParts } from '@/lib/utils';
import { useQuery, useQueryCache } from '@pinia/colada';
import { useConfirmDialog, whenever } from '@vueuse/core';
import { defineStore } from 'pinia';
import { computed } from 'vue';

export type LoginReason = 'unauthorized' | 'not found';

export interface LoginDialogPayload {
    /**
     * The path that was attempted to be accessed
     */
    path?: string[];
    reason?: LoginReason;
    canCancel?: boolean;
}

export const useAuth = defineStore('auth', () => {
    const queryCache = useQueryCache();
    const helloPageData = useQuery(API.getHelloPageDataQuery);

    const dialog = useConfirmDialog<LoginDialogPayload>();

    whenever(
        () => helloPageData.data.value,
        ({ readable, writable }) => {
            if (readable.length === 0 && writable.length === 0) {
                // If we have access to nothing, just show the login dialog
                dialog.reveal({ canCancel: false });
            }
        },
        { once: true }
    );

    return {
        usernameRequired: computed(() => helloPageData.data.value?.usernames),
        username: computed(() => helloPageData.data.value?.uname),
        readable: computed(() => helloPageData.data.value?.readable.map(pathToParts) ?? []),
        writable: computed(() => helloPageData.data.value?.writable.map(pathToParts) ?? []),
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
