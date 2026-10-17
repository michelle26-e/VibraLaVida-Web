import { auth } from '@/firebase'

const API_URL =
  import.meta.env.VITE_API_URL ||
  'https://api-vibra-la-vida.onrender.com'

const peticionAutenticada = async (
  ruta,
  opciones = {}
) => {
  const usuario = auth.currentUser

  if (!usuario) {
    throw new Error('No hay una sesión activa.')
  }

  const token = await usuario.getIdToken()

  const respuesta = await fetch(
    `${API_URL}${ruta}`,
    {
      ...opciones,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        ...opciones.headers,
      },
    }
  )

  const datos = await respuesta.json()

  if (!respuesta.ok) {
    throw new Error(
      datos?.message ||
      'No fue posible completar la solicitud.'
    )
  }

  return datos
}

export const obtenerDisponibilidadProfesional =
  async () => {
    const datos = await peticionAutenticada(
      '/api/disponibilidad-profesional'
    )

    return datos.disponibilidad
  }

export const guardarDisponibilidadProfesional =
  async (disponibilidad) => {
    const datos = await peticionAutenticada(
      '/api/disponibilidad-profesional',
      {
        method: 'PUT',
        body: JSON.stringify(disponibilidad),
      }
    )

    return datos.disponibilidad
  }
