<script setup>
import BotonVolver from '../components/BotonVolver.vue'

// ==========================================================
// MI SEGUIMIENTO - VIBRA LA VIDA
// ==========================================================
// Esta pantalla reúne:
// 1. Mi equipo de salud.
// 2. Mis citas.
//
// El paciente puede:
// - consultar sus citas,
// - confirmarlas,
// - solicitar una reagenda,
// - cancelarlas.
// ==========================================================

import {
  computed,
  onMounted,
  onUnmounted,
  ref,
} from 'vue'

import {
  useRouter,
} from 'vue-router'

import {
  onAuthStateChanged,
} from 'firebase/auth'

import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
} from 'firebase/firestore'

import {
  auth,
  db,
} from '../firebase/firebaseConfig'

import {
  autorizarSeguimientoConCodigo,
  obtenerCodigoSeguimiento,
  rechazarSolicitudSeguimiento,
} from '../services/seguimientoPacienteService'

import {
  cancelarCitaPaciente,
  confirmarCitaPaciente,
  obtenerCitas,
  solicitarReagendaCita,
} from '../services/citasService'

import iconEquipo from '../assets/iconapp.png'


const router = useRouter()

const usuarioActual = ref(null)

const seccionActiva = ref('equipo')


// ==========================================================
// EQUIPO DE SALUD
// ==========================================================

const cargando = ref(true)
const profesionales = ref([])

// Solicitudes que un profesional ya envió,
// pero que el paciente todavía no ha autorizado.
const solicitudesPendientes = ref([])

const mensajeError = ref('')

// Estado del código OTP de seguimiento.
//
// El código se entrega únicamente dentro de la sesión
// autenticada del paciente. El profesional nunca lo recibe.
const solicitudOtpId = ref('')
const codigoOtp = ref('')
const codigoOtpRecibido = ref('')
const obteniendoCodigoOtp = ref(false)
const verificandoCodigoOtp = ref(false)
const rechazandoSolicitudId = ref('')

const mensajeOtp = ref('')
const errorOtp = ref('')

let detenerObservador = null


// ----------------------------------------------------------
// OBTENER CÓDIGO OTP DENTRO DE VIBRA LA VIDA
// ----------------------------------------------------------

const solicitarCodigoOtp = async (
  solicitud
) => {
  solicitudOtpId.value =
    solicitud.vinculoId

  codigoOtp.value = ''
  codigoOtpRecibido.value = ''
  mensajeOtp.value = ''
  errorOtp.value = ''
  obteniendoCodigoOtp.value = true

  try {
    const respuesta =
      await obtenerCodigoSeguimiento(
        solicitud.vinculoId
      )

    codigoOtpRecibido.value =
      String(respuesta?.codigo || '')

    if (!codigoOtpRecibido.value) {
      throw new Error(
        'La API no devolvió el código de autorización.'
      )
    }

    mensajeOtp.value =
      'Código de un solo uso recibido en Vibra la Vida.'

  } catch (error) {
    console.error(
      'Error al obtener OTP de seguimiento:',
      error
    )

    errorOtp.value =
      error.message ||
      'No fue posible obtener el código de autorización.'

  } finally {
    obteniendoCodigoOtp.value = false
  }
}


// ----------------------------------------------------------
// VERIFICAR OTP Y AUTORIZAR AL PROFESIONAL
// ----------------------------------------------------------

const confirmarCodigoOtp = async (
  solicitud
) => {
  const codigo =
    String(codigoOtp.value || '')
      .replace(/\D/g, '')

  if (codigo.length !== 6) {
    errorOtp.value =
      'El código debe contener 6 dígitos.'
    return
  }

  verificandoCodigoOtp.value = true
  mensajeOtp.value = ''
  errorOtp.value = ''

  try {
    await autorizarSeguimientoConCodigo(
      solicitud.vinculoId,
      codigo
    )

    solicitudOtpId.value = ''
    codigoOtp.value = ''
    codigoOtpRecibido.value = ''

    await cargarEquipoSalud(
      usuarioActual.value.uid
    )

  } catch (error) {
    console.error(
      'Error al autorizar seguimiento con OTP:',
      error
    )

    errorOtp.value =
      error.message ||
      'No fue posible verificar el código.'

  } finally {
    verificandoCodigoOtp.value = false
  }
}


const cancelarCodigoOtp = () => {
  solicitudOtpId.value = ''
  codigoOtp.value = ''
  codigoOtpRecibido.value = ''
  obteniendoCodigoOtp.value = false
  verificandoCodigoOtp.value = false
  mensajeOtp.value = ''
  errorOtp.value = ''
}


// ----------------------------------------------------------
// RECHAZAR SOLICITUD
// ----------------------------------------------------------

const rechazarSolicitud = async (
  solicitud
) => {
  const confirmar = window.confirm(
    `¿Deseas rechazar la solicitud de ${solicitud.nombreCompleto}?`
  )

  if (!confirmar) {
    return
  }

  rechazandoSolicitudId.value =
    solicitud.vinculoId

  mensajeOtp.value = ''
  errorOtp.value = ''

  try {
    await rechazarSolicitudSeguimiento(
      solicitud.vinculoId
    )

    cancelarCodigoOtp()

    await cargarEquipoSalud(
      usuarioActual.value.uid
    )

  } catch (error) {
    console.error(
      'Error al rechazar seguimiento:',
      error
    )

    errorOtp.value =
      error.message ||
      'No fue posible rechazar la solicitud.'

  } finally {
    rechazandoSolicitudId.value = ''
  }
}


// ----------------------------------------------------------
// OBTENER DATOS PÚBLICOS DE UN PROFESIONAL
// ----------------------------------------------------------
// Recibe un vínculo de seguimiento y consulta únicamente
// perfiles_profesionales/{uid}, que contiene la información
// profesional visible para el paciente.
// ----------------------------------------------------------

const obtenerPerfilProfesional = async (
  vinculo
) => {
  const referencia =
    doc(
      db,
      'perfiles_profesionales',
      vinculo.profesionalUid
    )

  const documento =
    await getDoc(
      referencia
    )

  if (!documento.exists()) {
    return null
  }

  const datos =
    documento.data()

  return {
    uid:
      vinculo.profesionalUid,

    vinculoId:
      vinculo.id,

    estado:
      vinculo.estado || '',

    fechaSolicitud:
      vinculo.fechaSolicitud ||
      null,

    fechaVinculacion:
      vinculo.fechaVinculacion ||
      null,

    nombreCompleto:
      datos.nombreCompleto ||
      datos.nombre ||
      'Profesional de la salud',

    profesionRegistrada:
      datos.profesionRegistrada ||
      'Profesión no registrada',

    especialidad:
      datos.especialidad ||
      'Área de atención no especificada',

    cedulaProfesional:
      datos.cedulaProfesional ||
      '',

    cedulaVerificada:
      Boolean(
        datos.cedulaVerificada
      ),

    formacionAdicional:
      Array.isArray(
        datos.formacionAdicional
      )
        ? datos.formacionAdicional
        : [],

    tieneConsultorio:
      Boolean(
        datos.tieneConsultorio
      ),

    consultorio:
      datos.consultorio ||
      null,
  }
}


