export type SearchQueryValue = string | number | Date;

export type SingleSearchOperator = '==' | '!=' | '>' | '>=' | '<' | '<=' | 'like';
export class SingleSearchQuery {
    key: string;
    value: SearchQueryValue = '';
    operator: SingleSearchOperator = '==';
    constructor(key: string, value: SearchQueryValue, operator: SingleSearchOperator) {
        this.key = key;
        this.value = value;
        this.operator = operator;
    }

    public static isEqual(key: string, value: SearchQueryValue) {
        return new SingleSearchQuery(key, value, '==');
    }
    public static isNotEqual(key: string, value: SearchQueryValue) {
        return new SingleSearchQuery(key, value, '!=');
    }
    public static isLessThan(key: string, value: SearchQueryValue) {
        return new SingleSearchQuery(key, value, '<');
    }
    public static isGreaterThan(key: string, value: SearchQueryValue) {
        return new SingleSearchQuery(key, value, '>');
    }
    public static isLessThanOrEqual(key: string, value: SearchQueryValue) {
        return new SingleSearchQuery(key, value, '<=');
    }
    public static isGreaterThanOrEqual(key: string, value: SearchQueryValue) {
        return new SingleSearchQuery(key, value, '>=');
    }
    public static like(key: string, value: SearchQueryValue) {
        return new SingleSearchQuery(key, value, 'like');
    }
}

export type MultiSearchOperator = 'and' | 'or' | 'not';
export class MultiSearchQuery {
    public operator: MultiSearchOperator;
    public queries: SearchQuery[] = [];
    constructor(operator: MultiSearchOperator, queries: SearchQuery[]) {
        this.operator = operator;
        this.queries = queries;
    }

    static and(...queries: SearchQuery[]) {
        return new MultiSearchQuery('and', queries);
    }
    static or(...queries: SearchQuery[]) {
        return new MultiSearchQuery('or', queries);
    }
    static not(...queries: SearchQuery[]) {
        return new MultiSearchQuery('not', queries);
    }
}

export type SearchQuery = SingleSearchQuery | MultiSearchQuery;

export function compileQuery(query: SearchQuery): string {
    const path = new Set<SearchQuery>();
    return _compileQuery(query, 0, path);
}
function _compileQuery(query: SearchQuery, depth: number, path: Set<SearchQuery>): string {
    if (query instanceof SingleSearchQuery) {
        const escapedKey = escapeKey(query.key);
        const escapedValue = escapeValue(query.value);
        return `${escapedKey} ${query.operator} "${escapedValue}"`;
    } else {
        if (path.has(query)) {
            throw new Error('Circular reference detected whilst compiling search query', {
                cause: path,
            });
        }
        path.add(query);

        const queries = query.queries.map((q) => _compileQuery(q, depth + 1, path));
        const compiled = queries.join(` ${query.operator} `);

        path.delete(query);
        return depth === 0 ? compiled : `(${compiled})`;
    }
}

function escapeKey(key: string) {
    if (key.includes(' ') || key.includes('"')) {
        return '"' + key.replace(/"/g, '\\"') + '"';
    } else {
        return key;
    }
}
function escapeValue(value: SearchQueryValue) {
    if (value instanceof Date) {
        const Y = value.getFullYear().toFixed(4);
        const m = value.getMonth().toFixed(2);
        const d = value.getDate().toFixed(2);
        const H = value.getHours().toFixed(2);
        const M = value.getMinutes().toFixed(2);
        const S = value.getSeconds().toFixed(2);
        value = `${Y}-${m}-${d} ${H}:${M}:${S}`;
    } else if (typeof value === 'number') {
        value = value.toString();
    }
    return value.replace(/"/g, '\\"');
}
