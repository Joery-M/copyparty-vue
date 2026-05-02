import { expose } from 'comlink';
// import { createSHA512 } from 'hash-wasm';

export interface HashWorkerPayload {
    file: File;
    start: number;
    end: number;
    chunkSize: number;
    chunkCount: number;
    workerIndex: number;
}

type Hasher = (d: ArrayBuffer) => Promise<Uint8Array>;

let hasher: undefined | Hasher = undefined;
async function getHasher(): Promise<Hasher> {
    if (hasher) return hasher;

    const testData = new Uint8Array([1, 2, 3]);
    try {
        // Try native digest
        const test = await crypto.subtle.digest('SHA-512', testData);
        console.log(test);
        if (new Uint8Array(test)[51] === 69) {
            return (hasher = (d) =>
                crypto.subtle.digest('SHA-512', d).then((d) => new Uint8Array(d)));
        }
    } catch (err) {
        console.error('Could not use native digest', err);
    }
    try {
        // Try hash-wasm
        const { createSHA512 } = await import('hash-wasm');
        const sha512 = await createSHA512();
        const test = sha512.init().update(testData).digest('binary');
        if (test[51] === 69) {
            return (hasher = async (d) => sha512.init().update(d).digest('binary'));
        }
    } catch (err) {
        console.error('Could not use hash-wasm', err);
    }
    // Fall back to js-sha512
    const { sha512 } = await import('js-sha512');
    return (hasher = async (d) => new Uint8Array(sha512.digest(d)));
}

type HashEncoder = (d: Uint8Array) => string;

let hashEncoder: undefined | HashEncoder = undefined;
function getHashEncoder(): HashEncoder {
    if (hashEncoder) return hashEncoder;

    if ('toBase64' in Uint8Array.prototype) {
        return (hashEncoder = (d) =>
            d.slice(0, 33).toBase64({ alphabet: 'base64url', omitPadding: true }));
    } else {
        return (hashEncoder = (d) => buf2b64(d, 33));
    }
}

async function hashFile({
    file,
    start,
    end,
    chunkCount,
    chunkSize,
    workerIndex: workerI
}: HashWorkerPayload): Promise<string[]> {
    if (!(file instanceof File)) throw new Error(`Expected blob, got ${file}`);
    const timeStart = performance.now();

    let offset = start;

    await getHasher();
    getHashEncoder();

    const hashChunks: string[] = new Array(chunkCount);
    let hashI = 0;

    const reader = new FileReaderSync();

    const readChunk = async () => {
        const sliceEnd = Math.min(offset + chunkSize, end);
        const result = reader.readAsArrayBuffer(file.slice(offset, sliceEnd));

        hashChunks[hashI++] = hashEncoder!(await hasher!(result));
        offset = sliceEnd;

        if (offset < end) {
            return readChunk();
        } else {
            performance.measure(`Hash ${file.name}`, {
                start: timeStart,
                detail: `${start}/${end}`
            });
            return hashChunks;
        }
    };
    return await readChunk();
}

expose({ hashFile });

function buf2b64(src: Uint8Array, nbytes = src.byteLength) {
    var base64 = '',
        cset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_',
        byteRem = nbytes % 3,
        mainLen = nbytes - byteRem,
        a,
        b,
        c,
        d,
        chunk;

    for (var i = 0; i < mainLen; i = i + 3) {
        chunk = (src[i] << 16) | (src[i + 1] << 8) | src[i + 2];
        // create 8*3=24bit segment then split into 6bit segments
        a = (chunk & 16515072) >> 18; // (2^6 - 1) << 18
        b = (chunk & 258048) >> 12; // (2^6 - 1) << 12
        c = (chunk & 4032) >> 6; // (2^6 - 1) << 6
        d = chunk & 63; // 2^6 - 1

        // Convert the raw binary segments to the appropriate ASCII encoding
        base64 += cset[a] + cset[b] + cset[c] + cset[d];
    }

    if (byteRem == 1) {
        chunk = src[mainLen];
        a = (chunk & 252) >> 2; // (2^6 - 1) << 2
        b = (chunk & 3) << 4; // 2^2 - 1  (zero 4 LSB)
        base64 += cset[a] + cset[b]; //+ '==';
    } else if (byteRem == 2) {
        chunk = (src[mainLen] << 8) | src[mainLen + 1];
        a = (chunk & 64512) >> 10; // (2^6 - 1) << 10
        b = (chunk & 1008) >> 4; // (2^6 - 1) << 4
        c = (chunk & 15) << 2; // 2^4 - 1  (zero 2 LSB)
        base64 += cset[a] + cset[b] + cset[c]; //+ '=';
    }

    return base64;
}
