<script setup lang="ts">
import FileListView from '@/components/FileListView.vue';
import FileViewer from '@/components/viewers/FileViewer.vue';
import { useQueryCache } from '@pinia/colada';
import { useDropZone, useFileDialog, useLocalStorage } from '@vueuse/core';
import TreeView from '../components/TreeView.vue';

import Toolbar from '@/components/Toolbar.vue';
import { getApiUrl } from '@/lib/api';
import { useRouteState } from '@/stores/useRouteState';
import { Separator } from '@shadcn/separator';
import { Up2K } from 'up2k';
import { withTrailingSlash } from 'ufo';

const fileListType = useLocalStorage<'list' | 'grid'>('list-type', 'list');

useDropZone(document.body, {
    async onDrop(files, event) {
        const f = event.dataTransfer?.items ?? files;
        if (f) {
            doIt(f);
        }
    }
});
const fileDialog = useFileDialog({ reset: true, directory: true });
fileDialog.onChange(async (fileList) => {
    if (fileList && fileList.length > 0) {
        doIt(fileList);
    }
});
const routeState = useRouteState();
const queryCache = useQueryCache();
const up2k = new Up2K({ baseUrl: new URL(withTrailingSlash(getApiUrl(routeState.dir))) });

async function doIt(f: File[] | DataTransferItemList | FileList) {
    const start = performance.now();
    const allFiles = await up2k.collectInput(f);
    console.log(allFiles);
    // TODO: Warn about bad, nill and junk files
    await up2k.uploadFiles(allFiles.good);
    console.log('Done', performance.now() - start);

    queryCache.invalidateQueries({ key: ['ls', ...routeState.dir] });
    queryCache.invalidateQueries({ key: ['tree', ...routeState.dir] });
}
</script>

<template>
    <Toolbar />

    <div class="flex flex-col h-svh">
        <Separator class="my-4" />
        <TreeView class="inline-flex flex-1">
            <div class="my-12 mx-6">
                <FileListView v-if="fileListType === 'list'" />
            </div>
            <button @click="fileDialog.open()">TEst</button>
        </TreeView>
    </div>
    <FileViewer />
</template>
