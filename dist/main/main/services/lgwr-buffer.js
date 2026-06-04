"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LgwrBuffer = void 0;
class LgwrBuffer {
    constructor(db) {
        this.db = db;
        this.total = 0;
        this.completed = 0;
    }
    /** Push a single SQL result into the buffer, written immediately to SQLite */
    async push(payload) {
        this.completed++;
        await this.db.setResult(payload.fileNum, payload.fileName, payload.section || '', payload.columns || null, payload.rows || [], payload.error || null);
        await this.db.setProgress(this.total, this.completed, 'running');
    }
    /** Set the total number of expected results */
    async setTotal(total) {
        this.total = total;
        await this.db.setProgress(total, this.completed, 'running');
    }
    /** Finalize the inspection, writing final progress status */
    async finalize(status, overrideTotal) {
        if (overrideTotal !== undefined) {
            this.total = overrideTotal;
        }
        if (this.total === 0) {
            this.total = this.completed;
        }
        await this.db.setProgress(this.total, this.completed, status);
    }
}
exports.LgwrBuffer = LgwrBuffer;
//# sourceMappingURL=lgwr-buffer.js.map