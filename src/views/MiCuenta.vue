<script setup>
// Importamos lo que necesitamos para que la página funcione
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import {
  onAuthStateChanged,
  updateEmail,
  deleteUser,
  EmailAuthProvider,
  reauthenticateWithCredential,
} from 'firebase/auth'
import { doc, updateDoc, deleteDoc, setDoc } from 'firebase/firestore'

import { auth, db } from '../firebase/firebaseConfig'
import { cerrarSesionUsuario, obtenerDatosUsuario } from '../services/authService'
import { obtenerResultadosUsuario } from '../services/resultadosService'
import ItemHistorial from '../components/ItemHistorial.vue'
import BotonVolver from '../components/BotonVolver.vue'
const router = useRouter()

// Usuario autenticado de Firebase Authentication
const usuarioActual = ref(null)

// Datos adicionales guardados en Firestore
const datosUsuario = ref(null)

// Controla la pantalla de carga
const cargando = ref(true)

// Guardamos los resultados del usuario
const resultados = ref([])

// Controla si el formulario de edición está visible
const editandoPerfil = ref(false)

// Datos que se pueden editar
const formularioPerfil = ref({
  nombreCompleto: '',
  correo: '',
  telefono: '',
})

let detenerObservador = null

// --------------------------------------------------
// DATOS DEL USUARIO
// --------------------------------------------------

// Obtiene el nombre completo.
// Dejamos compatibilidad con usuarios antiguos que aún tengan "nombre".
const nombreCompletoUsuario = computed(() => {
  return (
    datosUsuario.value?.nombreCompleto ||
    datosUsuario.value?.nombre ||
    ''
  )
})

// Obtiene únicamente el primer nombre para el saludo
const nombreUsuario = computed(() => {
  const nombreCompleto = nombreCompletoUsuario.value.trim()

  if (!nombreCompleto) {
    return 'Usuario'
  }

  const primerNombre = nombreCompleto.split(/\s+/)[0]

  return primerNombre.charAt(0).toUpperCase() + primerNombre.slice(1)
})

// Inicial para el avatar

// Correo del usuario
const correoUsuario = computed(() => {
  return (
    datosUsuario.value?.correo ||
    usuarioActual.value?.email ||
    'Sin correo registrado'
  )
})

// Número de celular privado del paciente.
// Se guarda únicamente en usuarios/{uid}.
const telefonoUsuario = computed(() => {
  return (
    datosUsuario.value?.telefono ||
    'Sin número registrado'
  )
})

// --------------------------------------------------
// RESUMEN DE RESULTADOS
// --------------------------------------------------

// Contamos cuántos cálculos de IMC tiene guardados
const imcRegistrados = computed(() => {
  return resultados.value.filter((item) => item.tipo === 'imc').length
})

// Contamos cuántas encuestas ha completado
const encuestasRealizadas = computed(() => {
  const tiposEncuesta = [
    'dass21',
    'insomnio',
    'riesgo_cardiometabolico',
    'riesgo_cardiovascular',
  ]

  return resultados.value.filter((item) =>
    tiposEncuesta.includes(item.tipo)
  ).length
})

// Total de resultados guardados
const registrosGuardados = computed(() => {
  return resultados.value.length
})

// Últimos 6 resultados
const historialReciente = computed(() => {
  return [...resultados.value]
    .sort(
      (a, b) =>
        obtenerTiempoFecha(b.fecha) - obtenerTiempoFecha(a.fecha)
    )
    .slice(0, 6)
})

const obtenerTiempoFecha = (fecha) => {
  if (fecha?.toDate) return fecha.toDate().getTime()
  if (fecha instanceof Date) return fecha.getTime()
  return 0
}

// --------------------------------------------------
// RESULTADOS
// --------------------------------------------------

// Carga los resultados.
// IMPORTANTE:
// Mientras migramos cada evaluación a una colección separada,
// este método puede seguir leyendo la colección antigua.
// Si falla, Mi Cuenta ya no se quedará cargando para siempre.
const cargarResultadosUsuario = async () => {
  try {
    const respuesta = await obtenerResultadosUsuario()
    resultados.value = Array.isArray(respuesta) ? respuesta : []
  } catch (error) {
    console.error('Error al cargar resultados:', error)
    resultados.value = []
  }
}

