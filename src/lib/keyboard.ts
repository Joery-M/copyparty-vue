import type { KeyFilter, OnKeyStrokeOptions } from '@vueuse/core';
import type { InjectionKey, MaybeRefOrGetter } from 'vue';

import { onKeyStroke } from '@vueuse/core';
import {
    computed,
    hasInjectionContext,
    inject,
    onScopeDispose,
    provide,
    shallowReactive,
    shallowRef,
    toRef,
    watchEffect,
} from 'vue';

const AllGuards = /* @__PURE__ */ shallowReactive(new Set<string>());
const GuardStack = shallowRef<string[]>([]);
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

export function isCurrentGuardActive() {
    if (!hasInjectionContext())
        throw new Error('isCurrentGuardActive has to be used inside an injection context');
    const guard = inject(CurrentGuard, undefined);
    if (guard) {
        return computed(() => GuardStack.value[0] === guard);
    } else {
        return computed(() => GuardStack.value.length === 0);
    }
}

/**
 * Define a guard so only instances of `useShortcut` inside this guard will be
 * enabled, any `useShortcut` calls outside this guard will be ignored
 */
export function useShortcutGuard(name: string, enabled: MaybeRefOrGetter<boolean> = true) {
    if (!hasInjectionContext())
        throw new Error('useShortcutGuard has to be used inside an injection context');
    if (__DEV__ && AllGuards.has(name)) {
        console.warn('2 shortcut guards are using the same name:', name);
    }

    /* @__PURE__ */ AllGuards.add(name);
    const isEnabled = toRef(enabled);
    provide(CurrentGuard, name);
    let isOnStack = false;
    watchEffect(() => {
        if (isEnabled.value) {
            if (!isOnStack) {
                GuardStack.value = [name, ...GuardStack.value];
                isOnStack = true;
            }
        } else if (isOnStack) {
            GuardStack.value = GuardStack.value.filter((v) => name !== v);
            isOnStack = false;
        }
    });
    onScopeDispose(() => {
        /* @__PURE__ */ AllGuards.delete(name);
        if (isOnStack) {
            GuardStack.value = GuardStack.value.filter((v) => name !== v);
            isOnStack = false;
        }
    });
}
