# SPEC: SmartImage Component Optimization

> **Nota**: Esta librería debe poder ejecutarse en navegadores reales y emuladores de Smart TVs (Tizen, WebOS). Por cada spec cumplido, debemos poder ver mediante console logs la ejecución y demos del progreso.

## Overview

Optimizar el componente SmartImage para evitar re-renders innecesarios y mantener 60fps.

## Problem

El componente actual puede causar re-renders innecesarios y no está optimizado para el target de Netflix/Prime Video.

## Current Issues

1. ❌ No usa `React.memo`
2. ❌ Props no stability (objetos creados en cada render)
3. ⚠️ Puede causar layout shifts
4. ⚠️ Spinner puede afectar performance

## Solution

Aplicar optimizaciones de React performance.

## API (sin cambios)

```typescript
interface SmartImageProps {
  src: string;
  lowResSrc?: string;
  priority?: 'high' | 'low';
  alt: string;
  className?: string;
  style?: React.CSSProperties;
  onLoad?: () => void;
  onError?: (error: Error) => void;
  // Nuevas props
  placeholder?: 'blur' | 'color' | 'none';
  objectFit?: 'cover' | 'contain' | 'fill';
  loadingStrategy?: 'lazy' | 'eager';
}
```

## Fases de Implementación

### Fase A: React.memo

- [ ] Envolver SmartImage con React.memo
- [ ] Implementar custom comparison function

**Criterios de aceptación:**
- [ ] Re-render solo cuando cambia `src`
- [ ] No re-render cuando cambia `priority` o `lowResSrc` sin cambiar src

```typescript
export const SmartImage = React.memo<SmartImageProps>(
  ({ src, ...props }) => {
    // Component logic
  },
  (prevProps, nextProps) => {
    // Custom comparison: solo re-render si cambia src
    return prevProps.src === nextProps.src;
  }
);
```

### Fase B: Hooks Optimization

- [ ] Usar `useCallback` para handlers internos
- [ ] Usar `useMemo` para objetos stability
- [ ] Evitar creación de objetos en render

**Criterios de aceptación:**
- [ ] No crear objetos/funciones nuevas en cada render
- [ ] useEffect dependencies correctas

### Fase C: Layout Stability

- [ ] Implementar aspect-ratio placeholder
- [ ] Prevenir layout shift durante carga
- [ ] Transiciones smooth de loading → loaded

**Criterios de aceptación:**
- [ ] No hay layout shift al cargar imagen
- [ ] Aspect ratio se mantiene

```typescript
// Placeholder con aspect ratio
<div style={{ aspectRatio: '16/9', background: 'gray' }}>
  <img src="..." />
</div>
```

### Fase D: Memory Management

- [ ] Verificar cleanup de event listeners
- [ ] Verificar URL.revokeObjectURL se llama
- [ ] No memory leaks en uso prolongado

**Criterios de aceptación:**
- [ ] No memory leaks después de mount/unmount
- [ ] URLs revocadas correctamente

## Performance Checklist

```bash
# Antes de optimizar
✓ React DevTools: 10+ re-renders al hacer scroll

# Después de optimizar  
✓ React DevTools: 0 re-renders innecesarios
✓ Main thread: < 2ms trabajo por imagen
✓ 60fps constante en scroll
```

## Tests Requeridos

```typescript
// smart-image-optimization.test.ts
describe('SmartImage Optimization', () => {
  it('does not re-render when parent re-renders', () => {...})
  it('only re-renders when src changes', () => {...})
  it('cleans up on unmount', () => {...})
  it('maintains aspect ratio during load', () => {...})
  it('performs no layout shift', () => {...})
});
```

## Dependencies

- React 18+
- Ninguna dependencia externa

## Notes

- Considerar usar `useSyncExternalStore` si hay problemas de concurrencia
- Para miles de imágenes, considerar virtualización

---

## 📝 Implementación Desde Cero

> Esta sección guía la implementación cuando se parte desde cero (solo docs).

### Prerequisites

- [x] ImageEngine (ya existe)
- [x] ImageEngineProvider (ya existe)
- [x] IndexedDBAdapter (ya existe)

### Archivo a Modificar

```
src/components/SmartImage.tsx
```

### Pasos de Implementación

1. **Fase A: React.memo**
   - Envolver componente con `React.memo`
   - Agregar custom comparison function

```typescript
// SmartImage.tsx - ANTES (sin memo)
export const SmartImage = ({ src, ...props }) => {
  // ...
};

// SmartImage.tsx - DESPUÉS (con memo)
export const SmartImage = React.memo<SmartImageProps>(
  ({ src, ...props }) => {
    // Component logic
  },
  (prevProps, nextProps) => {
    // Custom comparison: solo re-render si cambia src
    return prevProps.src === nextProps.src;
  }
);
```

2. **Fase B: Hooks Optimization**
   - useCallback para handlers
   - useMemo para objetos stability

```typescript
// Evitar esto:
const style = { width: 300, height: 200 }; // ❌ Creado en cada render

// Hacer esto:
const style = useMemo(() => ({ width: 300, height: 200 }), []); // ✅
```

3. **Fase C: Layout Stability**
   - Agregar aspect-ratio al container
   - Placeholder durante carga

4. **Fase D: Memory Cleanup**
   - Verificar cleanup en useEffect return

### Verificación

```bash
# React DevTools
# 1. Abrir React DevTools
# 2. Buscar SmartImage component
# 3. Hacer scroll - NO debe re-renderizar si src no cambia

# Memory
# 1. Open Chrome DevTools > Memory
# 2. Take heap snapshot
# 3. Mount/unmount componentes
# 4. Take another snapshot
# 5. Comparar - no debe haber leaks
```
