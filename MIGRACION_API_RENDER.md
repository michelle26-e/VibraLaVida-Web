# Unificación de la API de Vibra la vida

## Cambios realizados en el frontend

La web ya no depende de `http://localhost:3001` ni de `VITE_CALCULADORAS_API_URL`.
Todas las llamadas HTTP de Express utilizan una sola variable:

```env
VITE_API_URL=https://api-vibra-la-vida.onrender.com
```

Se centralizó la URL en:

```text
src/services/apiConfig.js
```

Los módulos que ya consumen esta API central son:

- Calculadoras (`/api/calculadoras/...`)
- Citas (`/api/citas/...`)
- Verificación de cédula (`/api/doctores/verificar-cedula`)

La carpeta antigua `api-calculadoras` fue retirada de esta copia porque sus funciones ya existen dentro de `api-vibra-la-vida`.

## Importante antes de desplegar el backend

El ZIP web recibido contiene una versión de `api-vibra-la-vida` que todavía no incluye los archivos actuales usados por Android para:

- medicamentos
- bitácora
- uploads / Cloudinary

Por ese motivo, **no se debe reemplazar todavía el servicio actual de Render con la carpeta backend de este ZIP**.

Para completar la fusión sin perder funciones de Android, se debe usar como base el backend actual que ya está desplegado y agregarle los módulos web:

- `doctor.controller.js` + `doctor.routes.js`
- `calculadoras.controller.js` + `calculadoras.routes.js`
- `citas.controller.js` + `citas.routes.js`

Después el `app.js` final deberá montar todos los módulos una sola vez.
