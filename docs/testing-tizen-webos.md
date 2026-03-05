# Guía Completa: Configurar Entorno de Testing para VYNX Engine

Esta guía proporciona instrucciones paso a paso para configurar proyectos de prueba en Tizen (Samsung) y WebOS (LG) que usen VYNX Engine.

---

## Requisitos Previos

- Node.js 24+ instalado
- npm o yarn
- Git
- Conexión a internet

---

## Paso 1: Preparar VYNX Engine

En el directorio raíz de vynx-engine:

```bash
# Instalar dependencias
npm install

# Build de producción
npm run build

# Verificar que existe la carpeta dist
ls -la dist/
```

Deberías ver:
```
index.js
index.cjs
index.d.ts
```

---

## OPCIÓN A: Configurar Proyecto Tizen (Samsung TVs)

### A.1: Instalar Tizen Studio

1. Descargar Tizen Studio desde:
   ```
   https://developer.tizen.org/development/tizen-studio/download
   ```

2. Ejecutar el instalador y seguir las instrucciones

3. Abrir Tizen Studio e instalar las siguientes extensiones:
   - Tools > Package Manager
   - Instalar: "TV Extensions" (seleccionar versión 6.0 o más reciente)

### A.2: Configurar el Emulador

1. En Tizen Studio:
   - Tools > Device Manager
   - Click en "Emulator Manager"
   - Seleccionar "Samsung TV" > "TV-6.0"
   - Click en "Create"

2. Iniciar el emulador:
   - Click en "Launch"

### A.3: Crear Proyecto Tizen

1. En Tizen Studio:
   - File > New > Tizen Project
   - Seleccionar: Template > Mobile > Web
   - Nombre del proyecto: `vynx-tizen-test`
   - Click en "Finish"

2. En tu terminal, navegar al proyecto:

```bash
cd <ruta-donde-guardaste>/vynx-tizen-test
```

3. Editar package.json:

```json
{
  "name": "vynx-tizen-test",
  "version": "1.0.0",
  "main": "index.html",
  "dependencies": {
    "vynx-engine": "file:../vynx-engine"
  },
  "scripts": {
    "build": "vite build"
  },
  "devDependencies": {
    "vite": "^6.0.0"
  }
}
```

4. Instalar vite y vincular vynx-engine:

```bash
npm install vite --save-dev
npm install
```

5. Crear archivo vite.config.js en el proyecto:

```javascript
import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    outDir: 'web',
    emptyOutDir: true,
  },
});
```

6. Crear el código de prueba en web/index.html:

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>VYNX Engine Test - Tizen</title>
</head>
<body>
  <h1>VYNX Engine - Tizen Test</h1>
  <div id="result"></div>
  
  <script type="module">
    import { detectPlatform, getPlatformCapabilities, getOptimalStorageType } from 'vynx-engine';
    
    async function run() {
      const platform = detectPlatform();
      const capabilities = await getPlatformCapabilities(platform);
      const storage = getOptimalStorageType(platform, capabilities);
      
      document.getElementById('result').innerHTML = `
        <p>Platform: ${platform}</p>
        <p>Storage: ${storage}</p>
        <pre>${JSON.stringify(capabilities, null, 2)}</pre>
      `;
      
      console.log('VYNX Engine:', { platform, capabilities, storage });
    }
    
    run();
  </script>
</body>
</html>
```

7. Build:

```bash
npm run build
```

### A.4: Ejecutar en Emulador

1. En Tizen Studio:
   - Click derecho en el proyecto > Run As > Tizen Web Application
   - Seleccionar el emulador creado

2. Verificar en la consola del emulador los logs de VYNX Engine

### A.5: (Opcional) Ejecutar en TV Real Samsung

1. Activar modo desarrollador en la TV:
   - Settings > About This TV > Software Version
   - Click 7 veces hasta ver mensaje de desarrollador

2. Obtener IP de la TV:
   - Settings > Network > Network Status > IP de la TV

3. En Tizen Studio:
   - Tools > Device Manager
   - Click en "+" para agregar dispositivo
   - Ingresar IP de la TV
   - Nombre: Samsung-TV

4. Ejecutar:
   - Click derecho en proyecto > Run As > Tizen Web Application
   - Seleccionar Samsung-TV

---

## OPCIÓN B: Configurar Proyecto WebOS (LG TVs)

### B.1: Instalar webOS SDK

1. Instalar Node.js si no lo tienes (versión 18+)

2. Instalar ares-cli globalmente:

```bash
npm install -g ares-webos-sdk
```

3. Verificar instalación:

```bash
ares --version
```

### B.2: Configurar el Emulador

1. Instalar VirtualBox (requerido para emuladores webOS):
   ```
   https://www.virtualbox.org/wiki/Downloads
   ```

2. Configurar emulador:

```bash
# Listar emuladores disponibles
ares-setup-emulator

