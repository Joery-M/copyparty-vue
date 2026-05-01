import HashWorker from './hash.worker?worker';

export class Hasher {
    private workers;
    private idleWorkers;
    private wantsWorkerQueue: ((w: Worker) => void)[] = [];

    get idleWorkerCount() {
        return this.idleWorkers.length;
    }

    constructor(
        concurrency: number,
        private onWorkerDone: () => void
    ) {
        this.workers = new Array(concurrency).fill(undefined).map(() => new HashWorker());
        this.idleWorkers = [...this.workers];
    }

    async hashFile(file: File) {
        const chunkSize = getChunksize(file.size);
        const sections = splitSections(file.size, this.workers.length, chunkSize * 10); // chunkSize * 10 to make smaller files faster
        const start = performance.now();
        const results = sections.map(async ([start, end], i) => {
            const worker = await this.waitForWorkerToBeReady();
            return runWorker(file, start, end, chunkSize, worker, i).finally(() =>
                this.workerDone(worker)
            );
        });
        const res = (await Promise.all(results)).flat();
        console.log('Speed:', file.size / 1000 / 1000 / ((performance.now() - start) / 1000));
        return res;
    }

    private waitForWorkerToBeReady() {
        const idleWorker = this.idleWorkers.shift();
        if (idleWorker) return idleWorker;

        return new Promise<Worker>((resolve) => {
            this.wantsWorkerQueue.push((w) => resolve(w));
        });
    }

    private workerDone(worker: Worker) {
        const cb = this.wantsWorkerQueue.shift();
        if (cb) cb(worker);
        else this.idleWorkers.push(worker);
        this.onWorkerDone();
    }
}

type WorkerEvents =
    | { type: 'start'; chunkSize: number; start: number; chunkCount: number; workerI: number }
    | { type: 'done' }
    | { type: 'progress'; hash: string };
export async function doHashTest(file: File) {
    const chunkSize = getChunksize(file.size);
    const sections = splitSections(file.size, 32, chunkSize * 10); // chunkSize * 10 to make smaller files faster
    const workers = new Array(sections.length).fill(undefined).map(() => new HashWorker());
    const start = performance.now();
    const results = sections.map(([start, end], i) =>
        runWorker(file, start, end, chunkSize, workers[i], i)
    );
    const res = (await Promise.all(results)).flat();
    console.log('Speed:', file.size / 1000 / 1000 / ((performance.now() - start) / 1000));
    return res;
}

function runWorker(
    file: File,
    start: number,
    end: number,
    chunkSize: number,
    worker: Worker,
    workerI: number
) {
    return new Promise<string[]>((resolve, reject) => {
        const chunkCount = Math.ceil((end - start) / chunkSize);
        const hashChunks = new Array(chunkCount);
        let hashI = 0;

        worker.postMessage({
            file,
            start,
            end,
            chunkSize,
            chunkCount: Math.ceil((end - start) / chunkSize), // Due to minimum size of the splitSections function, this should always be an integer
            workerI
        });
        worker.addEventListener('message', (ev) => {
            const e: WorkerEvents = ev.data;
            if (e.type === 'progress') {
                hashChunks[hashI++] = e.hash;
            } else if (e.type === 'done') {
                resolve(hashChunks);
            }
        });
        worker.addEventListener('messageerror', reject);
        worker.addEventListener('error', reject);
    });
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
