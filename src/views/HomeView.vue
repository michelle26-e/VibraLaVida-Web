<script setup>
// Importamos componentes reutilizables
import TarjetaAccion from '../components/TarjetaAccion.vue'

// Importamos lo que necesitamos de Vue
import { computed, nextTick, onMounted, onUnmounted, ref } from 'vue'

// Importamos el router para cambiar de página
import { useRouter } from 'vue-router'

// Importamos Firebase Auth
import { onAuthStateChanged } from 'firebase/auth'

// Firestore se usa para comprobar si el paciente
// tiene profesionales vinculados.
import {
  collection,
  getDocs,
  query,
  where,
} from 'firebase/firestore'

import {
  auth,
  db,
} from '../firebase/firebaseConfig'

// Importamos servicios de autenticación
import { cerrarSesionUsuario, obtenerDatosUsuario } from '../services/authService'

// Imágenes del proyecto
import logoPrincipal from '../assets/logo-vibra.png'
import logoVibra from '../assets/logotexto.png'
import ado1 from '../assets/ado1.png'
import ado2 from '../assets/ado2.png'
import ado3 from '../assets/ado3.png'
import hdvs1 from '../assets/hdvs1.png'
import hdvs2 from '../assets/hdvs2.png'
import hdvs3 from '../assets/hdvs3.png'
import hdvs4 from '../assets/hdvs4.png'
import hdvs5 from '../assets/hdvs5.png'
import hdvs6 from '../assets/hdvs6.png'
import rc from '../assets/rc1.png'
import rca from '../assets/rc2.png'
import ti from '../assets/t1.png'
import tip from '../assets/t2.png'
import dia from '../assets/d1.png'
import diab from '../assets/d2.png'
import trc from '../assets/tr.png'

// Iconos originales de Vibra la Vida
import iconCasa from '../assets/iconcasa.png'
import iconJovenes from '../assets/iconjovenes.png'
import iconSalud from '../assets/iconsalud.png'
import iconRiesgo from '../assets/iconriesgo.png'
import iconDiabetes from '../assets/icondiabetess.png'
import iconCardiaco from '../assets/iconcardiaco.png'
import iconSobrepeso from '../assets/iconsobre.png'
import iconEncuesta from '../assets/iconencuesta.png'
import iconApp from '../assets/iconapp.png'
import appPreview from '../assets/pantalla.jpeg'

// Usamos el router para navegar entre páginas
const router = useRouter()

// Guardamos quién es el usuario actual que ha iniciado sesión
const usuarioActual = ref(null)

// Guardamos los datos del usuario obtenidos desde Firebase
const datosUsuario = ref(null)

// Guardamos cuál sección del menú está activa
const seccionActiva = ref('inicio')

// Referencia a la barra lateral.
// La usamos para mantener visible la opción activa mientras
// el usuario baja o sube por la página.
const barraLateralRef = ref(null)

// Evita ejecutar demasiados cálculos durante el scroll.
let scrollPendiente = false


// ==========================================================
// RECORDAR POSICIÓN DEL HOME AL ABRIR UNA HERRAMIENTA
// ==========================================================
//
// Cuando el usuario entra a una calculadora o encuesta,
// guardamos dónde estaba en el Home.
//
// Así, cuando la herramienta regresa a "/", el Home vuelve
// exactamente a esa zona en lugar de comenzar desde arriba.
// ==========================================================

const CLAVE_SCROLL_HOME =
  'vibra-home-scroll-y'

const CLAVE_SECCION_HOME =
  'vibra-home-seccion'


const guardarPosicionHome = () => {
  sessionStorage.setItem(
    CLAVE_SCROLL_HOME,
    String(window.scrollY)
  )

  sessionStorage.setItem(
    CLAVE_SECCION_HOME,
    seccionActiva.value
  )
}


const restaurarPosicionHome = () => {
  const scrollGuardado =
    sessionStorage.getItem(
      CLAVE_SCROLL_HOME
    )

  const seccionGuardada =
    sessionStorage.getItem(
      CLAVE_SECCION_HOME
    )

  if (seccionGuardada) {
    seccionActiva.value =
      seccionGuardada
  }

  if (scrollGuardado !== null) {
    const posicion =
      Number(scrollGuardado)

    if (
      Number.isFinite(posicion)
    ) {
      // IMPORTANTE:
      // Desactivamos temporalmente cualquier scroll suave
      // global para que el Home NO recorra visualmente todas
      // las secciones desde arriba.
      //
      // El regreso será instantáneo al punto guardado.
      const html =
        document.documentElement

      const body =
        document.body

      const scrollHtmlAnterior =
        html.style.scrollBehavior

      const scrollBodyAnterior =
        body.style.scrollBehavior

      html.style.scrollBehavior =
        'auto'

      body.style.scrollBehavior =
        'auto'

      requestAnimationFrame(() => {
        window.scrollTo(
          0,
          posicion
        )

        actualizarSeccionActivaPorScroll()

        // Restauramos el comportamiento original después
        // de colocar la página en la posición correcta.
        requestAnimationFrame(() => {
          html.style.scrollBehavior =
            scrollHtmlAnterior

          body.style.scrollBehavior =
            scrollBodyAnterior
        })
      })
    }
  }

  // Se utiliza una sola vez. Cuando el usuario vuelva a
  // abrir otra herramienta se guardará una posición nueva.
  sessionStorage.removeItem(
    CLAVE_SCROLL_HOME
  )

  sessionStorage.removeItem(
    CLAVE_SECCION_HOME
  )
}

// Guarda la imagen activa de cada carrusel.
// Cada sección mantiene su propio índice.
const indiceCarrusel = ref({})

