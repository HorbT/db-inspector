import type { ReportMeta, ReportFilter, PluginManifest } from '../../shared/types';
export declare class FileManager {
    static getResourcesPath(): string;
    static getDbinspectionPath(dbType: string): string;
    static getSqlScriptsDir(dbType: string): string;
    static getReportTemplatePath(dbType: string): string;
    static getReportTemplateLibsDir(dbType: string): string;
    static ensureDir(dirPath: string): boolean;
    static loadPluginManifest(dbType: string): PluginManifest | null;
    static loadAllPluginManifests(): PluginManifest[];
    static listReports(resultPath: string, filter?: ReportFilter): ReportMeta[];
    private static _scanReportsRecursive;
    static readFile(filePath: string): string | null;
    static deleteFile(filePath: string): boolean;
    static copyDirectory(src: string, dest: string): boolean;
}
