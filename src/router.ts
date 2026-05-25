import { API, getApiUrl } from '@/lib/api';
import { canView } from '@/lib/classifyExt';
import { pathToParts } from '@/lib/utils';
import { useAuth } from '@/stores/useAuth';
import { getDirFromRouteParams } from '@/stores/useRouteState';
import { useQueryCache } from '@pinia/colada';
import { createRouter, createWebHistory } from 'vue-router';

export const router = createRouter({
    history: createWebHistory(),
    routes: [
        {
            name: 'viewer',
            path: '/:path*',
            component: () => import('./pages/Files.vue'),
            sensitive: true,
            async beforeEnter(r) {
                const authStore = useAuth();
                const queryCache = useQueryCache();
                const split = getDirFromRouteParams(r.params);
                const query = queryCache.ensure(API.getListDirectoryQuery(split));
                console.log(split);

                const lsData = await queryCache.refresh(query).catch((err) => {
                    if (err instanceof API.ApiError) {
                        if (err.cause.code === 403 || err.cause.code === 401) {
                            authStore.loginDialog.reveal({
                                path: split,
                                reason: 'unauthorized',
                                canCancel: false
                            });
                        } else if (err.cause.code === 404) {
                            authStore.loginDialog.reveal({
                                path: split,
                                reason: 'not found',
                                canCancel: false
                            });
                        }
                    }
                });
                if (lsData?.data?.dir != null) {
                    const newPath = pathToParts(lsData.data.dir);
                    // Set the data for the parent dir as well since it's the same
                    queryCache.setQueryData(['ls', ...newPath], {
                        ...lsData.data,
                        dir: null
                    });
                    const filename = split.at(-1)!;
                    const fileEntry = lsData.data.entries.find((v) => v.name === filename);
                    if (fileEntry) {
                        if (canView(fileEntry?.classification)) {
                            return {
                                params: {
                                    ...r.params,
                                    path: newPath.concat('')
                                },
                                hash: '#' + filename,
                                replace: true
                            };
                        } else {
                            location.href = getApiUrl(split, { dl: '' });
                            await new Promise((r) => setTimeout(r, 100000));
                        }
                    }
                }
            }
        }
    ]
});