// Intervalo para cambio automático de imágenes
let intervaloCarrusel = null

// Mostramos "Mi equipo de salud" cuando el paciente
// tiene al menos un seguimiento activo O una solicitud pendiente.
// Esto permite que pueda entrar a revisar una solicitud nueva.
const tieneEquipoSalud = ref(false)

// Variable para detener el observador de Firebase cuando se cierre la vista
let detenerObservador = null

// Información visual del temario
const informacionTemario = {
  adolescencia: [
    {
      imagen: ado1
    },
    {
      imagen: ado2
    },
    {
      imagen: ado3
    },
  ],

  habitos: [
   {
      imagen: hdvs1
    },
    {
      imagen: hdvs2
    },
    {
      imagen: hdvs3
    },
    {
      imagen: hdvs4
    },
    {
      imagen: hdvs5
    },
    {
      imagen: hdvs6
    },
  ],

  riesgoCardiometabolico: [
    {
      imagen: rc,
    },
    {
      imagen: rca,
    },
  ],

  diabetes: [
    {
      imagen: dia,
    },
    {
      imagen: diab,
    },
    {
      imagen: tip,
    },
    {
      imagen: ti,
    },
  ],

  ritmoCardiaco: [
    {
      imagen: trc,
    },
  ],

  sobrepeso: [],
}

// Obtenemos el primer nombre del usuario para mostrar un saludo personal
const nombreUsuario = computed(() => {
  // En Firestore guardamos el nombre completo,
  // pero en la interfaz solo mostramos el primer nombre.
  // También dejamos compatibilidad temporal con usuarios antiguos
  // que todavía tengan el campo "nombre".
  const nombreCompleto =
    datosUsuario.value?.nombreCompleto ||
    datosUsuario.value?.nombre ||
    'Usuario'

  const primerNombre = nombreCompleto.trim().split(/\s+/)[0]

  return primerNombre.charAt(0).toUpperCase() + primerNombre.slice(1)
})

// Función para ir a la página de Mi Cuenta
const irAMiCuenta = () => {
  router.push('/mi-cuenta')
}

// Comprueba si el paciente tiene al menos:
// 1. un seguimiento activo, o
// 2. una solicitud de seguimiento pendiente.
//
// Tener una solicitud pendiente NO significa que el profesional
// ya tenga acceso a los datos del paciente. Solo permite mostrar
// el acceso a "Mi equipo de salud" para que el paciente pueda
// revisar la solicitud.
const comprobarEquipoSalud = async (uidPaciente) => {
  try {
    const consulta = query(
      collection(
        db,
        'seguimiento_profesional'
      ),
      where(
        'pacienteUid',
        '==',
        uidPaciente
      )
    )

    const respuesta =
      await getDocs(consulta)

    tieneEquipoSalud.value =
      respuesta.docs.some(
        (documento) => {
          const estado =
            documento.data().estado

          return (
            estado === 'activo' ||
            estado === 'pendiente'
          )
        }
      )
  } catch (error) {
    console.error(
      'Error al comprobar el equipo de salud:',
      error
    )

    // Si ocurre un error, no mostramos el acceso
    // para evitar presentar información incompleta.
    tieneEquipoSalud.value = false
  }
}


// Se ejecuta cuando se carga la página para verificar si hay usuario iniciado
onMounted(() => {
  // Inicia el cambio automático de imágenes del carrusel
  iniciarCarruselAutomatico()

  // Sincroniza el tema visible con la opción activa del menú.
  window.addEventListener(
    'scroll',
    manejarScrollPagina,
    {
      passive: true,
    }
  )

  // Si cambia el tamaño de la ventana volvemos a calcular
  // qué tema se encuentra en la zona de lectura.
  window.addEventListener(
    'resize',
    manejarScrollPagina
  )

  // Si venimos de una calculadora o encuesta,
  // regresamos a la posición que tenía el usuario.
  //
  // Si entramos al Home normalmente, simplemente calculamos
  // qué sección está visible.
  if (
    sessionStorage.getItem(
      CLAVE_SCROLL_HOME
    ) !== null
  ) {
    restaurarPosicionHome()
  } else {
    requestAnimationFrame(() => {
      actualizarSeccionActivaPorScroll()
    })
  }

  detenerObservador = onAuthStateChanged(auth, async (usuario) => {
    usuarioActual.value = usuario

    if (usuario) {
      datosUsuario.value =
        await obtenerDatosUsuario(
          usuario.uid
        )

      // Solo tiene sentido consultar vínculos
      // para cuentas de pacientes.
      if (
        datosUsuario.value?.rol === 'usuario'
      ) {
        await comprobarEquipoSalud(
          usuario.uid
        )
      } else {
        tieneEquipoSalud.value = false
      }
    } else {
      datosUsuario.value = null
      tieneEquipoSalud.value = false
    }
  })
})

// Se ejecuta cuando se abandona la página para detener la verificación del usuario
onUnmounted(() => {
  detenerCarruselAutomatico()

  window.removeEventListener(
    'scroll',
    manejarScrollPagina
  )

  window.removeEventListener(
    'resize',
    manejarScrollPagina
  )

  if (detenerObservador) {
    detenerObservador()
  }
})

// Función que cierra la sesión del usuario
const cerrarSesion = async () => {
  await cerrarSesionUsuario()

  usuarioActual.value = null
  datosUsuario.value = null
  tieneEquipoSalud.value = false

  router.push('/')
}

