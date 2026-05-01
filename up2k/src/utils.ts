export const sleep = (time: number) => new Promise((r) => setTimeout(r, time));

export type PartialExcept<T, K extends keyof T> = Partial<T> & Pick<T, K>;

export function rdFlatten(pf: Set<string>, dirs: FileSystemDirectoryEntry[]) {
    return new Set([...pf, ...dirs.map((d) => d.fullPath || '')].sort());
}

export function vsplit(vp: string) {
    if (vp.endsWith('/')) vp = vp.slice(0, -1);

    var ofs = vp.lastIndexOf('/') + 1,
        base = vp.slice(0, ofs),
        fn = vp.slice(ofs);

    return [base, fn];
}

export const isDirectoryEntry = (item: FileSystemEntry): item is FileSystemDirectoryEntry =>
    item.isDirectory;
export const isFileEntry = (item: FileSystemEntry): item is FileSystemFileEntry =>
    !item.isDirectory;
