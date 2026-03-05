# SPEC: FileSystem Adapter

> **Nota**: Esta librería debe poder ejecutarse en navegadores reales y emuladores de Smart TVs (Tizen, WebOS). Por cada spec cumplido, debemos poder ver mediante console logs la ejecución y demos del progreso.

## Overview

Adapter de almacenamiento usando File System Access API para Smart TVs (Tizen, WebOS).

## Problem

Tizen y WebOS no soportan IndexedDB pero sí tienen File System Access API. Necesitamos un adapter que use el sistema de archivos local.

## Solution

Implementar `IStorageAdapter` usando File System Access API o legacy FileSystem APIs.

## API

```typescript
import { IStorageAdapter, StorageMetadata } from './IStorageAdapter';

export interface FileSystemAdapterOptions {
  rootDirectory?: string;  // 'vynx-cache' default
  maxSizeMB?: number;
}

export class FileSystemAdapter implements IStorageAdapter {
  constructor(options?: FileSystemAdapterOptions);

  // IStorageAdapter implementation
  save(key: string, data: Blob, metadata: StorageMetadata): Promise<void>;
  get(key: string): Promise<{ data: Blob; metadata: StorageMetadata } | null>;
  delete(key: string): Promise<void>;
  clear(): Promise<void>;
  getQuotaUsage(): Promise<number>;

  // FileSystem specific
  getSize(): Promise<number>;
  requestPersistentAccess(): Promise<boolean>;
}
```

## Implementation Details

```typescript
// Pseudo-código
class FileSystemAdapter {
  private rootDir: FileSystemDirectoryHandle;

  async save(key: string, blob: Blob, metadata: StorageMetadata) {
    const file = await this.rootDir.getFileHandle(key, { create: true });
    const writable = await file.createWritable();
    await writable.write({ blob });
    await writable.close();

    // Guardar metadata en archivo separado
    await this.saveMetadata(key, metadata);
  }

  async get(key: string) {
    try {
      const file = await this.rootDir.getFileHandle(key);
      const blob = await file.getFile();
      const metadata = await this.getMetadata(key);
      return { data: blob, metadata };
    } catch {
      return null;
    }
  }
}
```

## Fases de Implementación

### Fase A: Basic Operations

- [ ] Implementar `save()` - guardar blob como archivo
- [ ] Implementar `get()` - leer blob desde archivo
- [ ] Implementar `delete()` - eliminar archivo

**Criterios de aceptación:**
- [ ] `save()` crea archivo en sistema local
- [ ] `get()` retorna el blob correcto
- [ ] `delete()` elimina el archivo

### Fase B: Metadata & Quota

- [ ] Guardar/leer metadata en archivo .meta
- [ ] Implementar `getQuotaUsage()`
- [ ] Implementar `clear()`

**Criterios de acceptance:**
- [ ] Metadata se guarda junto con el archivo
- [ ] `clear()` elimina todos los archivos

### Fase C: Persistence

- [ ] Request persistent access (evitar que browser borre)
- [ ] Handle de permisos negados

**Criterios de aceptación:**
- [ ] Si permisos negados, degradar gracefully

## Compatibilidad

| Platform | API Support | Notes |
|----------|-------------|-------|
| Tizen 4.0+ | ✅ | FileSystem API |
| WebOS 3.0+ | ✅ | FileSystem API |
| Chrome Desktop | ✅ | FileSystem Access API |
| Firefox | ⚠️ | Solo showOpenFilePicker |
| Safari | ❌ | No support |

## Tests Requeridos

```typescript
// filesystem-adapter.test.ts
describe('FileSystemAdapter', () => {
  it('saves and retrieves blob', async () => {...})
  it('deletes file correctly', async () => {...})
  it('handles permission denied', async () => {...})
  it('tracks quota usage', async () => {...})
});
```

## Dependencies

- Ninguna dependencia externa (API nativa)

## Notes

- FileSystem Access API requiere HTTPS
- En Tizen, el path es diferente (usa `caches` directory)
- Considerar polyfill para Firefox
