import { createApp } from 'vue';
import App from './App.vue';
import { router } from './router';
import { createPinia } from 'pinia';
import { PiniaColada } from '@pinia/colada';

export const app = createApp(App);
app.use(createPinia());
app.use(PiniaColada);
app.use(router);
app.mount('#app');
