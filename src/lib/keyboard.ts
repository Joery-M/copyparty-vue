import type { KeyFilter, OnKeyStrokeOptions } from '@vueuse/core';
import type { InjectionKey, MaybeRefOrGetter } from 'vue';

import { onKeyStroke } from '@vueuse/core';
import { hasInjectionContext, inject, onScopeDispose, provide, ref, toRef, watchEffect } from 'vue';

const GuardStack = ref<string[]>([]);
const CurrentGuard = Symbol('CurrentGuard') as InjectionKey<string>;

// Taken from @vueuse/core/onKeyStroke
function createKeyPredicate(keyFilter: KeyFilter) {
    if (typeof keyFilter === 'function') return keyFilter;
    else if (typeof keyFilter === 'string')
        return (event: KeyboardEvent) => event.key === keyFilter;
    else if (Array.isArray(keyFilter))
        return (event: KeyboardEvent) => keyFilter.includes(event.key);
    return () => true;
}

export function useShortcut(
    filter: KeyFilter,
    // Vueuse checks number of arguments to see if options exists
    ...args: [handler: (event: KeyboardEvent) => void, options?: OnKeyStrokeOptions]
) {
    if (!hasInjectionContext())
        throw new Error('useShortcut has to be used inside an injection context');
    const guard = inject(CurrentGuard, undefined);
    const predicate = createKeyPredicate(filter);
    if (guard) {
        onKeyStroke((event) => GuardStack.value[0] === guard && predicate(event), ...args);
    } else {
        onKeyStroke((event) => GuardStack.value.length === 0 && predicate(event), ...args);
    }
}

/**
 * Define a guard so only instances of `useShortcut` inside this guard will be
 * enabled, any `useShortcut` calls outside this guard will be ignored
 */
export function useShortcutGuard(name: string, enabled: MaybeRefOrGetter<boolean> = true) {
    if (!hasInjectionContext())
        throw new Error('useShortcutGuard has to be used inside an injection context');

    const isEnabled = toRef(enabled);
    provide(CurrentGuard, name);
    watchEffect(() => {
        if (isEnabled.value) {
            GuardStack.value.unshift(name);
        } else if (GuardStack.value.at(-1) === name) {
            GuardStack.value = GuardStack.value.slice(0, -1);
        }
    });
    onScopeDispose(() => {
        if (isEnabled.value && GuardStack.value.at(-1) === name) {
            GuardStack.value = GuardStack.value.slice(0, -1);
        }
    });
}