// Elementos que aparecen en el menú lateral
const elementosMenu = [
  {
    titulo: 'Inicio',
    icono: iconCasa,
    idSeccion: 'inicio',
  },
  {
    titulo: 'Adolescencia y Adultez Temprana',
    icono: iconJovenes,
    idSeccion: 'adolescencia',
  },
  {
    titulo: 'Hábitos de Vida Saludable',
    icono: iconSalud,
    idSeccion: 'habitos',
  },
  {
    titulo: 'Riesgo Cardiometabólico',
    icono: iconRiesgo,
    idSeccion: 'riesgo-cardiometabolico',
  },
  {
    titulo: 'Diabetes Mellitus',
    icono: iconDiabetes,
    idSeccion: 'diabetes',
  },
  {
    titulo: 'Trastornos del Ritmo Cardíaco',
    icono: iconCardiaco,
    idSeccion: 'ritmo-cardiaco',
  },
  {
    titulo: 'Sobrepeso y Obesidad',
    icono: iconSobrepeso,
    idSeccion: 'sobrepeso',
  },
  {
    titulo: 'Salud Mental y Autocuidado',
    icono: iconEncuesta,
    idSeccion: 'salud-mental',
  },
  {
    titulo: 'Nuestra App',
    icono: logoPrincipal,
    idSeccion: 'nuestra-app',
  },
]

// El acceso a "Mi equipo de salud" se agrega de manera
// dinámica cuando existe un vínculo activo o una solicitud pendiente.
const elementosMenuVisibles = computed(() => {
  const menu = [...elementosMenu]

  if (
    usuarioActual.value &&
    datosUsuario.value?.rol === 'usuario' &&
    tieneEquipoSalud.value
  ) {
    const indiceNuestraApp =
      menu.findIndex(
        (elemento) =>
          elemento.idSeccion ===
          'nuestra-app'
      )

    const opcionEquipo = {
      titulo: 'Mi equipo de salud',
      icono: iconApp,
      ruta: '/mi-equipo-salud',
    }

    if (indiceNuestraApp >= 0) {
      menu.splice(
        indiceNuestraApp,
        0,
        opcionEquipo
      )
    } else {
      menu.push(opcionEquipo)
    }
  }

  return menu
})

// ==========================================================
// SINCRONIZAR SCROLL CON EL MENÚ LATERAL
// ==========================================================
//
// La opción activa ya no cambia solamente cuando hacemos clic.
//
// Ahora también detectamos qué sección está leyendo el usuario
// mientras baja o sube manualmente por la página.
//
// El punto de lectura se coloca aproximadamente al 30 % de la
// pantalla. La última sección cuyo inicio haya cruzado ese punto
// se considera la sección activa.
// ==========================================================

// Mantiene visible dentro de la barra lateral el botón activo.
// Esto es útil porque el menú también tiene su propio scroll.
const mantenerOpcionActivaVisible = async (
  idSeccion
) => {
  await nextTick()

  const barra =
    barraLateralRef.value

  if (!barra) {
    return
  }

  const boton =
    barra.querySelector(
      `[data-seccion="${idSeccion}"]`
    )

  if (!boton) {
    return
  }

  const margen = 28

  const arribaBoton =
    boton.offsetTop

  const abajoBoton =
    arribaBoton +
    boton.offsetHeight

  const arribaVisible =
    barra.scrollTop

  const abajoVisible =
    arribaVisible +
    barra.clientHeight

  if (
    arribaBoton <
    arribaVisible + margen
  ) {
    barra.scrollTo({
      top:
        Math.max(
          0,
          arribaBoton - margen
        ),
      behavior: 'smooth',
    })

    return
  }

  if (
    abajoBoton >
    abajoVisible - margen
  ) {
    barra.scrollTo({
      top:
        abajoBoton -
        barra.clientHeight +
        margen,
      behavior: 'smooth',
    })
  }
}


// Calcula qué tema corresponde a la posición actual del scroll.
const actualizarSeccionActivaPorScroll = () => {
  const puntoLectura =
    window.scrollY +
    window.innerHeight * 0.30

  const idsSecciones =
    elementosMenu
      .filter(
        (elemento) =>
          elemento.idSeccion
      )
      .map(
        (elemento) =>
          elemento.idSeccion
      )

  let nuevaSeccion =
    'inicio'

  idsSecciones.forEach(
    (idSeccion) => {
      const elemento =
        document.getElementById(
          idSeccion
        )

      if (!elemento) {
        return
      }

      const posicionSuperior =
        elemento.getBoundingClientRect().top +
        window.scrollY

      if (
        posicionSuperior <=
        puntoLectura
      ) {
        nuevaSeccion =
          idSeccion
      }
    }
  )

  // Solo actualizamos Vue cuando realmente cambió el tema.
  if (
    nuevaSeccion !==
    seccionActiva.value
  ) {
    seccionActiva.value =
      nuevaSeccion

    mantenerOpcionActivaVisible(
      nuevaSeccion
    )
  }
}


// Limitamos la actualización a una vez por frame para
// mantener el desplazamiento suave.
const manejarScrollPagina = () => {
  if (scrollPendiente) {
    return
  }

  scrollPendiente = true

  requestAnimationFrame(() => {
    actualizarSeccionActivaPorScroll()

    scrollPendiente = false
  })
}


