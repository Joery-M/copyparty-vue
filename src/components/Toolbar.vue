<script setup lang="ts">
import { Button } from '@shadcn/button';
import { ArrowUp } from 'lucide-vue-next';
</script>

<template>
    <div id="bar" class="h-10">
        <div class="spacer" />
        <Button>
            Upload
            <ArrowUp />
        </Button>
    </div>
</template>

<style lang="scss" scoped>
#bar {
    display: flex;
    .spacer {
        flex: 1;
    }
}
</style>
