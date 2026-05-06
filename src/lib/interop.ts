import { API } from '@/lib/api';
import { classifyExtension, FileClassification } from './classifyExt';

export type AnyDirectoryEntry = Directory | File;

class BaseDirectoryEntry {
    name: string;
    size: number | null = null;
    created: Date | null = null;

    get fullPath() {
        return this.cwd.concat(this.name);
    }

    constructor(
        protected cwd: string[],
        public classification: FileClassification,
        input: API.ListDirectoryEntry
    ) {
        this.name = decodeURIComponent(input.href.replace(/\/?$/, ''));
        if (input.sz != null) this.size = input.sz;
        if (input.ts != null) this.created = new Date(input.ts);
    }
}

export class Directory extends BaseDirectoryEntry {
    constructor(cwd: string[], input: API.ListDirectoryEntry) {
        super(cwd, FileClassification.Directory, input);
    }
}

export class File extends BaseDirectoryEntry {
    extension: string | null = null;

    constructor(cwd: string[], input: API.ListDirectoryEntry) {
        super(cwd, classifyExtension(input.ext), input);

        if (input.ext != null && input.ext !== '---') this.extension = input.ext;
    }
}
