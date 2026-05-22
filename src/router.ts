import { createRouter, createWebHistory } from 'vue-router';

export const router = createRouter({
    history: createWebHistory(),
    routes: [
        {
            name: 'viewer',
            path: '/:path*',
            component: () => import('./pages/Files.vue'),
            sensitive: true
        }
    ]
});
