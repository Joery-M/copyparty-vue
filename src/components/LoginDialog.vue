<script setup lang="ts">
import { toTypedSchema } from '@vee-validate/valibot';
import { Lock } from 'lucide-vue-next';
import { VisuallyHidden } from 'reka-ui';
import * as v from 'valibot';
import { useForm } from 'vee-validate';
import { computed, ref, shallowRef } from 'vue';
import { RouterLink } from 'vue-router';

import type { LoginDialogPayload } from '@/stores/useAuth';

import { useShortcutGuard } from '@/lib/keyboard';
import { useAuth } from '@/stores/useAuth';

import { Alert, AlertDescription, AlertTitle } from '@shadcn/alert';
import { Button } from '@shadcn/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@shadcn/dialog';
import { FieldError } from '@shadcn/field';
import { FormControl, FormField, FormItem, FormLabel } from '@shadcn/form';
import { Input } from '@shadcn/input';

const authStore = useAuth();
const loginDialog = authStore.loginDialog;

const data = shallowRef<LoginDialogPayload>();

loginDialog.onReveal((p) => (data.value = p));

const validationSchema = computed(() =>
    toTypedSchema(
        authStore.usernameRequired
            ? v.object({
                  username: v.pipe(v.string(), v.minLength(1)),
                  password: v.pipe(v.string(), v.minLength(1)),
              })
            : v.object({
                  username: v.optional(v.string()),
                  password: v.pipe(v.string(), v.minLength(1)),
              })
    )
);

const form = useForm({
    initialValues: {
        username: undefined,
        password: '',
    },
    validationSchema,
});

const failedLogin = ref(false);

const onSubmit = form.handleSubmit(async (values) => {
    failedLogin.value = false;
    const success = await authStore.login(values.password, values.username);
    failedLogin.value = !success;
    loginDialog.confirm();
});

useShortcutGuard('login-dialog', () => loginDialog.isRevealed && !!data);
</script>

<template>
    <Dialog
        :open="loginDialog.isRevealed && !!data"
        @update:open="(ev) => ev || loginDialog.cancel()"
    >
        <DialogContent
            :show-close-button="data?.canCancel"
            @pointerDownOutside="(ev) => data?.canCancel || ev.preventDefault()"
            @escapeKeyDown="(ev) => data?.canCancel || ev.preventDefault()"
            v-if="data"
        >
            <DialogHeader>
                <DialogTitle> {{ $t('dialogs.login.title') }} </DialogTitle>
                <VisuallyHidden>
                    <DialogDescription> {{ $t('dialogs.login.description') }} </DialogDescription>
                </VisuallyHidden>
            </DialogHeader>
            <Alert v-if="data.path" variant="destructive">
                <Lock />
                <AlertTitle>
                    <template v-if="data.reason === 'not found'">{{
                        $t('error.not_found_error')
                    }}</template>
                    <template v-else>{{ $t('error.access_error') }} </template>:
                    <code>/{{ data.path.join('/') }}</code>
                </AlertTitle>
                <AlertDescription v-if="authStore.readable.length > 0">
                    {{ $t('accessible_volumes', authStore.readable.length) }}
                    <ul>
                        <template v-for="(dir, i) in authStore.readable" :key="i">
                            <RouterLink
                                :to="{
                                    name: 'viewer',
                                    params: { path: dir.concat('') },
                                }"
                                @click="loginDialog.cancel()"
                            >
                                <li>
                                    - <code>/{{ dir.join('/') }}/</code>
                                </li>
                            </RouterLink>
                        </template>
                    </ul>
                </AlertDescription>
            </Alert>

            <form @submit="onSubmit" @reset="data?.canCancel && loginDialog.cancel()">
                <FormField
                    v-if="authStore.usernameRequired"
                    v-slot="{ componentField, errors }"
                    name="username"
                >
                    <FormItem>
                        <FormLabel> {{ $t('dialogs.login.username') }} </FormLabel>
                        <FormControl>
                            <Input
                                :disabled="form.isSubmitting.value"
                                type="text"
                                minlength="1"
                                v-bind="componentField"
                            />
                        </FormControl>
                        <FieldError
                            v-if="errors.length"
                            :errors="[$t('validation.required', [$t('dialogs.login.username')])]"
                        />
                    </FormItem>
                </FormField>
                <FormField v-slot="{ componentField, errors }" name="password">
                    <FormItem>
                        <FormLabel> {{ $t('dialogs.login.password') }} </FormLabel>
                        <FormControl>
                            <Input
                                :disabled="form.isSubmitting.value"
                                type="password"
                                minlength="1"
                                v-bind="componentField"
                            />
                        </FormControl>
                        <FieldError
                            v-if="errors.length"
                            :errors="[$t('validation.required', [$t('dialogs.login.password')])]"
                        />
                    </FormItem>
                </FormField>
                <FieldError v-if="failedLogin" :errors="[$t('error.invalid_login')]" />
                <DialogFooter>
                    <Button v-if="data.canCancel" variant="outline" type="reset">
                        {{ $t('cancel') }}
                    </Button>
                    <Button :disabled="form.isSubmitting.value" type="submit">
                        {{ $t('continue') }}
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
