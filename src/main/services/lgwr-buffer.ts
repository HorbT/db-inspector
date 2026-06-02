import { ReportDB } from './report-db';

export interface ResultPayload {
  fileNum: number;
  fileName: string;
  section?: string;
  columns?: string[];
  rows?: (string | number | null)[][];
  error?: string;
}

export class LgwrBuffer {
  private db: ReportDB;
  private total: number;
  private completed: number;

  constructor(db: ReportDB) {
    this.db = db;
    this.total = 0;
    this.completed = 0;
  }

  /** Push a single SQL result into the buffer, written immediately to SQLite */
  async push(payload: ResultPayload): Promise<void> {
    this.completed++;
    await this.db.setResult(
      payload.fileNum,
      payload.fileName,
      payload.section || '',
      payload.columns || null,
      payload.rows || [],
      payload.error || null,
    );
    await this.db.setProgress(this.total, this.completed, 'running');
  }

  /** Set the total number of expected results */
  async setTotal(total: number): Promise<void> {
    this.total = total;
    await this.db.setProgress(total, this.completed, 'running');
  }

  /** Finalize the inspection, writing final progress status */
  async finalize(status: 'completed' | 'failed', overrideTotal?: number): Promise<void> {
    if (overrideTotal !== undefined) {
      this.total = overrideTotal;
    }
    if (this.total === 0) {
      this.total = this.completed;
    }
    await this.db.setProgress(this.total, this.completed, status);
  }
}