import { createRouter, createWebHistory } from 'vue-router';

export const router = createRouter({
    history: createWebHistory(),
    routes: [
        { path: '/#login', component: () => import('./pages/Login.vue') },
        {
            name: 'viewer',
            path: '/:path*',
            component: () => import('./pages/Files.vue'),
            sensitive: true
        }
    ]
});
