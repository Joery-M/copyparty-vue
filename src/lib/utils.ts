import type { ClassValue } from 'clsx';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export function arrayStartsWith(whole: any[], part: any[]) {
    return part.length === 0 || !part.some((v, i) => whole[i] !== v);
}

export function pathToParts(path: string) {
    return path.split(/[\/\\]+/g).filter((v) => !!v);
}

export function formatFileSize(b: number, unit: 'IEC' | 'SI' = 'IEC', useBits = false) {
    const bytes = useBits ? b * 8 : b;
    const k = unit === 'IEC' ? 1024 : 1000;
    const sizes = useBits
        ? unit === 'IEC'
            ? ['b', 'Kib', 'Mib', 'Gib', 'Tib', 'Pib', 'Eib']
            : ['b', 'kb', 'Mb', 'Gb', 'Tb', 'Pb', 'Eb']
        : unit === 'IEC'
          ? ['B', 'KiB', 'MiB', 'GiB', 'TiB', 'PiB', 'EiB']
          : ['B', 'kB', 'MB', 'GB', 'TB', 'PB', 'EB'];

    // `bytes && Math.log(bytes)` == If bytes is 0, don't try to run Math.log on it and return 0
    const i = Math.floor(bytes && Math.log(bytes) / Math.log(k));

    const num = (bytes / Math.pow(k, i)).toLocaleString(undefined, {
        maximumFractionDigits: 2,
        maximumSignificantDigits: 3,
        useGrouping: true
    });
    return `${num} ${sizes[i]}`;
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
