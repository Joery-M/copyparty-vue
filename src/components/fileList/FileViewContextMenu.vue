<script setup lang="ts">
import { Download, ExternalLink, FileVideo, Image, TextInitial } from '@lucide/vue';
import { useFileDialog } from '@vueuse/core';
import { injectMenuContext } from 'reka-ui/internal';
import { computed } from 'vue';

import type { AnyDirectoryEntry } from '@/lib/interop';

import { API } from '@/lib/api';
import { FileClassification } from '@/lib/classifyExt';
import { useShortcutGuard } from '@/lib/keyboard.ts';
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
const cantDoAnything = computed(() => !props.file && !canWrite.value);

const rootContext = injectMenuContext();

useShortcutGuard('context-menu');
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
    <template v-if="file">
        <ContextMenuSeparator />
        <ContextMenuItem @click="handlers.downloadArchive(file, { zip: '' }, 'zip')">
            {{ $t('actions.archive.zip') }}
        </ContextMenuItem>
        <ContextMenuSub>
            <ContextMenuSubTrigger>
                {{ $t('actions.archive_options') }}
            </ContextMenuSubTrigger>
            <ContextMenuSubContent>
                <ContextMenuItem @click="handlers.downloadArchive(file, { tar: '' }, 'tar')">
                    {{ $t('actions.archive.tar') }}
                </ContextMenuItem>
                <ContextMenuItem @click="handlers.downloadArchive(file, { tar: 'gz:1' }, 'tgz')">
                    {{ $t('actions.archive.tgz') }}
                </ContextMenuItem>
                <ContextMenuItem @click="handlers.downloadArchive(file, { tar: 'xz:1' }, 'txz')">
                    {{ $t('actions.archive.txz') }}
                </ContextMenuItem>
                <ContextMenuItem @click="handlers.downloadArchive(file, { tar: 'pax' }, 'pax')">
                    {{ $t('actions.archive.pax') }}
                </ContextMenuItem>
                <ContextMenuItem @click="handlers.downloadArchive(file, { zip: 'dos' }, 'zip')">
                    {{ $t('actions.archive.zip_dos') }}
                </ContextMenuItem>
                <ContextMenuItem @click="handlers.downloadArchive(file, { zip: 'crc' }, 'zip')">
                    {{ $t('actions.archive.zip_crc') }}
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
