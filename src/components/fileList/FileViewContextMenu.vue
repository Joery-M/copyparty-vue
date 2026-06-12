<script setup lang="ts">
import type { QueryObject } from 'ufo';

import { Download, ExternalLink, FileVideo, Image, TextInitial } from '@lucide/vue';
import { useFileDialog } from '@vueuse/core';
import { injectMenuContext } from 'reka-ui/internal';
import { computed } from 'vue';

import type { AnyDirectoryEntry } from '@/lib/interop';

import { API } from '@/lib/api';
import { FileClassification } from '@/lib/classifyExt';
import { useShortcutGuard } from '@/lib/keyboard.ts';
import { useFileSelection } from '@/stores/useFileSelection.ts';
import { useHandlers } from '@/stores/useHandlers';
import { useUploader } from '@/stores/useUploader.ts';

import Tooltip from '../Tooltip.vue';

import {
    ContextMenuItem,
    ContextMenuLabel,
    ContextMenuSeparator,
    ContextMenuSub,
    ContextMenuSubContent,
    ContextMenuSubTrigger,
} from '@shadcn/context-menu';

const handlers = useHandlers();
const uploader = useUploader();
const fileSelection = useFileSelection();

const fileDialog = useFileDialog({ reset: true });

fileDialog.onChange((fileList) => {
    if (!fileList || fileList.length == 0) return;
    uploader.upload(fileList, props.dir);
});

// No file means target is dir
const props = defineProps<{ dir: string[]; file?: AnyDirectoryEntry; perms: API.Permissions[] }>();
const canWrite = computed(() => props.perms.includes('write'));
const canDelete = computed(() => props.perms.includes('delete'));

const canView = computed(
    () =>
        props.file &&
        (props.file.classification === FileClassification.PlainText ||
            props.file.classification === FileClassification.RasterImage ||
            props.file.classification === FileClassification.RichText ||
            props.file.classification === FileClassification.VectorImage ||
            props.file.classification === FileClassification.Video)
);
const canDownload = computed(
    () => props.file && props.file.classification !== FileClassification.Directory
);

// True if there are no options visible
const cantDoAnything = computed(() => !props.file && !canWrite.value && selection.value.size == 0);

const rootContext = injectMenuContext();

useShortcutGuard('context-menu');

const selection = computed(() => fileSelection.selectedFiles);

const downloadArchive = (params: QueryObject) =>
    handlers.downloadArchive(props.dir, Array.from(selection.value), params);
</script>

<template>
    <div class="button-bar" v-if="file">
        <Tooltip :content="$t('actions.download')">
            <ContextMenuItem
                :disabled="!canDownload"
                class="p-2"
                @click="
                    handlers.download(file);
                    rootContext.onOpenChange(false);
                "
            >
                <Download class="size-4" />
            </ContextMenuItem>
        </Tooltip>
        <Tooltip :content="$t('actions.view')">
            <ContextMenuItem
                :disabled="!canView"
                class="p-2"
                @click="
                    handlers.view(dir, file.name);
                    rootContext.onOpenChange(false);
                "
            >
                <FileVideo class="size-4" v-if="file.classification === FileClassification.Video" />
                <TextInitial
                    class="size-4"
                    v-else-if="
                        file.classification === FileClassification.PlainText ||
                        file.classification === FileClassification.RichText
                    "
                />
                <Image class="size-4" v-else />
            </ContextMenuItem>
        </Tooltip>
        <Tooltip :content="$t('actions.open_new_tab')">
            <ContextMenuItem
                class="p-2"
                @click="
                    handlers.openNewTab(file);
                    rootContext.onOpenChange(false);
                "
            >
                <ExternalLink class="size-4" />
            </ContextMenuItem>
        </Tooltip>
    </div>

    <!-- Archive options -->
    <template v-if="selection.size > 0">
        <ContextMenuSeparator v-if="file" />
        <ContextMenuItem @click="downloadArchive({ zip: '' })">
            {{ $t('actions.archive.zip') }}
        </ContextMenuItem>
        <ContextMenuSub>
            <ContextMenuSubTrigger>
                {{ $t('actions.archive_options') }}
            </ContextMenuSubTrigger>
            <ContextMenuSubContent>
                <ContextMenuItem @click="downloadArchive({ tar: '' })">
                    {{ $t('actions.archive.tar', selection.size) }}
                </ContextMenuItem>
                <ContextMenuItem @click="downloadArchive({ tar: 'gz' })">
                    {{ $t('actions.archive.tgz', selection.size) }}
                </ContextMenuItem>
                <ContextMenuItem @click="downloadArchive({ tar: 'xz' })">
                    {{ $t('actions.archive.txz', selection.size) }}
                </ContextMenuItem>
                <ContextMenuItem @click="downloadArchive({ tar: 'pax' })">
                    {{ $t('actions.archive.pax', selection.size) }}
                </ContextMenuItem>
                <ContextMenuItem @click="downloadArchive({ zip: 'dos' })">
                    {{ $t('actions.archive.zip_dos', selection.size) }}
                </ContextMenuItem>
                <ContextMenuItem @click="downloadArchive({ zip: 'crc' })">
                    {{ $t('actions.archive.zip_crc', selection.size) }}
                </ContextMenuItem>
            </ContextMenuSubContent>
        </ContextMenuSub>
    </template>
    <template v-if="canWrite">
        <ContextMenuSeparator v-if="file" />
        <ContextMenuItem @click="handlers.mkdir(dir)">
            {{ $t('actions.new_folder') }}
        </ContextMenuItem>
        <ContextMenuSub>
            <ContextMenuSubTrigger>
                {{ $t('upload') }}
            </ContextMenuSubTrigger>
            <ContextMenuSubContent>
                <ContextMenuItem @click="fileDialog.open()">
                    {{ $t('file') }}
                </ContextMenuItem>
                <ContextMenuItem @click="fileDialog.open({ directory: true })">
                    {{ $t('folder') }}
                </ContextMenuItem>
            </ContextMenuSubContent>
        </ContextMenuSub>
    </template>
    <template v-if="canDelete && file">
        <ContextMenuSeparator />
        <ContextMenuItem @click="handlers.delete([file.fullPath])">
            {{ $t('actions.delete') }}
        </ContextMenuItem>
    </template>
    <ContextMenuLabel v-if="cantDoAnything">
        {{ $t('error.no_options') }}
    </ContextMenuLabel>
</template>

<style scoped>
@reference "@/style.css";

.button-bar {
    @apply flex justify-around;
}
</style>
