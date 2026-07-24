"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerReportHandlers = registerReportHandlers;
const electron_1 = require("electron");
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const os_1 = __importDefault(require("os"));
const types_1 = require("../../shared/types");
const constants_1 = require("../../shared/constants");
const file_manager_1 = require("../services/file-manager");
const report_db_1 = require("../services/report-db");
const report_exporter_1 = require("../services/report-exporter");
// ReportDB LRU cache: reuse sql.js WASM instances instead of reloading from disk
const MAX_CACHED_DBS = 3;
const dbCache = new Map();
async function getReportDB(dbPath) {
    const cached = dbCache.get(dbPath);
    if (cached) {
        cached.lastUsed = Date.now();
        return cached.db;
    }
    // Evict LRU if cache is full
    if (dbCache.size >= MAX_CACHED_DBS) {
        let oldestKey = '';
        let oldestTime = Infinity;
        for (const [key, entry] of dbCache) {
            if (entry.lastUsed < oldestTime) {
                oldestTime = entry.lastUsed;
                oldestKey = key;
            }
        }
        if (oldestKey) {
            await dbCache.get(oldestKey).db.close();
            dbCache.delete(oldestKey);
        }
    }
    const db = new report_db_1.ReportDB(dbPath);
    dbCache.set(dbPath, { db, lastUsed: Date.now() });
    return db;
}
function registerReportHandlers(configStore) {
    electron_1.ipcMain.handle(types_1.IPC_CHANNELS.REPORT_LIST, (_event, filter) => {
        const resultPath = configStore.getResultPath();
        return file_manager_1.FileManager.listReports(resultPath, filter);
    });
    electron_1.ipcMain.handle(types_1.IPC_CHANNELS.REPORT_DELETE, (_event, ids) => {
        const resultPath = configStore.getResultPath();
        let deleted = 0;
        const errors = [];
        for (const id of ids) {
            // Decode the base64 filepath
            try {
                const filePath = Buffer.from(id, 'base64').toString('utf-8');
                if (file_manager_1.FileManager.deleteFile(filePath)) {
                    deleted++;
                }
                else {
                    errors.push(id);
                }
            }
            catch {
                errors.push(id);
            }
        }
        return {
            success: errors.length === 0,
            message: `已删除 ${deleted} 个报告${errors.length > 0 ? `，${errors.length} 个失败` : ''}`,
        };
    });
    electron_1.ipcMain.handle(types_1.IPC_CHANNELS.REPORT_READ, (_event, filePath) => {
        let content = file_manager_1.FileManager.readFile(filePath);
        if (content === null) {
            throw new Error(`报告文件不存在: ${filePath}`);
        }
        // Detect dbType from the report's parent directory
        const parentDir = path_1.default.basename(path_1.default.dirname(filePath));
        let dbType = '';
        for (const type of constants_1.SUPPORTED_DB_TYPES) {
            if (parentDir.toLowerCase() === type.toLowerCase()) {
                dbType = type;
                break;
            }
        }
        // Fix relative resource paths so they load correctly in the iframe preview
        if (dbType) {
            const libsDir = file_manager_1.FileManager.getReportTemplateLibsDir(dbType).replace(/\\/g, '/');
            content = content.replace(/(src|href)="\.\.\/report_template\/libs\//g, `$1="file:///${libsDir}/`);
        }
        return content;
    });
    electron_1.ipcMain.handle(types_1.IPC_CHANNELS.REPORT_EXPORT_PDF, async (_event, filePath) => {
        // For now, just verify the file exists
        // Full PDF export would require puppeteer or similar
        if (file_manager_1.FileManager.readFile(filePath) !== null) {
            return { success: true, outputPath: filePath };
        }
        return { success: false };
    });
    electron_1.ipcMain.handle(types_1.IPC_CHANNELS.REPORT_COMPARE, (_event, path1, path2) => {
        const content1 = file_manager_1.FileManager.readFile(path1);
        const content2 = file_manager_1.FileManager.readFile(path2);
        if (content1 === null || content2 === null) {
            throw new Error('一个或多个报告文件不存在');
        }
        // Return both contents for the renderer to handle comparison
        return JSON.stringify({ report1: content1, report2: content2 });
    });
    electron_1.ipcMain.handle('report:read-db-meta', async (_event, dbPath) => {
        if (!fs_1.default.existsSync(dbPath))
            return null;
        const db = await getReportDB(dbPath);
        const meta = await db.getMeta();
        return Object.fromEntries(meta);
    });
    electron_1.ipcMain.handle('report:read-db-results', async (_event, dbPath) => {
        if (!fs_1.default.existsSync(dbPath))
            return [];
        const db = await getReportDB(dbPath);
        return await db.getAllResults();
    });
    // Render .db report to a temp HTML file for in-app preview
    electron_1.ipcMain.handle('report:get-preview-url', async (_event, dbPath) => {
        if (!fs_1.default.existsSync(dbPath)) {
            throw new Error(`报告文件不存在: ${dbPath}`);
        }
        const db = await getReportDB(dbPath);
        const html = await (0, report_exporter_1.renderDbToHtml)(db, dbPath);
        // Write to temp file
        const tmpDir = os_1.default.tmpdir();
        const dbId = path_1.default.basename(dbPath, '.db');
        const tmpPath = path_1.default.join(tmpDir, `db-inspector-preview-${dbId}.html`);
        fs_1.default.writeFileSync(tmpPath, html, 'utf-8');
        return `file:///${tmpPath.replace(/\\/g, '/')}`;
    });
    electron_1.ipcMain.handle('report:render-db-to-html', async (_event, dbPath) => {
        if (!fs_1.default.existsSync(dbPath)) {
            throw new Error(`报告文件不存在: ${dbPath}`);
        }
        const db = await getReportDB(dbPath);
        return await (0, report_exporter_1.renderDbToHtml)(db, dbPath);
    });
    // Export .db report to HTML
    electron_1.ipcMain.handle('report:export-db-to-html', async (_event, dbPath) => {
        if (!fs_1.default.existsSync(dbPath)) {
            throw new Error(`报告文件不存在: ${dbPath}`);
        }
        const db = await getReportDB(dbPath);
        try {
            const htmlPath = await (0, report_exporter_1.exportDbToHtml)(db, dbPath);
            return { success: true, outputPath: htmlPath };
        }
        catch (err) {
            return { success: false, error: err.message };
        }
    });
    // Get specific results by file_num indices from .db (rows loaded lazily)
    electron_1.ipcMain.handle('report:get-results-by-indices', async (_event, dbPath, indices) => {
        if (!fs_1.default.existsSync(dbPath)) {
            throw new Error(`报告文件不存在: ${dbPath}`);
        }
        const db = await getReportDB(dbPath);
        const allResults = await db.getAllResults();
        const matched = allResults.filter((r) => {
            const match = r.file_name.match(/\d+/);
            const num = match ? parseInt(match[0], 10) : -1;
            return indices.includes(num);
        });
        // Load rows only for matched results
        const out = [];
        for (const r of matched) {
            const rows = await db.loadResultRows(r.file_num);
            out.push({ ...r, rows });
        }
        return out;
    });
    // Temp storage for AI section analysis results (cleared on app quit)
    const aiResultsCache = new Map();
    electron_1.ipcMain.handle('ai:cache-get', async (_event, key) => {
        return aiResultsCache.get(key) || null;
    });
    electron_1.ipcMain.handle('ai:cache-set', async (_event, key, value) => {
        aiResultsCache.set(key, value);
    });
}
//# sourceMappingURL=report.ipc.js.map