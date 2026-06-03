<script setup lang="ts">
import { X } from 'lucide-vue-next';
import { FocusScope, VisuallyHidden } from 'reka-ui';
import {
    DrawerContent,
    DrawerDescription,
    DrawerOverlay,
    DrawerPortal,
    DrawerRoot,
    DrawerTitle,
} from 'vaul-vue';

import { useShortcutGuard } from '@/lib/keyboard';

const props = defineProps<{ title: string; description: string }>();
const isOpen = defineModel<boolean>('open', { required: true });
const emits = defineEmits<{ closing: []; closed: [] }>();

function closed() {
    if (isOpen.value) return;
    emits('closed');
}

useShortcutGuard('viewer');
</script>

<template>
    <DrawerRoot
        should-scale-background
        :set-background-color-on-scale="false"
        v-model:open="isOpen"
        handle-only
        @animation-end="closed"
        @close="$emit('closing')"
    >
        <DrawerPortal>
            <DrawerOverlay class="fixed bg-black/40 inset-0 backdrop-blur-[1px]" />
            <DrawerContent
                class="bg-background flex flex-col rounded-t-[10px] h-full mt-24 max-h-[90%] fixed bottom-0 left-0 right-0 outline-accent outline-2"
            >
                <FocusScope trapped class="overflow-y-auto">
                    <DrawerTitle class="text-lg font-bold w-full text-center my-3">
                        {{ title }}
                    </DrawerTitle>
                    <VisuallyHidden>
                        <DrawerDescription>{{ description }}</DrawerDescription>
                    </VisuallyHidden>
                    <div class="p-4 rounded-t-[10px] focus-visible:outline-none **:z-10">
                        <button
                            class="z-10 fixed right-0 top-0 size-13 flex justify-center items-center opacity-70 hover:opacity-100 cursor-pointer"
                            @click="isOpen = false"
                        >
                            <X />
                        </button>
                        <slot />
                    </div>
                </FocusScope>
            </DrawerContent>
        </DrawerPortal>
    </DrawerRoot>
</template>
