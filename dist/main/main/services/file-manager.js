"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FileManager = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const electron_1 = require("electron");
const constants_1 = require("../../shared/constants");
class FileManager {
    static getResourcesPath() {
        if (electron_1.app.isPackaged) {
            return path_1.default.join(process.resourcesPath, 'resources');
        }
        return path_1.default.join(__dirname, '../../../../resources');
    }
    static getDbinspectionPath(dbType) {
        return path_1.default.join(this.getResourcesPath(), 'dbinspection', dbType);
    }
    static getSqlScriptsDir(dbType) {
        return path_1.default.join(this.getDbinspectionPath(dbType), 'sqlscripts');
    }
    static getReportTemplatePath(dbType) {
        return path_1.default.join(this.getDbinspectionPath(dbType), 'report_template', 'report_template.html');
    }
    static getReportTemplateLibsDir(dbType) {
        return path_1.default.join(this.getDbinspectionPath(dbType), 'report_template', 'libs');
    }
    static ensureDir(dirPath) {
        try {
            if (!fs_1.default.existsSync(dirPath)) {
                fs_1.default.mkdirSync(dirPath, { recursive: true });
            }
            return true;
        }
        catch (err) {
            console.error(`[FileManager] Failed to create directory ${dirPath}:`, err);
            return false;
        }
    }
    static loadPluginManifest(dbType) {
        try {
            const pluginsDir = electron_1.app.isPackaged
                ? path_1.default.join(__dirname, '../../../plugins') // app.asar/dist/plugins/
                : path_1.default.join(__dirname, '../../../../plugins'); // project root plugins/
            console.log(`[FileManager] Loading plugin '${dbType}' from: ${pluginsDir}`);
            console.log(`[FileManager] __dirname: ${__dirname}`);
            console.log(`[FileManager] isPackaged: ${electron_1.app.isPackaged}`);
            const manifestPath = path_1.default.join(pluginsDir, dbType, 'plugin.json');
            console.log(`[FileManager] Checking manifest: ${manifestPath}`);
            if (!fs_1.default.existsSync(manifestPath)) {
                console.warn(`[FileManager] Plugin manifest not found: ${manifestPath}`);
                return null;
            }
            const data = fs_1.default.readFileSync(manifestPath, 'utf-8');
            const manifest = JSON.parse(data);
            console.log(`[FileManager] Loaded plugin: ${manifest.id} (${manifest.name})`);
            return manifest;
        }
        catch (err) {
            console.error(`[FileManager] Failed to load plugin ${dbType}:`, err);
            return null;
        }
    }
    static loadAllPluginManifests() {
        const manifests = [];
        for (const dbType of constants_1.SUPPORTED_DB_TYPES) {
            const manifest = this.loadPluginManifest(dbType);
            if (manifest)
                manifests.push(manifest);
        }
        return manifests;
    }
    static async listReports(resultPath, filter) {
        if (!fs_1.default.existsSync(resultPath))
            return [];
        try {
            const reports = [];
            // Recursively scan resultPath for HTML and DB report files
            await this._scanReportsRecursive(resultPath, resultPath, reports);
            // Apply filters
            const filtered = reports.filter((r) => {
                if (filter) {
                    if (filter.dbType && r.dbType !== filter.dbType)
                        return false;
                    if (filter.keyword && !r.fileName.toLowerCase().includes(filter.keyword.toLowerCase()))
                        return false;
                    if (filter.dateFrom || filter.dateTo) {
                        const mtime = new Date(r.createdAt).toISOString().split('T')[0];
                        if (filter.dateFrom && mtime < filter.dateFrom)
                            return false;
                        if (filter.dateTo && mtime > filter.dateTo)
                            return false;
                    }
                }
                return true;
            });
            // Sort by creation time descending
            filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
            return filtered;
        }
        catch (err) {
            console.error('[FileManager] Failed to list reports:', err);
            return [];
        }
    }
    static async _scanReportsRecursive(basePath, dirPath, reports) {
        if (!fs_1.default.existsSync(dirPath))
            return;
        const entries = fs_1.default.readdirSync(dirPath, { withFileTypes: true });
        for (const entry of entries) {
            const fullPath = path_1.default.join(dirPath, entry.name);
            if (entry.isDirectory()) {
                // Recurse into subdirectories
                await this._scanReportsRecursive(basePath, fullPath, reports);
            }
            else if (entry.isFile() && entry.name.endsWith('.html')) {
                const stat = fs_1.default.statSync(fullPath);
                // Determine dbType from parent directory name
                let dbType = '';
                const parentDir = path_1.default.basename(path_1.default.dirname(fullPath));
                for (const type of constants_1.SUPPORTED_DB_TYPES) {
                    if (parentDir.toLowerCase() === type.toLowerCase()) {
                        dbType = type;
                        break;
                    }
                }
                // Fallback: try to detect dbType from path
                if (!dbType) {
                    for (const type of constants_1.SUPPORTED_DB_TYPES) {
                        if (fullPath.toLowerCase().includes(type.toLowerCase())) {
                            dbType = type;
                            break;
                        }
                    }
                }
                // Parse filename: {description}_{YYYYMMDDHHMMSS}.html or {description}_{YYYYMMDD}.html
                let description = '';
                const parts = entry.name.replace('.html', '').split('_');
                const timestampPart = parts[parts.length - 1];
                const isTimestamp = /^\d{8,14}$/.test(timestampPart);
                if (isTimestamp && parts.length > 1) {
                    description = parts.slice(0, -1).join('_');
                }
                else {
                    description = entry.name.replace('.html', '');
                }
                reports.push({
                    id: Buffer.from(fullPath).toString('base64'),
                    fileName: entry.name,
                    filePath: fullPath,
                    dbType: dbType || 'unknown',
                    description,
                    createdAt: stat.mtime.toISOString(),
                    fileSize: stat.size,
                });
            }
            else if (entry.isFile() && entry.name.endsWith('.db')) {
                // SQLite-based inspection report — parse metadata from filename to avoid
                // loading the entire SQLite database into WASM memory during scanning.
                const stat = fs_1.default.statSync(fullPath);
                const dbId = path_1.default.basename(fullPath, '.db');
                // Detect dbType from parent directory name (e.g. resultPath/mysql/xxx.db)
                let dbType = 'unknown';
                const parentDir = path_1.default.basename(path_1.default.dirname(fullPath));
                for (const type of constants_1.SUPPORTED_DB_TYPES) {
                    if (parentDir.toLowerCase() === type.toLowerCase()) {
                        dbType = type;
                        break;
                    }
                }
                // Filename format: {description}_{YYYY-MM-DD}T{HH-MM-SS}.db
                const tsMatch = dbId.match(/^(.+?)_(\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2})$/);
                let description;
                let createdAt;
                if (tsMatch) {
                    description = tsMatch[1];
                    // Convert filename timestamp to ISO: 2026-06-04T03-56-42 -> 2026-06-04T03:56:42
                    const parts = tsMatch[2].split('T');
                    const isoTime = parts[1].replace(/-/g, ':');
                    createdAt = new Date(`${parts[0]}T${isoTime}`).toISOString();
                }
                else {
                    description = dbId;
                    createdAt = stat.mtime.toISOString();
                }
                reports.push({
                    id: Buffer.from(fullPath).toString('base64'),
                    fileName: entry.name,
                    filePath: fullPath,
                    dbType,
                    description,
                    createdAt,
                    fileSize: stat.size,
                    dbId,
                });
            }
        }
    }
    static readFile(filePath) {
        try {
            if (!fs_1.default.existsSync(filePath))
                return null;
            return fs_1.default.readFileSync(filePath, 'utf-8');
        }
        catch (err) {
            console.error(`[FileManager] Failed to read file ${filePath}:`, err);
            return null;
        }
    }
    static deleteFile(filePath) {
        try {
            if (fs_1.default.existsSync(filePath)) {
                fs_1.default.unlinkSync(filePath);
            }
            return true;
        }
        catch (err) {
            console.error(`[FileManager] Failed to delete file ${filePath}:`, err);
            return false;
        }
    }
    static copyDirectory(src, dest) {
        try {
            if (!fs_1.default.existsSync(src))
                return false;
            this.ensureDir(dest);
            const entries = fs_1.default.readdirSync(src, { withFileTypes: true });
            for (const entry of entries) {
                const srcPath = path_1.default.join(src, entry.name);
                const destPath = path_1.default.join(dest, entry.name);
                if (entry.isDirectory()) {
                    this.copyDirectory(srcPath, destPath);
                }
                else {
                    fs_1.default.copyFileSync(srcPath, destPath);
                }
            }
            return true;
        }
        catch (err) {
            console.error(`[FileManager] Failed to copy directory ${src}:`, err);
            return false;
        }
    }
}
exports.FileManager = FileManager;
//# sourceMappingURL=file-manager.js.map