// ----------------------------------------------------------
// OBTENER EQUIPO DE SALUD Y SOLICITUDES PENDIENTES
// ----------------------------------------------------------
// Una sola consulta obtiene los vínculos del paciente.
//
// Después separamos:
//
// estado: "activo"
//   -> aparece dentro de Mi equipo de salud.
//
// estado: "pendiente"
//   -> aparece como solicitud de seguimiento.
//
// IMPORTANTE:
// Una solicitud pendiente NO significa que el profesional
// ya tenga acceso a los datos del paciente.
// ----------------------------------------------------------

const cargarEquipoSalud = async (
  pacienteUid
) => {
  cargando.value = true

  try {
    mensajeError.value = ''

    const consulta = query(
      collection(
        db,
        'seguimiento_profesional'
      ),
      where(
        'pacienteUid',
        '==',
        pacienteUid
      )
    )

    const respuesta =
      await getDocs(consulta)

    const vinculos =
      respuesta.docs.map(
        (documento) => ({
          id: documento.id,
          ...documento.data(),
        })
      )

    const vinculosActivos =
      vinculos.filter(
        (vinculo) =>
          vinculo.estado === 'activo'
      )

    const vinculosPendientes =
      vinculos.filter(
        (vinculo) =>
          vinculo.estado === 'pendiente'
      )

    const [
      resultadosActivos,
      resultadosPendientes,
    ] = await Promise.all([
      Promise.all(
        vinculosActivos.map(
          obtenerPerfilProfesional
        )
      ),

      Promise.all(
        vinculosPendientes.map(
          obtenerPerfilProfesional
        )
      ),
    ])

    profesionales.value =
      resultadosActivos.filter(Boolean)

    solicitudesPendientes.value =
      resultadosPendientes.filter(Boolean)

  } catch (error) {

    console.error(
      'Error al cargar el equipo de salud:',
      error
    )

    profesionales.value = []
    solicitudesPendientes.value = []

    mensajeError.value =
      'No fue posible cargar tu equipo de salud.'

  } finally {

    cargando.value = false
  }
}

// ==========================================================
// CITAS
// ==========================================================

const citas = ref([])
const cargandoCitas = ref(false)

const mensajeCitas = ref('')
const mensajeErrorCitas = ref('')

const citaProcesando = ref('')

// ----------------------------------------------------------
// MODAL DE CONFIRMACIÓN CON CONTRASEÑA
// ----------------------------------------------------------
//
// Antes de confirmar una cita, el paciente vuelve a
// comprobar su identidad con la misma contraseña de su cuenta.
// ----------------------------------------------------------

const mostrarModalConfirmacion = ref(false)
const citaParaConfirmar = ref(null)
const contrasenaConfirmacion = ref('')
const mostrarContrasenaConfirmacion = ref(false)



// ----------------------------------------------------------
// MODAL DE REAGENDA
// ----------------------------------------------------------

const mostrarModalReagenda = ref(false)
const citaParaReagenda = ref(null)
const motivoReagenda = ref('')


// ----------------------------------------------------------
// MODAL DE CANCELACIÓN
// ----------------------------------------------------------

const mostrarModalCancelacion = ref(false)
const citaParaCancelar = ref(null)
const motivoCancelacion = ref('')


// ----------------------------------------------------------
// CARGAR CITAS DEL PACIENTE
// ----------------------------------------------------------

const cargarCitasPaciente = async () => {

  if (!usuarioActual.value) {
    return
  }

  cargandoCitas.value = true

  mensajeCitas.value = ''
  mensajeErrorCitas.value = ''

  try {

    const respuesta =
      await obtenerCitas()

    // La API debe proteger las citas de acuerdo con el
    // usuario autenticado.
    //
    // Además hacemos este filtro en la interfaz como
    // protección adicional para el paciente.
    citas.value = respuesta
      .filter(
        (cita) =>
          !cita.pacienteUid ||
          cita.pacienteUid ===
            usuarioActual.value.uid
      )
      .sort(
        (a, b) =>
          obtenerFechaCita(a) -
          obtenerFechaCita(b)
      )

  } catch (error) {

    console.error(
      'Error al cargar citas del paciente:',
      error
    )

    mensajeErrorCitas.value =
      error.message ||
      'No fue posible cargar tus citas.'

  } finally {

    cargandoCitas.value = false
  }
}


// ----------------------------------------------------------
// FECHA PARA ORDENAMIENTO
// ----------------------------------------------------------

const obtenerFechaCita = (
  cita
) => {

  const partes =
    String(
      cita.fecha || ''
    ).split('/')

  if (partes.length !== 3) {
    return 0
  }

  const [
    dia,
    mes,
    anio,
  ] = partes

  return new Date(
    `${anio}-${mes}-${dia}T${cita.hora || '00:00'}:00`
  ).getTime()
}


// ----------------------------------------------------------
// NOMBRE DEL PROFESIONAL EN LA CITA
// ----------------------------------------------------------

const obtenerNombreProfesionalCita = (
  cita
) => {

  if (cita.nombreEspecialista) {
    return cita.nombreEspecialista
  }

  if (cita.nombreProfesional) {
    return cita.nombreProfesional
  }

  if (cita.profesionalNombre) {
    return cita.profesionalNombre
  }

  const encontrado =
    profesionales.value.find(
      (profesional) =>
        profesional.uid ===
        cita.especialistaUid
    )

  return (
    encontrado?.nombreCompleto ||
    'Profesional de la salud'
  )
}


// ----------------------------------------------------------
// ABRIR CONFIRMACIÓN DE CITA
// ----------------------------------------------------------

const abrirConfirmacionCita = (
  cita
) => {
  citaParaConfirmar.value =
    cita

  contrasenaConfirmacion.value =
    ''

  mostrarContrasenaConfirmacion.value =
    false

  mensajeCitas.value = ''
  mensajeErrorCitas.value = ''

  mostrarModalConfirmacion.value =
    true
}


// ----------------------------------------------------------
// CERRAR CONFIRMACIÓN DE CITA
// ----------------------------------------------------------

const cerrarConfirmacionCita = () => {
  if (
    citaProcesando.value
  ) {
    return
  }

  mostrarModalConfirmacion.value =
    false

  citaParaConfirmar.value =
    null

  contrasenaConfirmacion.value =
    ''

  mostrarContrasenaConfirmacion.value =
    false
}


// ----------------------------------------------------------
// CONFIRMAR CITA CON CONTRASEÑA
// ----------------------------------------------------------
//
// La contraseña se valida directamente con Firebase.
// Nunca se guarda ni se envía a nuestra API Express.
// ----------------------------------------------------------

const confirmarCita = async () => {
  const cita =
    citaParaConfirmar.value

  if (!cita) {
    return
  }

  if (
    !contrasenaConfirmacion.value ||
    contrasenaConfirmacion.value.length < 6
  ) {
    mensajeErrorCitas.value =
      'Escribe tu contraseña actual.'

    return
  }

  citaProcesando.value =
    cita.id

  mensajeCitas.value = ''
  mensajeErrorCitas.value = ''

  try {

    const actualizada =
      await confirmarCitaPaciente(
        cita.id,
        contrasenaConfirmacion.value
      )

    if (actualizada) {

      citas.value =
        citas.value.map(
          (actual) =>
            actual.id === cita.id
              ? actualizada
              : actual
        )

    } else {

      await cargarCitasPaciente()
    }

    mostrarModalConfirmacion.value =
      false

    citaParaConfirmar.value =
      null

    contrasenaConfirmacion.value =
      ''

    mostrarContrasenaConfirmacion.value =
      false

    mensajeCitas.value =
      'Cita confirmada correctamente.'

  } catch (error) {

    console.error(
      'Error al confirmar cita:',
      error
    )

    mensajeErrorCitas.value =
      error.message ||
      'No fue posible confirmar la cita.'

  } finally {

    citaProcesando.value = ''
  }
}


