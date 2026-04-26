import type { _JSONPrimitive } from '@pinia/colada';
import { useBrowserLocation, useTimeoutFn } from '@vueuse/core';
import { parseURL, resolveURL, stringifyParsedURL, withQuery, type QueryObject } from 'ufo';
import { readonly, ref, toRef, watch, type MaybeRefOrGetter } from 'vue';
import { Directory as DirectoryEntry, File as FileEntry, type AnyDirectoryEntry } from './interop';

const baseUrl = stringifyParsedURL(
    parseURL(
        __DEV__ || import.meta.env.VITE_FORCE_HOST_OVERRIDE == 'true'
            ? import.meta.env.VITE_COPYPARTY_HOST || useBrowserLocation().value.origin
            : useBrowserLocation().value.origin,
        'http'
    )
);

export function getApiUrl(strings: string[], params?: QueryObject): string {
    const parts = Array.isArray(strings) ? strings : [strings];
    const resolved = resolveURL(baseUrl, ...parts);
    if (params) {
        return withQuery(resolved, params);
    } else {
        return resolved;
    }
}

export namespace API {
    interface FileTreeResponse {
        a: string[];
    }

    export function getFileTree(path: string[], signal: AbortSignal) {
        return fetch(getApiUrl(path, { tree: '.' }), { signal })
            .then((r) => r.json())
            .then((r: FileTreeResponse) => r.a.map(decodeURIComponent));
    }

    export interface ListDirectoryEntry {
        load?: string;
        href: string;
        sz?: number;
        ext: string;
        ts?: number;
        tags?: Record<string, _JSONPrimitive>;
    }

    export interface LsConfig {
        idx: boolean;
        itag: boolean;
        dlni: boolean;
        dgrid: boolean;
        dnsort: boolean;
        dhsortn: number;
        dsort: string;
        dcrop: string;
        dth3x: string;
        u2ts: string;
        shr_who: string;
        frand: boolean;
        lifetime: number;
        unlist: string;
        sb_lg: string;
        sb_md: string;
        rw_edit: string;
        fsnt: string;
    }
    export interface ListDirectoryResponse {
        dirs: ListDirectoryEntry[];
        files: ListDirectoryEntry[];
        taglist: string[];
        srvinf: string;
        acct: string;
        perms: string[];
        cfg: LsConfig;
        logues: string[];
        readmes: string[];
        fnugg: string;
    }

    export function getListDirectory(path: string[], signal: AbortSignal) {
        return fetch(getApiUrl(path, { ls: '' }), { signal })
            .then((r) => r.json())
            .then((raw: ListDirectoryResponse) => ({
                entries: [
                    raw.dirs.map((entry) => new DirectoryEntry(path, entry)),
                    raw.files.map((entry) => new FileEntry(path, entry))
                ].flat() as AnyDirectoryEntry[],
                raw
            }));
    }
}

/**
 * Turn a boolean ref into a ref that turns true after a delay, but turns false immediately
 */
export function useLoadingState(loading: MaybeRefOrGetter<boolean>, time = 1000) {
    const state = toRef(loading);
    const output = ref(state.value);
    const timer = useTimeoutFn(() => (output.value = true), time, {
        immediate: false
    });
    watch(state, (state) => {
        if (state) {
            if (!timer.isPending.value) timer.start();
        } else {
            timer.stop();
            output.value = false;
        }
    });
    return readonly(output);
}
