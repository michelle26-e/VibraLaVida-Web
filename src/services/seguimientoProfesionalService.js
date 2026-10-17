// src/services/seguimientoProfesionalService.js

// ==========================================================
// SERVICIO DE VINCULACIÓN PROFESIONAL - PACIENTE
// ==========================================================

import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  where,
} from 'firebase/firestore'

import { auth, db } from '../firebase/firebaseConfig'
import { API_BASE_URL } from './apiConfig'


// Normaliza texto para búsquedas.
// Ejemplo:
// "Michelle Joanna" -> "michelle joanna"
export const normalizarTextoBusqueda = (texto = '') => {
  return texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
}


// ==========================================================
// BUSCAR PACIENTES
// ==========================================================
// Lee únicamente la colección pública mínima
// "directorio_pacientes", no el perfil clínico completo.

export const buscarPacientesPorNombre = async (texto) => {
  const termino = normalizarTextoBusqueda(texto)

  if (termino.length < 2) {
    return []
  }

  const referencia = collection(
    db,
    'directorio_pacientes'
  )

  // Por ahora descargamos el directorio permitido por reglas
  // y filtramos en cliente.
  // Más adelante podemos optimizar con Algolia / Typesense
  // si el volumen de pacientes crece mucho.
  const respuesta = await getDocs(referencia)

  return respuesta.docs
    .map((documento) => ({
      id: documento.id,
      ...documento.data(),
    }))
    .filter((paciente) => {
      const nombreBusqueda =
        paciente.nombreBusqueda ||
        normalizarTextoBusqueda(
          paciente.nombreCompleto
        )

      return nombreBusqueda.includes(termino)
    })
    .slice(0, 12)
}


// ==========================================================
// COMPROBAR SI YA EXISTE EL VÍNCULO
// ==========================================================

export const obtenerIdSeguimiento = (
  profesionalUid,
  pacienteUid
) => {
  return `${profesionalUid}_${pacienteUid}`
}


export const existeSeguimiento = async (
  profesionalUid,
  pacienteUid
) => {
  const idSeguimiento = obtenerIdSeguimiento(
    profesionalUid,
    pacienteUid
  )

  const referencia = doc(
    db,
    'seguimiento_profesional',
    idSeguimiento
  )

  const documento = await getDoc(referencia)

  return documento.exists()
}


// ==========================================================
// ENVIAR SOLICITUD DE SEGUIMIENTO
// ==========================================================
//
// IMPORTANTE:
// La solicitud YA NO se crea directamente desde Vue en Firestore.
// Se envía a Express para que el servidor:
// - compruebe que quien solicita es un profesional,
// - compruebe que el paciente existe,
// - cree el vínculo como "pendiente",
// - prepare el código OTP de un solo uso.
//
// El doctor NUNCA recibe el OTP.
// ==========================================================

export const vincularPaciente = async ({
  profesionalUid,
  pacienteUid,
}) => {
  const usuario = auth.currentUser

  if (!usuario) {
    throw new Error(
      'Tu sesión terminó. Inicia sesión nuevamente.'
    )
  }

  if (!profesionalUid || !pacienteUid) {
    throw new Error(
      'Faltan datos para solicitar el seguimiento.'
    )
  }

  if (usuario.uid !== profesionalUid) {
    throw new Error(
      'La sesión no corresponde al profesional que realiza la solicitud.'
    )
  }

  if (profesionalUid === pacienteUid) {
    throw new Error(
      'No puedes solicitar seguimiento a tu propia cuenta.'
    )
  }

  const token = await usuario.getIdToken()

  const respuesta = await fetch(
    `${API_BASE_URL}/api/seguimiento/solicitudes`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        pacienteUid,
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
    throw new Error(
      datos?.message ||
      datos?.mensaje ||
      'No fue posible enviar la solicitud de seguimiento.'
    )
  }

  return datos?.seguimientoId || null
}


// ==========================================================
// SOLICITUDES PENDIENTES DEL PROFESIONAL
// ==========================================================
// Devuelve únicamente las relaciones que todavía esperan
// autorización del paciente.
// ==========================================================

