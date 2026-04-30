import defu from 'defu';
import EventEmitter from 'eventemitter3';
import { shallowReactive, watch } from 'vue';
import type { FileOrDir, FileOrDirMap } from '.';
import { Hasher } from './hasher';

export interface TaskPoolOptions {
    files: FileOrDirMap;
    hashConcurrency: number;
    uploadConcurrency: number;
}

export interface TaskPoolEvents {
    'task-completed': [];
}

interface HashedFileOrDir {
    data: FileOrDir;
    hashes: string[];
}

export class Up2KTaskPool {
    events = new EventEmitter<TaskPoolEvents>();
    private hasher: Hasher;

    private options: TaskPoolOptions;

    private queuedFiles = new Set<FileOrDir>();
    private hashPool = shallowReactive(new Set<FileOrDir>());
    private pendingUploadPool = new Set<HashedFileOrDir>();
    private uploadPool = shallowReactive(new Set<HashedFileOrDir>());

    constructor(options: Pick<TaskPoolOptions, 'files'> & Partial<TaskPoolOptions>) {
        this.queuedFiles = new Set(options.files.keys());
        this.options = defu(options, {
            hashConcurrency: navigator.hardwareConcurrency || 4,
            uploadConcurrency: 2
        });

        this.hasher = new Hasher(this.options.hashConcurrency);
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

    private async doUpload(file: HashedFileOrDir) {
        this.uploadPool.add(file);
        this.pendingUploadPool.delete(file);
        console.log('Uploading', file);
        await sleep(1000);
        console.log('Upload done', file);
        this.uploadPool.delete(file);
    }
    private async doHash(file: FileOrDir) {
        this.hashPool.add(file);
        this.queuedFiles.delete(file);
        if (file instanceof File) {
            const hashes = await this.hasher.hashFile(file);
            this.pendingUploadPool.add({ data: file, hashes });
        }
        this.hashPool.delete(file);
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

const sleep = (time: number) => new Promise((r) => setTimeout(r, time));
