import { pathToParts } from '@/lib/utils';
import { createRouter, createWebHistory } from 'vue-router';

export const router = createRouter({
    history: createWebHistory(),
    routes: [
        {
            name: 'viewer',
            path: '/:path*',
            component: () => import('./pages/Files.vue'),
            sensitive: true,
            beforeEnter() {
                // Load SSR data here
                if (window.__initial_state) {
                    const { dir, preview } = window.__initial_state;
                    window.__initial_state = undefined;

                    const split = pathToParts(dir);
                    return {
                        params: {
                            path: split.concat('')
                        },
                        hash: `#${preview}`,
                        replace: true
                    };
                }
            }
        }
    ]
});
