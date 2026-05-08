import VueI18nPlugin from '@intlify/unplugin-vue-i18n/vite';
import tailwind from '@tailwindcss/vite';
import vue from '@vitejs/plugin-vue';
import { defineConfig, loadEnv } from 'vite';
import VueDevtools from 'vite-plugin-vue-devtools';

export default defineConfig((env) => ({
    plugins: [
        VueDevtools(),
        VueI18nPlugin({ include: './src/localization/**/*.json' }),
        tailwind(),
        vue()
    ],
    resolve: {
        tsconfigPaths: true
    },
    define: {
        __DEV__: env.mode !== 'production',
        __PROD__: env.mode === 'production'
    },
    server: {
        proxy: {
            '/api': {
                target: loadEnv('', '').VITE_COPYPARTY_HOST!,
                changeOrigin: true,
                rewrite: (path) => path.replace(/^\/api/, '')
            }
        }
    }
}));
