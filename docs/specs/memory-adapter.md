# SPEC: Memory Adapter

## Overview

Adapter de almacenamiento en memoria como fallback último o para WebViews simples.

## Problem

Algunos entornos no tienen IndexedDB ni FileSystem. Necesitamos un fallback que funcione en todos lados (aunque no persista).

## Solution

Implementar `IStorageAdapter` usando Map en memoria.

## API

```typescript
import { IStorageAdapter, StorageMetadata } from './IStorageAdapter';

export interface MemoryAdapterOptions {
  maxEntries?: number;     // Max items en cache
  maxSizeBytes?: number;  // Max tamaño total
}

export class MemoryAdapter implements IStorageAdapter {
  constructor(options?: MemoryAdapterOptions);

  // IStorageAdapter implementation
  save(key: string, data: Blob, metadata: StorageMetadata): Promise<void>;
  get(key: string): Promise<{ data: Blob; metadata: StorageMetadata } | null>;
  delete(key: string): Promise<void>;
  clear(): Promise<void>;
  getQuotaUsage(): Promise<number>;

  // Memory specific
  getStats(): { count: number; sizeBytes: number; hits: number; misses: number };
  setMaxSize(maxBytes: number): void;
}
```

## Implementation Details

```typescript
class MemoryAdapter {
  private cache = new Map<string, { blob: Blob; metadata: StorageMetadata; size: number }>();
  private maxSizeBytes: number;
  private hits = 0;
  private misses = 0;

  async save(key: string, blob: Blob, metadata: StorageMetadata): Promise<void> {
    // Evict si excede maxSize (LRU básico)
    while (this.cache.size > 0 && this.currentSize + blob.size > this.maxSizeBytes) {
      const oldestKey = this.cache.keys().next().value;
      this.delete(oldestKey);
    }

    this.cache.set(key, { blob, metadata, size: blob.size });
  }

  async get(key: string) {
    const entry = this.cache.get(key);
    if (entry) {
      this.hits++;
      return { data: entry.blob, metadata: entry.metadata };
    }
    this.misses++;
    return null;
  }
}
```

## Fases de Implementación

### Fase A: Basic Operations

- [ ] Implementar `save()` - guardar en Map
- [ ] Implementar `get()` - leer desde Map
- [ ] Implementar `delete()` - eliminar del Map

**Criterios de aceptación:**
- [ ] `save()` guarda correctamente
- [ ] `get()` retorna datos o null
- [ ] `delete()` elimina entrada

### Fase B: Size Limits

- [ ] Implementar `maxEntries` limit
- [ ] Implementar `maxSizeBytes` limit
- [ ] Basic LRU eviction

**Criterios de aceptación:**
- [ ] No excede límites configurados
- [ ] Eviction funciona automáticamente

### Fase C: Stats

- [ ] Track hits/misses
- [ ] Implementar `getStats()`

**Criterios de aceptación:**
- [ ] Stats accurate

## Use Cases

1. **WebView sin IndexedDB** - Fallback último
2. **Testing** - Fácil de mockear
3. **Debug mode** - Sin persistencia accidental

## Tests Requeridos

```typescript
// memory-adapter.test.ts
describe('MemoryAdapter', () => {
  it('stores and retrieves data', async () => {...})
  it('respects maxEntries limit', async () => {...})
  it('respects maxSizeBytes limit', async () => {...})
  it('tracks stats correctly', async () => {...})
});
```

## Dependencies

- Ninguna

## Notes

- No es persistente (se pierde al refresh)
- Útil para debugging
- Muy rápido (sin I/O)
