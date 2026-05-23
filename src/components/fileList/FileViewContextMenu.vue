<script setup lang="ts">
import { useListDirQuery } from '@/pages/Files.vue';
import { useHandlers } from '@/stores/useHandlers';
import { useRouteState } from '@/stores/useRouteState';
import { ContextMenuContent, ContextMenuItem } from '@shadcn/context-menu';
import { computed } from 'vue';

const routeState = useRouteState();
const listDirQuery = useListDirQuery();
const handlers = useHandlers();

const canWrite = computed(() => (listDirQuery.data.value?.perms ?? []).includes('write'));
</script>

<template>
    <ContextMenuContent>
        <ContextMenuItem @click="handlers.mkdir(routeState.dir)" v-if="canWrite">
            {{ $t('actions.new_folder') }}
        </ContextMenuItem>
    </ContextMenuContent>
</template>
