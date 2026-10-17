// ==========================================================
// SERVICIO DE DOCTORES - VIBRA LA VIDA
// ==========================================================

import { API_BASE_URL } from './apiConfig'


// ----------------------------------------------------------
// VERIFICAR CÉDULA PROFESIONAL
// ----------------------------------------------------------
//
// Este endpoint se usa antes del registro del profesional,
// por eso no requiere token de Firebase.
//
// ----------------------------------------------------------

export const verificarCedulaProfesional = async ({
  cedula,
  nombreCompleto,
}) => {
  const respuesta = await fetch(
    `${API_BASE_URL}/api/doctores/verificar-cedula`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        cedula,
        nombreCompleto,
      }),
    }
  )

  let datos = null

  try {
    datos = await respuesta.json()
  } catch {
    datos = null
  }

  if (!respuesta.ok) {
    const error = new Error(
      datos?.mensaje ||
      datos?.message ||
      'No fue posible verificar la cédula profesional.'
    )

    error.data = datos
    error.status = respuesta.status

    throw error
  }

  return datos
}
