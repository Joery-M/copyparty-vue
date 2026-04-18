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

export interface RouteDirectory {
    dir: string[];
    file: string | null;
}

export function useRouteDirectory() {
    const route = useRoute();
    return computed<RouteDirectory>(() => {
        const path = route.params.path ?? [];
        const pathArr = (typeof path === 'string' ? [] : path).filter((v) => !!v);
        const file: string | null = route.hash.startsWith('#') ? route.hash.slice(1) : null;
        return { dir: pathArr, file };
    });
}

export const byteSizeFormatter = Intl.NumberFormat(undefined, {
    notation: 'compact',
    style: 'unit',
    unit: 'byte',
    unitDisplay: 'narrow',
    maximumFractionDigits: 1
});
