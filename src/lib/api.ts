import { useBrowserLocation } from "@vueuse/core";
import {
  parseURL,
  resolveURL,
  stringifyParsedURL,
  withQuery,
  type QueryObject,
} from "ufo";

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
        return leaf.a;
      });
  }
}
