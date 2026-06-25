import type { IndexedFile } from '.';

export interface HashWorkerPayload {
    id: number;
    file: IndexedFile<false>;
    start: number;
    end: number;
    chunkCount: number;
}

export interface WorkerFunctions {
    init: () => Promise<void>;
    hashFile: (payload: HashWorkerPayload) => Promise<string[]>;
}

export interface OrchestratorFunctions {
    progress: (id: number, bytes: number) => void;
}
