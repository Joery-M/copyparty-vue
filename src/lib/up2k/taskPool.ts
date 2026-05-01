import EventEmitter from 'eventemitter3';
import type { IndexedFile } from '.';
import { Hasher } from './hasher';

export interface TaskPoolOptions {
    files: IndexedFile[];
    hashConcurrency: number;
    uploadConcurrency: number;
}

export interface TaskPoolEvents {
    'task-completed': [];
}

export class Up2KTaskPool {
    events = new EventEmitter<TaskPoolEvents>();

    private queuedFiles;
    private hashPool = new Set<IndexedFile>();
    private pendingUploadPool = new Set<IndexedFile<true>>();
    private uploadPool = new Set<IndexedFile<true>>();
    private donePool = new Set<IndexedFile<true>>();
    private failedPool = new Set<IndexedFile>();

    constructor(private options: TaskPoolOptions) {
        let largeFirst = true;
        // Allow small files to be processed in between large files
        // May remove in the future, see how it pans out first
        const sortedFiles = Array.from(options.files).sort(
            (a, b) => (
                (largeFirst = !largeFirst),
                largeFirst ? a.chunkSize - b.chunkSize : b.chunkSize - a.chunkSize
            )
        );
        this.queuedFiles = new Set(sortedFiles);
    }

    /**
     * Steps:
     *  - Initialize hasher
     *  - Each cycle of the pool starts by checking for pending upload tasks
     *      - If there are no pending uploads, continue with a hash task
     *          - When a hash task is done, it will add an upload task to the pending upload pool
     */
    async execute() {
        const hasher = new Hasher(this.options.hashConcurrency);
        hasher.events.on('workerIdle', () => this.events.emit('task-completed'));

        const activeTasks = new Set<Promise<void>>();
        while (
            this.queuedFiles.size > 0 ||
            this.hashPool.size > 0 ||
            this.pendingUploadPool.size > 0
        ) {
            performance.mark('Pool tick');
            console.log({
                done: this.donePool.size,
                failed: this.failedPool.size,
                total: this.options.files.length,
                queuedFiles: this.queuedFiles.size,
                uploadPool: this.uploadPool.size,
                activeWorkers: Hasher.activeWorkerCount,
                pendingUploadPool: this.pendingUploadPool.size
            });
            while (
                this.pendingUploadPool.size > 0 &&
                this.uploadPool.size < this.options.uploadConcurrency
            ) {
                const entry = this.pendingUploadPool.values().next().value;
                if (entry) {
                    this.uploadPool.add(entry);
                    this.pendingUploadPool.delete(entry);
                    const task = this.doUpload(entry)
                        .then(() => {
                            this.uploadPool.delete(entry);
                            this.donePool.add(entry);
                        })
                        .catch((err) => {
                            console.error(err);
                            this.pendingUploadPool.delete(entry);
                            this.uploadPool.delete(entry);
                            this.failedPool.add(entry);
                        })
                        .finally(
                            () => (activeTasks.delete(task), this.events.emit('task-completed'))
                        );
                    activeTasks.add(task);
                }
            }
            while (
                this.queuedFiles.size > 0 &&
                Hasher.activeWorkerCount < this.options.hashConcurrency
            ) {
                const entry = this.queuedFiles.values().next().value;
                if (entry) {
                    this.hashPool.add(entry);
                    this.queuedFiles.delete(entry);
                    const task = hasher
                        .hashFile(entry)
                        .then((hashes) => {
                            this.pendingUploadPool.add({ ...entry, hashes });
                            this.hashPool.delete(entry);
                        })
                        .catch((err) => {
                            console.error(err);
                            this.hashPool.delete(entry);
                            this.failedPool.add(entry);
                        })
                        .finally(
                            () => (activeTasks.delete(task), this.events.emit('task-completed'))
                        );
                    activeTasks.add(task);
                }
            }
            await new Promise<void>(async (r) => {
                // await sleep(1);
                this.events.once('task-completed', r);
            });
        }

        await Promise.all(activeTasks);
        console.log({
            done: this.donePool.size,
            failed: this.failedPool.size,
            total: this.options.files.length,
            queuedFiles: this.queuedFiles.size,
            uploadPool: this.uploadPool.size,
            activeWorkers: Hasher.activeWorkerCount,
            pendingUploadPool: this.pendingUploadPool.size
        });
    }

    private async doUpload(entry: IndexedFile<true>) {
        console.log('Uploading', entry);
        const timeStart = performance.now();
        // Fake 20MB/s
        await sleep(entry.file.size / 20_000_000);
        performance.measure(`Upload ${entry.file.name}`, { start: timeStart });
        console.log('Upload done', entry);
    }
}

const sleep = (time: number) => new Promise((r) => setTimeout(r, time));
