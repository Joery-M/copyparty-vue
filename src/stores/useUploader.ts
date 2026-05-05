import { getApiUrl } from '@/lib/api';
import { useQueryCache } from '@pinia/colada';
import { useConfirmDialog } from '@vueuse/core';
import { defineStore } from 'pinia';
import { withTrailingSlash } from 'ufo';
import { Up2K, type FileMap, type FileOrDirMap } from 'up2k';

export interface ConfirmDialogPayload {
    title: string;
    description: string;
    files?: FileMap | FileOrDirMap;
}

export const useUploader = defineStore('uploader', () => {
    const queryCache = useQueryCache();

    const dialog = useConfirmDialog<ConfirmDialogPayload, boolean, false>();

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
                    title: 'Problem reading files',
                    description:
                        "There was a problem reading the following files, they won't be uploaded:",
                    files: allFiles.bad
                });
                if (!continueAfterBad.data) return;
            }
            if (allFiles.junk.size > 0) {
                const uploadJunk = await dialog.reveal({
                    title: 'Junk files found',
                    description: 'Are you sure you want to upload these files?',
                    files: allFiles.junk
                });
                if (uploadJunk.data) acceptedFiles.push(...allFiles.junk);
            }
            if (allFiles.bad.size === 0 && allFiles.junk.size === 0) {
                const canContinue = await dialog.reveal({
                    title: 'Confirm files to upload',
                    description: 'Are you sure you want to upload these files?',
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
