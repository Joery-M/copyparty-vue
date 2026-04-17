import { useBrowserLocation, useTimeoutFn } from "@vueuse/core";
import {
  parseURL,
  resolveURL,
  stringifyParsedURL,
  withQuery,
  type QueryObject,
} from "ufo";
import { readonly, ref, toRef, watch, type MaybeRefOrGetter } from "vue";

const baseUrl = stringifyParsedURL(
  parseURL(
    __DEV__
      ? import.meta.env.VITE_COPYPARTY_HOST || useBrowserLocation().value.origin
      : useBrowserLocation().value.origin,
    "http",
  ),
);

export function getApiUrl(strings: string[], params?: QueryObject): string {
  const parts = Array.isArray(strings) ? strings : [strings];
  const resolved = resolveURL(baseUrl, ...parts);
  if (params) {
    const p = Object.fromEntries(
      Object.entries(params).map(([k, v]) => [k, v === true ? "" : v]),
    );
    return withQuery(resolved, p);
  } else {
    return resolved;
  }
}

export namespace API {
  type FileTreeResponse = FileTreeLeaf & {
    [k in `k${string}`]: FileTreeResponse;
  };
  interface FileTreeLeaf {
    a: string[];
  }

  export function getFileTree(path: string[], signal: AbortSignal) {
    return fetch(getApiUrl(path, { tree: true }), { signal })
      .then((r) => r.json())
      .then((r: FileTreeResponse) => {
        const leaf = path.reduce((leaf, key) => leaf[`k${key}`], r);
        return leaf.a.map(decodeURIComponent);
      });
  }
}

/**
 * Turn a boolean ref into a ref that turns true after a delay, but turns false immediately
 */
export function useLoadingState(
  loading: MaybeRefOrGetter<boolean>,
  time = 1000,
) {
  const state = toRef(loading);
  const output = ref(state.value);
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
