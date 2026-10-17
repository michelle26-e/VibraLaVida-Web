<script setup>
import { verificarCedulaProfesional } from '../services/doctoresService'
// ==========================================================
// CREAR CUENTA - VIBRA LA VIDA
// Registro para paciente y profesional de la salud en una sola pantalla.
// La imagen y el mensaje del panel derecho cambian según
// el tipo de cuenta seleccionado.
// ==========================================================

import { computed, ref } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { registrarUsuario } from '../services/authService'

// IMPORTANTE:
// Guarda las dos imágenes dentro de src/assets con estos nombres.
import ajolotePaciente from '../assets/ajolotenormal.png'
import ajoloteProfesional from '../assets/ajolotedoctor.png'

const router = useRouter()

// ----------------------------------------------------------
// TIPO DE CUENTA
// ----------------------------------------------------------
// "paciente" se guarda en Firebase con rol "usuario".
// "profesional" se guarda con rol "profesional_salud".
const tipoCuenta = ref('paciente')

// ----------------------------------------------------------
// FORMULARIO
// ----------------------------------------------------------
const formulario = ref({
  nombreCompleto: '',
  correo: '',
  contrasena: '',
  confirmarContrasena: '',
  especialidad: '',
  cedulaProfesional: '',
})

const errores = ref({})
const mensajeError = ref('')
const cargando = ref(false)

const mostrarContrasena = ref(false)
const mostrarConfirmarContrasena = ref(false)

// ----------------------------------------------------------
// FORMATO AUTOMÁTICO DEL NOMBRE
// ----------------------------------------------------------
// Mantiene una presentación legible mientras el usuario escribe.
// Las partículas comunes permanecen en minúsculas cuando no son
// la primera palabra.
const particulasNombre = [
  'de',
  'del',
  'la',
  'las',
  'los',
  'y',
]

const formatearPalabraNombre = (palabra, indice) => {
  if (!palabra) return palabra

  const palabraMinuscula =
    palabra.toLocaleLowerCase('es-MX')

  if (
    indice > 0 &&
    particulasNombre.includes(palabraMinuscula)
  ) {
    return palabraMinuscula
  }

  return (
    palabraMinuscula.charAt(0)
      .toLocaleUpperCase('es-MX') +
    palabraMinuscula.slice(1)
  )
}

const formatearNombrePropio = (texto = '') => {
  let indicePalabra = 0

  return texto
    .split(/(\s+)/)
    .map((parte) => {
      if (/^\s+$/.test(parte)) {
        return parte
      }

      const resultado =
        formatearPalabraNombre(
          parte,
          indicePalabra
        )

      indicePalabra += 1

      return resultado
    })
    .join('')
}

const limpiarNombreFinal = (texto = '') => {
  return formatearNombrePropio(
    texto
      .trim()
      .replace(/\s+/g, ' ')
  )
}

const alCambiarNombre = (evento) => {
  formulario.value.nombreCompleto =
    formatearNombrePropio(
      evento.target.value
    )

  // Si el nombre cambia después de verificar la cédula,
  // obligamos a verificar nuevamente.
  if (
    tipoCuenta.value === 'profesional' &&
    estadoCedula.value === 'verificada'
  ) {
    estadoCedula.value = 'sin-verificar'
    mensajeCedula.value = ''
    datosCedulaVerificada.value = null
  }

  if (errores.value.nombreCompleto) {
    delete errores.value.nombreCompleto
  }
}


// ----------------------------------------------------------
// CONTRASEÑA SEGURA
// ----------------------------------------------------------
const requisitosContrasena = computed(() => {
  const contrasena =
    formulario.value.contrasena

  return {
    longitud:
      contrasena.length >= 8,

    mayuscula:
      /[A-ZÁÉÍÓÚÜÑ]/.test(
        contrasena
      ),

    minuscula:
      /[a-záéíóúüñ]/.test(
        contrasena
      ),

    numero:
      /\d/.test(contrasena),

    simbolo:
      /[^A-Za-zÁÉÍÓÚÜÑáéíóúüñ0-9]/.test(
        contrasena
      ),
  }
})

const contrasenaSegura = computed(() => {
  return Object.values(
    requisitosContrasena.value
  ).every(Boolean)
})

