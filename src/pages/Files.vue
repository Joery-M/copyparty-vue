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
            console.log(f);
            const allFiles = await up2k.collectInput(f);
            console.log(allFiles);
            up2k.gotAllFiles(allFiles);
        }
    },
});
const fileDialog = useFileDialog({ reset: true, directory: true });
fileDialog.onChange(async (fileList) => {
    if (fileList && fileList.length > 0) {
        const allFiles = await up2k.collectInput(fileList);
        console.log(allFiles);
        up2k.gotAllFiles(allFiles);

        // const res = await doHashTest(fileList.item(0)!);
        // console.log(res);
    }
});
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
