export interface ResultRow {
    file_name: string;
    file_num: number;
    section: string;
    columns: string | null;
    row_count: number;
    row_pages: number;
    error: string | null;
}
export interface ResultMeta {
    file_name: string;
    file_num: number;
    section: string;
    row_count: number;
    error: string | null;
}
export interface ResultPage {
    page_idx: number;
    page_data: string;
}
export interface Progress {
    total: number;
    completed: number;
    status: string;
}
export declare class ReportDB {
    private db;
    dbPath: string;
    private _ready;
    constructor(dbPath: string);
    private _init;
    private _ensureReady;
    private _initTables;
    private _save;
    setMeta(key: string, value: string): Promise<void>;
    setMetaBatch(entries: {
        key: string;
        value: string;
    }[]): Promise<void>;
    getMeta(): Promise<Map<string, string>>;
    setResult(fileNum: number, fileName: string, section: string, columns: string[] | null, rows: (string | number | null)[][], error: string | null): Promise<void>;
    getResult(fileNum: number): Promise<ResultRow | undefined>;
    getResultPage(fileNum: number, pageIdx: number): Promise<ResultPage | undefined>;
    getAllResultMetas(): Promise<ResultMeta[]>;
    getAllResults(): Promise<(ResultRow & {
        rows: unknown[];
    })[]>;
    /**
     * Lazily load data rows for a single result by file_num.
     * Use this instead of getAllResults().rows to avoid loading all data into memory at once.
     */
    loadResultRows(fileNum: number): Promise<unknown[]>;
    resultCount(): Promise<number>;
    setProgress(total: number, completed: number, status: string): Promise<void>;
    getProgress(): Promise<Progress>;
    close(): Promise<void>;
}
