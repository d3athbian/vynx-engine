import { getNavigatorProperty, getUserAgent, getWindowProperty } from "../../utils/browser";
import {
  DEFAULT_QUOTA_MB,
  MIN_TIZEN_VERSION,
  MIN_WEBOS_VERSION,
  UA_REGEX,
} from "../config/platform";
import type { Platform, PlatformCapabilities, StorageType } from "./PlatformDetector.type";

function getTizenVersion(): number | null {
  const ua = getUserAgent();
  const match = ua.match(/Tizen\s*(\d+\.?\d*)/i);
  if (match) {
    const version = Number.parseFloat(match[1]);
    return version;
  }
  return null;
}

function getWebOSVersion(): number | null {
  const ua = getUserAgent();
  const match = ua.match(/webOS\.TV-(\d+)/i);
  if (match) {
    return Number.parseInt(match[1], 10);
  }
  const legacyMatch = ua.match(/Web0S.*(?:WEBOS|WEBOS\.TV)[^\d]*(\d+)/i);
  if (legacyMatch) {
    return Number.parseInt(legacyMatch[1], 10);
  }
  return null;
}

function isTizen(): boolean {
  if (!UA_REGEX.TIZEN.test(getUserAgent())) return false;
  const version = getTizenVersion();
  if (version === null) return true;
  return version >= MIN_TIZEN_VERSION;
}

function isWebOS(): boolean {
  if (!UA_REGEX.WEB_OS.test(getUserAgent())) return false;
  const version = getWebOSVersion();
  if (version === null) return true;
  return version >= MIN_WEBOS_VERSION;
}

function isWebView(): boolean {
  const ua = getUserAgent();
  if (ua.includes("wv")) return true;
  if (ua.includes("WebView") && !ua.includes("Safari")) return true;
  if (ua.includes("Samsung") && ua.includes("Service")) {
    return true;
  }
  return false;
}

function hasIndexedDB(): boolean {
  return getWindowProperty("indexedDB") !== undefined;
}

function hasFileSystemAPI(): boolean {
  return getWindowProperty("showOpenFilePicker") !== undefined;
}

function hasServiceWorkers(): boolean {
  return getNavigatorProperty("serviceWorker") !== undefined;
}

function hasBlob(): boolean {
  return typeof Blob !== "undefined";
}

async function getStorageQuota(): Promise<number> {
  try {
    const nav = getNavigatorProperty("userAgent");
    if (!nav) return DEFAULT_QUOTA_MB;

    if (typeof navigator !== "undefined" && navigator.storage?.estimate) {
      const estimate = await navigator.storage.estimate();
      return Math.floor((estimate.quota ?? 0) / (1024 * 1024));
    }
  } catch {
    // Ignore errors
  }

  return DEFAULT_QUOTA_MB;
}

function detectDeviceType(): { isTV: boolean; isMobile: boolean } {
  const ua = getUserAgent();
  return {
    isMobile: UA_REGEX.MOBILE.test(ua),
    isTV: isTizen() || isWebOS() || UA_REGEX.SMART_TV.test(ua),
  };
}

function detectLowEndDevice(): boolean {
  const memory = getNavigatorProperty("deviceMemory");
  const cores = getNavigatorProperty("hardwareConcurrency");

  if (typeof memory === "number" && memory < 2) return true;
  if (typeof cores === "number" && cores < 2) return true;

  return false;
}

export function detectPlatform(): Platform {
  if (!getNavigatorProperty("userAgent")) return "unknown";

  if (isTizen()) return "tizen";
  if (isWebOS()) return "webos";
  if (isWebView()) return "webview";
  return "web";
}

export function getPlatformVersion(platform: Platform): number | null {
  if (platform === "tizen") return getTizenVersion();
  if (platform === "webos") return getWebOSVersion();
  return null;
}

export async function getPlatformCapabilities(_platform: Platform): Promise<PlatformCapabilities> {
  const device = detectDeviceType();
  const quota = await getStorageQuota();

  return {
    supportsIndexedDB: hasIndexedDB(),
    supportsFileSystem: hasFileSystemAPI(),
    supportsServiceWorkers: hasServiceWorkers(),
    supportsBlob: hasBlob(),
    maxStorageQuota: quota,
    isTV: device.isTV,
    isMobile: device.isMobile,
    isLowEnd: detectLowEndDevice(),
  };
}

export function getOptimalStorageType(
  _platform: Platform,
  capabilities: PlatformCapabilities,
): StorageType {
  let storage: StorageType;
  if (capabilities.isTV && capabilities.supportsFileSystem) {
    storage = "filesystem";
  } else if (capabilities.supportsIndexedDB) {
    storage = "indexeddb";
  } else {
    storage = "memory";
  }
  console.log("[VYNX:PlatformDetector]", {
    platform: _platform,
    isTV: capabilities.isTV,
    supportsFileSystem: capabilities.supportsFileSystem,
    supportsIndexedDB: capabilities.supportsIndexedDB,
    selectedStorage: storage,
  });
  return storage;
}

export type { Platform, StorageType, PlatformCapabilities };
