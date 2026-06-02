import EventEmitter from 'eventemitter3';

import type { IndexedFile } from '.';

import { Hasher } from './hasher';
import { Uploader } from './uploader';

export interface TaskPoolOptions {
    files: IndexedFile[];
    hashConcurrency: number;
    uploadConcurrency: number;
    baseUrl: URL;
}

export interface TaskPoolEvents {
    'task-completed': [];
}

export class Up2KTaskPool {
    events = new EventEmitter<TaskPoolEvents>();

    private queuedFiles;
    private hashPool = new Set<IndexedFile>();
    private queuedUploadPool = new Set<IndexedFile<true>>();
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
     *      - If there is a file in the first queue, hash it, then add the file to the queued uploads pool
     *      - Wait for a task to finish and repeat
     */
    async execute(
        hasher = new Hasher(this.options.hashConcurrency),
        uploader = new Uploader({ baseUrl: this.options.baseUrl })
    ) {
        hasher.events.on('workerIdle', () => this.events.emit('task-completed'));

        const activeTasks = new Set<Promise<void>>();
        while (
            this.queuedFiles.size > 0 ||
            this.hashPool.size > 0 ||
            this.queuedUploadPool.size > 0
        ) {
            performance.mark('Pool tick');
            while (
                this.queuedUploadPool.size > 0 &&
                this.uploadPool.size < this.options.uploadConcurrency
            ) {
                const entry = this.queuedUploadPool.values().next().value;
                if (entry) {
                    this.uploadPool.add(entry);
                    this.queuedUploadPool.delete(entry);
                    const task = uploader
                        .uploadFile(entry)
                        .then(() => {
                            this.uploadPool.delete(entry);
                            this.donePool.add(entry);
                        })
                        .catch((err) => {
                            console.error(err);
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
                            this.queuedUploadPool.add({ ...entry, hashes });
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
            await new Promise<void>((r) => this.events.once('task-completed', r));
        }

        await Promise.all(activeTasks);
    }
}
