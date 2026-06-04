"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReportDB = void 0;
const sql_js_1 = __importDefault(require("sql.js"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const ROWS_PER_PAGE = 200;
let SQL = null;
async function getSQL() {
    if (!SQL) {
        SQL = await (0, sql_js_1.default)();
    }
    return SQL;
}
class ReportDB {
    constructor(dbPath) {
        this.db = null;
        this.dbPath = dbPath;
        const dir = path_1.default.dirname(dbPath);
        if (!fs_1.default.existsSync(dir)) {
            fs_1.default.mkdirSync(dir, { recursive: true });
        }
        this._ready = this._init();
    }
    async _init() {
        const sql = await getSQL();
        // Load existing DB or create new
        if (fs_1.default.existsSync(this.dbPath)) {
            const buffer = fs_1.default.readFileSync(this.dbPath);
            this.db = new sql.Database(buffer);
        }
        else {
            this.db = new sql.Database();
        }
        this.db.run('PRAGMA journal_mode = WAL');
        this._initTables();
    }
    async _ensureReady() {
        await this._ready;
    }
    _initTables() {
        this.db.run(`
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
    _save() {
        if (this.db) {
            const data = this.db.export();
            fs_1.default.writeFileSync(this.dbPath, Buffer.from(data));
        }
    }
    // ==================== Meta ====================
    async setMeta(key, value) {
        await this._ensureReady();
        this.db.run('INSERT OR REPLACE INTO meta (key, value) VALUES (?, ?)', [key, value]);
        this._save();
    }
    async setMetaBatch(entries) {
        await this._ensureReady();
        for (const { key, value } of entries) {
            this.db.run('INSERT OR REPLACE INTO meta (key, value) VALUES (?, ?)', [key, value]);
        }
        this._save();
    }
    async getMeta() {
        await this._ensureReady();
        const result = this.db.exec('SELECT key, value FROM meta');
        const map = new Map();
        if (result.length > 0) {
            for (const row of result[0].values) {
                map.set(row[0], row[1]);
            }
        }
        return map;
    }
    // ==================== Results ====================
    async setResult(fileNum, fileName, section, columns, rows, error) {
        await this._ensureReady();
        const rowCount = rows.length;
        const rowPages = Math.ceil(rowCount / ROWS_PER_PAGE);
        const columnsJson = columns ? JSON.stringify(columns) : null;
        // Upsert result
        this.db.run(`INSERT OR REPLACE INTO results (file_num, file_name, section, columns, row_count, row_pages, error)
       VALUES (?, ?, ?, ?, ?, ?, ?)`, [fileNum, fileName, section, columnsJson, rowCount, rowPages, error || null]);
        // Write pages
        for (let p = 0; p < rowPages; p++) {
            const slice = rows.slice(p * ROWS_PER_PAGE, (p + 1) * ROWS_PER_PAGE);
            this.db.run('INSERT OR REPLACE INTO pages (file_num, page_idx, page_data) VALUES (?, ?, ?)', [fileNum, p, JSON.stringify(slice)]);
        }
        this._save();
    }
    async getResult(fileNum) {
        await this._ensureReady();
        const stmt = this.db.prepare('SELECT * FROM results WHERE file_num = ?');
        stmt.bind([fileNum]);
        if (stmt.step()) {
            const row = stmt.getAsObject();
            stmt.free();
            return row;
        }
        stmt.free();
        return undefined;
    }
    async getResultPage(fileNum, pageIdx) {
        await this._ensureReady();
        const stmt = this.db.prepare('SELECT * FROM pages WHERE file_num = ? AND page_idx = ?');
        stmt.bind([fileNum, pageIdx]);
        if (stmt.step()) {
            const row = stmt.getAsObject();
            stmt.free();
            return row;
        }
        stmt.free();
        return undefined;
    }
    async getAllResultMetas() {
        await this._ensureReady();
        const result = this.db.exec('SELECT file_name, file_num, section, row_count, error FROM results ORDER BY file_num');
        if (result.length === 0)
            return [];
        return result[0].values.map(row => ({
            file_name: row[0],
            file_num: row[1],
            section: row[2],
            row_count: row[3],
            error: row[4],
        }));
    }
    async getAllResults() {
        await this._ensureReady();
        const result = this.db.exec('SELECT * FROM results ORDER BY file_num');
        if (result.length === 0)
            return [];
        const out = [];
        for (const row of result[0].values) {
            const r = {
                file_name: row[1],
                file_num: row[0],
                section: row[2],
                columns: row[3],
                row_count: row[4],
                row_pages: row[5],
                error: row[6],
            };
            const pagesResult = this.db.exec('SELECT page_data FROM pages WHERE file_num = ? ORDER BY page_idx', [r.file_num]);
            const rows = [];
            if (pagesResult.length > 0) {
                for (const pRow of pagesResult[0].values) {
                    rows.push(...JSON.parse(pRow[0]));
                }
            }
            out.push({ ...r, rows });
        }
        return out;
    }
    async resultCount() {
        await this._ensureReady();
        const result = this.db.exec('SELECT COUNT(*) as count FROM results');
        if (result.length > 0 && result[0].values.length > 0) {
            return result[0].values[0][0];
        }
        return 0;
    }
    // ==================== Progress ====================
    async setProgress(total, completed, status) {
        await this._ensureReady();
        this.db.run('INSERT OR REPLACE INTO progress (id, total, completed, status) VALUES (1, ?, ?, ?)', [total, completed, status]);
        this._save();
    }
    async getProgress() {
        await this._ensureReady();
        const result = this.db.exec('SELECT * FROM progress WHERE id = 1');
        if (result.length > 0 && result[0].values.length > 0) {
            const row = result[0].values[0];
            return { total: row[1], completed: row[2], status: row[3] };
        }
        return { total: 0, completed: 0, status: 'running' };
    }
    // ==================== Lifecycle ====================
    async close() {
        await this._ensureReady();
        this._save();
        this.db.close();
        this.db = null;
    }
}
exports.ReportDB = ReportDB;
//# sourceMappingURL=report-db.js.map