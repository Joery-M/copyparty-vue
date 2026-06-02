import type { Plugin } from 'vite';

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
        vue(),
        customJinjaElementsInjector(process.env.FORCE_JINJA === 'true'),
    ],
    resolve: {
        tsconfigPaths: true,
    },
    define: {
        __DEV__: env.mode !== 'production',
        __PROD__: env.mode === 'production',
    },
    server: {
        proxy: {
            '/api': {
                target: loadEnv('', '').VITE_COPYPARTY_HOST!,
                changeOrigin: true,
                rewrite: (path) => path.replace(/^\/api/, ''),
            },
        },
    },
}));

/**
 * Custom plugin to inject jinja templates into the html during build
 */
function customJinjaElementsInjector(force: boolean) {
    const injectionTemplates: Record<string, string> = {
        'initial-state': `
        {%- if og_fn %}
        <script type="module">
            window.__initial_state = {
                dir: \`{{ this.vpath }}\`,
                preview: \`{{ og_fn }}\`,
            };
        </script>
        {%- endif %}`,
        'html-head': `{{ html_head }}`,
    };
    let isDev = false;
    return {
        name: 'custom-jinja-elements-injector',
        configResolved(config) {
            isDev = config.command === 'serve';
        },
        transformIndexHtml(html) {
            if (isDev && !force) return;

            const injectionKey = /<!-- INJECT: ([A-z0-9-/]+) -->/g;
            let section;
            while ((section = injectionKey.exec(html))) {
                const template = section[1];
                html = html.replace(section[0], injectionTemplates[template] ?? '');
            }
            return {
                html,
                tags: [],
            };
        },
    } satisfies Plugin;
}
