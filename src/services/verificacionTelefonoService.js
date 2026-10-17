// src/services/verificacionTelefonoService.js

// ==========================================================
// VERIFICACIÓN DE TELÉFONO - VIBRA LA VIDA
// ==========================================================
//
// Este servicio se encarga de:
//
// 1. Enviar el código SMS con Firebase.
// 2. Verificar el código escrito por el paciente.
// 3. Mantener el MISMO UID del usuario.
//
// IMPORTANTE:
//
// - Si el paciente nunca verificó su teléfono,
//   lo vinculamos a su cuenta existente.
//
// - Si ya lo verificó anteriormente,
//   Firebase vuelve a pedir un código SMS para
//   reautenticarlo.
//
// De esta manera podemos pedir un código nuevo
// cada vez que autorice un seguimiento.
// ==========================================================

import {
  linkWithPhoneNumber,
  reauthenticateWithPhoneNumber,
  RecaptchaVerifier,
} from 'firebase/auth'

import {
  auth,
} from '../firebase/firebaseConfig'


// Guarda temporalmente la verificación actual.
let confirmacionTelefono = null

// Guarda temporalmente el reCAPTCHA.
let recaptchaVerifier = null


// ==========================================================
// LIMPIAR TELÉFONO
// ==========================================================
//
// "983 123 4567"
//      ↓
// "9831234567"
// ==========================================================

const limpiarTelefono = (
  telefono = ''
) => {
  return String(telefono)
    .replace(/\D/g, '')
}


// ==========================================================
// CONVERTIR A FORMATO INTERNACIONAL DE MÉXICO
// ==========================================================
//
// Firebase necesita formato E.164.
//
// 9831234567
//      ↓
// +529831234567
// ==========================================================

const convertirTelefonoMexico = (
  telefono
) => {

  const telefonoLimpio =
    limpiarTelefono(
      telefono
    )


  if (
    telefonoLimpio.length !== 10
  ) {

    throw new Error(
      'El número de celular debe contener 10 dígitos.'
    )
  }


  return `+52${telefonoLimpio}`
}


// ==========================================================
// LIMPIAR RECAPTCHA
// ==========================================================

const limpiarRecaptcha = () => {

  if (recaptchaVerifier) {

    try {

      recaptchaVerifier.clear()

    } catch (error) {

      console.warn(
        'No fue posible limpiar reCAPTCHA:',
        error
      )
    }
  }


  recaptchaVerifier = null
}


// ==========================================================
// ENVIAR CÓDIGO SMS
// ==========================================================
//
// botonId:
// debe ser el ID del botón que utilizará el reCAPTCHA
// invisible.
//
// Ejemplo:
// boton-enviar-codigo-sms
// ==========================================================

export const enviarCodigoTelefono = async ({
  telefono,
  botonId,
}) => {

  const usuario =
    auth.currentUser


  if (!usuario) {

    throw new Error(
      'Tu sesión terminó. Inicia sesión nuevamente.'
    )
  }


  if (!botonId) {

    throw new Error(
      'No se encontró el botón de verificación.'
    )
  }


  const telefonoInternacional =
    convertirTelefonoMexico(
      telefono
    )


  // Firebase mostrará mensajes y SMS en español
  // cuando sea posible.
  auth.languageCode = 'es'


  // Limpiamos cualquier intento anterior.
  limpiarRecaptcha()


  // Creamos un reCAPTCHA invisible.
  //
  // Firebase lo utiliza para evitar abuso
  // del envío de mensajes SMS.
  recaptchaVerifier =
    new RecaptchaVerifier(
      auth,
      botonId,
      {
        size: 'invisible',
      }
    )


  try {

    // ------------------------------------------------------
    // ¿EL USUARIO YA TIENE TELÉFONO EN FIREBASE AUTH?
    // ------------------------------------------------------

    const telefonoYaVinculado =
      usuario.providerData.some(
        (proveedor) =>
          proveedor.providerId ===
          'phone'
      )


    if (telefonoYaVinculado) {

      // ----------------------------------------------------
      // TELÉFONO YA VERIFICADO ANTERIORMENTE
      // ----------------------------------------------------
      //
      // Pedimos OTRO código SMS.
      //
      // Esto nos permite utilizar un código nuevo
      // para cada autorización de seguimiento.
      // ----------------------------------------------------

      if (
        usuario.phoneNumber &&
        usuario.phoneNumber !==
          telefonoInternacional
      ) {

        throw new Error(
          'El número registrado no coincide con el teléfono verificado de tu cuenta.'
        )
      }


      confirmacionTelefono =
        await reauthenticateWithPhoneNumber(
          usuario,
          telefonoInternacional,
          recaptchaVerifier
        )


      return {
        modo: 'reauth',
        telefono:
          telefonoInternacional,
      }
    }


    // ------------------------------------------------------
    // PRIMERA VERIFICACIÓN DEL TELÉFONO
    // ------------------------------------------------------
    //
    // Vinculamos el teléfono a la cuenta que ya existe.
    //
    // NO crea otro usuario.
    // NO cambia el UID.
    // ------------------------------------------------------

    confirmacionTelefono =
      await linkWithPhoneNumber(
        usuario,
        telefonoInternacional,
        recaptchaVerifier
      )


    return {
      modo: 'link',
      telefono:
        telefonoInternacional,
    }

  } catch (error) {

    limpiarRecaptcha()

    confirmacionTelefono =
      null


    console.error(
      'Error al enviar código SMS:',
      error
    )


    throw error
  }
}


// ==========================================================
// CONFIRMAR CÓDIGO
// ==========================================================
//
// El paciente escribe el código de 6 dígitos.
//
// Para nuestra prueba:
//
// 123456
//
// porque ese es el código que configuramos
// en Firebase Console.
// ==========================================================

export const verificarCodigoTelefono = async (
  codigo
) => {

  if (!confirmacionTelefono) {

    throw new Error(
      'Primero debes solicitar un código de verificación.'
    )
  }


  const codigoLimpio =
    String(codigo || '')
      .replace(/\D/g, '')


  if (
    codigoLimpio.length !== 6
  ) {

    throw new Error(
      'El código debe contener 6 dígitos.'
    )
  }


  try {

    // Firebase valida el código.
    //
    // Si era la primera vez:
    // vincula el teléfono.
    //
    // Si ya estaba vinculado:
    // reautentica al paciente.
    const resultado =
      await confirmacionTelefono.confirm(
        codigoLimpio
      )


    const usuario =
      resultado.user


    // Ya terminó esta verificación.
    confirmacionTelefono =
      null


    limpiarRecaptcha()


    return {
      usuario,

      uid:
        usuario.uid,

      telefono:
        usuario.phoneNumber,
    }

  } catch (error) {

    console.error(
      'Error al verificar código SMS:',
      error
    )


    // NO destruimos confirmacionTelefono aquí,
    // porque si el paciente escribió mal el código,
    // queremos permitirle volver a intentarlo.

    throw error
  }
}


// ==========================================================
// CANCELAR VERIFICACIÓN
// ==========================================================

export const cancelarVerificacionTelefono = () => {

  confirmacionTelefono =
    null


  limpiarRecaptcha()
}