// ----------------------------------------------------------
// ABRIR REAGENDA
// ----------------------------------------------------------

const abrirReagenda = (
  cita
) => {

  citaParaReagenda.value =
    cita

  // Si ya existe una solicitud pendiente, cargamos
  // el motivo anterior para que el paciente pueda
  // corregirlo o actualizarlo.
  motivoReagenda.value =
    cita.estado === 'reagenda_solicitada'
      ? cita.motivoReagenda || ''
      : ''

  mostrarModalReagenda.value =
    true

  mensajeCitas.value = ''
  mensajeErrorCitas.value = ''
}


const cerrarReagenda = () => {

  mostrarModalReagenda.value =
    false

  citaParaReagenda.value =
    null

  motivoReagenda.value = ''
}


// ----------------------------------------------------------
// ENVIAR SOLICITUD DE REAGENDA
// ----------------------------------------------------------

const enviarSolicitudReagenda = async () => {

  const cita =
    citaParaReagenda.value

  if (!cita) {
    return
  }

  if (
    motivoReagenda.value
      .trim()
      .length < 5
  ) {

    mensajeErrorCitas.value =
      'Escribe brevemente el motivo de la reagenda.'

    return
  }


  citaProcesando.value =
    cita.id

  mensajeCitas.value = ''
  mensajeErrorCitas.value = ''

  try {

    const eraActualizacion =
      cita.estado ===
      'reagenda_solicitada'

    const actualizada =
      await solicitarReagendaCita(
        cita.id,
        motivoReagenda.value
      )

    if (actualizada) {

      citas.value =
        citas.value.map(
          (actual) =>
            actual.id === cita.id
              ? actualizada
              : actual
        )

    } else {

      await cargarCitasPaciente()
    }

    cerrarReagenda()

    mensajeCitas.value =
      eraActualizacion
        ? 'Tu solicitud de reagenda fue actualizada.'
        : 'Tu solicitud de reagenda fue enviada al profesional.'

  } catch (error) {

    console.error(
      'Error al solicitar reagenda:',
      error
    )

    mensajeErrorCitas.value =
      error.message ||
      'No fue posible solicitar la reagenda.'

  } finally {

    citaProcesando.value = ''
  }
}


// ----------------------------------------------------------
// ABRIR CANCELACIÓN
// ----------------------------------------------------------

const abrirCancelacion = (
  cita
) => {

  citaParaCancelar.value =
    cita

  motivoCancelacion.value = ''

  mostrarModalCancelacion.value =
    true

  mensajeCitas.value = ''
  mensajeErrorCitas.value = ''
}


const cerrarCancelacion = () => {

  mostrarModalCancelacion.value =
    false

  citaParaCancelar.value =
    null

  motivoCancelacion.value = ''
}


// ----------------------------------------------------------
// CANCELAR CITA
// ----------------------------------------------------------

const cancelarCita = async () => {

  const cita =
    citaParaCancelar.value

  if (!cita) {
    return
  }

  citaProcesando.value =
    cita.id

  mensajeCitas.value = ''
  mensajeErrorCitas.value = ''

  try {

    const actualizada =
      await cancelarCitaPaciente(
        cita.id,
        motivoCancelacion.value
      )

    if (actualizada) {

      citas.value =
        citas.value.map(
          (actual) =>
            actual.id === cita.id
              ? actualizada
              : actual
        )

    } else {

      await cargarCitasPaciente()
    }

    cerrarCancelacion()

    mensajeCitas.value =
      'La cita fue cancelada.'

  } catch (error) {

    console.error(
      'Error al cancelar cita:',
      error
    )

    mensajeErrorCitas.value =
      error.message ||
      'No fue posible cancelar la cita.'

  } finally {

    citaProcesando.value = ''
  }
}


// ----------------------------------------------------------
// ESTADOS
// ----------------------------------------------------------

const textoEstadoCita = (
  estado
) => {

  const textos = {
    pendiente:
      'Pendiente de confirmar',

    confirmada:
      'Confirmada',

    reagenda_solicitada:
      'Reagenda solicitada',

    cancelada:
      'Cancelada',

    completada:
      'Completada',

    no_asistio:
      'No asistió',
  }

  return (
    textos[estado] ||
    'Pendiente de confirmar'
  )
}


const claseEstadoCita = (
  estado
) => {

  return (
    estado ||
    'pendiente'
  )
}


// ----------------------------------------------------------
// QUÉ ACCIONES PUEDE HACER
// ----------------------------------------------------------

const puedeConfirmar = (
  cita
) =>
  !cita.estado ||
  cita.estado === 'pendiente'


const puedeReagendar = (
  cita
) =>
  cita.estado !== 'cancelada' &&
  cita.estado !== 'completada'


const puedeCancelar = (
  cita
) =>
  cita.estado !== 'cancelada' &&
  cita.estado !== 'completada'


// ==========================================================
// FORMATO DEL EQUIPO DE SALUD
// ==========================================================

const obtenerIniciales = (
  nombre = ''
) => {
  return nombre
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map(
      (parte) =>
        parte.charAt(0).toUpperCase()
    )
    .join('')
}


const formatearHorario = (
  profesional
) => {
  return (
    profesional.consultorio
      ?.horarioAtencion ||
    'Horario no registrado'
  )
}


const formatearUbicacion = (
  profesional
) => {
  return (
    profesional.consultorio
      ?.ubicacion ||
    'Ubicación no registrada'
  )
}


const formatearTelefono = (
  profesional
) => {
  return (
    profesional.consultorio
      ?.telefono ||
    'Teléfono no registrado'
  )
}


const cantidadProfesionales = computed(
  () => profesionales.value.length
)


const cantidadSolicitudesPendientes = computed(
  () => solicitudesPendientes.value.length
)


const citasActivas = computed(
  () =>
    citas.value.filter(
      (cita) =>
        cita.estado !== 'cancelada'
    )
)


// ==========================================================
// CAMBIAR ENTRE EQUIPO Y CITAS
// ==========================================================

const cambiarSeccion = async (
  seccion
) => {

  seccionActiva.value =
    seccion

  if (
    seccion === 'citas' &&
    usuarioActual.value
  ) {

    await cargarCitasPaciente()
  }
}


// ==========================================================
// SESIÓN
// ==========================================================

onMounted(() => {

  detenerObservador =
    onAuthStateChanged(
      auth,
      async (usuario) => {

        if (!usuario) {

          router.push(
            '/iniciar-sesion'
          )

          return
        }

        usuarioActual.value =
          usuario

        await cargarEquipoSalud(
          usuario.uid
        )

        await cargarCitasPaciente()
      }
    )
})


onUnmounted(() => {

  if (detenerObservador) {
    detenerObservador()
  }
})
</script>


