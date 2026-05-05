<script setup lang="ts">
import { useUploader, type ConfirmDialogPayload } from '@/stores/useUploader';
import { Button } from '@shadcn/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle
} from '@shadcn/dialog';
import { computed, shallowRef } from 'vue';

const dialog = useUploader().confirmDialog;

const data = shallowRef<ConfirmDialogPayload>();
const files = computed(() => {
    const list = Array.from(data.value?.files?.values() ?? []);
    return { top: list.slice(0, 30), rest: Math.max(list.length - 30, 0) };
});

dialog.onReveal((p) => (data.value = p));
</script>

<template>
    <Dialog :open="dialog.isRevealed" @update:open="(ev) => ev || dialog.cancel(false)">
        <DialogContent v-if="data">
            <DialogHeader>
                <DialogTitle>
                    {{ data.title }}
                </DialogTitle>
                <DialogDescription class="max-h-48 overflow-y-auto">
                    {{ data.description }}

                    <ul v-if="data.files">
                        <li v-for="file in files.top" :key="file">
                            {{ file }}
                        </li>
                        <li v-if="files.rest > 0">And {{ files.rest }} more</li>
                    </ul>
                </DialogDescription>
            </DialogHeader>
            <DialogFooter>
                <Button @click="dialog.cancel(false)" variant="outline"> Cancel </Button>
                <Button @click="dialog.confirm(true)" type="submit"> Continue </Button>
            </DialogFooter>
        </DialogContent>
    </Dialog>
</template>