// ----------------------------------------------------------
// VERIFICACIÓN DE CÉDULA PROFESIONAL
// ----------------------------------------------------------
// Estos estados ya dejan lista la interfaz para conectarla
// después con la API RESTful de tu compañero.
//
// IMPORTANTE:
// Mientras no exista la API real, NUNCA marcamos una cédula
// como verificada únicamente por tener un formato correcto.
const estadoCedula = ref('sin-verificar')
// Valores posibles:
// 'sin-verificar'
// 'verificando'
// 'verificada'
// 'no-encontrada'
// 'pendiente-api'

const mensajeCedula = ref('')
const datosCedulaVerificada = ref(null)

const cedulaVerificada = computed(() => {
  return estadoCedula.value === 'verificada'
})

// ----------------------------------------------------------
// ESPECIALIDADES
// ----------------------------------------------------------
// La lista se usa como sugerencias opcionales para profesionales.
const especialidades = [
  'Alergología e Inmunología',
  'Alergología Pediátrica',
  'Anestesiología',
  'Anestesiología Pediátrica',
  'Angiología y Cirugía Vascular',
  'Cardiología',
  'Cardiología Intervencionista',
  'Cardiología Pediátrica',
  'Cirugía Cardiovascular',
  'Cirugía General',
  'Cirugía Oncológica',
  'Cirugía Pediátrica',
  'Cirugía Plástica Estética y Reconstructiva',
  'Coloproctología',
  'Dermatología',
  'Dermatología Pediátrica',
  'Endocrinología',
  'Endocrinología Pediátrica',
  'Gastroenterología',
  'Gastroenterología Pediátrica',
  'Genética Médica',
  'Geriatría',
  'Ginecología y Obstetricia',
  'Ginecología Oncológica',
  'Hematología',
  'Hematología Pediátrica',
  'Infectología',
  'Infectología Pediátrica',
  'Medicina Crítica',
  'Medicina del Deporte',
  'Medicina del Dolor',
  'Medicina del Sueño',
  'Medicina Familiar',
  'Medicina Física y Rehabilitación',
  'Medicina General',
  'Medicina Interna',
  'Medicina Materno Fetal',
  'Medicina Nuclear',
  'Nefrología',
  'Nefrología Pediátrica',
  'Neonatología',
  'Neumología',
  'Neumología Pediátrica',
  'Neurología',
  'Neurología Pediátrica',
  'Neurocirugía',
  'Nutrición',
  'Nutrición Clínica',
  'Nutrición Pediátrica',
  'Oftalmología',
  'Oftalmología Pediátrica',
  'Oncología Médica',
  'Oncología Pediátrica',
  'Ortopedia',
  'Ortopedia Pediátrica',
  'Otorrinolaringología',
  'Otorrinolaringología Pediátrica',
  'Pediatría',
  'Psicología',
  'Psicología Clínica',
  'Psicología Infantil y del Adolescente',
  'Psiquiatría',
  'Psiquiatría Infantil y de la Adolescencia',
  'Radiología e Imagen',
  'Reumatología',
  'Reumatología Pediátrica',
  'Traumatología',
  'Traumatología y Ortopedia',
  'Urgencias Médicas',
  'Urología',
  'Urología Pediátrica',
]

const mostrarListaEspecialidades = ref(false)

// Filtra las especialidades según lo que escribe el doctor.
const especialidadesFiltradas = computed(() => {
  const texto = formulario.value.especialidad
    .trim()
    .toLowerCase()

  if (!texto) {
    return especialidades.slice(0, 12)
  }

  return especialidades
    .filter((especialidad) =>
      especialidad.toLowerCase().includes(texto)
    )
    .slice(0, 12)
})

// ----------------------------------------------------------
// CONTENIDO DINÁMICO DEL PANEL DERECHO
// ----------------------------------------------------------
const imagenLateral = computed(() => {
  return tipoCuenta.value === 'profesional'
    ? ajoloteProfesional
    : ajolotePaciente
})

const tituloLateral = computed(() => {
  return tipoCuenta.value === 'profesional'
    ? 'Acompaña y cuida a tus pacientes.'
    : 'Un paso más hacia tu equilibrio.'
})

const textoLateral = computed(() => {
  return tipoCuenta.value === 'profesional'
    ? 'Regístrate como profesional de la salud para dar seguimiento, revisar resultados y gestionar pacientes desde un solo lugar.'
    : 'Regístrate en Vibra la Vida y accede a herramientas, encuestas interactivas y recursos personalizados para ti.'
})