// Secciones informativas del temario
const seccionesTemario = [
  {
    id: 'adolescencia',
    icono: iconJovenes,
    titulo: 'Adolescencia y Adultez Temprana',
    color: 'azul',
    parrafos: [
      'En el contexto de las enfermedades crónicas no transmisibles, la adolescencia es una etapa muy importante para promover la salud. De acuerdo con la Organización Mundial de la Salud, esta etapa abarca de los 10 a los 19 años y se caracteriza por diversos cambios físicos, psicológicos y sociales. Estos cambios impactan en la forma en que las personas desarrollan hábitos que pueden afectar su salud en el presente y en el futuro.',
      'Durante la adolescencia se forman muchos de los hábitos relacionados con la alimentación, la actividad física, el sueño, el manejo del estrés y la convivencia con otras personas. Al mismo tiempo, es una etapa en la que los jóvenes comienzan a tomar más decisiones por sí mismos, pero también pueden estar más expuestos a riesgos como el sedentarismo, el consumo de alimentos poco saludables y los problemas de sueño. Por esta razón, muchos programas de salud pública se enfocan en este grupo de edad, ya que intervenir a tiempo puede ayudar a prevenir problemas de salud en etapas siguientes (World Health Organization, 2021).',
      'Por otro lado, la adultez es la etapa que sigue después de la adolescencia. En ella, la persona ya ha alcanzado un mayor nivel de crecimiento físico y madurez, aunque también empiezan a presentarse cambios relacionados con la edad y con el estilo de vida. Dentro de esta etapa se encuentra la adultez joven, que inicia de los 20 años y que también es importante, ya que en ella continúan formándose conductas de autocuidado y hábitos que afectan en la salud.',
      'Por lo anterior, en el presente proyecto se pondrá atención en personas de 15 a 20 años, ya que este rango de edad es una etapa de cambios entre la adolescencia y el inicio de la adultez joven. Se considera un periodo adecuado para promover hábitos saludables, identificar a tiempo alteraciones relacionadas con el sueño, el estrés y el ritmo cardiaco, y promover acciones de cuidado personal que ayuden a mejorar la calidad de vida (American Psychological Association, 2023).',
    ],
    imagenes: informacionTemario.adolescencia,
    tarjetas: [],
  },
  {
    id: 'habitos',
    icono: iconSalud,
    titulo: 'Hábitos de Vida Saludable',
    color: 'verde',
    parrafos: [
      'Los hábitos de vida saludable son comportamientos y rutinas que una persona mantiene de forma regular y que tienen un impacto positivo en la salud física, mental y social. No se trata de acciones aisladas, sino de patrones que se forman con el tiempo y que, cuando se adquieren en la adolescencia, tienden a mantenerse en la vida adulta.',
      'Entre los principales hábitos se encuentran: una alimentación balanceada, rica en frutas, verduras y proteínas magras, y baja en azúcares añadidos y grasas saturadas; la práctica regular de actividad física (American Heart Association, 2024; Instituto Mexicano del Seguro Social, 2024); dormir entre 8 y 10 horas diarias en el caso de los adolescentes (Instituto Nacional de Salud Pública, 2026); manejar adecuadamente el estrés mediante ejercicio, descanso o apoyo social; evitar el consumo de tabaco, alcohol y otras sustancias; y acudir a revisiones médicas periódicas.',
      'La OMS y diversas organizaciones de salud coinciden en que promover estos hábitos desde edades tempranas es una estrategia clave para reducir la carga global de enfermedades crónicas (World Health Organization, 2023). En particular, la combinación de actividad física, alimentación saludable y sueño adecuado ayuda a reducir el riesgo de alteraciones en el peso corporal, la presión arterial y los niveles de glucosa en sangre (Instituto Nacional de Salud Pública, 2026; American Heart Association, 2024). Cuando estos hábitos se deterioran, el riesgo de desarrollar obesidad, diabetes tipo 2 e hipertensión aumenta de manera significativa,especialmente en jóvenes (World Health Organization, 2025b; World Health Organization, 2023).',
    ],
    imagenes: informacionTemario.habitos,
    tarjetas: [],
  },
  {
    id: 'riesgo-cardiometabolico',
    icono: iconRiesgo,
    titulo: 'Riesgo Cardiometabólico',
    color: 'azul',
    parrafos: [
      'Un factor de riesgo es cualquier característica, condición o comportamiento que incrementa la probabilidad de desarrollar una enfermedad. En el ámbito cardiometabólico, los factores más relevantes en adolescentes incluyen el exceso de peso corporal, las dislipidemias, la hipertensión arterial, la resistencia a la insulina y las alteraciones en los niveles de glucosa en sangre (International Diabetes Federation, 2007).',
      'Cuando varios de estos factores se presentan de manera constante, se establece el síndrome metabólico, el cual se asocia con una mayor probabilidad de desarrollar diabetes tipo 2 y enfermedades cardiovasculares en la adultez (International Diabetes Federation, 2007). En adolescentes, la presencia temprana de estos factores es una señal de alerta, ya que las trayectorias de salud que se establecen en esta etapa pueden determinar riesgos a largo plazo (International Diabetes Federation, 2007). Por ello, se resalta la importancia de monitorear indicadores clave y fomentar programas e información preventivos desde el entorno escolar y familiar (World Health Organization, 2021).',
      'Además de los factores biológicos, existen riesgos como el sedentarismo, la alimentación alta en azúcares y grasas, la falta de sueño y el estrés crónico, que pueden agravar estas condiciones (Instituto Nacional de Salud Pública, 2026; International Diabetes Federation, 2007).',
    ],
    imagenes: informacionTemario.riesgoCardiometabolico,
    tarjetas: [
      {
        icono: iconRiesgo,
        titulo: 'Riesgo Cardiovascular',
        texto: 'Conoce tu nivel de riesgo cardiometabólico',
        boton: 'Comenzar simulación',
        color: 'azul',
        ruta: '/riesgo-cardiovascular',
      },
    ],
  },
  {
    id: 'diabetes',
    icono: iconDiabetes,
    titulo: 'Diabetes Mellitus',
    color: 'azul',
    parrafos: [
      'La diabetes mellitus es una enfermedad crónica caracterizada por alteraciones en la regulación de la glucosa en sangre. Esto ocurre cuando el organismo produce poca insulina, cuando esta no actúa adecuadamente o por una combinación de ambas situaciones. Como consecuencia, se presenta hiperglucemia que, con el tiempo, puede dañar distintos órganos, especialmente nervios y vasos sanguíneos (World Health Organization, 2024).',
      'Para comprender mejor esta enfermedad, se puede imaginar que la insulina funciona como una llave que abre las células del cuerpo para que la glucosa, proveniente de los alimentos, pueda entrar y ser utilizada como energía. En la diabetes, esa llave no existe, no funciona correctamente o las cerraduras están dañadas, lo que provoca que el azúcar se acumule en la sangre sin poder aprovecharse (World Health Organization, 2024). En la práctica clínica se reconocen principalmente tres tipos:',
      'Diabetes tipo 1, diabetes tipo 2 y diabetes gestacional (World Health Organization, 2024). También existe un estado intermedio llamado prediabetes, que aumenta el riesgo de desarrollar diabetes tipo 2 si no se actúa a tiempo (American Diabetes Association, 2024). El diagnóstico se basa en criterios estandarizados que incluyen la medición de glucosa en ayunas, la prueba de tolerancia oral a la glucosa, la hemoglobina glucosilada (HbA1c) o glucosa plasmática al azar acompañada de síntomas característicos (American Diabetes Association Professional Practice Committee, 2025; American Diabetes Association, 2024). En México, la PRONAM ha establecido criterios para el manejo de la diabetes tipo 2 y el síndrome metabólico en el primer nivel de atención (Consejo de Salubridad General, 2025a; Consejo de Salubridad General, 2025b).',
    ],
    imagenes: informacionTemario.diabetes,
    tarjetas: [],
  },
  {
    id: 'ritmo-cardiaco',
    icono: iconCardiaco,
    titulo: 'Trastornos del Ritmo Cardíaco',
    color: 'verde',
    parrafos: [
      'Los trastornos del ritmo cardíaco, también conocidos como arritmias cardíacas, son alteraciones en la forma en que late el corazón. Estas pueden hacer que el corazón lata demasiado rápido, demasiado lento o de manera irregular. Este problema se relaciona principalmente con fallas en el sistema eléctrico del corazón, el cual se encarga de coordinar los impulsos que permiten que las cavidades cardíacas se contraigan y relajen de forma ordenada para bombear sangre al resto del cuerpo (Brigham and Women’s Hospital, s. f.; NHLBI, 2022). ',
      'En condiciones normales, el corazón mantiene un ritmo regular que permite una circulación adecuada de la sangre. En cambio, cuando los impulsos eléctricos se generan de manera anormal, se bloquean o viajan por rutas incorrectas, el ritmo cardíaco puede alterarse. Algunas arritmias pueden presentarse en personas aparentemente sanas y no causar consecuencias importantes, pero otras pueden indicar la presencia de una enfermedad cardiovascular más seria o convertirse en un riesgo para la salud si no se detectan y tratan oportunamente (Brigham and Women’s Hospital, s. f.; Mayo Clinic, 2026). ',
      'Las arritmias pueden clasificarse, de manera general, según la velocidad del ritmo cardíaco. Cuando el corazón late más rápido de lo normal se habla de taquicardia; cuando late más lento de lo esperado se denomina bradicardia; y cuando los latidos no siguen un patrón regular se considera un ritmo irregular. Entre los trastornos más conocidos se encuentra la fibrilación auricular, una arritmia frecuente que puede impulsar la formación de coágulos dentro del corazón y aumentar el riesgo de accidente cerebrovascular, insuficiencia cardíaca y otras complicaciones cardiovasculares (Mayo Clinic, 2026; American Heart Association, 2025). ',
      'Los síntomas pueden variar de una persona a otra. Algunas arritmias no producen molestias evidentes, mientras que otras pueden manifestarse con palpitaciones, sensación de aleteo en el pecho, mareo, cansancio, dificultad para respirar, dolor o molestia torácica y desmayos. Debido a que estos signos también pueden relacionarse con otros problemas de salud, es importante que cualquier alteración persistente o preocupante del ritmo cardíaco sea valorada por personal de salud (American Heart Association, 2024; Cleveland Clinic, 2026). ',
      'En algunos casos, los trastornos del ritmo cardíaco pueden generar complicaciones graves. Si no se atienden adecuadamente, ciertas arritmias pueden afectar el funcionamiento del corazón, el cerebro u otros órganos, y aumentar el riesgo de accidente cerebrovascular, insuficiencia cardíaca o paro cardíaco. El paro cardíaco súbito ocurre cuando el corazón deja de latir de manera inesperada, generalmente por una alteración eléctrica grave, y requiere atención inmediata para evitar consecuencias fatales (NHLBI, 2022; American Heart Association, 2025). ',
      'Por esta razón, el monitoreo del ritmo cardíaco es un método relevante dentro de la prevención y el cuidado de la salud cardiovascular. La identificación temprana de cambios anormales en la frecuencia o regularidad del pulso puede ayudar a reconocer posibles señales de alerta y apoyar la atención oportuna. ',
    ],
    imagenes: informacionTemario.ritmoCardiaco,
    tarjetas: [],
  },
  {
    id: 'sobrepeso',
    icono: iconSobrepeso,
    titulo: 'Sobrepeso y Obesidad',
    color: 'cian',
    parrafos: [
      'El exceso de peso suele evaluarse mediante el Índice de Masa Corporal (IMC), una medida que relaciona el peso de una persona con su estatura al cuadrado y que permite clasificar el estado nutricional de forma práctica y rápida. La Organización Mundial de la Salud (OMS) reconoce la obesidad como una enfermedad crónica, compleja y multifactorial, cuyo desarrollo está influido por factores biológicos, conductuales y ambientales. Su atención requiere un enfoque integral que contemple de manera simultánea la alimentación, la actividad física, la salud mental, el sueño y las condiciones sociales del individuo (World Health Organization,2025b).',
      'En México, los datos de la Encuesta Nacional de Salud y Nutrición (ENSANUT) muestran una alta prevalencia de sobrepeso y obesidad tanto en la población escolar como en la adolescente, lo que refuerza la necesidad urgente de implementar acciones preventivas desde edades tempranas (Instituto Nacional de Salud Pública, 2024). El exceso de peso en esta etapa de la vida no solo afecta el bienestar físico y emocional de los adolescentes, sino que también incrementa de manera significativa el riesgo de desarrollar enfermedades como diabetes tipo 2, hipertensión arterial y otras complicaciones cardiometabólicas en la edad adulta (Instituto Nacional de Salud Pública, 2024; Secretaría de Salud, 2025).',
    ],
    imagenes: informacionTemario.sobrepeso,
    tarjetas: [
      {
        icono: 'IMC',
        titulo: 'Calculadora de IMC',
        texto: 'Conoce tu Índice de Masa Corporal de forma rápida. Esta herramienta educativa te ayuda a identificar si tu peso se encuentra en un rango bajo, normal, sobrepeso u obesidad.',
        boton: 'Calcular ahora',
        color: 'cian',
        ruta: '/calculadora-imc',
      },
      {
        icono: 'CAL',
        titulo: 'Calculadora de Calorías',
        texto: 'Conoce una estimación de tu gasto calórico diario y aprende cómo la actividad física influye en tus necesidades de energía.',
        boton: 'Calcular ahora',
        color: 'verde',
        ruta: '/calculadora-calorias',
      },
    ],
  },
  {
    id: 'salud-mental',
    icono: iconEncuesta,
    titulo: 'Salud Mental y Autocuidado',
    color: 'cian',
    parrafos: [
      'La salud mental es importante, especialmente durante la adolescencia. La OMS señala que un porcentaje considerable de jóvenes experimenta síntomas como ansiedad, depresión y estrés, los cuales pueden afectar su vida cotidiana, su rendimiento escolar y su capacidad para mantener hábitos de vida saludables (World Health Organization, 2025c).',
      'Existe además una relación entre la salud mental y las condiciones cardiometabólicas, el estrés crónico puede incrementar la probabilidad de aumento de peso y las alteraciones en la presión arterial, mientras que padecer una enfermedad crónica puede generar síntomas de ansiedad y depresión (World Health Organization, 2025c).',
      'Para evaluar estos síntomas en contextos de investigación y salud, se utiliza el instrumento DASS-21 (Depression, Anxiety and Stress Scale), compuesto por 21 preguntas distribuidas en tres escalas: depresión, ansiedad y estrés. En México, diversos estudios han confirmado su validez y confiabilidad en población joven, lo que respalda su uso en ámbitos educativos y de salud. Es importante mencionar que el DASS-21 es una herramienta de evaluación de síntomas y no de diagnóstico clínico; sus resultados deben interpretarse siempre dentro de un contexto más amplio de valoración profesional (Salinas-Muñoz et al., 2024).',
      'La Escala de Insomnio de Atenas (EIA) se considera un instrumento útil para identificar casos de insomnio, debido a que ha mostrado propiedades psicométricas adecuadas, entre ellas alta sensibilidad, especificidad y una consistencia interna elevada, con valores de alfa de Cronbach superiores a 0.80 (Campo-Arias et al., 2024). Asimismo, el formulario utilizado para la aplicación de la EIA, integrado por ocho reactivos para evaluar dificultades del sueño y su efecto durante el día, se presenta en el apartado de anexos para su consulta.',
    ],
    imagenes: [],
    tarjetas: [
      {
        icono: 'D21',
        titulo: 'Evaluación con DASS-21',
        texto: 'Responde un breve cuestionario para identificar señales relacionadas con depresión, ansiedad y estrés durante los últimos días. Esta evaluación es educativa y no sustituye un diagnóstico profesional.',
        boton: 'Comenzar encuesta',
        color: 'cian',
        ruta: '/evaluacion-dass21',
      },
      {
        icono: 'AIS',
        titulo: 'Escala de Insomnio de Atenas',
        texto: 'Evalúa la calidad de tu sueño mediante un cuestionario breve. Esta herramienta puede ayudarte a identificar posibles dificultades para dormir o descansar adecuadamente.',
        boton: 'Comenzar encuesta',
        color: 'azul',
        ruta: '/escala-insomnio-atenas',
      },
    ],
  },
]

