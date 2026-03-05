import { getNavigatorProperty, getUserAgent, getWindowProperty } from "../../utils/browser";
import { DEFAULT_QUOTA_MB, UA_REGEX } from "../config/platform";
import type { Platform, PlatformCapabilities, StorageType } from "./PlatformDetector.type";

function isTizen(): boolean {
  return UA_REGEX.TIZEN.test(getUserAgent());
}

function isWebOS(): boolean {
  return UA_REGEX.WEB_OS.test(getUserAgent());
}

function isWebView(): boolean {
  const ua = getUserAgent();
  const isIOSWebView =
    ua.includes("Safari") &&
    !ua.includes("Chrome") &&
    !ua.includes("Mobile") &&
    getWindowProperty("webkit") !== undefined;
  const isAndroidWebView =
    ua.includes("wv") ||
    ua.includes("WebView") ||
    (ua.includes("Mobile") && !ua.includes("Chrome"));
  return isIOSWebView || isAndroidWebView;
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
  if (
    typeof navigator !== "undefined" &&
    navigator.storage &&
    typeof navigator.storage.estimate === "function"
  ) {
    try {
      // Use .call to be absolutely sure about the context
      const estimate = navigator.storage.estimate.bind(navigator.storage);
      const { quota } = await estimate();
      return Math.floor((quota ?? 0) / (1024 * 1024));
    } catch (error) {
      console.warn("[PlatformDetector] Failed to estimate storage quota:", error);
    }
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
  const nav = getNavigatorProperty("userAgent");
  if (nav === undefined) return "unknown";

  if (isTizen()) return "tizen";
  if (isWebOS()) return "webos";
  if (isWebView()) return "webview";
  return "web";
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
  if (capabilities.isTV && capabilities.supportsFileSystem) return "filesystem";
  if (capabilities.supportsIndexedDB) return "indexeddb";
  return "memory";
}

export type { Platform, StorageType, PlatformCapabilities };
