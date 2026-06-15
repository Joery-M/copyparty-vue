import type { QueryObject } from 'ufo';

import { useQueryCache } from '@pinia/colada';
import { defineStore } from 'pinia';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';
import { toast } from 'vue-sonner';

import type { AnyDirectoryEntry } from '@/lib/interop';

import { API, getApiUrl } from '@/lib/api';
import { FileClassification } from '@/lib/classifyExt';
import { useConfirm } from '@/stores/useConfirm';
import { usePrompt } from '@/stores/usePrompt';

/**
 * Handlers for various actions that might be called from multiple locations
 */
export const useHandlers = defineStore('handlers', () => {
    const router = useRouter();
    const queryCache = useQueryCache();

    const i18n = useI18n();
    const dialog = useConfirm();
    const prompt = usePrompt();

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
        downloadArchive(dir: string[], files: AnyDirectoryEntry[], params: QueryObject) {
            const form = document.createElement('form');
            form.action = getApiUrl(dir, params);
            form.method = 'post';
            form.target = '_blank';
            form.enctype = 'multipart/form-data';

            const act = document.createElement('input');
            act.name = 'act';
            act.value = 'zip';
            const filesInput = document.createElement('input');
            filesInput.name = 'files';
            filesInput.value = files.map((v) => encodeURIComponent(v.name)).join('\n');

            form.appendChild(act);
            form.appendChild(filesInput);

            form.style.display = 'none';
            document.body.appendChild(form);

            form.submit();
            form.remove();
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
            const newDir = await prompt.reveal({
                title: () => i18n.t('dialogs.prompt_new_dir.title'),
                description: () => i18n.t('dialogs.prompt_new_dir.description'),
            });
            if (!newDir.data) return;
            await API.mkdir(baseDir, newDir.data).catch((error) => {
                console.error(error);
                toast.error(() => i18n.t('toast.error'), {
                    description: () => i18n.t('error.folder_create'),
                });
            });
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
        async copyEntriesToClipboard(entries: AnyDirectoryEntry[]) {
            const entryPaths = entries.map((v) => getApiUrl(v.fullPath));

            const list = document.createElement('ul');
            for (const entry of entries) {
                const listItem = document.createElement('li');
                const anchor = document.createElement('a');
                anchor.href = getApiUrl(entry.fullPath);
                anchor.innerText = entry.fullPath.join('/');
                listItem.appendChild(anchor);
                list.appendChild(listItem);
            }
            const meta = document.createElement('meta');
            meta.name = 'copyparty-copied-files';
            meta.content = JSON.stringify({
                origin: location.origin,
                entries: entries.map((v) => v.fullPath),
            });
            const html = meta.outerHTML + list.outerHTML;

            const itemTypes: Record<string, any> = {
                'text/plain': entryPaths.join('\n'),
                'text/html': html,
            };

            // This really sucks but ATM Firefox and Chromium don't support copying multiple clipboard items
            if (entries.length === 1) {
                const entry = entries[0];

                // Fetch to get content type and potentially the body
                let fetched;
                if (entry.classification !== FileClassification.Directory) {
                    fetched = await fetch(getApiUrl(entry.fullPath, { dl: '' })).then((r) => {
                        const type = (r.headers.get('content-type') ?? '').split(';')[0];

                        // Only continue with body if the browser supports copying the file type
                        const supported = ClipboardItem.supports(type);
                        if (!supported) {
                            void r.body?.cancel();
                            return undefined;
                        }

                        const file = r.blob().then(
                            (b) =>
                                new File([b], entry.name, {
                                    type,
                                    lastModified: entry.created?.getTime(),
                                })
                        );

                        return { type, file };
                    });
                }

                if (fetched) itemTypes[fetched.type] = fetched.file;
            }

            const clipItem = new ClipboardItem(itemTypes);
            await navigator.clipboard.write([clipItem]);
        },
    };
});