// Función para obtener los párrafos de cada sección
const obtenerParrafos = (seccion) => {
  if (Array.isArray(seccion.parrafos)) {
    return seccion.parrafos
  }

  if (Array.isArray(seccion.texto)) {
    return seccion.texto
      .map((item) => (typeof item === 'string' ? item : item?.texto))
      .filter(Boolean)
  }

  if (typeof seccion.texto === 'string' && seccion.texto.trim()) {
    return [seccion.texto]
  }

  return []
}

// Función para obtener la imagen
const obtenerImagen = (item) => {
  return item?.imagen || item?.ruta || ''
}

// Función para bajar al temario
const irAlTemario = () => {
  const seccion = document.getElementById('temario')
  seccion?.scrollIntoView({ behavior: 'smooth' })
}

// Función para ir a una sección específica del temario
const irASeccion = (idSeccion) => {
  seccionActiva.value = idSeccion

  mantenerOpcionActivaVisible(
    idSeccion
  )

  const seccion =
    document.getElementById(
      idSeccion
    )

  if (seccion) {
    seccion.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    })
  }
}

// ==========================================================
// CARRUSEL DE IMÁGENES
// ==========================================================

// Obtiene el índice actual de una sección.
// Si todavía no existe, comienza en 0.
const obtenerIndiceCarrusel = (seccionId) => {
  return indiceCarrusel.value[seccionId] || 0
}