<template>

  <main class="pagina-equipo-salud">

    <BotonVolver />


    <section class="contenedor-equipo">

      <!-- ==================================================
           ENCABEZADO
           ================================================== -->

      <header class="encabezado-equipo">

        <div class="icono-principal-equipo">
          <img
            :src="iconEquipo"
            alt="Mi seguimiento"
          />
        </div>


        <div>

          <span class="etiqueta-equipo">
            Acompañamiento
          </span>

          <h1>
            Mi seguimiento
          </h1>

          <p>
            Consulta a tu equipo de salud y administra
            las citas programadas para tu seguimiento.
          </p>

        </div>

      </header>


      <!-- ==================================================
           PESTAÑAS
           ================================================== -->

      <nav class="pestanas-seguimiento">

        <button
          type="button"
          :class="{
            activa:
              seccionActiva === 'equipo'
          }"
          @click="
            cambiarSeccion('equipo')
          "
        >
          Mi equipo de salud
        </button>


        <button
          type="button"
          :class="{
            activa:
              seccionActiva === 'citas'
          }"
          @click="
            cambiarSeccion('citas')
          "
        >
          Mis citas

          <span
            v-if="citasActivas.length > 0"
            class="contador-citas"
          >
            {{ citasActivas.length }}
          </span>
        </button>

      </nav>


      <!-- ==================================================
           MI EQUIPO DE SALUD
           ================================================== -->

      <template
        v-if="
          seccionActiva === 'equipo'
        "
      >

        <section
          v-if="cargando"
          class="estado-equipo"
        >
          Cargando tu equipo de salud...
        </section>


        <section
          v-else-if="mensajeError"
          class="estado-equipo error"
        >
          {{ mensajeError }}
        </section>


        <template v-else>

          <!-- ==============================================
               SOLICITUDES PENDIENTES
               ============================================== -->

          <section
            v-if="
              cantidadSolicitudesPendientes > 0
            "
            class="bloque-solicitudes-seguimiento"
          >

            <div class="cabecera-solicitudes-seguimiento">

              <div>
                <span class="etiqueta-solicitud">
                  Solicitudes de seguimiento
                </span>

                <h2>
                  Tienes una solicitud pendiente
                </h2>

                <p>
                  Revisa qué profesional desea iniciar
                  seguimiento contigo.
                </p>
              </div>

              <span class="contador-solicitudes">
                {{ cantidadSolicitudesPendientes }}
              </span>

            </div>


            <div class="lista-solicitudes-seguimiento">

              <article
                v-for="
                  solicitud in solicitudesPendientes
                "
                :key="solicitud.vinculoId"
                class="tarjeta-solicitud-seguimiento"
              >

                <div class="cabecera-solicitud-profesional">

                  <div class="avatar-profesional avatar-solicitud">
                    {{
                      obtenerIniciales(
                        solicitud.nombreCompleto
                      )
                    }}
                  </div>

                  <div class="identidad-solicitud-profesional">

                    <span
                      v-if="
                        solicitud.cedulaVerificada
                      "
                      class="estado-verificado"
                    >
                      Cédula verificada
                    </span>

                    <h3>
                      {{ solicitud.nombreCompleto }}
                    </h3>

                    <p>
                      {{ solicitud.profesionRegistrada }}
                    </p>

                  </div>

                  <span class="estado-solicitud-pendiente">
                    Pendiente de autorización
                  </span>

                </div>


                <div class="datos-solicitud-profesional">

                  <div>
                    <span>
                      Área de atención
                    </span>

                    <strong>
                      {{ solicitud.especialidad }}
                    </strong>
                  </div>

                  <div
                    v-if="
                      solicitud.cedulaProfesional
                    "
                  >
                    <span>
                      Cédula profesional
                    </span>

                    <strong>
                      {{ solicitud.cedulaProfesional }}
                    </strong>
                  </div>

                </div>


                <div class="aviso-solicitud-seguimiento">
                  Esta solicitud todavía no autoriza al profesional
                  a consultar tus datos de seguimiento.
                </div>


                <!-- ==========================================
                     AUTORIZACIÓN CON CÓDIGO DE UN SOLO USO
                     ========================================== -->

                <div class="verificacion-otp-solicitud">

                  <div class="cabecera-verificacion-otp">
                    <strong>
                      Código de autorización
                    </strong>

                    <p>
                      El código se entrega únicamente dentro de
                      tu sesión de Vibra la Vida. Este profesional
                      no puede verlo y todavía no tiene acceso a
                      tus datos.
                    </p>
                  </div>


                  <div class="acciones-solicitud-otp">

                    <button
                      type="button"
                      class="boton-rechazar-solicitud"
                      :disabled="
                        rechazandoSolicitudId === solicitud.vinculoId ||
                        verificandoCodigoOtp
                      "
                      @click="
                        rechazarSolicitud(
                          solicitud
                        )
                      "
                    >
                      {{
                        rechazandoSolicitudId === solicitud.vinculoId
                          ? 'Rechazando...'
                          : 'Rechazar solicitud'
                      }}
                    </button>

                    <button
                      v-if="
                        solicitudOtpId !== solicitud.vinculoId
                      "
                      type="button"
                      class="boton-obtener-otp"
                      :disabled="obteniendoCodigoOtp"
                      @click="
                        solicitarCodigoOtp(
                          solicitud
                        )
                      "
                    >
                      {{
                        obteniendoCodigoOtp
                          ? 'Obteniendo código...'
                          : 'Recibir código de autorización'
                      }}
                    </button>

                  </div>


                  <div
                    v-if="
                      solicitudOtpId === solicitud.vinculoId &&
                      codigoOtpRecibido
                    "
                    class="panel-codigo-otp"
                  >

                    <div class="codigo-recibido-app">
                      <span>
                        Tu código de un solo uso
                      </span>

                      <strong>
                        {{ codigoOtpRecibido }}
                      </strong>

                      <small>
                        Solo funciona para esta solicitud y caduca
                        automáticamente.
                      </small>
                    </div>

                    <label
                      :for="`codigo-otp-${solicitud.vinculoId}`"
                    >
                      Confirma el código
                    </label>

                    <input
                      :id="`codigo-otp-${solicitud.vinculoId}`"
                      v-model="codigoOtp"
                      type="text"
                      inputmode="numeric"
                      autocomplete="one-time-code"
                      maxlength="6"
                      placeholder="000000"
                    />

                    <div class="acciones-codigo-otp">

                      <button
                        type="button"
                        class="boton-cancelar-otp"
                        :disabled="verificandoCodigoOtp"
                        @click="cancelarCodigoOtp"
                      >
                        Cancelar
                      </button>

                      <button
                        type="button"
                        class="boton-confirmar-otp"
                        :disabled="
                          verificandoCodigoOtp ||
                          codigoOtp.replace(/\D/g, '').length !== 6
                        "
                        @click="
                          confirmarCodigoOtp(
                            solicitud
                          )
                        "
                      >
                        {{
                          verificandoCodigoOtp
                            ? 'Verificando...'
                            : 'Autorizar seguimiento'
                        }}
                      </button>

                    </div>

                  </div>


                  <p
                    v-if="
                      solicitudOtpId === solicitud.vinculoId &&
                      mensajeOtp
                    "
                    class="mensaje-verificacion-otp correcto"
                  >
                    {{ mensajeOtp }}
                  </p>

                  <p
                    v-if="
                      solicitudOtpId === solicitud.vinculoId &&
                      errorOtp
                    "
                    class="mensaje-verificacion-otp error"
                  >
                    {{ errorOtp }}
                  </p>

                </div>

              </article>

            </div>

          </section>


          <!-- ==============================================
               PROFESIONALES ACTIVOS
               ============================================== -->

        <section
          v-if="
            cantidadProfesionales === 0
          "
          class="estado-equipo vacio"
        >

          <h2>
            No tienes profesionales vinculados actualmente
          </h2>

          <p
            v-if="
              cantidadSolicitudesPendientes > 0
            "
          >
            Tu solicitud pendiente aparece arriba.
            El profesional se mostrará aquí solamente después
            de que el seguimiento sea autorizado.
          </p>

          <p v-else>
            Cuando un profesional sea vinculado a tu seguimiento,
            esta sección aparecerá con su información.
          </p>

        </section>


        <section
          v-else
          class="rejilla-profesionales"
        >

          <article
            v-for="
              profesional in profesionales
            "
            :key="profesional.uid"
            class="tarjeta-profesional"
          >

            <div class="cabecera-profesional">

              <div class="avatar-profesional">

                {{
                  obtenerIniciales(
                    profesional.nombreCompleto
                  )
                }}

              </div>


              <div class="identidad-profesional">

                <span
                  v-if="
                    profesional.cedulaVerificada
                  "
                  class="estado-verificado"
                >
                  Cédula verificada
                </span>

                <h2>
                  {{
                    profesional.nombreCompleto
                  }}
                </h2>

                <p class="profesion">
                  {{
                    profesional.profesionRegistrada
                  }}
                </p>

              </div>

            </div>


            <div class="datos-profesional">

              <div class="dato-equipo">

                <span>
                  Área de atención
                </span>

                <strong>
                  {{ profesional.especialidad }}
                </strong>

              </div>


              <div
                v-if="
                  profesional.cedulaProfesional
                "
                class="dato-equipo"
              >

                <span>
                  Cédula profesional
                </span>

                <strong>
                  {{
                    profesional.cedulaProfesional
                  }}
                </strong>

              </div>


              <div class="dato-equipo">

                <span>
                  Ubicación
                </span>

                <strong>
                  {{
                    formatearUbicacion(
                      profesional
                    )
                  }}
                </strong>

              </div>


              <div class="dato-equipo">

                <span>
                  Horario de atención
                </span>

                <strong>
                  {{
                    formatearHorario(
                      profesional
                    )
                  }}
                </strong>

              </div>


              <div class="dato-equipo">

                <span>
                  Teléfono
                </span>

                <strong>
                  {{
                    formatearTelefono(
                      profesional
                    )
                  }}
                </strong>

              </div>

            </div>


            <div
              v-if="
                profesional.formacionAdicional.some(
                  (estudio) =>
                    estudio &&
                    estudio.tipo &&
                    estudio.nombre
                )
              "
              class="formacion-resumen"
            >

              <span>
                Formación adicional
              </span>

              <p>
                {{
                  profesional.formacionAdicional
                    .filter(
                      (estudio) =>
                        estudio &&
                        estudio.tipo &&
                        estudio.nombre
                    )
                    .slice(0, 2)
                    .map(
                      (estudio) =>
                        `${estudio.tipo}: ${estudio.nombre}`
                    )
                    .join(' · ')
                }}
              </p>

            </div>

          </article>

        </section>

        </template>

      </template>


      <!-- ==================================================
           MIS CITAS
           ================================================== -->

      <template
        v-else
      >

        <section class="cabecera-mis-citas">

          <div>
            <span class="mini-etiqueta-citas">
              Agenda
            </span>

            <h2>
              Mis citas
            </h2>

            <p>
              Confirma tu asistencia, solicita una reagenda
              o cancela una cita cuando sea necesario.
            </p>
          </div>

        </section>


        <p
          v-if="mensajeCitas"
          class="mensaje-citas-paciente exito"
        >
          {{ mensajeCitas }}
        </p>


        <p
          v-if="mensajeErrorCitas"
          class="mensaje-citas-paciente error"
        >
          {{ mensajeErrorCitas }}
        </p>


        <section
          v-if="cargandoCitas"
          class="estado-equipo"
        >
          Cargando tus citas...
        </section>


        <section
          v-else-if="
            citas.length === 0
          "
          class="estado-equipo vacio"
        >

          <h2>
            No tienes citas programadas
          </h2>

          <p>
            Cuando un profesional programe una cita
            contigo, aparecerá en este apartado.
          </p>

        </section>


        <section
          v-else
          class="lista-citas-paciente"
        >

          <article
            v-for="
              cita in citas
            "
            :key="cita.id"
            class="tarjeta-cita-paciente"
            :class="{
              cancelada:
                cita.estado === 'cancelada'
            }"
          >

            <div class="cabecera-cita-paciente">

              <div class="fecha-cita-paciente">

                <strong>
                  {{ cita.fecha }}
                </strong>

                <span>
                  {{ cita.hora }} h
                </span>

              </div>


              <span
                class="estado-cita-paciente"
                :class="
                  claseEstadoCita(
                    cita.estado
                  )
                "
              >
                {{
                  textoEstadoCita(
                    cita.estado
                  )
                }}
              </span>

            </div>


            <div class="informacion-cita-paciente">

              <div>

                <span>
                  Profesional
                </span>

                <strong>
                  {{
                    obtenerNombreProfesionalCita(
                      cita
                    )
                  }}
                </strong>

              </div>


              <div>

                <span>
                  Motivo
                </span>

                <strong>
                  {{
                    cita.motivo ||
                    'Consulta de seguimiento'
                  }}
                </strong>

              </div>


              <div>

                <span>
                  Modalidad
                </span>

                <strong>
                  {{
                    cita.modalidad ||
                    'No especificada'
                  }}
                </strong>

              </div>


              <div
                v-if="
                  cita.lugar
                "
              >

                <span>
                  Lugar
                </span>

                <strong>
                  {{ cita.lugar }}
                </strong>

              </div>

            </div>


            <div
              v-if="
                cita.estado ===
                'reagenda_solicitada'
              "
              class="aviso-reagenda"
            >

              <strong>
                Reagenda solicitada
              </strong>

              <p>
                Tu profesional debe revisar la solicitud
                antes de asignar una nueva fecha.
              </p>

              <small
                v-if="
                  cita.motivoReagenda
                "
              >
                Motivo:
                {{ cita.motivoReagenda }}
              </small>

            </div>


            <div
              v-if="
                cita.estado ===
                'cancelada'
              "
              class="aviso-cancelacion"
            >

              Esta cita fue cancelada.

            </div>


            <div
              v-if="
                cita.estado !==
                'cancelada' &&
                cita.estado !==
                'completada'
              "
              class="acciones-cita-paciente"
            >

              <button
                v-if="
                  puedeConfirmar(
                    cita
                  )
                "
                type="button"
                class="boton-confirmar-cita"
                :disabled="
                  citaProcesando ===
                  cita.id
                "
                @click="
                  abrirConfirmacionCita(
                    cita
                  )
                "
              >
                Confirmar
              </button>


              <button
                v-if="
                  puedeReagendar(
                    cita
                  )
                "
                type="button"
                class="boton-reagendar-cita"
                :disabled="
                  citaProcesando ===
                  cita.id
                "
                @click="
                  abrirReagenda(
                    cita
                  )
                "
              >
                {{
                  cita.estado ===
                  'reagenda_solicitada'
                    ? 'Actualizar solicitud'
                    : 'Solicitar reagenda'
                }}
              </button>


              <button
                v-if="
                  puedeCancelar(
                    cita
                  )
                "
                type="button"
                class="boton-cancelar-cita"
                :disabled="
                  citaProcesando ===
                  cita.id
                "
                @click="
                  abrirCancelacion(
                    cita
                  )
                "
              >
                Cancelar
              </button>

            </div>

          </article>

        </section>

      </template>

    </section>


    <!-- ====================================================
         MODAL CONFIRMAR CITA CON CONTRASEÑA
         ==================================================== -->

    <div
      v-if="
        mostrarModalConfirmacion
      "
      class="fondo-modal-seguimiento"
      @click.self="
        cerrarConfirmacionCita
      "
    >

      <section class="modal-seguimiento">

        <h2>
          Confirmar cita
        </h2>

        <p>
          Vas a confirmar tu asistencia a la cita del
          <strong>
            {{ citaParaConfirmar?.fecha }}
          </strong>
          a las
          <strong>
            {{ citaParaConfirmar?.hora }}
          </strong>
          con
          <strong>
            {{
              citaParaConfirmar
                ? obtenerNombreProfesionalCita(
                    citaParaConfirmar
                  )
                : ''
            }}
          </strong>.
        </p>

        <p class="aviso-contrasena-cita">
          Por seguridad, escribe la misma contraseña
          que utilizas para iniciar sesión en Vibra la Vida.
        </p>


        <label
          for="contrasena-confirmar-cita"
          class="etiqueta-contrasena-cita"
        >
          Contraseña actual
        </label>


        <div class="campo-contrasena-cita">

          <input
            id="contrasena-confirmar-cita"
            v-model="
              contrasenaConfirmacion
            "
            :type="
              mostrarContrasenaConfirmacion
                ? 'text'
                : 'password'
            "
            autocomplete="current-password"
            placeholder="Escribe tu contraseña"
            :disabled="
              citaProcesando ===
              citaParaConfirmar?.id
            "
            @keyup.enter="
              confirmarCita
            "
          />

          <button
            type="button"
            class="boton-mostrar-contrasena-cita"
            :disabled="
              citaProcesando ===
              citaParaConfirmar?.id
            "
            @click="
              mostrarContrasenaConfirmacion =
                !mostrarContrasenaConfirmacion
            "
          >
            {{
              mostrarContrasenaConfirmacion
                ? 'Ocultar'
                : 'Mostrar'
            }}
          </button>

        </div>


        <p
          v-if="
            mensajeErrorCitas
          "
          class="mensaje-citas-paciente error"
        >
          {{ mensajeErrorCitas }}
        </p>


        <div class="acciones-modal-seguimiento">

          <button
            type="button"
            class="boton-secundario-modal"
            :disabled="
              citaProcesando ===
              citaParaConfirmar?.id
            "
            @click="
              cerrarConfirmacionCita
            "
          >
            Cancelar
          </button>

          <button
            type="button"
            class="boton-principal-modal"
            :disabled="
              citaProcesando ===
                citaParaConfirmar?.id ||
              contrasenaConfirmacion.length < 6
            "
            @click="
              confirmarCita
            "
          >
            {{
              citaProcesando ===
              citaParaConfirmar?.id
                ? 'Confirmando...'
                : 'Confirmar cita'
            }}
          </button>

        </div>

      </section>

    </div>


    <!-- ====================================================
         MODAL REAGENDA
         ==================================================== -->

    <div
      v-if="
        mostrarModalReagenda
      "
      class="fondo-modal-seguimiento"
      @click.self="
        cerrarReagenda
      "
    >

      <section class="modal-seguimiento">

        <h2>
          {{
            citaParaReagenda?.estado ===
            'reagenda_solicitada'
              ? 'Actualizar solicitud de reagenda'
              : 'Solicitar reagenda'
          }}
        </h2>

        <p>
          {{
            citaParaReagenda?.estado ===
            'reagenda_solicitada'
              ? 'Puedes modificar el motivo de la solicitud que ya enviaste. La fecha y la hora de la cita no cambian hasta que el profesional responda.'
              : 'Explica brevemente por qué necesitas cambiar la fecha. El profesional revisará tu solicitud.'
          }}
        </p>

        <textarea
          v-model="
            motivoReagenda
          "
          rows="5"
          maxlength="300"
          placeholder="Ej. Tengo clases en ese horario y no podré asistir."
        ></textarea>

        <small>
          {{ motivoReagenda.length }}/300
        </small>


        <div class="acciones-modal-seguimiento">

          <button
            type="button"
            class="boton-secundario-modal"
            @click="
              cerrarReagenda
            "
          >
            Volver
          </button>

          <button
            type="button"
            class="boton-principal-modal"
            :disabled="
              citaProcesando ===
              citaParaReagenda?.id
            "
            @click="
              enviarSolicitudReagenda
            "
          >
            {{
              citaParaReagenda?.estado ===
              'reagenda_solicitada'
                ? 'Actualizar solicitud'
                : 'Enviar solicitud'
            }}
          </button>

        </div>

      </section>

    </div>


    <!-- ====================================================
         MODAL CANCELACIÓN
         ==================================================== -->

    <div
      v-if="
        mostrarModalCancelacion
      "
      class="fondo-modal-seguimiento"
      @click.self="
        cerrarCancelacion
      "
    >

      <section class="modal-seguimiento">

        <h2>
          Cancelar cita
        </h2>

        <p>
          ¿Deseas cancelar esta cita? Puedes escribir
          el motivo de forma opcional.
        </p>

        <textarea
          v-model="
            motivoCancelacion
          "
          rows="4"
          maxlength="300"
          placeholder="Motivo de cancelación (opcional)"
        ></textarea>


        <div class="acciones-modal-seguimiento">

          <button
            type="button"
            class="boton-secundario-modal"
            @click="
              cerrarCancelacion
            "
          >
            Volver
          </button>

          <button
            type="button"
            class="boton-peligro-modal"
            :disabled="
              citaProcesando ===
              citaParaCancelar?.id
            "
            @click="
              cancelarCita
            "
          >
            Sí, cancelar cita
          </button>

        </div>

      </section>

    </div>

  </main>

