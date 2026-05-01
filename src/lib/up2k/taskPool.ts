import { whenever } from '@vueuse/core';
import defu from 'defu';
import EventEmitter from 'eventemitter3';
import { shallowReactive } from 'vue';
import type { FileMap } from '.';
import { Hasher } from './hasher';

export interface TaskPoolOptions {
    files: FileMap;
    hashConcurrency: number;
    uploadConcurrency: number;
}

export interface TaskPoolEvents {
    'task-completed': [];
}

interface HashedFile {
    data: File;
    hashes: string[];
}

export class Up2KTaskPool {
    events = new EventEmitter<TaskPoolEvents>();

    private options: TaskPoolOptions;

    private queuedFiles;
    private hashPool = new Set<File>();
    private pendingUploadPool = shallowReactive(new Set<HashedFile>());
    private uploadPool = shallowReactive(new Set<HashedFile>());
    private donePool = new Set<HashedFile>();
    private failedPool = new Set<File>();

    constructor(options: Pick<TaskPoolOptions, 'files'> & Partial<TaskPoolOptions>) {
        let largeFirst = true;
        const sortedFiles = Array.from(options.files.keys()).sort(
            (a, b) => ((largeFirst = !largeFirst), largeFirst ? a.size - b.size : b.size - a.size)
        );
        this.queuedFiles = shallowReactive(new Set(sortedFiles));
        this.options = defu(options, {
            hashConcurrency: navigator.hardwareConcurrency || 4,
            uploadConcurrency: 4
        });
    }

    /**
     * Steps:
     *  - Initialize hasher
     *  - Each cycle of the pool starts by checking for pending upload tasks
     *      - If there are no pending uploads, continue with a hash task
     *          - When a hash task is done, it will add an upload task to the pending upload pool
     */
    async execute() {
        using hasher = new Hasher(this.options.hashConcurrency, () =>
            this.events.emit('task-completed')
        );
        while (this.donePool.size + this.failedPool.size < this.options.files.size) {
            performance.mark('Pool tick');
            console.log({
                done: this.donePool.size,
                failed: this.failedPool.size,
                total: this.options.files.size,
                queuedFiles: this.queuedFiles.size,
                uploadPool: this.uploadPool.size,
                activeWorkers: hasher.activeWorkerCount.value,
                pendingUploadPool: this.pendingUploadPool.size
            });
            while (
                this.pendingUploadPool.size > 0 &&
                this.uploadPool.size < this.options.uploadConcurrency
            ) {
                const file = this.pendingUploadPool.values().next().value;
                if (file)
                    void this.doUpload(file)
                        .then(() => this.events.emit('task-completed'))
                        .catch((err) => {
                            console.error(err);
                            this.pendingUploadPool.delete(file);
                            this.uploadPool.delete(file);
                            this.failedPool.add(file.data);
                        });
            }
            while (
                this.queuedFiles.size > 0 &&
                hasher.activeWorkerCount.value < this.options.hashConcurrency
            ) {
                const file = this.queuedFiles.values().next().value;
                if (file)
                    void this.doHash(hasher, file)
                        .then(() => this.events.emit('task-completed'))
                        .catch((err) => {
                            console.error(err);
                            this.hashPool.delete(file);
                            this.failedPool.add(file);
                        });
            }
            await new Promise<void>(async (r) => {
                await sleep(1);
                whenever(
                    () =>
                        (this.pendingUploadPool.size > 0 &&
                            this.uploadPool.size < this.options.uploadConcurrency) ||
                        hasher.activeWorkerCount.value < this.options.hashConcurrency,
                    () => r(),
                    { once: true, immediate: true }
                );
            });
        }
    }

    private async doUpload(file: HashedFile) {
        this.uploadPool.add(file);
        this.pendingUploadPool.delete(file);
        const timeStart = performance.now();
        console.log('Uploading', file);
        // Fake 20MB/s
        await sleep(file.data.size / 20_000_000);
        performance.measure(`Upload ${file.data.name}`, { start: timeStart });
        console.log('Upload done', file);
        this.uploadPool.delete(file);

        this.donePool.add(file);
    }
    private async doHash(hasher: Hasher, file: File) {
        this.hashPool.add(file);
        this.queuedFiles.delete(file);
        const hashes = await hasher.hashFile(file);
        this.pendingUploadPool.add({ data: file, hashes });
        this.hashPool.delete(file);
    }
}

const sleep = (time: number) => new Promise((r) => setTimeout(r, time));
