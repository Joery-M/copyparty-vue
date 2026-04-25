import { defu } from 'defu';
import { EventEmitter } from 'eventemitter3';

interface Up2KOptions {
    turbo: boolean;
    u2rand: boolean;
    fsearch: boolean;
    lifetime?: number;
}

export type FileOrDir = File | FileSystemDirectoryEntry;
export type FileOrDirMap = Map<FileOrDir, string>;

interface CollectResult {
    bad: FileOrDirMap;
    nil: FileOrDirMap;
    good: FileOrDirMap;
    dirs: FileSystemDirectoryEntry[];
}

interface Up2KEvents {
    'got-all-files': [good: FileOrDirMap, nil: FileOrDirMap, bad: FileOrDirMap];
}

export class Up2K {
    events = new EventEmitter<Up2KEvents>();
    options: Up2KOptions;

    constructor(options: Partial<Up2KOptions>) {
        this.options = defu(options, { turbo: false, u2rand: false, fsearch: false });
    }

    /**
     * First function to be called, collects files
     */
    collectInput(input: DataTransferItemList | FileList | File[] | File) {
        const collected = this.collectFilesAndDirs(input);
        this.readDirs(collected);
    }

    /**
     * Collect files/directories from any sort of input and sort them into groups
     */
    private collectFilesAndDirs(
        files: DataTransferItemList | FileList | File[] | File
    ): CollectResult {
        if (files instanceof File) files = [files];

        const badFiles = new Map<FileOrDir, string>();
        const nilFiles = new Map<FileOrDir, string>();
        const goodFiles = new Map<FileOrDir, string>();
        const dirs: FileSystemDirectoryEntry[] = [];

        for (let a = 0; a < files.length; a++) {
            let fObj = files[a];
            let dst = goodFiles;

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
                if (fObj.size < 1) dst = nilFiles;
            } catch (ex) {
                dst = badFiles;
            }
            dst.set(fObj, fObj.name);
        }
        return { bad: badFiles, nil: nilFiles, good: goodFiles, dirs };
    }

    private rd_missing_ref: Set<string> | undefined;

    /**
     * Recursively read through all directories and find files that are maybe 'bad' or empty and categorize them
     *
     * @emits `got-all-files`
     */
    private readDirs(
        collected: CollectResult,
        rd?: FileSystemDirectoryReader,
        pf = new Set<string>(),
        spins = 0
    ) {
        const { dirs, good, nil, bad } = collected;
        if (++spins == 5) this.rd_missing_ref = rdFlatten(pf, dirs);

        if (spins == 200) {
            // Kinda annoying losing performance just to be able to index a set
            const missing = Array.from(rdFlatten(pf, dirs));
            missing.sort();
            const rdMissingRef = Array.from(this.rd_missing_ref ?? []);
            let match = rdMissingRef.length == missing.length;
            const aa = match ? missing.length : 0;

            for (let a = 0; a < aa; a++) {
                if (rdMissingRef[a] != missing[a]) match = false;
            }

            if (match) {
                // var msg = [L.u_dirstuck.format(missing.length) + '<ul>'];
                // for (var a = 0; a < Math.min(20, missing.length); a++)
                //     msg.push('<li>' + esc(missing[a]) + '</li>');
                // return modal.alert(msg.join('') + '</ul>', () => {
                //     this.readDirs(rd, new Set(), { dirs: [], good, nil, bad }, spins);
                // });
            }
            spins = 0;
        }

        if (!dirs.length) {
            if (!pf.size)
                // call first hook, pass list of remaining hooks to call
                return this.events.emit('got-all-files', good, nil, bad);

            console.log('retry pf, ' + pf.size);
            setTimeout(() => {
                this.readDirs(collected, rd, pf, spins);
            }, 50);
            return;
        }

        if (!rd) rd = dirs[0].createReader();

        rd.readEntries(
            (entries) => {
                let ngot = 0;
                entries.forEach(function (dn) {
                    if (dn.isDirectory) {
                        dirs.push(dn as FileSystemDirectoryEntry);
                    } else {
                        let name = dn.fullPath;
                        if (name.startsWith('/')) name = name.slice(1);

                        pf.add(name);
                        (dn as FileSystemFileEntry).file(function (fobj) {
                            pf.delete(name);
                            let dst = good;
                            try {
                                if (fobj.size < 1) dst = nil;
                            } catch (ex) {
                                dst = bad;
                            }
                            dst.set(fobj, name);
                        });
                    }
                    ngot += 1;
                });
                if (!ngot) {
                    dirs.shift();
                    rd = undefined;
                }
                this.readDirs(collected, rd, pf, spins);
            },
            () => {
                const dn = dirs[0];
                let name = dn.fullPath;
                if (name.startsWith('/')) name = name.slice(1);

                bad.set(dn, name + '/');
                this.readDirs({ dirs: dirs.slice(1), good, nil, bad }, undefined, pf, spins);
            }
        );
    }

    gotAllFiles({ bad: bad_files, nil: nil_files, good: good_files }: Omit<CollectResult, 'dirs'>) {
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

        // if (!junk.size) return gotallfiles2(good_files);

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

    gotAllFiles2(good_files: FileOrDirMap) {
        // TODO: Ask for confirmation of upload
    }

    private uploadFiles(files: FileOrDirMap) {}
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