</template>


<style
  scoped
  src="../assets/styles/miEquipoSalud.css"
></style>


<style scoped>

/* ==========================================================
   PESTAÑAS
   ========================================================== */

.pestanas-seguimiento {
  display: flex;
  gap: 10px;
  margin: 26px 0;
  padding: 6px;
  border: 1px solid #e2e8f0;
  border-radius: 16px;
  background: #ffffff;
}

.pestanas-seguimiento button {
  flex: 1;
  min-height: 46px;
  border: 0;
  border-radius: 12px;
  color: #64748b;
  background: transparent;
  font: inherit;
  font-weight: 800;
  cursor: pointer;
}

.pestanas-seguimiento button.activa {
  color: #0f6e83;
  background: #e6f8f8;
}

.contador-citas {
  display: inline-grid;
  place-items: center;
  min-width: 24px;
  height: 24px;
  margin-left: 7px;
  padding: 0 6px;
  border-radius: 999px;
  color: #ffffff;
  background: #0aa7b8;
  font-size: 11px;
}


/* ==========================================================
   SOLICITUDES DE SEGUIMIENTO
   ========================================================== */

.bloque-solicitudes-seguimiento {
  margin-bottom: 24px;
  padding: 22px;
  border: 1px solid #d7eee8;
  border-radius: 20px;
  background: #f7fffb;
}

