self.onmessage = async (ev) => {
    const file = ev.data;
    if (!(file instanceof Blob)) throw new Error(`Expected blob, got ${file}`);
    const start = performance.now();

    const chunkSize = get_chunksize(file.size);
    const chunkCount = Math.ceil(file.size / chunkSize);

    const hashChunks: Promise<string>[] = new Array(chunkCount);
    let hashChunkI = 0;

    let cursor = 0;
    while (cursor < file.size) {
        const section = file.slice(cursor, cursor + chunkSize);
        hashChunks[hashChunkI++] = section
            .arrayBuffer()
            .then((d) => crypto.subtle.digest('SHA-512', d))
            .then((a) => buf2b64(new Uint8Array(a), 33));
        cursor += chunkSize;
        self.postMessage({ type: 'progress', cursor, start });
    }

    const digested = await Promise.all(hashChunks);
    self.postMessage({ type: 'done', start, digested });
};

function get_chunksize(filesize: number) {
    var chunkSize = 1024 * 1024,
        stepSize = 512 * 1024;

    while (true) {
        for (var mul = 1; mul <= 2; mul++) {
            var nchunks = Math.ceil(filesize / chunkSize);
            if (nchunks <= 256 || (chunkSize >= 32 * 1024 * 1024 && nchunks <= 4096))
                return chunkSize;

            chunkSize += stepSize;
            stepSize *= mul;
        }
    }
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
