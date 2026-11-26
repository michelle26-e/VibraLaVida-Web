// ==========================================================
// SERVICIO DE RESULTADOS
// ==========================================================
//
// Este archivo conecta la WEB con la misma API que utiliza
// la aplicación Android.
//
// De esta manera:
// - Android guarda en usuarios/{uid}/resultados
// - La Web guarda en usuarios/{uid}/resultados
// - Mi Cuenta consulta usuarios/{uid}/resultados
//
// Así ambos sistemas comparten el mismo historial.
// ==========================================================

import { auth } from '../firebase/firebaseConfig'
import { API_BASE_URL } from './apiConfig'


// ==========================================================
// OBTENER TOKEN DEL USUARIO
// ==========================================================

const obtenerToken = async () => {

  const usuario = auth.currentUser

  if (!usuario) {
    throw new Error(
      'Debes iniciar sesión para guardar tus resultados.'
    )
  }

  return usuario.getIdToken()
}


// ==========================================================
// PROCESAR RESPUESTA DE LA API
// ==========================================================

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
      datos?.mensaje ||
      'No fue posible completar la operación.'
    )
  }


  return datos
}


// ==========================================================
// CONVERTIR FECHA DE FIREBASE ADMIN
// ==========================================================
//
// Cuando Firebase Admin manda un Timestamp por la API,
// puede llegar parecido a:
//
// {
//   _seconds: 123456789,
//   _nanoseconds: 0
// }
//
// También algunas respuestas pueden usar:
//
// {
//   seconds: 123456789,
//   nanoseconds: 0
// }
//
// Lo convertimos para que Vue trabaje con Date.
// ==========================================================

const convertirFecha = (fecha) => {

  if (!fecha) {
    return null
  }


  // Si ya es una fecha normal de JavaScript
  if (fecha instanceof Date) {
    return fecha
  }


  // Timestamp recibido desde Firebase Admin
  if (
    typeof fecha._seconds === 'number'
  ) {

    return new Date(
      fecha._seconds * 1000 +
      Math.floor(
        (fecha._nanoseconds || 0) /
        1000000
      )
    )
  }


  // Otra forma en la que Firebase puede serializar Timestamp
  if (
    typeof fecha.seconds === 'number'
  ) {

    return new Date(
      fecha.seconds * 1000 +
      Math.floor(
        (fecha.nanoseconds || 0) /
        1000000
      )
    )
  }


  // Si por alguna razón llega como texto ISO
  if (
    typeof fecha === 'string'
  ) {

    const fechaConvertida =
      new Date(fecha)

    if (
      !Number.isNaN(
        fechaConvertida.getTime()
      )
    ) {
      return fechaConvertida
    }
  }


  return null
}


// ==========================================================
// NORMALIZAR RESULTADO
// ==========================================================
//
// Android y Web pueden guardar información ligeramente
// diferente.
//
// "datosExtra" contiene los campos particulares de cada
// evaluación.
//
// Aquí los regresamos al mismo nivel para que componentes
// como ItemHistorial.vue sigan encontrando:
//
// imc
// categoria
// porcentaje
// nivelRiesgo
// puntajeTotal
// etc.
// ==========================================================

const normalizarResultado = (resultado) => {

  const extras =
    resultado?.datosExtra &&
    typeof resultado.datosExtra === 'object'
      ? resultado.datosExtra
      : {}


  const fechaConvertida =
    convertirFecha(
      resultado?.fechaRegistro ||
      resultado?.fecha
    )


  return {

    // Datos particulares guardados por Web o Android
    ...extras,

    // Datos principales de la API
    ...resultado,

    // Conservamos una propiedad "fecha"
    // porque MiCuenta.vue ya trabaja con ese nombre.
    fecha: fechaConvertida,

    // También dejamos fechaRegistro disponible.
    fechaRegistro: fechaConvertida,
  }
}


// ==========================================================
// GUARDAR RESULTADO
// ==========================================================

export const guardarResultadoBienestar =
  async (datosResultado) => {

    const token = await obtenerToken()


    // ------------------------------------------------------
    // Mandamos los campos que acepta results.controller.js
    // ------------------------------------------------------
    //
    // Además guardamos el resultado completo en datosExtra.
    // Esto evita perder campos específicos de cada cálculo.
    // ------------------------------------------------------

    const cuerpo = {

      tipo:
        datosResultado.tipo,

      categoria:
        datosResultado.categoria ??
        datosResultado.nivel ??
        datosResultado.nivelRiesgo ??
        null,

      puntaje:
        datosResultado.puntaje ??
        datosResultado.puntajeFinal ??
        datosResultado.puntajeTotal ??
        datosResultado.imc ??
        datosResultado.porcentaje ??
        null,

      clasificacion:
        datosResultado.clasificacion ??
        datosResultado.nivel ??
        datosResultado.nivelRiesgo ??
        datosResultado.categoria ??
        null,

      descripcion:
        datosResultado.descripcion ??
        null,

      respuestas:
        datosResultado.respuestas ??
        null,


      // Guardamos todos los campos originales.
      //
      // Ejemplo para IMC:
      // nombreHerramienta
      // edad
      // genero
      // alturaCm
      // pesoKg
      // imc
      // categoria
      //
      // De esta forma no se pierde información.
      datosExtra: {
        ...datosResultado,
      },
    }


    const respuesta = await fetch(
      `${API_BASE_URL}/api/results`,
      {
        method: 'POST',

        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },

        body: JSON.stringify(cuerpo),
      }
    )


    const datos =
      await procesarRespuesta(
        respuesta
      )


    return datos?.resultId || null
  }