.cabecera-solicitudes-seguimiento {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 18px;
  margin-bottom: 18px;
}

.cabecera-solicitudes-seguimiento h2 {
  margin: 5px 0 6px;
  color: #173b57;
  font-size: 24px;
}

.cabecera-solicitudes-seguimiento p {
  margin: 0;
  color: #64748b;
  line-height: 1.6;
}

.etiqueta-solicitud {
  color: #15803d;
  font-size: 12px;
  font-weight: 900;
  text-transform: uppercase;
}

.contador-solicitudes {
  display: inline-grid;
  place-items: center;
  min-width: 36px;
  height: 36px;
  padding: 0 10px;
  border-radius: 999px;
  color: #166534;
  background: #dcfce7;
  font-weight: 900;
}

.lista-solicitudes-seguimiento {
  display: grid;
  gap: 14px;
}

.tarjeta-solicitud-seguimiento {
  padding: 20px;
  border: 1px solid #dce9e5;
  border-radius: 18px;
  background: #ffffff;
}

.cabecera-solicitud-profesional {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: 14px;
}

.avatar-solicitud {
  flex: 0 0 auto;
}

.identidad-solicitud-profesional h3 {
  margin: 5px 0 3px;
  color: #173b57;
  font-size: 18px;
}

.identidad-solicitud-profesional p {
  margin: 0;
  color: #64748b;
  font-size: 13px;
}

