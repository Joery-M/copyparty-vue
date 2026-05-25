export enum FileClassification {
    Audio,
    Video,
    RasterImage,
    VectorImage,
    PlainText,
    RichText,
    Directory,
    Unknown
}

const rasterImageTypes = new Set([
    'jpg',
    'jpeg',
    'png',
    'avif',
    'bmp',
    'exif',
    'gif',
    'ico',
    'jp2',
    'jxl',
    'tga',
    'targa',
    'tiff',
    'ep',
    'webp'
]);

const vectorImageTypes = new Set(['svg', 'eps']);

const videoTypes = new Set(['mp4', 'webm', 'ogv', 'mkv', 'mov']);

const richTextTypes = new Set([
    'md',
    'markdown'
    // 'rtf' -- Try support again in the future
]);

const audioTypes = new Set([
    'wav',
    'mp3',
    'aac',
    'ogg',
    'flac',
    'opus',
    'm4a',
    'aiff',
    'aif',
    'ac3',
    'alac',
    'alaw',
    'amr',
    'ape',
    'au',
    'dfpwm',
    'dts',
    'gsm',
    'it',
    'm4b',
    'm4r',
    'mo3',
    'mod',
    'mp2',
    'mpc',
    'mptm',
    'mt2',
    'mulaw',
    'okt',
    'ra',
    's3m',
    'tak',
    'tta',
    'ulaw',
    'wma',
    'wv',
    'xm',
    'xpk'
]);

// Start with the smaller functions and work up
export function classifyExtension(ext: string | null | undefined) {
    if (typeof ext != 'string') return FileClassification.Unknown;
    const e = ext.toLowerCase().trim().replace(/^\.?/, '');

    if (e === '---') return FileClassification.Directory;
    if (e === 'txt') return FileClassification.PlainText;
    if (vectorImageTypes.has(e)) return FileClassification.VectorImage;
    if (videoTypes.has(e)) return FileClassification.Video;
    if (richTextTypes.has(e)) return FileClassification.RichText;
    if (rasterImageTypes.has(e)) return FileClassification.RasterImage;
    if (audioTypes.has(e)) return FileClassification.Audio;
    return FileClassification.Unknown;
}

export function canView(ext: FileClassification) {
    return [
        FileClassification.PlainText,
        FileClassification.RichText,
        FileClassification.RasterImage,
        FileClassification.VectorImage,
        FileClassification.Video
    ].includes(ext);
}
