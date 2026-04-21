<script setup lang="ts">
import { computedAsync, useDark } from '@vueuse/core';
import DOMPurify from 'dompurify';
import { createMarkdownExit } from 'markdown-exit';
import { effect, nextTick, ref, useTemplateRef, type HTMLAttributes } from 'vue';
import taskList from 'markdown-it-task-lists';
import { getApiUrl } from '@/lib/api';
import { parseURL } from 'ufo';

import { fromHighlighter } from '@shikijs/markdown-exit';

import markdownDark from './github-markdown/github-markdown-dark.css?url';
import markdownLight from './github-markdown/github-markdown-light.css?url';
import { useRouter } from 'vue-router';

const props = defineProps<{ input: string; class?: HTMLAttributes['class'] }>();

const container = useTemplateRef('container');

const isDark = useDark();

const router = useRouter();

// Slight optimization for basic markdown files
const shikiRequired = ref(props.input.includes('`'));
const shiki = computedAsync(async () => {
    if (!shikiRequired.value) return;

    const { CustomShiki } = await import('@/lib/shiki');
    return await CustomShiki.getInstance();
});

const sanitizer = DOMPurify(window);
effect(async () => {
    const dark = isDark.value;
    const source = props.input;
    if (!container.value) return;

    const parser = createMarkdownExit({ html: true });
    parser.use(taskList);

    // If Shiki is loaded, use it, if not, render anyway without highlighting
    if (shiki.value) {
        parser.use(
            fromHighlighter(shiki.value, {
                theme: dark ? 'horizon' : 'one-light',
                fallbackLanguage: 'text' as any
            })
        );
    }

    const parsed = await parser.renderAsync(source);

    const sanitized = sanitizer.sanitize(parsed, {
        USE_PROFILES: { html: true },
        RETURN_DOM_FRAGMENT: true
    });
    // Replace relative links with resolved files
    for (const elem of sanitized.querySelectorAll('img')) {
        // is the source non-absolute
        const parsed = parseURL(elem.src, 'http://');
        if (!parsed.host || parsed.host === location.host) {
            const path = parsed.pathname.split('/').filter((v) => !!v);
            const filename = path[path.length - 1];
            path[path.length - 1] = '';

            elem.onclick = () =>
                router.push({
                    name: 'viewer',
                    params: { path },
                    hash: '#' + filename
                });

            elem.src = getApiUrl(parsed.pathname.split('/'));
        }
        elem.crossOrigin = 'anonymous';
    }
    if (container.value) {
        container.value.replaceChildren(sanitized);
    }
});
</script>

<template>
    <link v-if="isDark" rel="stylesheet" :href="markdownDark" />
    <link v-else rel="stylesheet" :href="markdownLight" />
    <div class="wrapper" :class>
        <div class="markdown-body" ref="container"></div>
    </div>
</template>

<style lang="scss" scoped>
.wrapper {
    align-items: center;
    display: flex;
    flex-direction: column;
    overflow-y: auto;

    .markdown-body {
        width: 100%;
        max-width: 100ch;
    }
}
</style>