.estado-solicitud-pendiente {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 8px 12px;
  border-radius: 999px;
  color: #92400e;
  background: #fef3c7;
  font-size: 11px;
  font-weight: 900;
  text-align: center;
}

.datos-solicitud-profesional {
  display: grid;
  grid-template-columns:
    repeat(2, minmax(0, 1fr));
  gap: 14px;
  margin-top: 18px;
  padding-top: 16px;
  border-top: 1px solid #eef2f7;
}

.datos-solicitud-profesional div {
  display: grid;
  gap: 5px;
}

.datos-solicitud-profesional span {
  color: #94a3b8;
  font-size: 11px;
  font-weight: 800;
  text-transform: uppercase;
}

.datos-solicitud-profesional strong {
  color: #334155;
  font-size: 13px;
}

.aviso-solicitud-seguimiento {
  margin-top: 16px;
  padding: 12px 14px;
  border-radius: 12px;
  color: #075985;
  background: #f0f9ff;
  font-size: 12px;
  font-weight: 700;
  line-height: 1.55;
}


/* ==========================================================
   AUTORIZACIÓN OTP DE SOLICITUD
   ========================================================== */

.verificacion-otp-solicitud {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid #eef2f7;
}

.cabecera-verificacion-otp strong {
  color: #173b57;
  font-size: 14px;
}

.cabecera-verificacion-otp p {
  margin: 6px 0 14px;
  color: #64748b;
  font-size: 12px;
  line-height: 1.55;
}

