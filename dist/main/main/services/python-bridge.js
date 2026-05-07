"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PythonBridge = void 0;
const child_process_1 = require("child_process");
const path_1 = __importDefault(require("path"));
const electron_1 = require("electron");
const PYTHON_BRIDGE_TIMEOUT = 7200000;
const PYTHON_STARTUP_TIMEOUT = 10000;
class PythonBridge {
    constructor() {
        this.process = null;
        this.requestId = 0;
        this.pendingRequests = new Map();
        this.buffer = '';
        this.isRunning = false;
        this.startPromise = null;
        this.debugCallback = null;
    }
    /** Register a callback for real-time debug lines from Python stderr */
    onDebugLine(callback) {
        this.debugCallback = callback;
    }
    static getInstance() {
        if (!PythonBridge.instance) {
            PythonBridge.instance = new PythonBridge();
        }
        return PythonBridge.instance;
    }
    getPythonCommand() {
        if (process.platform === 'win32') {
            // Try to find Python
            const possiblePaths = [
                'python',
                'python3',
                path_1.default.join(process.env.LOCALAPPDATA || '', 'Programs', 'Python', 'Python312', 'python.exe'),
                path_1.default.join(process.env.LOCALAPPDATA || '', 'Programs', 'Python', 'Python311', 'python.exe'),
                path_1.default.join(process.env.ProgramFiles || '', 'Python312', 'python.exe'),
                path_1.default.join(process.env.ProgramFiles || '', 'Python311', 'python.exe'),
            ];
            return possiblePaths[0]; // Default to python from PATH
        }
        return 'python3';
    }
    getServerPath() {
        if (electron_1.app.isPackaged) {
            return path_1.default.join(process.resourcesPath, 'python-backend', 'server.py');
        }
        return path_1.default.join(__dirname, '../../../../python-backend/server.py');
    }
    async start() {
        if (this.isRunning)
            return;
        if (this.startPromise)
            return this.startPromise;
        this.startPromise = new Promise((resolve) => {
            const pythonCmd = this.getPythonCommand();
            const serverPath = this.getServerPath();
            console.log(`[PythonBridge] Starting: ${pythonCmd} ${serverPath}`);
            const cleanup = () => {
                this.startPromise = null;
                resolve();
            };
            try {
                this.process = (0, child_process_1.spawn)(pythonCmd, [serverPath], {
                    stdio: ['pipe', 'pipe', 'pipe'],
                    env: {
                        ...process.env,
                        PYTHONUNBUFFERED: '1',
                        PYTHONIOENCODING: 'utf-8',
                    },
                });
                this.isRunning = true;
                this.process.stdout?.on('data', (data) => {
                    this.buffer += data.toString('utf-8');
                    this.processBuffer();
                });
                this.process.stderr?.on('data', (data) => {
                    const text = data.toString('utf-8');
                    // Forward debug lines to the callback in real-time
                    const lines = text.split('\n');
                    for (const line of lines) {
                        const trimmed = line.trim();
                        if (trimmed.startsWith('[DBG]') && this.debugCallback) {
                            this.debugCallback(trimmed.substring(5).trim());
                        }
                        else if (trimmed) {
                            console.error('[PythonBridge stderr]', trimmed);
                        }
                    }
                });
                this.process.on('close', (code) => {
                    console.log(`[PythonBridge] Process exited with code ${code}`);
                    this.isRunning = false;
                    this.process = null;
                    for (const [, handlers] of this.pendingRequests) {
                        handlers.reject(new Error(`Python process exited with code ${code}`));
                    }
                    this.pendingRequests.clear();
                    cleanup();
                });
                this.process.on('error', (err) => {
                    console.error('[PythonBridge] Process error:', err);
                    this.isRunning = false;
                    this.process = null;
                    cleanup();
                });
                // Resolve after startup timeout regardless of state
                setTimeout(cleanup, PYTHON_STARTUP_TIMEOUT);
            }
            catch (err) {
                console.error('[PythonBridge] Failed to spawn process:', err);
                this.isRunning = false;
                cleanup();
            }
        });
        return this.startPromise;
    }
    processBuffer() {
        const lines = this.buffer.split('\n');
        // Keep the last incomplete line in the buffer
        this.buffer = lines.pop() || '';
        for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed)
                continue;
            try {
                const response = JSON.parse(trimmed);
                const pending = this.pendingRequests.get(response.id);
                if (pending) {
                    this.pendingRequests.delete(response.id);
                    if (response.error) {
                        pending.reject(new Error(response.error.message));
                    }
                    else {
                        pending.resolve(response.result);
                    }
                }
            }
            catch {
                // Non-JSON output (logging, etc.)
                console.log('[Python]', trimmed);
            }
        }
    }
    async call(method, params = {}, timeoutMs) {
        if (!this.isRunning) {
            await this.start();
        }
        const id = ++this.requestId;
        const request = {
            jsonrpc: '2.0',
            id,
            method,
            params,
        };
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                this.pendingRequests.delete(id);
                reject(new Error(`Python bridge request timeout: ${method}`));
            }, timeoutMs ?? PYTHON_BRIDGE_TIMEOUT);
            this.pendingRequests.set(id, {
                resolve: (value) => {
                    clearTimeout(timeout);
                    resolve(value);
                },
                reject: (err) => {
                    clearTimeout(timeout);
                    reject(err);
                },
            });
            try {
                const payload = JSON.stringify(request) + '\n';
                this.process?.stdin?.write(payload);
            }
            catch (err) {
                clearTimeout(timeout);
                this.pendingRequests.delete(id);
                reject(err);
            }
        });
    }
    stop() {
        if (this.process) {
            this.process.kill();
            this.process = null;
        }
        this.isRunning = false;
        this.pendingRequests.clear();
        this.buffer = '';
    }
    getStatus() {
        return {
            running: this.isRunning,
            pid: this.process?.pid,
        };
    }
}
exports.PythonBridge = PythonBridge;
//# sourceMappingURL=python-bridge.js.map