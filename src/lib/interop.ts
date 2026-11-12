import { basename } from 'pathe';

import { API } from '@/lib/api';
import { pathToParts } from '@/lib/utils';

import { classifyExtension, FileClassification } from './classifyExt';

export type AnyDirectoryEntry = Directory | FileEntry;

class BaseDirectoryEntry {
    name: string;
    size: number | null = null;
    created: Date | null = null;
    tags;

    get fullPath() {
        return this.cwd.concat(this.name);
    }

    constructor(
        protected cwd: string[],
        public classification: FileClassification,
        input: API.ListDirectoryEntry
    ) {
        this.name = decodeURIComponent(input.href.replace(/\/?$/, ''));
        if (input.sz) this.size = input.sz;
        if (input.ts) this.created = new Date(input.ts * 1000);
        this.tags = new Map(Object.entries(input.tags ?? {}));
    }
}

export class Directory extends BaseDirectoryEntry {
    constructor(cwd: string[], input: API.ListDirectoryEntry) {
        super(cwd, FileClassification.Directory, input);
    }
}

export class FileEntry extends BaseDirectoryEntry {
    extension: string | null = null;

    constructor(cwd: string[], input: API.ListDirectoryEntry) {
        super(cwd, classifyExtension(input.ext), input);

        if (input.ext != null && input.ext !== '---') this.extension = input.ext;
    }
}

export class SearchFileEntry {
    name: string;
    size: number | null = null;
    created: Date | null = null;
    tags;
    fullPath: string;
    path: string[];

    constructor(input: API.SearchResponseEntry) {
        this.fullPath = input.rp;
        this.path = pathToParts(input.rp).map(decodeURIComponent);
        this.name = decodeURIComponent(basename(input.rp));
        this.tags = new Map(Object.entries(input.tags));
    }
}
