# API unificada - Vibra la vida

Este backend es la unión de los módulos utilizados por Android y por la web Vue.

## Módulos disponibles

- `/api/auth`
- `/api/users`
- `/api/results`
- `/api/health-connect`
- `/api/history`
- `/api/medicamentos`
- `/api/bitacora`
- `/api/uploads`
- `/api/doctores`
- `/api/calculadoras`
- `/api/citas`

## Render

Conserva el mismo servicio de Render que actualmente utiliza Android. No crees una segunda API para la web.

Variables requeridas en Render:

- `FIREBASE_PROJECT_ID`
- `FIREBASE_CLIENT_EMAIL`
- `FIREBASE_PRIVATE_KEY`
- `FIREBASE_WEB_API_KEY` si las rutas existentes de autenticación la utilizan
- `CLOUDINARY_CLOUD_NAME`
- `CLOUDINARY_API_KEY`
- `CLOUDINARY_API_SECRET`
- `CEDULA_API_KEY`

`PORT` lo proporciona Render automáticamente.

## Web

La web debe utilizar:

`VITE_API_URL=https://api-vibra-la-vida.onrender.com`

## Importante

No subir a GitHub:

- `.env`
- `serviceAccountKey.json`
- secretos de Cloudinary
- claves privadas de Firebase Admin
