<script setup lang="ts">
import { useShortcutGuard } from '@/lib/keyboard';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle
} from '@shadcn/dialog';
import { VisuallyHidden } from 'reka-ui';

const props = defineProps<{ title: string; description: string }>();
const isOpen = defineModel<boolean>('open', { required: true });
const emits = defineEmits<{ closing: []; closed: [] }>();

useShortcutGuard('viewer');
</script>

<template>
    <Dialog v-model:open="isOpen" @update:open="$event || $emit('closing')">
        <DialogContent full-screen :show-close-button="false">
            <VisuallyHidden>
                <DialogHeader @vue:unmounted="$emit('closed')">
                    <DialogTitle>{{ title }}</DialogTitle>
                    <DialogDescription>{{ description }}</DialogDescription>
                </DialogHeader>
            </VisuallyHidden>
            <div class="fixed size-full top-0 left-0" @click="isOpen = false"></div>
            <div
                class="flex flex-col gap-2 p-5 size-full min-h-0 z-1 pointer-events-none *:pointer-events-auto"
            >
                <slot />
            </div>
        </DialogContent>
    </Dialog>
</template>
