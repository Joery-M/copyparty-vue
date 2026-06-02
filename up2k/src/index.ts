import { defu } from 'defu';

import { getChunksize } from './hasher';
import { Up2KTaskPool } from './taskPool';
import {
    isDirectoryEntry,
    isFileEntry,
    rdFlatten,
    sleep,
    vsplit,
    type PartialExcept,
} from './utils';

interface Up2KOptions {
    hashConcurrency: number;
    uploadConcurrency: number;
    baseUrl: URL;
    turbo: boolean;
    u2rand: boolean;
    fsearch: boolean;
    lifetime?: number;
}

export type FileOrDir = File | FileSystemDirectoryEntry;
export type FileMap = Map<File, string>;
export type FileOrDirMap = Map<FileOrDir, string>;

interface CollectResult {
    nil: FileMap;
    good: FileMap;
    bad: FileOrDirMap;
    dirs: FileSystemDirectoryEntry[];
}

interface ReadDirResult {
    nil: FileMap;
    good: FileMap;
    bad: FileOrDirMap;
}

interface ReadDirState {
    rd?: FileSystemDirectoryReader;
    rdMissingRef: Set<string>;
    pf: Set<string>;
    spins: number;
}

export type IndexedFile<Hashed extends boolean = false> = {
    file: File;
    name: string;
    chunkSize: number;
} & (Hashed extends true ? { hashes: string[] } : { hashes?: string[] });

export class Up2K {
    private options: Up2KOptions;

    constructor(options: PartialExcept<Up2KOptions, 'baseUrl'>) {
        this.options = defu(options, {
            hashConcurrency: navigator.hardwareConcurrency || 4,
            uploadConcurrency: 4,
            turbo: false,
            u2rand: false,
            fsearch: false,
        });
    }

    /**
     * First function to be called, collects files
     */
    async collectInput(input: DataTransferItemList | FileList | File[] | File) {
        const collected = this.collectFilesAndDirs(input);
        const readDirsResult = await this.readDirs(collected);
        return { ...readDirsResult, junk: this.collectJunkFiles(readDirsResult.good) };
    }

    /**
     * Collect files/directories from any sort of input and sort them into groups
     */
    private collectFilesAndDirs(
        files: DataTransferItemList | FileList | File[] | File
    ): CollectResult {
        if (files instanceof File) files = [files];

        const badFiles = new Map<FileOrDir, string>();
        const nilFiles = new Map<File, string>();
        const goodFiles = new Map<File, string>();
        const dirs: FileSystemDirectoryEntry[] = [];

        for (let a = 0; a < files.length; a++) {
            let fObj = files[a];
            if (fObj instanceof DataTransferItem) {
                if (fObj.kind !== 'file' && fObj.type !== 'text/uri-list') continue;

                try {
                    const wi = fObj.getAsEntry ? fObj.getAsEntry() : fObj.webkitGetAsEntry();
                    if (wi?.isDirectory) {
                        dirs.push(wi as FileSystemDirectoryEntry);
                        continue;
                    }
                } catch (ex) {}
                const fileObj = fObj.getAsFile();
                if (!fileObj) continue;
                fObj = fileObj;
            }
            const name = fObj.webkitRelativePath || fObj.name;
            try {
                if (fObj.size < 1) {
                    nilFiles.set(fObj, name);
                } else {
                    goodFiles.set(fObj, name);
                }
            } catch (ex) {
                badFiles.set(fObj, name);
            }
        }
        return { bad: badFiles, nil: nilFiles, good: goodFiles, dirs };
    }

