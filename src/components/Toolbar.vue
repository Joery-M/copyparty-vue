<script setup lang="ts">
import { sidebarBusKey } from '@/components/TreeView.vue';
import { useAuth } from '@/stores/useAuth';
import { useRouteState } from '@/stores/useRouteState';
import { useUploader } from '@/stores/useUploader';
import { Button } from '@shadcn/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger
} from '@shadcn/dropdown-menu';
import { useEventBus, useFileDialog, useMediaQuery } from '@vueuse/core';
import { ArrowUp, Menu, User2 } from 'lucide-vue-next';

const auth = useAuth();
const routeState = useRouteState();
const uploader = useUploader();

const fileDialog = useFileDialog({ reset: true });

fileDialog.onChange((fileList) => {
    if (!fileList || fileList.length == 0) return;
    uploader.upload(fileList, routeState.dir);
});

const bus = useEventBus(sidebarBusKey);
const isMobile = useMediaQuery('(max-width: 768px)')
</script>

<template>
    <div class="toolbar">
        <Button size="icon-lg" variant="outline" @click="bus.emit(true)" v-if="isMobile">
            <Menu />
        </Button>
        <div class="spacer" />
        <DropdownMenu>
            <DropdownMenuTrigger>
                <Button size="lg">
                    {{ $t('upload') }}
                    <ArrowUp />
                </Button>
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
            <DropdownMenuTrigger>
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
