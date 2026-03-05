# VYNX Engine - SPECIFICATION

## Overview

VYNX Engine es una librería de caché de imágenes de alto rendimiento diseñada para aplicaciones donde las imágenes son el producto principal (streaming, e-commerce, galerías). Soporta múltiples plataformas (Web, Tizen, WebOS, WebViews) con detección automática del mejor mecanismo de almacenamiento.

## Goals

- **Rendimiento**: 60fps constante, cache hit < 5ms
- **Compatibilidad**: Web, Smart TVs (Tizen/WebOS), WebViews
- **UX**: Loading states, error handling, offline support
- **DX**: API simple, zero-config, typed

## 📁 Module Specs

Cada módulo tiene su propio spec en `docs/specs/`:

| Spec | Status | Priority |
|------|--------|----------|
| [SPEC: Platform Detector](specs/platform-detector.md) | ❌ Pending | High |
| [SPEC: Storage Factory](specs/storage-factory.md) | ❌ Pending | High |
| [SPEC: FileSystem Adapter](specs/filesystem-adapter.md) | ❌ Pending | High |
| [SPEC: Memory Adapter](specs/memory-adapter.md) | ❌ Pending | Medium |
| [SPEC: Worker Integration](specs/worker-integration.md) | ❌ Pending | High |
| [SPEC: SmartImage Optimization](specs/smart-image-optimization.md) | ⚠️ Needs Work | High |
| [SPEC: ImageEngine Provider](specs/image-engine-provider.md) | ⚠️ Needs Work | High |

### Already Implemented

| Spec | Status |
|------|--------|
| [SPEC: Storage Adapter Interface](../src/core/storage/IStorageAdapter.ts) | ✅ Implemented |
| [SPEC: IndexedDB Adapter](../src/core/storage/IndexedDBAdapter.ts) | ✅ Implemented |
| [SPEC: Network Manager](../src/core/NetworkManager.ts) | ✅ Implemented |
| [SPEC: ImageEngine Core](../src/core/ImageEngine.ts) | ✅ Implemented |
| [SPEC: SmartImage Component](../src/components/SmartImage.tsx) | ⚠️ Needs Optimization |
| [SPEC: ImageEngine Provider](../src/components/ImageEngineContext.tsx) | ⚠️ Needs Work |

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                        SmartImage                            │
│                    (React Component)                         │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    ImageEngine                               │
│                 (Cache Logic Layer)                          │
└─────────────────────────────────────────────────────────────┘
                              │
          ┌───────────────────┼───────────────────┐
          ▼                   ▼                   ▼
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│  NetworkManager │  │  StorageFactory  │  │   WorkerPool    │
│  (Network API)  │  │  (Adapters)      │  │  (Background)   │
└─────────────────┘  └─────────────────┘  └─────────────────┘
                                              │
                 ┌──────────────────────────────┼──────────────┐
                 ▼                              ▼              ▼
        ┌──────────────┐            ┌──────────────┐  ┌──────────────┐
        │   IndexedDB   │            │ FileSystem   │  │    Memory    │
        │   Adapter     │            │   Adapter    │  │   Adapter    │
        └──────────────┘            └──────────────┘  └──────────────┘
```

## Performance Targets

| Metric | Target | Current |
|--------|--------|---------|
| Bundle Size | < 15KB | ~14KB ✅ |
| Cache Hit Time | < 5ms | ~5-10ms ⚠️ |
| Main Thread Blocking | < 2ms | Unknown ❌ |
| Cache Hit Rate | > 80% | N/A |
| Re-renders | 0 unnecessary | Unknown ❌ |

## Getting Started

```bash
# Install
npm install vynx-engine

# Basic usage
import { ImageEngineProvider, SmartImage } from 'vynx-engine';

<ImageEngineProvider>
  <SmartImage src="image.jpg" alt="Description" />
</ImageEngineProvider>
```

## Configuration

```typescript
<ImageEngineProvider
  config={{
    maxCacheSize: 500,        // MB
    evictionPolicy: 'lru',
    debug: true
  }}
  storageAdapter={customAdapter}
