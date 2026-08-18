export type IndexedFile<Hashed extends boolean = false> = {
    file: File;
    name: string;
    chunkSize: number;
} & (Hashed extends true ? { hashes: string[] } : { hashes?: string[] });

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
