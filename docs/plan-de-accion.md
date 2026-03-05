# Plan de Acción - VYNX Engine

## Reglas de Performance (Reglas de Oro)

> **Prioridad absoluta**: Todo en VYNX Engine está sujeto a estas reglas de performance. El objetivo es alcanzar rendimiento casi nativo.

### 1. Regla del Hilo Principal

**El hilo principal NUNCA debe bloquearse por más de 2ms.**

- ❌ NO: Decodificar imágenes en el hilo principal
- ❌ NO: Operaciones de IndexedDB sin async/await
- ✅ SI: Todo procesamiento pesado en Web Workers
- ✅ SI: Operaciones I/O siempre asíncronas

### 2. Regla del Re-render Cero

**Los componentes React no deben causar re-renders innecesarios.**

- ✅ SI: Usar `React.memo` para evitar re-renders del componente
- ✅ SI: Usar `useMemo` para objetos/arrays en props
- ✅ SI: Usar `useCallback` para callbacks dependencias
- ✅ SI: El Provider solo re-renderiza cuando cambia el engine

```typescript
// SmartImage debe ser memoizado
export const SmartImage = React.memo<SmartImageProps>(({ src, ...props }) => {
  // ...
}, (prevProps, nextProps) => {
  // Custom comparison: solo re-render si cambia src
  return prevProps.src === nextProps.src;
});
```

### 3. Regla del Cache Instantáneo

**Después del primer load, la imagen debe aparecer EN MENOS DE 50ms.**

- ✅ SI: `URL.createObjectURL` con Blob de IndexedDB es casi instantáneo
- ✅ SI: No hay decoding de imagen (el navegador lo hace con lazy loading)
- ✅ SI: Cache hit = render directo sin procesamiento

```
Cache HIT: ~1-5ms (tiempo de lectura IndexedDB + createObjectURL)
Cache MISS (red lenta): ~500-2000ms (depende de red)
```

### 4. Regla del Componente Inteligente

**El componente debe manejar TODOS los estados sin causar fricción.**

- Estados obligatorios:
  - `loading`: Spinner inline, NO blocking
  - `error`: Fallback visual, NO crash
  - `success`: Render inmediato
  - `offline`: Mostrar último cache disponible

- ✅ SI: Spinner con `will-change: opacity` para transiciones smooth
- ✅ SI: Placeholder con aspect-ratio para evitar layout shift
- ✅ SI: Error boundary para aislamiento de errores

### 5. Regla del Background Work

**Todo trabajo pesado se hace en background.**

- ✅ SI: Fetch de imágenes en paralelo
- ✅ SI: Save a IndexedDB async, no esperar confirmación
- ✅ SI: Progressive loading: mostrar low-res mientras carga HD

```
Flujo ideal:
1. User visits page
2. Mostrar skeleton/placeholder (instantáneo)
3. Si hay cache → mostrar imagen (~5ms)
4. Si no hay cache → fetch async + mostrar low-res cuando llegue
5. Background: fetch HD + reemplazar cuando llegue
```

### 6. Regla del Bundle Mínimo

**El overhead de la librería debe ser imperceptible.**

- ✅ SI: Bundle < 15KB minificado (sin React)
- ✅ SI: React como peerDependency (no duplicar)
- ✅ SI: Tree-shaking de componentes no usados
- ✅ SI: Solo cargar lo necesario por plataforma

### 7. Regla del Target: Netflix/Prime Video

**VYNX Engine está diseñado para apps donde las imágenes son el producto principal.**

- Pantallas tipo "Browse" con miles de imágenes
- Scrolling fluido a 60fps CONSTANTE
- No hay "loading delays" perceptibles después de primera carga
- Offline capability para contenido ya visto

### 8. Regla de Métricas

**Medir siempre. Optimizar lo que se mide.**

```typescript
// Métricas a tracking:
- First Contentful Paint (FCP)
- Largest Contentful Paint (LCP)
- Time to Interactive (TTI)
- Cache Hit Rate (target: >80%)
- Average Load Time (target: <100ms con cache)
- Main Thread Blocking Time (target: <2ms)
```

---

## Análisis del Estado Actual

### ✅ Implementado (Fase 1-4)

