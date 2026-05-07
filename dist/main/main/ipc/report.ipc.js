"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerReportHandlers = registerReportHandlers;
const electron_1 = require("electron");
const path_1 = __importDefault(require("path"));
const types_1 = require("../../shared/types");
const constants_1 = require("../../shared/constants");
const file_manager_1 = require("../services/file-manager");
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
}
//# sourceMappingURL=report.ipc.js.map