// --------------------------------------------------
// NORMALIZAR NOMBRE PARA EL DIRECTORIO
// --------------------------------------------------
// Ejemplo:
// "José Pérez" -> "jose perez"
//
// Este valor se usa únicamente para facilitar la búsqueda
// del paciente desde el panel profesional.
// --------------------------------------------------

const normalizarNombreBusqueda = (texto = '') => {
  return texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
}

// Deja únicamente los números del celular.
// Ejemplo: "983 123 4567" -> "9831234567"
const limpiarTelefono = (telefono = '') => {
  return telefono.replace(/\D/g, '')
}


// --------------------------------------------------
// EDICIÓN DEL PERFIL
// --------------------------------------------------

const activarEdicionPerfil = () => {
  formularioPerfil.value.nombreCompleto =
    nombreCompletoUsuario.value

  formularioPerfil.value.correo =
    correoUsuario.value

  formularioPerfil.value.telefono =
    datosUsuario.value?.telefono || ''

  editandoPerfil.value = true
}

const cancelarEdicionPerfil = () => {
  editandoPerfil.value = false
}

// Guarda los cambios del perfil
const guardarPerfil = async () => {
  const usuario = auth.currentUser

  if (!usuario) return

  const nombreCompleto =
    formularioPerfil.value.nombreCompleto.trim()

  const correo =
    formularioPerfil.value.correo
      .trim()
      .toLowerCase()

  const telefono =
    limpiarTelefono(
      formularioPerfil.value.telefono
    )

  if (!nombreCompleto || !correo) {
    alert('Completa el nombre y el correo.')
    return
  }

  // El teléfono puede estar vacío por ahora.
  // Si el paciente captura uno, debe tener exactamente 10 dígitos.
  if (telefono && telefono.length !== 10) {
    alert(
      'El número de celular debe contener 10 dígitos.'
    )
    return
  }

  try {
    // ------------------------------------------------
    // 1. ACTUALIZAR CORREO EN AUTHENTICATION
    // ------------------------------------------------
    // Si el correo cambió, Firebase puede pedir que el
    // usuario haya iniciado sesión recientemente.
    // Lo hacemos primero para no dejar Firestore con un
    // correo diferente si Authentication rechaza el cambio.
    // ------------------------------------------------

    if (correo !== usuario.email) {
      await updateEmail(
        usuario,
        correo
      )
    }


    // ------------------------------------------------
    // 2. ACTUALIZAR PERFIL PRINCIPAL
    // ------------------------------------------------

    // Si el número cambió, cualquier verificación anterior
    // deja de ser válida hasta verificar nuevamente por SMS.
    const telefonoAnterior =
      limpiarTelefono(
        datosUsuario.value?.telefono || ''
      )

    const telefonoCambio =
      telefono !== telefonoAnterior

    await updateDoc(
      doc(
        db,
        'usuarios',
        usuario.uid
      ),
      {
        nombreCompleto,
        correo,
        telefono,
        telefonoVerificado:
          telefonoCambio
            ? false
            : Boolean(
                datosUsuario.value
                  ?.telefonoVerificado
              ),
      }
    )


    // ------------------------------------------------
    // 3. SINCRONIZAR DIRECTORIO DEL PACIENTE
    // ------------------------------------------------
    // Solo las cuentas con rol "usuario" forman parte
    // de directorio_pacientes.
    //
    // Gracias a esto, si Michelle cambia su nombre,
    // Laura podrá buscarla inmediatamente por el nombre
    // nuevo sin tocar Firebase manualmente.
    // ------------------------------------------------

    if (
      datosUsuario.value?.rol ===
      'usuario'
    ) {
      await setDoc(
        doc(
          db,
          'directorio_pacientes',
          usuario.uid
        ),
        {
          uid:
            usuario.uid,

          nombreCompleto,

          nombreBusqueda:
            normalizarNombreBusqueda(
              nombreCompleto
            ),
        },
        {
          merge: true,
        }
      )
    }


    // ------------------------------------------------
    // 4. ACTUALIZAR LA PANTALLA
    // ------------------------------------------------

    datosUsuario.value = {
      ...datosUsuario.value,
      nombreCompleto,
      correo,
      telefono,
      telefonoVerificado:
        telefonoCambio
          ? false
          : Boolean(
              datosUsuario.value
                ?.telefonoVerificado
            ),
    }

    editandoPerfil.value = false

    alert(
      'Perfil actualizado correctamente.'
    )

  } catch (error) {

    console.error(
      'Error al actualizar perfil:',
      error
    )

    if (
      error.code ===
      'auth/requires-recent-login'
    ) {
      alert(
        'Por seguridad, vuelve a iniciar sesión para cambiar el correo.'
      )
      return
    }

    alert(
      'No se pudo actualizar el perfil. Inténtalo nuevamente.'
    )
  }
}


