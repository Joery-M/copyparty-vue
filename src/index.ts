import { PiniaColada } from '@pinia/colada';
import { DataLoaderPlugin } from 'vue-router/experimental';
import { createPinia } from 'pinia';
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate';
import { createApp } from 'vue';
import { createI18n } from 'vue-i18n';
import App from './App.vue';
import { router } from './router';

import messages from '@intlify/unplugin-vue-i18n/messages';

const pinia = createPinia();
pinia.use(piniaPluginPersistedstate);

const i18n = createI18n({
    locale: 'en',
    messages
});

createApp(App)
    .use(i18n)
    .use(pinia)
    .use(PiniaColada)
    .use(DataLoaderPlugin, { router })
    .use(router)
    .mount('#app');
