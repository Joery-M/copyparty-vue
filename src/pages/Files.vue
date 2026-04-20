<script setup lang="ts">
import FileListView from '@/components/FileListView.vue';
import { useRouteDirectory } from '@/lib/utils';
import { useLocalStorage } from '@vueuse/core';
import TreeView from '../components/TreeView.vue';

const routeDir = useRouteDirectory();

const fileListType = useLocalStorage<'list' | 'grid'>('list-type', 'list');
</script>

<template>
    <main data-vaul-drawer-wrapper>
        <TreeView :base="[]" dir="Root">
            <div class="my-12 mx-6">
                <FileListView :route-dir v-if="fileListType === 'list'" />
            </div>
        </TreeView>
    </main>
</template>
