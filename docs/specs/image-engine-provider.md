# SPEC: ImageEngine Provider

> **Nota**: Esta librería debe poder ejecutarse en navegadores reales y emuladores de Smart TVs (Tizen, WebOS). Por cada spec cumplido, debemos poder ver mediante console logs la ejecución y demos del progreso.

## Overview

El Provider debe instanciar y compartir el motor de caché eficientemente sin causar re-renders en los children.

## 🎯 Integración con Storage

El ImageEngine **NO conoce la implementación de storage** - solo usa la interfaz `IStorageAdapter`. El Provider delega la selección del adapter a `StorageFactory`:

```
ImageEngineProvider
       │
       ▼
┌──────────────────┐
│  StorageFactory  │  ← Detecta plataforma
│  (createAdapter) │
└──────────────────┘
       │
       ▼
┌─────────────────────────────┐
│     IStorageAdapter          │  ← Interfaz común
│  save() → get() → delete()  │
└─────────────────────────────┘
```

El ImageEngine usa el adapter sin saber si es IndexedDB, FileSystem o Memory.

## Problem

1. ❌ Provider crea nueva instancia en cada render
2. ❌ Children re-renderizan cuando no es necesario
3. ❌ No hay configuración centralizada

## Solution

Provider optimizado con memoization y configuración flexible.

## API Propuesta

```typescript
interface ImageEngineConfig {
  // Storage
  storageAdapter?: IStorageAdapter;
  maxCacheSizeMB?: number;
  evictionPolicy?: 'lru' | 'ttl' | 'size' | 'manual';
  defaultTTLMs?: number;

  // Network
  networkDetection?: boolean;
  defaultPriority?: 'high' | 'low';
  lowResThreshold?: 'slow-2g' | '2g' | '3g';

  // Worker
  workerEnabled?: boolean;
  workerPath?: string;

  // Debug
  debugMode?: boolean;
  logLevel?: 'error' | 'warn' | 'info' | 'debug';
}

interface ImageEngineProviderProps {
  children: ReactNode;
  config?: Partial<ImageEngineConfig>;
  // Legacy support
  storageAdapter?: IStorageAdapter;
}

function ImageEngineProvider({ 
  children, 
  config,
  storageAdapter 
}: ImageEngineProviderProps): JSX.Element;

function useImageEngine(): ImageEngine;
function useCacheStats(): CacheStats;
function useNetworkStatus(): NetworkInfo;
```

## Fases de Implementación

### Fase A: Config Object

- [ ] Aceptar objeto `config` con todas las opciones
- [ ] Merge con defaults
- [ ] Validar configuración

**Criterios de aceptación:**
- [ ] `config` se acepta como prop
- [ ] Valores por defecto sensatos
- [ ] Validación de valores inválidos

```typescript
const DEFAULT_CONFIG: ImageEngineConfig = {
  maxCacheSizeMB: 100,
  evictionPolicy: 'lru',
  networkDetection: true,
  defaultPriority: 'low',
  workerEnabled: true,
  debugMode: false,
};
```

### Fase B: Memoization

- [ ] Memoizar engine instance
- [ ] No re-crear engine cuando cambia config
- [ ] Provider no causa re-renders

**Criterios de aceptación:**
- [ ] `useMemo` para engine instance
- [ ] Children no re-renderizan sin motivo
- [ ] Cambio de config recrea engine solo si es necesario

### Fase C: Hooks de Stats

- [ ] `useCacheStats()` - hits, misses, size
- [ ] `useNetworkStatus()` - tipo de conexión

**Criterios de aceptación:**
- [ ] Hooks funcionan correctamente
- [ ] Stats se actualizan en tiempo real

### Fase D: Debug Mode

- [ ] Overlay de debug (opcional)
- [ ] Logging configurable

**Criterios de aceptación:**
- [ ] `debugMode` habilita logs
- [ ] Logs no aparecen en producción

## Usage

```typescript
// Configuración completa
<ImageEngineProvider
  config={{
    maxCacheSizeMB: 500,
    evictionPolicy: 'lru',
    workerEnabled: true,
    debugMode: process.env.NODE_ENV === 'development'
  }}
>
  <App />
</ImageEngineProvider>

// Hooks
function MyComponent() {
  const engine = useImageEngine();
  const stats = useCacheStats();
  const network = useNetworkStatus();
  
  return (
    <div>
      Cache: {stats.hitRate}% ({stats.sizeMB}MB)
      Network: {network.effectiveType}
    </div>
  );
}
```

## Tests Requeridos

```typescript
// image-engine-provider.test.ts
describe('ImageEngineProvider', () => {
  it('creates engine once', () => {...})
  it('accepts config object', () => {...})
  it('does not re-render children on unrelated updates', () {...})
  useCacheStats returns correct stats', () => {...})
  useNetworkStatus returns network info', () => {...})
});
```

## Dependencies

- Ninguna (solo React hooks)

## Notes

- Provider debe ser lo más liviano posible
- Considerar Context splitting si hay demasiados consumers

---

## 📝 Implementación Desde Cero

> Esta sección guía la implementación cuando se parte desde cero (solo docs).

### Prerequisites

- [x] ImageEngine (ya existe)
- [x] IndexedDBAdapter (ya existe)
- [ ] StorageFactory (recomendado)
- [ ] Worker Integration (opcional)

### Archivo a Modificar

```
src/components/ImageEngineContext.tsx
```

### Pasos de Implementación

1. **Fase A: Agregar Config**
   - Definir `ImageEngineConfig` interface
   - Agregar prop `config` al provider
   - Merge con defaults

```typescript
// ImageEngineContext.tsx - Agregar config

interface ImageEngineConfig {
  maxCacheSizeMB?: number;
  evictionPolicy?: 'lru' | 'ttl' | 'size' | 'manual';
  workerEnabled?: boolean;
  debugMode?: boolean;
}

interface ImageEngineProviderProps {
  children: ReactNode;
  config?: Partial<ImageEngineConfig>;
}
```

2. **Fase B: Memoization**
   - Already implementado parcialmente (useMemo para engine)
   - Verificar que no hay re-renders innecesarios

3. **Fase C: Agregar Hooks**

```typescript
// Nuevos hooks a agregar

export function useCacheStats() {
  const { engine } = useImageEngine();
  // Retornar stats del engine
}

export function useNetworkStatus() {
  const { engine } = useImageEngine();
  // Retornar network info
}
```

4. **Fase D: Debug Mode**

```typescript
// Debug mode - console logs condicionales

if (config.debugMode) {
  console.log('[ImageEngine] Cache hit:', url);
}
```

### Verificación

```bash
# Re-renders
# 1. React DevTools > Components
# 2. Highlight updates when scrolling
# 3. Solo SmartImage debe re-renderizar

# Hooks
# 1. useCacheStats() retorna stats正确
# 2. useNetworkStatus() retorna network info正确
```
