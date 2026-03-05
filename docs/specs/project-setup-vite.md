# SPEC: Project Setup - Vite + ESM/CJS Build

## Status: 🔄 In Progress

## Priority: High

---

## Overview

Configurar el proyecto como librería usando Vite con soporte para exportar a **ESM** (formato moderno) y **CJS** (compatibilidad con Tizen/LG WebOS).

---

## Motivation

- **ESM**: Formato moderno, tree-shaking, mejor compatibilidad con bundlers actuales (Vite, webpack 5+, Rollup)
- **CJS**: Necesario para compatibilidad con Samsung Tizen y LG WebOS que pueden usar CommonJS
- **Vite**: Build rápido, mejor DX que tsc puro, plugins para dts (TypeScript declarations)

---

## Requirements

| Requisito | Descripción |
|-----------|-------------|
| ESM Output | `dist/index.js` (ESM) |
| CJS Output | `dist/index.cjs` (CommonJS) |
| Type Declarations | `dist/index.d.ts` + `dist/index.d.ts.map` |
| Bundle Size | < 15KB (sin React) |
| peerDependencies | React 18+ |

---

## Configuration

### vite.config.ts

```typescript
import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';
import { resolve } from 'path';

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'VynxEngine',
      formats: ['es', 'cjs'],
      fileName: (format) => `index.${format === 'es' ? 'js' : 'cjs'}`,
    },
    rollupOptions: {
      external: ['react', 'react-dom'],
      output: {
        globals: {
          react: 'React',
          'react-dom': 'ReactDOM',
        },
      },
    },
    sourcemap: true,
    minify: 'esbuild',
  },
  plugins: [
    dts({
      tsconfigPath: './tsconfig.json',
      insertTypesEntry: true,
    }),
  ],
});
```

### tsconfig.json (ajustado para Vite)

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
    "types": ["node"],
    "jsx": "react-jsx"
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "tests"]
}
```

### package.json (exports actualizados)

```json
{
  "name": "vynx-engine",
  "version": "0.1.0",
  "type": "module",
  "main": "./dist/index.cjs",
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
    "dev": "vite",
    "build": "vite build",
    "build:types": "tsc --emitDeclarationOnly",
    "preview": "vite preview",
    "lint": "biome check .",
    "format": "biome format --write .",
    "test": "vitest"
  },
  "peerDependencies": {
    "react": ">=18.0.0",
    "react-dom": ">=18.0.0"
  },
  "devDependencies": {
    "@types/node": "^22.0.0",
    "@types/react": "^18.0.0",
    "typescript": "^5.7.0",
    "vite": "^6.0.0",
    "vite-plugin-dts": "^4.0.0",
    "vitest": "^2.0.0",
    "@biomejs/biome": "^1.9.0"
  },
  "engines": {
    "node": ">=24.0.0"
  }
}
```

---

## Build Output

```
dist/
├── index.js          # ESM (for modern bundlers)
├── index.cjs         # CJS (for Tizen/LG WebOS)
├── index.d.ts        # Type declarations
└── index.d.ts.map    # Declaration sourcemap
```

---

## Verification

| Criterio | Comando |
|----------|---------|
| Build succeeds | `npm run build` |
| ESM output exists | `test -f dist/index.js` |
| CJS output exists | `test -f dist/index.cjs` |
| Types generated | `test -f dist/index.d.ts` |
| No lint errors | `npm run lint` |

---

## Implementation Steps

1. [ ] Install Vite and vite-plugin-dts
2. [ ] Create/update vite.config.ts
3. [ ] Update tsconfig.json for Vite (add jsx)
4. [ ] Update package.json scripts and exports
5. [ ] Run build and verify outputs
6. [ ] Test import in CJS project (Tizen simulation)

---

## How to Test

### 1. Install dependencies

```bash
npm install
```

### 2. Run build

```bash
npm run build
```

### 3. Verify outputs exist

```bash
# ESM output
test -f dist/index.js && echo "✅ ESM exists" || echo "❌ ESM missing"

# CJS output  
test -f dist/index.cjs && echo "✅ CJS exists" || echo "❌ CJS missing"

# Type declarations
test -f dist/index.d.ts && echo "✅ Types exist" || echo "❌ Types missing"
```

### 4. Verify bundle size

```bash
# Check ESM size
ls -lh dist/index.js

# Check CJS size
ls -lh dist/index.cjs
```

Expected: < 15KB each (without React)

### 5. Test CJS compatibility (Tizen/LG simulation)

Create a test file:

```bash
# Test CJS require
node -e "const vynx = require('./dist/index.cjs'); console.log('✅ CJS works:', typeof vynx)"
```

### 6. Test ESM import

```bash
# Test ESM import
node --input-type=module -e "import vynx from './dist/index.js'; console.log('✅ ESM works:', typeof vynx)"
```

### 7. Verify types compile

```bash
npx tsc --noEmit
```

### 8. Run lint

```bash
npm run lint
```

---

## Verification Checklist

| Check | Expected |
|-------|----------|
| `npm run build` | ✅ No errors |
| `dist/index.js` exists | ✅ ESM file present |
| `dist/index.cjs` exists | ✅ CJS file present |
| `dist/index.d.ts` exists | ✅ Types generated |
| ESM size | < 15KB |
| CJS size | < 15KB |
| `node -e "require('./dist/index.cjs')"` | ✅ Works |
| `npx tsc --noEmit` | ✅ No errors |
| `npm run lint` | ✅ No errors |

---

## Notes

- **external**: React y react-dom deben ser external para no incluirse en el bundle
- **globals**: Rollup necesita saber qué variables globales usar cuando external está activo
- **vite-plugin-dts**: Genera los `.d.ts` automáticamente desde el código fuente

---

## References

- [Vite Library Mode](https://vite.dev/guide/build.html#library-mode)
- [vite-plugin-dts](https://www.npmjs.com/package/vite-plugin-dts)
