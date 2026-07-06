import { defineConfig } from 'tsdown';

export default defineConfig({
    dts: { build: true },
    entry: ['./src/index.ts', './src/hash.worker.ts'],
    exports: {
        devExports: true,
        exclude: ['hash.worker'],
    },
});