// Devuelve la imagen actualmente visible.
const obtenerImagenCarrusel = (seccion) => {
  if (
    !seccion.imagenes ||
    seccion.imagenes.length === 0
  ) {
    return null
  }

  const indice =
    obtenerIndiceCarrusel(seccion.id)

  return seccion.imagenes[indice]
}

// Avanza una imagen.
// Al llegar a la última, vuelve a la primera.
const siguienteImagen = (seccion) => {
  if (
    !seccion.imagenes ||
    seccion.imagenes.length <= 1
  ) {
    return
  }

  const actual =
    obtenerIndiceCarrusel(seccion.id)

  indiceCarrusel.value = {
    ...indiceCarrusel.value,
    [seccion.id]:
      (actual + 1) %
      seccion.imagenes.length,
  }
}

// Retrocede una imagen.
// Si está en la primera, pasa a la última.
const imagenAnterior = (seccion) => {
  if (
    !seccion.imagenes ||
    seccion.imagenes.length <= 1
  ) {
    return
  }

  const actual =
    obtenerIndiceCarrusel(seccion.id)

  const total =
    seccion.imagenes.length

  indiceCarrusel.value = {
    ...indiceCarrusel.value,
    [seccion.id]:
      (actual - 1 + total) %
      total,
  }
}

