import { ReportDB } from './report-db';
export interface ResultPayload {
    fileNum: number;
    fileName: string;
    section?: string;
    columns?: string[];
    rows?: (string | number | null)[][];
    error?: string;
}
export declare class LgwrBuffer {
    private db;
    private total;
    private completed;
    constructor(db: ReportDB);
    /** Push a single SQL result into the buffer, written immediately to SQLite */
    push(payload: ResultPayload): Promise<void>;
    /** Set the total number of expected results */
    setTotal(total: number): Promise<void>;
    /** Finalize the inspection, writing final progress status */
    finalize(status: 'completed' | 'failed', overrideTotal?: number): Promise<void>;
}