// --------------------------------------------------
// ELIMINAR PERFIL
// --------------------------------------------------

const eliminarPerfil = async () => {
  const confirmar = confirm(
    '¿Seguro que deseas eliminar tu perfil? Esta acción no se puede deshacer.'
  )

  if (!confirmar) return

  const usuario = auth.currentUser

  if (!usuario) return

  const contrasena = prompt(
    'Por seguridad, escribe tu contraseña para eliminar tu cuenta.'
  )

  if (!contrasena) return

  try {
    const credencial = EmailAuthProvider.credential(
      usuario.email,
      contrasena
    )

    await reauthenticateWithCredential(
      usuario,
      credencial
    )

    // Si es paciente, eliminamos también su entrada
    // del directorio para que ya no aparezca en búsquedas
    // de profesionales.
    if (
      datosUsuario.value?.rol ===
      'usuario'
    ) {
      await deleteDoc(
        doc(
          db,
          'directorio_pacientes',
          usuario.uid
        )
      )
    }

    // Elimina el perfil principal en Firestore.
    await deleteDoc(
      doc(
        db,
        'usuarios',
        usuario.uid
      )
    )

    // Después elimina la cuenta de Authentication
    await deleteUser(usuario)

    alert('Perfil eliminado correctamente.')

    router.push('/')
  } catch (error) {
    console.error('Error al eliminar perfil:', error)

    if (
      error.code === 'auth/wrong-password' ||
      error.code === 'auth/invalid-credential'
    ) {
      alert('La contraseña es incorrecta.')
      return
    }

    alert(
      'No se pudo eliminar el perfil. Inténtalo nuevamente.'
    )
  }
}

// --------------------------------------------------
// NAVEGACIÓN
// --------------------------------------------------

const cerrarSesion = async () => {
  await cerrarSesionUsuario()
  router.push('/iniciar-sesion')
}

const irARuta = (ruta) => {
  router.push(ruta)
}

// --------------------------------------------------
// CARGA INICIAL
// --------------------------------------------------

// Se ejecuta cuando se abre Mi Cuenta
onMounted(() => {
  detenerObservador = onAuthStateChanged(
    auth,
    async (usuario) => {
      // Si no existe sesión, enviamos al login
      if (!usuario) {
        cargando.value = false
        router.push('/iniciar-sesion')
        return
      }

      usuarioActual.value = usuario

      try {
        // Buscamos directamente usuarios/{uid}
        const datos = await obtenerDatosUsuario(
          usuario.uid
        )

        datosUsuario.value = datos

        // Los resultados se cargan aparte.
        // Si fallan, la pantalla del perfil continúa funcionando.
        await cargarResultadosUsuario()
      } catch (error) {
        console.error(
          'Error al cargar la información de la cuenta:',
          error
        )

        datosUsuario.value = null
        resultados.value = []
      } finally {
        // MUY IMPORTANTE:
        // siempre quitamos "Cargando..." aunque ocurra un error.
        cargando.value = false
      }
    }
  )
})

// Detenemos el observador cuando se abandona la página
onUnmounted(() => {
  if (detenerObservador) {
    detenerObservador()
  }
})
</script>