// Permite ir directamente a una imagen
// desde los indicadores inferiores.
const irAImagenCarrusel = (
  seccionId,
  indice
) => {
  indiceCarrusel.value = {
    ...indiceCarrusel.value,
    [seccionId]: indice,
  }
}


// Inicia el cambio automático del carrusel.
// Cada 4 segundos avanza todas las secciones
// que tengan más de una imagen.
const iniciarCarruselAutomatico = () => {
  detenerCarruselAutomatico()

  intervaloCarrusel = setInterval(() => {
    seccionesTemario.forEach((seccion) => {
      if (
        seccion.imagenes &&
        seccion.imagenes.length > 1
      ) {
        siguienteImagen(seccion)
      }
    })
  }, 4000)
}

// Detiene el intervalo para evitar procesos duplicados.
const detenerCarruselAutomatico = () => {
  if (intervaloCarrusel) {
    clearInterval(intervaloCarrusel)
    intervaloCarrusel = null
  }
}


// Algunas opciones del menú navegan a otra vista,
// mientras que las demás siguen desplazándose
// dentro del Home.
const seleccionarElementoMenu = (
  elemento
) => {
  if (elemento.ruta) {
    guardarPosicionHome()

    router.push(
      elemento.ruta
    )

    return
  }

  irASeccion(
    elemento.idSeccion
  )
}

// Función para abrir una tarjeta del temario
const abrirTarjeta = (tarjeta) => {
  if (tarjeta.ruta) {
    guardarPosicionHome()

    router.push(
      tarjeta.ruta
    )
  }
}

</script>