# Instalar emulador webOS TV
# Seleccionar "webOS TV SDK Emulator 4.0" o la versión disponible
```

3. Iniciar emulador:

```bash
ares-emulator -n "webOS TV Emulator 4.0"
```

### B.3: Crear Proyecto WebOS

1. Crear estructura de proyecto:

```bash
mkdir vynx-webos-test
cd vynx-webos-test

# Crear estructura de carpetas
mkdir -p web
mkdir -p js
mkdir -p lib
```

2. Crear package.json:

```json
{
  "name": "vynx-webos-test",
  "version": "1.0.0",
  "main": "web/index.html",
  "dependencies": {
    "vynx-engine": "file:../vynx-engine"
  },
  "scripts": {
    "build": "vite build"
  },
  "devDependencies": {
    "vite": "^6.0.0"
  }
}
```

3. Instalar dependencias:

```bash
npm install vite --save-dev
npm install
```

4. Crear vite.config.js:

```javascript
import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    outDir: 'web',
    emptyOutDir: true,
  },
});
```

5. Copiar VYNX Engine a lib:

```bash
cp -r ../vynx-engine/dist/* lib/
```

6. Crear web/index.html:

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>VYNX Engine Test - WebOS</title>
</head>
<body>
  <h1>VYNX Engine - WebOS Test</h1>
  <div id="result"></div>
  
  <script type="module">
    // Importar desde lib/ donde copiamos el build
    import { detectPlatform, getPlatformCapabilities, getOptimalStorageType } from '../lib/index.js';
    
    async function run() {
      const platform = detectPlatform();
      const capabilities = await getPlatformCapabilities(platform);
      const storage = getOptimalStorageType(platform, capabilities);
      
      document.getElementById('result').innerHTML = `
        <p>Platform: ${platform}</p>
        <p>Storage: ${storage}</p>
        <pre>${JSON.stringify(capabilities, null, 2)}</pre>
      `;
      
      console.log('VYNX Engine:', { platform, capabilities, storage });
    }
    
    run();
  </script>
</body>
</html>
```

7. Crear appinfo.json (requerido para webOS):

```json
{
  "id": "com.vynxengine.test",
  "version": "0.1.0",
  "vendor": "VYNX",
  "type": "web",
  "title": "VYNX Engine Test",
  "main": "index.html",
  "icon": "icon.png",
  "largeIcon": "icon.png"
}
```

8. Crear un icono básico (puede ser cualquier imagen PNG):

```bash
# Crear icono placeholder (opcional)
touch icon.png
```

### B.4: Build y Empaquetar

```bash
npm run build

# Empaquetar para webOS
ares-package web/ -o ./
```

Esto creará un archivo `.ipk` en la carpeta actual.

### B.5: Ejecutar en Emulador

```bash
# Instalar la app en el emulador
ares-install --emulator "webOS TV Emulator 4.0" ./com.vynxengine.test_0.1.0_all.ipk

# Lanzar la app
ares-launch --emulator "webOS TV Emulator 4.0" --appid com.vynxengine.test
```

### B.6: (Opcional) Ejecutar en TV Real LG

1. Activar modo desarrollador en la TV:
   - Settings > General > About This TV > TV SDK
   - Activar "Developer Mode"
   - Anotar IP y puerto (usualmente 9922)

2. Configurar el dispositivo en tu máquina:

```bash
ares-setup-device
```

3. Instalar la app:

```bash
ares-install --device <IP-DE-TU-TV> ./com.vynxengine.test_0.1.0_all.ipk
```

4. Lanzar:

```bash
ares-launch --device <IP-DE-TU-TV> --appid com.vynxengine.test
```

---

## Solución de Problemas

### Error: "Cannot find module 'vynx-engine'"

Asegúrate de que:
1. Ejecutaste `npm install` en el proyecto de prueba
2. La ruta en `file:../vynx-engine` es correcta
3. Hiciste build de vynx-engine (`npm run build`)

### Error: "indexedDB is not defined"

Esto es esperado en algunos entornos. Verifica:
1. Que estás ejecutando en el emulador o dispositivo real
2. Que el user-agent es correcto para la plataforma

### Error de CORS al cargar imágenes

En vite.config.js del proyecto de prueba, agregar:

```javascript
export default defineConfig({
  server: {
    headers: {
      'Access-Control-Allow-Origin': '*',
    },
  },
});
```

---

## Notas Importantes

1. **FileSystem API**: Solo funciona en dispositivos reales, NO en emuladores básicos
2. **IndexedDB**: Funciona en emuladores y dispositivos reales
3. **Memoria**: Los emuladores pueden tener límites de memoria menores que dispositivos reales
4. **Debugging**: Usa las herramientas de desarrollo de cada plataforma para ver logs
