import { getApiUrl } from '@/lib/api';
import { useQueryCache } from '@pinia/colada';
import { defineStore } from 'pinia';
import { withTrailingSlash } from 'ufo';
import { Up2K } from 'up2k';

export const useUploader = defineStore('uploader', () => {
    const queryCache = useQueryCache();

    return {
        upload: async (files: DataTransferItemList | FileList | File[] | File, dir: string[]) => {
            const start = performance.now();
            const up2k = new Up2K({
                baseUrl: new URL(withTrailingSlash(getApiUrl(dir)))
            });
            const allFiles = await up2k.collectInput(files);
            console.log(allFiles);
            // TODO: Warn about bad, nill and junk files
            await up2k.uploadFiles(allFiles.good);
            console.log('Done', performance.now() - start);

            queryCache.invalidateQueries({ key: ['ls', ...dir] });
            queryCache.invalidateQueries({ key: ['tree', ...dir] });
        }
    };
});
