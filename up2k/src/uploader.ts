import defu from 'defu';
import { basename, dirname } from 'pathe';
import { resolveURL, withLeadingSlash } from 'ufo';
import type { IndexedFile } from '.';
import type { PartialExcept } from './utils';

interface UploaderOptions {
    baseUrl: URL;
    /**
     * Size of chunks you want to send to the server.
     *
     * @example The hasher might hash files in chunks of 64KiB, but during
     * uploads those hashes can be stitched together to create groups of 16MiB
     *
     * @default 64
     */
    stitchedChunkSizeMiB: number;
}

type HandshakeAnyRes = HandshakeRes | HandshakeResDeferred;

interface HandshakeRes {
    type: 'handshake';
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
interface HandshakeResDeferred {
    type: 'deferred';
    /**
     * The path where the upload got deferred to
     */
    path: string;
}

interface HandshakeReq {
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
    private options: UploaderOptions;
    constructor(options: PartialExcept<UploaderOptions, 'baseUrl'>) {
        this.options = defu(options, { stitchedChunkSizeMiB: 64 });
    }

    async uploadFile(entry: IndexedFile<true>) {
        const handshake = await this.doHandshake(entry);
        if (handshake.type === 'deferred') {
            console.log('Upload got deferred to:', handshake.path);
        } else if (handshake.hash.length > 0) {
            await this.doUpload(entry, handshake);
        }
    }

    private async doUpload(entry: IndexedFile<true>, handshake: HandshakeRes) {
        const stitchSize = Math.ceil(
            entry.file.size / (this.options.stitchedChunkSizeMiB * 1024 * 1024)
        );

        const missingHashes = new Set(handshake.hash);
        for (let i = 0; i < entry.hashes.length; ) {
            const hash = entry.hashes[i];
            if (!missingHashes.has(hash)) {
                i++;
                continue;
            }
            const startTime = performance.now();

            const hashesToStitch = Math.max(Math.min(entry.hashes.length - i, stitchSize), 1);
            const combinedHashes = entry.hashes
                .slice(i, i + hashesToStitch)
                .map((stitch) => (missingHashes.delete(stitch), stitch.slice(0, 9)));

            const hashArg =
                combinedHashes.length > 1 ? `${hash},9,${combinedHashes.slice(1).join('')}` : hash;

            await this.uploadChunk(entry, i, i + hashesToStitch, hashArg, handshake.wark);
            performance.mark(`Upload ${entry.name}`, { startTime });

            i += hashesToStitch;
        }
    }

    private async doHandshake(entry: IndexedFile<true>) {
        const fileName = basename(entry.name);
        const dir = dirname(withLeadingSlash(entry.name));
        return fetch(resolveURL(this.options.baseUrl.href, dir), {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                name: fileName,
                hash: entry.hashes,
                lmod: entry.file.lastModified / 1000,
                size: entry.file.size,
                life: 0
            } satisfies HandshakeReq)
        }).then(async (res): Promise<HandshakeAnyRes> => {
            if (res.status === 422) {
                const content = (await res.text()).split('\n');
                if (content[0].startsWith('<pre>partial upload exists at a different location;')) {
                    return { type: 'deferred', path: content[1] };
                } else {
                    throw new Error('Unknown handshake response', { cause: res });
                }
            } else {
                return res.json().then((r) => ({ type: 'handshake', ...r }));
            }
        });
    }

    private async uploadChunk(
        entry: IndexedFile<true>,
        startI: number,
        endI: number,
        hashes: string,
        wark: string
    ) {
        const start = entry.chunkSize * startI;
        const end = entry.chunkSize * endI;

        const dir = dirname(withLeadingSlash(entry.name));
        return fetch(resolveURL(this.options.baseUrl.href, dir), {
            method: 'POST',
            headers: {
                'X-Up2k-Hash': hashes,
                'X-Up2k-Wark': wark,
                'Content-Type': 'application/octet-stream'
            },
            body: entry.file.slice(start, end)
        });
    }
}
