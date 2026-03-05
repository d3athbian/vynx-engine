import { detectPlatform, getPlatformCapabilities, getOptimalStorageType } from "./src/core/platform/PlatformDetector";

async function main() {
  console.log("=== VYNX Engine - Platform Detector Test ===\n");

  const platform = detectPlatform();
  console.log("[PlatformDetector] Platform detected:", platform);

  const capabilities = await getPlatformCapabilities(platform);
  console.log("[PlatformDetector] Capabilities:", JSON.stringify(capabilities, null, 2));

  const storageType = getOptimalStorageType(platform, capabilities);
  console.log("[PlatformDetector] Optimal storage:", storageType);
}

main().catch(console.error);
