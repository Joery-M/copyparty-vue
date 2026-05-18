import { API } from '@/lib/api';
import { arrayStartsWith, dedupedComputed } from '@/lib/utils';
import { defineQueryOptions, useQuery, useQueryCache } from '@pinia/colada';
import { hash } from 'ohash';
import { defineStore } from 'pinia';
import { shallowReactive, watch } from 'vue';

export const useTreeView = defineStore('tree-view', () => {
    const treeQueryOptions = defineQueryOptions((path: string[]) => ({
        key: ['tree', ...path],
        query: ({ signal }) => API.getFileTreeRecursive(path, signal)
    }));

    const openedLeaves = shallowReactive(new Map<string, string[]>([]));

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
     */
    const lowestOpenedLeaves = dedupedComputed(() => {
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
            const trees = await Promise.all(
                leaves.map((path) => queryCache.refresh(queryCache.ensure(treeQueryOptions(path))))
            );

            return new Map(
                trees
                    .map((v) => (v.data ? Array.from(v.data) : []))
                    .flat(1)
                    .map(([k, v]) => [hash(k), v] as [string, string[]])
            );
        },
        placeholderData: () => new Map<string, string[]>(),
        staleTime: 30_000
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
                openedLeaves.set(hash(p), p);
            });
        }
    };
});