// ----------------------------------------------------------
// CAMBIAR TIPO DE CUENTA
// ----------------------------------------------------------
const seleccionarTipoCuenta = (tipo) => {
  tipoCuenta.value = tipo
  mensajeError.value = ''
  errores.value = {}

  // Si vuelve a paciente, limpiamos especialidad.
  if (tipo === 'paciente') {
    formulario.value.especialidad = ''
    formulario.value.cedulaProfesional = ''
    mostrarListaEspecialidades.value = false
  }

  // Cada vez que cambia el tipo de cuenta,
  // la verificación profesional vuelve a comenzar.
  estadoCedula.value = 'sin-verificar'
  mensajeCedula.value = ''
  datosCedulaVerificada.value = null
}

// ----------------------------------------------------------
// SELECCIONAR ESPECIALIDAD
// ----------------------------------------------------------
const seleccionarEspecialidad = (especialidad) => {
  formulario.value.especialidad = especialidad
  mostrarListaEspecialidades.value = false

  if (errores.value.especialidad) {
    delete errores.value.especialidad
  }
}

// ----------------------------------------------------------
// CUANDO CAMBIA LA CÉDULA
// ----------------------------------------------------------
const alCambiarCedula = () => {
  // Dejamos únicamente números.
  formulario.value.cedulaProfesional =
    formulario.value.cedulaProfesional.replace(/\D/g, '')

  // Si el usuario modifica la cédula después de verificar,
  // debe volver a verificarse.
  estadoCedula.value = 'sin-verificar'
  mensajeCedula.value = ''
  datosCedulaVerificada.value = null

  if (errores.value.cedulaProfesional) {
    delete errores.value.cedulaProfesional
  }
}


// ----------------------------------------------------------
// VERIFICAR CÉDULA
// ----------------------------------------------------------
const verificarCedula = async () => {
  mensajeCedula.value = ''
  datosCedulaVerificada.value = null

  const cedula =
    formulario.value.cedulaProfesional.trim()

  const nombreCompleto =
    formulario.value.nombreCompleto.trim()

  if (!nombreCompleto) {
    errores.value.nombreCompleto =
      'Ingresa primero tu nombre completo.'
    return
  }

  if (!cedula) {
    estadoCedula.value = 'sin-verificar'
    errores.value.cedulaProfesional =
      'Ingresa tu cédula profesional.'
    return
  }

  if (!/^\d{7,8}$/.test(cedula)) {
    estadoCedula.value = 'no-encontrada'
    errores.value.cedulaProfesional =
      'La cédula debe contener 7 u 8 dígitos.'
    return
  }

  delete errores.value.cedulaProfesional
  delete errores.value.nombreCompleto

  estadoCedula.value = 'verificando'

  try {
    const datos = await verificarCedulaProfesional({
      cedula,
      nombreCompleto,
    })

    if (!datos.valida) {
      estadoCedula.value = 'no-encontrada'
      mensajeCedula.value =
        datos.mensaje ||
        'No fue posible verificar esta cédula profesional.'
      return
    }

    estadoCedula.value = 'verificada'
    datosCedulaVerificada.value = datos.profesional

    mensajeCedula.value =
      'Cédula profesional verificada correctamente.'
  } catch (error) {
    console.error(
      'Error al verificar la cédula:',
      error
    )

    estadoCedula.value = 'no-encontrada'
    mensajeCedula.value =
      'No se pudo conectar con el servicio de verificación.'
  }
}

// ----------------------------------------------------------
// REVALIDAR INFORMACIÓN PROFESIONAL ANTES DEL REGISTRO
// ----------------------------------------------------------
// La API vuelve a comprobar:
// - que la cédula sea válida,
// - que el nombre coincida,
// - y que la cédula no esté ocupada.
//
// Al usuario nunca se le informa si el motivo real es
// una cédula ya utilizada.
const revalidarProfesionalAntesDeCrear = async () => {
  const datos = await verificarCedulaProfesional({
    cedula:
      formulario.value.cedulaProfesional.trim(),

    nombreCompleto:
      limpiarNombreFinal(
        formulario.value.nombreCompleto
      ),
  })

  if (!datos.valida) {
    throw new Error(
      'REGISTRO_PROFESIONAL_NO_VALIDO'
    )
  }

  datosCedulaVerificada.value =
    datos.profesional

  return true
}