<template>
  <main class="pagina-cuenta">
    <BotonVolver />
    
    <section
      v-if="cargando"
      class="tarjeta-cargando"
    >
      Cargando información de la cuenta...
    </section>

    <section
      v-else
      class="contenedor-cuenta"
    >
      <section class="encabezado-cuenta">
        <div class="contenido-encabezado-cuenta">
          <span class="etiqueta-cuenta">
            Mi cuenta
          </span>

          <h1>
            Hola {{ nombreUsuario }}
          </h1>

          <p>
            Aquí puedes consultar tu información y acceder rápidamente a tus
            herramientas de autocuidado.
          </p>
        </div>

        <button
          class="boton-cerrar-sesion boton-cerrar-encabezado"
          @click="cerrarSesion"
        >
          Cerrar sesión
        </button>
      </section>

      <section class="rejilla-cuenta">
        <article class="tarjeta-perfil">
          <h2>Datos de la cuenta</h2>

          <div v-if="!editandoPerfil">
            <div class="dato-perfil">
              <span>Nombre completo</span>

              <strong>
                {{
                  nombreCompletoUsuario ||
                  'No registrado'
                }}
              </strong>
            </div>

            <div class="dato-perfil">
              <span>Correo electrónico</span>

              <strong>
                {{ correoUsuario }}
              </strong>
            </div>

            <div
              v-if="
                datosUsuario?.rol === 'usuario'
              "
              class="dato-perfil"
            >
              <span>Número de celular</span>

              <strong>
                {{ telefonoUsuario }}
              </strong>
            </div>
            
            <button
              class="boton-secundario"
              @click="activarEdicionPerfil"
            >
              Editar perfil
            </button>

            <button
              class="boton-eliminar-perfil"
              @click="eliminarPerfil"
            >
              Eliminar perfil
            </button>
          </div>

          <form
            v-else
            class="formulario-perfil"
            @submit.prevent="guardarPerfil"
          >
            <label>
              Nombre completo
            </label>

            <input
              v-model="formularioPerfil.nombreCompleto"
              type="text"
              required
            />

            <label>
              Correo electrónico
            </label>

            <input
              v-model="formularioPerfil.correo"
              type="email"
              required
            />

            <template
              v-if="
                datosUsuario?.rol === 'usuario'
              "
            >
              <label>
                Número de celular
              </label>

              <input
                v-model="formularioPerfil.telefono"
                type="tel"
                inputmode="numeric"
                maxlength="14"
                placeholder="Ej. 9831234567"
              />

              <small>
                Ingresa 10 dígitos. Este número será privado
                y más adelante se utilizará para verificar
                solicitudes de seguimiento por SMS.
              </small>
            </template>

            <button
              class="boton-secundario"
              type="submit"
            >
              Guardar cambios
            </button>

            <button
              class="boton-cancelar-perfil"
              type="button"
              @click="cancelarEdicionPerfil"
            >
              Cancelar
            </button>
          </form>
        </article>

        <article class="tarjeta-resumen">
          <h2>Resumen de bienestar</h2>

          <div class="rejilla-resumen">
            <div>
              <strong>
                {{ imcRegistrados }}
              </strong>

              <span>
                IMC registrados
              </span>
            </div>

            <div>
              <strong>
                {{ encuestasRealizadas }}
              </strong>

              <span>
                Encuestas realizadas
              </span>
            </div>

            <div>
              <strong>
                {{ registrosGuardados }}
              </strong>

              <span>
                Registros guardados
              </span>
            </div>
          </div>

          <p>
            Cuando guardes resultados de IMC, calorías o cuestionarios,
            aquí se mostrará un resumen de tu progreso.
          </p>
        </article>
      </section>

      <section class="seccion-herramientas">
        <h2>
          Herramientas rápidas
        </h2>

        <div class="rejilla-herramientas">
          <button
            @click="irARuta('/calculadora-imc')"
          >
            <span>IMC</span>
            Calculadora de IMC
          </button>

          <button
            @click="irARuta('/calculadora-calorias')"
          >
            <span>CAL</span>
            Calculadora de Calorías
          </button>

          <button
            @click="irARuta('/evaluacion-dass21')"
          >
            <span>D21</span>
            Evaluación DASS-21
          </button>

          <button
            @click="irARuta('/escala-insomnio-atenas')"
          >
            <span>AIS</span>
            Insomnio de Atenas
          </button>
        </div>
      </section>

      <section class="seccion-historial">
        <h2>
          Historial reciente
        </h2>

        <div
          v-if="historialReciente.length"
          class="lista-historial"
        >
          <ItemHistorial
            v-for="item in historialReciente"
            :key="item.id"
            :resultado="item"
          />
        </div>

        <div
          v-else
          class="tarjeta-vacia"
        >
          <strong>
            Aún no hay resultados guardados
          </strong>

          <p>
            Más adelante podrás ver aquí tus evaluaciones,
            cálculos y avances registrados dentro de
            Vibra la Vida.
          </p>
        </div>
      </section>
    </section>
  </main>
</template>

<style scoped src="../assets/styles/MiCuenta.css"></style>
