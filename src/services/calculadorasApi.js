// ==========================================================
// SERVICIO DE CALCULADORAS - VIBRA LA VIDA
// ==========================================================

import { API_BASE_URL } from './apiConfig'

const realizarPeticion = async (ruta, datos) => {
  const respuesta = await fetch(
    `${API_BASE_URL}${ruta}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(datos),
    }
  )

  let contenido = null

  try {
    contenido = await respuesta.json()
  } catch {
    contenido = null
  }

  if (!respuesta.ok) {
    const error = new Error(
      contenido?.mensaje ||
      contenido?.message ||
      'No se pudo completar la operación.'
    )

    error.errores =
      contenido?.errores || null

    error.status =
      respuesta.status

    throw error
  }

  return contenido
}

export const calcularIMCApi = async ({
  edad,
  peso,
  altura,
  genero,
}) => {
  return realizarPeticion(
    '/api/calculadoras/imc',
    {
      edad,
      peso,
      altura,
      genero,
    }
  )
}

export const calcularCaloriasApi = async ({
  sexo,
  edad,
  peso,
  altura,
  actividad,
}) => {
  return realizarPeticion(
    '/api/calculadoras/calorias',
    {
      sexo,
      edad,
      peso,
      altura,
      actividad,
    }
  )
}