// ==========================================================
// OBTENER RESULTADOS DEL USUARIO
// ==========================================================
//
// Aquí Mi Cuenta obtiene exactamente los mismos resultados
// que fueron guardados desde Android o desde la Web.
// ==========================================================

export const obtenerResultadosUsuario =
  async () => {

    const usuario = auth.currentUser


    // Si no existe sesión, devolvemos lista vacía.
    if (!usuario) {
      return []
    }


    const token =
      await usuario.getIdToken()


    const respuesta = await fetch(
      `${API_BASE_URL}/api/results`,
      {
        method: 'GET',

        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
        },
      }
    )


    const datos =
      await procesarRespuesta(
        respuesta
      )


    const resultados =
      Array.isArray(datos?.results)
        ? datos.results
        : []


    // Normalizamos cada resultado para que las pantallas
    // actuales de Vue puedan seguir utilizándolo.
    return resultados.map(
      normalizarResultado
    )
  }


// ==========================================================
// PROFESIONAL: OBTENER RESULTADOS DE UN PACIENTE
// ==========================================================
//
// NUEVO.
//
// Esta función NO modifica las anteriores.
//
// GET /api/results/paciente/:pacienteUid
//
// Solo funcionará cuando:
//
// - el usuario autenticado sea profesional;
// - el paciente exista;
// - exista seguimiento activo.
//
// ==========================================================

export const obtenerResultadosPaciente =
  async (pacienteUid) => {

    if (!pacienteUid) {
      throw new Error(
        'No se indicó el paciente.'
      )
    }


    const token =
      await obtenerToken()


    const respuesta = await fetch(
      `${API_BASE_URL}/api/results/paciente/${encodeURIComponent(
        pacienteUid
      )}`,
      {
        method: 'GET',

        headers: {
          Authorization:
            `Bearer ${token}`,
          Accept:
            'application/json',
        },
      }
    )


    const datos =
      await procesarRespuesta(
        respuesta
      )


    const resultados =
      Array.isArray(datos?.results)
        ? datos.results
        : []


    return {
      paciente:
        datos?.paciente || null,

      pacienteUid:
        datos?.pacienteUid ||
        pacienteUid,

      total:
        Number(
          datos?.total ??
          resultados.length
        ),

      results:
        resultados.map(
          normalizarResultado
        ),
    }
  }


// ==========================================================
// PROFESIONAL: OBTENER RESULTADOS DEL PACIENTE POR TIPO
// ==========================================================
//
// NUEVO.
//
// Ejemplos:
//
// obtenerResultadosPacientePorTipo(uid, 'imc')
// obtenerResultadosPacientePorTipo(uid, 'ais')
// obtenerResultadosPacientePorTipo(uid, 'dass_depresion')
//
// ==========================================================

export const obtenerResultadosPacientePorTipo =
  async (
    pacienteUid,
    tipo
  ) => {

    if (!pacienteUid) {
      throw new Error(
        'No se indicó el paciente.'
      )
    }


    if (!tipo) {
      throw new Error(
        'No se indicó el tipo de resultado.'
      )
    }


    const token =
      await obtenerToken()


    const respuesta = await fetch(
      `${API_BASE_URL}/api/results/paciente/${encodeURIComponent(
        pacienteUid
      )}/type/${encodeURIComponent(
        tipo
      )}`,
      {
        method: 'GET',

        headers: {
          Authorization:
            `Bearer ${token}`,
          Accept:
            'application/json',
        },
      }
    )


    const datos =
      await procesarRespuesta(
        respuesta
      )


    const resultados =
      Array.isArray(datos?.results)
        ? datos.results
        : []


    return {
      paciente:
        datos?.paciente || null,

      pacienteUid:
        datos?.pacienteUid ||
        pacienteUid,

      tipo:
        datos?.tipo ||
        tipo,

      total:
        Number(
          datos?.total ??
          resultados.length
        ),

      results:
        resultados.map(
          normalizarResultado
        ),
    }
  }