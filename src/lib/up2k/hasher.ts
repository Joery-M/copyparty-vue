import { releaseProxy, wrap, type Remote } from 'comlink';
import { computed, shallowReactive } from 'vue';
import type { HashWorkerPayload } from './hash.worker';
import HashWorker from './hash.worker?worker';

type ComlinkHashWorker = Remote<{
    hashFile: (payload: HashWorkerPayload) => string[];
}>;

export class Hasher implements Disposable {
    private workers;
    private idleWorkers;
    private wantsWorkerQueue: ((w: ComlinkHashWorker) => void)[] = [];

    activeWorkerCount = computed(() => {
        return this.workers.length - this.idleWorkers.length;
    });

    constructor(
        concurrency: number,
        private onWorkerDone: () => void
    ) {
        this.workers = shallowReactive(
            new Array(concurrency)
                .fill(undefined)
                .map(() => wrap(new HashWorker()) satisfies ComlinkHashWorker)
        );
        this.idleWorkers = shallowReactive([...this.workers]);
    }

    async hashFile(file: File) {
        const chunkSize = getChunksize(file.size);
        const sections = splitSections(file.size, this.workers.length * 4, chunkSize * 10); // chunkSize * 10 to make smaller files faster
        const results = sections.map(async ([start, end], workerIndex) => {
            const worker = await this.waitForWorkerToBeReady();

            const chunkCount = Math.ceil((end - start) / chunkSize);

            return worker
                .hashFile({
                    file,
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
        const idleWorker = this.idleWorkers.shift();
        if (idleWorker) return idleWorker;

        return new Promise<ComlinkHashWorker>((resolve) => {
            this.wantsWorkerQueue.push((w) => resolve(w));
        });
    }

    private workerDone(worker: ComlinkHashWorker) {
        const cb = this.wantsWorkerQueue.shift();
        if (cb) cb(worker);
        else this.idleWorkers.push(worker);
        this.onWorkerDone();
    }

    [Symbol.dispose]() {
        console.log('Clearing workers');
        this.workers.forEach((w) => w[releaseProxy]());
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

function getChunksize(filesize: number) {
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
