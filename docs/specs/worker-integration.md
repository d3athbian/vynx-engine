# SPEC: Worker Integration

> **Nota**: Esta librería debe poder ejecutarse en navegadores reales y emuladores de Smart TVs (Tizen, WebOS). Por cada spec cumplido, debemos poder ver mediante console logs la ejecución y demos del progreso.

## Overview

Mover toda la lógica pesada (fetch, cache I/O) a un Web Worker para mantener el main thread libre.

## Problem

IndexedDB y fetch pueden bloquear el main thread, causando dropped frames en scrolling.

## Solution

Un Web Worker que maneja todas las operaciones de red y storage, comunicándose con el main thread via mensajes.

## Architecture

```
┌────────────────────┐     MessagePort     ┌────────────────────┐
│    Main Thread     │◄───────────────────►│    Web Worker      │
│                    │                      │                    │
│  - SmartImage      │  ─── fetch ────►    │  - NetworkManager  │
│  - ImageEngine     │  ◄─── blob ─────    │  - StorageAdapter │
│  - UI Updates      │                      │  - Cache Logic    │
└────────────────────┘                      └────────────────────┘
```

## API

```typescript
// Configuración del provider
interface WorkerConfig {
  enabled: boolean;           // Default: true en producción
  workerPath?: string;       // Custom worker file
  maxConcurrentRequests?: number;  // Default: 3
}

// Worker API
interface WorkerAPI {
  // Inicialización
  init(): Promise<void>;

  // Operaciones
  getImage(url: string, options?: ImageOptions): Promise<ImageResult>;
  prefetchImage(url: string): Promise<void>;
  clearCache(): Promise<void>;

  // Escuchar eventos
  onProgress(callback: (progress: LoadProgress) => void): void;
  onNetworkChange(callback: (info: NetworkInfo) => void): void;
  onError(callback: (error: Error) => void): void;

  // Cleanup
  terminate(): void;
}
```

## Message Protocol

```typescript
// Main → Worker
type WorkerRequest =
  | { type: 'INIT' }
  | { type: 'GET'; id: string; url: string; options: ImageOptions }
  | { type: 'PREFETCH'; url: string }
  | { type: 'CLEAR' }
  | { type: 'CANCEL'; id: string };

// Worker → Main  
type WorkerResponse =
  | { type: 'READY' }
  | { type: 'SUCCESS'; id: string; blob: Blob; fromCache: boolean; metadata: StorageMetadata }
  | { type: 'PROGRESS'; id: string; loaded: number; total: number }
  | { type: 'ERROR'; id: string; message: string }
  | { type: 'NETWORK_CHANGE'; info: NetworkInfo };
```

## Fases de Implementación

### Fase A: Worker Setup

- [ ] Crear `workers/image-worker.ts`
- [ ] Configurar Worker message handler
- [ ] Integrar NetworkManager en worker

**Criterios de aceptación:**
- [ ] Worker inicializa sin errores
- [ ] Puede recibir/enviar mensajes
- [ ] No bloquea main thread

### Fase B: Core Operations

- [ ] Mover `fetch` al worker
- [ ] Mover IndexedDB operations al worker
- [ ] Implementar request/response flow

**Criterios de aceptación:**
- [ ] `getImage` retorna blob desde worker
- [ ] Cache hit funciona igual que antes
- [ ] Cache miss juga bien (no bloquea UI)

### Fase C: Progress & Errors

- [ ] Implementar progress events
- [ ] Implementar error handling
- [ ] Implementar network change events

**Criterios de aceptación:**
- [ ] Progress callback se dispara
- [ ] Errores no crashean la app
- [ ] Network changes se propagan

### Fase D: Performance Tuning

- [ ] Request pooling (max concurrent)
- [ ] Priority queue
- [ ] Request cancellation

**Criterios de aceptación:**
- [ ] No más de 3 requests simultáneos
- [ ] Priority high va primero
- [ ] Cancelled requests no consumen recursos

## Performance Targets

| Metric | Target | Without Worker |
|--------|--------|----------------|
| Main Thread Work | 0ms | ~50-200ms per image |
| Frame Drop | 0 | Possible |
| Scroll Fluidity | 60fps | May drop |

## Tests Requeridos

```typescript
// worker-integration.test.ts
describe('WorkerIntegration', () => {
  it('initializes worker', async () => {...})
  it('fetches image via worker', async () => {...})
  it('reports progress', async () => {...})
  it('handles worker errors gracefully', async () => {...})
  it('terminates cleanly', async () => {...})
});
```

## Configuration

