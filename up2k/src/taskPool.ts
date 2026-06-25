import EventEmitter from 'eventemitter3';

import type { IndexedFile } from '.';

import { Hasher } from './hasher';
import { Uploader } from './uploader';

export interface TaskPoolOptions {
    hasher?: Hasher;
    uploader?: Uploader;
    files: IndexedFile[];
    hashConcurrency: number;
    uploadConcurrency: number;
    baseUrl: URL;
    signal?: AbortSignal;
}

export interface TaskPoolEvents {
    'file-error': [file: IndexedFile, error: Error, step: 'hash' | 'upload'];

    'upload-progress': [file: IndexedFile<true>, bytes: number];
    'hash-progress': [file: IndexedFile<false>, bytes: number];
    'upload-done': [file: IndexedFile<false>];

    /** @internal Internal event used to queue new tasks */
    'task-completed': [];
}

export class TaskPool {
    events = new EventEmitter<TaskPoolEvents>();

    private queuedFiles;
    private hashPool = new Set<IndexedFile>();
    private queuedUploadPool = new Set<IndexedFile<true>>();
    private uploadPool = new Set<IndexedFile<true>>();
    private donePool = new Set<IndexedFile<true>>();
    private failedPool = new Set<IndexedFile>();

    private hasher: Hasher;
    private uploader: Uploader;

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

        this.hasher =
            options.hasher ??
            new Hasher({ concurrency: options.hashConcurrency, signal: options.signal });
        this.uploader =
            options.uploader ?? new Uploader({ baseUrl: options.baseUrl, signal: options.signal });
    }

    /**
     * Steps:
     *  - Initialize hasher
     *  - Each cycle of the pool starts by checking for pending upload tasks
     *      - If there are no pending uploads, continue with a hash task
     *      - If there is a file in the first queue, hash it, then add the file to the queued uploads pool
     *      - Wait for a task to finish and repeat
     */
    async execute() {
        this.hasher.events.on('workerIdle', () => this.events.emit('task-completed'));
        this.uploader.events.on('progress', (...a) => this.events.emit('upload-progress', ...a));
        this.uploader.events.on('done', (...a) => this.events.emit('upload-done', ...a));
        this.hasher.events.on('progress', (...a) => this.events.emit('hash-progress', ...a));

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
                    const task = this.uploader
                        .uploadFile(entry)
                        .then(() => {
                            this.uploadPool.delete(entry);
                            this.donePool.add(entry);
                        })
                        .catch((err) => {
                            console.error(err);
                            this.events.emit('file-error', entry, err, 'hash');
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
                    const task = this.hasher
                        .hashFile(entry)
                        .then((hashes) => {
                            this.queuedUploadPool.add({ ...entry, hashes });
                            this.hashPool.delete(entry);
                        })
                        .catch((err) => {
                            console.error(err);
                            this.events.emit('file-error', entry, err, 'upload');
                            this.hashPool.delete(entry);
                            this.failedPool.add(entry);
                        })
                        .finally(
                            () => (activeTasks.delete(task), this.events.emit('task-completed'))
                        );
                    activeTasks.add(task);
                }
            }
            const goOn = await this.waitForTaskComplete();
            if (!goOn) break;
        }

        await Promise.all(activeTasks);
    }

    private waitForTaskComplete() {
        return new Promise<boolean>((resolve) => {
            if (this.options.signal?.aborted) return resolve(false);

            const resolveTrue = () => {
                resolve(true);
                // Remove event listeners
                this.events.off('task-completed', resolveTrue);
                this.options.signal?.removeEventListener('task-completed', resolveFalse);
            };
            const resolveFalse = () => {
                resolve(false);
                // Remove event listeners
                this.events.off('task-completed', resolveTrue);
                this.options.signal?.removeEventListener('task-completed', resolveFalse);
            };

            this.events.once('task-completed', resolveTrue);
            this.options.signal?.addEventListener('abort', resolveFalse);
        });
    }
}
