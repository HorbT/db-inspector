"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateConnection = validateConnection;
exports.generateConnectionId = generateConnectionId;
exports.generateReportId = generateReportId;
exports.isValidPort = isValidPort;
exports.formatFileSize = formatFileSize;
function validateConnection(config, fields) {
    for (const field of fields) {
        if (!field.required)
            continue;
        const value = config[field.name];
        if (!value || (typeof value === 'string' && !value.trim())) {
            return `${field.label}不能为空`;
        }
    }
    const port = config.port;
    if (port !== undefined && (typeof port !== 'number' || port < 1 || port > 65535)) {
        return '端口号必须在1-65535之间';
    }
    if (!config.dbType) {
        return '请选择数据库类型';
    }
    if (!config.description || !config.description.trim()) {
        return '请填写连接描述';
    }
    return null;
}
function generateConnectionId() {
    return `conn_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}
function generateReportId() {
    return `report_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}
function isValidPort(port) {
    return typeof port === 'number' && port > 0 && port <= 65535;
}
function formatFileSize(bytes) {
    if (bytes < 1024)
        return `${bytes} B`;
    if (bytes < 1024 * 1024)
        return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
//# sourceMappingURL=validators.js.map