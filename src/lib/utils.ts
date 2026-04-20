import { whenever } from '@vueuse/core';
import { useRouteQuery } from '@vueuse/router';
import type { ClassValue } from 'clsx';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { computed, readonly, shallowRef, toRef, type MaybeRefOrGetter, type ShallowRef } from 'vue';
import { useRoute } from 'vue-router';
import { FileClassification } from './classifyExt';

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export function arrayStartsWith(whole: any[], part: any[]) {
    return part.length === 0 || !part.some((v, i) => whole[i] !== v);
}

export interface RouteState {
    dir: string[];
    file: string | null;
    forceEditorType?: FileClassification;
}

export function useRouteState() {
    const route = useRoute();
    const forceEditorType = useRouteQuery('editor', null, {
        transform(v: string | string[] | null | undefined): FileClassification | undefined {
            if (v == null) return undefined;
            const elem = Array.isArray(v) ? v[0] : v;
            const num = parseInt(elem);
            return Number.isNaN(num) ? undefined : num in FileClassification ? num : undefined;
        }
    });

    return computed<RouteState>(() => {
        const path = route.params.path ?? [];
        const dir = (typeof path === 'string' ? [] : path).filter((v) => !!v);
        const file = route.hash.startsWith('#') ? route.hash.slice(1) : null;

        return { dir, file, forceEditorType: forceEditorType.value };
    });
}

export const byteSizeFormatter = Intl.NumberFormat(undefined, {
    notation: 'compact',
    style: 'unit',
    unit: 'byte',
    unitDisplay: 'narrow',
    maximumFractionDigits: 1
});

export function useLastDefined<T>(value: MaybeRefOrGetter<T>): Readonly<ShallowRef<T>> {
    const value$ = toRef(value);
    const definedValue = shallowRef(value$.value);
    whenever(
        () => value$.value != null,
        () => {
            definedValue.value = value$.value;
        }
    );
    return readonly(definedValue);
}
