<script setup lang="ts">
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { useRouteState } from '@/stores/useRouteState';
import { useUploader } from '@/stores/useUploader';
import { Card, CardContent, CardHeader, CardTitle } from '@shadcn/card';
import { useFileDialog } from '@vueuse/core';
import { Upload } from 'lucide-vue-next';

defineProps<{ fileOver: boolean }>();

const routeState = useRouteState();
const uploader = useUploader();
const fileDialog = useFileDialog({ reset: true });

fileDialog.onChange((fileList) => {
    if (!fileList || fileList.length == 0) return;
    uploader.upload(fileList, routeState.dir);
});
</script>

<template>
    <Card>
        <CardHeader>
            <CardTitle class="text-center">
                {{ $t('filelist.upload_only_title') }}
            </CardTitle>
        </CardHeader>
        <CardContent>
            <DropdownMenu>
                <DropdownMenuTrigger>
                    <Button id="upload-btn" size="icon" :variant="fileOver ? 'outline' : 'ghost'">
                        <Upload class="size-12" />
                        {{ $t('filelist.upload_only_description') }}
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="center" class="max-w-48">
                    <DropdownMenuItem @click="fileDialog.open()">
                        {{ $t('file') }}
                    </DropdownMenuItem>
                    <DropdownMenuItem @click="fileDialog.open({ directory: true })">
                        {{ $t('folder') }}
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        </CardContent>
    </Card>
</template>

<style lang="css" scoped>
@reference "@/style.css";

[data-slot='card-content'] {
    @apply min-h-48 ring px-0 mx-4 ring-accent rounded-2xl;

    [data-slot='dropdown-menu-trigger'] {
        @apply size-full;

        #upload-btn {
            @apply flex-col gap-2 size-full rounded-xl hover:bg-transparent!;
        }
    }
}
</style>
