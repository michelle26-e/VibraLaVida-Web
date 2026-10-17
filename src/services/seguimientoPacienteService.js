// src/services/seguimientoPacienteService.js

// ==========================================================
// SEGUIMIENTO DEL PACIENTE - VIBRA LA VIDA
// ==========================================================
//
// Este servicio NO utiliza SMS ni teléfono.
// El código OTP se obtiene desde la API usando la sesión
// Firebase del paciente.
// ==========================================================

import { auth } from '../firebase/firebaseConfig'
import { API_BASE_URL } from './apiConfig'


const peticionAutenticada = async (
  ruta,
  opciones = {}
) => {
  const usuario = auth.currentUser

  if (!usuario) {
    throw new Error(
      'Tu sesión terminó. Inicia sesión nuevamente.'
    )
  }

  const token = await usuario.getIdToken()

  const respuesta = await fetch(
    `${API_BASE_URL}${ruta}`,
    {
      ...opciones,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        ...(opciones.headers || {}),
      },
    }
  )

  let datos = null

  try {
    datos = await respuesta.json()
  } catch {
    datos = null
  }

  if (!respuesta.ok) {
    throw new Error(
      datos?.message ||
      datos?.mensaje ||
      'No fue posible completar la solicitud.'
    )
  }

  return datos
}


// El código solo se entrega al paciente dueño de la solicitud.
export const obtenerCodigoSeguimiento = async (
  seguimientoId
) => {
  return peticionAutenticada(
    `/api/seguimiento/${encodeURIComponent(seguimientoId)}/codigo`,
    {
      method: 'POST',
    }
  )
}


// El paciente escribe el código que recibió dentro de Vibra la Vida.
export const autorizarSeguimientoConCodigo = async (
  seguimientoId,
  codigo
) => {
  return peticionAutenticada(
    `/api/seguimiento/${encodeURIComponent(seguimientoId)}/autorizar`,
    {
      method: 'POST',
      body: JSON.stringify({
        codigo,
      }),
    }
  )
}


export const rechazarSolicitudSeguimiento = async (
  seguimientoId
) => {
  return peticionAutenticada(
    `/api/seguimiento/${encodeURIComponent(seguimientoId)}/rechazar`,
    {
      method: 'POST',
    }
  )
}
