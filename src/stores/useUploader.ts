import { useQueryCache } from '@pinia/colada';
import { defineStore } from 'pinia';
import { withTrailingSlash } from 'ufo';
import { Up2K } from 'up2k';
import { markRaw } from 'vue';
import { useI18n } from 'vue-i18n';
import { toast } from 'vue-sonner';

import UploadStatus from '@/components/UploadStatus.vue';
import { getApiUrl } from '@/lib/api';
import { useConfirm } from '@/stores/useConfirm';

export const useUploader = defineStore('uploader', () => {
    const queryCache = useQueryCache();

    const i18n = useI18n();
    const dialog = useConfirm();

    return {
        upload: async (files: DataTransferItemList | FileList | File[] | File, dir: string[]) => {
            const start = performance.now();
            const baseUrl = new URL(withTrailingSlash(getApiUrl(dir)));
            const up2k = new Up2K({ baseUrl, hashConcurrency: 1 });
            const allFiles = await up2k.collectInput(files);
            const totalFiles =
                allFiles.bad.size + allFiles.good.size + allFiles.junk.size + allFiles.nil.size;
            if (totalFiles == 0) return;

            const acceptedFiles: [File, string][] = [...allFiles.good];
            if (allFiles.bad.size > 0) {
                const continueAfterBad = await dialog.reveal({
                    title: () => i18n.t('dialogs.bad_files.title'),
                    description: () => i18n.t('dialogs.bad_files.description'),
                    files: allFiles.bad,
                });
                if (!continueAfterBad.data) return;
            }
            if (allFiles.junk.size > 0) {
                const uploadJunk = await dialog.reveal({
                    title: () => i18n.t('dialogs.junk_files.title'),
                    description: () => i18n.t('dialogs.junk_files.description'),
                    files: allFiles.junk,
                });
                if (uploadJunk.data) acceptedFiles.push(...allFiles.junk);
            }
            if (allFiles.bad.size === 0 && allFiles.junk.size === 0) {
                const canContinue = await dialog.reveal({
                    title: () => i18n.t('dialogs.confirm_upload.title'),
                    description: () => i18n.t('dialogs.confirm_upload.description'),
                    files: allFiles.good,
                });
                if (!canContinue.data) return;
            }

            const fileMap = new Map(acceptedFiles);
            const pool = up2k.createTaskPool(fileMap);

            toast(() => i18n.t('upload'), {
                description: markRaw(UploadStatus),
                componentProps: {
                    pool,
                    files: acceptedFiles.map(([f]) => f),
                },
                classes: {
                    content: 'w-full',
                },
                // This is real
                duration: Infinity,
            });
            await pool.execute();
            console.log('Done', performance.now() - start);

            queryCache.invalidateQueries({ key: ['ls', ...dir] });
            queryCache.invalidateQueries({ key: ['tree', ...dir] });
        },
    };
});
