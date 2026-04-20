<script setup lang="ts">
import { X } from 'lucide-vue-next';
import { VisuallyHidden } from 'reka-ui';
import {
    DrawerContent,
    DrawerDescription,
    DrawerOverlay,
    DrawerPortal,
    DrawerRoot,
    DrawerTitle
} from 'vaul-vue';
import { ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';

defineProps<{ title: string; description: string }>();

const isOpen = ref(true);

const route = useRoute();
const router = useRouter();
function closed() {
    if (isOpen.value) return;
    // Remove the hash
    router.push({ name: route.name, params: route.params });
}
</script>

<template>
    <DrawerRoot should-scale-background v-model:open="isOpen" handle-only @animation-end="closed">
        <DrawerPortal>
            <DrawerOverlay class="fixed bg-black/40 inset-0 backdrop-blur-[1px]" />
            <DrawerContent
                class="bg-background flex flex-col rounded-t-[10px] h-full mt-24 max-h-[90%] fixed bottom-0 left-0 right-0"
            >
                <VisuallyHidden>
                    <DrawerTitle>{{ title }}</DrawerTitle>
                    <DrawerDescription>{{ description }}</DrawerDescription>
                </VisuallyHidden>
                <div class="p-4 rounded-t-[10px] flex-1">
                    <button
                        class="z-10 fixed right-0 top-0 size-13 flex justify-center items-center opacity-70 hover:opacity-100 cursor-pointer"
                        @click="isOpen = false"
                    >
                        <X />
                    </button>
                    <slot />
                </div>
            </DrawerContent>
        </DrawerPortal>
    </DrawerRoot>
</template>
