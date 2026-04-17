import { API } from "@/lib/api";
import { defineQuery, type DefineQueryOptions } from "@pinia/colada";
import {
  ref,
  shallowReactive,
  toRef,
  type MaybeRefOrGetter,
  type ShallowRef,
} from "vue";

export type AnyDirectoryEntry = Directory | File;

export class Directory {
  children = shallowReactive(new Map<string, AnyDirectoryEntry>());
  name: ShallowRef<string>;

  constructor(name: string) {
    this.name = ref(name);
  }
}
export class File {
  name: ShallowRef<string>;

  constructor(name: string) {
    this.name = ref(name);
  }
}

export type TreeItem = Directory | File;

export const getTreeOptions = (p: MaybeRefOrGetter<string[]>) => {
  const pathArray = toRef(p);
  return defineQuery(() => {
    return {
      key: ["ls", ...pathArray.value],
      query: ({ signal }) => API.getFileTree(pathArray.value, signal),
      staleTime: 30_000,
    } satisfies DefineQueryOptions;
  });
};
