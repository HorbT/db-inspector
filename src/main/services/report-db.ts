import initSqlJs from 'sql.js';
import type { Database as SqlJsDatabase, SqlJsStatic } from 'sql.js';
import path from 'path';
import fs from 'fs';

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

const ROWS_PER_PAGE = 200;

let SQL: SqlJsStatic | null = null;

async function getSQL(): Promise<SqlJsStatic> {
  if (!SQL) {
    SQL = await initSqlJs();
  }
  return SQL;
}

export class ReportDB {
  private db: SqlJsDatabase | null = null;
  public dbPath: string;
  private _ready: Promise<void>;

  constructor(dbPath: string) {
    this.dbPath = dbPath;
    const dir = path.dirname(dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    this._ready = this._init();
  }

  private async _init(): Promise<void> {
    const sql = await getSQL();
    // Load existing DB or create new
    if (fs.existsSync(this.dbPath)) {
      const buffer = fs.readFileSync(this.dbPath);
      this.db = new sql.Database(buffer);
    } else {
      this.db = new sql.Database();
    }
    this.db.run('PRAGMA journal_mode = WAL');
    this._initTables();
  }

  private async _ensureReady(): Promise<void> {
    await this._ready;
  }

  private _initTables(): void {
    this.db!.run(`
      CREATE TABLE IF NOT EXISTS meta (
        key TEXT PRIMARY KEY,
        value TEXT
      );
      CREATE TABLE IF NOT EXISTS results (
        file_num INTEGER PRIMARY KEY,
        file_name TEXT NOT NULL,
        section TEXT DEFAULT '',
        columns TEXT,
        row_count INTEGER DEFAULT 0,
        row_pages INTEGER DEFAULT 0,
        error TEXT
      );
      CREATE TABLE IF NOT EXISTS pages (
        file_num INTEGER,
        page_idx INTEGER,
        page_data TEXT,
        PRIMARY KEY (file_num, page_idx)
      );
      CREATE TABLE IF NOT EXISTS progress (
        id INTEGER PRIMARY KEY DEFAULT 1,
        total INTEGER DEFAULT 0,
        completed INTEGER DEFAULT 0,
        status TEXT DEFAULT 'running'
      );
    `);
    this._save();
  }

  private _save(): void {
    if (this.db) {
      const data = this.db.export();
      fs.writeFileSync(this.dbPath, Buffer.from(data));
    }
  }

  // ==================== Meta ====================

  async setMeta(key: string, value: string): Promise<void> {
    await this._ensureReady();
    this.db!.run('INSERT OR REPLACE INTO meta (key, value) VALUES (?, ?)', [key, value]);
    this._save();
  }

  async setMetaBatch(entries: { key: string; value: string }[]): Promise<void> {
    await this._ensureReady();
    for (const { key, value } of entries) {
      this.db!.run('INSERT OR REPLACE INTO meta (key, value) VALUES (?, ?)', [key, value]);
    }
    this._save();
  }

  async getMeta(): Promise<Map<string, string>> {
    await this._ensureReady();
    const result = this.db!.exec('SELECT key, value FROM meta');
    const map = new Map<string, string>();
    if (result.length > 0) {
      for (const row of result[0].values) {
        map.set(row[0] as string, row[1] as string);
      }
    }
    return map;
  }

  // ==================== Results ====================

  async setResult(
    fileNum: number,
    fileName: string,
    section: string,
    columns: string[] | null,
    rows: (string | number | null)[][],
    error: string | null,
  ): Promise<void> {
    await this._ensureReady();
    const rowCount = rows.length;
    const rowPages = Math.ceil(rowCount / ROWS_PER_PAGE);
    const columnsJson = columns ? JSON.stringify(columns) : null;

    // Upsert result
    this.db!.run(
      `INSERT OR REPLACE INTO results (file_num, file_name, section, columns, row_count, row_pages, error)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [fileNum, fileName, section, columnsJson, rowCount, rowPages, error || null],
    );

    // Write pages
    for (let p = 0; p < rowPages; p++) {
      const slice = rows.slice(p * ROWS_PER_PAGE, (p + 1) * ROWS_PER_PAGE);
      this.db!.run(
        'INSERT OR REPLACE INTO pages (file_num, page_idx, page_data) VALUES (?, ?, ?)',
        [fileNum, p, JSON.stringify(slice)],
      );
    }
    this._save();
  }

  async getResult(fileNum: number): Promise<ResultRow | undefined> {
    await this._ensureReady();
    const stmt = this.db!.prepare('SELECT * FROM results WHERE file_num = ?');
    stmt.bind([fileNum]);
    if (stmt.step()) {
      const row = stmt.getAsObject() as unknown as ResultRow;
      stmt.free();
      return row;
    }
    stmt.free();
    return undefined;
  }

  async getResultPage(fileNum: number, pageIdx: number): Promise<ResultPage | undefined> {
    await this._ensureReady();
    const stmt = this.db!.prepare('SELECT * FROM pages WHERE file_num = ? AND page_idx = ?');
    stmt.bind([fileNum, pageIdx]);
    if (stmt.step()) {
      const row = stmt.getAsObject() as unknown as ResultPage;
      stmt.free();
      return row;
    }
    stmt.free();
    return undefined;
  }

  async getAllResultMetas(): Promise<ResultMeta[]> {
    await this._ensureReady();
    const result = this.db!.exec(
      'SELECT file_name, file_num, section, row_count, error FROM results ORDER BY file_num',
    );
    if (result.length === 0) return [];
    return result[0].values.map(row => ({
      file_name: row[0] as string,
      file_num: row[1] as number,
      section: row[2] as string,
      row_count: row[3] as number,
      error: row[4] as string | null,
    }));
  }

  async getAllResults(): Promise<(ResultRow & { rows: unknown[] })[]> {
    await this._ensureReady();
    const result = this.db!.exec(
      'SELECT file_num, file_name, section, columns, row_count, row_pages, error FROM results ORDER BY file_num',
    );
    if (result.length === 0) return [];

    return result[0].values.map(row => ({
      file_name: row[1] as string,
      file_num: row[0] as number,
      section: row[2] as string,
      columns: row[3] as string | null,
      row_count: row[4] as number,
      row_pages: row[5] as number,
      error: row[6] as string | null,
      rows: [] as unknown[],
    }));
  }

  /**
   * Lazily load data rows for a single result by file_num.
   * Use this instead of getAllResults().rows to avoid loading all data into memory at once.
   */
  async loadResultRows(fileNum: number): Promise<unknown[]> {
    await this._ensureReady();
    const pagesResult = this.db!.exec(
      'SELECT page_data FROM pages WHERE file_num = ? ORDER BY page_idx',
      [fileNum],
    );
    const rows: unknown[] = [];
    if (pagesResult.length > 0) {
      for (const pRow of pagesResult[0].values) {
        rows.push(...(JSON.parse(pRow[0] as string) as unknown[]));
      }
    }
    return rows;
  }

  async resultCount(): Promise<number> {
    await this._ensureReady();
    const result = this.db!.exec('SELECT COUNT(*) as count FROM results');
    if (result.length > 0 && result[0].values.length > 0) {
      return result[0].values[0][0] as number;
    }
    return 0;
  }

  // ==================== Progress ====================

  async setProgress(total: number, completed: number, status: string): Promise<void> {
    await this._ensureReady();
    this.db!.run(
      'INSERT OR REPLACE INTO progress (id, total, completed, status) VALUES (1, ?, ?, ?)',
      [total, completed, status],
    );
    this._save();
  }

  async getProgress(): Promise<Progress> {
    await this._ensureReady();
    const result = this.db!.exec('SELECT * FROM progress WHERE id = 1');
    if (result.length > 0 && result[0].values.length > 0) {
      const row = result[0].values[0];
      return { total: row[1] as number, completed: row[2] as number, status: row[3] as string };
    }
    return { total: 0, completed: 0, status: 'running' };
  }

  // ==================== Lifecycle ====================

  async close(): Promise<void> {
    await this._ensureReady();
    this._save();
    this.db!.close();
    this.db = null;
  }
}