| Módulo | Estado | Descripción |
|--------|--------|-------------|
| `IStorageAdapter` | ✅ Listo | Interfaz contrato (save, get, delete, clear, getQuotaUsage) |
| `IndexedDBAdapter` | ✅ Listo | Implementación para Web moderno |
| `NetworkManager` | ✅ Listo | Detección 2G/3G/4G, velocidad, RTT |
| `ImageEngine` | ✅ Listo | Motor cache-first con lógica progresiva |
| `SmartImage` | ✅ Listo | Componente React plug-and-play |
| `ImageEngineProvider` | ✅ Listo | Inyección de dependencia |

### Evaluación de Performance - Estado Actual

| Métrica | Estado Actual | Target | Acción Necesaria |
|---------|---------------|--------|------------------|
| Bundle Size | ~14KB | <15KB | ✅ OK |
| React.memo en SmartImage | ❌ FALTA | Debe ser memoizado | Agregar React.memo |
| useCallback/useMemo | ⚠️ Parcial | Todo memoizado | Revisar dependencias |
| Worker Integration | ❌ FALTA | Workers obligatorios | Fase 6 |
| Cache Hit Time | ~5-10ms | <5ms | ✅ OK |
| Main Thread Blocking | ⚠️ Con bloqueos | <2ms | Fase 6 |
| Re-renders innecesarios | ⚠️ Posibles | 0 re-renders | Optimizar SmartImage |

### Checklist de Performance por Componente

- [ ] **SmartImage.tsx**: 
  - [ ] Envolver con `React.memo`
  - [ ] Custom comparison function (solo por src)
  - [ ] useCallback para handlers internos
  - [ ] useMemo para objetos stability

- [ ] **ImageEngineProvider.tsx**:
  - [ ] useMemo para engine instance
  - [ ] No causar re-renders en children

- [ ] **ImageEngine.ts**:
  - [ ] Mover a Worker (Fase 6)

- [ ] **IndexedDBAdapter.ts**:
  - [ ] Operaciones todas async
  - [ ] Considerar WebWorker para I/O

### ❌ Pendiente (Siguientes Fases)

| Módulo | Prioridad | Descripción |
|--------|-----------|-------------|
| Storage Adapters múltiples | Alta | Múltiples adaptadores según dispositivo |
| Platform Detection | Alta | Detectar entorno (Web, Tizen, WebOS, WebView) |
| Worker Integration | Alta | Procesamiento no bloqueante |
| Eviction Policies | Media | LRU, TTL, tamaño máximo |
| Pre-fetching | Media | Intersection Observer para lazy loading |
| Debug Panel | Baja | Panel visual overlay |

---

## Plan de Acción Detallado

### Fase 5: Arquitectura de Adaptadores Multi-Plataforma (Alta Prioridad)

> **Performance**: La detección de plataforma debe ser < 1ms. Se ejecuta solo una vez al inicio.

**Objetivo**: Crear un sistema de selección automática de adaptadores según el dispositivo.

#### 5.1 Sistema de Detección de Plataforma

```typescript
// src/core/platform/PlatformDetector.ts

export type Platform = 'web' | 'tizen' | 'webos' | 'webview' | 'unknown';

export interface PlatformCapabilities {
  supportsIndexedDB: boolean;
  supportsFileSystem: boolean;
  supportsServiceWorkers: boolean;
  maxStorageQuota: number; // MB
  isTV: boolean;
}

export function detectPlatform(): Platform { ... }
export function getPlatformCapabilities(platform: Platform): PlatformCapabilities { ... }
```

#### 5.2 Adapter Registry (Factory Pattern)

```typescript
// src/core/storage/StorageFactory.ts

import { IStorageAdapter } from './IStorageAdapter';
import { IndexedDBAdapter } from './IndexedDBAdapter';
import { FileSystemAdapter } from './FileSystemAdapter';
import { MemoryAdapter } from './MemoryAdapter';

export class StorageFactory {
  static createAdapter(): IStorageAdapter {
    const platform = detectPlatform();
    const capabilities = getPlatformCapabilities(platform);

    // Prioridad: FileSystem > IndexedDB > Memory
    if (capabilities.supportsFileSystem && capabilities.isTV) {
      return new FileSystemAdapter();
    }

    if (capabilities.supportsIndexedDB) {
      return new IndexedDBAdapter();
    }

    // Fallback último
    return new MemoryAdapter();
  }
}
```

