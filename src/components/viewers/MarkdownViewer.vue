<script setup lang="ts">
import { useDark } from '@vueuse/core';
import DOMPurify from 'dompurify';
import MarkdownIt from 'markdown-it';
import allowedHtmlElements from 'markdown-it/lib/common/html_blocks.mjs';
import { computed, effect, useTemplateRef, type HTMLAttributes } from 'vue';

import { getApiUrl } from '@/lib/api';
import { parseURL } from 'ufo';
import markdownDark from './github-markdown/github-markdown-dark.css?url';
import markdownLight from './github-markdown/github-markdown-light.css?url';

const props = defineProps<{ input: string; class?: HTMLAttributes['class'] }>();

const container = useTemplateRef('container');

const parser = new MarkdownIt({
    html: true,
    highlight(str, lang, attrs) {
        // TODO
        return str;
    }
});

const sanitizer = DOMPurify(window);
const markdownHtml = computed(() => {
    const parsed = parser.render(props.input);

    const sanitized = sanitizer.sanitize(parsed, {
        USE_PROFILES: { html: true },
        RETURN_DOM_FRAGMENT: true,
        ALLOWED_TAGS: allowedHtmlElements
    });
    // Replace relative links with resolved files
    for (const elem of sanitized.querySelectorAll('img')) {
        // is the source non-absolute
        const parsed = parseURL(elem.src, 'http://');
        if (!parsed.host || parsed.host === location.host) {
            elem.src = getApiUrl(parsed.pathname.split('/'));
        }
    }
    return sanitized;
});
effect(() => {
    if (markdownHtml.value && container.value) {
        container.value.replaceChildren(markdownHtml.value);
    }
});

const isDark = useDark();
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
        width: 100ch;
        max-width: 100%;
    }
}
</style>
