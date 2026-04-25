import HashWorker from './hash.worker?worker';

type WorkerEvents =
    | { type: 'start'; chunkSize: number; start: number; chunkCount: number }
    | { type: 'done'; start: number; digested: string[] }
    | 1;

const worker = new HashWorker();
export function doHashTest(file: File) {
    console.log(file);

    worker.postMessage(file);
    let cursor = 0;
    let chunkCount = 0;
    let chunkSize = 0;
    let start = 0;
    worker.addEventListener('message', (ev) => {
        const e: WorkerEvents = ev.data;
        if (e === 1) {
            cursor += chunkSize;
            console.log(
                `${cursor / chunkSize}/${chunkCount}`,
                cursor / 1000 / 1000 / ((performance.now() - start) / 1000)
            );
        } else if (e.type === 'start') {
            chunkCount = e.chunkCount;
            start = e.start;
            chunkSize = e.chunkSize;
        } else if (e.type === 'done') {
            console.log(file.size / 1000 / 1000 / ((performance.now() - e.start) / 1000));
            console.log(e.digested);
        }
    });
    worker.addEventListener('messageerror', (ev) => {
        console.error(ev);
    });
    worker.addEventListener('error', (ev) => {
        console.error(ev);
    });
}
