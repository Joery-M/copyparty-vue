import { isEqual } from '@ver0/deep-equal';
import type { ClassValue } from 'clsx';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { computed, type ComputedGetter, type ComputedRef, type DebuggerOptions } from 'vue';

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export function arrayStartsWith(whole: any[], part: any[]) {
    return part.length === 0 || !part.some((v, i) => whole[i] !== v);
}

export function pathToParts(path: string) {
    return path.split(/[\/\\]+/g).filter((v) => !!v);
}

export interface FetchProgress {
    transferred: number;
    size: number;
}
export async function fetchWithProgress(
    onProgress: (progress: FetchProgress) => void,
    input: string | URL | Request,
    init?: RequestInit
) {
    const req = await fetch(input, init);
    const size = parseInt(req.headers.get('Content-Length') ?? '0') ?? 0;
    let transferred = 0;
    const reader = req.body!.getReader();
    const stream = new ReadableStream({
        async start(controller) {
            let chunk;
            while (((chunk = await reader.read()), !chunk.done)) {
                transferred += chunk.value.byteLength;
                onProgress({ size, transferred });
                controller.enqueue(chunk.value);
            }
            onProgress({ size, transferred });
            controller.close();
        }
    });
    return new Response(stream, {
        headers: req.headers,
        status: req.status,
        statusText: req.statusText
    });
}

/**
 * Computed that deeply checks if the previous value and current value are equal
 */
export function dedupedComputed<T>(
    getter: ComputedGetter<T>,
    debugOptions?: DebuggerOptions
): ComputedRef<T> {
    return computed((last?: T) => {
        const v = getter(last);
        return isEqual(v, last) ? (last ?? v) : v;
    }, debugOptions);
}
