import type { _JSONPrimitive } from '@pinia/colada';
import type { QueryObject } from 'ufo';
import type { MaybeRefOrGetter } from 'vue';

import { defineQueryOptions } from '@pinia/colada';
import { useBrowserLocation, useTimeoutFn } from '@vueuse/core';
import { parseURL, resolveURL, stringifyParsedURL, withQuery } from 'ufo';
import { readonly, ref, toRef, watch } from 'vue';

import type { AnyDirectoryEntry } from './interop';

import { Directory as DirectoryEntry, File as FileEntry } from './interop';

const baseUrl = stringifyParsedURL(
    parseURL(
        __DEV__ || import.meta.env.VITE_FORCE_HOST_OVERRIDE == 'true'
            ? import.meta.env.VITE_API_HOST || useBrowserLocation().value.origin
            : useBrowserLocation().value.origin
    )
);

export function getApiUrl(strings: string[], params?: QueryObject, noEncode = false): string {
    const parts = Array.isArray(strings) ? strings : [strings];
    const resolved = resolveURL(baseUrl, ...(noEncode ? parts.map(encodeURIComponent) : parts));
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

    export function jsonResponse<T>(res: Response): Promise<T> {
        if (res.headers.get('Content-Type') !== 'application/json') {
            res.body?.cancel();
            throw new ApiError({ code: res.status, res });
        } else {
            return res.json();
        }
    }

    type FileTreeResponseRecursive = {
        a: string[];
    } & {
        [K in `k${string}`]?: FileTreeResponseRecursive;
    };

    export function getFileTreeRecursive(path: string[], signal: AbortSignal) {
        return fetch(getApiUrl(path, { tree: null }, true), { signal })
            .then((r) => extractError(r))
            .then((r) => jsonResponse<FileTreeResponseRecursive>(r))
            .then((res) => {
                const tree = new Map<string[], string[]>();

                let curLeaf: FileTreeResponseRecursive | undefined = res;
                const depth: string[] = [];
                while (curLeaf) {
                    const key = Object.keys(curLeaf!).find((k) =>
                        k.startsWith('k')
                    ) as `k${string}`;

                    const children = key ? curLeaf.a.concat(key.slice(1)) : curLeaf.a;
                    tree.set(
                        depth.map(decodeURIComponent),
                        children.sort((a, b) => a.localeCompare(b)).map(decodeURIComponent)
                    );
                    curLeaf = key ? curLeaf[key] : undefined;
                    if (key) {
                        depth.push(key.slice(1));
                    }
                }
                return tree;
            });
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
        dir?: string | null;
        acct: string;
        perms: string[];
        cfg?: LsConfig;
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

    export interface ListDirectoryParsedResponse {
        entries: AnyDirectoryEntry[];
        perms: Permissions[];
        readmes: string[];
        tags: string[];
        sort: string | undefined;
        dir?: string | null;
    }

    export function getListDirectory(path: string[], signal?: AbortSignal) {
        return fetch(getApiUrl(path, { ls: '' }), {
            signal,
            headers: { Accept: 'application/json' },
        })
            .then((r) => extractError(r))
            .then((r) => jsonResponse<ListDirectoryResponse>(r))
            .then(
                (res) =>
                    ({
                        entries: [
                            res.dirs.map((entry) => new DirectoryEntry(path, entry)),
                            res.files.map((entry) => new FileEntry(path, entry)),
                        ].flat() as AnyDirectoryEntry[],
                        perms: res.perms as Permissions[],
                        readmes: res.readmes,
                        tags: res.taglist,
                        sort: res.cfg?.dsort,
                        dir: res.dir,
                    }) satisfies ListDirectoryParsedResponse
            );
    }

    export const getListDirectoryQuery = defineQueryOptions((dir: string[]) => ({
        key: ['ls', ...dir],
        query: ({ signal }) => getListDirectory(dir, signal),
        staleTime: 30_000,
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
        return fetch(getApiUrl([], { h: 'j' }), {
            signal,
            headers: { Accept: 'application/json' },
        })
            .then((r) => jsonResponse<CustomHelloPageResponse>(r))
            .then((res) => {
                return res;
            });
    }
    export const getHelloPageDataQuery = defineQueryOptions({
        key: ['hello'],
        query: ({ signal }) => getHelloPageData(signal),
        refetchOnWindowFocus: false,
        staleTime: 30_000,
    });

    interface CustomJsonLoginResponse {
        continue: string;
        uname?: string | null;
    }

    export function login(pwd: string, uname?: string) {
        return fetch(getApiUrl([], { login: '' }), {
            method: 'POST',
            headers: {
                'Content-Encoding': 'application/json',
                Accept: 'application/json',
            },
            body: JSON.stringify({
                uname,
                pwd,
            }),
        })
            .then(extractError)
            .then((r) => jsonResponse<CustomJsonLoginResponse>(r))
            .then((res) => res.uname);
    }

    export function logout() {
        return fetch(getApiUrl([], { logout: '' }), {
            method: 'POST',
            headers: { 'Content-Encoding': 'application/json' },
            body: JSON.stringify({}),
        }).then(extractError);
    }

    export function mkdir(dir: string[], name: string) {
        const body = new FormData();
        body.set('act', 'mkdir');
        body.set('name', name);
        return fetch(getApiUrl(dir), { body, method: 'POST' }).then(extractError);
    }

    export function rm(paths: string[][]) {
        const body = paths.map((p) => ['', ...p, ''].join('/'));
        return fetch(getApiUrl([], { delete: '' }), {
            method: 'POST',
            headers: { 'Content-Encoding': 'application/json' },
            body: JSON.stringify(body),
        }).then(extractError);
    }
}

/**
 * Turn a boolean ref into a ref that turns true after a delay, but turns false immediately
 */
export function useLoadingState(loading: MaybeRefOrGetter<boolean>, time = 200) {
    const state = toRef(loading);
    const output = ref(false);
    const timer = useTimeoutFn(() => (output.value = true), time, {
        immediate: false,
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
