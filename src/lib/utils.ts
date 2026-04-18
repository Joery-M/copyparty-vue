import type { ClassValue } from 'clsx';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { computed } from 'vue';
import { useRoute } from 'vue-router';

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export function arrayStartsWith(whole: any[], part: any[]) {
    return part.length === 0 || !part.some((v, i) => whole[i] !== v);
}

export function useRouteDirectory() {
    const route = useRoute();
    return computed(() => {
        const path = route.params.path ?? [];
        const res = typeof path === 'string' ? [] : path;
        return res.filter((v) => !!v);
    });
}

export const byteSizeFormatter = Intl.NumberFormat(undefined, {
    notation: 'compact',
    style: 'unit',
    unit: 'byte',
    unitDisplay: 'narrow',
    maximumFractionDigits: 1
});
