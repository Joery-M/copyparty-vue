import { defineQueryOptions, type _JSONPrimitive } from '@pinia/colada';
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
    const resolved = resolveURL(baseUrl, ...parts.map(encodeURIComponent));
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

    export const getFileTreeQuery = defineQueryOptions((path: string[]) => ({
        key: ['tree', ...path],
        query: ({ signal }) => getFileTree(path, signal),
        staleTime: 30_000
    }));

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

    export type Permissions =
        | 'read'
        | 'write'
        | 'move'
        | 'delete'
        | 'dot'
        | 'get'
        | 'upget'
        | 'html'
        | 'admin';

    export function getListDirectory(path: string[], signal: AbortSignal) {
        return fetch(getApiUrl(path, { ls: '' }), { signal })
            .then((r) => r.json())
            .then((res: ListDirectoryResponse) => ({
                entries: [
                    res.dirs.map((entry) => new DirectoryEntry(path, entry)),
                    res.files.map((entry) => new FileEntry(path, entry))
                ].flat() as AnyDirectoryEntry[],
                perms: res.perms as Permissions[],
                readmes: res.readmes
            }));
    }

    export const getListDirectoryQuery = defineQueryOptions((dir: string[]) => ({
        key: ['ls', ...dir],
        query: ({ signal }) => getListDirectory(dir, signal)
    }));

    export function getHelloPageData(signal: AbortSignal) {
        return fetch(getApiUrl([], { h: '', ls: 't' }), { signal })
            .then((r) => r.text())
            .then((res) => {
                const lines = res.split('\n');

                let username: string | null = null;
                const readable: string[] = [];
                const writable: string[] = [];

                for (let i = 0; i < lines.length; i++) {
                    const line = lines[i];
                    if (line.trim().length == 0) continue;

                    if (i == 0) {
                        if (line.startsWith('howdy stranger')) {
                            username = null;
                        } else if (line.startsWith('welcome back')) {
                            username = line.split(' ')[2] ?? null;
                        }
                    } else if (line.startsWith('status:')) {
                        // TODO: Find a good situation where this can be examined
                        continue;
                    } else if (line.startsWith('incoming files:')) {
                        // TODO: Figure out the format
                        continue;
                    } else if (line.startsWith('active downloads:')) {
                        // TODO: Figure out the format
                        continue;
                    } else if (line.startsWith('you can browse:')) {
                        // Looks weird, but this loops over the next lines until we're out of the list
                        for (; i < lines.length; i++) {
                            const line = lines[i + 1];
                            if (!line.startsWith('  ')) break;
                            readable.push(line.trim());
                        }
                    } else if (line.startsWith('you can upload to:')) {
                        for (; i < lines.length; i++) {
                            const line = lines[i + 1];
                            if (!line.startsWith('  ')) break;
                            writable.push(line.trim());
                        }
                    }
                }
                return {
                    username,
                    readable,
                    writable
                };
            });
    }
    export const getHelloPageDataQuery = defineQueryOptions({
        key: ['hello'],
        query: ({ signal }) => getHelloPageData(signal),
        refetchOnWindowFocus: false,
        staleTime: 30_000
    });
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
