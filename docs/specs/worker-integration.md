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
