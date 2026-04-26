import { PiniaColada } from '@pinia/colada';
import { createPinia } from 'pinia';
import { createApp } from 'vue';
import App from './App.vue';
import { router } from './router';

const pinia = createPinia();
createApp(App).use(pinia).use(PiniaColada).use(router).mount('#app');
