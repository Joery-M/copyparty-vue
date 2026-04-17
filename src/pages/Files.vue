<script setup lang="ts">
import { useRouteDirectory } from '@/lib/utils';
import TreeView from '../components/TreeView.vue';

const route = useRouteDirectory();
</script>

<template>
    <TreeView :base="[]" dir="Root"> Main folder viewer {{ route }} </TreeView>
</template>
