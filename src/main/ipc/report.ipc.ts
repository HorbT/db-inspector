import { ipcMain } from 'electron';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { IPC_CHANNELS } from '@shared/types';
import { SUPPORTED_DB_TYPES } from '@shared/constants';
import type { ReportFilter } from '@shared/types';
import type { ConfigStore } from '../services/config-store';
import { FileManager } from '../services/file-manager';
import { ReportDB } from '../services/report-db';
import { exportDbToHtml, renderDbToHtml } from '../services/report-exporter';

// ReportDB LRU cache: reuse sql.js WASM instances instead of reloading from disk
const MAX_CACHED_DBS = 3;
const dbCache = new Map<string, { db: ReportDB; lastUsed: number }>();

async function getReportDB(dbPath: string): Promise<ReportDB> {
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
      await dbCache.get(oldestKey)!.db.close();
      dbCache.delete(oldestKey);
    }
  }

  const db = new ReportDB(dbPath);
  dbCache.set(dbPath, { db, lastUsed: Date.now() });
  return db;
}

export function registerReportHandlers(configStore: ConfigStore): void {
  ipcMain.handle(IPC_CHANNELS.REPORT_LIST, (_event, filter?: ReportFilter) => {
    const resultPath = configStore.getResultPath();
    return FileManager.listReports(resultPath, filter);
  });

  ipcMain.handle(IPC_CHANNELS.REPORT_DELETE, (_event, ids: string[]) => {
    const resultPath = configStore.getResultPath();
    let deleted = 0;
    const errors: string[] = [];

    for (const id of ids) {
      // Decode the base64 filepath
      try {
        const filePath = Buffer.from(id, 'base64').toString('utf-8');
        if (FileManager.deleteFile(filePath)) {
          deleted++;
        } else {
          errors.push(id);
        }
      } catch {
        errors.push(id);
      }
    }

    return {
      success: errors.length === 0,
      message: `已删除 ${deleted} 个报告${errors.length > 0 ? `，${errors.length} 个失败` : ''}`,
    };
  });

  ipcMain.handle(IPC_CHANNELS.REPORT_READ, (_event, filePath: string) => {
    let content = FileManager.readFile(filePath);
    if (content === null) {
      throw new Error(`报告文件不存在: ${filePath}`);
    }

    // Detect dbType from the report's parent directory
    const parentDir = path.basename(path.dirname(filePath));
    let dbType = '';
    for (const type of SUPPORTED_DB_TYPES) {
      if (parentDir.toLowerCase() === type.toLowerCase()) {
        dbType = type;
        break;
      }
    }

    // Fix relative resource paths so they load correctly in the iframe preview
    if (dbType) {
      const libsDir = FileManager.getReportTemplateLibsDir(dbType).replace(/\\/g, '/');
      content = content.replace(
        /(src|href)="\.\.\/report_template\/libs\//g,
        `$1="file:///${libsDir}/`
      );
    }

    return content;
  });

  ipcMain.handle(IPC_CHANNELS.REPORT_EXPORT_PDF, async (_event, filePath: string) => {
    // For now, just verify the file exists
    // Full PDF export would require puppeteer or similar
    if (FileManager.readFile(filePath) !== null) {
      return { success: true, outputPath: filePath };
    }
    return { success: false };
  });

  ipcMain.handle(IPC_CHANNELS.REPORT_COMPARE, (_event, path1: string, path2: string) => {
    const content1 = FileManager.readFile(path1);
    const content2 = FileManager.readFile(path2);
    if (content1 === null || content2 === null) {
      throw new Error('一个或多个报告文件不存在');
    }
    // Return both contents for the renderer to handle comparison
    return JSON.stringify({ report1: content1, report2: content2 });
  });

  ipcMain.handle('report:read-db-meta', async (_event, dbPath: string) => {
    if (!fs.existsSync(dbPath)) return null;
    const db = await getReportDB(dbPath);
    const meta = await db.getMeta();
    return Object.fromEntries(meta);
  });

  ipcMain.handle('report:read-db-results', async (_event, dbPath: string) => {
    if (!fs.existsSync(dbPath)) return [];
    const db = await getReportDB(dbPath);
    return await db.getAllResults();
  });

  // Render .db report to a temp HTML file for in-app preview
  ipcMain.handle('report:get-preview-url', async (_event, dbPath: string) => {
    if (!fs.existsSync(dbPath)) {
      throw new Error(`报告文件不存在: ${dbPath}`);
    }
    const db = await getReportDB(dbPath);
    const html = await renderDbToHtml(db, dbPath);
    // Write to temp file
    const tmpDir = os.tmpdir();
    const dbId = path.basename(dbPath, '.db');
    const tmpPath = path.join(tmpDir, `db-inspector-preview-${dbId}.html`);
    fs.writeFileSync(tmpPath, html, 'utf-8');
    return `file:///${tmpPath.replace(/\\/g, '/')}`;
  });
  ipcMain.handle('report:render-db-to-html', async (_event, dbPath: string) => {
    if (!fs.existsSync(dbPath)) {
      throw new Error(`报告文件不存在: ${dbPath}`);
    }
    const db = await getReportDB(dbPath);
    return await renderDbToHtml(db, dbPath);
  });

  // Export .db report to HTML
  ipcMain.handle('report:export-db-to-html', async (_event, dbPath: string) => {
    if (!fs.existsSync(dbPath)) {
      throw new Error(`报告文件不存在: ${dbPath}`);
    }
    const db = await getReportDB(dbPath);
    try {
      const htmlPath = await exportDbToHtml(db, dbPath);
      return { success: true, outputPath: htmlPath };
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  });

  // Get specific results by file_num indices from .db (rows loaded lazily)
  ipcMain.handle('report:get-results-by-indices', async (_event, dbPath: string, indices: number[]) => {
    if (!fs.existsSync(dbPath)) {
      throw new Error(`报告文件不存在: ${dbPath}`);
    }
    const db = await getReportDB(dbPath);
    const allResults = await db.getAllResults();
    const matched = allResults.filter((r: { file_name: string }) => {
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
  const aiResultsCache = new Map<string, string>();

  ipcMain.handle('ai:cache-get', async (_event, key: string) => {
    return aiResultsCache.get(key) || null;
  });

  ipcMain.handle('ai:cache-set', async (_event, key: string, value: string) => {
    aiResultsCache.set(key, value);
  });
}
