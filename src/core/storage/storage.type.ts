export type StorageMetadata = {
  url: string;
  size: number;
  mimeType: string;
  timestamp: number;
  expiresAt?: number;
};

export interface IStorageAdapter {
  save(key: string, data: Blob, metadata: StorageMetadata): Promise<void>;
  get(key: string): Promise<{ data: Blob; metadata: StorageMetadata } | null>;
  delete(key: string): Promise<void>;
  clear(): Promise<void>;
  getQuotaUsage(): Promise<number>;
}

export type StorageType = "indexeddb" | "filesystem" | "memory" | "localstorage";

export type StorageFactoryOptions = {
  preferredType?: StorageType;
  maxSizeMB?: number;
};
