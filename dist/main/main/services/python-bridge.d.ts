export interface InspectionEventCallbacks {
    debug: ((line: string) => void) | null;
    result: ((payload: Record<string, unknown>) => void) | null;
    complete: ((payload: Record<string, unknown>) => void) | null;
}
export declare class PythonBridge {
    private static instance;
    private process;
    private requestId;
    private pendingRequests;
    private buffer;
    private isRunning;
    private startPromise;
    private debugCallback;
    private inspectionCallbacks;
    private constructor();
    /** Register a callback for real-time debug lines from Python stderr */
    onDebugLine(callback: ((line: string) => void) | null): void;
    /** Register callbacks for real-time inspection events (result/complete) from Python stderr */
    onInspectionEvent(callbacks: InspectionEventCallbacks | null): void;
    static getInstance(): PythonBridge;
    getPythonCommand(): string;
    getServerPath(): string;
    start(): Promise<void>;
    private processBuffer;
    call(method: string, params?: Record<string, unknown>, timeoutMs?: number): Promise<unknown>;
    stop(): void;
    getStatus(): {
        running: boolean;
        pid?: number;
    };
}
