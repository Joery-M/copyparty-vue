import { createBirpc } from 'birpc';
import EventEmitter from 'eventemitter3';

import type { IndexedFile } from '.';
import type { HashWorkerPayload, OrchestratorFunctions, WorkerFunctions } from './hash.internal';

export interface HasherEvents {
    /** @internal Internal event used to queue new tasks */
    workerIdle: [];
    progress: [file: IndexedFile<false>, bytes: number];
}

export interface HasherOptions {
    concurrency: number;
    signal?: AbortSignal;
}

export class Hasher {
    private static workers: HashWorkerWrapper[];
    private static idleWorkers: HashWorkerWrapper[];
    static get activeWorkerCount() {
        return this.workers.length - this.idleWorkers.length;
    }
    private hashedMap = new Map<string, number>();

    events = new EventEmitter<HasherEvents>();

    private wantsWorkerQueue: ((w: HashWorkerWrapper) => void)[] = [];

    constructor(private options: HasherOptions) {
        if (!Hasher.workers) {
            Hasher.workers = Array.from({ length: options.concurrency }).map(
                () => new HashWorkerWrapper((...args) => this.onHashProgress(...args))
            );
            Hasher.idleWorkers = [...Hasher.workers];
        }
    }

    async hashFile(entry: IndexedFile) {
        // If smaller than 1 KiB, don't split into multiple workers
        let sections: [number, number][];
        if (entry.file.size > 1024) {
            sections = splitSections(entry.file.size, Hasher.workers.length, entry.chunkSize);
        } else {
            sections = [[0, entry.file.size]];
        }
        let hashedBytes = 0;
        const results = sections.map(async ([start, end]) => {
            const worker = await this.waitForWorkerToBeReady();
            if (this.options.signal?.aborted) {
                this.workerDone(worker);
                return [];
            }

            const chunkCount = Math.ceil((end - start) / entry.chunkSize);

            await worker.ready;
            return worker
                .hashFile({
                    file: entry,
                    start,
                    end,
                    chunkCount,
                })
                .then((res) => {
                    hashedBytes += end - start;
                    this.events.emit('progress', entry, hashedBytes);
                    return res;
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

    private onHashProgress(entry: IndexedFile<false>, hashed: number) {
        const bytesDone = (this.hashedMap.get(entry.name) ?? 0) + hashed;
        this.events.emit('progress', entry, bytesDone);
        this.hashedMap.set(entry.name, bytesDone);
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

    private rpc;
    public ready;
    private index = 0;
    private indexMap = new Map<number, IndexedFile<false>>();

    constructor(progress: (entry: IndexedFile<false>, bytes: number) => void) {
        this.rpc = createBirpc<WorkerFunctions, OrchestratorFunctions>(
            {
                progress: (id, bytes) => {
                    const file = this.indexMap.get(id);
                    if (!file) return;
                    progress(file, bytes);
                },
            },
            {
                on: (fn) => (this.worker.onmessage = (e) => fn(e.data)),
                post: (d) => this.worker.postMessage(d),
            }
        );

        this.ready = this.rpc.init();
    }

    hashFile(p: Omit<HashWorkerPayload, 'id'>) {
        const id = this.index++;
        this.indexMap.set(id, p.file);
        return this.rpc.hashFile({ id, ...p });
    }
}