```typescript
// Usage
<ImageEngineProvider worker={{ enabled: true }}>
  <SmartImage src="..." />
</ImageEngineProvider>
```

## Dependencies

- Ninguna (Web Workers API nativa)

## Notes

- Worker debe ser un archivo separado (no inline)
- Considerar SharedArrayBuffer para transferencia rápida
- En Safari, Workers tienen limitaciones

---

## 📝 Implementación Desde Cero

> Esta sección guía la implementación cuando se parte desde cero (solo docs).

### Prerequisites

- [x] IndexedDBAdapter (ya existe)
- [x] NetworkManager (ya existe)
- [ ] PlatformDetector (recomendado)
- [ ] StorageFactory (recomendado)

### Archivos a Crear

```
src/workers/
├── image-worker.ts        # Entry point del worker
├── worker-api.ts         # Tipos de mensajes
└── worker-client.ts      # Cliente en main thread
```

### Estructura de Archivos

```
image-worker.ts          # self.onmessage handler
worker-api.ts           # WorkerMessage, WorkerResponse types
worker-client.ts        # WorkerAPI class para main thread
```

### Código Base - Worker

```typescript
// src/workers/image-worker.ts

import { IndexedDBAdapter } from '../core/storage/IndexedDBAdapter';
import { NetworkManager } from '../core/NetworkManager';

const storage = new IndexedDBAdapter();

self.onmessage = async (event) => {
  const { type, id, url, options } = event.data;
  
  switch (type) {
    case 'GET':
      // Fetch + cache logic
      break;
    case 'PREFETCH':
      // Background prefetch
      break;
    case 'CLEAR':
      await storage.clear();
      break;
  }
};
```

### Código Base - Cliente

```typescript
// src/workers/worker-client.ts

export class WorkerClient {
  private worker: Worker;
  
  async init(): Promise<void> {
    this.worker = new Worker('./image-worker.ts');
  }
  
  async getImage(url: string): Promise<Blob> {
    return new Promise((resolve, reject) => {
      // Message handling
    });
  }
}
```

### Export en index.ts

```typescript
// src/index.ts
export * from './workers/worker-client';
```

### Configuración Vite/Webpack

El worker debe ser incluido en el build:

```javascript
// vite.config.ts
export default {
  worker: {
    format: 'es'
  }
}
```

### Criterios de Verificación

```bash
# Worker compila y se genera correctamente
npm run build

# Tipos correctos
npx tsc --noEmit

# Lint
npx biome check .

# El worker se carga sin errores
# Revisar network tab en DevTools
```

---

## 🧪 Fase E: Image Storage en IndexedDB via Worker (Pruebas Finales)

> **Objetivo**: Validar que el worker puede almacenar y recuperar imágenes (`Blob`) en IndexedDB de forma correcta, persistente y sin bloquear el hilo principal.
> Esta fase es la **prueba de fuego final** antes de integrar el worker en un componente React real.

### ¿Por qué IndexedDB dentro del Worker?

IndexedDB es accesible desde Web Workers. Mover las operaciones de escritura/lectura al worker garantiza:

- El **main thread nunca se bloquea** durante operaciones de I/O de storage.
- Las imágenes se persisten entre sesiones (a diferencia de memoria).
- El worker se convierte en el único responsable del ciclo de vida del caché.

### Extensión del Protocolo de Mensajes

Se agregan dos mensajes específicos para operaciones de storage explícito:

```typescript
// Main → Worker (extensión de WorkerRequest)
type WorkerRequest =
  | { type: 'INIT' }
  | { type: 'GET'; id: string; url: string; options?: ImageOptions }
  | { type: 'PREFETCH'; url: string }
  | { type: 'CLEAR' }
  | { type: 'CANCEL'; id: string }
  // ──── Nuevos para pruebas finales ────
  | { type: 'STORE_IMAGE'; id: string; url: string; blob: Blob; metadata: StorageMetadata }
  | { type: 'RETRIEVE_IMAGE'; id: string; key: string };

// Worker → Main (extensión de WorkerResponse)
type WorkerResponse =
  | { type: 'READY' }
  | { type: 'SUCCESS'; id: string; blob: Blob; fromCache: boolean; metadata: StorageMetadata }
  | { type: 'PROGRESS'; id: string; loaded: number; total: number }
  | { type: 'ERROR'; id: string; message: string }
  | { type: 'NETWORK_CHANGE'; info: NetworkInfo }
  // ──── Nuevos para pruebas finales ────
  | { type: 'STORE_OK'; id: string; key: string }
  | { type: 'RETRIEVE_OK'; id: string; blob: Blob; metadata: StorageMetadata }
  | { type: 'RETRIEVE_MISS'; id: string; key: string };
```

