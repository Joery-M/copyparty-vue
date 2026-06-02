import { onKeyStroke, type KeyFilter } from '@vueuse/core';
import {
    hasInjectionContext,
    inject,
    onScopeDispose,
    provide,
    ref,
    toRaw,
    toRef,
    watchEffect,
    type InjectionKey,
    type MaybeRefOrGetter
} from 'vue';

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

export function useShortcut(filter: KeyFilter, handler: (event: KeyboardEvent) => void) {
    if (!hasInjectionContext())
        throw new Error('useShortcut has to be used inside an injection context');
    const guard = inject(CurrentGuard, undefined);
    const predicate = createKeyPredicate(filter);
    if (guard) {
        onKeyStroke((event) => GuardStack.value[0] === guard && predicate(event), handler);
    } else {
        onKeyStroke((event) => GuardStack.value.length === 0 && predicate(event), handler);
    }
}

/**
 * Use this on a component to define a guard
 */
export function useShortcutGuard(name: string, enabled: MaybeRefOrGetter<boolean> = true) {
    if (!hasInjectionContext())
        throw new Error('useShortcutGuard has to be used inside an injection context');

    const isEnabled = toRef(enabled);
    const oldGuards = structuredClone(toRaw(GuardStack.value));
    provide(CurrentGuard, name);
    watchEffect(() =>
        isEnabled.value ? GuardStack.value.unshift(name) : (GuardStack.value = [...oldGuards])
    );
    onScopeDispose(() => (GuardStack.value = [...oldGuards]));
}
