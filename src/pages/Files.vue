<script setup lang="ts">
import FileListView from "@/components/FileListView.vue";
import FileViewer from "@/components/viewers/FileViewer.vue";
import { useDropZone, useFileDialog, useLocalStorage } from "@vueuse/core";
import TreeView from "../components/TreeView.vue";

import { Up2K } from "@/lib/up2k";

const fileListType = useLocalStorage<"list" | "grid">("list-type", "list");

useDropZone(document.body, {
    async onDrop(files, event) {
        const f = event.dataTransfer?.items ?? files;
        if (f) {
            doIt(f);
        }
    },
});
const fileDialog = useFileDialog({ reset: true, directory: true });
fileDialog.onChange(async (fileList) => {
    if (fileList && fileList.length > 0) {
        doIt(fileList);
    }
});
async function doIt(f: File[] | DataTransferItemList | FileList) {
    const up2k = new Up2K();
    const start = performance.now();
    const allFiles = await up2k.collectInput(f);
    console.log(allFiles);
    // TODO: Warn about bad, nill and junk files
    await up2k.uploadFiles(allFiles.good);
    console.log("Done", performance.now() - start);
}
</script>

<template>
    <main data-vaul-drawer-wrapper>
        <TreeView :base="[]" dir="Root">
            <div class="my-12 mx-6">
                <FileListView v-if="fileListType === 'list'" />
            </div>
            <button @click="fileDialog.open()">TEst</button>
        </TreeView>
    </main>
    <FileViewer />
</template>
