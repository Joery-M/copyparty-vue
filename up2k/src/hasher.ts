import EventEmitter from 'eventemitter3';

import type { IndexedFile } from '.';
import type { HashWorkerMessage, HashWorkerPayload, WorkerMessageResponse } from './hash.worker';

interface HasherEvents {
    workerIdle: [];
}

export class Hasher {
    private static workers: HashWorkerWrapper[];
    private static idleWorkers: HashWorkerWrapper[];
    static get activeWorkerCount() {
        return this.workers.length - this.idleWorkers.length;
    }

    events = new EventEmitter<HasherEvents>();

    private wantsWorkerQueue: ((w: HashWorkerWrapper) => void)[] = [];

    constructor(concurrency: number) {
        if (!Hasher.workers) {
            Hasher.workers = new Array(concurrency)
                .fill(undefined)
                .map(() => new HashWorkerWrapper());
            Hasher.idleWorkers = [...Hasher.workers];
        }
    }

    async hashFile(entry: IndexedFile) {
        const chunkSize = entry.chunkSize;
        // If smaller than 1 KiB, don't split into multiple workers
        let sections: [number, number][];
        if (entry.file.size > 1024) {
            sections = splitSections(entry.file.size, Hasher.workers.length, chunkSize);
        } else {
            sections = [[0, entry.file.size]];
        }
        const results = sections.map(async ([start, end]) => {
            const worker = await this.waitForWorkerToBeReady();

            const chunkCount = Math.ceil((end - start) / chunkSize);

            return worker
                .hashFile({
                    file: entry.file,
                    start,
                    end,
                    chunkSize,
                    chunkCount,
                })
                .finally(() => this.workerDone(worker));
        });
        return (await Promise.all(results)).flat();
    }

    private waitForWorkerToBeReady() {
        const idleWorker = Hasher.idleWorkers.shift();
        if (idleWorker) return idleWorker;

        return new Promise<HashWorkerWrapper>((resolve) => {
            this.wantsWorkerQueue.push((w) => resolve(w));
        });
    }

    private workerDone(worker: HashWorkerWrapper) {
        const cb = this.wantsWorkerQueue.shift();
        if (cb) cb(worker);
        else Hasher.idleWorkers.push(worker);
        this.events.emit('workerIdle');
    }
}

/**
 * This function splits a number into a number of sections (up to `chunkCount`) that
 * each have a size that is a multiple of `ofMultiple`
 *
 * The last chunk has the remainder
 *
 * @example
 * splitSections(10, 2, 5) // [ [ 0, 5 ], [ 5, 10 ] ]
 * splitSections(10, 3, 2) // [ [ 0, 4 ], [ 4, 8 ], [ 8, 10 ] ]
 * splitSections(10, 10, 5) // [ [ 0, 5 ], [ 5, 10 ] ]
 */
function splitSections(amount: number, chunkCount: number, ofMultiple: number): [number, number][] {
    const minChunksize = amount / chunkCount;
    const chunkSize = Math.ceil(minChunksize / ofMultiple) * ofMultiple;

    const chunks: [number, number][] = [];
    let cursor = 0;
    while (cursor < amount && chunks.length < chunkCount) {
        const next = Math.min(cursor + chunkSize, amount);
        chunks.push([cursor, next]);
        cursor = next;
    }

    return chunks;
}

export function getChunksize(filesize: number) {
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

class HashWorkerWrapper {
    worker = new Worker(new URL('./hash.worker', import.meta.url), { type: 'module' });
    private lastTid = 0;

    constructor() {
        void this.init();
    }

    init() {
        return new Promise<void>((resolve, reject) => {
            const tid = ++this.lastTid;
            const handler = (ev: MessageEvent<WorkerMessageResponse>) => {
                if (ev.data.tid === tid) {
                    this.worker.removeEventListener('message', handler);
                    if (ev.data.error) {
                        return reject(ev.data.error);
                    } else {
                        return resolve(ev.data.data);
                    }
                }
            };
            this.worker.addEventListener('message', handler);

            this.worker.postMessage({
                type: 'init',
                tid,
            } satisfies HashWorkerMessage);
        });
    }

    hashFile(p: HashWorkerPayload) {
        return new Promise<string[]>((resolve, reject) => {
            const tid = ++this.lastTid;
            const handler = (ev: MessageEvent<WorkerMessageResponse<string[]>>) => {
                if (ev.data.tid === tid) {
                    this.worker.removeEventListener('message', handler);
                    if (ev.data.error) {
                        return reject(ev.data.error);
                    } else {
                        return resolve(ev.data.data);
                    }
                }
            };
            this.worker.addEventListener('message', handler);

            this.worker.postMessage({
                type: 'work',
                tid,
                ...p,
            } satisfies HashWorkerMessage);
        });
    }
}
