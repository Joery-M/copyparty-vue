import { expose } from 'comlink';
import { createSHA512 } from 'hash-wasm';

export interface HashWorkerPayload {
    file: File;
    start: number;
    end: number;
    chunkSize: number;
    chunkCount: number;
    workerIndex: number;
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

    const hasher = await createSHA512();
    let offset = start;

    return new Promise(async (resolve, reject) => {
        const hashChunks: string[] = new Array(chunkCount);
        let hashI = 0;

        const reader = new FileReader();
        reader.onload = () => {
            if (!(reader.result instanceof ArrayBuffer)) return;

            hasher.init();
            const hash = buf2b64(hasher.update(new Uint8Array(reader.result)).digest('binary'), 33);
            hashChunks[hashI++] = hash;

            if (offset < end) {
                readChunk();
            } else {
                // Done
                resolve(hashChunks);
                performance.measure(`Hash ${file.name}`, {
                    start: timeStart,
                    detail: `${start}/${end}`
                });
            }
        };
        reader.onabort = reader.onerror = (e) => {
            console.error(workerI, 'Error in reader');
            reject(e);
        };

        const readChunk = () => {
            const sliceEnd = Math.min(offset + chunkSize, end);
            reader.readAsArrayBuffer(file.slice(offset, sliceEnd));
            offset = sliceEnd;
        };
        readChunk();
    });
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
