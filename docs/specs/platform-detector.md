# SPEC: Platform Detector

## Overview

Sistema de detección automática de plataforma para seleccionar el mejor adapter de almacenamiento.

## Problem

Diferentes dispositivos (Web, Tizen, WebOS, WebView) tienen diferentes APIs de almacenamiento disponibles. Necesitamos detectar automáticamente qué API usar.

## Solution

Un módulo que detecta el entorno de ejecución y retorna sus capacidades.

## API

```typescript
// Tipos
export type Platform = 'web' | 'tizen' | 'webos' | 'webview' | 'unknown';

export interface PlatformCapabilities {
  supportsIndexedDB: boolean;
  supportsFileSystem: boolean;
  supportsServiceWorkers: boolean;
  supportsBlob: boolean;
  maxStorageQuota: number; // MB
  isTV: boolean;
  isMobile: boolean;
  isLowEnd: boolean; // < 2GB RAM
}

// Funciones
export function detectPlatform(): Platform;
export function getPlatformCapabilities(platform: Platform): PlatformCapabilities;
export function getOptimalStorageType(platform: Platform, capabilities: PlatformCapabilities): StorageType;
```

## Detection Logic

```
detectPlatform()
    │
    ├─> navigator.userAgent.contains('Tizen') ──> 'tizen'
    │
    ├─> navigator.userAgent.contains('WebOS') ──> 'webos'  
    │
    ├─> isWebView() ──> 'webview'
    │
    └─> isBrowser() ──> 'web'
```

## Fases de Implementación

### Fase A: Detección Básica (MVP)

- [ ] Detectar por userAgent (Tizen, WebOS)
- [ ] Detectar si es WebView
- [ ] Detectar capabilities básicas

**Criterios de aceptación:**
- [ ] `detectPlatform()` retorna.platform correcta para Web
- [ ] No lanza errores en Safari (donde algunas APIs no existen)
- [ ] Tiempo de ejecución < 1ms

### Fase B: Capabilities Detalladas

- [ ] Detectar si IndexedDB está disponible
- [ ] Detectar si FileSystem API está disponible
- [ ] Detectar cuota de almacenamiento

**Criterios de aceptación:**
- [ ] `getPlatformCapabilities()` retorna todas las propiedades
- [ ] Correctamente reporta APIs no disponibles

### Fase C: Dispositivos de Bajos Recursos

- [ ] Detectar si es dispositivo de baja memoria
- [ ] Detectar velocidad de red

**Criterios de aceptación:**
- [ ] `isLowEnd` es true en dispositivos con < 2GB RAM

## Tests Requeridos

```typescript
// platform-detector.test.ts
describe('PlatformDetector', () => {
  it('detects web platform', () => {...})
  it('detects tizen platform', () => {...})
  it('handles missing APIs gracefully', () => {...})
  it('returns correct capabilities', () => {...})
});
```

## Dependencies

- Ninguna dependencia externa

## Notes

- UserAgent puede ser spoofeado, pero es suficiente para la mayoría de casos
- Considerar usar `navigator.userAgentData` cuando esté disponible

---

## 📝 Implementación Desde Cero

> Esta sección guía la implementación cuando se parte desde cero (solo docs).

### Archivo a Crear

```
src/core/platform/PlatformDetector.ts
```

### Pasos de Implementación

1. **Crear directorio** `src/core/platform/`
2. **Crear archivo** `PlatformDetector.ts`
3. **Implementar** siguiendo la API definida arriba
4. **Verificar** con los criterios de aceptación
5. **Exportar** desde `src/index.ts`

### Código Base (Template)

```typescript
// src/core/platform/PlatformDetector.ts

export type Platform = 'web' | 'tizen' | 'webos' | 'webview' | 'unknown';

export interface PlatformCapabilities {
  supportsIndexedDB: boolean;
  supportsFileSystem: boolean;
  supportsServiceWorkers: boolean;
  supportsBlob: boolean;
  maxStorageQuota: number;
  isTV: boolean;
  isMobile: boolean;
  isLowEnd: boolean;
}

export type StorageType = 'indexeddb' | 'filesystem' | 'memory';

// Implementar aquí...

export function detectPlatform(): Platform {
  // Implementar Fase A
}

export function getPlatformCapabilities(platform: Platform): PlatformCapabilities {
  // Implementar Fase B
}

export function getOptimalStorageType(
  platform: Platform,
  capabilities: PlatformCapabilities
): StorageType {
  // Implementar Fase C
}
```

### Export en index.ts

```typescript
// src/index.ts
export * from './core/platform/PlatformDetector';
```

### Criterios de Verificación

```bash
# Compila
bun run build

# Tipos correctos
npx tsc --noEmit

# No hay errores de lint
bun run lint
```
