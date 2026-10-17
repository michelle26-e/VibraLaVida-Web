<script setup>
// ============================================
// IMPORTACIONES
// ============================================

import { ref } from 'vue'
import { RouterLink, useRouter } from 'vue-router'

import {
  iniciarSesionUsuario,
  obtenerDatosUsuario,
  cerrarSesionUsuario,
} from '../services/authService'

// Mascotas de Vibra la Vida
import ajolotePaciente from '../assets/ajolotenormal.png'
import ajoloteProfesional from '../assets/ajolotedoctor.png'


const router = useRouter()


// ============================================
// TIPO DE CUENTA
// ============================================

// Por defecto mostramos acceso de paciente
const tipoCuenta = ref('paciente')


// ============================================
// FORMULARIO
// ============================================

const formulario = ref({
  correo: '',
  contrasena: '',
})


// ============================================
// VARIABLES DE INTERFAZ
// ============================================

const errores = ref({})

const mostrarContrasena = ref(false)

const mensaje = ref('')

const tipoMensaje = ref('')

const cargando = ref(false)


// ============================================
// CAMBIAR TIPO DE CUENTA
// ============================================

const seleccionarTipoCuenta = (tipo) => {

  tipoCuenta.value = tipo

  // Limpiamos mensajes anteriores
  mensaje.value = ''
  tipoMensaje.value = ''
  errores.value = {}
}


// ============================================
// VALIDAR FORMULARIO
// ============================================

const validarFormulario = () => {

  const nuevosErrores = {}


  if (!formulario.value.correo.trim()) {

    nuevosErrores.correo =
      'Ingresa tu correo electrónico.'

  } else if (!formulario.value.correo.includes('@')) {

    nuevosErrores.correo =
      'Ingresa un correo válido.'
  }


  if (!formulario.value.contrasena.trim()) {

    nuevosErrores.contrasena =
      'Ingresa tu contraseña.'

  } else if (formulario.value.contrasena.length < 6) {

    nuevosErrores.contrasena =
      'La contraseña debe tener al menos 6 caracteres.'
  }


  errores.value = nuevosErrores


  return Object.keys(nuevosErrores).length === 0
}


// ============================================
// INICIAR SESIÓN
// ============================================

