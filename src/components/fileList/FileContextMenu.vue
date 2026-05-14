<script setup lang="ts">
import { API, getApiUrl } from '@/lib/api';
import { FileClassification } from '@/lib/classifyExt';
import { type AnyDirectoryEntry } from '@/lib/interop';
import { Button } from '@shadcn/button';
import {
    ContextMenuContent,
    ContextMenuItem,
    ContextMenuSeparator,
    ContextMenuSub,
    ContextMenuSubContent,
    ContextMenuSubTrigger
} from '@shadcn/context-menu';
import { Download, ExternalLink, Image } from 'lucide-vue-next';
import { injectContextMenuRootContext } from 'reka-ui';
import type { QueryObject } from 'ufo';
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import Tooltip from '../Tooltip.vue';

const router = useRouter();

const props = defineProps<{ dir: string[]; file: AnyDirectoryEntry }>();

const canView = computed(
    () =>
        props.file.classification === FileClassification.PlainText ||
        props.file.classification === FileClassification.RasterImage ||
        props.file.classification === FileClassification.RichText ||
        props.file.classification === FileClassification.VectorImage ||
        props.file.classification === FileClassification.Video
);
const canDownload = computed(() => props.file.classification !== FileClassification.Directory);

const handlers = {
    view() {
        router.push({
            name: 'viewer',
            params: { path: props.dir.concat('') },
            hash: '#' + props.file.name
        });
    },
    download() {
        const aTag = document.createElement('a');
        aTag.setAttribute('href', getApiUrl(props.file.fullPath, { dl: '' }));
        aTag.setAttribute('download', props.file.name);
        aTag.setAttribute('target', '_blank');
        aTag.click();
        aTag.remove();
    },
    downloadArchive(params: QueryObject, ext: string) {
        if (props.file.classification === FileClassification.Directory) {
            const a = document.createElement('a');
            try {
                a.href = getApiUrl(props.file.fullPath, params);
                a.download = props.file.name + (ext ? `.${ext}` : '');
                a.target = '_blank';
                a.click();
            } finally {
                a.remove();
            }
        } else {
            // Form submit to get data
            // Not checked since I still have CORS errors (womp womp)
            const form = new FormData();
            form.set('act', ext);
            form.set('files', encodeURIComponent(props.file.name));
            fetch(getApiUrl(props.file.fullPath.slice(0, -1).concat(''), params), {
                method: 'POST',
                body: form
            })
                .then(API.extractError)
                .then((res) => res.blob())
                .then((blob) => {
                    const a = document.createElement('a');
                    try {
                        a.href = URL.createObjectURL(blob);
                        a.download = props.file.name;
                        a.target = '_blank';
                        a.click();
                    } finally {
                        a.remove();
                    }
                });
        }
    },
    openNewTab: () => open(getApiUrl(props.file.fullPath), '_blank')
};

const rootContext = injectContextMenuRootContext();
</script>

<template>
    <ContextMenuContent>
        <div class="button-bar">
            <Tooltip :content="$t('actions.download')">
                <Button
                    :disabled="!canDownload"
                    size="icon-lg"
                    variant="ghost"
                    @click="
                        handlers.download();
                        rootContext.onOpenChange(false);
                    "
                >
                    <Download />
                </Button>
            </Tooltip>
            <Tooltip :content="$t('actions.view')">
                <Button
                    :disabled="!canView"
                    size="icon-lg"
                    variant="ghost"
                    @click="
                        handlers.view();
                        rootContext.onOpenChange(false);
                    "
                >
                    <Image />
                </Button>
            </Tooltip>
            <Tooltip :content="$t('actions.open_new_tab')">
                <Button
                    size="icon-lg"
                    variant="ghost"
                    @click="
                        handlers.openNewTab();
                        rootContext.onOpenChange(false);
                    "
                >
                    <ExternalLink />
                </Button>
            </Tooltip>
        </div>

        <!-- Archive options -->
        <ContextMenuSeparator />
        <ContextMenuItem @click="handlers.downloadArchive({ zip: '' }, 'zip')">
            {{ $t('actions.archive.zip') }}
        </ContextMenuItem>
        <ContextMenuSub>
            <ContextMenuSubTrigger>
                {{ $t('actions.archive_options') }}
            </ContextMenuSubTrigger>
            <ContextMenuSubContent>
                <ContextMenuItem @click="handlers.downloadArchive({ tar: '' }, 'tar')">
                    {{ $t('actions.archive.tar') }}
                </ContextMenuItem>
                <ContextMenuItem @click="handlers.downloadArchive({ tar: 'gz:1' }, 'tgz')">
                    {{ $t('actions.archive.tgz') }}
                </ContextMenuItem>
                <ContextMenuItem @click="handlers.downloadArchive({ tar: 'xz:1' }, 'txz')">
                    {{ $t('actions.archive.txz') }}
                </ContextMenuItem>
                <ContextMenuItem @click="handlers.downloadArchive({ tar: 'pax' }, 'pax')">
                    {{ $t('actions.archive.pax') }}
                </ContextMenuItem>
                <ContextMenuItem @click="handlers.downloadArchive({ zip: 'dos' }, 'zip')">
                    {{ $t('actions.archive.zip_dos') }}
                </ContextMenuItem>
                <ContextMenuItem @click="handlers.downloadArchive({ zip: 'crc' }, 'zip')">
                    {{ $t('actions.archive.zip_crc') }}
                </ContextMenuItem>
            </ContextMenuSubContent>
        </ContextMenuSub>
    </ContextMenuContent>
</template>

<style scoped>
@reference "@/style.css";

.button-bar {
    @apply flex justify-around;
}
</style>
