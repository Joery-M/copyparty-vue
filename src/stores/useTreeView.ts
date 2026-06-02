import { defineQueryOptions, useQuery, useQueryCache } from '@pinia/colada';
import { hash } from 'ohash';
import { defineStore } from 'pinia';
import { shallowReactive, watch } from 'vue';

import { API } from '@/lib/api';
import { arrayStartsWith, dedupedComputed } from '@/lib/utils';

export const useTreeView = defineStore('tree-view', () => {
    const treeQueryOptions = defineQueryOptions<string[], Map<string[], string[]>, API.ApiError>(
        (path: string[]) => ({
            key: ['tree', ...path],
            query: ({ signal }) => API.getFileTreeRecursive(path, signal),
        })
    );

    const openedLeaves = shallowReactive(new Map<string, string[]>([]));

    /**
     * Close all paths that are part of `path`, including `path` itself
     */
    function closePath(path: string[]) {
        for (const [key, leaf] of openedLeaves) {
            if (leaf.length >= path.length && arrayStartsWith(leaf, path)) {
                openedLeaves.delete(key);
            }
        }
    }

    /**
     * Get the tail end of each branch
     *
     * @example
     * Input:  [["dir1", "dir2"], ["dir1", "dir2", "dir3"]]
     * Output: [["dir1", "dir2", "dir3"]]
     *
     * @example
     * Input:  [["dir1", "dir2"], ["dir1", "dir2", "dir3"], ["dir1", "otherDir", "inOtherDir"]]
     * Output: [["dir1", "dir2", "dir3"], ["dir1", "otherDir", "inOtherDir"]]
     *
     * @example Edge case: There are no other paths to compare, so return the only one (or none)
     * Input:  [["dir1"]]
     * Output: [["dir1"]]
     */
    const lowestOpenedLeaves = dedupedComputed(() => {
        if (openedLeaves.size == 0) return [[]];
        else if (openedLeaves.size == 1) return Array.from(openedLeaves.values());

        const lowestLeaves = new Set<string[]>([[]]);
        for (const path of openedLeaves.values()) {
            const isDeeperThanExisting = Array.from(openedLeaves.values()).some(
                (other) => !arrayStartsWith(other, path)
            );
            if (isDeeperThanExisting) {
                for (const leaf of lowestLeaves) {
                    if (arrayStartsWith(path, leaf)) lowestLeaves.delete(leaf);
                }
                lowestLeaves.add(path);
            }
        }
        return Array.from(lowestLeaves);
    });
    const queryCache = useQueryCache();
    const treeQuery = useQuery({
        key: () => ['full-tree'],
        query: async () => {
            const leaves = lowestOpenedLeaves.value;
            const trees = await Promise.allSettled(
                leaves.map((path) =>
                    queryCache.refresh(queryCache.ensure(treeQueryOptions(path))).catch((err) => {
                        console.error('Error fetching file tree for path:', path.join('/'), err);
                        closePath(path);
                        throw err;
                    })
                )
            );

            return new Map(
                trees
                    .filter((v) => v.status === 'fulfilled')
                    .flatMap((v) => (v.value.data ? Array.from(v.value.data) : []))
                    .map(([k, v]) => [hash(k), v] as [string, string[]])
            );
        },
        placeholderData: () => new Map<string, string[]>(),
        staleTime: 30_000,
    });
    watch(lowestOpenedLeaves, () => queryCache.invalidateQueries({ key: ['full-tree'] }, true));

    return {
        getPathItems(path: string[]) {
            return treeQuery.data.value?.get(hash(path)) ?? [];
        },
        isPathOpen(path: string[]) {
            return path.length === 0 || openedLeaves.has(hash(path));
        },
        openPath(path: string[]) {
            path.forEach((_, i) => {
                const p = path.slice(0, i + 1);
                // The reason I hash the path instead of defining a consistent key is:
                //  1. I'm lazy
                //  2. The best other option I could come up with was joining the path element with some
                //     separator, but since copyparty allows for any character in a directory, and I
                //     decode uri-encoded chars early on, that becomes iffy, could still be possible though
                openedLeaves.set(hash(p), p);
            });
        },
        /**
         * Close all paths that are child to `path`
         */
        closeChildPaths(path: string[]) {
            for (const [key, leaf] of openedLeaves) {
                if (leaf.length > path.length && arrayStartsWith(leaf, path)) {
                    openedLeaves.delete(key);
                }
            }
        },
    };
});