.acciones-solicitud-otp,
.acciones-codigo-otp {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.boton-obtener-otp,
.boton-confirmar-otp,
.boton-rechazar-solicitud,
.boton-cancelar-otp {
  min-height: 44px;
  padding: 0 16px;
  border-radius: 12px;
  font: inherit;
  font-weight: 900;
  cursor: pointer;
}

.boton-obtener-otp,
.boton-confirmar-otp {
  border: 0;
  background: #15803d;
  color: #ffffff;
}

.boton-rechazar-solicitud {
  border: 1px solid #fecdd3;
  background: #fff1f2;
  color: #be123c;
}

.boton-cancelar-otp {
  border: 1px solid #cbd5e1;
  background: #ffffff;
  color: #475569;
}

.boton-obtener-otp:disabled,
.boton-confirmar-otp:disabled,
.boton-rechazar-solicitud:disabled,
.boton-cancelar-otp:disabled {
  cursor: not-allowed;
  opacity: 0.55;
}

.panel-codigo-otp {
  display: grid;
  gap: 12px;
  max-width: 480px;
  margin-top: 14px;
  padding: 16px;
  border: 1px solid #d7eee8;
  border-radius: 14px;
  background: #f8fffb;
}

.codigo-recibido-app {
  display: grid;
  gap: 4px;
  padding: 14px;
  border-radius: 12px;
  background: #ecfdf5;
}

.codigo-recibido-app span,
.codigo-recibido-app small {
  color: #64748b;
  font-size: 12px;
}

.codigo-recibido-app strong {
  color: #166534;
  font-size: 28px;
  letter-spacing: 0.2em;
}

.panel-codigo-otp label {
  color: #173b57;
  font-size: 13px;
  font-weight: 900;
}

.panel-codigo-otp input {
  width: 100%;
  min-height: 46px;
  padding: 0 14px;
  border: 1px solid #cbd5e1;
  border-radius: 12px;
  outline: none;
  background: #ffffff;
  color: #173b57;
  font-size: 20px;
  font-weight: 900;
  letter-spacing: 0.24em;
}

.panel-codigo-otp input:focus {
  border-color: #0f766e;
  box-shadow: 0 0 0 3px rgba(15, 118, 110, 0.1);
}

.mensaje-verificacion-otp {
  margin: 12px 0 0;
  padding: 10px 12px;
  border-radius: 10px;
  font-size: 12px;
  font-weight: 800;
}

.mensaje-verificacion-otp.correcto {
  background: #ecfdf5;
  color: #166534;
}

.mensaje-verificacion-otp.error {
  background: #fef2f2;
  color: #b91c1c;
}


/* ==========================================================
   CONFIRMACIÓN DE CITA CON CONTRASEÑA
   ========================================================== */

.aviso-contrasena-cita {
  margin-top: 14px;
  padding: 11px 13px;
  border-radius: 11px;
  color: #075985;
  background: #f0f9ff;
  font-size: 12px;
  font-weight: 700;
  line-height: 1.55;
}

.etiqueta-contrasena-cita {
  display: block;
  margin: 16px 0 7px;
  color: #173b57;
  font-size: 13px;
  font-weight: 900;
}

.campo-contrasena-cita {
  display: grid;
  grid-template-columns:
    minmax(0, 1fr) auto;
  gap: 8px;
  align-items: center;
}

.campo-contrasena-cita input {
  width: 100%;
  min-height: 46px;
  padding: 0 14px;
  border: 1px solid #cbd5e1;
  border-radius: 12px;
  outline: none;
  background: #ffffff;
  color: #173b57;
  font: inherit;
}

.campo-contrasena-cita input:focus {
  border-color: #0aa7b8;
  box-shadow:
    0 0 0 3px
    rgba(10, 167, 184, 0.10);
}

.boton-mostrar-contrasena-cita {
  min-height: 46px;
  padding: 0 14px;
  border: 1px solid #cbd5e1;
  border-radius: 12px;
  color: #0f6e83;
  background: #ffffff;
  font: inherit;
  font-size: 12px;
  font-weight: 900;
  cursor: pointer;
}

.boton-mostrar-contrasena-cita:disabled {
  cursor: not-allowed;
  opacity: 0.55;
}


/* ==========================================================
   CITAS
   ========================================================== */

.cabecera-mis-citas {
  margin-bottom: 22px;
}

.cabecera-mis-citas h2 {
  margin: 7px 0;
  color: #173b57;
  font-size: 28px;
}

.cabecera-mis-citas p {
  margin: 0;
  color: #64748b;
}

.mini-etiqueta-citas {
  color: #15803d;
  font-size: 12px;
  font-weight: 900;
  text-transform: uppercase;
}

.lista-citas-paciente {
  display: grid;
  gap: 16px;
}

.tarjeta-cita-paciente {
  padding: 22px;
  border: 1px solid #e2e8f0;
  border-radius: 20px;
  background: #ffffff;
}

.tarjeta-cita-paciente.cancelada {
  opacity: 0.72;
}

.cabecera-cita-paciente {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  padding-bottom: 16px;
  border-bottom: 1px solid #eef2f7;
}

.fecha-cita-paciente {
  display: flex;
  align-items: baseline;
  gap: 10px;
}

.fecha-cita-paciente strong {
  color: #173b57;
  font-size: 20px;
}

.fecha-cita-paciente span {
  color: #64748b;
  font-size: 14px;
}

.estado-cita-paciente {
  display: inline-flex;
  padding: 7px 11px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 900;
}

.estado-cita-paciente.pendiente {
  color: #92400e;
  background: #fef3c7;
}

.estado-cita-paciente.confirmada {
  color: #166534;
  background: #dcfce7;
}

.estado-cita-paciente.reagenda_solicitada {
  color: #075985;
  background: #e0f2fe;
}

.estado-cita-paciente.cancelada {
  color: #991b1b;
  background: #fee2e2;
}

.informacion-cita-paciente {
  display: grid;
  grid-template-columns:
    repeat(2, minmax(0, 1fr));
  gap: 16px;
  padding: 18px 0;
}

.informacion-cita-paciente div {
  display: grid;
  gap: 5px;
}

.informacion-cita-paciente span {
  color: #94a3b8;
  font-size: 11px;
  font-weight: 800;
  text-transform: uppercase;
}

.informacion-cita-paciente strong {
  color: #334155;
  font-size: 13px;
}

.acciones-cita-paciente {
  display: flex;
  flex-wrap: wrap;
  gap: 9px;
  padding-top: 4px;
}

.acciones-cita-paciente button {
  min-height: 40px;
  padding: 0 14px;
  border: 0;
  border-radius: 11px;
  font: inherit;
  font-size: 12px;
  font-weight: 900;
  cursor: pointer;
}

.acciones-cita-paciente button:disabled {
  opacity: 0.55;
  cursor: wait;
}

.boton-confirmar-cita {
  color: #ffffff;
  background: #16a34a;
}

.boton-reagendar-cita {
  color: #0f6e83;
  background: #e6f8f8;
}

.boton-cancelar-cita {
  color: #be123c;
  background: #fff1f2;
}

.aviso-reagenda,
.aviso-cancelacion {
  margin-bottom: 12px;
  padding: 13px 14px;
  border-radius: 12px;
}

.aviso-reagenda {
  color: #075985;
  background: #f0f9ff;
}

.aviso-reagenda p {
  margin: 4px 0;
  font-size: 12px;
}

.aviso-cancelacion {
  color: #991b1b;
  background: #fff1f2;
  font-size: 12px;
  font-weight: 800;
}


/* ==========================================================
   MENSAJES
   ========================================================== */

.mensaje-citas-paciente {
  margin: 0 0 18px;
  padding: 12px 14px;
  border-radius: 12px;
  font-size: 13px;
  font-weight: 800;
}

.mensaje-citas-paciente.exito {
  color: #166534;
  background: #dcfce7;
}

.mensaje-citas-paciente.error {
  color: #991b1b;
  background: #fee2e2;
}


/* ==========================================================
   MODALES
   ========================================================== */

.fondo-modal-seguimiento {
  position: fixed;
  inset: 0;
  z-index: 1200;
  display: grid;
  place-items: center;
  padding: 20px;
  background: rgba(15, 23, 42, 0.45);
}

.modal-seguimiento {
  width: min(100%, 520px);
  padding: 25px;
  border-radius: 20px;
  background: #ffffff;
  box-shadow: 0 24px 60px rgba(15, 23, 42, 0.22);
}

.modal-seguimiento h2 {
  margin: 0 0 8px;
  color: #173b57;
}

.modal-seguimiento p {
  color: #64748b;
  font-size: 13px;
  line-height: 1.6;
}

.modal-seguimiento textarea {
  width: 100%;
  margin-top: 8px;
  padding: 13px;
  resize: vertical;
  border: 1px solid #cbd5e1;
  border-radius: 12px;
  outline: none;
  font: inherit;
}

.modal-seguimiento textarea:focus {
  border-color: #0aa7b8;
  box-shadow: 0 0 0 3px rgba(10, 167, 184, 0.10);
}

.modal-seguimiento small {
  display: block;
  margin-top: 5px;
  color: #94a3b8;
  text-align: right;
}

.acciones-modal-seguimiento {
  display: flex;
  justify-content: flex-end;
  gap: 9px;
  margin-top: 20px;
}

.acciones-modal-seguimiento button {
  min-height: 42px;
  padding: 0 14px;
  border: 0;
  border-radius: 11px;
  font: inherit;
  font-size: 12px;
  font-weight: 900;
  cursor: pointer;
}

.boton-secundario-modal {
  color: #475569;
  background: #f1f5f9;
}

.boton-principal-modal {
  color: #ffffff;
  background: #0f6e83;
}

.boton-peligro-modal {
  color: #ffffff;
  background: #e11d48;
}


/* ==========================================================
   RESPONSIVE
   ========================================================== */

@media (max-width: 650px) {

  .cabecera-solicitudes-seguimiento {
    flex-direction: column;
  }

  .cabecera-solicitud-profesional {
    grid-template-columns: auto minmax(0, 1fr);
  }

  .estado-solicitud-pendiente {
    grid-column: 1 / -1;
    width: 100%;
  }

  .datos-solicitud-profesional {
    grid-template-columns: 1fr;
  }

  .acciones-codigo-otp {
    flex-direction: column-reverse;
  }

  .boton-cancelar-otp,
  .boton-confirmar-otp,
  .boton-obtener-otp {
    width: 100%;
  }

  .pestanas-seguimiento {
    flex-direction: column;
  }

  .cabecera-cita-paciente {
    align-items: flex-start;
    flex-direction: column;
  }

  .informacion-cita-paciente {
    grid-template-columns: 1fr;
  }

  .acciones-cita-paciente {
    display: grid;
  }

  .acciones-cita-paciente button {
    width: 100%;
  }

  .acciones-modal-seguimiento {
    flex-direction: column-reverse;
  }

  .acciones-modal-seguimiento button {
    width: 100%;
  }
}

</style>
