import messages from '@intlify/unplugin-vue-i18n/messages';
import { PiniaColada } from '@pinia/colada';
import { createPinia } from 'pinia';
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate';
import { createApp } from 'vue';
import { createI18n } from 'vue-i18n';
import { DataLoaderPlugin } from 'vue-router/experimental';

import App from './App.vue';
import { vContextMenu } from './lib/ContextMenu/ContextMenuDirective.ts';
import { router } from './router';

const pinia = createPinia();
pinia.use(piniaPluginPersistedstate);

const i18n = createI18n({
    locale: 'en',
    messages,
});

createApp(App)
    .use(i18n)
    .use(pinia)
    .use(PiniaColada)
    .use(DataLoaderPlugin, { router })
    .use(router)
    .directive('context-menu', vContextMenu)
    .mount('#app');