// ----------------------------------------------------------
// VALIDACIÓN
// ----------------------------------------------------------
const validarFormulario = () => {
  const nuevosErrores = {}

  if (!formulario.value.nombreCompleto.trim()) {
    nuevosErrores.nombreCompleto =
      'Ingresa tu nombre completo.'
  }

  if (!formulario.value.correo.trim()) {
    nuevosErrores.correo =
      'Ingresa tu correo electrónico.'
  } else {
    const expresionCorreo =
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/

    if (
      !expresionCorreo.test(
        formulario.value.correo.trim()
      )
    ) {
      nuevosErrores.correo =
        'Ingresa un correo electrónico válido.'
    }
  }

  if (!formulario.value.contrasena) {
    nuevosErrores.contrasena =
      'Ingresa una contraseña.'
  } else if (!contrasenaSegura.value) {
    nuevosErrores.contrasena =
      'La contraseña todavía no cumple todos los requisitos de seguridad.'
  }

  if (!formulario.value.confirmarContrasena) {
    nuevosErrores.confirmarContrasena =
      'Confirma tu contraseña.'
  } else if (
    formulario.value.contrasena !==
    formulario.value.confirmarContrasena
  ) {
    nuevosErrores.confirmarContrasena =
      'Las contraseñas no coinciden.'
  }

  // El profesional de la salud requiere una cédula verificada.
  // La especialidad o área de atención es opcional porque la profesión
  // oficial se obtiene directamente del registro de la cédula.
  if (tipoCuenta.value === 'profesional') {
    const cedula =
      formulario.value.cedulaProfesional.trim()

    if (!cedula) {
      nuevosErrores.cedulaProfesional =
        'Ingresa tu cédula profesional.'
    } else if (!/^\d{7,8}$/.test(cedula)) {
      nuevosErrores.cedulaProfesional =
        'La cédula debe contener 7 u 8 dígitos.'
    } else if (!cedulaVerificada.value) {
      nuevosErrores.cedulaProfesional =
        'Debes verificar tu cédula profesional antes de crear la cuenta.'
    }
  }

  errores.value = nuevosErrores

  return Object.keys(nuevosErrores).length === 0
}

// ----------------------------------------------------------
// CREAR CUENTA
// ----------------------------------------------------------
const crearCuenta = async () => {
  mensajeError.value = ''

  if (!validarFormulario()) {
    return
  }

  cargando.value = true

  try {
    // Dejamos el nombre y el correo con un formato consistente.
    formulario.value.nombreCompleto =
      limpiarNombreFinal(
        formulario.value.nombreCompleto
      )

    formulario.value.correo =
      formulario.value.correo
        .trim()
        .toLowerCase()

    // Antes de crear una cuenta profesional volvemos a consultar
    // la API para evitar reutilizar una cédula que se haya ocupado
    // después de la primera verificación.
    if (tipoCuenta.value === 'profesional') {
      await revalidarProfesionalAntesDeCrear()
    }

    await registrarUsuario({
      nombreCompleto:
        formulario.value.nombreCompleto,

      correo:
        formulario.value.correo,

      contrasena:
        formulario.value.contrasena,

      rol:
        tipoCuenta.value === 'profesional'
          ? 'profesional_salud'
          : 'usuario',

      especialidad:
        tipoCuenta.value === 'profesional'
          ? formulario.value.especialidad.trim()
          : null,

      cedulaProfesional:
        tipoCuenta.value === 'profesional'
          ? formulario.value.cedulaProfesional
          : null,

      cedulaVerificada:
        tipoCuenta.value === 'profesional'
          ? cedulaVerificada.value
          : false,

      profesionRegistrada:
        tipoCuenta.value === 'profesional'
          ? datosCedulaVerificada.value?.profesion || null
          : null,

      institucionRegistro:
        tipoCuenta.value === 'profesional'
          ? datosCedulaVerificada.value?.institucion || null
          : null,

      anioRegistro:
        tipoCuenta.value === 'profesional'
          ? datosCedulaVerificada.value?.anioRegistro || null
          : null,
    })

    // Después del registro enviamos a cada tipo de cuenta
    // a su pantalla correspondiente.
    if (tipoCuenta.value === 'profesional') {
      router.push('/doctor')
    } else {
      router.push('/')
    }
  } catch (error) {
    console.error(
      'Error al crear la cuenta:',
      error
    )

    if (
      error.message ===
      'REGISTRO_PROFESIONAL_NO_VALIDO'
    ) {
      mensajeError.value =
        'No fue posible completar el registro con la información proporcionada. Revisa tus datos e inténtalo nuevamente.'
      return
    }

    switch (error.code) {
      case 'auth/email-already-in-use':
        mensajeError.value =
          'No fue posible completar el registro con la información proporcionada.'
        break

      case 'auth/invalid-email':
        mensajeError.value =
          'El correo electrónico no es válido.'
        break

      case 'auth/weak-password':
        mensajeError.value =
          'La contraseña es demasiado débil.'
        break

      case 'auth/network-request-failed':
        mensajeError.value =
          'No se pudo conectar. Revisa tu conexión a internet.'
        break

      default:
        mensajeError.value =
          'No se pudo crear la cuenta. Inténtalo nuevamente.'
        break
    }
  } finally {
    cargando.value = false
  }
}
</script>

