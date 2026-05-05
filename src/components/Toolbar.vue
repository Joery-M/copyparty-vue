<script setup lang="ts">
import { useRouteState } from '@/stores/useRouteState';
import { useUploader } from '@/stores/useUploader';
import { Button } from '@shadcn/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger
} from '@shadcn/dropdown-menu';
import { useFileDialog } from '@vueuse/core';
import { ArrowUp } from 'lucide-vue-next';

const routeState = useRouteState();
const uploader = useUploader();

const fileDialog = useFileDialog({ reset: true });

fileDialog.onChange((fileList) => {
    if (!fileList || fileList.length == 0) return;
    uploader.upload(fileList, routeState.dir);
});
</script>

<template>
    <div id="bar">
        <div class="spacer" />
        <DropdownMenu>
            <DropdownMenuTrigger>
                <Button size="lg">
                    Upload
                    <ArrowUp />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent class="mx-5">
                <DropdownMenuItem @click="fileDialog.open()"> File </DropdownMenuItem>
                <DropdownMenuItem @click="fileDialog.open({ directory: true })">
                    Folder
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    </div>
</template>

<style lang="css" scoped>
@reference "@/style.css";

#bar {
    @apply flex px-5 h-15 w-full items-center;
    .spacer {
        flex: 1;
    }
}
</style>
