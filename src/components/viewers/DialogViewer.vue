<script setup lang="ts">
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
</script>

<template>
    <Dialog v-model:open="isOpen" @update:open="$event || $emit('closing')">
        <DialogContent data-slot="dialog-content" full-screen :show-close-button="false">
            <VisuallyHidden>
                <DialogHeader @vue:unmounted="$emit('closed')">
                    <DialogTitle>{{ title }}</DialogTitle>
                    <DialogDescription>{{ description }}</DialogDescription>
                </DialogHeader>
            </VisuallyHidden>
            <slot />
        </DialogContent>
    </Dialog>
</template>
