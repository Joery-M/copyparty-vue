import { defu } from 'defu';
import { Up2KTaskPool } from './taskPool';

interface Up2KOptions {
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

export class Up2K {
    options: Up2KOptions;

    constructor(options?: Partial<Up2KOptions>) {
        this.options = defu(options, { turbo: false, u2rand: false, fsearch: false });
    }

    /**
     * First function to be called, collects files
     */
    collectInput(input: DataTransferItemList | FileList | File[] | File) {
        const collected = this.collectFilesAndDirs(input);
        return this.readDirs(collected);
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
            try {
                if (fObj.size < 1) {
                    nilFiles.set(fObj, fObj.name);
                } else {
                    goodFiles.set(fObj, fObj.name);
                }
            } catch (ex) {
                badFiles.set(fObj, fObj.name);
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

            console.log('retry pf, ' + state.pf.size);
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

    gotAllFiles(readDirResult: ReadDirResult) {
        let { bad: bad_files, nil: nil_files, good: good_files } = readDirResult;
        if (this.options.fsearch && !this.options.turbo) {
            nil_files = new Map();
        }
        const ntot = good_files.size + nil_files.size + bad_files.size;
        if (bad_files.size) {
            // TODO: Show dialog talking about 'bad' files
            // var msg = L.u_badf.format(bad_files.length, ntot);
            // for (var a = 0, aa = Math.min(20, bad_files.length); a < aa; a++)
            //     msg += '-- ' + esc(bad_files[a][1]) + '\n';
            // msg += L.u_just1;
            // return modal.alert(msg, function () {
            //     start_actx();
            //     gotallfiles(good_files, nil_files, []);
            // });
        }
        if (nil_files.size) {
            // TODO: Show dialog talking about empty files
            // var msg = L.u_blankf.format(nil_files.length, ntot);
            // for (var a = 0, aa = Math.min(20, nil_files.length); a < aa; a++)
            //     msg += '-- ' + esc(nil_files[a][1]) + '\n';
            // msg += L.u_just1;
            // return modal.confirm(
            //     msg,
            //     function () {
            //         start_actx();
            //         gotallfiles(good_files.concat(nil_files), [], []);
            //     },
            //     function () {
            //         start_actx();
            //         gotallfiles(good_files, [], []);
            //     }
            // );
        }
        let fps = new Set(),
            pdp = '';
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
        const junk = new Map<FileOrDir, string>();

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

        if (!junk.size) return good_files;
        console.log(junk);

        // TODO: Show dialog asking if the user wants to upload junk files
        // var msg = L.u_applef.format(junk.size, good_files.size);
        // for (var a = 0, aa = Math.min(1000, junk.size); a < aa; a++)
        //     msg += '-- ' + esc(junk[a][1]) + '\n';

        // return modal.confirm(
        //     msg,
        //     function () {
        //         const newGoodFiles = new Map<FileOrDir, string>();
        //         for (const [file, name] of good_files.entries()) {
        //             if (!junk.has(file)) newGoodFiles.set(file, name);
        //         }

        //         // start_actx();
        //         gotallfiles2(newGoodFiles);
        //     },
        //     function () {
        //         // start_actx();
        //         gotallfiles2(good_files);
        //     }
        // );
    }

    // TODO: Before this, ask for confirmation of upload
    async uploadFiles(files: FileMap) {
        const pool = new Up2KTaskPool({ files });
        await pool.execute()
    }
}

function rdFlatten(pf: Set<string>, dirs: FileSystemDirectoryEntry[]) {
    return new Set([...pf, ...dirs.map((d) => d.fullPath || '')].sort());
}

function vsplit(vp: string) {
    if (vp.endsWith('/')) vp = vp.slice(0, -1);

    var ofs = vp.lastIndexOf('/') + 1,
        base = vp.slice(0, ofs),
        fn = vp.slice(ofs);

    return [base, fn];
}

const isDirectoryEntry = (item: FileSystemEntry): item is FileSystemDirectoryEntry =>
    item.isDirectory;
const isFileEntry = (item: FileSystemEntry): item is FileSystemFileEntry => !item.isDirectory;

const sleep = (time: number) => new Promise((r) => setTimeout(r, time));
