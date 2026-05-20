import { getApiUrl } from '@/lib/api';
import { useQueryCache } from '@pinia/colada';
import { useConfirmDialog } from '@vueuse/core';
import { defineStore } from 'pinia';
import { withTrailingSlash } from 'ufo';
import { Up2K, type FileMap, type FileOrDirMap } from 'up2k';
import type { MaybeRefOrGetter } from 'vue';
import { useI18n } from 'vue-i18n';

export interface ConfirmDialogPayload {
    title: MaybeRefOrGetter<string>;
    description: MaybeRefOrGetter<string>;
    files?: FileMap | FileOrDirMap;
}

export const useUploader = defineStore('uploader', () => {
    const queryCache = useQueryCache();

    const dialog = useConfirmDialog<ConfirmDialogPayload, boolean, false>();
    const i18n = useI18n();

    return {
        confirmDialog: dialog,
        upload: async (files: DataTransferItemList | FileList | File[] | File, dir: string[]) => {
            const start = performance.now();
            const up2k = new Up2K({
                baseUrl: new URL(withTrailingSlash(getApiUrl(dir)))
            });
            const allFiles = await up2k.collectInput(files);

            const acceptedFiles: [File, string][] = [...allFiles.good];
            if (allFiles.bad.size > 0) {
                const continueAfterBad = await dialog.reveal({
                    title: () => i18n.t('dialogs.bad_files.title'),
                    description: () => i18n.t('dialogs.bad_files.description'),
                    files: allFiles.bad
                });
                if (!continueAfterBad.data) return;
            }
            if (allFiles.junk.size > 0) {
                const uploadJunk = await dialog.reveal({
                    title: () => i18n.t('dialogs.junk_files.title'),
                    description: () => i18n.t('dialogs.junk_files.description'),
                    files: allFiles.junk
                });
                if (uploadJunk.data) acceptedFiles.push(...allFiles.junk);
            }
            if (allFiles.bad.size === 0 && allFiles.junk.size === 0) {
                const canContinue = await dialog.reveal({
                    title: () => i18n.t('dialogs.confirm.title'),
                    description: () => i18n.t('dialogs.confirm.description'),
                    files: allFiles.good
                });
                if (!canContinue.data) return;
            }

            console.log(acceptedFiles);
            await up2k.uploadFiles(new Map(acceptedFiles));
            console.log('Done', performance.now() - start);

            queryCache.invalidateQueries({ key: ['ls', ...dir] });
            queryCache.invalidateQueries({ key: ['tree', ...dir] });
        }
    };
});
