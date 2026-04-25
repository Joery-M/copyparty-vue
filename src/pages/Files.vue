<script setup lang="ts">
import FileListView from "@/components/FileListView.vue";
import FileViewer from "@/components/viewers/FileViewer.vue";
import { doHashTest } from "@/lib/up2k/test";
import { useFileDialog, useLocalStorage } from "@vueuse/core";
import TreeView from "../components/TreeView.vue";

const fileListType = useLocalStorage<"list" | "grid">("list-type", "list");

const fileDialog = useFileDialog();
fileDialog.onChange((fileList) => {
    if (fileList && fileList.length > 0) {
        doHashTest(fileList.item(0)!);
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
