import { basename, dirname } from 'pathe';
import { resolveURL, withLeadingSlash } from 'ufo';
import type { IndexedFile } from '.';

interface UploaderOptions {
    baseUrl: URL;
}

interface UploadHandshakeResponse {
    name: string;
    /**
     * Absolute path of file
     */
    purl: string;
    size: number;
    /**
     * Modify time in unix epoch seconds
     */
    lmod: number;
    /**
     * idk, code says it has something to do with uploading the next file
     */
    sprs: boolean;
    /**
     * List of hashes the server is missing
     */
    hash: string[];
    dwrk: string;
    wark: string;
}

interface UploadHandshakeRequest {
    name: string;
    /**
     * Absolute path where to put file
     */
    size: number;
    /**
     * Modify time in unix epoch seconds
     */
    lmod: number;
    hash: string[];
    /**
     * File lifetime (unimplemented)
     *
     * 0 = no expiration
     */
    life: number;
}

export class Uploader {
    constructor(private options: UploaderOptions) {}

    async uploadFile(entry: IndexedFile<true>) {
        // Do it twice to check for failed chunks
        const handshake = await this.requestUploadHandshake(entry);
        console.log(handshake);
        await this.handleHandshakeResponse(entry, handshake);
        if (handshake.hash.length > 0) {
            const handshake2 = await this.requestUploadHandshake(entry);
            console.log(handshake2);
            await this.handleHandshakeResponse(entry, handshake2);
        }
    }

    private async handleHandshakeResponse(
        entry: IndexedFile<true>,
        handshake: UploadHandshakeResponse
    ) {
        // If you have a file that has a lot of repeated data
        const sent = new Set<string>();
        for (let i = 0; i < entry.hashes.length; i++) {
            const hash = entry.hashes[i];
            if (!handshake.hash.includes(hash) || sent.has(hash)) continue;
            const startTime = performance.now();
            sent.add(entry.hashes[i]);
            await this.uploadChunk(entry, i, handshake.wark);
            performance.mark(`Upload ${entry.name}`, { startTime });
        }
    }

    private async requestUploadHandshake(entry: IndexedFile<true>) {
        const fileName = basename(entry.name);
        const dir = dirname(withLeadingSlash(entry.name));
        return fetch(resolveURL(this.options.baseUrl.href, dir), {
            method: 'POST',
            headers: {
                // idk
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                name: fileName,
                hash: entry.hashes,
                lmod: entry.file.lastModified / 1000,
                size: entry.file.size,
                life: 0
            } satisfies UploadHandshakeRequest)
        }).then((r) => r.json() as Promise<UploadHandshakeResponse>);
    }

    private async uploadChunk(entry: IndexedFile<true>, index: number, wark: string) {
        const start = entry.chunkSize * index;
        const end = start + entry.chunkSize;

        const dir = dirname(withLeadingSlash(entry.name));
        return fetch(resolveURL(this.options.baseUrl.href, dir), {
            method: 'POST',
            headers: {
                'X-Up2k-Hash': entry.hashes[index],
                'X-Up2k-Wark': wark,
                'Content-Type': 'application/octet-stream'
            },
            body: entry.file.slice(start, end)
        });
    }
}
