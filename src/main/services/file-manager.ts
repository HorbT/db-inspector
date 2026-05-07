import fs from 'fs';
import path from 'path';
import { app } from 'electron';
import type { ReportMeta, ReportFilter, PluginManifest } from '@shared/types';
import { SUPPORTED_DB_TYPES, RESOURCES_BASE_PATH } from '@shared/constants';

export class FileManager {
  static getResourcesPath(): string {
    if (app.isPackaged) {
      return path.join(process.resourcesPath, 'resources');
    }
    return path.join(__dirname, '../../../../resources');
  }

  static getDbinspectionPath(dbType: string): string {
    return path.join(this.getResourcesPath(), 'dbinspection', dbType);
  }

  static getSqlScriptsDir(dbType: string): string {
    return path.join(this.getDbinspectionPath(dbType), 'sqlscripts');
  }

  static getReportTemplatePath(dbType: string): string {
    return path.join(this.getDbinspectionPath(dbType), 'report_template', 'report_template.html');
  }

  static getReportTemplateLibsDir(dbType: string): string {
    return path.join(this.getDbinspectionPath(dbType), 'report_template', 'libs');
  }

  static ensureDir(dirPath: string): boolean {
    try {
      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
      }
      return true;
    } catch (err) {
      console.error(`[FileManager] Failed to create directory ${dirPath}:`, err);
      return false;
    }
  }

  static loadPluginManifest(dbType: string): PluginManifest | null {
    try {
      const pluginsDir = app.isPackaged
        ? path.join(__dirname, '../../../plugins')    // app.asar/dist/plugins/
        : path.join(__dirname, '../../../../plugins'); // project root plugins/

      console.log(`[FileManager] Loading plugin '${dbType}' from: ${pluginsDir}`);
      console.log(`[FileManager] __dirname: ${__dirname}`);
      console.log(`[FileManager] isPackaged: ${app.isPackaged}`);

      const manifestPath = path.join(pluginsDir, dbType, 'plugin.json');
      console.log(`[FileManager] Checking manifest: ${manifestPath}`);

      if (!fs.existsSync(manifestPath)) {
        console.warn(`[FileManager] Plugin manifest not found: ${manifestPath}`);
        return null;
      }
      const data = fs.readFileSync(manifestPath, 'utf-8');
      const manifest = JSON.parse(data) as PluginManifest;
      console.log(`[FileManager] Loaded plugin: ${manifest.id} (${manifest.name})`);
      return manifest;
    } catch (err) {
      console.error(`[FileManager] Failed to load plugin ${dbType}:`, err);
      return null;
    }
  }

  static loadAllPluginManifests(): PluginManifest[] {
    const manifests: PluginManifest[] = [];
    for (const dbType of SUPPORTED_DB_TYPES) {
      const manifest = this.loadPluginManifest(dbType);
      if (manifest) manifests.push(manifest);
    }
    return manifests;
  }

  static listReports(resultPath: string, filter?: ReportFilter): ReportMeta[] {
    if (!fs.existsSync(resultPath)) return [];

    try {
      const reports: ReportMeta[] = [];

      // Recursively scan resultPath for HTML report files
      this._scanReportsRecursive(resultPath, resultPath, reports);

      // Apply filters
      const filtered = reports.filter((r) => {
        if (filter) {
          if (filter.dbType && r.dbType !== filter.dbType) return false;
          if (filter.keyword && !r.fileName.toLowerCase().includes(filter.keyword.toLowerCase())) return false;
          if (filter.dateFrom || filter.dateTo) {
            const mtime = new Date(r.createdAt).toISOString().split('T')[0];
            if (filter.dateFrom && mtime < filter.dateFrom) return false;
            if (filter.dateTo && mtime > filter.dateTo) return false;
          }
        }
        return true;
      });

      // Sort by creation time descending
      filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      return filtered;
    } catch (err) {
      console.error('[FileManager] Failed to list reports:', err);
      return [];
    }
  }

  private static _scanReportsRecursive(basePath: string, dirPath: string, reports: ReportMeta[]): void {
    if (!fs.existsSync(dirPath)) return;

    const entries = fs.readdirSync(dirPath, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);

      if (entry.isDirectory()) {
        // Recurse into subdirectories
        this._scanReportsRecursive(basePath, fullPath, reports);
      } else if (entry.isFile() && entry.name.endsWith('.html')) {
        const stat = fs.statSync(fullPath);

        // Determine dbType from parent directory name
        let dbType = '';
        const parentDir = path.basename(path.dirname(fullPath));
        for (const type of SUPPORTED_DB_TYPES) {
          if (parentDir.toLowerCase() === type.toLowerCase()) {
            dbType = type;
            break;
          }
        }
        // Fallback: try to detect dbType from path
        if (!dbType) {
          for (const type of SUPPORTED_DB_TYPES) {
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
        } else {
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
    }
  }

  static readFile(filePath: string): string | null {
    try {
      if (!fs.existsSync(filePath)) return null;
      return fs.readFileSync(filePath, 'utf-8');
    } catch (err) {
      console.error(`[FileManager] Failed to read file ${filePath}:`, err);
      return null;
    }
  }

  static deleteFile(filePath: string): boolean {
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      return true;
    } catch (err) {
      console.error(`[FileManager] Failed to delete file ${filePath}:`, err);
      return false;
    }
  }

  static copyDirectory(src: string, dest: string): boolean {
    try {
      if (!fs.existsSync(src)) return false;
      this.ensureDir(dest);

      const entries = fs.readdirSync(src, { withFileTypes: true });
      for (const entry of entries) {
        const srcPath = path.join(src, entry.name);
        const destPath = path.join(dest, entry.name);

        if (entry.isDirectory()) {
          this.copyDirectory(srcPath, destPath);
        } else {
          fs.copyFileSync(srcPath, destPath);
        }
      }
      return true;
    } catch (err) {
      console.error(`[FileManager] Failed to copy directory ${src}:`, err);
      return false;
    }
  }
}
