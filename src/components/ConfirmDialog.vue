<script setup lang="ts">
import { useConfirm, type ConfirmDialogPayload } from '@/stores/useConfirm';
import { Button } from '@shadcn/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle
} from '@shadcn/dialog';
import { computed, shallowRef, toValue } from 'vue';
import { useI18n } from 'vue-i18n';

const dialog = useConfirm();

const data = shallowRef<ConfirmDialogPayload>();
const files = computed(() => {
    let list: string[] = [];
    if (data.value?.files == null) {
        list = [];
    } else if (data.value.files instanceof Map) {
        list = Array.from(data.value.files.values());
    } else {
        list = data.value.files.map((p) => ['', ...p].join('/'));
    }
    return { top: list.slice(0, 30), rest: Math.max(list.length - 30, 0) };
});

dialog.onReveal((p) => (data.value = p));

const i18n = useI18n();
const cancelLabel = computed(() =>
    data.value?.cancelLabel == null ? i18n.t('cancel') : toValue(data.value?.cancelLabel)
);
const confirmLabel = computed(() =>
    data.value?.confirmLabel == null ? i18n.t('continue') : toValue(data.value?.confirmLabel)
);
</script>

<template>
    <Dialog :open="dialog.isRevealed" @update:open="(ev) => ev || dialog.cancel(false)">
        <DialogContent v-if="data">
            <DialogHeader>
                <DialogTitle>
                    {{ toValue(data.title) }}
                </DialogTitle>
                <DialogDescription>
                    {{ toValue(data.description) }}
                </DialogDescription>
            </DialogHeader>

            <div v-if="data.files" class="pb-3 max-h-96 overflow-auto w-full text-nowrap">
                <ul>
                    <li v-for="file in files.top" :key="file">
                        - <code>{{ file }}</code>
                    </li>
                    <li v-if="files.rest > 0">
                        <i>{{ $t('and_more', files.rest) }}</i>
                    </li>
                </ul>
            </div>
            <DialogFooter>
                <Button
                    @click="dialog.cancel(false)"
                    :variant="toValue(data?.cancelVariant) ?? 'outline'"
                >
                    {{ cancelLabel }}
                </Button>
                <Button
                    @click="dialog.confirm(true)"
                    type="submit"
                    :variant="toValue(data?.confirmVariant) ?? 'default'"
                >
                    {{ confirmLabel }}
                </Button>
            </DialogFooter>
        </DialogContent>
    </Dialog>
</template>

<style scoped>
@reference '@/style.css';

ul {
    @apply p-[revert] pl-4;
    li {
        padding: revert;
    }
}
</style>
