export type Platform = "web" | "tizen" | "webos" | "webview" | "unknown";

export type StorageType = "indexeddb" | "filesystem" | "memory";

export type PlatformCapabilities = {
  supportsIndexedDB: boolean;
  supportsFileSystem: boolean;
  supportsServiceWorkers: boolean;
  supportsBlob: boolean;
  maxStorageQuota: number;
  isTV: boolean;
  isMobile: boolean;
  isLowEnd: boolean;
};
