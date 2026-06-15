import type { MaybeRefOrGetter } from 'vue';

import { useConfirmDialog } from '@vueuse/core';
import { defineStore } from 'pinia';

import type { ButtonVariants } from '@/components/ui/button';

export interface PromptDialogPayload {
    title: MaybeRefOrGetter<string>;
    description: MaybeRefOrGetter<string>;
    cancelLabel?: MaybeRefOrGetter<string>;
    submitLabel?: MaybeRefOrGetter<string>;
    cancelVariant?: MaybeRefOrGetter<ButtonVariants['variant']>;
    submitVariant?: MaybeRefOrGetter<ButtonVariants['variant']>;
    initialValue?: string;
}

export const usePrompt = defineStore('prompt', () =>
    useConfirmDialog<PromptDialogPayload, string, false>()
);
