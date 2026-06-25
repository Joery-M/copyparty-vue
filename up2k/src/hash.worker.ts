import { createBirpc } from 'birpc';

import type { HashWorkerPayload, OrchestratorFunctions, WorkerFunctions } from './hash.internal';

const rpc = createBirpc<OrchestratorFunctions, WorkerFunctions>(
    {
        hashFile: hashFile,
        init: async () => {
            await getHasher();
            getHashEncoder();
        },
    },
    {
        on: (fn) => (self.onmessage = (e) => fn(e.data)),
        post: (data) => self.postMessage(data),
    }
);

type Hasher = (d: ArrayBuffer) => Promise<Uint8Array>;

let hasher: undefined | Hasher = undefined;
async function getHasher(): Promise<Hasher> {
    if (hasher) return hasher;

    const testData = new Uint8Array([1, 2, 3]);
    try {
        // Try native digest
        const test = await crypto.subtle.digest('SHA-512', testData);
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

async function hashFile(payload: HashWorkerPayload): Promise<string[]> {
    const file = payload.file.file;
    const chunkSize = payload.file.chunkSize;

    if (!(file instanceof File)) throw new Error(`Expected blob, got ${file}`);
    const timeStart = performance.now();

    let offset = payload.start;

    await getHasher();
    getHashEncoder();

    const hashChunks: string[] = Array.from({ length: payload.chunkCount });
    let hashI = 0;

    const reader = new FileReaderSync();

    const readChunk = async () => {
        const sliceEnd = Math.min(offset + chunkSize, payload.end);
        const result = reader.readAsArrayBuffer(file.slice(offset, sliceEnd));

        hashChunks[hashI++] = hashEncoder!(await hasher!(result));

        // Don't wait for response
        rpc.progress.asEvent(payload.id, sliceEnd - offset);

        offset = sliceEnd;

        if (offset < payload.end) {
            return readChunk();
        } else {
            performance.measure(`Hash ${file.name}`, {
                start: timeStart,
                detail: `${payload.start}/${payload.end}`,
            });
            return hashChunks;
        }
    };
    return await readChunk();
}

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