### Implementación del Worker con Soporte de Storage

```typescript
// src/workers/image-worker.ts (versión completa con IndexedDB)

// IndexedDB inline dentro del worker (no puede importar clase del main thread directamente
// a menos que el bundler lo soporte; recomendado: duplicar la lógica o usar un módulo compartido)

const DB_NAME = 'vynx-cache';
const STORE_NAME = 'images';
let db: IDBDatabase | null = null;

function openDB(): Promise<IDBDatabase> {
  if (db) return Promise.resolve(db);
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onerror = () => reject(req.error);
    req.onsuccess = () => { db = req.result; resolve(db); };
    req.onupgradeneeded = (e) => {
      const database = (e.target as IDBOpenDBRequest).result;
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME, { keyPath: 'key' });
      }
    };
  });
}

async function storeImage(key: string, blob: Blob, metadata: object): Promise<void> {
  const database = await openDB();
  return new Promise((resolve, reject) => {
    const tx = database.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const req = store.put({ key, data: blob, metadata });
    req.onerror = () => reject(req.error);
    req.onsuccess = () => resolve();
  });
}

async function retrieveImage(key: string): Promise<{ data: Blob; metadata: object } | null> {
  const database = await openDB();
  return new Promise((resolve, reject) => {
    const tx = database.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const req = store.get(key);
    req.onerror = () => reject(req.error);
    req.onsuccess = () => resolve(req.result ?? null);
  });
}

self.onmessage = async (event: MessageEvent) => {
  const msg = event.data;

  switch (msg.type) {
    case 'INIT':
      await openDB();
      self.postMessage({ type: 'READY' });
      break;

    case 'STORE_IMAGE': {
      try {
        await storeImage(msg.url, msg.blob, msg.metadata);
        self.postMessage({ type: 'STORE_OK', id: msg.id, key: msg.url });
      } catch (err) {
        self.postMessage({ type: 'ERROR', id: msg.id, message: String(err) });
      }
      break;
    }

    case 'RETRIEVE_IMAGE': {
      try {
        const result = await retrieveImage(msg.key);
        if (result) {
          self.postMessage({ type: 'RETRIEVE_OK', id: msg.id, blob: result.data, metadata: result.metadata });
        } else {
          self.postMessage({ type: 'RETRIEVE_MISS', id: msg.id, key: msg.key });
        }
      } catch (err) {
        self.postMessage({ type: 'ERROR', id: msg.id, message: String(err) });
      }
      break;
    }

    case 'CLEAR': {
      const database = await openDB();
      const tx = database.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).clear();
      break;
    }

    default:
      console.warn('[VYNX:Worker] Mensaje desconocido:', msg.type);
  }
};
```

### Pruebas Finales — Matriz de Escenarios

| # | Escenario | Acción | Resultado Esperado |
|---|-----------|--------|--------------------|
| 1 | **Init** | Enviar `INIT` al worker | Recibir `READY`; IndexedDB abierta |
| 2 | **Store** | Enviar `STORE_IMAGE` con blob válido | Recibir `STORE_OK`; ítem visible en DevTools > Application > IndexedDB |
| 3 | **Retrieve hit** | Enviar `RETRIEVE_IMAGE` con key existente | Recibir `RETRIEVE_OK` con el mismo blob |
| 4 | **Retrieve miss** | Enviar `RETRIEVE_IMAGE` con key inexistente | Recibir `RETRIEVE_MISS` |
| 5 | **Persist** | Recargar página, enviar `RETRIEVE_IMAGE` | Recibir `RETRIEVE_OK` (persistencia real) |
| 6 | **Clear** | Enviar `CLEAR` | IndexedDB vacía; siguiente retrieve → `RETRIEVE_MISS` |
| 7 | **Error handling** | Enviar blob inválido / DB bloqueada | Recibir `ERROR` con mensaje descriptivo |
| 8 | **Main thread** | Ejecutar 10 stores consecutivos | `performance.now()` delta en main thread < 2ms por operación |

### Tests Requeridos (Vitest)

