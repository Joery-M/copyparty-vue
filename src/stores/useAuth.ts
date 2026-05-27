import { API } from '@/lib/api';
import { pathToParts } from '@/lib/utils';
import { useQuery, useQueryCache } from '@pinia/colada';
import { useConfirmDialog, whenever } from '@vueuse/core';
import { defineStore } from 'pinia';
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { toast } from 'vue-sonner';

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
    const i18n = useI18n();

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
        login: (password: string, username?: string) =>
            API.login(password, username)
                .then((uname) => {
                    toast(() => i18n.t('toast.logged_in', [uname]), {
                        dismissible: true,
                        position: 'bottom-right'
                    });
                    return true;
                })
                .catch((err) => {
                    toast.error(() => i18n.t('toast.error'), {
                        description: () =>
                            err instanceof API.ApiError
                                ? i18n.t('error.api', err.cause)
                                : i18n.t('error.api_unknown')
                    });
                    return false;
                })
                .finally(() => {
                    queryCache.invalidateQueries({ key: ['ls'] }, true);
                    queryCache.invalidateQueries({ key: ['tree'] }, true);
                    queryCache.invalidateQueries({ key: ['full-tree'] }, true);
                    queryCache.invalidateQueries({ key: ['hello'] }, true);
                }),
        logout: () =>
            API.logout()
                .then(() => {
                    toast(() => i18n.t('toast.logged_out'));
                })
                .catch((err) => {
                    toast.error(() => i18n.t('toast.error'), {
                        description: () =>
                            err instanceof API.ApiError
                                ? i18n.t('error.api', err.cause)
                                : i18n.t('error.api_unknown'),
                        dismissible: true,
                        position: 'bottom-right'
                    });
                })
                .finally(() => {
                    queryCache.invalidateQueries({ key: ['ls'] }, true);
                    queryCache.invalidateQueries({ key: ['tree'] }, true);
                    queryCache.invalidateQueries({ key: ['full-tree'] }, true);
                    queryCache.invalidateQueries({ key: ['hello'] }, true);
                })
    };
});
