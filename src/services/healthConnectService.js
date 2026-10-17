// ==========================================================
// HEALTH CONNECT SERVICE - PANEL PROFESIONAL
// ==========================================================
//
// Este servicio NO lee Health Connect directamente desde
// Firestore.
//
// El profesional consulta la API de Express en Render.
// La API verifica que:
//
// 1. La sesión sea válida.
// 2. La cuenta sea profesional.
// 3. Exista un vínculo ACTIVO con el paciente.
//
// Solo después devuelve los datos de Health Connect.
// ==========================================================

import { auth } from '../firebase/firebaseConfig'
import { API_BASE_URL } from './apiConfig'


// ----------------------------------------------------------
// OBTENER TOKEN DE FIREBASE
// ----------------------------------------------------------

const obtenerToken = async () => {
  const usuario = auth.currentUser

  if (!usuario) {
    throw new Error(
      'Tu sesión terminó. Inicia sesión nuevamente.'
    )
  }

  return usuario.getIdToken()
}


// ----------------------------------------------------------
// PROCESAR RESPUESTA DE LA API
// ----------------------------------------------------------

const procesarRespuesta = async (respuesta) => {
  let datos = null

  try {
    datos = await respuesta.json()
  } catch {
    datos = null
  }

  if (!respuesta.ok) {
    throw new Error(
      datos?.message ||
      'No fue posible consultar Health Connect.'
    )
  }

  return datos
}


// ----------------------------------------------------------
// ÚLTIMO REGISTRO DEL PACIENTE
// ----------------------------------------------------------
//
// GET
// /api/health-connect/paciente/:pacienteUid/latest
//
// ----------------------------------------------------------

export const obtenerUltimoHealthPaciente = async (
  pacienteUid
) => {
  if (!pacienteUid) {
    throw new Error(
      'No se indicó el paciente.'
    )
  }

  const token = await obtenerToken()

  const respuesta = await fetch(
    `${API_BASE_URL}/api/health-connect/paciente/${encodeURIComponent(
      pacienteUid
    )}/latest`,
    {
      method: 'GET',

      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
      },
    }
  )

  const datos =
    await procesarRespuesta(respuesta)

  return {
    paciente: datos?.paciente || null,
    data: datos?.data || null,
  }
}


// ----------------------------------------------------------
// HISTORIAL DEL PACIENTE
// ----------------------------------------------------------
//
// Queda preparado para usarlo después en gráficas.
//
// GET
// /api/health-connect/paciente/:pacienteUid/history?limit=30
//
// ----------------------------------------------------------

export const obtenerHistorialHealthPaciente = async (
  pacienteUid,
  limite = 30
) => {
  if (!pacienteUid) {
    throw new Error(
      'No se indicó el paciente.'
    )
  }

  const token = await obtenerToken()

  const limiteSeguro =
    Math.min(
      Math.max(
        Number(limite) || 30,
        1
      ),
      90
    )

  const respuesta = await fetch(
    `${API_BASE_URL}/api/health-connect/paciente/${encodeURIComponent(
      pacienteUid
    )}/history?limit=${limiteSeguro}`,
    {
      method: 'GET',

      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
      },
    }
  )

  const datos =
    await procesarRespuesta(respuesta)

  return Array.isArray(datos?.history)
    ? datos.history
    : []
}