    /**
     * Recursively read through all directories and find files that are maybe 'bad' or empty and categorize them
     *
     * @emits `got-all-files`
     */
    private async readDirs(
        collected: CollectResult,
        state: ReadDirState = { pf: new Set(), rdMissingRef: new Set(), spins: 0 }
    ): Promise<ReadDirResult> {
        const { dirs, good, nil, bad } = collected;
        if (++state.spins == 5) state.rdMissingRef = rdFlatten(state.pf, dirs);

        if (state.spins == 200) {
            // Kinda annoying losing performance just to be able to index a set
            const missing = Array.from(rdFlatten(state.pf, dirs));
            missing.sort();
            const rdMissingRef = Array.from(state.rdMissingRef ?? []);
            let match = rdMissingRef.length == missing.length;
            const aa = match ? missing.length : 0;

            for (let a = 0; a < aa; a++) {
                if (rdMissingRef[a] != missing[a]) match = false;
            }

            if (match) {
                const list = missing.map((v) => `- ${v}`).join('\n');
                const ye = confirm(
                    `directory iterator got stuck trying to access the following ${missing.length} items; will skip: \n${list}`
                );
                if (ye) {
                    return this.readDirs({ dirs: [], good, nil, bad }, state);
                } else {
                    return { good, nil, bad };
                }
            }
            state.spins = 0;
        }

        if (!dirs.length) {
            if (!state.pf.size)
                // call first hook, pass list of remaining hooks to call
                return { good, bad, nil };

            return sleep(50).then(() => this.readDirs(collected, state));
        }

        if (!state.rd) state.rd = dirs[0].createReader();

        try {
            const entries = await new Promise(state.rd.readEntries.bind(state.rd));
            let ngot = 0;
            for (const dn of entries) {
                if (isDirectoryEntry(dn)) {
                    dirs.push(dn);
                } else if (isFileEntry(dn)) {
                    let name = dn.fullPath;
                    if (name.startsWith('/')) name = name.slice(1);

                    state.pf.add(name);
                    dn.file((fobj) => {
                        state.pf.delete(name);
                        try {
                            if (fobj.size < 1) {
                                nil.set(fobj, name);
                            } else {
                                good.set(fobj, name);
                            }
                        } catch (ex) {
                            bad.set(fobj, name);
                        }
                    });
                }
                ngot += 1;
            }
            if (!ngot) {
                dirs.shift();
                state.rd = undefined;
            }
            return this.readDirs(collected, state);
        } catch (err) {
            console.error(err);
            const dn = dirs[0];
            let name = dn.fullPath;
            if (name.startsWith('/')) name = name.slice(1);

            bad.set(dn, name + '/');
            return this.readDirs({ dirs: dirs.slice(1), good, nil, bad }, state);
        }
    }

    private collectJunkFiles(good_files: FileMap) {
        const fps = new Set();
        let pdp = '';
        for (const fp of good_files.values()) {
            let dp = vsplit(fp)[0];
            fps.add(fp);
            if (pdp != dp) {
                pdp = dp;
                dp = dp.slice(0, -1);
                while (dp) {
                    fps.add(dp);
                    dp = vsplit(dp)[0].slice(0, -1);
                }
            }
        }

        // Files to remove from upload if the user so desires
        const junk: FileMap = new Map();

        const junkPathRegex =
            /\/__MACOS|\/\.(DS_Store|AppleDouble|LSOverride|DocumentRevisions-|fseventsd|Spotlight-V[0-9]|TemporaryItems|Trashes|VolumeIcon\.icns|com\.apple\.timemachine\.donotpresent|AppleDB|AppleDesktop|apdisk)/;

        for (const entry of good_files.entries()) {
            const fn = entry[1];
            if (!fn.includes('/.') && !fn.includes('/__MACOS')) continue;
            if (junkPathRegex.test(fn)) {
                junk.set(entry[0], entry[1]);
                continue;
            }

            if (
                fn.includes('/._') &&
                fps.has(fn.replace('/._', '/')) &&
                fn.split('/').pop()?.startsWith('._')
            ) {
                junk.set(entry[0], entry[1]);
            }
        }
        return junk;
    }

    // TODO: Before this, ask for confirmation of upload
    async uploadFiles(files: FileMap) {
        const indexed = this.indexFiles(files);
        const pool = new Up2KTaskPool({
            files: indexed,
            hashConcurrency: this.options.hashConcurrency,
            uploadConcurrency: this.options.uploadConcurrency,
            baseUrl: this.options.baseUrl,
        });
        await pool.execute();
    }
    private indexFiles(files: FileMap): IndexedFile[] {
        return Array.from(files.entries()).map(([file, name]) => ({
            file,
            name,
            chunkSize: getChunksize(file.size),
        }));
    }
}

export { Hasher } from './hasher';
export { Up2KTaskPool } from './taskPool';
export { Uploader } from './uploader';
