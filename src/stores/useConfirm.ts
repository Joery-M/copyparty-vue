import { useConfirmDialog } from '@vueuse/core';
import { defineStore } from 'pinia';
import type { FileMap, FileOrDirMap } from 'up2k';
import type { MaybeRefOrGetter } from 'vue';

import type { ButtonVariants } from '@/components/ui/button';

export interface ConfirmDialogPayload {
    title: MaybeRefOrGetter<string>;
    description: MaybeRefOrGetter<string>;
    cancelLabel?: MaybeRefOrGetter<string>;
    confirmLabel?: MaybeRefOrGetter<string>;
    cancelVariant?: MaybeRefOrGetter<ButtonVariants['variant']>;
    confirmVariant?: MaybeRefOrGetter<ButtonVariants['variant']>;
    files?: FileMap | FileOrDirMap | string[][];
}

export const useConfirm = defineStore('confirm', () =>
    useConfirmDialog<ConfirmDialogPayload, boolean, false>()
);