>
  {children}
</ImageEngineProvider>
```

---

## 📋 Implementation Workflow

> **IMPORTANT**: This section documents the process for implementing VYNX Engine from scratch when starting with ONLY the docs/specs (no existing code).

### Proceso de Implementación

Cuando el repositorio solo contiene documentación (`docs/` con `SPEC.md` y `specs/`), la implementación debe seguir este proceso:

```
1. Leer SPEC.md              → Entender overview y arquitectura
2. Leer spec específico      → Following las fases definidas
3. Crear estructura          → src/, components/, core/, etc.
4. Implementar código        → Following la API definida en el spec
5. Verificar                 → Asegurar que matchea criterios de aceptación
6. Actualizar spec           → Marcar tareas como ✅
7. Repetir para siguiente spec
```

### Reglas de Implementación

| Regla | Descripción |
|-------|-------------|
| **API Fidelity** | La implementación debe seguir EXACTAMENTE la API definida en el spec |
| **Phase by Phase** | Implementar una fase a la vez, verificando antes de continuar |
| **Acceptance Criteria** | Cada fase tiene criterios de aceptación - no pasar a siguiente hasta cumplir |
| **No Extrapolation** | No agregar features no documentados en el spec |
| **Tests Required** | Cada spec tiene tests mínimos requeridos |

### Estructura de Archivos a Crear

```
vynx-engine/
├── package.json                 # Configuración npm/bun
├── tsconfig.json               # TypeScript config
├── src/
│   ├── index.ts               # Barrel exports (export * from './components'; etc.)
│   ├── components/
│   │   ├── SmartImage.tsx    # Componente principal
│   │   └── ImageEngineContext.tsx  # Provider + hooks
│   ├── core/
│   │   ├── ImageEngine.ts    # Motor de caché (lógica)
│   │   ├── NetworkManager.ts # Detección de red
│   │   ├── platform/
│   │   │   └── PlatformDetector.ts   # NEW: Detección plataforma
│   │   └── storage/
│   │       ├── IStorageAdapter.ts    # Interfaz
│   │       ├── IndexedDBAdapter.ts    # Adapter Web
│   │       ├── FileSystemAdapter.ts   # NEW: Adapter Smart TVs
│   │       ├── MemoryAdapter.ts       # NEW: Adapter fallback
│   │       └── StorageFactory.ts      # NEW: Factory
│   └── workers/
│       └── image-worker.ts   # NEW: Web Worker
├── dist/                      # Build output
├── docs/
│   ├── SPEC.md               # Este archivo
│   ├── README.md
│   ├── plan-de-accion.md
│   └── specs/                # Specs detallados
│       ├── platform-detector.md
│       ├── storage-factory.md
│       ├── filesystem-adapter.md
│       ├── memory-adapter.md
│       ├── worker-integration.md
│       ├── smart-image-optimization.md
│       └── image-engine-provider.md
└── tests/                    # (opcional) Tests unitarios
```

### Orden de Implementación Sugerido

```
ORDEN RECOMENDADO:

1️⃣  SmartImage Optimization
    ├── React.memo
    ├── useMemo/useCallback
    └── Memory cleanup

2️⃣  Platform Detector
    ├── Detección userAgent
    └── Capabilities

3️⃣  Storage Factory
    ├── Factory pattern
    └── Adapter selection

4️⃣  FileSystem Adapter (Tizen/WebOS)

5️⃣  Memory Adapter

6️⃣  Worker Integration

7️⃣  ImageEngine Provider (config + hooks)
```

### Checkpoint de Implementación

Cada spec debe ser implementado siguiendo sus fases. Después de completar un spec:

- [ ] Marcar tareas como ✅ en el spec
- [ ] Verificar que el código compila (`bun run build`)
- [ ] Verificar que los types son correctos
- [ ] Probar en la demo app

### Commands de Desarrollo

```bash
# Desarrollo (watch mode)
bun run dev

# Build producción
bun run build

# Demo app
cd ../vynx-engine-demo
bun link vynx-engine
bun run dev
```

---

*Last Updated: January 2026*
