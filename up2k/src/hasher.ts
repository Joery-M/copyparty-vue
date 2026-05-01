import { wrap, type Remote } from 'comlink';
import EventEmitter from 'eventemitter3';
import { shallowReactive } from 'vue';
import type { IndexedFile } from '.';
import type { HashWorkerPayload } from './hash.worker';
import HashWorker from './hash.worker?worker';

interface HasherEvents {
    workerIdle: [];
}

type ComlinkHashWorker = Remote<{
    hashFile: (payload: HashWorkerPayload) => string[];
}>;

export class Hasher {
    private static workers: ComlinkHashWorker[];
    private static idleWorkers: ComlinkHashWorker[];
    static get activeWorkerCount() {
        return this.workers.length - this.idleWorkers.length;
    }

    events = new EventEmitter<HasherEvents>();

    private wantsWorkerQueue: ((w: ComlinkHashWorker) => void)[] = [];

    constructor(concurrency: number) {
        if (!Hasher.workers) {
            Hasher.workers = shallowReactive(
                new Array(concurrency)
                    .fill(undefined)
                    .map(() => wrap(new HashWorker()) satisfies ComlinkHashWorker)
            );
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
        const results = sections.map(async ([start, end], workerIndex) => {
            const worker = await this.waitForWorkerToBeReady();

            const chunkCount = Math.ceil((end - start) / chunkSize);

            return worker
                .hashFile({
                    file: entry.file,
                    start,
                    end,
                    chunkSize,
                    chunkCount,
                    workerIndex
                })
                .finally(() => this.workerDone(worker));
        });
        return (await Promise.all(results)).flat();
    }

    private waitForWorkerToBeReady() {
        const idleWorker = Hasher.idleWorkers.shift();
        if (idleWorker) return idleWorker;

        return new Promise<ComlinkHashWorker>((resolve) => {
            this.wantsWorkerQueue.push((w) => resolve(w));
        });
    }

    private workerDone(worker: ComlinkHashWorker) {
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
