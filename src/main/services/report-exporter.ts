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

  // Get results and replace numbered placeholders
  const results = await db.getAllResults();

  for (const r of results) {
    const rows = await db.loadResultRows(r.file_num);
    const resultHtml = resultToHtml(r.file_name, r.columns, rows, r.error);
    const fileNum = extractFileNumber(r.file_name);

    if (fileNum >= 0) {
      const dbPlaceholder = `{{ result_${fileNum} }}`;
      html = html.replace(new RegExp(escapeRegex(dbPlaceholder), 'g'), resultHtml);
      const sbPlaceholder = `{ result_${fileNum} }`;
      html = html.replace(new RegExp(escapeRegex(sbPlaceholder), 'g'), resultHtml);
    }
  }

  // Clear unmatched placeholders
  html = html.replace(/\{\{\s*result_\d+\s*\}\}/g, '');
  html = html.replace(/\{\s*result_\d+\s*\}/g, '');

  // If {{results}} exists, insert all results there
  if (html.includes('{{results}}')) {
    const parts: string[] = [];
    for (const r of results) {
      const rows = await db.loadResultRows(r.file_num);
      parts.push(resultToHtml(r.file_name, r.columns, rows, r.error));
    }
    html = html.replace('{{results}}', parts.join('\n'));
  }

  // Inject AI analysis script (before </body>)
  const injectScriptPath = path.join(FileManager.getResourcesPath(), 'dbinspection', 'ai-analysis-inject.js');
  const injectScriptUrl = `file:///${injectScriptPath.replace(/\\/g, '/')}`;
  html = html.replace('</body>', `<script src="${injectScriptUrl}"></script></body>`);

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

function resultToHtml(
  fileName: string,
  columnsJson: string | null,
  rows: unknown[],
  error: string | null,
): string {
  const fileNum = extractFileNumber(fileName);
  const parts = [`<div class="result-section" data-result-index="${fileNum}">`];

  if (error) {
    parts.push(`<p class="error">错误: ${escapeHtml(error)} (来源: ${escapeHtml(fileName)})</p>`);
  } else if (columnsJson) {
    const columns: string[] = JSON.parse(columnsJson);
    if (!Array.isArray(columns) || columns.length === 0) {
      parts.push(`<p>(${escapeHtml(fileName)}) 无表格数据</p>`);
    } else {
      parts.push('<table>');
      parts.push('<tr>');
      for (const col of columns) {
        parts.push(`<th>${escapeHtml(String(col))}</th>`);
      }
      parts.push('</tr>');
      if (rows.length > 0) {
        for (const row of rows) {
          parts.push('<tr>');
          if (Array.isArray(row)) {
            for (const cell of row) {
              if (cell === null) {
                parts.push('<td></td>');
              } else {
                parts.push(`<td>${String(cell)}</td>`);
              }
            }
          }
          parts.push('</tr>');
        }
      } else {
        parts.push(`<tr><td colspan="${columns.length}" style="text-align:center">无数据</td></tr>`);
      }
      parts.push('</table>');
    }
  } else {
    parts.push(`<p>(${escapeHtml(fileName)}) 无表格数据</p>`);
  }

  parts.push('</div>');
  return parts.join('\n');
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
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