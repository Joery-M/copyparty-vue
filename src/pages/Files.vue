<script setup lang="ts">
import FileListView from '@/components/FileListView.vue';
import { useRouteDirectory } from '@/lib/utils';
import TreeView from '../components/TreeView.vue';
import { useLocalStorage } from '@vueuse/core';

const cwd = useRouteDirectory();

const fileListType = useLocalStorage<'list' | 'grid'>('list-type', 'list');
</script>

<template>
    <TreeView :base="[]" dir="Root">
        <div class="my-12 mx-6">
            <FileListView :cwd v-if="fileListType === 'list'" />
        </div>
    </TreeView>
</template>
