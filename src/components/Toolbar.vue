<script setup lang="ts">
import { ArrowUp, Menu, User2 } from '@lucide/vue';
import { useEventBus, useFileDialog, useMediaQuery } from '@vueuse/core';
import { computed } from 'vue';

import Tooltip from '@/components/Tooltip.vue';
import { sidebarBusKey } from '@/components/TreeView.vue';
import { formatFileSize } from '@/lib/format';
import { useListDirQuery } from '@/pages/Files.vue';
import { useAuth } from '@/stores/useAuth';
import { useDiskUsage } from '@/stores/useDiskUsage';
import { useRouteState } from '@/stores/useRouteState';
import { useUploader } from '@/stores/useUploader';

import { Button } from '@shadcn/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@shadcn/dropdown-menu';
import { Progress } from '@shadcn/progress';

const auth = useAuth();
const routeState = useRouteState();
const uploader = useUploader();
const listDirQuery = useListDirQuery();
const diskUsage = useDiskUsage();

const fileDialog = useFileDialog({ reset: true });

fileDialog.onChange((fileList) => {
    if (!fileList || fileList.length == 0) return;
    uploader.upload(fileList, routeState.dir);
});

const bus = useEventBus(sidebarBusKey);
const isMobile = useMediaQuery('(max-width: 768px)');

const canUpload = computed(
    () => !!listDirQuery.data.value && listDirQuery.data.value.perms.includes('write')
);
</script>

<template>
    <div class="toolbar">
        <Button size="icon-lg" variant="outline" @click="bus.emit(true)" v-if="isMobile">
            <Menu />
        </Button>
        <div v-if="diskUsage.free && diskUsage.total">
            <p class="text-xs text-foreground/80 mb-1">
                {{
                    $t('free_of', [formatFileSize(diskUsage.free), formatFileSize(diskUsage.total)])
                }}
            </p>
            <Progress
                :model-value="100 - (diskUsage.free / diskUsage.total) * 100"
                class="*:transition-none"
            />
        </div>
        <div class="spacer" />

        <Tooltip v-if="!canUpload" :content="$t('error.cant_upload')">
            <Button variant="accent" disabled size="lg" class="disabled:pointer-events-auto">
                {{ $t('upload') }}
                <ArrowUp />
            </Button>
        </Tooltip>
        <DropdownMenu v-else>
            <DropdownMenuTrigger size="lg" :as="Button">
                {{ $t('upload') }}
                <ArrowUp />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                <DropdownMenuItem @click="fileDialog.open()">
                    {{ $t('file') }}
                </DropdownMenuItem>
                <DropdownMenuItem @click="fileDialog.open({ directory: true })">
                    {{ $t('folder') }}
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>

        <!-- If not logged in, make this button only show the login dialog -->
        <Button
            v-if="!auth.username"
            size="lg"
            variant="outline"
            @click="auth.loginDialog.reveal({ canCancel: true })"
        >
            {{ $t('user.login') }}
            <User2 />
        </Button>
        <DropdownMenu v-else>
            <DropdownMenuTrigger as-child>
                <Button size="lg" variant="outline">
                    {{ auth.username ?? $t('user.login') }}
                    <User2 />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                <DropdownMenuItem @click="auth.loginDialog.reveal({ canCancel: true })">
                    {{ $t('user.switch') }}
                </DropdownMenuItem>
                <DropdownMenuItem @click="auth.logout()">
                    {{ $t('user.logout') }}
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    </div>
</template>

<style scoped>
@reference "@/style.css";

.toolbar {
    @apply flex px-5 h-15 w-full items-center gap-2.5;
    .spacer {
        @apply flex-1;
    }
}
</style>
