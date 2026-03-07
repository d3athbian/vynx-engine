import {
  type Platform,
  type PlatformCapabilities,
  getOptimalStorageType,
} from "../platform/PlatformDetector";
import { MemoryAdapter } from "./MemoryAdapter";
import type { IStorageAdapter, StorageFactoryOptions, StorageMetadata } from "./storage.type";

class IndexedDBAdapter implements IStorageAdapter {
  private dbName = "vynx-cache";
  private storeName = "images";
  private db: IDBDatabase | null = null;

  private async getDB(): Promise<IDBDatabase> {
    if (this.db) return this.db;

    console.log("[VYNX:IndexedDB] Iniciando conexión a DB...");
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, 1);

      request.onerror = () => {
        console.error("[VYNX:IndexedDB] Error de apertura:", request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        console.log("[VYNX:IndexedDB] Conexión establecida.");
        this.db = request.result;
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        console.log("[VYNX:IndexedDB] Creando store por primera vez...");
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(this.storeName)) {
          db.createObjectStore(this.storeName, { keyPath: "key" });
        }
      };
    });
  }

  async save(key: string, data: Blob, metadata: StorageMetadata): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(this.storeName, "readwrite");
      const store = tx.objectStore(this.storeName);
      const request = store.put({ key, data, metadata });
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  async get(key: string): Promise<{ data: Blob; metadata: StorageMetadata } | null> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(this.storeName, "readonly");
      const store = tx.objectStore(this.storeName);
      const request = store.get(key);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result ?? null);
    });
  }

  async delete(key: string): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(this.storeName, "readwrite");
      const store = tx.objectStore(this.storeName);
      const request = store.delete(key);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  async clear(): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(this.storeName, "readwrite");
      const store = tx.objectStore(this.storeName);
      const request = store.clear();
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  async getQuotaUsage(): Promise<number> {
    if (typeof navigator !== "undefined" && navigator.storage?.estimate) {
      const estimate = await navigator.storage.estimate();
      return Math.floor((estimate.usage ?? 0) / (1024 * 1024));
    }
    return 0;
  }
}

class FileSystemAdapter implements IStorageAdapter {
  private root: FileSystemDirectoryHandle | null = null;

  private async getRoot(): Promise<FileSystemDirectoryHandle> {
    if (this.root) return this.root;
    this.root = await navigator.storage.getDirectory();
    return this.root;
  }

  async save(key: string, data: Blob, _metadata: StorageMetadata): Promise<void> {
    const root = await this.getRoot();
    const fileHandle = await root.getFileHandle(key, { create: true });
    const writable = await fileHandle.createWritable();
    await writable.write(data);
    await writable.close();
  }

  async get(key: string): Promise<{ data: Blob; metadata: StorageMetadata } | null> {
    try {
      const root = await this.getRoot();
      const fileHandle = await root.getFileHandle(key);
      const file = await fileHandle.getFile();
      return {
        data: file,
        metadata: { url: key, size: file.size, mimeType: file.type, timestamp: Date.now() },
      };
    } catch {
      return null;
    }
  }

  async delete(key: string): Promise<void> {
    try {
      const root = await this.getRoot();
      await root.removeEntry(key);
    } catch {}
  }

  async clear(): Promise<void> {
    try {
      const root = await this.getRoot();
      // Usamos una interfaz extendida para evitar tipos genéricos loose ya que lib.dom.d.ts
      // a veces no incluye los métodos de iteración de FileSystemDirectoryHandle
      const entries = root as unknown as AsyncIterable<FileSystemHandle>;
      for await (const entry of entries) {
        await root.removeEntry(entry.name);
      }
    } catch {}
  }

  async getQuotaUsage(): Promise<number> {
    if (typeof navigator !== "undefined" && navigator.storage?.estimate) {
      const estimate = await navigator.storage.estimate();
      return Math.floor((estimate.usage ?? 0) / (1024 * 1024));
    }
    return 0;
  }
}

function wrapWithFallback(adapter: IStorageAdapter): IStorageAdapter {
  const fallback = new MemoryAdapter();
  return {
    async save(k, d, m) {
      try {
        await adapter.save(k, d, m);
      } catch (e) {
        console.warn("[VYNX] Fallback a Memoria:", e);
        await fallback.save(k, d, m);
      }
    },
    async get(k) {
      const res = await adapter.get(k);
      return res || (await fallback.get(k));
    },
    async delete(k) {
      await adapter.delete(k);
      await fallback.delete(k);
    },
    async clear() {
      await adapter.clear();
      await fallback.clear();
    },
    async getQuotaUsage() {
      return await adapter.getQuotaUsage();
    },
  };
}

export function createAdapter(
  platform: Platform,
  capabilities: PlatformCapabilities,
  options?: StorageFactoryOptions,
): IStorageAdapter {
  const storageType = options?.preferredType ?? getOptimalStorageType(platform, capabilities);
  console.log(`[VYNX] Creando adaptador: ${storageType.toUpperCase()}`);

  let adapter: IStorageAdapter;
  if (storageType === "filesystem") adapter = new FileSystemAdapter();
  else if (storageType === "indexeddb") adapter = new IndexedDBAdapter();
  else adapter = new MemoryAdapter();

  return wrapWithFallback(adapter);
}

export const StorageFactory = {
  createAdapter,
  getOptimalStorageType,
};
