<script setup lang="ts">
import FileListView from "@/components/FileListView.vue";
import FileViewer from "@/components/viewers/FileViewer.vue";
import { useDropZone, useFileDialog, useLocalStorage } from "@vueuse/core";
import TreeView from "../components/TreeView.vue";

import { Up2K } from "@/lib/up2k";

const fileListType = useLocalStorage<"list" | "grid">("list-type", "list");

const up2k = new Up2K();

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
    const allFiles = await up2k.collectInput(f);
    console.log(allFiles);
    const fileMap = up2k.gotAllFiles(allFiles);
    console.log(fileMap);
    if (fileMap) {
        await up2k.uploadFiles(fileMap);
        console.log("Done");
    }
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
