# Integración web de Citas - Vibra la vida

Este proyecto ya incluye la integración del módulo **Citas** en el panel profesional.

## Incluido

- Sección **Citas** dentro de `PanelDoctor.vue`.
- Carga de pacientes vinculados desde `seguimiento_profesional`.
- Listado de pacientes activos en la sección **Pacientes**.
- Crear citas para pacientes vinculados.
- Editar citas existentes.
- Eliminar citas.
- Conteo de citas del día en el panel principal.
- Servicio Vue autenticado con Firebase Token.
- Rutas Express protegidas con `verifyFirebaseToken`.
- Validación en backend para impedir que un profesional cree una cita a un paciente que no esté vinculado activamente.
- Identidad del profesional tomada del usuario autenticado, no del formulario.

## Endpoints

- `GET /api/citas`
- `POST /api/citas`
- `PUT /api/citas/:id`
- `DELETE /api/citas/:id`

## Colecciones utilizadas

- `usuarios`
- `seguimiento_profesional`
- `citas`

## Configuración

1. Copia `.env.example` como `.env` y coloca tus variables del frontend.
2. Copia `api-vibra-la-vida/.env.example` como `api-vibra-la-vida/.env` y coloca las variables del backend.
3. No subas `.env` ni `serviceAccountKey.json` a GitHub.

## Ejecutar frontend

```bash
npm install
npm run dev
```

## Ejecutar API

```bash
cd api-vibra-la-vida
npm install
npm run dev
```
