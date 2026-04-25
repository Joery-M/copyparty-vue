import defu from 'defu';
import EventEmitter from 'eventemitter3';
import { shallowReactive, watch } from 'vue';
import type { FileOrDir, FileOrDirMap } from '.';
import HashWorker from './hashWorker?worker';

export interface TaskPoolOptions {
    files: FileOrDirMap;
    hashConcurrency: number;
    uploadConcurrency: number;
}

export interface TaskPoolEvents {
    'task-completed': [];
}

export class Up2KTaskPool {
    events = new EventEmitter<TaskPoolEvents>();

    private options: TaskPoolOptions;

    private queuedFiles = new Set<FileOrDir>();
    private hashPool = shallowReactive(new Map<Worker, FileOrDir>());
    private pendingUploadPool = new Set<FileOrDir>();
    private uploadPool = shallowReactive(new Set<FileOrDir>());

    private workers: Worker[];

    constructor(options: Pick<TaskPoolOptions, 'files'> & Partial<TaskPoolOptions>) {
        this.queuedFiles = new Set(options.files.keys());
        this.options = defu(options, {
            hashConcurrency: Math.min(navigator.hardwareConcurrency || 4, 16),
            uploadConcurrency: 2
        });

        this.workers = new Array(this.options.hashConcurrency)
            .fill(null)
            .map((_, i) => new HashWorker({ name: `hash-worker-${i}` }));
    }

    /**
     * Steps:
     *  - Initialize hasher
     *  - Each cycle of the pool starts by checking for pending upload tasks
     *      - If there are no pending uploads, continue with a hash task
     *          - When a hash task is done, it will add an upload task to the pending upload pool
     */
    async execute() {
        while (
            this.queuedFiles.size > 0 &&
            this.uploadPool.size > 0 &&
            this.hashPool.size > 0 &&
            this.pendingUploadPool.size > 0
        ) {
            if (
                this.pendingUploadPool.size > 0 &&
                this.uploadPool.size < this.options.uploadConcurrency
            ) {
                const file = this.pendingUploadPool.values().next().value;
                if (file) this.doUpload(file);
            }
            if (this.queuedFiles.size > 0 && this.hashPool.size < this.options.hashConcurrency) {
                const file = this.queuedFiles.values().next().value;
                if (file) this.doHash(file);
            }
            await this.waitForChange();
        }
    }

    private async doUpload(file: FileOrDir) {
        this.uploadPool.add(file);
        this.pendingUploadPool.delete(file);
    }
    private async doHash(file: FileOrDir) {
        // Find a worker that is not used
        const worker = this.workers.find((w) => !this.hashPool.has(w));
        if (!worker) {
            console.error('Could not find free worker');
            return;
        }

        this.hashPool.set(worker, file);
        this.queuedFiles.delete(file);

        worker.postMessage(file, [file]);
        worker.addEventListener('message', (ev) => {
            console.log(ev.data);
        });
    }

    /**
     * TODO: Find a better way of doing this.
     *
     * The goal of this function is to asynchronously continue execution once there is work to do.
     */
    private waitForChange() {
        return new Promise<void>((resolve) => {
            watch(
                () => [this.uploadPool.size, this.hashPool.size],
                () => resolve(),
                { once: true }
            );
        });
    }
}
