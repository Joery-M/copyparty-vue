import type { HighlighterCore } from 'shiki';

import batch from '@shikijs/langs/batch';
import c from '@shikijs/langs/c';
import cmake from '@shikijs/langs/cmake';
import cpp from '@shikijs/langs/cpp';
import css from '@shikijs/langs/css';
import diff from '@shikijs/langs/diff';
import go from '@shikijs/langs/go';
import html from '@shikijs/langs/html';
import ini from '@shikijs/langs/ini';
import java from '@shikijs/langs/java';
import javascript from '@shikijs/langs/javascript';
import json from '@shikijs/langs/json';
import json5 from '@shikijs/langs/json5';
import jsonc from '@shikijs/langs/jsonc';
import jsx from '@shikijs/langs/jsx';
import just from '@shikijs/langs/just';
import lua from '@shikijs/langs/lua';
import make from '@shikijs/langs/make';
import md from '@shikijs/langs/md';
import php from '@shikijs/langs/php';
import powershell from '@shikijs/langs/powershell';
import ps from '@shikijs/langs/ps';
import python from '@shikijs/langs/python';
import rust from '@shikijs/langs/rust';
import sass from '@shikijs/langs/sass';
import shellscript from '@shikijs/langs/shellscript';
import sql from '@shikijs/langs/sql';
import systemd from '@shikijs/langs/systemd';
import toml from '@shikijs/langs/toml';
import tsx from '@shikijs/langs/tsx';
import typescript from '@shikijs/langs/typescript';
import vue from '@shikijs/langs/vue';
import xml from '@shikijs/langs/xml';
import yaml from '@shikijs/langs/yaml';
import horizon from '@shikijs/themes/horizon';
import oneLight from '@shikijs/themes/one-light';
import { createHighlighterCore, createJavaScriptRegexEngine } from 'shiki';

const themes = [horizon, oneLight];

const langs = [
    batch,
    c,
    cmake,
    cpp,
    css,
    diff,
    go,
    html,
    ini,
    java,
    javascript,
    json,
    json5,
    jsonc,
    jsx,
    just,
    lua,
    make,
    md,
    php,
    powershell,
    ps,
    python,
    rust,
    sass,
    shellscript,
    sql,
    systemd,
    toml,
    tsx,
    typescript,
    vue,
    xml,
    yaml,
];

export class CustomShiki {
    static shiki: Promise<HighlighterCore>;

    static async getInstance() {
        if (CustomShiki.shiki) {
            return await CustomShiki.shiki;
        }
        CustomShiki.shiki = createHighlighterCore({
            themes,
            langs,
            engine: createJavaScriptRegexEngine(),
        });
        return await CustomShiki.shiki;
    }
}
