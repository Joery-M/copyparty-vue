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
    private hasher: Hasher;

    private options: TaskPoolOptions;

    private queuedFiles;
    private hashPool = shallowReactive(new Set<File>());
    private pendingUploadPool = shallowReactive(new Set<HashedFile>());
    private uploadPool = shallowReactive(new Set<HashedFile>());

    constructor(options: Pick<TaskPoolOptions, 'files'> & Partial<TaskPoolOptions>) {
        this.queuedFiles = shallowReactive(new Set(options.files.keys()));
        this.options = defu(options, {
            hashConcurrency: navigator.hardwareConcurrency || 4,
            uploadConcurrency: 2
        });

        this.hasher = new Hasher(this.options.hashConcurrency, () =>
            this.events.emit('task-completed')
        );
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
            this.queuedFiles.size > 0 ||
            this.uploadPool.size > 0 ||
            this.hashPool.size > 0 ||
            this.pendingUploadPool.size > 0
        ) {
            console.log(
                'queuedFiles: ',
                this.queuedFiles.size,
                ', uploadPool: ',
                this.uploadPool.size,
                ', hashPool: ',
                this.hashPool.size,
                ', pendingUploadPool: ',
                this.pendingUploadPool.size
            );
            while (
                this.pendingUploadPool.size > 0 &&
                this.uploadPool.size < this.options.uploadConcurrency
            ) {
                const file = this.pendingUploadPool.values().next().value;
                if (file) void this.doUpload(file).then(() => this.events.emit('task-completed'));
            }
            while (this.queuedFiles.size > 0 && this.hasher.idleWorkerCount > 0) {
                const file = this.queuedFiles.values().next().value;
                if (file) void this.doHash(file).then(() => this.events.emit('task-completed'));
            }
            await new Promise<void>((r) => this.events.once('task-completed', r));
        }
    }

    private async doUpload(file: HashedFile) {
        this.uploadPool.add(file);
        this.pendingUploadPool.delete(file);
        console.log('Uploading', file);
        // Fake 20MB/s
        await sleep(file.data.size / 20_000_000);
        console.log('Upload done', file);
        this.uploadPool.delete(file);
    }
    private async doHash(file: File) {
        this.hashPool.add(file);
        this.queuedFiles.delete(file);
        if (file instanceof File) {
            const hashes = await this.hasher.hashFile(file);
            this.pendingUploadPool.add({ data: file, hashes });
        }
        this.hashPool.delete(file);
    }
}

const sleep = (time: number) => new Promise((r) => setTimeout(r, time));
