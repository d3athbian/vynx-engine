import type { StorageMetadata } from "../core/storage/storage.type";

export type ImageOptions = {
  priority?: "high" | "low";
  ttl?: number;
};

export type NetworkInfo = {
  effectiveType: "4g" | "3g" | "2g" | "slow-2g";
  downlink: number;
  rtt: number;
};

export type LoadProgress = {
  id: string;
  loaded: number;
  total: number;
};

export type WorkerRequest =
  | { type: "INIT" }
  | { type: "GET"; id: string; url: string; options?: ImageOptions }
  | { type: "PREFETCH"; url: string }
  | { type: "CLEAR" }
  | { type: "CANCEL"; id: string }
  | { type: "STORE_IMAGE"; id: string; url: string; blob: Blob; metadata: StorageMetadata }
  | { type: "RETRIEVE_IMAGE"; id: string; key: string };

export type WorkerResponse =
  | { type: "READY" }
  | { type: "SUCCESS"; id: string; blob: Blob; fromCache: boolean; metadata: StorageMetadata }
  | { type: "PROGRESS"; id: string; loaded: number; total: number }
  | { type: "ERROR"; id: string; message: string }
  | { type: "NETWORK_INFO"; info: NetworkInfo }
  | { type: "STORE_OK"; id: string; key: string }
  | { type: "RETRIEVE_OK"; id: string; blob: Blob; metadata: StorageMetadata }
  | { type: "RETRIEVE_MISS"; id: string; key: string };
