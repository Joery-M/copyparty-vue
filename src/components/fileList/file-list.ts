import type { ColumnSort, VueTable } from '@tanstack/vue-table';
import type { ComputedRef, InjectionKey } from 'vue';

import {
    columnSizingFeature,
    columnVisibilityFeature,
    createPaginatedRowModel,
    createSortedRowModel,
    rowPaginationFeature,
    rowSelectionFeature,
    rowSortingFeature,
    sortFn_alphanumeric,
    sortFn_basic,
    tableFeatures,
} from '@tanstack/vue-table';
import { inject, provide } from 'vue';

import type { AnyDirectoryEntry } from '@/lib/interop';

export const createTableFeatures = () =>
    tableFeatures({
        rowSortingFeature,
        sortedRowModel: createSortedRowModel(),
        rowPaginationFeature,
        paginatedRowModel: createPaginatedRowModel(),
        rowSelectionFeature,
        columnVisibilityFeature,
        sortFns: {
            basic: sortFn_basic,
            alphanumeric: sortFn_alphanumeric,
        },
        columnSizingFeature,
    });

export type TableFeatures = ReturnType<typeof createTableFeatures>;

export type TableType = VueTable<TableFeatures, AnyDirectoryEntry>;

interface FileTableInjection {
    isLoading: ComputedRef<boolean>;
    table: TableType;
    sorting: ComputedRef<ColumnSort | undefined>;
    setSorting: (id: string, desc?: boolean) => void;
    toggleSortDirection: () => void;
    resetSorting: () => void;
}

const fileTableInjectionToken = Symbol() as InjectionKey<FileTableInjection>;

export const useFileTable = () => {
    const v = inject(fileTableInjectionToken);
    if (!v) throw new Error('Could not inject table');
    return v;
};
export const provideFileTable = (state: FileTableInjection) =>
    provide(fileTableInjectionToken, state);