export const obtenerSolicitudesPendientes = async (
  profesionalUid
) => {
  if (!profesionalUid) {
    return []
  }

  const consulta = query(
    collection(
      db,
      'seguimiento_profesional'
    ),
    where(
      'profesionalUid',
      '==',
      profesionalUid
    )
  )

  const respuesta = await getDocs(consulta)

  return respuesta.docs
    .map((documento) => ({
      seguimientoId: documento.id,
      ...documento.data(),
    }))
    .filter(
      (vinculo) =>
        vinculo.estado === 'pendiente' &&
        vinculo.pacienteUid
    )
}


// ==========================================================
// PACIENTES VINCULADOS AL PROFESIONAL
// ==========================================================

export const obtenerPacientesVinculados = async (
  profesionalUid
) => {
  if (!profesionalUid) {
    return []
  }

  // Consultamos únicamente por profesional.
  // Después filtramos "activo" en cliente para evitar
  // depender de un índice compuesto de Firestore.
  const consulta = query(
    collection(
      db,
      'seguimiento_profesional'
    ),
    where(
      'profesionalUid',
      '==',
      profesionalUid
    )
  )

  const respuesta = await getDocs(consulta)

  // Usamos Map para evitar que un paciente aparezca
  // dos veces si existen vínculos antiguos duplicados.
  const pacientesUnicos = new Map()

  for (const vinculoDoc of respuesta.docs) {
    const vinculo = vinculoDoc.data()

    if (
      vinculo.estado !== 'activo' ||
      !vinculo.pacienteUid
    ) {
      continue
    }

    // Si ya procesamos este paciente, omitimos otro
    // vínculo duplicado.
    if (
      pacientesUnicos.has(
        vinculo.pacienteUid
      )
    ) {
      continue
    }

    const perfilRef = doc(
      db,
      'directorio_pacientes',
      vinculo.pacienteUid
    )

    const perfilDoc =
      await getDoc(perfilRef)

    if (perfilDoc.exists()) {
      pacientesUnicos.set(
        vinculo.pacienteUid,
        {
          // Guardamos el ID REAL del vínculo.
          // Puede ser un ID antiguo aleatorio o el nuevo
          // formato profesionalUid_pacienteUid.
          seguimientoId:
            vinculoDoc.id,

          fechaVinculacion:
            vinculo.fechaVinculacion ||
            null,

          pacienteUid:
            vinculo.pacienteUid,

          ...perfilDoc.data(),
        }
      )
    }
  }

  return Array.from(
    pacientesUnicos.values()
  )
}


// ==========================================================
// ELIMINAR PACIENTE DEL SEGUIMIENTO
// ==========================================================
// Esto NO elimina la cuenta del paciente.
// Solo elimina la relación profesional-paciente.

export const eliminarPacienteVinculado = async ({
  profesionalUid,
  pacienteUid,
}) => {
  if (!profesionalUid || !pacienteUid) {
    throw new Error(
      'Faltan datos para quitar al paciente.'
    )
  }

  // Buscamos todos los vínculos pertenecientes
  // a este profesional.
  //
  // Esto permite eliminar también vínculos antiguos
  // cuyo ID fue generado automáticamente por Firestore.
  const consulta = query(
    collection(
      db,
      'seguimiento_profesional'
    ),
    where(
      'profesionalUid',
      '==',
      profesionalUid
    )
  )

  const respuesta =
    await getDocs(consulta)

  const vinculosPaciente =
    respuesta.docs.filter(
      (documento) => {
        const vinculo =
          documento.data()

        return (
          vinculo.pacienteUid ===
          pacienteUid
        )
      }
    )

  if (vinculosPaciente.length === 0) {
    throw new Error(
      'No se encontró el vínculo con este paciente.'
    )
  }

  // Si por algún motivo existen vínculos duplicados,
  // eliminamos todos para que el paciente quede
  // completamente desvinculado.
  await Promise.all(
    vinculosPaciente.map(
      (documento) =>
        deleteDoc(
          doc(
            db,
            'seguimiento_profesional',
            documento.id
          )
        )
    )
  )
}