const iniciarSesion = async () => {

  mensaje.value = ''
  tipoMensaje.value = ''


  if (!validarFormulario()) {
    return
  }


  try {

    cargando.value = true


    // ========================================
    // 1. AUTENTICACIÓN EN FIREBASE
    // ========================================

    const usuario = await iniciarSesionUsuario({
      correo: formulario.value.correo.trim(),
      contrasena: formulario.value.contrasena,
    })


    // ========================================
    // 2. OBTENER DATOS DE FIRESTORE
    // ========================================

    const datosUsuario =
      await obtenerDatosUsuario(usuario.uid)


    if (!datosUsuario) {

      mensaje.value =
        'No se encontraron los datos de esta cuenta.'

      tipoMensaje.value = 'error'

      await cerrarSesionUsuario()

      return
    }


    // ========================================
    // 3. REVISAMOS EL ROL
    // ========================================

    const rol = datosUsuario.rol


    // ========================================
    // ACCESO COMO PACIENTE
    // ========================================

    if (tipoCuenta.value === 'paciente') {

      // La cuenta debe tener rol usuario
      if (rol !== 'usuario') {

        mensaje.value =
          'Esta cuenta pertenece a un profesional de la salud. Selecciona "Soy profesional de la salud" para iniciar sesión.'

        tipoMensaje.value = 'error'

        await cerrarSesionUsuario()

        return
      }


      mensaje.value =
        'Inicio de sesión correcto.'

      tipoMensaje.value =
        'correcto'


      // Mandamos al paciente al HomeView
      setTimeout(() => {

        router.push('/')

      }, 600)


      return
    }


    // ========================================
    // ACCESO COMO PROFESIONAL DE LA SALUD
    // ========================================

    if (tipoCuenta.value === 'profesional') {

      // Aceptamos el rol nuevo y temporalmente el rol antiguo
      // para que las cuentas creadas antes del cambio sigan funcionando.
      const esProfesional =
        rol === 'profesional_salud' ||
        rol === 'doctor'

      if (!esProfesional) {

        mensaje.value =
          'Esta cuenta pertenece a un paciente. Selecciona "Soy paciente" para iniciar sesión.'

        tipoMensaje.value = 'error'

        await cerrarSesionUsuario()

        return
      }


      mensaje.value =
        'Inicio de sesión correcto.'

      tipoMensaje.value =
        'correcto'


      // Mandamos al doctor a PanelDoctor
      setTimeout(() => {

        router.push('/doctor')

      }, 600)


      return
    }


  } catch (error) {

    // Mostramos el error real en la consola para identificar
    // rápidamente si viene de Authentication o Firestore.
    console.error('====================================')
    console.error('ERROR COMPLETO AL INICIAR SESIÓN')
    console.error('Código:', error?.code)
    console.error('Mensaje:', error?.message)
    console.error('Error completo:', error)
    console.error('====================================')

    tipoMensaje.value = 'error'


    // No diferenciamos públicamente si el correo existe o
    // si la contraseña es incorrecta, para no exponer cuentas.
    if (
      error?.code === 'auth/invalid-credential' ||
      error?.code === 'auth/user-not-found' ||
      error?.code === 'auth/wrong-password'
    ) {

      mensaje.value =
        'Correo o contraseña incorrectos.'

      return
    }


    if (error?.code === 'auth/user-disabled') {

      mensaje.value =
        'No fue posible acceder a esta cuenta.'

      return
    }


    if (error?.code === 'auth/too-many-requests') {

      mensaje.value =
        'Demasiados intentos. Intenta nuevamente más tarde.'

      return
    }


    if (error?.code === 'auth/network-request-failed') {

      mensaje.value =
        'No fue posible conectarse. Verifica tu conexión a internet.'

      return
    }


    if (
      error?.code === 'permission-denied' ||
      error?.code === 'firestore/permission-denied'
    ) {

      mensaje.value =
        'No fue posible consultar la información de la cuenta.'

      return
    }


    if (
      error?.code === 'auth/invalid-api-key' ||
      error?.code === 'auth/app-not-authorized'
    ) {

      mensaje.value =
        'Existe un problema con la configuración de Firebase.'

      return
    }


    mensaje.value =
      'No se pudo iniciar sesión. Intenta nuevamente.'


  } finally {

    cargando.value = false
  }
}
</script>


