// ==========================================================
// SERVICIO DE NOTIFICACIONES - PANEL PROFESIONAL
// ==========================================================

import {
  auth,
} from '../firebase/firebaseConfig'

import {
  API_BASE_URL,
} from './apiConfig'


const peticionAutenticada = async (
  ruta,
  opciones = {}
) => {
  const usuario =
    auth.currentUser

  if (!usuario) {
    throw new Error(
      'Tu sesión terminó. Inicia sesión nuevamente.'
    )
  }

  const token =
    await usuario.getIdToken()

  const respuesta =
    await fetch(
      `${API_BASE_URL}${ruta}`,
      {
        ...opciones,

        headers: {
          'Content-Type':
            'application/json',

          Authorization:
            `Bearer ${token}`,

          ...(opciones.headers || {}),
        },
      }
    )

  let datos = null

  try {
    datos =
      await respuesta.json()
  } catch {
    datos = null
  }

  if (!respuesta.ok) {
    throw new Error(
      datos?.message ||
      datos?.mensaje ||
      'No fue posible comunicarse con la API.'
    )
  }

  return datos
}


export const obtenerNotificacionesProfesional =
  async () => {

    const datos =
      await peticionAutenticada(
        '/api/notificaciones'
      )

    return {
      noLeidas:
        Number(
          datos?.noLeidas || 0
        ),

      notificaciones:
        Array.isArray(
          datos?.notificaciones
        )
          ? datos.notificaciones
          : [],
    }
  }


export const marcarNotificacionLeida =
  async (
    notificacionId
  ) => {

    return peticionAutenticada(
      `/api/notificaciones/${notificacionId}/leida`,
      {
        method:
          'PATCH',
      }
    )
  }


export const marcarTodasNotificacionesLeidas =
  async () => {

    return peticionAutenticada(
      '/api/notificaciones/marcar-todas-leidas',
      {
        method:
          'PATCH',
      }
    )
  }
