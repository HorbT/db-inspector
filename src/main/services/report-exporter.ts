import type { ReportDB } from './report-db';
import { FileManager } from './file-manager';
import path from 'path';
import fs from 'fs';

/**
 * Render a .db inspection report to HTML string using the template for the db_type.
 * Relative resource paths are converted to absolute file:/// URLs for iframe display.
 */
export async function renderDbToHtml(db: ReportDB, dbPath: string): Promise<string> {
  const meta = await db.getMeta();
  const dbType = meta.get('db_type') || 'mysql';
  const description = meta.get('description') || '巡检报告';
  const serverInfo = meta.get('server_info') || '';

  // Load template
  const templatePath = FileManager.getReportTemplatePath(dbType);
  let html: string;
  if (fs.existsSync(templatePath)) {
    html = fs.readFileSync(templatePath, 'utf-8');
  } else {
    html = getDefaultTemplate();
  }

  // Replace meta placeholders
  const generatedTime = meta.get('generated_time') || new Date().toLocaleString('zh-CN');
  html = html.replace(/\{\{generated_time\}\}/g, generatedTime);
  html = html.replace(/\{\{\s*description\s*\}\}/g, description);
  html = html.replace(/\{\{server_info\}\}/g, serverInfo);

  // Fix relative resource paths for local file viewing (iframe/file protocol)
  const libsDir = FileManager.getReportTemplateLibsDir(dbType).replace(/\\/g, '/');
  html = html.replace(
    /(src|href)="\.\.\/report_template\/libs\//g,
    `$1="file:///${libsDir}/`
  );

  // Get results and embed as JSON for lazy rendering
  const results = await db.getAllResults();
  const resultData: Array<{
    fileNum: number;
    fileName: string;
    columns: string | null;
    rows: unknown[];
    error: string | null;
  }> = [];

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
  html = html.replace(
    /\{\{\s*result_(\d+)\s*\}\}/g,
    '<div class="result-placeholder" data-result-num="$1"></div>'
  );
  html = html.replace(
    /\{\s*result_(\d+)\s*\}/g,
    '<div class="result-placeholder" data-result-num="$1"></div>'
  );

  // Handle {{results}} placeholder in default template
  if (html.includes('{{results}}')) {
    const parts: string[] = [];
    for (const item of resultData) {
      parts.push(`<div class="result-placeholder" data-result-num="${item.fileNum}"></div>`);
    }
    html = html.replace('{{results}}', parts.join('\n'));
  }

  // Embed result data as Base64-encoded JSON to avoid any special character issues
  const jsonData = Buffer.from(JSON.stringify(resultData)).toString('base64');
  const dataScript = `<script id="report-data" type="application/base64">${jsonData}</script>`;

  // Read lazy render script and embed it inline (avoids file:// loading issues in iframe)
  const renderScriptPath = path.join(FileManager.getResourcesPath(), 'dbinspection', 'report-lazy-render.js');
  let renderScript = '';
  if (fs.existsSync(renderScriptPath)) {
    renderScript = fs.readFileSync(renderScriptPath, 'utf-8');
  }

  // Read AI analysis inject script
  const injectScriptPath = path.join(FileManager.getResourcesPath(), 'dbinspection', 'ai-analysis-inject.js');
  let injectScript = '';
  if (fs.existsSync(injectScriptPath)) {
    injectScript = fs.readFileSync(injectScriptPath, 'utf-8');
  }

  // Inject all scripts inline before </body>
  html = html.replace('</body>',
    `${dataScript}<script>${renderScript}</script><script>${injectScript}</script></body>`
  );

  return html;
}

/**
 * Export a .db inspection report to an HTML file on disk.
 * Returns the path to the generated HTML file.
 */
export async function exportDbToHtml(db: ReportDB, dbPath: string): Promise<string> {
  const html = await renderDbToHtml(db, dbPath);
  const htmlPath = dbPath.replace(/\.db$/, '.html');
  fs.writeFileSync(htmlPath, html, 'utf-8');
  return htmlPath;
}

function extractFileNumber(fileName: string): number {
  const match = fileName.match(/(\d+)/);
  return match ? parseInt(match[1], 10) : -1;
}


function getDefaultTemplate(): string {
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