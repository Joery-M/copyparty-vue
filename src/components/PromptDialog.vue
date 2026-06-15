<script setup lang="ts">
import { toTypedSchema } from '@vee-validate/valibot';
import * as v from 'valibot';
import { useForm } from 'vee-validate';
import { computed, shallowRef, toValue } from 'vue';
import { useI18n } from 'vue-i18n';

import type { PromptDialogPayload } from '@/stores/usePrompt';

import { useShortcutGuard } from '@/lib/keyboard';
import { usePrompt } from '@/stores/usePrompt';

import { Button } from '@shadcn/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@shadcn/dialog';
import { FormControl, FormField, FormItem } from '@shadcn/form';
import { Input } from '@shadcn/input';

const dialog = usePrompt();

const data = shallowRef<PromptDialogPayload>();

dialog.onReveal((p) => {
    data.value = p;
    form.resetForm({ values: { value: p.initialValue ?? '' } });
});

const i18n = useI18n();
const cancelLabel = computed(() =>
    data.value?.cancelLabel == null ? i18n.t('cancel') : toValue(data.value?.cancelLabel)
);
const submitLabel = computed(() =>
    data.value?.submitLabel == null ? i18n.t('submit') : toValue(data.value?.submitLabel)
);

const validationSchema = toTypedSchema(
    v.object({
        value: v.pipe(v.string(), v.minLength(1)),
    })
);

const form = useForm({
    validationSchema,
});

const onSubmit = form.handleSubmit((values) => dialog.confirm(values.value));

useShortcutGuard('prompt-dialog', () => dialog.isRevealed);
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

            <form @submit="onSubmit" @reset.prevent="dialog.cancel(false)">
                <FormField name="value" v-slot="{ componentField }">
                    <FormItem>
                        <FormControl>
                            <Input type="text" v-bind="componentField" />
                        </FormControl>
                    </FormItem>
                </FormField>
                <DialogFooter>
                    <Button :variant="toValue(data?.cancelVariant) ?? 'outline'" type="reset">
                        {{ cancelLabel }}
                    </Button>
                    <Button :variant="toValue(data?.submitVariant) ?? 'default'" type="submit">
                        {{ submitLabel }}
                    </Button>
                </DialogFooter>
            </form>
        </DialogContent>
    </Dialog>
</template>

<style scoped>
@reference "@/style.css";

form {
    @apply grid gap-3;
}
</style>
