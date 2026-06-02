import { defineConfig } from 'oxfmt';

export default defineConfig({
    singleQuote: true,
    tabWidth: 4,
    sortImports: {
        groups: [
            'type-import',
            ['value-builtin', 'value-external'],
            'type-internal',
            'value-internal',
            ['type-parent', 'type-sibling', 'type-index'],
            ['value-parent', 'value-sibling', 'value-index'],
            'shadcn',
            'unknown',
        ],
        customGroups: [{ groupName: 'shadcn', elementNamePattern: ['@shadcn/*'] }],
    },
    useTabs: false,
    trailingComma: 'es5',
    sortPackageJson: true,
    ignorePatterns: ['pnpm-lock.yaml', 'pnpm-workspace.yaml', 'src/components/ui', 'copyparty'],
    overrides: [
        {
            files: ['*.json'],
            options: {
                tabWidth: 2,
            },
        },
    ],
});
