import { createSHA512 } from 'hash-wasm';

interface Payload {
    file: Blob;
    start: number;
    end: number;
    chunkSize: number;
    chunkCount: number;
    workerI: number;
}

self.onmessage = async (ev) => {
    const { file, start, end, chunkCount, chunkSize, workerI }: Payload = ev.data;
    if (!(file instanceof Blob)) throw new Error(`Expected blob, got ${file}`);
    const timeStart = performance.now();

    self.postMessage({ type: 'start', chunkCount, chunkSize, start: timeStart });

    await new Promise<void>(async (resolve, reject) => {
        const hasher = await createSHA512();
        let offset = start;

        const reader = new FileReader();
        reader.onload = () => {
            if (!(reader.result instanceof ArrayBuffer)) return;

            hasher.init();
            self.postMessage({
                type: 'progress',
                hash: buf2b64(hasher.update(new Uint8Array(reader.result)).digest('binary'), 33)
            });
            if (offset < end) {
                readChunk();
            } else {
                resolve();
            }
        };
        reader.onerror = (e) => {
            console.error(workerI, 'Error in reader');
            reject(e);
        };
        reader.onerror = (e) => {
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

    // let buffer = new Uint8Array(chunkSize * 2);
    // let chunk;
    // while (((chunk = await reader.read()), !chunk.done)) {
    //     buffer.set(chunk.value, offset);
    //     offset += chunk.value.byteLength;
    //     while (offset >= chunkSize) {
    //         hasher.init();
    //         const piece = buffer.slice(0, chunkSize);
    //         hashChunks[hashChunkI++] = buf2b64(hasher.update(piece).digest('binary'), 33);

    //         const newBuf = new Uint8Array(chunkSize * 2);
    //         newBuf.set(buffer.subarray(chunkSize));
    //         buffer = newBuf;
    //         offset -= chunkSize;
    //         self.postMessage(1);
    //     }
    // }
    // if (buffer.byteLength > 0) {
    //     hasher.init();
    //     console.log(buffer.slice(0, offset));
    //     hashChunks[hashChunkI++] = buf2b64(
    //         hasher.update(buffer.slice(0, offset)).digest('binary'),
    //         33
    //     );
    // }

    self.postMessage({ type: 'done' });
};

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
