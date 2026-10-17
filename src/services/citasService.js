// ==========================================================
// SERVICIO DE CITAS - VIBRA LA VIDA
// ==========================================================

import {
  EmailAuthProvider,
  reauthenticateWithCredential,
} from 'firebase/auth'

import { auth } from '../firebase/firebaseConfig'
import { API_BASE_URL } from './apiConfig'


// ----------------------------------------------------------
// PETICIÓN AUTENTICADA
// ----------------------------------------------------------

const peticionAutenticada = async (
  ruta,
  opciones = {},
  forzarTokenNuevo = false
) => {
  const usuario = auth.currentUser

  if (!usuario) {
    throw new Error(
      'Tu sesión terminó. Inicia sesión nuevamente.'
    )
  }

  const token = await usuario.getIdToken(forzarTokenNuevo)

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
      'Ocurrió un error al comunicarse con la API.'
    )
  }

  return datos
}


// ----------------------------------------------------------
// OBTENER CITAS
// ----------------------------------------------------------

export const obtenerCitas = async () => {
  const datos = await peticionAutenticada(
    '/api/citas'
  )

  return Array.isArray(datos?.citas)
    ? datos.citas
    : []
}


// ----------------------------------------------------------
// CREAR CITA
// ----------------------------------------------------------

export const crearCita = async (cita) => {
  const datos = await peticionAutenticada(
    '/api/citas',
    {
      method: 'POST',
      body: JSON.stringify(cita),
    }
  )

  return datos?.cita || null
}


// ----------------------------------------------------------
// ACTUALIZAR CITA
// ----------------------------------------------------------

export const actualizarCita = async (
  citaId,
  cambios
) => {
  const datos = await peticionAutenticada(
    `/api/citas/${citaId}`,
    {
      method: 'PUT',
      body: JSON.stringify(cambios),
    }
  )

  return datos?.cita || null
}


// ----------------------------------------------------------
// REAGENDAR CITA COMO PROFESIONAL
// ----------------------------------------------------------
// Usa una ruta exclusiva para reagenda.
// No reutiliza el PUT genérico de edición.
// ----------------------------------------------------------

export const reagendarCitaProfesional = async (
  citaId,
  cambios
) => {
  const datos = await peticionAutenticada(
    `/api/citas/${citaId}/reagendar-profesional`,
    {
      method: 'POST',
      body: JSON.stringify(cambios),
    }
  )

  return datos?.cita || null
}


// ----------------------------------------------------------
// ELIMINAR CITA
// ----------------------------------------------------------
// Esta función se conserva para el panel profesional.
// El paciente NO elimina físicamente la cita: cambia su estado.
// ----------------------------------------------------------

export const eliminarCita = async (
  citaId
) => {
  return peticionAutenticada(
    `/api/citas/${citaId}`,
    {
      method: 'DELETE',
    }
  )
}


// ==========================================================
// ACCIONES DEL PACIENTE
// ==========================================================

// ----------------------------------------------------------
// CONFIRMAR CITA
// ----------------------------------------------------------

export const confirmarCitaPaciente = async (
  citaId,
  contrasena
) => {
  const usuario = auth.currentUser

  if (!usuario) {
    throw new Error(
      'Tu sesión terminó. Inicia sesión nuevamente.'
    )
  }

  if (!usuario.email) {
    throw new Error(
      'Tu cuenta no tiene un correo disponible para confirmar la contraseña.'
    )
  }

  if (
    !contrasena ||
    contrasena.length < 6
  ) {
    throw new Error(
      'Escribe tu contraseña actual.'
    )
  }

  const usaContrasena =
    usuario.providerData.some(
      (proveedor) =>
        proveedor.providerId ===
        'password'
    )

  if (!usaContrasena) {
    throw new Error(
      'Esta cuenta no utiliza contraseña de correo para iniciar sesión.'
    )
  }

  const credencial =
    EmailAuthProvider.credential(
      usuario.email,
      contrasena
    )

  try {
    // Firebase comprueba la contraseña directamente.
    // La contraseña nunca se envía a nuestra API.
    await reauthenticateWithCredential(
      usuario,
      credencial
    )
  } catch (error) {
    console.error(
      'Error al confirmar contraseña para la cita:',
      error
    )

    if (
      error?.code ===
        'auth/invalid-credential' ||
      error?.code ===
        'auth/wrong-password'
    ) {
      throw new Error(
        'La contraseña es incorrecta.'
      )
    }

    if (
      error?.code ===
      'auth/too-many-requests'
    ) {
      throw new Error(
        'Se realizaron demasiados intentos. Espera un momento y vuelve a intentarlo.'
      )
    }

    throw new Error(
      'No fue posible confirmar tu identidad.'
    )
  }

  // Pedimos un token NUEVO después de reautenticar.
  // Así Express puede comprobar que la autenticación
  // ocurrió hace pocos segundos.
  const datos = await peticionAutenticada(
    `/api/citas/${citaId}/confirmar`,
    {
      method: 'POST',
    },
    true
  )

  return datos?.cita || null
}


// ----------------------------------------------------------
// SOLICITAR REAGENDA
// ----------------------------------------------------------
// El paciente NO cambia directamente la fecha.
// Solo envía la solicitud y el motivo.
// El profesional será quien proponga/agende la nueva fecha.
// ----------------------------------------------------------

export const solicitarReagendaCita = async (
  citaId,
  motivoReagenda
) => {
  const datos = await peticionAutenticada(
    `/api/citas/${citaId}/solicitar-reagenda`,
    {
      method: 'POST',
      body: JSON.stringify({
        motivoReagenda:
          motivoReagenda.trim(),
      }),
    }
  )

  return datos?.cita || null
}


// ----------------------------------------------------------
// CANCELAR CITA COMO PACIENTE
// ----------------------------------------------------------
// No borra la cita del historial.
// Solamente cambia su estado a "cancelada".
// ----------------------------------------------------------

export const cancelarCitaPaciente = async (
  citaId,
  motivoCancelacion = ''
) => {
  const datos = await peticionAutenticada(
    `/api/citas/${citaId}/cancelar`,
    {
      method: 'POST',
      body: JSON.stringify({
        motivoCancelacion:
          motivoCancelacion.trim(),
      }),
    }
  )

  return datos?.cita || null
}
