# VYNX Engine - SPECIFICATION

## Importante: Esta es una Librería

> **VYNX Engine es una librería** - debe tratarse siempre como una librería, no como una aplicación standalone. Todos los specs y la implementación deben orientarse a que esta librería pueda ser integrada en otras aplicaciones (web apps, smart TVs, etc.).

## Overview

VYNX Engine es una librería de caché de imágenes de alto rendimiento diseñada para aplicaciones donde las imágenes son el producto principal (streaming, e-commerce, galerías). Soporta múltiples plataformas (Web, Tizen, WebOS, WebViews) con detección automática del mejor mecanismo de almacenamiento.

## Goals

- **Rendimiento**: 60fps constante, cache hit < 5ms
- **Compatibilidad**: Web, Smart TVs (Tizen/WebOS), WebViews
- **UX**: Loading states, error handling, offline support
- **DX**: API simple, zero-config, typed

---

## 🧪 Testing Guidelines

Basado en mejores prácticas:

### Estructura de Tests

```
tests/
├── __tests__/
│   ├── helpers/           # Utilidades solo para tests
│   │   └── mock-storage.ts
│   └── ...
└── setup.ts              # Configuración global de tests
```

### Reglas de Testing

1. **Tests unitarios NO deben depender de servicios externos** (ej. IndexedDB real)
2. **Usar mocks** para hacer tests rápidos y deterministas
3. **Ubicación**: Si una utilidad SOLO se usa en tests, debe estar en `src/__tests__/helpers/`, NO en `src/utils/`
4. **Más tests ≠ mejor calidad** - Cubrir casos principales, no cada variación de edge case

### Console Logs para Debug

Cada módulo debe incluir logs significativos para debugging:

```typescript
// Ejemplo de logging
console.log('[VYNX:PlatformDetector]', { platform, capabilities });
console.log('[VYNX:StorageFactory]', { adapter, storageType });
console.log('[VYNX:ImageEngine]', { cacheHit, loadTime });
```

Habilitar con `debug: true` en la configuración del provider.

## 📁 Module Specs

Cada módulo tiene su propio spec en `docs/specs/`:

| Spec | Status | Priority |
|------|--------|----------|
| [SPEC: Project Setup - Vite](specs/project-setup-vite.md) | 🔄 In Progress | High |
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
│                                                                 │
│    ⚠️ NO conoce la implementación de storage                  │
│    ⚠️ Solo usa IStorageAdapter                               │
└─────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                   IStorageAdapter                            │
│            (Interfaz COMÚN - save, get, delete)             │
└─────────────────────────────────────────────────────────────┘
           │                   │                   │
           ▼                   ▼                   ▼
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│  IndexedDB      │  │  FileSystem     │  │    Memory       │
│  Adapter        │  │  Adapter        │  │    Adapter      │
│  (Web)          │  │  (Tizen/WebOS)  │  │    (Fallback)   │
└─────────────────┘  └─────────────────┘  └─────────────────┘
                               ▲
                               │
                    ┌──────────────────┐
                    │  StorageFactory  │
                    │ (detecta plataforma)
                    └──────────────────┘
```

**Patrón Adapter**: ImageEngine usa la misma interfaz sin importar el device.

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
# Requerimientos
node --version  # >= 24.0.0 (soporta TypeScript nativamente)

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
├── package.json                 # Configuración npm (Node.js 24)
├── tsconfig.json               # TypeScript config
├── biome.json                  # Biome linter/formatter
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
└── tests/                    # Tests unitarios
    └── __tests__/
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
- [ ] Verificar que el código compila (`npm run build`)
- [ ] Verificar types (`npx tsc --noEmit`)
- [ ] Verificar lint (`npx biome check .`)
- [ ] Probar en la demo app

### Commands de Desarrollo

```bash
# Desarrollo (watch mode)
npm run dev

# Build producción
npm run build

# TypeScript check
npx tsc --noEmit

# Biome lint
npx biome check .

# Demo app
cd ../vynx-engine-demo
npm link vynx-engine
npm run dev
```

---

## 📦 Configuración de Package.json para Librería

```json
{
  "name": "vynx-engine",
  "version": "0.1.0",
  "type": "module",
  "main": "./dist/index.js",
  "module": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js",
      "require": "./dist/index.cjs"
    }
  },
  "files": ["dist"],
  "scripts": {
    "dev": "tsc --watch",
    "build": "tsc",
    "test": "vitest",
    "lint": "biome check .",
    "format": "biome format --write ."
  },
  "peerDependencies": {
    "react": ">=18.0.0",
    "react-dom": ">=18.0.0"
  },
  "devDependencies": {
    "@types/node": "^22.0.0",
    "@types/react": "^18.0.0",
    "typescript": "^5.7.0",
    "vitest": "^2.0.0",
    "@biomejs/biome": "^1.9.0"
  },
  "engines": {
    "node": ">=24.0.0"
  }
}
```

## ⚙️ Configuración de TypeScript (tsconfig.json)

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "declaration": true,
    "declarationMap": true,
    "outDir": "./dist",
    "rootDir": "./src",
    "types": ["node"]
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "tests"]
}
```

**Nota para tests**: NO excluir `*.test.ts` del tsconfig. Incluir `tests/**/*` para que TypeScript procese los archivos de test correctamente.

---

## 🔒 Pipeline CI/CD Recomendado

Basado en mejores prácticas de seguridad:

1. **npm audit**: Bloquear en vulnerabilidades críticas (`npm audit --audit-level=high`)
2. **Cache**: Usar `actions/cache` para node_modules (basado en hash de package-lock.json)
3. **Escaneo de secretos**: TruffleHog para detectar credenciales en historial
4. **Verificación de build**: Asegurar que `dist/index.js` existe antes de considerar exitoso

```yaml
# .github/workflows/ci.yml
name: CI
on: [push, pull_request]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '24'
          cache: 'npm'
      
      - run: npm ci
      - run: npm run lint
      - run: npm run build
      
      - name: npm audit
        run: npm audit --audit-level=high
        
      - name: Verify build artifact
        run: test -f dist/index.js
```

---

*Last Updated: January 2026*