<template>
  <div class="pagina-inicio">
    <aside ref="barraLateralRef" class="barra-lateral">
      <div class="contenedor-logo">
        <img :src="logoVibra" alt="Logo Vibra la Vida" />
      </div>

      <div class="botones-acceso">
        <div v-if="usuarioActual" class="caja-cuenta">
          <h3 class="saludo-cuenta">
            Hola {{ nombreUsuario }}
          </h3>

          <button class="boton-mi-cuenta" @click="irAMiCuenta">
            Mi cuenta
          </button>

          <button class="boton-cerrar" @click="cerrarSesion">
            Cerrar sesión
          </button>
        </div>

        <div v-else class="acciones-sesion">
          <button class="boton boton-login" @click="router.push('/iniciar-sesion')">
            Iniciar Sesión
          </button>

          <button class="boton boton-registro" @click="router.push('/registro')">
            Crear Cuenta
          </button>
        </div>
      </div>

      <p class="titulo-menu">Temario informativo</p>

      <nav class="menu-lateral">
        <button
          v-for="elemento in elementosMenuVisibles"
          :key="elemento.titulo"
          type="button"
          class="enlace-menu"
          :data-seccion="elemento.idSeccion || ''"
          :class="{
            activo:
              !elemento.ruta &&
              seccionActiva === elemento.idSeccion,
            'enlace-equipo':
              elemento.ruta === '/mi-equipo-salud',
          }"
          @click="seleccionarElementoMenu(elemento)"
        >
          <span class="icono-menu">
            <img
              :src="elemento.icono"
              :alt="elemento.titulo"
            />
          </span>

          <span class="texto-menu">
            {{ elemento.titulo }}
          </span>

          <span
            v-if="
              !elemento.ruta &&
              seccionActiva === elemento.idSeccion
            "
            class="punto-activo"
          ></span>
        </button>
      </nav>

      <div class="tarjeta-descarga">
        <h3>Lleva tu bienestar</h3>
        <p>Descarga la app y haz seguimiento a tus hábitos.</p>
        <button>Descargar para Android</button>
      </div>
    </aside>

    <main class="contenido-principal">
      <div id="inicio" class="bloque-inicio-scroll">
      <section class="tarjeta-aviso">
        <div class="icono-aviso">!</div>

        <div>
          <h3>Aviso Importante</h3>

          <p>
            La información contenida en esta página tiene fines exclusivamente
            educativos e informativos.
            <strong>
              No emitimos prescripciones médicas, diagnósticos ni tratamientos.
            </strong>
            Ante cualquier duda o síntoma, consulte siempre a un profesional de
            la salud calificado.
          </p>
        </div>
      </section>

      <section class="seccion-bienvenida">
        <div class="texto-bienvenida">
          <span class="etiqueta">Explora y aprende</span>

          <h1>
            Bienvenido a
            <span>Vibra la Vida</span>
          </h1>

          <p>
            Navega a través de nuestros temas para conocer más sobre el cuidado
            del cuerpo, prevención de riesgos y la importancia de la salud
            mental, con información pensada especialmente para jóvenes de 15 a
            20 años.
          </p>

          <button class="boton-principal" @click="irAlTemario">
            Ver temario
          </button>
        </div>

        <div class="imagen-bienvenida">
          <img :src="logoPrincipal" alt="Imagen principal Vibra la Vida" />
        </div>
      </section>

      </div>

      <section id="temario" class="contenedor-temario">
        <article
          v-for="seccion in seccionesTemario"
          :id="seccion.id"
          :key="seccion.id"
          class="bloque-tema"
        >
          <div class="titulo-seccion">
            <div
              class="contenedor-icono-seccion"
              :class="seccion.color"
            >
              <img
                :src="seccion.icono"
                :alt="seccion.titulo"
                class="icono-seccion"
              />
            </div>

            <div class="texto-titulo-seccion">
              <span class="etiqueta-tema">
                Tema informativo
              </span>

              <h2>
                {{ seccion.titulo }}
              </h2>
            </div>
          </div>

          <div class="tarjeta-tema">
            <div
              v-if="obtenerParrafos(seccion).length"
              class="contenido-parrafos"
            >
              <p
                v-for="(parrafo, index) in obtenerParrafos(seccion)"
                :key="index"
                class="texto-seccion"
              >
                {{ parrafo }}
              </p>
            </div>

            <div
              v-if="seccion.imagenes && seccion.imagenes.length"
              class="carrusel-imagenes"
              :class="{
                'carrusel-ritmo':
                  seccion.id === 'ritmo-cardiaco'
              }"
            >
              <div class="carrusel-ventana">

                <button
                  v-if="seccion.imagenes.length > 1"
                  type="button"
                  class="boton-carrusel anterior"
                  :aria-label="`Imagen anterior de ${seccion.titulo}`"
                  @click="imagenAnterior(seccion)"
                >
                  ‹
                </button>


                <div
                  v-if="obtenerImagenCarrusel(seccion)"
                  class="diapositiva-carrusel"
                >
                  <img
                    v-if="
                      obtenerImagen(
                        obtenerImagenCarrusel(seccion)
                      )
                    "
                    :src="
                      obtenerImagen(
                        obtenerImagenCarrusel(seccion)
                      )
                    "
                    :alt="
                      obtenerImagenCarrusel(seccion).titulo ||
                      `Imagen de ${seccion.titulo}`
                    "
                    loading="lazy"
                    @error="$event.target.style.display = 'none'"
                  />
                </div>


                <button
                  v-if="seccion.imagenes.length > 1"
                  type="button"
                  class="boton-carrusel siguiente"
                  :aria-label="`Siguiente imagen de ${seccion.titulo}`"
                  @click="siguienteImagen(seccion)"
                >
                  ›
                </button>

              </div>


              <div
                v-if="seccion.imagenes.length > 1"
                class="indicadores-carrusel"
                :aria-label="`Imágenes de ${seccion.titulo}`"
              >
                <button
                  v-for="(_, indice) in seccion.imagenes"
                  :key="indice"
                  type="button"
                  class="indicador-carrusel"
                  :class="{
                    activo:
                      obtenerIndiceCarrusel(seccion.id) ===
                      indice
                  }"
                  :aria-label="`Ver imagen ${indice + 1}`"
                  @click="
                    irAImagenCarrusel(
                      seccion.id,
                      indice
                    )
                  "
                ></button>
              </div>

            </div>

            <div
              v-if="seccion.tarjetas && seccion.tarjetas.length"
              class="rejilla-tarjetas"
            >
              <TarjetaAccion
                v-for="tarjeta in seccion.tarjetas"
                :key="tarjeta.titulo"
                :titulo="tarjeta.titulo"
                :texto="tarjeta.texto"
                :boton="tarjeta.boton"
                :color="tarjeta.color"
                @abrir="abrirTarjeta(tarjeta)"
              />
            </div>
          </div>
        </article>

        <section id="nuestra-app" class="seccion-app">
          <div class="contenido-app">
            <img
              :src="iconApp"
              alt="Nuestra App"
              class="icono-app-seccion"
            />
            <span class="etiqueta-app">Disponible ahora</span>

            <h2>
              Tu bienestar, en
              <span>la palma de tu mano.</span>
            </h2>

            <p>
              Descarga la aplicación oficial de Vibra la Vida. Accede a
              herramientas de seguimiento de hábitos y mantén el registro de tus
              avances de manera sencilla.
            </p>

            <button class="boton-tienda">
              Descargar para Android
            </button>
          </div>

          <div class="vista-celular">
            <img
              :src="appPreview"
              alt="Vista previa de la aplicación Vibra la Vida"
              class="imagen-app-preview"
            />
          </div>
        </section>
      </section>
    </main>
  </div>
</template>

<style scoped src="../assets/styles/home.css"></style>