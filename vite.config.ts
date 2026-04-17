import vue from "@vitejs/plugin-vue";
import { defineConfig } from "vite";
import VueDevtools from "vite-plugin-vue-devtools";
import tailwind from "@tailwindcss/vite";

export default defineConfig((env) => ({
  plugins: [VueDevtools(), tailwind(), vue()],
  resolve: {
    tsconfigPaths: true,
  },
  define: {
    __DEV__: env.mode !== "production",
    __PROD__: env.mode === "production",
  },
}));
