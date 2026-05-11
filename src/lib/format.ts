export function formatFileSize(
    b: number,
    unit: 'IEC' | 'SI' = 'IEC',
    useBits = false,
    perSec = false
) {
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
    return `${num} ${sizes[i]}` + perSec ? '/s' : '';
}

export function formatTime(seconds: number) {
    const pad = (v: number) => v.toString().padStart(2, '0');

    const ms = Math.round((seconds % 1) * 100);
    const s = Math.floor(seconds % 60);
    const m = Math.floor((seconds / 60) % 60);
    const h = Math.floor(seconds / 3600);
    if (h > 0) {
        return `${h}:${pad(m)}:${pad(s)}.${pad(ms)}`;
    } else {
        return `${m}:${pad(s)}.${pad(ms)}`;
    }
}
