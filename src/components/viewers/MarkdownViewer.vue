<script setup lang="ts">
import { getApiUrl } from '@/lib/api';
import { fromHighlighter } from '@shikijs/markdown-exit';
import { computedAsync, useDark } from '@vueuse/core';
import DOMPurify from 'dompurify';
import { createMarkdownExit } from 'markdown-exit';
import taskList from 'markdown-it-task-lists';
import { joinRelativeURL, parseURL } from 'ufo';
import { effect, shallowRef, triggerRef, type HTMLAttributes } from 'vue';

import { useRouteState } from '@/stores/useRouteState';
import { useRouter } from 'vue-router';

const props = defineProps<{ input: string; class?: HTMLAttributes['class'] }>();

const isDark = useDark();

const router = useRouter();
const routeState = useRouteState();

const parser = shallowRef(createMarkdownExit({ html: true }).use(taskList));
const sanitizer = DOMPurify(window);

// This hook replaces relative image urls with their respective paths
sanitizer.addHook('afterSanitizeElements', (node) => {
    if (!(node instanceof HTMLImageElement)) return;
    node.crossOrigin = 'anonymous';
    node.loading = 'lazy';

    const src = node.getAttribute('src');
    if (!src) return;
    const parsed = parseURL(src);
    // If not relative, exit
    if (parsed.host) return;

    // Create URL relative to cwd
    const path = joinRelativeURL(...routeState.dir, parsed.pathname).split('/');
    node.src = getApiUrl(path);

    // Get filename and set last element to empty string for trailing slash
    const filename = path[path.length - 1];
    path[path.length - 1] = '';

    // If the img is not directly wrapped in an anchor tag, add our own
    if (!(node.parentNode instanceof HTMLAnchorElement)) {
        const anchor = document.createElement('a');
        anchor.appendChild(node.cloneNode());
        const routeLink = router.resolve({
            name: 'viewer',
            params: { path },
            hash: '#' + filename
        });
        anchor.href = routeLink.href;
        anchor.onclick = (e) => {
            e.stopPropagation();
            router.push(routeLink);
        };
        node.replaceWith(anchor);
    }
});
// This hook adds target="_blank" to anchor tags that aren't in this page
sanitizer.addHook('afterSanitizeElements', (node) => {
    if (!(node instanceof HTMLAnchorElement)) return;

    const href = node.getAttribute('href');
    if (!href) return;
    const parsed = parseURL(href);
    if (parsed.host && parsed.host !== location.host) node.setAttribute('target', '_blank');
});

// Load shiki into the parser only when it's required
effect(async () => {
    // Slight optimization for basic markdown files
    if (!props.input.includes('```')) return;
    const dark = isDark.value;

    const { CustomShiki } = await import('@/lib/shiki');
    const shiki = await CustomShiki.getInstance();
    parser.value.use(
        fromHighlighter(shiki, {
            theme: dark ? 'horizon' : 'one-light',
            fallbackLanguage: 'text' as any
        })
    );
    triggerRef(parser);
});

const renderedHtml = computedAsync(async () => {
    const source = props.input;
    const rendered = await parser.value.renderAsync(source);

    return sanitizer.sanitize(rendered, {
        USE_PROFILES: { html: true },
        ADD_ATTR: (attr, elem) => attr === 'target' && elem === 'a'
    });
}, '');
</script>

<template>
    <div class="wrapper" :class>
        <div class="markdown-body" v-html="renderedHtml"></div>
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

<style src="./github-markdown/index.css"></style>
