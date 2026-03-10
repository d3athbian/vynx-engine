import { BYTES_PER_MB } from "../config/platform";
import type { IStorageAdapter, StorageMetadata } from "./storage.type";

export class MemoryAdapter implements IStorageAdapter {
  private cache = new Map<string, { data: Blob; metadata: StorageMetadata }>();

  async save(key: string, data: Blob, metadata: StorageMetadata): Promise<void> {
    this.cache.set(key, { data, metadata });
  }

  async get(key: string): Promise<{ data: Blob; metadata: StorageMetadata } | null> {
    return this.cache.get(key) ?? null;
  }

  async delete(key: string): Promise<void> {
    this.cache.delete(key);
  }

  async clear(): Promise<void> {
    this.cache.clear();
  }

  async getQuotaUsage(): Promise<number> {
    let total = 0;
    for (const item of this.cache.values()) {
      total += item.data.size;
    }
    return Math.floor(total / BYTES_PER_MB);
  }
}
