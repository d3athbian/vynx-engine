import { BYTES_PER_MB } from "../config/platform";
import type { IStorageAdapter, StorageMetadata } from "./storage.type";

export interface FileSystemAdapterOptions {
  rootDirectory?: string;
  maxSizeMB?: number;
}

export class FileSystemAdapter implements IStorageAdapter {
  private root: FileSystemDirectoryHandle | null = null;
  private rootDirectory: string;

  constructor(options?: FileSystemAdapterOptions) {
    this.rootDirectory = options?.rootDirectory ?? "vynx-cache";
  }

  private async getRoot(): Promise<FileSystemDirectoryHandle> {
    if (this.root) return this.root;

    console.log("[VYNX:FileSystemAdapter] Solicitando acceso al directorio raíz...");
    this.root = await navigator.storage.getDirectory();
    return this.root;
  }

  private async getMetaHandle(key: string): Promise<FileSystemFileHandle> {
    const root = await this.getRoot();
    return root.getFileHandle(`${key}.meta`, { create: true });
  }

  async save(key: string, data: Blob, metadata: StorageMetadata): Promise<void> {
    const root = await this.getRoot();
    console.log(`[VYNX:FileSystemAdapter] Guardando archivo: ${key}`);

    const fileHandle = await root.getFileHandle(key, { create: true });
    const writable = await fileHandle.createWritable();
    await writable.write(data);
    await writable.close();

    const metaHandle = await this.getMetaHandle(key);
    const metaWritable = await metaHandle.createWritable();
    await metaWritable.write(JSON.stringify(metadata));
    await metaWritable.close();

    console.log(`[VYNX:FileSystemAdapter] Archivo guardado: ${key} (${data.size} bytes)`);
  }

  async get(key: string): Promise<{ data: Blob; metadata: StorageMetadata } | null> {
    try {
      const root = await this.getRoot();
      const fileHandle = await root.getFileHandle(key);
      const file = await fileHandle.getFile();

      const metaHandle = await this.getMetaHandle(key);
      const metaFile = await metaHandle.getFile();
      const metaContent = await metaFile.text();
      const metadata = JSON.parse(metaContent) as StorageMetadata;

      return { data: file, metadata };
    } catch {
      console.log(`[VYNX:FileSystemAdapter] Archivo no encontrado: ${key}`);
      return null;
    }
  }

  async delete(key: string): Promise<void> {
    try {
      const root = await this.getRoot();
      await root.removeEntry(key);
      await root.removeEntry(`${key}.meta`);
      console.log(`[VYNX:FileSystemAdapter] Archivo eliminado: ${key}`);
    } catch (e) {
      console.warn(`[VYNX:FileSystemAdapter] Error al eliminar: ${key}`, e);
    }
  }

  async clear(): Promise<void> {
    try {
      const root = await this.getRoot();
      const entries = root as unknown as AsyncIterable<FileSystemHandle>;
      for await (const entry of entries) {
        await root.removeEntry(entry.name);
      }
      console.log("[VYNX:FileSystemAdapter] Caché limpiada");
    } catch (e) {
      console.warn("[VYNX:FileSystemAdapter] Error al limpiar caché:", e);
    }
  }

  async getQuotaUsage(): Promise<number> {
    if (typeof navigator !== "undefined" && navigator.storage?.estimate) {
      const estimate = await navigator.storage.estimate();
      return Math.floor((estimate.usage ?? 0) / BYTES_PER_MB);
    }
    return 0;
  }

  async getSize(): Promise<number> {
    let total = 0;
    try {
      const root = await this.getRoot();
      const entries = root as unknown as AsyncIterable<FileSystemHandle>;
      for await (const entry of entries) {
        if (entry.kind === "file" && !entry.name.endsWith(".meta")) {
          const file = await root.getFileHandle(entry.name);
          const f = await file.getFile();
          total += f.size;
        }
      }
    } catch {
      // Ignore
    }
    return total;
  }

  async requestPersistentAccess(): Promise<boolean> {
    if (typeof navigator !== "undefined" && navigator.storage?.persist) {
      const isPersistent = await navigator.storage.persist();
      console.log(`[VYNX:FileSystemAdapter] Acceso persistente: ${isPersistent}`);
      return isPersistent;
    }
    return false;
  }
}
