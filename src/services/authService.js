// ==========================================================
// SERVICIO DE AUTENTICACIÓN - VIBRA LA VIDA
// ==========================================================

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth'

import {
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore'

import {
  auth,
  db,
} from '../firebase/firebaseConfig'


// ----------------------------------------------------------
// FUNCIÓN AUXILIAR:
// NORMALIZAR NOMBRE PARA BÚSQUEDA
// ----------------------------------------------------------
// Convierte:
// "Michelle Joanna Solorio Villas"
// en:
// "michelle joanna solorio villas"
//
// También elimina acentos y espacios duplicados.
// ----------------------------------------------------------

const normalizarNombreBusqueda = (texto = '') => {
  return texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
}


// ----------------------------------------------------------
// REGISTRAR USUARIO
// ----------------------------------------------------------

export const registrarUsuario = async ({
  nombreCompleto,
  correo,
  contrasena,
  rol = 'usuario',

  // Datos profesionales.
  especialidad = null,
  cedulaProfesional = null,
  cedulaVerificada = false,
  profesionRegistrada = null,
  institucionRegistro = null,
  anioRegistro = null,
}) => {

  // Limpiamos los datos básicos antes de utilizarlos.
  const nombreLimpio =
    nombreCompleto.trim()

  const correoLimpio =
    correo.trim().toLowerCase()


  // --------------------------------------------------------
  // 1. CREAR CUENTA EN FIREBASE AUTHENTICATION
  // --------------------------------------------------------

  const credencial =
    await createUserWithEmailAndPassword(
      auth,
      correoLimpio,
      contrasena
    )

  const usuario =
    credencial.user


  // --------------------------------------------------------
  // 2. PREPARAR PERFIL PRINCIPAL
  // --------------------------------------------------------

  const datosUsuario = {
    uid: usuario.uid,

    nombreCompleto:
      nombreLimpio,

    correo:
      correoLimpio,

    rol,

    fechaRegistro:
      serverTimestamp(),
  }


  // --------------------------------------------------------
  // INFORMACIÓN PROFESIONAL
  // --------------------------------------------------------
  // Se guarda únicamente para cuentas profesionales.
  // También aceptamos "doctor" por compatibilidad con
  // cuentas antiguas del proyecto.
  // --------------------------------------------------------

  const esProfesional =
    rol === 'profesional_salud' ||
    rol === 'doctor'


  if (esProfesional) {
    datosUsuario.especialidad =
      especialidad || null

    datosUsuario.cedulaProfesional =
      cedulaProfesional || null

    datosUsuario.cedulaVerificada =
      Boolean(cedulaVerificada)

    datosUsuario.profesionRegistrada =
      profesionRegistrada || null

    datosUsuario.institucionRegistro =
      institucionRegistro || null

    datosUsuario.anioRegistro =
      anioRegistro || null

    // Los datos del consultorio se completan después
    // desde Mi cuenta profesional.
    datosUsuario.tieneConsultorio = false
    datosUsuario.consultorio = null
  }


  // --------------------------------------------------------
  // 3. GUARDAR PERFIL PRINCIPAL EN FIRESTORE
  // --------------------------------------------------------

  await setDoc(
    doc(
      db,
      'usuarios',
      usuario.uid
    ),
    datosUsuario
  )


  // --------------------------------------------------------
  // 4. CREAR DIRECTORIO AUTOMÁTICO DEL PACIENTE
  // --------------------------------------------------------
  // Solo se crea para cuentas con rol "usuario".
  //
  // Gracias a esto, cuando un paciente se registra:
  //
  // usuarios/{uid}
  //
  // también se crea automáticamente:
  //
  // directorio_pacientes/{uid}
  //
  // Así el profesional podrá encontrarlo por nombre
  // sin que tengas que entrar manualmente a Firebase.
  // --------------------------------------------------------

  if (rol === 'usuario') {

    const nombreBusqueda =
      normalizarNombreBusqueda(
        nombreLimpio
      )


    await setDoc(
      doc(
        db,
        'directorio_pacientes',
        usuario.uid
      ),
      {
        uid: usuario.uid,

        nombreCompleto:
          nombreLimpio,

        nombreBusqueda,

        fechaRegistro:
          serverTimestamp(),
      }
    )
  }


  // --------------------------------------------------------
  // 5. CREAR PERFIL PÚBLICO DEL PROFESIONAL
  // --------------------------------------------------------
  // Esto permite que los pacientes vinculados puedan
  // consultar la información profesional necesaria.
  // --------------------------------------------------------

  if (esProfesional) {

    await setDoc(
      doc(
        db,
        'perfiles_profesionales',
        usuario.uid
      ),
      {
        uid: usuario.uid,

        nombreCompleto:
          nombreLimpio,

        especialidad:
          especialidad || null,

        cedulaProfesional:
          cedulaProfesional || null,

        cedulaVerificada:
          Boolean(cedulaVerificada),

        profesionRegistrada:
          profesionRegistrada || null,

        institucionRegistro:
          institucionRegistro || null,

        anioRegistro:
          anioRegistro || null,

        fechaRegistro:
          serverTimestamp(),
      },
      {
        merge: true,
      }
    )
  }


  return usuario
}


// ----------------------------------------------------------
// INICIAR SESIÓN
// ----------------------------------------------------------

export const iniciarSesionUsuario = async ({
  correo,
  contrasena,
}) => {

  const credencial =
    await signInWithEmailAndPassword(
      auth,
      correo.trim().toLowerCase(),
      contrasena
    )

  return credencial.user
}


// ----------------------------------------------------------
// CERRAR SESIÓN
// ----------------------------------------------------------

export const cerrarSesionUsuario = async () => {
  await signOut(auth)
}


// ----------------------------------------------------------
// OBTENER DATOS DE FIRESTORE
// ----------------------------------------------------------

export const obtenerDatosUsuario = async (
  uid
) => {

  if (!uid) {
    return null
  }


  const referencia =
    doc(
      db,
      'usuarios',
      uid
    )


  const documento =
    await getDoc(referencia)


  if (!documento.exists()) {
    return null
  }


  return documento.data()
}
