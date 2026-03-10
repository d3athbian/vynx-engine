import type { StorageMetadata } from "../core/storage/storage.type";
import type { WorkerRequest, WorkerResponse } from "./worker-api";

const DB_NAME = "vynx-cache";
const STORE_NAME = "images";
let db: IDBDatabase | null = null;
const pendingRequests = new Map<string, AbortController>();
const maxConcurrent = 3;
let activeRequests = 0;

function openDB(): Promise<IDBDatabase> {
  if (db) return Promise.resolve(db);

  console.log("[VYNX:Worker] Abriendo IndexedDB...");
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);

    req.onerror = () => {
      console.error("[VYNX:Worker] Error abriendo DB:", req.error);
      reject(req.error);
    };

    req.onsuccess = () => {
      console.log("[VYNX:Worker] IndexedDB lista");
      db = req.result;
      resolve(db);
    };

    req.onupgradeneeded = (e) => {
      const database = (e.target as IDBOpenDBRequest).result;
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME, { keyPath: "key" });
      }
    };
  });
}

async function storeImage(key: string, blob: Blob, metadata: StorageMetadata): Promise<void> {
  const database = await openDB();
  return new Promise((resolve, reject) => {
    const tx = database.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const req = store.put({ key, data: blob, metadata });
    req.onerror = () => reject(req.error);
    req.onsuccess = () => resolve();
  });
}

async function retrieveImage(
  key: string,
): Promise<{ data: Blob; metadata: StorageMetadata } | null> {
  const database = await openDB();
  return new Promise((resolve, reject) => {
    const tx = database.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    const req = store.get(key);
    req.onerror = () => reject(req.error);
    req.onsuccess = () => resolve(req.result ?? null);
  });
}

async function fetchImage(url: string): Promise<{ blob: Blob; metadata: StorageMetadata }> {
  const controller = new AbortController();
  pendingRequests.set(url, controller);

  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const blob = await response.blob();
    const metadata: StorageMetadata = {
      url,
      size: blob.size,
      mimeType: blob.type,
      timestamp: Date.now(),
    };

    return { blob, metadata };
  } finally {
    pendingRequests.delete(url);
    activeRequests--;
  }
}

function postProgress(id: string, loaded: number, total: number): void {
  const msg: WorkerResponse = { type: "PROGRESS", id, loaded, total };
  self.postMessage(msg);
}

function postError(id: string, message: string): void {
  const msg: WorkerResponse = { type: "ERROR", id, message };
  self.postMessage(msg);
}

self.onmessage = async (event: MessageEvent<WorkerRequest>) => {
  const msg = event.data;

  console.log("[VYNX:Worker] Mensaje recibido:", msg.type);

  switch (msg.type) {
    case "INIT": {
      try {
        await openDB();
        self.postMessage({ type: "READY" } as WorkerResponse);
      } catch (err) {
        postError("init", String(err));
      }
      break;
    }

    case "GET": {
      const { id, url, options } = msg;

      if (activeRequests >= maxConcurrent) {
        postError(id, "Max concurrent requests reached");
        return;
      }

      activeRequests++;
      postProgress(id, 0, 0);

      try {
        const cached = await retrieveImage(url);
        if (cached) {
          console.log("[VYNX:Worker] Cache HIT:", url);
          self.postMessage({
            type: "SUCCESS",
            id,
            blob: cached.data,
            fromCache: true,
            metadata: cached.metadata,
          } as WorkerResponse);
          activeRequests--;
          return;
        }

        console.log("[VYNX:Worker] Cache MISS:", url);
        const { blob, metadata } = await fetchImage(url);

        try {
          await storeImage(url, blob, metadata);
          console.log("[VYNX:Worker] Imagen guardada en cache:", url);
        } catch (storeErr) {
          console.warn("[VYNX:Worker] Error guardando en cache:", storeErr);
        }

        self.postMessage({
          type: "SUCCESS",
          id,
          blob,
          fromCache: false,
          metadata,
        } as WorkerResponse);
      } catch (err) {
        postError(id, String(err));
      }

      activeRequests--;
      break;
    }

    case "PREFETCH": {
      const { url } = msg;
      console.log("[VYNX:Worker] Prefetch:", url);

      try {
        const cached = await retrieveImage(url);
        if (cached) {
          console.log("[VYNX:Worker] Prefetch - ya en cache:", url);
          return;
        }

        const { blob, metadata } = await fetchImage(url);
        await storeImage(url, blob, metadata);
        console.log("[VYNX:Worker] Prefetch completado:", url);
      } catch (err) {
        console.warn("[VYNX:Worker] Prefetch error:", err);
      }
      break;
    }

    case "STORE_IMAGE": {
      const { id, url, blob, metadata } = msg;
      try {
        await storeImage(url, blob, metadata);
        self.postMessage({ type: "STORE_OK", id, key: url } as WorkerResponse);
      } catch (err) {
        postError(id, String(err));
      }
      break;
    }

    case "RETRIEVE_IMAGE": {
      const { id, key } = msg;
      try {
        const result = await retrieveImage(key);
        if (result) {
          self.postMessage({
            type: "RETRIEVE_OK",
            id,
            blob: result.data,
            metadata: result.metadata,
          } as WorkerResponse);
        } else {
          self.postMessage({ type: "RETRIEVE_MISS", id, key } as WorkerResponse);
        }
      } catch (err) {
        postError(id, String(err));
      }
      break;
    }

    case "CLEAR": {
      try {
        const database = await openDB();
        const tx = database.transaction(STORE_NAME, "readwrite");
        tx.objectStore(STORE_NAME).clear();
        console.log("[VYNX:Worker] Cache limpiado");
      } catch (err) {
        console.error("[VYNX:Worker] Error limpiando cache:", err);
      }
      break;
    }

    case "CANCEL": {
      const controller = pendingRequests.get(msg.id);
      if (controller) {
        controller.abort();
        pendingRequests.delete(msg.id);
        activeRequests--;
      }
      break;
    }

    default:
      console.warn("[VYNX:Worker] Mensaje desconocido:", msg);
  }
};

console.log("[VYNX:Worker] Worker inicializado");
