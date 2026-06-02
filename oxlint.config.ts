import { defineConfig } from 'oxlint';

export default defineConfig({
    plugins: ['typescript', 'unicorn', 'oxc', 'vue', 'import'],
    ignorePatterns: ['copyparty', 'src/components/ui'],
    categories: {
        perf: 'warn',
        correctness: 'error',
    },
    rules: {
        'no-unused-expressions': ['error', { allowTernary: true }],
        'import/consistent-type-specifier-style': 'warn',
        'no-await-in-loop': 'allow',
    },
    env: {
        builtin: true,
    },
});
