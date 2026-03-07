import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { StorageFactory } from "./StorageFactory";

global.indexedDB = {
  open: vi.fn(),
} as unknown as IDBFactory;

describe("StorageFactory", () => {
  describe("getOptimalStorageType", () => {
    it("returns filesystem for tizen", () => {
      expect(
        StorageFactory.getOptimalStorageType("tizen", {
          supportsIndexedDB: true,
          supportsFileSystem: true,
          supportsServiceWorkers: true,
          supportsBlob: true,
          maxStorageQuota: 1000,
          isTV: true,
          isMobile: false,
          isLowEnd: false,
        }),
      ).toBe("filesystem");
    });

    it("returns filesystem for webos", () => {
      expect(
        StorageFactory.getOptimalStorageType("webos", {
          supportsIndexedDB: true,
          supportsFileSystem: true,
          supportsServiceWorkers: true,
          supportsBlob: true,
          maxStorageQuota: 1000,
          isTV: true,
          isMobile: false,
          isLowEnd: false,
        }),
      ).toBe("filesystem");
    });

    it("returns indexeddb for web with indexedDB support", () => {
      expect(
        StorageFactory.getOptimalStorageType("web", {
          supportsIndexedDB: true,
          supportsFileSystem: false,
          supportsServiceWorkers: true,
          supportsBlob: true,
          maxStorageQuota: 1000,
          isTV: false,
          isMobile: false,
          isLowEnd: false,
        }),
      ).toBe("indexeddb");
    });

    it("returns memory when no storage available", () => {
      expect(
        StorageFactory.getOptimalStorageType("unknown", {
          supportsIndexedDB: false,
          supportsFileSystem: false,
          supportsServiceWorkers: false,
          supportsBlob: false,
          maxStorageQuota: 0,
          isTV: false,
          isMobile: false,
          isLowEnd: false,
        }),
      ).toBe("memory");
    });
  });

  describe("createAdapter", () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it("creates adapter for tizen platform", () => {
      const adapter = StorageFactory.createAdapter("tizen", {
        supportsIndexedDB: true,
        supportsFileSystem: true,
        supportsServiceWorkers: true,
        supportsBlob: true,
        maxStorageQuota: 1000,
        isTV: true,
        isMobile: false,
        isLowEnd: false,
      });

      expect(adapter).toBeDefined();
      expect(typeof adapter.save).toBe("function");
      expect(typeof adapter.get).toBe("function");
      expect(typeof adapter.delete).toBe("function");
      expect(typeof adapter.clear).toBe("function");
      expect(typeof adapter.getQuotaUsage).toBe("function");
    });

    it("respects preferredType override to memory", () => {
      const adapter = StorageFactory.createAdapter(
        "web",
        {
          supportsIndexedDB: true,
          supportsFileSystem: true,
          supportsServiceWorkers: true,
          supportsBlob: true,
          maxStorageQuota: 1000,
          isTV: false,
          isMobile: false,
          isLowEnd: false,
        },
        { preferredType: "memory" },
      );

      expect(adapter).toBeDefined();
    });

    it("returns adapter with all methods", async () => {
      const adapter = StorageFactory.createAdapter("web", {
        supportsIndexedDB: true,
        supportsFileSystem: false,
        supportsServiceWorkers: true,
        supportsBlob: true,
        maxStorageQuota: 1000,
        isTV: false,
        isMobile: false,
        isLowEnd: false,
      });

      expect(adapter).toBeDefined();
      expect(typeof adapter.save).toBe("function");
      expect(typeof adapter.get).toBe("function");
      expect(typeof adapter.delete).toBe("function");
      expect(typeof adapter.clear).toBe("function");
      expect(typeof adapter.getQuotaUsage).toBe("function");
    });
  });
});
