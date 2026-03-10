import { WORKER_TIMEOUT_MS } from "../core/config/worker";
import type {
  ImageOptions,
  LoadProgress,
  NetworkInfo,
  WorkerRequest,
  WorkerResponse,
} from "./worker-api";

export type WorkerConfig = {
  enabled?: boolean;
  workerPath?: string;
  maxConcurrentRequests?: number;
};

type ProgressCallback = (progress: LoadProgress) => void;
type ErrorCallback = (error: Error) => void;
type NetworkCallback = (info: NetworkInfo) => void;

export class WorkerClient {
  private worker: Worker | null = null;
  private pending = new Map<
    string,
    {
      resolve: (value: WorkerResponse) => void;
      reject: (reason: Error) => void;
    }
  >();
  private progressCallbacks: ProgressCallback[] = [];
  private errorCallbacks: ErrorCallback[] = [];
  private networkCallbacks: NetworkCallback[] = [];
  private config: WorkerConfig;
  private messageId = 0;

  constructor(config?: WorkerConfig) {
    this.config = config ?? { enabled: true };
  }

  async init(): Promise<void> {
    if (!this.config.enabled) {
      console.log("[VYNX:WorkerClient] Worker deshabilitado");
      return;
    }

    console.log("[VYNX:WorkerClient] Iniciando worker...");

    const workerPath = this.config.workerPath ?? new URL("./image-worker.ts", import.meta.url).href;

    this.worker = new Worker(workerPath, { type: "module" });

    this.worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
      this.handleMessage(event.data);
    };

    this.worker.onerror = (error) => {
      console.error("[VYNX:WorkerClient] Error del worker:", error);
      for (const cb of this.errorCallbacks) {
        cb(new Error(error.message));
      }
    };

    await this.sendMessage({ type: "INIT" });
    console.log("[VYNX:WorkerClient] Worker listo");
  }

  private generateId(): string {
    return `msg_${++this.messageId}_${Date.now()}`;
  }

  private sendMessage(request: WorkerRequest): Promise<WorkerResponse> {
    return new Promise((resolve, reject) => {
      if (!this.worker) {
        reject(new Error("Worker no inicializado"));
        return;
      }

      const id = request.type !== "INIT" && "id" in request ? request.id : this.generateId();

      const requestWithId = { ...request, id };
      this.pending.set(id, { resolve, reject });
      this.worker.postMessage(requestWithId);

      setTimeout(() => {
        if (this.pending.has(id)) {
          this.pending.delete(id);
          reject(new Error(`Timeout: ${request.type}`));
        }
      }, WORKER_TIMEOUT_MS);
    });
  }

  private handleMessage(response: WorkerResponse): void {
    const { type, ...rest } = response as WorkerResponse & { id?: string };
    const id = "id" in response ? response.id : null;

    if (type === "PROGRESS") {
      for (const cb of this.progressCallbacks) {
        cb(response as LoadProgress);
      }
      return;
    }

    if (type === "ERROR") {
      const error = new Error((response as { message: string }).message);
      for (const cb of this.errorCallbacks) {
        cb(error);
      }
      if (id) {
        const pending = this.pending.get(id);
        if (pending) {
          this.pending.delete(id);
          pending.reject(error);
        }
      }
      return;
    }

    if (type === "NETWORK_INFO") {
      for (const cb of this.networkCallbacks) {
        cb((response as { info: NetworkInfo }).info);
      }
      return;
    }

    if (id) {
      const pending = this.pending.get(id);
      if (pending) {
        this.pending.delete(id);
        pending.resolve(response);
      }
    }
  }

  async getImage(
    url: string,
    options?: ImageOptions,
  ): Promise<{
    blob: Blob;
    fromCache: boolean;
    metadata: unknown;
  }> {
    const response = await this.sendMessage({
      type: "GET",
      id: this.generateId(),
      url,
      options,
    });

    if (response.type === "SUCCESS") {
      return {
        blob: response.blob,
        fromCache: response.fromCache,
        metadata: response.metadata,
      };
    }

    throw new Error(`Worker error: ${response.type}`);
  }

  async prefetchImage(url: string): Promise<void> {
    await this.sendMessage({
      type: "PREFETCH",
      url,
    });
  }

  async clearCache(): Promise<void> {
    await this.sendMessage({ type: "CLEAR" });
  }

  onProgress(callback: ProgressCallback): void {
    this.progressCallbacks.push(callback);
  }

  onNetworkChange(callback: NetworkCallback): void {
    this.networkCallbacks.push(callback);
  }

  onError(callback: ErrorCallback): void {
    this.errorCallbacks.push(callback);
  }

  terminate(): void {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
      console.log("[VYNX:WorkerClient] Worker terminado");
    }
  }
}
