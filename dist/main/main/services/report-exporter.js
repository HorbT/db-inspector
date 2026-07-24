"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.renderDbToHtml = renderDbToHtml;
exports.exportDbToHtml = exportDbToHtml;
const file_manager_1 = require("./file-manager");
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
/**
 * Render a .db inspection report to HTML string using the template for the db_type.
 * Relative resource paths are converted to absolute file:/// URLs for iframe display.
 */
async function renderDbToHtml(db, dbPath) {
    const meta = await db.getMeta();
    const dbType = meta.get('db_type') || 'mysql';
    const description = meta.get('description') || '巡检报告';
    const serverInfo = meta.get('server_info') || '';
    // Load template
    const templatePath = file_manager_1.FileManager.getReportTemplatePath(dbType);
    let html;
    if (fs_1.default.existsSync(templatePath)) {
        html = fs_1.default.readFileSync(templatePath, 'utf-8');
    }
    else {
        html = getDefaultTemplate();
    }
    // Replace meta placeholders
    const generatedTime = meta.get('generated_time') || new Date().toLocaleString('zh-CN');
    html = html.replace(/\{\{generated_time\}\}/g, generatedTime);
    html = html.replace(/\{\{\s*description\s*\}\}/g, description);
    html = html.replace(/\{\{server_info\}\}/g, serverInfo);
    // Fix relative resource paths for local file viewing (iframe/file protocol)
    const libsDir = file_manager_1.FileManager.getReportTemplateLibsDir(dbType).replace(/\\/g, '/');
    html = html.replace(/(src|href)="\.\.\/report_template\/libs\//g, `$1="file:///${libsDir}/`);
    // Get results and embed as JSON for lazy rendering
    const results = await db.getAllResults();
    const resultData = [];
    for (const r of results) {
        const rows = await db.loadResultRows(r.file_num);
        const fileNum = extractFileNumber(r.file_name);
        resultData.push({
            fileNum,
            fileName: r.file_name,
            columns: r.columns,
            rows,
            error: r.error,
        });
    }
    // Replace all { result_N } and {{ result_N }} placeholders with empty divs
    // that have data-result-num attributes for lazy rendering
    html = html.replace(/\{\{\s*result_(\d+)\s*\}\}/g, '<div class="result-placeholder" data-result-num="$1"></div>');
    html = html.replace(/\{\s*result_(\d+)\s*\}/g, '<div class="result-placeholder" data-result-num="$1"></div>');
    // Handle {{results}} placeholder in default template
    if (html.includes('{{results}}')) {
        const parts = [];
        for (const item of resultData) {
            parts.push(`<div class="result-placeholder" data-result-num="${item.fileNum}"></div>`);
        }
        html = html.replace('{{results}}', parts.join('\n'));
    }
    // Embed result data as Base64-encoded JSON to avoid any special character issues
    const jsonData = Buffer.from(JSON.stringify(resultData)).toString('base64');
    const dataScript = `<script id="report-data" type="application/base64">${jsonData}</script>`;
    // Read lazy render script and embed it inline (avoids file:// loading issues in iframe)
    const renderScriptPath = path_1.default.join(file_manager_1.FileManager.getResourcesPath(), 'dbinspection', 'report-lazy-render.js');
    let renderScript = '';
    if (fs_1.default.existsSync(renderScriptPath)) {
        renderScript = fs_1.default.readFileSync(renderScriptPath, 'utf-8');
    }
    // Read AI analysis inject script
    const injectScriptPath = path_1.default.join(file_manager_1.FileManager.getResourcesPath(), 'dbinspection', 'ai-analysis-inject.js');
    let injectScript = '';
    if (fs_1.default.existsSync(injectScriptPath)) {
        injectScript = fs_1.default.readFileSync(injectScriptPath, 'utf-8');
    }
    // Inject all scripts inline before </body>
    html = html.replace('</body>', `${dataScript}<script>${renderScript}</script><script>${injectScript}</script></body>`);
    return html;
}
/**
 * Export a .db inspection report to an HTML file on disk.
 * Returns the path to the generated HTML file.
 */
async function exportDbToHtml(db, dbPath) {
    const html = await renderDbToHtml(db, dbPath);
    const htmlPath = dbPath.replace(/\.db$/, '.html');
    fs_1.default.writeFileSync(htmlPath, html, 'utf-8');
    return htmlPath;
}
function extractFileNumber(fileName) {
    const match = fileName.match(/(\d+)/);
    return match ? parseInt(match[1], 10) : -1;
}
function getDefaultTemplate() {
    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <title>数据库巡检报告</title>
  <style>
    body { font-family: 'Microsoft YaHei', sans-serif; padding: 20px; color: #333; }
    h1 { color: #2c3e50; border-bottom: 2px solid #3498db; padding-bottom: 10px; }
    table { border-collapse: collapse; width: 100%; margin: 1em 0; }
    th, td { border: 1px solid #ddd; padding: 8px 12px; text-align: left; }
    th { background-color: #3498db; color: white; }
    tr:nth-child(even) { background-color: #f8f9fa; }
    .error { color: #e74c3c; font-weight: bold; }
    .result-section { margin-bottom: 30px; padding: 15px; background: #f9f9f9; border-radius: 5px; }
  </style>
</head>
<body>
  <h1>数据库巡检报告</h1>
  <p>生成时间: {{generated_time}}</p>
  {{results}}
</body></html>`;
}
//# sourceMappingURL=report-exporter.js.map