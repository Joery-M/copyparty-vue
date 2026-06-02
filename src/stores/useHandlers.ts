import type { QueryObject } from 'ufo';

import { useQueryCache } from '@pinia/colada';
import { defineStore } from 'pinia';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';

import type { AnyDirectoryEntry } from '@/lib/interop';

import { API, getApiUrl } from '@/lib/api';
import { FileClassification } from '@/lib/classifyExt';
import { useConfirm } from '@/stores/useConfirm';

/**
 * Handlers for various actions that might be called from multiple locations
 */
export const useHandlers = defineStore('handlers', () => {
    const router = useRouter();
    const queryCache = useQueryCache();

    const i18n = useI18n();
    const dialog = useConfirm();

    return {
        view(dir: string[], fileName: string) {
            router.push({
                name: 'viewer',
                params: { path: dir.concat('') },
                hash: '#' + fileName,
            });
        },
        download(file: AnyDirectoryEntry) {
            const aTag = document.createElement('a');
            aTag.setAttribute('href', getApiUrl(file.fullPath, { dl: '' }));
            aTag.setAttribute('download', file.name);
            aTag.click();
            aTag.remove();
        },
        downloadArchive(file: AnyDirectoryEntry, params: QueryObject, ext: string) {
            if (file.classification === FileClassification.Directory) {
                const a = document.createElement('a');
                try {
                    a.href = getApiUrl(file.fullPath, params);
                    a.download = file.name + (ext ? `.${ext}` : '');
                    a.target = '_blank';
                    a.click();
                } finally {
                    a.remove();
                }
            } else {
                // Form submit to get data
                // Not checked since I still have CORS errors (womp womp)
                const form = new FormData();
                form.set('act', ext);
                form.set('files', encodeURIComponent(file.name));
                fetch(getApiUrl(file.fullPath.slice(0, -1).concat(''), params), {
                    method: 'POST',
                    body: form,
                })
                    .then(API.extractError)
                    .then((res) => res.blob())
                    .then((blob) => {
                        const a = document.createElement('a');
                        try {
                            a.href = URL.createObjectURL(blob);
                            a.download = file.name;
                            a.target = '_blank';
                            a.click();
                        } finally {
                            a.remove();
                        }
                    });
            }
        },
        openNewTab(file: AnyDirectoryEntry) {
            const url =
                file.classification === FileClassification.Directory
                    ? router.resolve({
                          name: 'viewer',
                          params: { path: file.fullPath.concat('') },
                      }).href
                    : getApiUrl(file.fullPath);
            const aTag = document.createElement('a');
            aTag.setAttribute('href', url);
            aTag.setAttribute('target', '_blank');
            aTag.click();
            aTag.remove();
        },
        async mkdir(baseDir: string[]) {
            // TODO: Make not shit
            const newDir = prompt('New folder name');
            if (!newDir) return;
            await API.mkdir(baseDir, newDir);
            queryCache.invalidateQueries({ key: ['tree', ...baseDir] }, true);
            queryCache.invalidateQueries({ key: ['full-tree'] }, true);
            queryCache.invalidateQueries({ key: ['ls', ...baseDir] }, true);
        },
        async delete(paths: string[][]) {
            const canDelete = await dialog.reveal({
                title: () => i18n.t('dialogs.confirm_delete.title'),
                description: () => i18n.t('dialogs.confirm_delete.description'),
                confirmLabel: () => i18n.t('actions.delete'),
                confirmVariant: 'destructive',
                files: paths,
            });
            if (!canDelete.data) return;

            await API.rm(paths);
            for (const path of paths) {
                const parentPath = path.slice(0, -1);
                queryCache.invalidateQueries({ key: ['tree', ...parentPath] }, true);
                queryCache.invalidateQueries({ key: ['ls', ...parentPath] }, true);
            }
            queryCache.invalidateQueries({ key: ['full-tree'] }, true);
        },
    };
});
