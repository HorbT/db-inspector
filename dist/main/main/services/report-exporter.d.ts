import type { ReportDB } from './report-db';
/**
 * Render a .db inspection report to HTML string using the template for the db_type.
 * Relative resource paths are converted to absolute file:/// URLs for iframe display.
 */
export declare function renderDbToHtml(db: ReportDB, dbPath: string): Promise<string>;
/**
 * Export a .db inspection report to an HTML file on disk.
 * Returns the path to the generated HTML file.
 */
export declare function exportDbToHtml(db: ReportDB, dbPath: string): Promise<string>;
