import { spawn, ChildProcess } from 'child_process';
import path from 'path';
import { app } from 'electron';
import type { JsonRpcRequest, JsonRpcResponse } from '@shared/types';

const PYTHON_BRIDGE_TIMEOUT = 7200000;
const PYTHON_STARTUP_TIMEOUT = 10000;

export interface InspectionEventCallbacks {
  debug: ((line: string) => void) | null;
  result: ((payload: Record<string, unknown>) => void) | null;
  complete: ((payload: Record<string, unknown>) => void) | null;
}

export class PythonBridge {
  private static instance: PythonBridge;
  private process: ChildProcess | null = null;
  private requestId = 0;
  private pendingRequests = new Map<number, { resolve: (v: unknown) => void; reject: (e: Error) => void }>();
  private buffer = '';
  private isRunning = false;
  private startPromise: Promise<void> | null = null;
  private debugCallback: ((line: string) => void) | null = null;
  private inspectionCallbacks: InspectionEventCallbacks | null = null;

  private constructor() {}

  /** Register a callback for real-time debug lines from Python stderr */
  onDebugLine(callback: ((line: string) => void) | null): void {
    this.debugCallback = callback;
  }

  /** Register callbacks for real-time inspection events (result/complete) from Python stderr */
  onInspectionEvent(callbacks: InspectionEventCallbacks | null): void {
    this.inspectionCallbacks = callbacks;
  }

  static getInstance(): PythonBridge {
    if (!PythonBridge.instance) {
      PythonBridge.instance = new PythonBridge();
    }
    return PythonBridge.instance;
  }

  getPythonCommand(): string {
    if (process.platform === 'win32') {
      // Try to find Python
      const possiblePaths = [
        'python',
        'python3',
        path.join(process.env.LOCALAPPDATA || '', 'Programs', 'Python', 'Python312', 'python.exe'),
        path.join(process.env.LOCALAPPDATA || '', 'Programs', 'Python', 'Python311', 'python.exe'),
        path.join(process.env.ProgramFiles || '', 'Python312', 'python.exe'),
        path.join(process.env.ProgramFiles || '', 'Python311', 'python.exe'),
      ];
      return possiblePaths[0]; // Default to python from PATH
    }
    return 'python3';
  }

  getServerPath(): string {
    if (app.isPackaged) {
      return path.join(process.resourcesPath, 'python-backend', 'server.py');
    }
    return path.join(__dirname, '../../../../python-backend/server.py');
  }

  async start(): Promise<void> {
    if (this.isRunning) return;
    if (this.startPromise) return this.startPromise;

    this.startPromise = new Promise<void>((resolve) => {
      const pythonCmd = this.getPythonCommand();
      const serverPath = this.getServerPath();

      console.log(`[PythonBridge] Starting: ${pythonCmd} ${serverPath}`);

      const cleanup = () => {
        this.startPromise = null;
        resolve();
      };

      try {
        this.process = spawn(pythonCmd, [serverPath], {
          stdio: ['pipe', 'pipe', 'pipe'],
          env: {
            ...process.env,
            PYTHONUNBUFFERED: '1',
            PYTHONIOENCODING: 'utf-8',
          },
        });

        this.isRunning = true;

        this.process.stdout?.on('data', (data: Buffer) => {
          this.buffer += data.toString('utf-8');
          this.processBuffer();
        });

        this.process.stderr?.on('data', (data: Buffer) => {
          const text = data.toString('utf-8');
          // Forward debug/result/complete lines to callbacks in real-time
          const lines = text.split('\n');
          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed) continue;

            if (trimmed.startsWith('[DBG]') && this.debugCallback) {
              this.debugCallback(trimmed.substring(5).trim());
            } else if (trimmed.startsWith('[RSLT]') && this.inspectionCallbacks?.result) {
              try {
                const payload = JSON.parse(trimmed.substring(6).trim());
                this.inspectionCallbacks.result(payload);
              } catch {
                console.error('[PythonBridge] Failed to parse RSLT:', trimmed);
              }
            } else if (trimmed.startsWith('[DONE]') && this.inspectionCallbacks?.complete) {
              try {
                const payload = JSON.parse(trimmed.substring(6).trim());
                this.inspectionCallbacks.complete(payload);
              } catch {
                console.error('[PythonBridge] Failed to parse DONE:', trimmed);
              }
            } else if (trimmed) {
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
      } catch (err) {
        console.error('[PythonBridge] Failed to spawn process:', err);
        this.isRunning = false;
        cleanup();
      }
    });

    return this.startPromise;
  }

  private processBuffer(): void {
    const lines = this.buffer.split('\n');
    // Keep the last incomplete line in the buffer
    this.buffer = lines.pop() || '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      try {
        const response: JsonRpcResponse = JSON.parse(trimmed);
        const pending = this.pendingRequests.get(response.id);
        if (pending) {
          this.pendingRequests.delete(response.id);
          if (response.error) {
            pending.reject(new Error(response.error.message));
          } else {
            pending.resolve(response.result);
          }
        }
      } catch {
        // Non-JSON output (logging, etc.)
        console.log('[Python]', trimmed);
      }
    }
  }

  async call(method: string, params: Record<string, unknown> = {}, timeoutMs?: number): Promise<unknown> {
    if (!this.isRunning) {
      await this.start();
    }

    const id = ++this.requestId;
    const request: JsonRpcRequest = {
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
        resolve: (value: unknown) => {
          clearTimeout(timeout);
          resolve(value);
        },
        reject: (err: Error) => {
          clearTimeout(timeout);
          reject(err);
        },
      });

      try {
        const payload = JSON.stringify(request) + '\n';
        this.process?.stdin?.write(payload);
      } catch (err) {
        clearTimeout(timeout);
        this.pendingRequests.delete(id);
        reject(err);
      }
    });
  }

  stop(): void {
    if (this.process) {
      this.process.kill();
      this.process = null;
    }
    this.isRunning = false;
    this.pendingRequests.clear();
    this.buffer = '';
  }

  getStatus(): { running: boolean; pid?: number } {
    return {
      running: this.isRunning,
      pid: this.process?.pid,
    };
  }
}