<template>
  <main class="pagina-registro">

    <!-- ====================================================
         LADO IZQUIERDO - FORMULARIO
         ==================================================== -->
    <section class="lado-formulario">

      <RouterLink
        to="/"
        class="boton-regresar-home"
      >
        ← Volver al inicio
      </RouterLink>

      <div class="contenido-formulario">

        <span class="etiqueta-viaje">
          Comienza tu viaje
        </span>

        <h1>Crear Cuenta</h1>

        <p class="descripcion-registro">
          Únete a nuestra comunidad y mejora tu bienestar.
        </p>

        <!-- ==================================================
             SELECTOR PACIENTE / PROFESIONAL
             ================================================== -->
        <div class="selector-tipo">

          <button
            type="button"
            class="opcion-tipo"
            :class="{
              activa: tipoCuenta === 'paciente'
            }"
            @click="
              seleccionarTipoCuenta('paciente')
            "
          >
            Soy paciente
          </button>

          <button
            type="button"
            class="opcion-tipo"
            :class="{
              activa: tipoCuenta === 'profesional'
            }"
            @click="
              seleccionarTipoCuenta('profesional')
            "
          >
            Soy profesional de la salud
          </button>

        </div>

        <!-- ==================================================
             FORMULARIO
             ================================================== -->
        <form
          class="formulario-registro"
          @submit.prevent="crearCuenta"
        >

          <!-- NOMBRE COMPLETO -->
          <div class="grupo-campo">
            <label for="nombreCompleto">
              Nombre completo
            </label>

            <div
              class="campo-registro"
              :class="{
                error:
                  errores.nombreCompleto
              }"
            >
              <span class="icono-campo">♡</span>

              <input
                id="nombreCompleto"
                v-model="formulario.nombreCompleto"
                type="text"
                autocomplete="name"
                placeholder="Tu nombre completo"
                @input="alCambiarNombre"
              />
            </div>

            <small
              v-if="errores.nombreCompleto"
              class="mensaje-campo-error"
            >
              {{ errores.nombreCompleto }}
            </small>
          </div>

          <!-- CORREO -->
          <div class="grupo-campo">
            <label for="correo">
              Correo Electrónico
            </label>

            <div
              class="campo-registro"
              :class="{
                error: errores.correo
              }"
            >
              <span class="icono-campo">@</span>

              <input
                id="correo"
                v-model="formulario.correo"
                type="email"
                autocomplete="email"
                placeholder="tu@email.com"
                @blur="
                  formulario.correo =
                    formulario.correo
                      .trim()
                      .toLowerCase()
                "
              />
            </div>

            <small
              v-if="errores.correo"
              class="mensaje-campo-error"
            >
              {{ errores.correo }}
            </small>
          </div>

          <!-- ESPECIALIDAD SOLO PARA DOCTOR -->
          <div
            v-if="tipoCuenta === 'profesional'"
            class="grupo-campo"
          >
            <label for="especialidad">
              Especialidad o área de atención (opcional)
            </label>

            <div class="contenedor-autocomplete">

              <div
                class="campo-registro"
                :class="{
                  error: errores.especialidad
                }"
              >
                <span class="icono-campo">
                  ✚
                </span>

                <input
                  id="especialidad"
                  v-model="formulario.especialidad"
                  type="text"
                  autocomplete="off"
                  placeholder="Busca tu especialidad"
                  @focus="
                    mostrarListaEspecialidades = true
                  "
                  @input="
                    mostrarListaEspecialidades = true
                  "
                />
              </div>

              <div
                v-if="
                  mostrarListaEspecialidades &&
                  especialidadesFiltradas.length
                "
                class="lista-especialidades"
              >
                <button
                  v-for="
                    especialidad
                    in especialidadesFiltradas
                  "
                  :key="especialidad"
                  type="button"
                  class="opcion-especialidad"
                  @mousedown.prevent="
                    seleccionarEspecialidad(
                      especialidad
                    )
                  "
                >
                  {{ especialidad }}
                </button>
              </div>

            </div>

            <small
              v-if="errores.especialidad"
              class="mensaje-campo-error"
            >
              {{ errores.especialidad }}
            </small>
          </div>

          <!-- CÉDULA PROFESIONAL SOLO PARA PROFESIONAL -->
          <div
            v-if="tipoCuenta === 'profesional'"
            class="grupo-campo"
          >
            <label for="cedulaProfesional">
              Cédula profesional
            </label>

            <div class="fila-verificacion-cedula">

              <div
                class="campo-registro campo-cedula"
                :class="{
                  error:
                    errores.cedulaProfesional,
                  verificado:
                    estadoCedula === 'verificada'
                }"
              >
                <span class="icono-campo">
                  ID
                </span>

                <input
                  id="cedulaProfesional"
                  v-model="formulario.cedulaProfesional"
                  type="text"
                  inputmode="numeric"
                  autocomplete="off"
                  maxlength="12"
                  placeholder="Número de cédula"
                  @input="alCambiarCedula"
                />
              </div>

              <button
                type="button"
                class="boton-verificar-cedula"
                :class="{
                  verificada:
                    estadoCedula === 'verificada'
                }"
                :disabled="
                  estadoCedula === 'verificando' ||
                  !formulario.cedulaProfesional
                "
                @click="verificarCedula"
              >
                {{
                  estadoCedula === 'verificando'
                    ? 'Verificando...'
                    : estadoCedula === 'verificada'
                      ? 'Verificada'
                      : 'Verificar'
                }}
              </button>

            </div>

            <small
              v-if="errores.cedulaProfesional"
              class="mensaje-campo-error"
            >
              {{ errores.cedulaProfesional }}
            </small>

            <div
              v-if="estadoCedula !== 'sin-verificar'"
              class="estado-verificacion-cedula"
              :class="estadoCedula"
            >
              <span class="indicador-estado">
                {{
                  estadoCedula === 'verificada'
                    ? '✓'
                    : estadoCedula === 'no-encontrada'
                      ? '×'
                      : estadoCedula === 'verificando'
                        ? '…'
                        : 'i'
                }}
              </span>

              <div>
                <strong>
                  {{
                    estadoCedula === 'verificada'
                      ? 'Cédula profesional verificada'
                      : estadoCedula === 'no-encontrada'
                        ? 'No fue posible verificarla'
                        : estadoCedula === 'verificando'
                          ? 'Consultando cédula profesional'
                          : 'Verificación pendiente'
                  }}
                </strong>

                <p v-if="mensajeCedula">
                  {{ mensajeCedula }}
                </p>

                <template
                  v-if="
                    estadoCedula === 'verificada' &&
                    datosCedulaVerificada
                  "
                >
                  <p
                    v-if="
                      datosCedulaVerificada.nombre
                    "
                  >
                    {{
                      datosCedulaVerificada.nombre
                    }}
                  </p>

                  <p
                    v-if="
                      datosCedulaVerificada.profesion
                    "
                  >
                    {{
                      datosCedulaVerificada.profesion
                    }}
                  </p>

                  <p
                    v-if="
                      datosCedulaVerificada.institucion
                    "
                  >
                    {{
                      datosCedulaVerificada.institucion
                    }}
                  </p>
                </template>
              </div>
            </div>

            <small class="ayuda-cedula">
              La cuenta profesional solo podrá crearse
              cuando la cédula sea validada por la API.
            </small>
          </div>

          <!-- CONTRASEÑA -->
          <div class="grupo-campo">
            <label for="contrasena">
              Contraseña
            </label>

            <div
              class="campo-registro"
              :class="{
                error: errores.contrasena
              }"
            >
              <span class="icono-campo">#</span>

              <input
                id="contrasena"
                v-model="formulario.contrasena"
                :type="
                  mostrarContrasena
                    ? 'text'
                    : 'password'
                "
                autocomplete="new-password"
                placeholder="Contraseña"
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
              class="mensaje-campo-error"
            >
              {{ errores.contrasena }}
            </small>

            <div
              v-if="formulario.contrasena"
              class="requisitos-contrasena"
            >
              <span
                :class="{
                  cumplido:
                    requisitosContrasena.longitud
                }"
              >
                ✓ 8 caracteres mínimo
              </span>

              <span
                :class="{
                  cumplido:
                    requisitosContrasena.mayuscula
                }"
              >
                ✓ Una mayúscula
              </span>

              <span
                :class="{
                  cumplido:
                    requisitosContrasena.minuscula
                }"
              >
                ✓ Una minúscula
              </span>

              <span
                :class="{
                  cumplido:
                    requisitosContrasena.numero
                }"
              >
                ✓ Un número
              </span>

              <span
                :class="{
                  cumplido:
                    requisitosContrasena.simbolo
                }"
              >
                ✓ Un símbolo
              </span>
            </div>
          </div>

          <!-- CONFIRMAR CONTRASEÑA -->
          <div class="grupo-campo">
            <label for="confirmarContrasena">
              Confirmar Contraseña
            </label>

            <div
              class="campo-registro"
              :class="{
                error:
                  errores.confirmarContrasena
              }"
            >
              <span class="icono-campo">#</span>

              <input
                id="confirmarContrasena"
                v-model="
                  formulario.confirmarContrasena
                "
                :type="
                  mostrarConfirmarContrasena
                    ? 'text'
                    : 'password'
                "
                autocomplete="new-password"
                placeholder="Confirmar contraseña"
              />

              <button
                type="button"
                class="boton-ver"
                @click="
                  mostrarConfirmarContrasena =
                    !mostrarConfirmarContrasena
                "
              >
                {{
                  mostrarConfirmarContrasena
                    ? 'Ocultar'
                    : 'Ver'
                }}
              </button>
            </div>

            <small
              v-if="
                errores.confirmarContrasena
              "
              class="mensaje-campo-error"
            >
              {{
                errores.confirmarContrasena
              }}
            </small>
          </div>

          <!-- ERROR GENERAL -->
          <p
            v-if="mensajeError"
            class="mensaje-error-general"
          >
            {{ mensajeError }}
          </p>

          <!-- CREAR CUENTA -->
          <button
            type="submit"
            class="boton-crear"
            :disabled="
              cargando ||
              (
                tipoCuenta === 'profesional' &&
                !cedulaVerificada
              )
            "
          >
            <span>
              {{
                cargando
                  ? 'Creando cuenta...'
                  : tipoCuenta === 'profesional'
                    ? 'Crear cuenta profesional'
                    : 'Crear mi cuenta'
              }}
            </span>

            <span v-if="!cargando">
              →
            </span>
          </button>

        </form>

        <p class="pie-registro">
          ¿Ya tienes una cuenta?

          <RouterLink to="/iniciar-sesion">
            Inicia sesión
          </RouterLink>
        </p>

      </div>

    </section>


    <!-- ====================================================
         LADO DERECHO - MASCOTA DINÁMICA
         ==================================================== -->
    <section
      class="lado-imagen"
      :class="{
        'modo-doctor':
          tipoCuenta === 'profesional'
      }"
    >

      <!-- Círculos decorativos -->
      <span class="circulo circulo-superior"></span>
      <span class="circulo circulo-inferior"></span>

      <div class="contenido-lateral">

        <!-- La imagen cambia automáticamente -->
        <img
          :src="imagenLateral"
          :alt="
            tipoCuenta === 'profesional'
              ? 'Ajolote doctor Vibra la Vida'
              : 'Ajolote Vibra la Vida'
          "
          class="imagen-ajolote"
        />

        <div class="texto-imagen">

          <span class="linea-acento"></span>

          <h2>
            {{ tituloLateral }}
          </h2>

          <p>
            {{ textoLateral }}
          </p>

        </div>

      </div>

    </section>

  </main>
</template>

<style
  scoped
  src="../assets/styles/CrearCuenta.css"
></style>