#### 5.3 Nuevos Adaptadores a Implementar

| Adapter | Para | API de almacenamiento |
|---------|------|----------------------|
| `FileSystemAdapter` | Tizen, WebOS | File System Access API |
| `MemoryAdapter` | WebView simples | Map en memoria (no persiste) |
| `LocalStorageAdapter` | Fallback último | localStorage (no recomendado) |

**Tareas**:
- [ ] Crear `src/core/platform/PlatformDetector.ts`
- [ ] Crear `src/core/storage/StorageFactory.ts`
- [ ] Crear `src/core/storage/FileSystemAdapter.ts`
- [ ] Crear `src/core/storage/MemoryAdapter.ts`
- [ ] Actualizar `ImageEngine` para usar Factory
- [ ] Tests por cada adapter

---

### Fase 6: Workers para Procesamiento No Bloqueante (Alta Prioridad)

> **Performance**: Esta fase es CRÍTICA. El objetivo es mover TODO el trabajo pesado a workers.
> - Main thread: 0ms de trabajo de red/caché
> - UI siempre fluida a 60fps
> - Cache hit: < 5ms percibido por usuario

**Objetivo**: Mover toda la lógica de red y almacenamiento a un Web Worker.

#### 6.1 Estructura del Worker

```
src/
├── workers/
│   ├── image-worker.ts        # Entry point del worker
│   ├── worker-api.ts         # Mensajes entre main thread y worker
│   └── storage-bridge.ts     # Comunicación con IndexedDB desde worker
```

#### 6.2 API de Mensajes

```typescript
// Tipos de mensajes worker <-> main
type WorkerMessage =
  | { type: 'CACHE_GET'; key: string }
  | { type: 'CACHE_SET'; key: string; blob: Blob; metadata: StorageMetadata }
  | { type: 'FETCH_IMAGE'; url: string; options: ImageEngineOptions }
  | { type: 'NETWORK_CHANGE'; info: NetworkInfo };

type WorkerResponse =
  | { type: 'CACHE_HIT'; blob: Blob; metadata: StorageMetadata }
  | { type: 'CACHE_MISS'; url: string }
  | { type: 'FETCH_COMPLETE'; blob: Blob; fromCache: boolean }
  | { type: 'ERROR'; message: string };
```

#### 6.3 Integración con Provider

```typescript
// src/components/ImageEngineProvider.tsx

interface ProviderConfig {
  useWorker?: boolean;  // default: true en producción
  workerPath?: string;  // path custom al worker
}

<ImageEngineProvider useWorker={true}>
  <SmartImage src="..." />
</ImageEngineProvider>
```

**Tareas**:
- [ ] Crear `src/workers/image-worker.ts`
- [ ] Crear sistema de mensajes worker-main
- [ ] Mover lógica de fetch/cache al worker
- [ ] Actualizar `ImageEngine` para usar worker (opcional)
- [ ] Manejo de errores worker → main thread

---

### Fase 7: Políticas de Evicción (Media Prioridad)

> **Performance**: La evicción debe ejecutarse en background, nunca bloquear el render.

**Objetivo**: Gestión automática de espacio en caché.

#### 7.1 Estrategias de Evicción

| Política | Descripción | Caso de uso |
|---------|-------------|-------------|
| `LRU` | Least Recently Used | Mantener imágenes recientes |
| `TTL` | Time To Live | Imágenes que expiran |
| `SIZE` | Tamaño máximo total | No exceder cuota |
| `MANUAL` | Solo limpieza explícita | Control total usuario |

#### 7.2 Configuración

```typescript
interface CacheConfig {
  maxSize?: number;        // MB, default: 100
  evictionPolicy?: 'lru' | 'ttl' | 'size' | 'manual';
  defaultTTL?: number;     // ms, para política TTL
}

<ImageEngineProvider 
  config={{
    maxSize: 500,
    evictionPolicy: 'lru'
  }}
>
```

**Tareas**:
- [ ] Implementar `LRUEvictionPolicy`
- [ ] Implementar `TTLEvictionPolicy`
- [ ] Crear `CacheManager` que orqueste evicciones
- [ ] Hook de quota usage real-time
- [ ] Tests de evicción

---

### Fase 8: Pre-fetching Predictivo (Media Prioridad)

