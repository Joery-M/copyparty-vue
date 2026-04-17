import { createApp } from "vue";
import App from "./App.vue";
import { router } from "./router";
import { createPinia } from "pinia";
import { PiniaColada } from "@pinia/colada";

createApp(App).use(createPinia()).use(PiniaColada).use(router).mount("#app");