```typescript
// tests/__tests__/worker-indexeddb.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock de IndexedDB en entorno Node (usar fake-indexeddb)
import 'fake-indexeddb/auto';

describe('Worker: IndexedDB Storage', () => {
  let worker: Worker;

  beforeEach(async () => {
    // Instanciar el worker (o usar un mock del protocolo de mensajes)
    worker = new Worker(new URL('../../src/workers/image-worker.ts', import.meta.url), {
      type: 'module',
    });
    // Esperar READY
    await new Promise<void>((resolve) => {
      worker.onmessage = (e) => { if (e.data.type === 'READY') resolve(); };
      worker.postMessage({ type: 'INIT' });
    });
  });

  it('almacena un blob en IndexedDB y recibe STORE_OK', async () => {
    const blob = new Blob(['fake-image'], { type: 'image/png' });
    const metadata = { url: 'https://example.com/img.png', size: blob.size, mimeType: 'image/png', timestamp: Date.now() };

    const response = await new Promise<MessageEvent['data']>((resolve) => {
      worker.onmessage = (e) => resolve(e.data);
      worker.postMessage({ type: 'STORE_IMAGE', id: '1', url: 'https://example.com/img.png', blob, metadata });
    });

    expect(response.type).toBe('STORE_OK');
    expect(response.key).toBe('https://example.com/img.png');
  });

  it('recupera un blob almacenado previamente (RETRIEVE_OK)', async () => {
    const blob = new Blob(['data'], { type: 'image/jpeg' });
    const metadata = { url: 'https://example.com/photo.jpg', size: blob.size, mimeType: 'image/jpeg', timestamp: Date.now() };

    // Primero almacenar
    await new Promise<void>((resolve) => {
      worker.onmessage = (e) => { if (e.data.type === 'STORE_OK') resolve(); };
      worker.postMessage({ type: 'STORE_IMAGE', id: '2', url: 'https://example.com/photo.jpg', blob, metadata });
    });

    // Luego recuperar
    const response = await new Promise<MessageEvent['data']>((resolve) => {
      worker.onmessage = (e) => resolve(e.data);
      worker.postMessage({ type: 'RETRIEVE_IMAGE', id: '3', key: 'https://example.com/photo.jpg' });
    });

    expect(response.type).toBe('RETRIEVE_OK');
    expect(response.blob).toBeInstanceOf(Blob);
  });

  it('retorna RETRIEVE_MISS para una key inexistente', async () => {
    const response = await new Promise<MessageEvent['data']>((resolve) => {
      worker.onmessage = (e) => resolve(e.data);
      worker.postMessage({ type: 'RETRIEVE_IMAGE', id: '4', key: 'https://noexists.com/x.png' });
    });

    expect(response.type).toBe('RETRIEVE_MISS');
  });

  it('limpia el storage con CLEAR y posterior retrieve devuelve MISS', async () => {
    const blob = new Blob(['x'], { type: 'image/png' });
    const metadata = { url: 'https://example.com/x.png', size: 1, mimeType: 'image/png', timestamp: Date.now() };

    await new Promise<void>((resolve) => {
      worker.onmessage = (e) => { if (e.data.type === 'STORE_OK') resolve(); };
      worker.postMessage({ type: 'STORE_IMAGE', id: '5', url: 'https://example.com/x.png', blob, metadata });
    });

    worker.postMessage({ type: 'CLEAR' });

    // Esperar un tick
    await new Promise((r) => setTimeout(r, 50));

    const response = await new Promise<MessageEvent['data']>((resolve) => {
      worker.onmessage = (e) => resolve(e.data);
      worker.postMessage({ type: 'RETRIEVE_IMAGE', id: '6', key: 'https://example.com/x.png' });
    });

    expect(response.type).toBe('RETRIEVE_MISS');
  });
});
```

### Dependencia de Test: `fake-indexeddb`

Para poder ejecutar los tests en Node.js (Vitest/Node), IndexedDB no existe nativamente. Usar:

```bash
npm install --save-dev fake-indexeddb
```

En `tests/setup.ts`:

```typescript
import 'fake-indexeddb/auto';
```

### Checklist de Aceptación Final

- [ ] Worker se instancia sin errores en browser real (Chrome / Firefox)
- [ ] `INIT` → `READY` en < 100ms
- [ ] `STORE_IMAGE` persiste blobs en IndexedDB (verificable en DevTools)
- [ ] `RETRIEVE_IMAGE` retorna el blob correcto en < 5ms (cache hit)
- [ ] `RETRIEVE_MISS` maneja correctamente keys inexistentes
- [ ] `CLEAR` vacía el store completamente
- [ ] Main thread no se bloquea durante operaciones (verificar con Performance tab)
- [ ] Todos los tests de Vitest pasan (`npm test`)
- [ ] Build sin errores (`npm run build`)
- [ ] TypeScript sin errores (`npx tsc --noEmit`)
