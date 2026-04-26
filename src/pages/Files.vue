<script setup lang="ts">
import FileListView from "@/components/FileListView.vue";
import FileViewer from "@/components/viewers/FileViewer.vue";
import { useLocalStorage } from "@vueuse/core";
import TreeView from "../components/TreeView.vue";

const fileListType = useLocalStorage<"list" | "grid">("list-type", "list");
</script>

<template>
    <main data-vaul-drawer-wrapper>
        <TreeView :base="[]" dir="Root">
            <div class="my-12 mx-6">
                <FileListView v-if="fileListType === 'list'" />
            </div>
        </TreeView>
    </main>
    <FileViewer />
</template>
