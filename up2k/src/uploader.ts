import defu from 'defu';
import EventEmitter from 'eventemitter3';
import { basename, dirname } from 'pathe';
import { withoutLeadingSlash } from 'ufo';

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

export interface UploaderEvents {
    progress: [entry: IndexedFile<true>, transferred: number];
    done: [entry: IndexedFile<true>];
}

export class Uploader {
    private options: UploaderOptions;

    private transferredMap = new WeakMap<IndexedFile<true>, number>();
    events = new EventEmitter<UploaderEvents>();

    constructor(options: PartialExcept<UploaderOptions, 'baseUrl'>) {
        this.options = defu(options, { stitchedChunkSizeMiB: 64 });
    }

    async uploadFile(entry: IndexedFile<true>) {
        const handshake = await this.doHandshake(entry);
        if (handshake.type === 'deferred') {
            console.log('Upload got deferred to:', handshake.path);
        } else if (handshake.hash.length > 0) {
            await this.doUpload(entry, handshake);

            // Now do a second handshake to confirm all chunks have been uploaded
            // github.com/9001/copyparty/blob/da6e2ddca96dffc4dbe53bda25d2034428fad3d0/docs/devnotes.md#:~:text=client does another handshake with the hashlist

            const secondHandshake = await this.doHandshake(entry, handshake.name);
            if (secondHandshake.type === 'handshake' && secondHandshake.hash.length > 0) {
                await this.doUpload(entry, secondHandshake);
            }
        } else {
            // No hashes required
            this.events.emit('progress', entry, entry.file.size);
        }
        this.events.emit('done', entry);
    }

    /**
     * 2 main requirements of this function:
     *  - Each section should be sent continuously, e.g. you cant leave out the middle of a file in a request
     *  - Don't send a hash if the server doesn't need it
     */
    private async doUpload(entry: IndexedFile<true>, handshake: HandshakeRes) {
        const stitchSize = Math.ceil(
            entry.file.size / (this.options.stitchedChunkSizeMiB * 1024 * 1024)
        );
        const hashesAlreadyDone = handshake.hash.length - entry.hashes.length;
        const bytesAlreadyDone = entry.chunkSize * hashesAlreadyDone;
        this.events.emit('progress', entry, bytesAlreadyDone);
        this.transferredMap.set(entry, bytesAlreadyDone);

        const missingHashes = new Set(handshake.hash);
        for (let i = 0; i < entry.hashes.length; ) {
            const hash = entry.hashes[i];
            if (!missingHashes.has(hash)) {
                i++;
                continue;
            }
            const startTime = performance.now();

            let hashesToStitch = 0;
            const combinedHashes: string[] = [];
            for (let j = 0; j < Math.min(entry.hashes.length - i, stitchSize); j++) {
                const toStitch = entry.hashes[i + j];
                // If we find a section that would require the request to be broken up, leave it for the next loop
                if (!missingHashes.has(toStitch)) break;

                hashesToStitch++;
                missingHashes.delete(toStitch);
                combinedHashes.push(toStitch.slice(0, 9));
            }

            const hashArg =
                combinedHashes.length > 1 ? `${hash},9,${combinedHashes.slice(1).join('')}` : hash;

            await this.uploadChunk(entry, i, i + hashesToStitch, hashArg, handshake.wark);
            performance.mark(`Upload ${entry.name}`, { startTime });

            i += hashesToStitch;
        }
    }

    private async doHandshake(entry: IndexedFile<true>, nameOverride?: string) {
        const fileName = basename(entry.name);
        const dir = withoutLeadingSlash(dirname(nameOverride ?? entry.name));
        return fetch(new URL(dir, this.options.baseUrl), {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                name: fileName,
                hash: entry.hashes,
                lmod: entry.file.lastModified / 1000,
                size: entry.file.size,
                life: 0,
            } satisfies HandshakeReq),
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
        const end = Math.min(entry.chunkSize * endI, entry.file.size);

        const dir = withoutLeadingSlash(dirname(entry.name));
        await fetch(new URL(dir, this.options.baseUrl), {
            method: 'POST',
            headers: {
                'X-Up2k-Hash': hashes,
                'X-Up2k-Wark': wark,
                'Content-Type': 'application/octet-stream',
            },
            body: entry.file.slice(start, end),
        });
        const transferred = (this.transferredMap.get(entry) ?? 0) + (end - start);
        this.events.emit('progress', entry, transferred);
        this.transferredMap.set(entry, transferred);
    }
}
