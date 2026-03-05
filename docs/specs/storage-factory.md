# SPEC: Storage Factory

> **Nota**: Esta librería debe poder ejecutarse en navegadores reales y emuladores de Smart TVs (Tizen, WebOS). Por cada spec cumplido, debemos poder ver mediante console logs la ejecución y demos del progreso.

## Overview

Factory que crea el adapter de almacenamiento apropiado según la plataforma detectada.

## 🎯 Patrón Adapter (Strategy Pattern)

El objetivo es que **ImageEngine siempre use la misma interfaz** (`IStorageAdapter`) sin conocer la implementación específica. Los métodos son los mismos, pero la tecnología de almacenamiento varía según el device:

```
ImageEngine
    │
    ▼
┌─────────────────────────────┐
│     IStorageAdapter         │  ← Interfaz COMÚN
│  (save, get, delete, etc)  │
└─────────────────────────────┘
    │
    ├──→ IndexedDBAdapter    (web / browser)
    ├──→ FileSystemAdapter  (Tizen / WebOS / Smart TVs)
    └──→ MemoryAdapter      (fallback / WebView)
```

## Interfaz IStorageAdapter

Todos los adapters deben implementar esta interfaz:

```typescript
export interface StorageMetadata {
  url: string;
  size: number;
  mimeType: string;
  timestamp: number;
  expiresAt?: number;
}

export interface IStorageAdapter {
  save(key: string, data: Blob, metadata: StorageMetadata): Promise<void>;
  get(key: string): Promise<{ data: Blob; metadata: StorageMetadata } | null>;
  delete(key: string): Promise<void>;
  clear(): Promise<void>;
  getQuotaUsage(): Promise<number>;
}
```

**ImageEngine solo conoce esta interfaz** - no sabe si usa IndexedDB, FileSystem o Memory.

## Problem

El usuario no debería tener que elegir manualmente qué adapter usar. La librería debe elegir automáticamente.

## Solution

Un factory que recibe la plataforma y retorna el mejor adapter disponible.

## API

```typescript
import { IStorageAdapter } from './IStorageAdapter';
import { Platform, PlatformCapabilities } from './PlatformDetector';

export type StorageType = 'indexeddb' | 'filesystem' | 'memory' | 'localstorage';

export interface StorageFactoryOptions {
  preferredType?: StorageType;  // Override del tipo
  maxSizeMB?: number;           // Límite de tamaño
}

export class StorageFactory {
  static createAdapter(
    platform: Platform,
    capabilities: PlatformCapabilities,
    options?: StorageFactoryOptions
  ): IStorageAdapter;

  static getOptimalStorageType(
    platform: Platform,
    capabilities: PlatformCapabilities
  ): StorageType;
}
```

## Decision Tree

```
Platform: tizen/webos
    └── FileSystemAdapter

Platform: web + IndexedDB available
    └── IndexedDBAdapter

Platform: webview + no IndexedDB
    └── MemoryAdapter

Platform: unknown + no IndexedDB
    └── MemoryAdapter (fallback)

Force: preferredType='memory'
    └── MemoryAdapter
```

## Fases de Implementación

### Fase A: Factory Básico

- [ ] Crear StorageFactory con lógica de selección
- [ ] Integrar con PlatformDetector

**Criterios de aceptación:**
- [ ] `createAdapter()` retorna IndexedDBAdapter en web
- [ ] `createAdapter()` retorna FileSystemAdapter en Tizen/WebOS
- [ ] No lanza errores

### Fase B: Fallback Chain

- [ ] Si primary falla, intentar secondary
- [ ] Logging de qué adapter se usó

**Criterios de aceptación:**
- [ ] Si IndexedDB falla, usa MemoryAdapter
- [ ] Console log indica qué adapter se usó

### Fase C: Options

- [ ] Soporte para preferredType override
- [ ] Soporte para maxSizeMB config

**Criterios de aceptación:**
- [ ] `preferredType: 'memory'` fuerza MemoryAdapter
- [ ] maxSizeMB se pasa al adapter

## Tests Requeridos

```typescript
// storage-factory.test.ts
describe('StorageFactory', () => {
  it('returns IndexedDBAdapter for web', () => {...})
  it('returns FileSystemAdapter for tizen', () => {...})
  it('falls back to memory on failure', () => {...})
  it('respects preferredType override', () => {...})
});
```

## Dependencies

- `PlatformDetector`
- `IStorageAdapter`
- `IndexedDBAdapter`
- `FileSystemAdapter` (pendiente)
- `MemoryAdapter` (pendiente)

## Notes

- El factory debe ser singleton o instanciarse una sola vez
- Considerar cachear el adapter creado

---

## 📝 Implementación Desde Cero

> Esta sección guía la implementación cuando se parte desde cero (solo docs).

### Prerequisites

Este spec DEPENDE de:
- [ ] PlatformDetector (debe estar implementado primero)
- [ ] IndexedDBAdapter (ya existe)
- [ ] FileSystemAdapter (pendiente - spec separado)
- [ ] MemoryAdapter (pendiente - spec separado)

### Archivo a Crear

```
src/core/storage/StorageFactory.ts
```

### Dependencias de Imports

```typescript
import { IStorageAdapter } from './IStorageAdapter';
import { Platform, PlatformCapabilities } from '../platform/PlatformDetector';
import { IndexedDBAdapter } from './IndexedDBAdapter';
import { FileSystemAdapter } from './FileSystemAdapter';
import { MemoryAdapter } from './MemoryAdapter';
```

### Código Base (Template)

```typescript
// src/core/storage/StorageFactory.ts

import { IStorageAdapter } from './IStorageAdapter';
import { Platform, PlatformCapabilities } from '../platform/PlatformDetector';
import { IndexedDBAdapter } from './IndexedDBAdapter';
import { FileSystemAdapter } from './FileSystemAdapter';
import { MemoryAdapter } from './MemoryAdapter';

export type StorageType = 'indexeddb' | 'filesystem' | 'memory' | 'localstorage';

export interface StorageFactoryOptions {
  preferredType?: StorageType;
  maxSizeMB?: number;
}

export class StorageFactory {
  static createAdapter(
    platform: Platform,
    capabilities: PlatformCapabilities,
    options?: StorageFactoryOptions
  ): IStorageAdapter {
    // Implementar según Decision Tree
  }

  static getOptimalStorageType(
    platform: Platform,
    capabilities: PlatformCapabilities
  ): StorageType {
    // Implementar lógica de selección
  }
}
```

### Export en index.ts

```typescript
// src/index.ts
export * from './core/storage/StorageFactory';
```

### Criterios de Verificación

```bash
# Compila
npm run build

# Tipos correctos
npx tsc --noEmit

# Lint
npx biome check .

# Dependencias resueltas (sin errores de import)
```

### Dependencia de Specs

```
storage-factory.md
    │
    ├── platform-detector.md ✅ (PREREQUISITE)
    ├── indexeddb-adapter.md ✅ (ya existe)
    ├── filesystem-adapter.md ⚠️ (pendiente)
    └── memory-adapter.md ⚠️ (pendiente)
```