<template>

  <main class="pagina-login">

    <!-- =====================================
         LADO IZQUIERDO
         ===================================== -->

    <section class="lado-formulario">

      <RouterLink
        to="/"
        class="boton-volver"
      >
        ← Volver
      </RouterLink>


      <div class="contenedor-login">


        <span class="etiqueta-bienvenida">
          Bienvenido de nuevo
        </span>


        <h1>
          Iniciar Sesión
        </h1>


        <p class="descripcion-login">

          {{
            tipoCuenta === 'profesional'
              ? 'Ingresa a tu cuenta profesional para continuar con tu seguimiento y atención.'
              : 'Ingresa a tu cuenta para continuar con tu seguimiento de bienestar.'
          }}

        </p>


        <!-- =================================
             SELECTOR PACIENTE / PROFESIONAL
             ================================= -->

        <div class="selector-tipo-login">

          <button
            type="button"
            :class="{
              activo:
                tipoCuenta === 'paciente'
            }"
            @click="
              seleccionarTipoCuenta('paciente')
            "
          >
            Soy paciente
          </button>


          <button
            type="button"
            :class="{
              activo:
                tipoCuenta === 'profesional'
            }"
            @click="
              seleccionarTipoCuenta('profesional')
            "
          >
            Soy profesional de la salud
          </button>

        </div>


        <!-- =================================
             FORMULARIO
             ================================= -->

        <form
          class="formulario-login"
          @submit.prevent="iniciarSesion"
        >


          <!-- CORREO -->

          <div class="grupo-campo">

            <label for="correo">
              Correo Electrónico
            </label>


            <div class="campo-login">

              <span class="icono-campo">
                @
              </span>


              <input
                id="correo"
                v-model="formulario.correo"
                type="email"
                placeholder="tu@email.com"
                autocomplete="email"
              />

            </div>


            <small v-if="errores.correo">
              {{ errores.correo }}
            </small>

          </div>


          <!-- CONTRASEÑA -->

          <div class="grupo-campo">

            <div class="fila-label">

              <label for="contrasena">
                Contraseña
              </label>


              <button
                type="button"
                class="boton-olvido"
              >
                ¿Olvidaste tu contraseña?
              </button>

            </div>


            <div class="campo-login">

              <span class="icono-campo">
                #
              </span>


              <input
                id="contrasena"
                v-model="formulario.contrasena"
                :type="
                  mostrarContrasena
                    ? 'text'
                    : 'password'
                "
                placeholder="Contraseña"
                autocomplete="current-password"
              />


              <button
                type="button"
                class="boton-ver"
                @click="
                  mostrarContrasena =
                    !mostrarContrasena
                "
              >

                {{
                  mostrarContrasena
                    ? 'Ocultar'
                    : 'Ver'
                }}

              </button>

            </div>


            <small
              v-if="errores.contrasena"
            >
              {{ errores.contrasena }}
            </small>

          </div>


          <!-- BOTÓN PRINCIPAL -->

          <button
            type="submit"
            class="boton-ingresar"
            :disabled="cargando"
          >

            {{
              cargando
                ? 'Iniciando sesión...'
                : tipoCuenta === 'profesional'
                  ? 'Entrar como profesional'
                  : 'Entrar como paciente'
            }}


            <span v-if="!cargando">
              →
            </span>

          </button>


          <!-- MENSAJES -->

          <p
            v-if="mensaje"
            :class="[
              'mensaje-login',

              tipoMensaje === 'error'
                ? 'mensaje-error'
                : 'mensaje-correcto'
            ]"
          >

            {{ mensaje }}

          </p>

        </form>


        <!-- =================================
             CREAR CUENTA
             ================================= -->

        <p class="texto-registro">

          ¿Aún no tienes una cuenta?

          <RouterLink to="/registro">
            Regístrate ahora
          </RouterLink>

        </p>

      </div>

    </section>



    <!-- =====================================
         LADO DERECHO
         ===================================== -->

    <section class="lado-imagen">

      <div class="contenido-imagen-login">

        <img
          :src="
            tipoCuenta === 'profesional'
              ? ajoloteProfesional
              : ajolotePaciente
          "
          :alt="
            tipoCuenta === 'profesional'
              ? 'Ajolote doctor de Vibra la Vida'
              : 'Ajolote de Vibra la Vida'
          "
          class="ajolote-login"
        />

      <div class="texto-imagen">

        <span></span>


        <h2>

          {{
            tipoCuenta === 'profesional'
              ? 'El seguimiento de tus pacientes en un solo lugar.'
              : 'Tu bienestar es una prioridad, no una opción.'
          }}

        </h2>


        <p>

          {{
            tipoCuenta === 'profesional'
              ? 'Consulta pacientes, resultados y herramientas de seguimiento desde Vibra la Vida.'
              : 'Continúa con tus herramientas, evaluaciones y recursos personalizados para cuidar tu bienestar.'
          }}

        </p>

      </div>

      </div>

    </section>

  </main>

</template>


<style
  scoped
  src="../assets/styles/IniciarSesion.css"
></style>