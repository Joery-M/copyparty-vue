import { defineQueryOptions, type _JSONPrimitive } from '@pinia/colada';
import { useBrowserLocation, useTimeoutFn } from '@vueuse/core';
import { parseURL, resolveURL, stringifyParsedURL, withQuery, type QueryObject } from 'ufo';
import { readonly, ref, toRef, watch, type MaybeRefOrGetter } from 'vue';
import { Directory as DirectoryEntry, File as FileEntry, type AnyDirectoryEntry } from './interop';

const baseUrl = stringifyParsedURL(
    parseURL(
        __DEV__ || import.meta.env.VITE_FORCE_HOST_OVERRIDE == 'true'
            ? import.meta.env.VITE_API_HOST || useBrowserLocation().value.origin
            : useBrowserLocation().value.origin
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
    export class ApiError extends Error {
        constructor(public cause: { code: number; res?: Response; cause?: Error }) {
            super('An API error occurred');
        }
    }

    export function extractError(res: Response) {
        if (res.status >= 400) {
            throw new ApiError({ code: res.status, res });
        } else {
            return res;
        }
    }

    interface FileTreeResponse {
        a: string[];
    }

    export function getFileTree(path: string[], signal: AbortSignal) {
        return fetch(getApiUrl(path, { tree: '.' }), { signal })
            .then((r) => extractError(r))
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

    export function getListDirectory(path: string[], signal?: AbortSignal) {
        return fetch(getApiUrl(path, { ls: '' }), { signal })
            .then((r) => extractError(r))
            .then((r) => r.json())
            .then((res: ListDirectoryResponse) => ({
                entries: [
                    res.dirs.map((entry) => new DirectoryEntry(path, entry)),
                    res.files.map((entry) => new FileEntry(path, entry))
                ].flat() as AnyDirectoryEntry[],
                perms: res.perms as Permissions[],
                readmes: res.readmes,
                tags: res.taglist,
                sort: res.cfg.dsort
            }));
    }

    export const getListDirectoryQuery = defineQueryOptions((dir: string[]) => ({
        key: ['ls', ...dir],
        query: ({ signal }) => getListDirectory(dir, signal)
    }));

    interface CustomHelloPageResponse {
        usernames: boolean;
        uname: string | null;
        status: {
            volstate: Record<string, string> | null;
            scanning: boolean | null;
            hashq: number | null;
            tagq: number | null;
            mtpq: number | string | null;
            /**
             * True when server is too busy to get the uploads
             */
            ups: [number, number, number, number, string][] | true | null;
            dbwu: number | null;
            dbwt: number | null;
        };
        uploads: {
            done: number;
            speed: number;
            eta: number | null;
            /**
             * Time since last chunk
             */
            idle: number;
            path: string[];
        }[];
        downloads: {
            done: number | null;
            sent: number;
            speed: number;
            eta: number | null;
            /**
             * Time since last chunk
             */
            idle: number;
            uname: string;
            path: string[];
            id: string;
        }[];
        readable: string[];
        writable: string[];
    }

    export function getHelloPageData(signal: AbortSignal) {
        return fetch(getApiUrl([], { h: 'j' }), { signal })
            .then((r) => r.json())
            .then((res: CustomHelloPageResponse) => {
                return res;
            });
    }
    export const getHelloPageDataQuery = defineQueryOptions({
        key: ['hello'],
        query: ({ signal }) => getHelloPageData(signal),
        refetchOnWindowFocus: false,
        staleTime: 30_000
    });

    export function login(password: string, username?: string) {
        const form = new FormData();
        form.set('act', 'login');
        form.set('uname', username || '');
        form.set('cppwd', password);
        form.set('uhash', '');

        return fetch(getApiUrl([]), { method: 'POST', body: form })
            .then((r) => r.text())
            .then((res) => res.includes('<h1>hi '))
            .catch(() => false);
    }
}

/**
 * Turn a boolean ref into a ref that turns true after a delay, but turns false immediately
 */
export function useLoadingState(loading: MaybeRefOrGetter<boolean>, time = 200) {
    const state = toRef(loading);
    const output = ref(false);
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
