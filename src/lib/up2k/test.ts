import HashWorker from './hash.worker?worker';

type WorkerEvents =
    | { type: 'progress'; cursor: number; start: number }
    | { type: 'done'; start: number; digested: string[] };

const worker = new HashWorker();
export function doHashTest(file: File) {
    console.log(file);

    worker.postMessage(file);
    worker.addEventListener('message', (ev) => {
        const e: WorkerEvents = ev.data;
        if (e.type === 'done') {
            console.log(file.size / 1000 / 1000 / ((performance.now() - e.start) / 1000));
            console.log(e.digested);
        } else if (e.type === 'progress') {
            console.log(e.cursor / 1000 / 1000 / ((performance.now() - e.start) / 1000));
        }
    });
    worker.addEventListener('messageerror', (ev) => {
        console.error(ev);
    });
    worker.addEventListener('error', (ev) => {
        console.error(ev);
    });
}