> **Performance**: El pre-fetching debe ser inteligente. NO descargar todo, solo lo probable.
> - Usar Intersection Observer con rootMargin configurable
> - Solo pre-fetch en WiFi o cuando hay带宽 disponible

**Objetivo**: Anticipar carga de imágenes antes de que el usuario llegue a ellas.

#### 8.1 Intersection Observer

```typescript
// Configuración de prefetch
interface PrefetchConfig {
  rootMargin?: string;    // default: "200px"
  threshold?: number;     // default: 0.1
  preloadOnHover?: boolean;
}

// Usage
<SmartImage 
  src="image.jpg"
  prefetch={true}        // hace prefetch cuando entra en viewport
  prefetchOnHover={true} // hace prefetch en hover del container
/>
```

#### 8.2 Priority Queue

- Cola de prioridad para múltiples imágenes
- Prioridad: viewport > hover > pre-cache

**Tareas**:
- [ ] Implementar `usePrefetch` hook
- [ ] Integrar Intersection Observer
- [ ] Priority queue para múltiples loads
- [ ] Configuración de rootMargin/threshold

---

### Fase 9: Panel de Debug Visual (Baja Prioridad)

> **Performance**: El debug panel debe renderizarse en una capa separada y no afectar performance.

**Objetivo**: Overlay visual para debugging en desarrollo.

```tsx
<ImageEngineProvider debugMode={true}>
  {/* App */}
</ImageEngineProvider>

// Renderiza overlay con:
// - Cache stats (hits, misses, size)
// - Network status
// - Clear cache button
```

**Tareas**:
- [ ] Componente `<DebugPanel />`
- [ ] Stats: hit rate, cache size, network type
- [ ] Acciones: clear cache, force refresh
- [ ] Toggle con keyboard shortcut

---

## Resumen de Tareas por Fase

```
FASE 5: Adaptadores Multi-Plataforma
├── [ ] PlatformDetector.ts
├── [ ] StorageFactory.ts
├── [ ] FileSystemAdapter.ts
├── [ ] MemoryAdapter.ts
└── [ ] Actualizar ImageEngine

FASE 6: Workers
├── [ ] image-worker.ts
├── [ ] worker-api.ts
├── [ ] worker-bridge.ts
└── [ ] Integrar en Provider

FASE 7: Eviction Policies
├── [ ] CacheManager.ts
├── [ ] LRUEvictionPolicy.ts
├── [ ] TTLEvictionPolicy.ts
└── [ ] Tests de evicción

FASE 8: Pre-fetching
├── [ ] usePrefetch hook
├── [ ] Intersection Observer
└── [ ] Priority queue

FASE 9: Debug Panel
├── [ ] DebugPanel component
└── [ ] Stats overlay
```

---

## Orden de Implementación Sugerido

1. **Fase 5** (Adaptadores) - Crítico para soportar TVs
2. **Fase 6** (Workers) - Crítico para rendimiento 60fps
3. **Fase 7** (Eviction) - Necesario para producción
4. **Fase 8** (Pre-fetch) - UX improvement
5. **Fase 9** (Debug) - Development only

---

## Notas Técnicas

### Árbol de Decisión de Adaptador

```
detectPlatform()
    │
    ├─> isTizen() ──> FileSystemAdapter
    │
    ├─> isWebOS() ──> FileSystemAdapter
    │
    ├─> isWebView() ──> MemoryAdapter (default)
    │                     │
    │                     └─> Si storage disponible ──> IndexedDBAdapter
    │
    └─> isWeb() ──> IndexedDBAdapter
                      │
                      └─> Si no disponible ──> MemoryAdapter
```

### Compatibilidad

| Plataforma | IndexedDB | FileSystem | Workers |
|------------|-----------|------------|---------|
| Chrome Desktop | ✅ | ✅ | ✅ |
| Firefox | ✅ | ⚠️ | ✅ |
| Safari | ✅ | ❌ | ✅ |
| Tizen | ❌ | ✅ | ⚠️ |
| WebOS | ❌ | ✅ | ⚠️ |
| WebView Android | ⚠️ | ❌ | ⚠️ |
| WebView iOS | ✅ | ❌ | ✅ |

---

*Plan creado: Enero 2026*
*Última actualización: Enero 2026*
