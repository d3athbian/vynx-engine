import { describe, expect, it, vi } from "vitest";
import {
  detectPlatform,
  getOptimalStorageType,
  getPlatformCapabilities,
  getPlatformVersion,
} from "./PlatformDetector";

vi.mock("../../utils/browser", () => ({
  getNavigatorProperty: vi.fn(),
  getUserAgent: vi.fn(),
  getWindowProperty: vi.fn(),
}));

import { getNavigatorProperty, getUserAgent, getWindowProperty } from "../../utils/browser";

describe("PlatformDetector", () => {
  describe("detectPlatform", () => {
    it("returns unknown when no navigator", () => {
      vi.mocked(getNavigatorProperty).mockReturnValue(undefined);
      expect(detectPlatform()).toBe("unknown");
    });

    it("detects Tizen", () => {
      vi.mocked(getNavigatorProperty).mockReturnValue("userAgent");
      vi.mocked(getUserAgent).mockReturnValue("SMART-TV Tizen/6.0");
      expect(detectPlatform()).toBe("tizen");
    });

    it("detects webOS", () => {
      vi.mocked(getNavigatorProperty).mockReturnValue("userAgent");
      vi.mocked(getUserAgent).mockReturnValue("webOS.tv webOS TV/22");
      expect(detectPlatform()).toBe("webos");
    });

    it("detects WebView", () => {
      vi.mocked(getNavigatorProperty).mockReturnValue("userAgent");
      vi.mocked(getUserAgent).mockReturnValue(
        "Mozilla/5.0 (Linux; Android 10; wv) AppleWebKit/537.36",
      );
      expect(detectPlatform()).toBe("webview");
    });

    it("detects web for regular browser", () => {
      vi.mocked(getNavigatorProperty).mockReturnValue("userAgent");
      vi.mocked(getUserAgent).mockReturnValue("Mozilla/5.0 Chrome/120.0");
      expect(detectPlatform()).toBe("web");
    });
  });

  describe("getPlatformVersion", () => {
    it("returns Tizen version", () => {
      vi.mocked(getUserAgent).mockReturnValue("SMART-TV Tizen 5.5");
      expect(getPlatformVersion("tizen")).toBe(5.5);
    });

    it("returns webOS version", () => {
      vi.mocked(getUserAgent).mockReturnValue("webOS.TV-22");
      expect(getPlatformVersion("webos")).toBe(22);
    });

    it("returns null for web platform", () => {
      expect(getPlatformVersion("web")).toBeNull();
    });
  });

  describe("getPlatformCapabilities", () => {
    it("returns capabilities with indexedDB", async () => {
      vi.mocked(getNavigatorProperty).mockReturnValue("userAgent");
      vi.mocked(getUserAgent).mockReturnValue("Chrome/120.0");
      vi.mocked(getWindowProperty).mockReturnValue({});

      const caps = await getPlatformCapabilities("web");

      expect(caps.supportsIndexedDB).toBe(true);
      expect(caps.supportsServiceWorkers).toBe(true);
      expect(caps.supportsBlob).toBe(true);
    });

    it("detects TV device type", async () => {
      vi.mocked(getNavigatorProperty).mockReturnValue("userAgent");
      vi.mocked(getUserAgent).mockReturnValue("SMART-TV Tizen/6.0");
      vi.mocked(getWindowProperty).mockReturnValue({});

      const caps = await getPlatformCapabilities("tizen");

      expect(caps.isTV).toBe(true);
    });

    it("detects mobile device type", async () => {
      vi.mocked(getNavigatorProperty).mockReturnValue("userAgent");
      vi.mocked(getUserAgent).mockReturnValue("Mozilla/5.0 iPhone Chrome/120.0");
      vi.mocked(getWindowProperty).mockReturnValue({});

      const caps = await getPlatformCapabilities("web");

      expect(caps.isMobile).toBe(true);
    });

    it("detects low-end device", async () => {
      vi.mocked(getNavigatorProperty).mockImplementation((prop: string) => {
        if (prop === "userAgent") return "userAgent";
        if (prop === "deviceMemory") return 1;
        return undefined;
      });
      vi.mocked(getUserAgent).mockReturnValue("Chrome/120.0");
      vi.mocked(getWindowProperty).mockReturnValue({});

      const caps = await getPlatformCapabilities("web");

      expect(caps.isLowEnd).toBe(true);
    });
  });

  describe("getOptimalStorageType", () => {
    it("returns filesystem for TV with FileSystem API", () => {
      const caps = {
        supportsIndexedDB: true,
        supportsFileSystem: true,
        supportsServiceWorkers: true,
        supportsBlob: true,
        maxStorageQuota: 1000,
        isTV: true,
        isMobile: false,
        isLowEnd: false,
      };

      expect(getOptimalStorageType("tizen", caps)).toBe("filesystem");
    });

    it("returns indexeddb when FileSystem not available", () => {
      const caps = {
        supportsIndexedDB: true,
        supportsFileSystem: false,
        supportsServiceWorkers: true,
        supportsBlob: true,
        maxStorageQuota: 1000,
        isTV: true,
        isMobile: false,
        isLowEnd: false,
      };

      expect(getOptimalStorageType("tizen", caps)).toBe("indexeddb");
    });

    it("returns memory when no storage available", () => {
      const caps = {
        supportsIndexedDB: false,
        supportsFileSystem: false,
        supportsServiceWorkers: false,
        supportsBlob: false,
        maxStorageQuota: 0,
        isTV: false,
        isMobile: false,
        isLowEnd: false,
      };

      expect(getOptimalStorageType("web", caps)).toBe("memory");
    });
  });
});
