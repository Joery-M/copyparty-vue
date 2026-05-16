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

const extColorCache = new Map<string, number>();
export async function seededRandom(source: string) {
    if (extColorCache.has(source)) return extColorCache.get(source)!;

    const hash = await crypto.subtle.digest('sha-256', new TextEncoder().encode(source));
    const v = new Uint8Array(hash)[0] / 256;
    extColorCache.set(source, v);
    return v;
}

export function HSVtoRGB(h: number, s: number, v: number) {
    let r, g, b, i, f, p, q, t;
    i = Math.floor(h * 6);
    f = h * 6 - i;
    p = v * (1 - s);
    q = v * (1 - f * s);
    t = v * (1 - (1 - f) * s);
    switch (i % 6) {
        case 0:
            ((r = v), (g = t), (b = p));
            break;
        case 1:
            ((r = q), (g = v), (b = p));
            break;
        case 2:
            ((r = p), (g = v), (b = t));
            break;
        case 3:
            ((r = p), (g = q), (b = v));
            break;
        case 4:
            ((r = t), (g = p), (b = v));
            break;
        default:
            ((r = v), (g = p), (b = q));
            break;
    }
    return [r * 255, g * 255, b * 255] as [number, number, number];
}
