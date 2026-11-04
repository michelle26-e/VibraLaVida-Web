<script setup>
import { verificarCedulaProfesional } from '../services/doctoresService'
// ==========================================================
// PANEL PROFESIONAL - VIBRA LA VIDA
// ==========================================================
// En esta etapa:
// 1. El panel NO muestra pacientes de ejemplo.
// 2. "Mi cuenta" se trabaja dentro del panel profesional.
// 3. Los datos profesionales se leen y guardan en Firestore.
// ==========================================================

import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useRouter } from 'vue-router'

import {
  Activity,
  CalendarDays,
  FileText,
  House,
  LogOut,
  UserRound,
  Users,
} from 'lucide-vue-next'

import { onAuthStateChanged } from 'firebase/auth'
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  where,
} from 'firebase/firestore'

import { auth, db } from '../firebase/firebaseConfig'
import { cerrarSesionUsuario } from '../services/authService'
import {
  actualizarCita,
  crearCita,
  eliminarCita,
  obtenerCitas,
} from '../services/citasService'
import {
  buscarPacientesPorNombre,
  eliminarPacienteVinculado,
  obtenerPacientesVinculados,
  obtenerSolicitudesPendientes,
  vincularPaciente,
} from '../services/seguimientoProfesionalService'
import {
  obtenerUltimoHealthPaciente,
} from '../services/healthConnectService'

import logoVibra from '../assets/logo-vibra.png'

const router = useRouter()

// ----------------------------------------------------------
// ESTADO GENERAL DEL PANEL
// ----------------------------------------------------------

const opcionActiva = ref('principal')
const cargandoCuenta = ref(true)
const guardandoCuenta = ref(false)
const editandoCuenta = ref(false)

const mensajeCuenta = ref('')
const mensajeErrorCuenta = ref('')

let detenerObservador = null

// ----------------------------------------------------------
// USUARIO PROFESIONAL
// ----------------------------------------------------------

const doctorActual = ref(null)

// ----------------------------------------------------------
// PRIVACIDAD Y LEGAL - PANEL WEB PROFESIONAL
// ----------------------------------------------------------
// Todo se maneja dentro de este mismo PanelDoctor.vue.
// No se crean componentes ni servicios adicionales.
// ----------------------------------------------------------

const VERSION_AVISO_PRIVACIDAD = '1.0'
const VERSION_TERMINOS = '1.0'

const consentimientoLegalCargado = ref(false)
const mostrarConsentimientoLegal = ref(false)
const documentoLegalAbierto = ref('')

const aceptoAvisoPrivacidad = ref(false)
const aceptoTerminosCondiciones = ref(false)
const aceptoConfidencialidadProfesional = ref(false)

const guardandoConsentimientoLegal = ref(false)
const mensajeErrorConsentimientoLegal = ref('')
const consentimientoLegalActual = ref(null)

const avisoPrivacidadTexto = `# AVISO DE PRIVACIDAD INTEGRAL  
## VIBRA LA VIDA

**Versión 1.0**

### 1. Identidad y domicilio del responsable

**[NOMBRE COMPLETO, INSTITUCIÓN O RAZÓN SOCIAL RESPONSABLE]**, con domicilio en **[DOMICILIO COMPLETO DEL RESPONSABLE]**, es responsable del tratamiento, protección y resguardo de los datos personales recabados mediante la plataforma digital **Vibra la Vida**, de conformidad con la legislación mexicana aplicable en materia de protección de datos personales.

Para cualquier asunto relacionado con privacidad, protección de datos personales o ejercicio de derechos ARCO, la persona titular podrá comunicarse mediante:

**Correo electrónico:** [CORREO ELECTRÓNICO DE PRIVACIDAD]  
**Domicilio:** [DOMICILIO DEL RESPONSABLE]

---

### 2. ¿Qué datos personales podemos recabar?

Vibra la Vida podrá recabar y tratar únicamente los datos necesarios para proporcionar sus funciones y servicios.

Dependiendo de las herramientas que utilice la persona usuaria, podrán tratarse los siguientes datos:

- Nombre y apellidos.
- Edad o fecha de nacimiento.
- Género.
- Fotografía de perfil.
- Correo electrónico y datos relacionados con la cuenta.
- Peso.
- Estatura.
- Nivel de actividad física.
- Información relacionada con citas médicas.
- Información relativa a medicamentos y recordatorios.
- Información registrada en bitácoras personales de salud.
- Información relacionada con profesionales de salud vinculados al usuario.
- Archivos o documentos que la persona usuaria decida almacenar voluntariamente, incluyendo estudios de laboratorio.

La plataforma procurará que los datos recabados sean adecuados, relevantes y limitados a las finalidades informadas en el presente Aviso de Privacidad.

---

### 3. Datos personales sensibles

Debido a la naturaleza de Vibra la Vida, determinadas funciones pueden involucrar el tratamiento de **datos personales sensibles relacionados con el estado de salud presente o futuro de la persona usuaria**.

Entre ellos pueden encontrarse:

- Frecuencia cardiaca.
- Información relacionada con alteraciones del ritmo cardiaco.
- Datos de sueño.
- Número de pasos y actividad física.
- Peso, estatura e índice de masa corporal.
- Información relacionada con diabetes mellitus.
- Registros de glucosa.
- Registros de presión arterial.
- Enfermedades crónicas declaradas por la persona usuaria.
- Medicamentos y adherencia a tratamientos.
- Información obtenida de dispositivos inteligentes compatibles.
- Información proveniente de Health Connect u otros servicios autorizados por la persona usuaria.
- Resultados de cuestionarios o escalas de bienestar, incluyendo información relacionada con sueño, ansiedad, depresión o estrés.
- Resultados de cálculos de riesgo cardiovascular o cardiometabólico.
- Estudios de laboratorio y archivos médicos proporcionados voluntariamente.

El tratamiento de estos datos se realizará únicamente cuando sea necesario para proporcionar las funciones seleccionadas por la persona usuaria y después de obtener el consentimiento expreso correspondiente.

---

### 4. Consentimiento para datos personales sensibles

Al seleccionar la opción correspondiente dentro de Vibra la Vida y pulsar **“Aceptar y continuar”**, la persona usuaria manifiesta de forma expresa su consentimiento para el tratamiento de los datos personales sensibles relacionados con su salud, conforme a las finalidades establecidas en este Aviso de Privacidad.

La plataforma conservará evidencia electrónica de dicha aceptación, incluyendo, entre otros elementos:

- Identificador de la cuenta.
- Versión del Aviso de Privacidad aceptada.
- Versión de los Términos y Condiciones aceptada.
- Fecha y hora de aceptación.
- Medio desde el cual se realizó la aceptación.
- Estado del consentimiento.

---

### 5. Finalidades del tratamiento

Los datos personales podrán ser tratados para las siguientes **finalidades primarias**, necesarias para el funcionamiento de Vibra la Vida:

- Crear, autenticar y administrar la cuenta de la persona usuaria.
- Crear y actualizar su perfil.
- Proporcionar herramientas de autocuidado, prevención y seguimiento de hábitos saludables.
- Mostrar información relacionada con actividad física, frecuencia cardiaca, sueño u otros indicadores autorizados.
- Realizar cálculos solicitados por la persona usuaria, tales como índice de masa corporal, necesidades calóricas o estimaciones de riesgo.
- Aplicar cuestionarios y escalas de bienestar disponibles dentro de la plataforma.
- Registrar medicamentos y generar recordatorios.
- Administrar citas y solicitudes relacionadas con estas.
- Mantener bitácoras de salud.
- Almacenar estudios de laboratorio o archivos proporcionados voluntariamente.
- Facilitar la vinculación y seguimiento entre pacientes y profesionales de salud cuando la persona usuaria utilice dichas funciones.
- Mostrar profesionales de salud y consultorios registrados.
- Permitir el funcionamiento de herramientas interactivas o asistidas mediante inteligencia artificial.
- Mantener un historial relacionado con las funciones solicitadas por el usuario.
- Proteger la seguridad e integridad de la plataforma.
- Prevenir accesos no autorizados o uso indebido.
- Registrar y conservar evidencia del consentimiento otorgado.
- Cumplir obligaciones legales aplicables.

Vibra la Vida constituye una **herramienta tecnológica de apoyo** y no sustituye la valoración, diagnóstico, prescripción o tratamiento proporcionados por un profesional de la salud.

---

### 6. Información obtenida mediante dispositivos y servicios de salud

Cuando la persona usuaria lo autorice expresamente, Vibra la Vida podrá acceder a información compatible proporcionada mediante dispositivos inteligentes, relojes, sensores o servicios como Health Connect.

El acceso dependerá de los permisos concedidos por la persona usuaria en su dispositivo.

La persona usuaria podrá modificar o retirar dichos permisos desde la configuración correspondiente de su sistema operativo o servicio conectado.

La precisión y disponibilidad de estos datos puede depender del dispositivo, fabricante, aplicación de origen y proceso de sincronización.

---

### 7. Uso de servicios tecnológicos

Para el funcionamiento de Vibra la Vida podrán utilizarse proveedores tecnológicos que proporcionen servicios de autenticación, bases de datos, almacenamiento, alojamiento, procesamiento de archivos, infraestructura en la nube u otras herramientas técnicas.

Estos servicios deberán utilizar los datos exclusivamente para las finalidades necesarias para proporcionar las funciones correspondientes y bajo las medidas de seguridad y condiciones contractuales que resulten aplicables.

**Vibra la Vida no comercializará ni venderá los datos personales de sus usuarios.**

Cuando una transferencia de información requiera legalmente consentimiento adicional, este deberá solicitarse antes de realizar dicha transferencia.

---

### 8. Inteligencia artificial

Vibra la Vida puede incorporar herramientas asistidas mediante inteligencia artificial, incluyendo funciones de orientación general proporcionadas por **Nuby**.

Cuando sea necesario utilizar información del usuario para proporcionar una respuesta personalizada, se procurará utilizar únicamente los datos pertinentes para la consulta realizada.

Las funciones de inteligencia artificial tienen carácter orientativo y no sustituyen la valoración de un profesional de la salud.

---

### 9. Medidas de seguridad

El responsable implementará medidas administrativas, técnicas y organizativas razonables destinadas a proteger los datos personales frente a:

- pérdida;
- alteración;
- destrucción;
- acceso no autorizado;
- divulgación indebida;
- tratamiento no autorizado.

El acceso a la información deberá limitarse a personas, servicios o sistemas que legítimamente necesiten utilizarla para las finalidades establecidas.

---

### 10. Conservación de la información

Los datos personales serán conservados durante el tiempo necesario para proporcionar las funciones solicitadas, cumplir las finalidades descritas y atender las obligaciones legales aplicables.

Cuando los datos dejen de ser necesarios, podrán ser eliminados, bloqueados o sometidos al procedimiento correspondiente conforme a la legislación aplicable, salvo que exista una obligación legal de conservarlos.

---

### 11. Derechos ARCO

La persona titular podrá ejercer en cualquier momento sus derechos de:

**Acceso:** conocer qué datos personales se encuentran en posesión del responsable y para qué son utilizados.

**Rectificación:** solicitar la corrección de datos personales incorrectos, incompletos o desactualizados.

**Cancelación:** solicitar la eliminación o cancelación de los datos cuando legalmente proceda.

**Oposición:** solicitar que sus datos no sean utilizados para determinadas finalidades cuando resulte procedente.

Para ejercer cualquiera de estos derechos, la persona titular deberá enviar una solicitud a:

**[CORREO ELECTRÓNICO PARA DERECHOS ARCO]**

La solicitud deberá contener información suficiente para identificar a la persona titular, indicar el derecho que desea ejercer y describir claramente los datos relacionados con la solicitud.

Cuando resulte necesario, podrá solicitarse documentación para acreditar identidad o representación legal.

---

### 12. Revocación del consentimiento

La persona titular podrá solicitar en cualquier momento la revocación del consentimiento otorgado para el tratamiento de sus datos personales.

La solicitud deberá enviarse a:

**[CORREO ELECTRÓNICO DE PRIVACIDAD]**

La revocación no tendrá efectos retroactivos sobre tratamientos realizados legítimamente antes de que esta resulte efectiva.

Cuando determinados datos sean indispensables para proporcionar una función solicitada, la revocación del consentimiento podrá ocasionar que dicha función deje de estar disponible.

---

### 13. Limitación del uso o divulgación

La persona titular podrá solicitar la limitación del uso o divulgación de sus datos personales mediante el canal de contacto establecido en este Aviso de Privacidad.

---

### 14. Personas menores de edad

Vibra la Vida puede contemplar usuarios adolescentes.

Cuando la persona usuaria sea menor de edad, el tratamiento de sus datos personales deberá realizarse conforme a las disposiciones legales aplicables en materia de representación y consentimiento.

Para aquellas funciones que involucren datos personales sensibles de salud y requieran autorización de quien ejerza patria potestad o tutela, Vibra la Vida deberá implementar el mecanismo correspondiente antes de habilitar dichas funciones de manera definitiva para menores de edad.

La aceptación realizada exclusivamente por la persona menor no deberá considerarse sustituto de la autorización de su representante cuando esta resulte legalmente necesaria.

---

### 15. Cambios al Aviso de Privacidad

El presente Aviso de Privacidad podrá modificarse como consecuencia de:

- nuevas funciones de Vibra la Vida;
- cambios tecnológicos;
- incorporación de nuevos servicios;
- modificaciones en las finalidades del tratamiento;
- cambios regulatorios o legales;
- mejoras en los mecanismos de protección de información.

Cuando una modificación requiera una nueva manifestación de consentimiento, Vibra la Vida podrá solicitar a la persona usuaria que revise y acepte la nueva versión antes de continuar utilizando las funciones relacionadas.

La aplicación conservará registro de la versión aceptada por cada persona usuaria.

---

### 16. Versión vigente

**Versión del Aviso de Privacidad: 1.0**

Fecha de entrada en vigor: **[FECHA DE PUBLICACIÓN]**

---

### 17. Contacto

Para cualquier duda relacionada con este Aviso de Privacidad:

**Responsable:** [NOMBRE O RAZÓN SOCIAL]  
**Correo de privacidad:** [CORREO ELECTRÓNICO]  
**Domicilio:** [DOMICILIO COMPLETO]

Al otorgar su consentimiento dentro de Vibra la Vida, la persona usuaria reconoce haber tenido la posibilidad de consultar el presente Aviso de Privacidad antes de proporcionar su aceptación.`

const terminosCondicionesTexto = `# TÉRMINOS Y CONDICIONES DE USO  
## VIBRA LA VIDA

**Versión 1.0**

### 1. Aceptación de los términos

Los presentes Términos y Condiciones regulan el acceso y utilización de la plataforma digital **Vibra la Vida**.

Al seleccionar la opción de aceptación correspondiente y utilizar las funciones de la plataforma, la persona usuaria manifiesta haber leído, comprendido y aceptado estos Términos y Condiciones.

Si la persona usuaria no está de acuerdo con su contenido, deberá abstenerse de utilizar las funciones que requieran su aceptación.

---

### 2. Objeto de Vibra la Vida

Vibra la Vida es una plataforma tecnológica orientada al apoyo en:

- promoción de hábitos de vida saludable;
- autocuidado;
- seguimiento de información relacionada con salud y bienestar;
- integración de información compatible con dispositivos inteligentes;
- administración de medicamentos;
- bitácoras personales de salud;
- seguimiento de citas;
- aplicación de cuestionarios y herramientas de bienestar;
- vinculación entre pacientes y profesionales de salud;
- orientación general mediante herramientas digitales y de inteligencia artificial.

---

### 3. Vibra la Vida no sustituye atención médica

La información proporcionada mediante Vibra la Vida tiene carácter de **apoyo, orientación y seguimiento**.

La aplicación no sustituye:

- consulta médica;
- valoración clínica;
- diagnóstico;
- prescripción;
- tratamiento;
- servicios de urgencias;
- evaluación realizada por profesionales de salud debidamente acreditados.

La persona usuaria no deberá modificar tratamientos, suspender medicamentos o tomar decisiones médicas importantes basándose únicamente en información presentada por la aplicación.

---

### 4. Emergencias médicas

**Vibra la Vida no es un servicio de emergencias.**

Ante signos o síntomas graves, pérdida de conciencia, dolor intenso, dificultad respiratoria, sospecha de evento cardiovascular, emergencia psicológica o cualquier situación que pudiera representar un riesgo inmediato para la salud o la vida, la persona usuaria deberá solicitar atención médica inmediata mediante los servicios de emergencia correspondientes o acudir a una unidad médica.

No deberá utilizarse Vibra la Vida como único medio de atención en una situación urgente.

---

### 5. Registro y cuenta

Para utilizar determinadas funciones puede ser necesario crear una cuenta.

La persona usuaria se compromete a:

- proporcionar información correcta y razonablemente actualizada;
- mantener protegidas sus credenciales;
- no compartir su contraseña;
- evitar que terceras personas utilicen su cuenta sin autorización;
- informar sobre cualquier acceso no autorizado del que tenga conocimiento.

La cuenta es personal y no debe utilizarse para suplantar la identidad de otra persona.

---

### 6. Información proporcionada por la persona usuaria

La persona usuaria es responsable de procurar que los datos ingresados manualmente en la plataforma sean correctos.

Esto incluye, entre otros:

- peso;
- estatura;
- medicamentos;
- horarios;
- enfermedades declaradas;
- glucosa;
- presión arterial;
- información de citas;
- registros de bitácora;
- estudios o documentos cargados.

Los resultados obtenidos a partir de información incorrecta pueden no representar adecuadamente la situación real de la persona usuaria.

---

### 7. Dispositivos inteligentes y Health Connect

Algunas funciones pueden utilizar información procedente de:

- teléfonos móviles;
- relojes inteligentes;
- sensores;
- Health Connect;
- aplicaciones compatibles;
- otros dispositivos autorizados.

La disponibilidad y exactitud de los datos puede depender del fabricante, dispositivo, sensores, configuración, permisos, aplicación de origen y sincronización.

Vibra la Vida no garantiza que las mediciones generadas por dispositivos de terceros sean equivalentes a mediciones obtenidas mediante equipos clínicos certificados.

---

### 8. Frecuencia cardiaca y alteraciones del ritmo

Las funciones relacionadas con frecuencia cardiaca y ritmo cardiaco tienen carácter de apoyo informativo y preventivo.

Las alertas, gráficas, tendencias o clasificaciones mostradas por la plataforma no constituyen por sí mismas un diagnóstico de arritmia, enfermedad cardiovascular u otra condición médica.

Cuando los datos indiquen valores que puedan resultar relevantes, la persona usuaria deberá considerar la valoración de un profesional de salud.

---

### 9. Calculadoras y herramientas preventivas

Vibra la Vida puede incluir herramientas para calcular o estimar información como:

- índice de masa corporal;
- necesidades calóricas;
- riesgo cardiovascular o cardiometabólico;
- indicadores derivados de información proporcionada por el usuario.

Los resultados representan estimaciones de apoyo y deben interpretarse conforme a las limitaciones de cada herramienta.

---

### 10. Cuestionarios y escalas de bienestar

La plataforma puede incorporar cuestionarios o escalas relacionadas con:

- sueño;
- ansiedad;
- depresión;
- estrés;
- bienestar emocional.

Los resultados obtenidos mediante estas herramientas no equivalen automáticamente a un diagnóstico clínico.

Cuando un resultado sugiera la conveniencia de valoración adicional, se recomienda acudir con un profesional debidamente capacitado.

---

### 11. Nuby e inteligencia artificial

Vibra la Vida puede incorporar funciones asistidas mediante inteligencia artificial, incluyendo el asistente **Nuby**.

Estas funciones pueden generar recomendaciones, explicaciones u orientación general basada en la información disponible.

La persona usuaria reconoce que los sistemas de inteligencia artificial pueden:

- cometer errores;
- interpretar incorrectamente información;
- generar respuestas incompletas;
- no disponer de todo el contexto médico relevante.

Por lo anterior, sus respuestas no deben utilizarse como único fundamento para realizar diagnósticos, modificar tratamientos o atender emergencias.

---

### 12. Medicamentos y recordatorios

La agenda de medicamentos y sus notificaciones constituyen herramientas de apoyo.

La persona usuaria debe comprobar que:

- el medicamento registrado sea correcto;
- la dosis sea correcta;
- los horarios sean correctos;
- las fechas correspondan a las indicaciones recibidas.

Una notificación retrasada, omitida o no recibida debido a configuración del dispositivo, batería, sistema operativo, conexión u otra causa técnica no constituye una instrucción para alterar un tratamiento.

Las indicaciones proporcionadas por un profesional de salud prevalecen sobre cualquier recordatorio configurado dentro de la aplicación.

---

### 13. Citas y solicitudes

Vibra la Vida puede permitir:

- consultar citas;
- confirmar asistencia;
- solicitar cancelaciones;
- solicitar reagendaciones.

El envío de una solicitud de reagendación **no significa que la cita haya sido modificada automáticamente**.

La modificación estará sujeta a la revisión y aceptación correspondiente por parte del profesional o institución.

---

### 14. Profesionales de salud

Vibra la Vida puede mostrar perfiles de profesionales y permitir su vinculación con pacientes.

La información profesional mostrada dependerá de los datos proporcionados y de los mecanismos de verificación disponibles en la plataforma.

La prestación del servicio profesional, valoración clínica, tratamiento, honorarios, disponibilidad y responsabilidad derivada del acto profesional corresponden al profesional o institución que proporcione la atención.

La plataforma funciona como herramienta tecnológica de vinculación y seguimiento.

---

### 15. Ubicación de consultorios

Cuando un profesional registre la ubicación de su consultorio, esta información podrá mostrarse dentro del mapa disponible para las personas usuarias.

La posición mostrada depende de la información proporcionada, servicios cartográficos y procesos de geolocalización utilizados.

Vibra la Vida no garantiza que una ubicación sea exacta en todos los dispositivos o proveedores cartográficos.

---

### 16. Estudios de laboratorio y archivos

La persona usuaria podrá, cuando la función se encuentre disponible, almacenar imágenes, fotografías, archivos PDF u otros documentos relacionados con estudios de laboratorio.

La persona usuaria es responsable de contar con autorización para cargar información que corresponda a terceras personas.

No deberá almacenar documentos pertenecientes a otras personas sin autorización.

---

### 17. Uso adecuado de la plataforma

Queda prohibido utilizar Vibra la Vida para:

- acceder sin autorización a cuentas ajenas;
- obtener información de otros usuarios de manera indebida;
- suplantar identidades;
- vulnerar mecanismos de autenticación;
- interferir intencionalmente con la plataforma;
- introducir software malicioso;
- utilizar información obtenida mediante la plataforma para actividades ilícitas;
- registrar información falsa con intención de perjudicar a otras personas;
- utilizar perfiles profesionales de manera fraudulenta.

---

### 18. Disponibilidad

La operación de Vibra la Vida puede depender de:

- conexión a Internet;
- dispositivos compatibles;
- servicios de autenticación;
- proveedores de nube;
- servicios de almacenamiento;
- APIs;
- permisos del sistema operativo;
- disponibilidad de servicios externos.

Por ello, pueden existir interrupciones temporales debido a mantenimiento, actualizaciones, fallos técnicos o circunstancias fuera del control razonable de los responsables.

---

### 19. Seguridad

Vibra la Vida procurará implementar mecanismos razonables destinados a proteger la seguridad de la plataforma y de la información que gestiona.

No obstante, ninguna plataforma tecnológica conectada a Internet puede garantizar riesgo cero.

La persona usuaria deberá colaborar con las medidas de seguridad, incluyendo la protección de sus credenciales y la actualización de sus dispositivos cuando corresponda.

---

### 20. Privacidad y datos personales

El tratamiento de datos personales se realizará conforme al **Aviso de Privacidad de Vibra la Vida**.

La aceptación de estos Términos y Condiciones no sustituye el consentimiento específico que resulte necesario para el tratamiento de datos personales sensibles.

La persona usuaria deberá consultar el Aviso de Privacidad para conocer:

- qué datos se tratan;
- las finalidades;
- los mecanismos para ejercer derechos ARCO;
- medios para revocar consentimiento;
- medidas relacionadas con privacidad.

---

### 21. Propiedad intelectual

El software, diseños, logotipos, nombre, interfaz gráfica, textos, imágenes, elementos visuales y demás componentes propios de Vibra la Vida podrán encontrarse protegidos por las disposiciones aplicables en materia de propiedad intelectual.

El acceso a la plataforma no concede a la persona usuaria derechos de explotación, reproducción, distribución o modificación fuera de los usos expresamente autorizados.

Los componentes de terceros se regirán por sus respectivas licencias y condiciones.

---

### 22. Menores de edad

Cuando Vibra la Vida sea utilizada por personas menores de edad, deberán observarse los requisitos de consentimiento, representación y protección reforzada que resulten aplicables.

Cuando sea jurídicamente necesario, determinadas funciones podrán requerir autorización de padre, madre, tutor o representante legal antes de ser habilitadas.

---

### 23. Suspensión o terminación de cuenta

Podrán aplicarse medidas de restricción o suspensión cuando exista evidencia de:

- uso fraudulento;
- suplantación de identidad;
- acceso indebido;
- vulneración de la seguridad;
- incumplimiento grave de estos términos;
- utilización ilícita de la plataforma.

Las medidas adoptadas deberán procurar ser proporcionales a las circunstancias correspondientes.

---

### 24. Eliminación de la cuenta

La persona usuaria podrá solicitar la eliminación de su cuenta conforme a las opciones habilitadas por la plataforma.

La eliminación se realizará sin perjuicio de aquella información que deba conservarse durante determinado periodo para cumplir obligaciones legales, resolver solicitudes pendientes, mantener evidencias de consentimiento o atender responsabilidades aplicables.

---

### 25. Modificaciones de los Términos y Condiciones

Vibra la Vida podrá actualizar estos Términos y Condiciones cuando existan:

- cambios funcionales;
- nuevas herramientas;
- nuevas integraciones;
- cambios legales;
- modificaciones importantes en la operación de la plataforma.

Cuando los cambios sean relevantes, podrá solicitarse a la persona usuaria la aceptación de la nueva versión.

---

### 26. Versión vigente

**Versión de los Términos y Condiciones: 1.0**

Fecha de entrada en vigor: **[FECHA DE PUBLICACIÓN]**

---

### 27. Contacto

Para consultas relacionadas con estos Términos y Condiciones:

**Responsable u operador:** [NOMBRE O RAZÓN SOCIAL]  
**Correo:** [CORREO ELECTRÓNICO]  
**Domicilio:** [DOMICILIO COMPLETO]

Al pulsar **“Aceptar y continuar”**, la persona usuaria manifiesta haber tenido acceso al Aviso de Privacidad y a los presentes Términos y Condiciones y haber expresado las aceptaciones correspondientes dentro de Vibra la Vida.`

const datosDoctor = ref({
  uid: '',
  nombreCompleto: '',
  correo: '',
  profesionRegistrada: '',
  especialidad: '',
  cedulaProfesional: '',
  formacionAdicional: [],
  tieneConsultorio: false,
  consultorio: {
    ubicacion: '',
    horarioAtencion: '',
    telefono: '',
  },
})

// Formulario separado para no modificar los datos mostrados
// hasta que el doctor presione "Guardar cambios".
const formularioDoctor = ref({
  nombreCompleto: '',
  especialidad: '',
  cedulaProfesional: '',
  formacionAdicional: [],
  tieneConsultorio: false,
  ubicacion: '',
  horarioAtencion: '',
  telefono: '',
})

const erroresCuenta = ref({})

const mostrarFormularioFormacion = ref(false)
const guardandoFormacion = ref(false)

const formularioFormacion = ref({
  tipo: 'Maestría',
  nombre: '',
  institucion: '',
  anio: '',
  tieneCedula: false,
  cedulaProfesional: '',
})

const erroresFormacion = ref({})

const estadoCedulaFormacion = ref('sin-verificar')
// sin-verificar | verificando | verificada | no-encontrada

const mensajeCedulaFormacion = ref('')
const datosCedulaFormacion = ref(null)

const tiposFormacion = [
  'Especialidad',
  'Subespecialidad',
  'Maestría',
  'Doctorado',
  'Diplomado',
  'Certificación',
  'Otro',
]

// ----------------------------------------------------------
// PACIENTES
// ----------------------------------------------------------
// Por ahora inicia vacío.
// Más adelante se llenará únicamente cuando exista la relación
// correspondiente entre paciente y doctor.

const pacientes = ref([])
const solicitudesPendientes = ref([])
const cargandoPacientes = ref(false)
const mensajeErrorPacientes = ref('')

// Búsqueda visual dentro de la lista de pacientes vinculados.
const textoFiltroPacientes = ref('')

const pacientesFiltrados = computed(() => {
  const texto =
    textoFiltroPacientes.value
      .trim()
      .toLowerCase()

  if (!texto) {
    return pacientes.value
  }

  return pacientes.value.filter(
    (paciente) => {

      const nombre =
        String(
          paciente.nombreCompleto || ''
        ).toLowerCase()

      const correo =
        String(
          paciente.correo || ''
        ).toLowerCase()

      return (
        nombre.includes(texto) ||
        correo.includes(texto)
      )
    }
  )
})

// ----------------------------------------------------------
// DETALLE DEL PACIENTE + HEALTH CONNECT
// ----------------------------------------------------------
//
// Esta vista se abre dentro del panel como una pantalla
// independiente. NO se muestra en un panel lateral.
//
// Los datos de Health Connect se consultan mediante la API,
// no directamente desde Firestore.
// ----------------------------------------------------------

const pacienteDetalle = ref(null)
const healthPaciente = ref(null)
const cargandoHealthPaciente = ref(false)
const mensajeErrorHealthPaciente = ref('')

// Modal para buscar pacientes y solicitar seguimiento
const mostrarModalPaciente = ref(false)
const textoBusquedaPaciente = ref('')
const resultadosBusquedaPaciente = ref([])
const buscandoPaciente = ref(false)
const agregandoPacienteUid = ref('')
const mensajeBusquedaPaciente = ref('')
const tipoMensajeBusquedaPaciente = ref('')

// Paciente seleccionado visualmente antes de enviar la solicitud.
// La lógica real de seguimiento NO cambia.
const pacienteSeleccionadoSolicitud = ref(null)

let temporizadorBusquedaPaciente = null

// ----------------------------------------------------------
// CARGAR PACIENTES VINCULADOS
// ----------------------------------------------------------
// Usa la misma colección que "Mi equipo de salud":
// seguimiento_profesional.
//
// Solo mostramos vínculos activos del profesional actual.
// ----------------------------------------------------------

const cargarPacientesVinculados = async (profesionalUid) => {
  cargandoPacientes.value = true
  mensajeErrorPacientes.value = ''

  try {
    const vinculados =
      await obtenerPacientesVinculados(
        profesionalUid
      )

    const pacientesCompletos =
      await Promise.all(
        vinculados.map(
          async (paciente) => {

            try {

              const respuesta =
                await obtenerUltimoHealthPaciente(
                  paciente.uid
                )

              return {
                ...paciente,
                ...(respuesta?.paciente || {}),
              }

            } catch (error) {

              console.warn(
                'No fue posible completar el perfil del paciente:',
                paciente.uid,
                error
              )

              return paciente
            }
          }
        )
      )

    pacientes.value =
      pacientesCompletos

  } catch (error) {
    console.error(
      'Error al cargar pacientes vinculados:',
      error
    )

    pacientes.value = []

    mensajeErrorPacientes.value =
      'No fue posible cargar los pacientes vinculados.'
  } finally {
    cargandoPacientes.value = false
  }
}

// ----------------------------------------------------------
// CARGAR SOLICITUDES PENDIENTES
// ----------------------------------------------------------
// Estas solicitudes todavía NO convierten a la persona
// en paciente activo del profesional.
// ----------------------------------------------------------

const cargarSolicitudesPendientes = async (profesionalUid) => {
  if (!profesionalUid) {
    solicitudesPendientes.value = []
    return
  }

  try {
    solicitudesPendientes.value =
      await obtenerSolicitudesPendientes(
        profesionalUid
      )
  } catch (error) {
    console.error(
      'Error al cargar solicitudes pendientes:',
      error
    )

    solicitudesPendientes.value = []
  }
}

// ----------------------------------------------------------
// BUSCAR PACIENTES Y SOLICITAR SEGUIMIENTO
// ----------------------------------------------------------

const abrirModalPaciente = async () => {
  textoBusquedaPaciente.value = ''
  resultadosBusquedaPaciente.value = []
  pacienteSeleccionadoSolicitud.value = null
  mensajeBusquedaPaciente.value = ''
  tipoMensajeBusquedaPaciente.value = ''
  mostrarModalPaciente.value = true

  const profesionalUid =
    auth.currentUser?.uid

  if (profesionalUid) {
    await cargarSolicitudesPendientes(
      profesionalUid
    )
  }
}

const cerrarModalPaciente = () => {
  mostrarModalPaciente.value = false
  textoBusquedaPaciente.value = ''
  resultadosBusquedaPaciente.value = []
  pacienteSeleccionadoSolicitud.value = null
  mensajeBusquedaPaciente.value = ''
  tipoMensajeBusquedaPaciente.value = ''
  agregandoPacienteUid.value = ''

  if (temporizadorBusquedaPaciente) {
    clearTimeout(temporizadorBusquedaPaciente)
    temporizadorBusquedaPaciente = null
  }
}

const pacienteYaVinculado = (pacienteUid) => {
  return pacientes.value.some(
    (paciente) =>
      paciente.uid === pacienteUid
  )
}

// Comprueba si al paciente ya se le envió una solicitud
// que todavía espera autorización.
const pacienteConSolicitudPendiente = (pacienteUid) => {
  return solicitudesPendientes.value.some(
    (solicitud) =>
      solicitud.pacienteUid === pacienteUid
  )
}

const ejecutarBusquedaPaciente = async () => {
  const texto =
    textoBusquedaPaciente.value.trim()

  mensajeBusquedaPaciente.value = ''
  tipoMensajeBusquedaPaciente.value = ''

  if (texto.length < 2) {
    resultadosBusquedaPaciente.value = []
    return
  }

  buscandoPaciente.value = true

  try {
    resultadosBusquedaPaciente.value =
      await buscarPacientesPorNombre(texto)

    if (
      resultadosBusquedaPaciente.value.length === 0
    ) {
      mensajeBusquedaPaciente.value =
        'No encontramos pacientes con ese nombre.'

      tipoMensajeBusquedaPaciente.value =
        'informacion'
    }
  } catch (error) {
    console.error(
      'Error al buscar pacientes:',
      error
    )

    resultadosBusquedaPaciente.value = []

    mensajeBusquedaPaciente.value =
      'No fue posible realizar la búsqueda.'

    tipoMensajeBusquedaPaciente.value =
      'error'
  } finally {
    buscandoPaciente.value = false
  }
}

// Busca automáticamente mientras el profesional escribe.
const alEscribirBusquedaPaciente = () => {
  if (temporizadorBusquedaPaciente) {
    clearTimeout(temporizadorBusquedaPaciente)
  }

  temporizadorBusquedaPaciente = setTimeout(
    () => {
      ejecutarBusquedaPaciente()
    },
    350
  )
}

const agregarPaciente = async (paciente) => {
  const profesionalUid =
    auth.currentUser?.uid

  if (!profesionalUid) {
    mensajeBusquedaPaciente.value =
      'Tu sesión terminó. Inicia sesión nuevamente.'

    tipoMensajeBusquedaPaciente.value =
      'error'

    return
  }

  if (
    pacienteYaVinculado(paciente.uid) ||
    pacienteConSolicitudPendiente(paciente.uid)
  ) {
    return
  }

  agregandoPacienteUid.value = paciente.uid
  mensajeBusquedaPaciente.value = ''
  tipoMensajeBusquedaPaciente.value = ''

  try {
    await vincularPaciente({
      profesionalUid,
      pacienteUid: paciente.uid,
    })

    await Promise.all([
      cargarPacientesVinculados(
        profesionalUid
      ),
      cargarSolicitudesPendientes(
        profesionalUid
      ),
    ])

    mensajeBusquedaPaciente.value =
      `Solicitud de seguimiento enviada a ${paciente.nombreCompleto}.`

    tipoMensajeBusquedaPaciente.value =
      'correcto'
  } catch (error) {
    console.error(
      'Error al enviar solicitud de seguimiento:',
      error
    )

    mensajeBusquedaPaciente.value =
      'No fue posible enviar la solicitud de seguimiento.'

    tipoMensajeBusquedaPaciente.value =
      'error'
  } finally {
    agregandoPacienteUid.value = ''
  }
}

// ----------------------------------------------------------
// QUITAR PACIENTE DEL SEGUIMIENTO
// ----------------------------------------------------------
// Importante:
// esto NO elimina la cuenta del paciente.
// Solo elimina la relación con este profesional.

const quitarPaciente = async (paciente) => {
  const profesionalUid =
    auth.currentUser?.uid

  if (!profesionalUid) {
    mensajeErrorPacientes.value =
      'Tu sesión terminó. Inicia sesión nuevamente.'
    return
  }

  const confirmar = window.confirm(
    `¿Deseas quitar a ${paciente.nombreCompleto} de tu seguimiento?`
  )

  if (!confirmar) {
    return
  }

  mensajeErrorPacientes.value = ''

  try {

    // El servicio busca el vínculo real en Firestore.
    // Esto funciona tanto para:
    //
    // 1. vínculos nuevos:
    //    profesionalUid_pacienteUid
    //
    // 2. vínculos antiguos con ID aleatorio.
    //
    // También elimina posibles duplicados del mismo vínculo.
    await eliminarPacienteVinculado({
      profesionalUid,
      pacienteUid: paciente.uid,
    })

    await cargarPacientesVinculados(
      profesionalUid
    )

  } catch (error) {

    console.error(
      'Error al quitar paciente:',
      error
    )

    mensajeErrorPacientes.value =
      error.message ||
      'No fue posible quitar al paciente.'
  }
}

// ----------------------------------------------------------
// ABRIR DETALLE DEL PACIENTE
// ----------------------------------------------------------

const abrirDetallePaciente = async (paciente) => {
  pacienteDetalle.value = paciente
  healthPaciente.value = null
  mensajeErrorHealthPaciente.value = ''

  opcionActiva.value = 'detalle-paciente'

  await cargarHealthPaciente(
    paciente.uid
  )
}

// ----------------------------------------------------------
// VOLVER A LA LISTA DE PACIENTES
// ----------------------------------------------------------

const volverAPacientes = () => {
  pacienteDetalle.value = null
  healthPaciente.value = null
  mensajeErrorHealthPaciente.value = ''

  seleccionarOpcion('pacientes')
}

// ----------------------------------------------------------
// CARGAR ÚLTIMO HEALTH CONNECT DEL PACIENTE
// ----------------------------------------------------------

const cargarHealthPaciente = async (
  pacienteUid
) => {
  cargandoHealthPaciente.value = true
  mensajeErrorHealthPaciente.value = ''

  try {

    // La API ahora devuelve dos cosas:
    // 1. paciente = información general guardada en usuarios/{uid}
    // 2. data = último registro de Health Connect
    const respuesta =
      await obtenerUltimoHealthPaciente(
        pacienteUid
      )

    // ------------------------------------------------------
    // ACTUALIZAR INFORMACIÓN GENERAL DEL PACIENTE
    // ------------------------------------------------------
    //
    // Conservamos los datos que ya tenía pacienteDetalle,
    // como uid o información del vínculo,
    // y agregamos los datos reales de usuarios/{uid}.
    // ------------------------------------------------------

    if (respuesta?.paciente) {

      pacienteDetalle.value = {

        ...pacienteDetalle.value,

        ...respuesta.paciente,
      }
    }

    // ------------------------------------------------------
    // HEALTH CONNECT
    // ------------------------------------------------------
    //
    // Si todavía no ha sincronizado datos,
    // aquí quedará null.
    // ------------------------------------------------------

    healthPaciente.value =
      respuesta?.data || null

  } catch (error) {

    console.error(
      'Error al consultar Health Connect del paciente:',
      error
    )

    healthPaciente.value = null

    mensajeErrorHealthPaciente.value =
      error.message ||
      'No fue posible consultar los datos de Health Connect.'

  } finally {

    cargandoHealthPaciente.value = false
  }
}

// ----------------------------------------------------------
// FORMATO DE SUEÑO
// ----------------------------------------------------------

const formatearMinutosSueno = (
  minutos
) => {
  const total =
    Number(minutos)

  if (
    !Number.isFinite(total) ||
    total < 0
  ) {
    return 'Sin datos'
  }

  const horas =
    Math.floor(
      total / 60
    )

  const minutosRestantes =
    Math.round(
      total % 60
    )

  if (horas === 0) {
    return `${minutosRestantes} min`
  }

  return `${horas} h ${minutosRestantes} min`
}

// ----------------------------------------------------------
// FORMATO DE FECHA DEL DOCUMENTO HEALTH CONNECT
// ----------------------------------------------------------

const formatearFechaHealth = (
  fecha
) => {
  if (
    typeof fecha !== 'string'
  ) {
    return 'Sin fecha'
  }

  const partes =
    fecha.split('-')

  if (partes.length !== 3) {
    return fecha
  }

  return `${partes[2]}/${partes[1]}/${partes[0]}`
}

// ----------------------------------------------------------
// FORMATO DE ÚLTIMA SINCRONIZACIÓN
// ----------------------------------------------------------
//
// Firebase Admin puede serializar Timestamp como:
// { seconds, nanoseconds }
// o:
// { _seconds, _nanoseconds }
//
// También aceptamos texto ISO por compatibilidad.
// ----------------------------------------------------------

const formatearUltimaSincronizacion = (
  valor,
  fechaDocumento = ''
) => {
  if (!valor) {
    return formatearFechaHealth(
      fechaDocumento
    )
  }

  let fecha = null

  if (
    typeof valor === 'string'
  ) {
    const temporal =
      new Date(valor)

    if (!Number.isNaN(temporal.getTime())) {
      fecha = temporal
    }
  } else if (
    typeof valor === 'object'
  ) {
    const segundos =
      valor.seconds ??
      valor._seconds

    if (
      Number.isFinite(
        Number(segundos)
      )
    ) {
      fecha =
        new Date(
          Number(segundos) * 1000
        )
    }
  }

  if (
    !fecha ||
    Number.isNaN(
      fecha.getTime()
    )
  ) {
    return formatearFechaHealth(
      fechaDocumento
    )
  }

  return fecha.toLocaleString(
    'es-MX',
    {
      dateStyle: 'medium',
      timeStyle: 'short',
    }
  )
}

// ----------------------------------------------------------
// CITAS
// ----------------------------------------------------------

const citas = ref([])
const cargandoCitas = ref(false)
const guardandoCita = ref(false)
const mostrarFormularioCita = ref(false)
const citaEnEdicion = ref(null)
const mensajeCitas = ref('')
const mensajeErrorCitas = ref('')

// En la vista de Citas reducimos el menú lateral para darle
// prioridad visual a la agenda. El doctor puede expandirlo
// temporalmente con el botón ☰.
const menuAgendaExpandido = ref(false)

// Vista interna de Citas.
// "agenda" muestra únicamente las citas activas.
// "historial" muestra canceladas, completadas o no asistidas.
const vistaCitas = ref('agenda')

// Día que sirve como referencia para la agenda semanal.
const hoyAgenda = new Date()
const fechaAgendaISO = ref(
  `${hoyAgenda.getFullYear()}-${String(hoyAgenda.getMonth() + 1).padStart(2, '0')}-${String(hoyAgenda.getDate()).padStart(2, '0')}`
)

const formularioCita = ref({
  pacienteUid: '',
  fecha: '',
  hora: '',
  motivo: '',
  modalidad: 'Presencial',
  lugar: '',
  notas: '',
  recordatorioActivo: true,
})


// ----------------------------------------------------------
// RESUMEN VISUAL DEL PACIENTE
// ----------------------------------------------------------
// Estos valores se calculan únicamente con información que ya
// existe en el perfil del paciente. Si falta un dato, se muestra —.
// ----------------------------------------------------------

const pesoPacienteDetalle = computed(() => {
  const valor =
    pacienteDetalle.value?.peso ??
    healthPaciente.value?.peso ??
    null

  if (valor == null || valor === '') {
    return null
  }

  const numero =
    Number(
      String(valor)
        .replace(',', '.')
        .replace(/[^0-9.]/g, '')
    )

  return Number.isFinite(numero)
    ? numero
    : null
})

const estaturaPacienteDetalle = computed(() => {
  const valor =
    pacienteDetalle.value?.estatura ??
    pacienteDetalle.value?.altura ??
    null

  if (valor == null || valor === '') {
    return null
  }

  const numero =
    Number(
      String(valor)
        .replace(',', '.')
        .replace(/[^0-9.]/g, '')
    )

  if (!Number.isFinite(numero)) {
    return null
  }

  return numero > 3
    ? numero / 100
    : numero
})

const imcPacienteDetalle = computed(() => {
  const imcGuardado =
    pacienteDetalle.value?.imc

  if (
    imcGuardado != null &&
    imcGuardado !== ''
  ) {
    const numero = Number(imcGuardado)

    if (Number.isFinite(numero)) {
      return numero.toFixed(1)
    }
  }

  const peso =
    pesoPacienteDetalle.value

  const estatura =
    estaturaPacienteDetalle.value

  if (!peso || !estatura) {
    return null
  }

  return (
    peso /
    (estatura * estatura)
  ).toFixed(1)
})

// ----------------------------------------------------------
// CALENDARIO VISUAL PARA PROGRAMAR CITAS
// ----------------------------------------------------------
// La API sigue recibiendo exactamente los mismos campos.
// El calendario y los botones de hora solamente facilitan al
// profesional llenar formularioCita.fecha y formularioCita.hora.
// ----------------------------------------------------------

const mesCalendarioCita = ref(
  new Date(
    new Date().getFullYear(),
    new Date().getMonth(),
    1
  )
)

const horariosCitaRapidos = [
  '08:00',
  '08:30',
  '09:00',
  '09:30',
  '10:00',
  '10:30',
  '11:00',
  '11:30',
  '12:00',
  '14:00',
  '14:30',
  '15:00',
  '15:30',
  '16:00',
  '16:30',
]

const tituloMesCalendarioCita = computed(() => {
  const texto =
    mesCalendarioCita.value
      .toLocaleDateString(
        'es-MX',
        {
          month: 'long',
          year: 'numeric',
        }
      )

  return texto.charAt(0).toUpperCase() + texto.slice(1)
})

const fechaSeleccionadaTexto = computed(() => {
  if (!formularioCita.value.fecha) {
    return 'Selecciona una fecha'
  }

  const [anio, mes, dia] =
    formularioCita.value.fecha
      .split('-')
      .map(Number)

  const fecha =
    new Date(
      anio,
      mes - 1,
      dia
    )

  return fecha.toLocaleDateString(
    'es-MX',
    {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }
  )
})

const diasCalendarioCita = computed(() => {
  const anio =
    mesCalendarioCita.value.getFullYear()

  const mes =
    mesCalendarioCita.value.getMonth()

  const primero =
    new Date(anio, mes, 1)

  // lunes = 0 ... domingo = 6
  const desplazamiento =
    (primero.getDay() + 6) % 7

  const inicio =
    new Date(
      anio,
      mes,
      1 - desplazamiento
    )

  return Array.from(
    { length: 42 },
    (_, indice) => {
      const fecha =
        new Date(
          inicio.getFullYear(),
          inicio.getMonth(),
          inicio.getDate() + indice
        )

      const yyyy = fecha.getFullYear()
      const mm = String(fecha.getMonth() + 1).padStart(2, '0')
      const dd = String(fecha.getDate()).padStart(2, '0')
      const valor = `${yyyy}-${mm}-${dd}`

      return {
        valor,
        dia: fecha.getDate(),
        esMesActual:
          fecha.getMonth() === mes,
        seleccionado:
          formularioCita.value.fecha === valor,
      }
    }
  )
})

const cambiarMesCalendarioCita = (cantidad) => {
  mesCalendarioCita.value =
    new Date(
      mesCalendarioCita.value.getFullYear(),
      mesCalendarioCita.value.getMonth() + cantidad,
      1
    )
}

const seleccionarFechaCalendarioCita = (fecha) => {
  formularioCita.value.fecha = fecha
}

const seleccionarHoraCita = (hora) => {
  formularioCita.value.hora = hora
}

const horarioCitaOcupado = (hora) => {
  if (!formularioCita.value.fecha) {
    return false
  }

  const fechaApi =
    convertirFechaParaApi(
      formularioCita.value.fecha
    )

  return citas.value.some(
    (cita) =>
      cita.id !== citaEnEdicion.value?.id &&
      cita.fecha === fechaApi &&
      cita.hora === hora &&
      cita.estado !== 'cancelada'
  )
}


// ----------------------------------------------------------
// AGENDA SEMANAL DEL PROFESIONAL
// ----------------------------------------------------------
// Esta parte es solamente una representación visual de las
// mismas citas que ya obtiene la API. No crea otra colección.
// ----------------------------------------------------------

const convertirIsoAFechaApi = (fechaIso) => {
  if (!fechaIso) return ''

  const [anio, mes, dia] =
    String(fechaIso).split('-')

  return `${dia}/${mes}/${anio}`
}

const crearFechaLocalDesdeIso = (fechaIso) => {
  const [anio, mes, dia] =
    String(fechaIso)
      .split('-')
      .map(Number)

  return new Date(
    anio,
    mes - 1,
    dia
  )
}

const fechaLocalAIso = (fecha) => {
  return [
    fecha.getFullYear(),
    String(fecha.getMonth() + 1).padStart(2, '0'),
    String(fecha.getDate()).padStart(2, '0'),
  ].join('-')
}

const inicioSemanaAgenda = computed(() => {
  const fecha =
    crearFechaLocalDesdeIso(
      fechaAgendaISO.value
    )

  const desplazamiento =
    (fecha.getDay() + 6) % 7

  return new Date(
    fecha.getFullYear(),
    fecha.getMonth(),
    fecha.getDate() - desplazamiento
  )
})

const diasSemanaAgenda = computed(() => {
  const nombres = [
    'Lun',
    'Mar',
    'Mié',
    'Jue',
    'Vie',
    'Sáb',
    'Dom',
  ]

  const hoy = new Date()
  const hoyIso = fechaLocalAIso(hoy)

  return Array.from(
    { length: 7 },
    (_, indice) => {
      const fecha = new Date(
        inicioSemanaAgenda.value.getFullYear(),
        inicioSemanaAgenda.value.getMonth(),
        inicioSemanaAgenda.value.getDate() + indice
      )

      const iso = fechaLocalAIso(fecha)

      return {
        iso,
        api: convertirIsoAFechaApi(iso),
        nombre: nombres[indice],
        numero: fecha.getDate(),
        hoy: iso === hoyIso,
        seleccionado:
          iso === fechaAgendaISO.value,
      }
    }
  )
})

const tituloSemanaAgenda = computed(() => {
  const inicio = diasSemanaAgenda.value[0]
  const fin = diasSemanaAgenda.value[6]

  if (!inicio || !fin) return ''

  const fechaInicio =
    crearFechaLocalDesdeIso(inicio.iso)

  const fechaFin =
    crearFechaLocalDesdeIso(fin.iso)

  const mesInicio =
    fechaInicio.toLocaleDateString(
      'es-MX',
      { month: 'short' }
    )

  const mesFin =
    fechaFin.toLocaleDateString(
      'es-MX',
      { month: 'short' }
    )

  if (
    fechaInicio.getMonth() ===
    fechaFin.getMonth()
  ) {
    return `${fechaInicio.getDate()} - ${fechaFin.getDate()} ${mesFin} ${fechaFin.getFullYear()}`
  }

  return `${fechaInicio.getDate()} ${mesInicio} - ${fechaFin.getDate()} ${mesFin} ${fechaFin.getFullYear()}`
})

const horasAgendaSemana = [
  '08:00',
  '08:30',
  '09:00',
  '09:30',
  '10:00',
  '10:30',
  '11:00',
  '11:30',
  '12:00',
  '12:30',
  '13:00',
  '13:30',
  '14:00',
  '14:30',
  '15:00',
  '15:30',
  '16:00',
  '16:30',
  '17:00',
  '17:30',
  '18:00',
]

const citasEnCeldaAgenda = (
  diaApi,
  hora
) => {
  return citas.value.filter(
    (cita) =>
      cita.fecha === diaApi &&
      cita.hora === hora &&
      !estadosHistorialCitas.includes(cita.estado)
  )
}

const seleccionarDiaAgenda = (fechaIso) => {
  fechaAgendaISO.value = fechaIso

  const fecha =
    crearFechaLocalDesdeIso(fechaIso)

  mesCalendarioCita.value =
    new Date(
      fecha.getFullYear(),
      fecha.getMonth(),
      1
    )
}

const moverSemanaAgenda = (cantidad) => {
  const fecha =
    crearFechaLocalDesdeIso(
      fechaAgendaISO.value
    )

  fecha.setDate(
    fecha.getDate() +
    cantidad * 7
  )

  seleccionarDiaAgenda(
    fechaLocalAIso(fecha)
  )
}

const irSemanaActual = () => {
  seleccionarDiaAgenda(
    fechaLocalAIso(
      new Date()
    )
  )
}

const abrirNuevaCitaDesdeAgenda = (
  fechaIso = fechaAgendaISO.value,
  hora = ''
) => {
  abrirFormularioCita()

  formularioCita.value.fecha =
    fechaIso

  formularioCita.value.hora =
    hora

  seleccionarDiaAgenda(fechaIso)
}

const abrirCitaDesdeAgenda = (cita) => {
  abrirEditarCita(cita)

  if (formularioCita.value.fecha) {
    seleccionarDiaAgenda(
      formularioCita.value.fecha
    )
  }
}

const alternarMenuAgenda = () => {
  menuAgendaExpandido.value =
    !menuAgendaExpandido.value
}

// ----------------------------------------------------------
// CITAS QUE REQUIEREN ATENCIÓN DEL PROFESIONAL
// ----------------------------------------------------------

const citasConReagenda = computed(
  () =>
    citas.value.filter(
      (cita) =>
        cita.estado ===
        'reagenda_solicitada'
    )
)


// ----------------------------------------------------------
// AGENDA ACTIVA / HISTORIAL
// ----------------------------------------------------------

const estadosHistorialCitas = [
  'cancelada',
  'completada',
  'no_asistio',
]

const citasHistorialDoctor = computed(() => {
  return citas.value
    .filter((cita) =>
      estadosHistorialCitas.includes(cita.estado)
    )
    .slice()
    .sort((a, b) => {
      const convertir = (cita) => {
        try {
          const [dia, mes, anio] =
            String(cita.fecha || '').split('/')

          return new Date(
            `${anio}-${mes}-${dia}T${cita.hora || '00:00'}:00`
          ).getTime()
        } catch {
          return 0
        }
      }

      return convertir(b) - convertir(a)
    })
})

const mostrarAgendaCitas = () => {
  vistaCitas.value = 'agenda'
}

const mostrarHistorialCitas = () => {
  vistaCitas.value = 'historial'
  mostrarFormularioCita.value = false
  citaEnEdicion.value = null
}

// ----------------------------------------------------------
// RESUMEN DEL PANEL
// ----------------------------------------------------------

const resumen = computed(() => {
  const hoy = new Date()

  const dia = String(hoy.getDate()).padStart(2, '0')
  const mes = String(hoy.getMonth() + 1).padStart(2, '0')
  const anio = hoy.getFullYear()

  const fechaHoy = `${dia}/${mes}/${anio}`

  return {
    pacientes: pacientes.value.length,
    riesgo: 0,
    citasHoy: citas.value.filter(
      (cita) =>
        cita.fecha === fechaHoy &&
        cita.estado !== 'cancelada'
    ).length,
  }
})


// ----------------------------------------------------------
// DATOS VISUALES DEL PRINCIPAL
// ----------------------------------------------------------
// Solo reorganizan información que ya existe.
// No cambian ninguna regla del sistema.
// ----------------------------------------------------------

const fechaHoyTexto = computed(() => {
  return new Date().toLocaleDateString(
    'es-MX',
    {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }
  )
})

const citasHoyLista = computed(() => {
  const hoy = new Date()
  const dia = String(hoy.getDate()).padStart(2, '0')
  const mes = String(hoy.getMonth() + 1).padStart(2, '0')
  const anio = hoy.getFullYear()
  const fechaHoy = `${dia}/${mes}/${anio}`

  return citas.value
    .filter(
      (cita) =>
        cita.fecha === fechaHoy &&
        cita.estado !== 'cancelada'
    )
    .sort((a, b) =>
      String(a.hora || '').localeCompare(
        String(b.hora || '')
      )
    )
})

const solicitudesPendientesTotal = computed(() =>
  citasConReagenda.value.length +
  solicitudesPendientes.value.length
)

const citasReagendaPreview = computed(() =>
  citasConReagenda.value.slice(0, 2)
)

const seguimientosPendientesPreview = computed(() =>
  solicitudesPendientes.value.slice(0, 2)
)

// ----------------------------------------------------------
// DATOS MOSTRADOS
// ----------------------------------------------------------

const primerNombreDoctor = computed(() => {
  const nombre = datosDoctor.value.nombreCompleto?.trim()

  if (!nombre) return 'Doctor'

  return nombre.split(' ')[0]
})

const nombreProfesional = computed(() => {
  return datosDoctor.value.nombreCompleto || 'Nombre no registrado'
})

const especialidadProfesional = computed(() => {
  return datosDoctor.value.especialidad || 'No especificada'
})

const profesionRegistrada = computed(() => {
  return (
    datosDoctor.value.profesionRegistrada ||
    'Profesión no registrada'
  )
})

const cedulaProfesional = computed(() => {
  return datosDoctor.value.cedulaProfesional || 'No registrada'
})

const telefonoConsultorio = computed(() => {
  return datosDoctor.value.consultorio?.telefono || 'No registrado'
})

const ubicacionConsultorio = computed(() => {
  return datosDoctor.value.consultorio?.ubicacion || 'No registrada'
})

const horarioConsultorio = computed(() => {
  return datosDoctor.value.consultorio?.horarioAtencion || 'No registrado'
})

// ----------------------------------------------------------
// PRIVACIDAD Y LEGAL
// ----------------------------------------------------------

const abrirDocumentoLegal = (tipo) => {
  documentoLegalAbierto.value = tipo
}

const cerrarDocumentoLegal = () => {
  documentoLegalAbierto.value = ''
}

const fechaAceptacionLegalTexto = computed(() => {
  const valor =
    consentimientoLegalActual.value?.fechaAceptacion

  if (!valor) {
    return 'No registrada'
  }

  try {
    const fecha =
      typeof valor?.toDate === 'function'
        ? valor.toDate()
        : new Date(valor)

    if (Number.isNaN(fecha.getTime())) {
      return 'No registrada'
    }

    return fecha.toLocaleString(
      'es-MX',
      {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }
    )
  } catch {
    return 'No registrada'
  }
})

const consentimientoLegalVigente = computed(() => {
  const consentimiento = consentimientoLegalActual.value

  return Boolean(
    consentimiento?.avisoPrivacidadAceptado === true &&
    consentimiento?.avisoPrivacidadVersion === VERSION_AVISO_PRIVACIDAD &&
    consentimiento?.terminosAceptados === true &&
    consentimiento?.terminosVersion === VERSION_TERMINOS &&
    consentimiento?.compromisoConfidencialidadProfesional === true
  )
})

const revisarConsentimientoLegal = async (usuario) => {
  consentimientoLegalCargado.value = false
  mensajeErrorConsentimientoLegal.value = ''

  try {
    const referencia =
      doc(db, 'usuarios', usuario.uid)

    const documento =
      await getDoc(referencia)

    const consentimiento =
      documento.exists()
        ? documento.data()?.consentimientoLegal || null
        : null

    consentimientoLegalActual.value =
      consentimiento

    const vigente = Boolean(
      consentimiento?.avisoPrivacidadAceptado === true &&
      consentimiento?.avisoPrivacidadVersion === VERSION_AVISO_PRIVACIDAD &&
      consentimiento?.terminosAceptados === true &&
      consentimiento?.terminosVersion === VERSION_TERMINOS &&
      consentimiento?.compromisoConfidencialidadProfesional === true
    )

    mostrarConsentimientoLegal.value =
      !vigente

    if (vigente) {
      aceptoAvisoPrivacidad.value = true
      aceptoTerminosCondiciones.value = true
      aceptoConfidencialidadProfesional.value = true
    } else {
      aceptoAvisoPrivacidad.value = false
      aceptoTerminosCondiciones.value = false
      aceptoConfidencialidadProfesional.value = false
    }
  } catch (error) {
    console.error(
      'Error al revisar consentimiento legal:',
      error
    )

    // Si no podemos comprobar una aceptación vigente,
    // mostramos el aviso en vez de asumir que ya aceptó.
    mostrarConsentimientoLegal.value = true
    mensajeErrorConsentimientoLegal.value =
      'No fue posible comprobar tu aceptación anterior. Revisa los documentos e inténtalo nuevamente.'
  } finally {
    consentimientoLegalCargado.value = true
  }
}

const rechazarConsentimientoLegal = async () => {
  mensajeErrorConsentimientoLegal.value = ''

  // El panel profesional necesita tratar información de pacientes.
  // Si el profesional no acepta las condiciones legales, no permitimos
  // continuar dentro del panel y cerramos la sesión actual.
  mostrarConsentimientoLegal.value = false

  try {
    await cerrarSesion()
  } catch (error) {
    console.error(
      'Error al cerrar sesión después de rechazar el consentimiento:',
      error
    )

    router.push('/iniciar-sesion')
  }
}


const guardarConsentimientoLegal = async () => {
  mensajeErrorConsentimientoLegal.value = ''

  if (
    !aceptoAvisoPrivacidad.value ||
    !aceptoTerminosCondiciones.value ||
    !aceptoConfidencialidadProfesional.value
  ) {
    mensajeErrorConsentimientoLegal.value =
      'Debes revisar y aceptar las tres declaraciones para continuar.'
    return
  }

  const usuario = auth.currentUser

  if (!usuario) {
    mensajeErrorConsentimientoLegal.value =
      'Tu sesión terminó. Inicia sesión nuevamente.'
    return
  }

  guardandoConsentimientoLegal.value = true

  try {
    const consentimiento = {
      avisoPrivacidadAceptado: true,
      avisoPrivacidadVersion: VERSION_AVISO_PRIVACIDAD,
      terminosAceptados: true,
      terminosVersion: VERSION_TERMINOS,
      compromisoConfidencialidadProfesional: true,
      estadoConsentimiento: 'activo',
      medioAceptacion: 'web-panel-profesional',
      fechaAceptacion: serverTimestamp(),
    }

    await setDoc(
      doc(db, 'usuarios', usuario.uid),
      {
        consentimientoLegal: consentimiento,
      },
      {
        merge: true,
      }
    )

    // Conservamos una copia local para actualizar Mi cuenta
    // inmediatamente. Volvemos a consultar para recibir el
    // Timestamp generado por Firestore.
    const documentoActualizado = await getDoc(
      doc(db, 'usuarios', usuario.uid)
    )

    consentimientoLegalActual.value =
      documentoActualizado.data()?.consentimientoLegal ||
      consentimiento

    mostrarConsentimientoLegal.value = false
  } catch (error) {
    console.error(
      'Error al guardar consentimiento legal:',
      error
    )

    mensajeErrorConsentimientoLegal.value =
      'No fue posible guardar tu aceptación. Intenta nuevamente.'
  } finally {
    guardandoConsentimientoLegal.value = false
  }
}

// ----------------------------------------------------------
// NAVEGACIÓN INTERNA
// ----------------------------------------------------------

const seleccionarOpcion = (opcion) => {
  opcionActiva.value = opcion

  // La agenda inicia con el menú reducido para aprovechar el ancho.
  // Al salir de Citas recuperamos el menú normal.
  if (opcion === 'citas') {
    menuAgendaExpandido.value = false
  } else {
    mostrarFormularioCita.value = false
    citaEnEdicion.value = null
  }

  mensajeCuenta.value = ''
  mensajeErrorCuenta.value = ''

  // Si sale de Mi cuenta, cancelamos una edición sin guardar.
  if (opcion !== 'mi-cuenta') {
    cancelarEdicionCuenta()
  }

  if (opcion === 'pacientes' && auth.currentUser) {
    cargarPacientesVinculados(
      auth.currentUser.uid
    )

    cargarSolicitudesPendientes(
      auth.currentUser.uid
    )
  }

  if (opcion === 'citas') {
    cargarCitas()
  }

  // Al volver a Principal recargamos las citas desde la API.
  // Así, si el paciente confirmó desde Android, la agenda del
  // doctor se actualiza sin tener que entrar primero a Citas.
  if (opcion === 'principal') {
    cargarCitas()
  }
}

const irMiCuenta = () => {
  seleccionarOpcion('mi-cuenta')
}

// ----------------------------------------------------------
// CARGAR CUENTA DEL DOCTOR
// ----------------------------------------------------------

const cargarCuentaDoctor = async (usuario) => {
  cargandoCuenta.value = true

  try {
    const referencia = doc(db, 'usuarios', usuario.uid)
    const documento = await getDoc(referencia)

    if (!documento.exists()) {
      mensajeErrorCuenta.value =
        'No se encontró la información profesional de esta cuenta.'

      cargandoCuenta.value = false
      return
    }

    const datos = documento.data()

    // El panel acepta cuentas profesionales nuevas
    // y también cuentas antiguas con rol "doctor".
    const esProfesional =
      datos.rol === 'profesional_salud' ||
      datos.rol === 'doctor'

    if (!esProfesional) {
      await cerrarSesionUsuario()
      router.push('/iniciar-sesion')
      return
    }

    datosDoctor.value = {
      uid: usuario.uid,
      nombreCompleto: datos.nombreCompleto || '',
      correo: datos.correo || usuario.email || '',
      profesionRegistrada:
        datos.profesionRegistrada || '',
      especialidad: datos.especialidad || '',
      cedulaProfesional: datos.cedulaProfesional || '',
      formacionAdicional: Array.isArray(datos.formacionAdicional)
        ? datos.formacionAdicional
        : [],
      tieneConsultorio: Boolean(datos.tieneConsultorio),
      consultorio: {
        ubicacion: datos.consultorio?.ubicacion || '',
        horarioAtencion:
          datos.consultorio?.horarioAtencion || '',
        telefono: datos.consultorio?.telefono || '',
      },
    }

    // También actualizamos/creamos el perfil público.
    // De esta forma las cuentas profesionales antiguas
    // quedan reparadas automáticamente al entrar al panel.
    await sincronizarPerfilProfesional(
      usuario.uid,
      {
        nombreCompleto:
          datos.nombreCompleto || '',

        profesionRegistrada:
          datos.profesionRegistrada || '',

        especialidad:
          datos.especialidad || '',

        cedulaProfesional:
          datos.cedulaProfesional || '',

        cedulaVerificada:
          Boolean(datos.cedulaVerificada),

        institucionRegistro:
          datos.institucionRegistro || null,

        anioRegistro:
          datos.anioRegistro || null,

        formacionAdicional:
          Array.isArray(datos.formacionAdicional)
            ? datos.formacionAdicional
            : [],

        tieneConsultorio:
          Boolean(datos.tieneConsultorio),

        consultorio:
          datos.consultorio || null,
      }
    )
  } catch (error) {
    console.error('Error al cargar la cuenta profesional:', error)

    mensajeErrorCuenta.value =
      'No se pudo cargar la información de la cuenta.'
  } finally {
    cargandoCuenta.value = false
  }
}

// ----------------------------------------------------------
// EDITAR CUENTA
// ----------------------------------------------------------

const activarEdicionCuenta = () => {
  formularioDoctor.value = {
    nombreCompleto: datosDoctor.value.nombreCompleto,
    especialidad: datosDoctor.value.especialidad,
    cedulaProfesional: datosDoctor.value.cedulaProfesional,
    tieneConsultorio: datosDoctor.value.tieneConsultorio,
    ubicacion:
      datosDoctor.value.consultorio?.ubicacion || '',
    horarioAtencion:
      datosDoctor.value.consultorio?.horarioAtencion || '',
    telefono:
      datosDoctor.value.consultorio?.telefono || '',
  }

  erroresCuenta.value = {}
  mensajeCuenta.value = ''
  mensajeErrorCuenta.value = ''
  editandoCuenta.value = true
}

const cancelarEdicionCuenta = () => {
  editandoCuenta.value = false
  erroresCuenta.value = {}
}

// ----------------------------------------------------------
// VALIDACIÓN
// ----------------------------------------------------------

const validarCuentaDoctor = () => {
  const errores = {}

  if (!formularioDoctor.value.nombreCompleto.trim()) {
    errores.nombreCompleto =
      'Ingresa tu nombre completo.'
  }

  if (!formularioDoctor.value.especialidad.trim()) {
    errores.especialidad =
      'Ingresa tu especialidad o subespecialidad.'
  }

  const cedula =
    formularioDoctor.value.cedulaProfesional.trim()

  if (!cedula) {
    errores.cedulaProfesional =
      'Ingresa tu cédula profesional.'
  } else if (!/^\d{5,12}$/.test(cedula)) {
    errores.cedulaProfesional =
      'Ingresa únicamente los números de tu cédula.'
  }

  if (formularioDoctor.value.tieneConsultorio) {
    if (!formularioDoctor.value.ubicacion.trim()) {
      errores.ubicacion =
        'Ingresa la ubicación del consultorio.'
    }

    if (!formularioDoctor.value.horarioAtencion.trim()) {
      errores.horarioAtencion =
        'Ingresa el horario de atención.'
    }

    const telefono =
      formularioDoctor.value.telefono
        .replace(/\D/g, '')

    if (!telefono) {
      errores.telefono =
        'Ingresa un número de teléfono.'
    } else if (telefono.length !== 10) {
      errores.telefono =
        'El teléfono debe contener 10 dígitos.'
    }
  }

  erroresCuenta.value = errores

  return Object.keys(errores).length === 0
}

// ----------------------------------------------------------
// SINCRONIZAR PERFIL PÚBLICO DEL PROFESIONAL
// ----------------------------------------------------------
// "usuarios/{uid}" contiene la información privada/completa
// de la cuenta.
//
// "perfiles_profesionales/{uid}" contiene únicamente los
// datos profesionales que puede consultar el paciente desde
// "Mi seguimiento".
//
// Esta función mantiene ambos documentos sincronizados.
// ----------------------------------------------------------

const sincronizarPerfilProfesional = async (
  uid,
  cambios = {}
) => {
  if (!uid) {
    return
  }

  await setDoc(
    doc(
      db,
      'perfiles_profesionales',
      uid
    ),
    {
      uid,
      ...cambios,
    },
    {
      merge: true,
    }
  )
}

// ----------------------------------------------------------
// GUARDAR CUENTA EN FIRESTORE
// ----------------------------------------------------------

const guardarCuentaDoctor = async () => {
  mensajeCuenta.value = ''
  mensajeErrorCuenta.value = ''

  if (!validarCuentaDoctor()) {
    return
  }

  const usuario = auth.currentUser

  if (!usuario) {
    mensajeErrorCuenta.value =
      'Tu sesión terminó. Inicia sesión nuevamente.'
    return
  }

  guardandoCuenta.value = true

  try {
    const tieneConsultorio =
      formularioDoctor.value.tieneConsultorio

    const telefonoLimpio =
      formularioDoctor.value.telefono
        .replace(/\D/g, '')

    const datosActualizados = {
      nombreCompleto:
        formularioDoctor.value.nombreCompleto.trim(),

      especialidad:
        formularioDoctor.value.especialidad.trim(),

      cedulaProfesional:
        formularioDoctor.value.cedulaProfesional.trim(),

      tieneConsultorio,

      // Si no tiene consultorio se guarda null.
      consultorio: tieneConsultorio
        ? {
            ubicacion:
              formularioDoctor.value.ubicacion.trim(),

            horarioAtencion:
              formularioDoctor.value.horarioAtencion.trim(),

            telefono: telefonoLimpio,
          }
        : null,
    }

    // merge:true conserva correo, uid, rol, fechaRegistro
    // y cualquier otro dato existente.
    await setDoc(
      doc(db, 'usuarios', usuario.uid),
      datosActualizados,
      { merge: true }
    )

    // Sincronizamos los mismos datos visibles para el
    // paciente en perfiles_profesionales/{uid}.
    await sincronizarPerfilProfesional(
      usuario.uid,
      {
        nombreCompleto:
          datosActualizados.nombreCompleto,

        especialidad:
          datosActualizados.especialidad,

        cedulaProfesional:
          datosActualizados.cedulaProfesional,

        tieneConsultorio:
          datosActualizados.tieneConsultorio,

        consultorio:
          datosActualizados.consultorio,
      }
    )

    datosDoctor.value = {
      ...datosDoctor.value,
      ...datosActualizados,
      consultorio:
        datosActualizados.consultorio || {
          ubicacion: '',
          horarioAtencion: '',
          telefono: '',
        },
    }

    editandoCuenta.value = false

    mensajeCuenta.value =
      'Información profesional actualizada correctamente.'
  } catch (error) {
    console.error(
      'Error al guardar la cuenta profesional:',
      error
    )

    mensajeErrorCuenta.value =
      'No se pudieron guardar los cambios. Inténtalo nuevamente.'
  } finally {
    guardandoCuenta.value = false
  }
}

// ----------------------------------------------------------
// FORMACIÓN ACADÉMICA ADICIONAL
// ----------------------------------------------------------

const abrirFormularioFormacion = () => {
  formularioFormacion.value = {
    tipo: 'Maestría',
    nombre: '',
    institucion: '',
    anio: '',
    tieneCedula: false,
    cedulaProfesional: '',
  }

  erroresFormacion.value = {}
  estadoCedulaFormacion.value = 'sin-verificar'
  mensajeCedulaFormacion.value = ''
  datosCedulaFormacion.value = null

  mostrarFormularioFormacion.value = true
}

const cancelarFormacion = () => {
  mostrarFormularioFormacion.value = false
  erroresFormacion.value = {}
  estadoCedulaFormacion.value = 'sin-verificar'
  mensajeCedulaFormacion.value = ''
  datosCedulaFormacion.value = null
}

const alCambiarCedulaFormacion = () => {
  formularioFormacion.value.cedulaProfesional =
    formularioFormacion.value.cedulaProfesional
      .replace(/\D/g, '')

  estadoCedulaFormacion.value = 'sin-verificar'
  mensajeCedulaFormacion.value = ''
  datosCedulaFormacion.value = null

  if (erroresFormacion.value.cedulaProfesional) {
    delete erroresFormacion.value.cedulaProfesional
  }
}

const quitarCedulaFormacion = () => {
  formularioFormacion.value.tieneCedula = false
  formularioFormacion.value.cedulaProfesional = ''

  estadoCedulaFormacion.value = 'sin-verificar'
  mensajeCedulaFormacion.value = ''
  datosCedulaFormacion.value = null

  if (erroresFormacion.value.cedulaProfesional) {
    delete erroresFormacion.value.cedulaProfesional
  }
}

const verificarCedulaFormacion = async () => {
  const cedula =
    formularioFormacion.value.cedulaProfesional.trim()

  const nombreCompleto =
    datosDoctor.value.nombreCompleto.trim()

  mensajeCedulaFormacion.value = ''
  datosCedulaFormacion.value = null

  if (!/^\d{7,8}$/.test(cedula)) {
    estadoCedulaFormacion.value = 'no-encontrada'

    erroresFormacion.value.cedulaProfesional =
      'La cédula debe contener 7 u 8 dígitos.'

    return
  }

  delete erroresFormacion.value.cedulaProfesional

  estadoCedulaFormacion.value = 'verificando'

  try {
    const datos = await verificarCedulaProfesional({
      cedula,
      nombreCompleto,
    })

    if (!datos.valida) {
      estadoCedulaFormacion.value = 'no-encontrada'

      mensajeCedulaFormacion.value =
        datos.mensaje ||
        'No fue posible verificar esta cédula.'

      return
    }

    estadoCedulaFormacion.value = 'verificada'
    datosCedulaFormacion.value = datos.profesional

    mensajeCedulaFormacion.value =
      'Cédula de esta formación verificada correctamente.'
  } catch (error) {
    console.error(
      'Error al verificar cédula de formación:',
      error
    )

    estadoCedulaFormacion.value = 'no-encontrada'
    mensajeCedulaFormacion.value =
      'No se pudo conectar con el servicio de verificación.'
  }
}

const validarFormacion = () => {
  const errores = {}

  if (!formularioFormacion.value.tipo) {
    errores.tipo =
      'Selecciona el tipo de formación.'
  }

  if (!formularioFormacion.value.nombre.trim()) {
    errores.nombre =
      'Ingresa el nombre del estudio o formación.'
  }

  if (!formularioFormacion.value.institucion.trim()) {
    errores.institucion =
      'Ingresa la institución.'
  }

  const anio =
    formularioFormacion.value.anio.trim()

  if (
    anio &&
    !/^\d{4}$/.test(anio)
  ) {
    errores.anio =
      'Ingresa un año válido de 4 dígitos.'
  }

  if (formularioFormacion.value.tieneCedula) {
    const cedula =
      formularioFormacion.value.cedulaProfesional.trim()

    if (!cedula) {
      errores.cedulaProfesional =
        'Ingresa la cédula de esta formación.'
    } else if (!/^\d{7,8}$/.test(cedula)) {
      errores.cedulaProfesional =
        'La cédula debe contener 7 u 8 dígitos.'
    } else if (
      estadoCedulaFormacion.value !== 'verificada'
    ) {
      errores.cedulaProfesional =
        'Verifica esta cédula antes de guardar.'
    }
  }

  erroresFormacion.value = errores

  return Object.keys(errores).length === 0
}

const guardarFormacion = async () => {
  if (!validarFormacion()) {
    return
  }

  const usuario = auth.currentUser

  if (!usuario) {
    mensajeErrorCuenta.value =
      'Tu sesión terminó. Inicia sesión nuevamente.'
    return
  }

  guardandoFormacion.value = true

  try {
    const nuevaFormacion = {
      id: `${Date.now()}`,

      tipo:
        formularioFormacion.value.tipo,

      nombre:
        formularioFormacion.value.nombre.trim(),

      institucion:
        formularioFormacion.value.institucion.trim(),

      anio:
        formularioFormacion.value.anio.trim() || null,

      tieneCedula:
        formularioFormacion.value.tieneCedula,

      cedulaProfesional:
        formularioFormacion.value.tieneCedula
          ? formularioFormacion.value.cedulaProfesional.trim()
          : null,

      verificada:
        formularioFormacion.value.tieneCedula
          ? estadoCedulaFormacion.value === 'verificada'
          : false,

      profesionRegistrada:
        formularioFormacion.value.tieneCedula
          ? datosCedulaFormacion.value?.profesion || null
          : null,

      institucionRegistro:
        formularioFormacion.value.tieneCedula
          ? datosCedulaFormacion.value?.institucion || null
          : null,
    }

    const nuevaLista = [
      ...datosDoctor.value.formacionAdicional,
      nuevaFormacion,
    ]

    await setDoc(
      doc(db, 'usuarios', usuario.uid),
      {
        formacionAdicional: nuevaLista,
      },
      {
        merge: true,
      }
    )

    // La formación también forma parte del perfil
    // profesional que consulta el paciente.
    await sincronizarPerfilProfesional(
      usuario.uid,
      {
        formacionAdicional:
          nuevaLista,
      }
    )

    datosDoctor.value.formacionAdicional =
      nuevaLista

    mensajeCuenta.value =
      'Formación académica agregada correctamente.'

    cancelarFormacion()
  } catch (error) {
    console.error(
      'Error al guardar formación adicional:',
      error
    )

    mensajeErrorCuenta.value =
      'No se pudo guardar la formación académica.'
  } finally {
    guardandoFormacion.value = false
  }
}

const eliminarFormacion = async (id) => {
  const usuario = auth.currentUser

  if (!usuario) {
    return
  }

  const confirmar = window.confirm(
    '¿Deseas eliminar esta formación académica?'
  )

  if (!confirmar) {
    return
  }

  try {
    const nuevaLista =
      datosDoctor.value.formacionAdicional.filter(
        (formacion) =>
          formacion.id !== id
      )

    await setDoc(
      doc(db, 'usuarios', usuario.uid),
      {
        formacionAdicional: nuevaLista,
      },
      {
        merge: true,
      }
    )

    await sincronizarPerfilProfesional(
      usuario.uid,
      {
        formacionAdicional:
          nuevaLista,
      }
    )

    datosDoctor.value.formacionAdicional =
      nuevaLista

    mensajeCuenta.value =
      'Formación eliminada correctamente.'
  } catch (error) {
    console.error(
      'Error al eliminar formación:',
      error
    )

    mensajeErrorCuenta.value =
      'No se pudo eliminar la formación.'
  }
}

// ----------------------------------------------------------
// CITAS - FUNCIONES
// ----------------------------------------------------------

const cargarCitas = async () => {
  cargandoCitas.value = true
  mensajeErrorCitas.value = ''

  try {
    citas.value = await obtenerCitas()
  } catch (error) {
    console.error('Error al cargar citas:', error)
    mensajeErrorCitas.value =
      error.message || 'No fue posible cargar las citas.'
  } finally {
    cargandoCitas.value = false
  }
}

const abrirFormularioCita = () => {
  citaEnEdicion.value = null
  mensajeCitas.value = ''
  mensajeErrorCitas.value = ''

  formularioCita.value = {
    pacienteUid:
      pacientes.value.length === 1
        ? pacientes.value[0].uid
        : '',
    fecha: '',
    hora: '',
    motivo: '',
    modalidad: 'Presencial',
    lugar: '',
    notas: '',
    recordatorioActivo: true,
  }

  mesCalendarioCita.value =
    new Date(
      new Date().getFullYear(),
      new Date().getMonth(),
      1
    )

  mostrarFormularioCita.value = true
}

const abrirEditarCita = (cita) => {
  citaEnEdicion.value = cita
  mensajeCitas.value = ''
  mensajeErrorCitas.value = ''

  const [dia = '', mes = '', anio = ''] =
    String(cita.fecha || '').split('/')

  formularioCita.value = {
    pacienteUid: cita.pacienteUid || '',
    fecha:
      anio && mes && dia
        ? `${anio}-${mes}-${dia}`
        : '',
    hora: cita.hora || '',
    motivo: cita.motivo || '',
    modalidad: cita.modalidad || 'Presencial',
    lugar: cita.lugar || '',
    notas: cita.notas || '',
    recordatorioActivo:
      cita.recordatorioActivo !== false,
  }

  if (
    formularioCita.value.fecha
  ) {
    const [anio, mes] =
      formularioCita.value.fecha
        .split('-')
        .map(Number)

    if (anio && mes) {
      mesCalendarioCita.value =
        new Date(
          anio,
          mes - 1,
          1
        )
    }
  }

  mostrarFormularioCita.value = true
}

const cancelarFormularioCita = () => {
  mostrarFormularioCita.value = false
  citaEnEdicion.value = null
}

const convertirFechaParaApi = (fechaHtml) => {
  if (!fechaHtml) return ''

  const [anio, mes, dia] = fechaHtml.split('-')
  return `${dia}/${mes}/${anio}`
}

// ----------------------------------------------------------
// TEXTO VISIBLE DEL ESTADO DE UNA CITA
// ----------------------------------------------------------

const textoEstadoCita = (estado) => {
  const estados = {
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
    estados[estado] ||
    'Pendiente de confirmar'
  )
}

const guardarNuevaCita = async () => {
  mensajeCitas.value = ''
  mensajeErrorCitas.value = ''

  if (!formularioCita.value.pacienteUid) {
    mensajeErrorCitas.value =
      'Selecciona un paciente vinculado.'
    return
  }

  if (!formularioCita.value.fecha) {
    mensajeErrorCitas.value =
      'Selecciona la fecha de la cita.'
    return
  }

  if (!formularioCita.value.hora) {
    mensajeErrorCitas.value =
      'Selecciona la hora de la cita.'
    return
  }

  // Si el paciente solicitó una reagenda, el profesional
  // debe proponer una fecha u hora diferente.
  if (
    citaEnEdicion.value?.estado ===
    'reagenda_solicitada'
  ) {
    const fechaNueva =
      convertirFechaParaApi(
        formularioCita.value.fecha
      )

    const fechaSinCambio =
      fechaNueva ===
      citaEnEdicion.value.fecha

    const horaSinCambio =
      formularioCita.value.hora ===
      citaEnEdicion.value.hora

    if (
      fechaSinCambio &&
      horaSinCambio
    ) {
      mensajeErrorCitas.value =
        'Para responder la solicitud, cambia la fecha o la hora de la cita.'
      return
    }
  }

  guardandoCita.value = true

  try {
    const datosCita = {
      pacienteUid: formularioCita.value.pacienteUid,
      fecha: convertirFechaParaApi(
        formularioCita.value.fecha
      ),
      hora: formularioCita.value.hora,
      motivo: formularioCita.value.motivo.trim(),
      modalidad: formularioCita.value.modalidad,
      lugar: formularioCita.value.lugar.trim(),
      notas: formularioCita.value.notas.trim(),
      recordatorioActivo:
        formularioCita.value.recordatorioActivo,
    }

    let citaGuardada = null

    if (citaEnEdicion.value) {
      citaGuardada = await actualizarCita(
        citaEnEdicion.value.id,
        datosCita
      )

      citas.value = citas.value.map((cita) =>
        cita.id === citaGuardada.id
          ? citaGuardada
          : cita
      )
    } else {
      citaGuardada = await crearCita(datosCita)
      citas.value = [
        ...citas.value,
        citaGuardada,
      ]
    }

    citas.value = citas.value.sort((a, b) => {
      const convertir = (cita) => {
        const [dia, mes, anio] = cita.fecha.split('/')
        return new Date(
          `${anio}-${mes}-${dia}T${cita.hora}:00`
        ).getTime()
      }

      return convertir(a) - convertir(b)
    })

    const estabaEditando =
      Boolean(citaEnEdicion.value)

    const eraReagenda =
      citaEnEdicion.value?.estado ===
      'reagenda_solicitada'

    mostrarFormularioCita.value = false
    citaEnEdicion.value = null

    if (eraReagenda) {
      mensajeCitas.value =
        'Nueva fecha propuesta. La cita quedó pendiente de confirmación del paciente.'
    } else {
      mensajeCitas.value = estabaEditando
        ? 'Cita actualizada correctamente.'
        : 'Cita programada correctamente.'
    }
  } catch (error) {
    console.error('Error al crear cita:', error)
    mensajeErrorCitas.value =
      error.message || 'No fue posible crear la cita.'
  } finally {
    guardandoCita.value = false
  }
}

// ----------------------------------------------------------
// CANCELAR CITA COMO PROFESIONAL
// ----------------------------------------------------------
// Conserva la cita en el historial y solo cambia su estado.
// No usa eliminarCita(), por lo que el registro no desaparece.
// ----------------------------------------------------------

const cancelarCitaComoDoctor = async (cita) => {
  if (!cita?.id) {
    return
  }

  const confirmar =
    window.confirm(
      `¿Deseas cancelar la cita de ${
        cita.nombrePaciente || 'este paciente'
      }? La cita permanecerá en el historial.`
    )

  if (!confirmar) {
    return
  }

  mensajeCitas.value = ''
  mensajeErrorCitas.value = ''

  try {
    const actualizada =
      await actualizarCita(
        cita.id,
        {
          estado: 'cancelada',
        }
      )

    citas.value =
      citas.value.map(
        (actual) =>
          actual.id === cita.id
            ? {
                ...actual,
                ...actualizada,
                estado: 'cancelada',
              }
            : actual
      )

    if (
      citaEnEdicion.value?.id ===
      cita.id
    ) {
      mostrarFormularioCita.value = false
      citaEnEdicion.value = null
    }

    mensajeCitas.value =
      'Cita cancelada correctamente.'

  } catch (error) {
    console.error(
      'Error al cancelar cita:',
      error
    )

    mensajeErrorCitas.value =
      error.message ||
      'No fue posible cancelar la cita.'
  }
}


const cancelarCitaRegistrada = async (cita) => {
  const confirmar = window.confirm(
    `¿Deseas eliminar la cita de ${cita.nombrePaciente || 'este paciente'}?`
  )

  if (!confirmar) return

  mensajeCitas.value = ''
  mensajeErrorCitas.value = ''

  try {
    await eliminarCita(cita.id)

    citas.value = citas.value.filter(
      (actual) => actual.id !== cita.id
    )

    mensajeCitas.value =
      'Cita eliminada correctamente.'
  } catch (error) {
    console.error('Error al eliminar cita:', error)
    mensajeErrorCitas.value =
      error.message || 'No fue posible eliminar la cita.'
  }
}

// ----------------------------------------------------------
// CERRAR SESIÓN
// ----------------------------------------------------------

const cerrarSesion = async () => {
  try {
    await cerrarSesionUsuario()
    router.push('/iniciar-sesion')
  } catch (error) {
    console.error('Error al cerrar sesión:', error)
  }
}

// ----------------------------------------------------------
// ACTUALIZACIÓN AUTOMÁTICA DEL PRINCIPAL
// ----------------------------------------------------------
// Mientras el profesional está viendo Principal, revisamos las
// citas periódicamente. Esto permite reflejar confirmaciones hechas
// desde Android sin obligar al doctor a entrar primero al calendario.
// ----------------------------------------------------------

let intervaloRefrescoPrincipal = null

// ----------------------------------------------------------
// CICLO DE VIDA
// ----------------------------------------------------------

onMounted(() => {
  detenerObservador = onAuthStateChanged(
    auth,
    async (usuario) => {
      if (!usuario) {
        router.push('/iniciar-sesion')
        return
      }

      doctorActual.value = usuario
      await cargarCuentaDoctor(usuario)
      await revisarConsentimientoLegal(usuario)

      await Promise.all([
        cargarPacientesVinculados(usuario.uid),
        cargarSolicitudesPendientes(usuario.uid),
        cargarCitas(),
      ])
    }
  )

  intervaloRefrescoPrincipal = window.setInterval(() => {
    if (
      opcionActiva.value === 'principal' &&
      auth.currentUser
    ) {
      cargarCitas()
    }
  }, 10000)
})

onUnmounted(() => {
  if (detenerObservador) {
    detenerObservador()
  }

  if (intervaloRefrescoPrincipal) {
    window.clearInterval(intervaloRefrescoPrincipal)
  }
})
</script>

<template>
  <main
    class="panel-doctor"
    :class="{
      'modo-agenda-doctor': opcionActiva === 'citas',
      'menu-agenda-expandido':
        opcionActiva === 'citas' &&
        menuAgendaExpandido,
    }"
  >

    <!-- ====================================================
         MENÚ LATERAL
         ==================================================== -->
    <aside
      class="menu-doctor"
      :class="{
        'menu-doctor-agenda': opcionActiva === 'citas',
      }"
    >

      <button
        v-if="opcionActiva === 'citas'"
        type="button"
        class="boton-expandir-menu-agenda"
        :aria-label="
          menuAgendaExpandido
            ? 'Reducir menú'
            : 'Expandir menú'
        "
        @click="alternarMenuAgenda"
      >
        ☰
      </button>

      <div class="contenedor-logo-doctor">
        <img
          :src="logoVibra"
          alt="Logo Vibra la Vida"
          class="logo-doctor"
        />
      </div>

      <nav class="navegacion-doctor">

        <button
          type="button"
          class="boton-menu-doctor"
          :class="{
            activo:
              opcionActiva === 'principal'
          }"
          @click="
            seleccionarOpcion('principal')
          "
        >
          <span class="icono-menu">
            <House :size="20" :stroke-width="2.2" />
          </span>
          <span class="texto-menu">Principal</span>
        </button>

        <button
          type="button"
          class="boton-menu-doctor"
          :class="{
            activo:
              opcionActiva === 'pacientes' ||
              opcionActiva === 'detalle-paciente'
          }"
          @click="
            seleccionarOpcion('pacientes')
          "
        >
          <span class="icono-menu">
            <Users :size="20" :stroke-width="2.2" />
          </span>
          <span class="texto-menu">Pacientes</span>
        </button>

        <button
          type="button"
          class="boton-menu-doctor"
          :class="{
            activo:
              opcionActiva === 'resultados'
          }"
          @click="
            seleccionarOpcion('resultados')
          "
        >
          <span class="icono-menu">
            <FileText :size="20" :stroke-width="2.2" />
          </span>
          <span class="texto-menu">Resultados</span>
        </button>

        <button
          type="button"
          class="boton-menu-doctor"
          :class="{
            activo:
              opcionActiva === 'citas'
          }"
          @click="
            seleccionarOpcion('citas')
          "
        >
          <span class="icono-menu">
            <CalendarDays :size="20" :stroke-width="2.2" />
          </span>
          <span class="texto-menu">Citas</span>
        </button>

      </nav>

      <div class="menu-inferior-doctor">

        <button
          type="button"
          class="boton-menu-doctor boton-mi-cuenta"
          :class="{
            activo:
              opcionActiva === 'mi-cuenta'
          }"
          @click="irMiCuenta"
        >
          <span class="icono-menu">
            <UserRound :size="20" :stroke-width="2.2" />
          </span>
          <span class="texto-menu">Mi cuenta</span>
        </button>

        <div class="linea-menu"></div>

        <button
          type="button"
          class="boton-menu-doctor boton-cerrar-sesion"
          @click="cerrarSesion"
        >
          <span class="icono-menu">
            <LogOut :size="20" :stroke-width="2.2" />
          </span>
          <span class="texto-menu">Cerrar sesión</span>
        </button>

      </div>

    </aside>

    <!-- ====================================================
         CONTENIDO
         ==================================================== -->
    <section class="contenido-panel-doctor">

      <!-- ==================================================
           PRINCIPAL
           ================================================== -->
      <template v-if="opcionActiva === 'principal'">

        <header class="encabezado-panel principal-encabezado-nuevo">
          <div>
            <span class="etiqueta-panel">Panel médico</span>
            <h1>Principal</h1>
            <p>
              Consulta un resumen de tu agenda, tus pacientes
              y las actividades más importantes del día.
            </p>
          </div>
        </header>

        <section class="resumen-principal-nuevo">

          <article class="metrica-principal-nueva">
            <div class="metrica-icono verde">
              <Users :size="24" :stroke-width="2" />
            </div>
            <div>
              <span>Pacientes activos</span>
              <strong>{{ resumen.pacientes }}</strong>
            </div>
          </article>

          <article class="metrica-principal-nueva">
            <div class="metrica-icono naranja">
              <FileText :size="24" :stroke-width="2" />
            </div>
            <div>
              <span>Solicitudes pendientes</span>
              <strong>{{ solicitudesPendientesTotal }}</strong>
            </div>
          </article>

          <article class="metrica-principal-nueva">
            <div class="metrica-icono rojo">
              <Activity :size="24" :stroke-width="2" />
            </div>
            <div>
              <span>Alertas clínicas</span>
              <strong>{{ resumen.riesgo }}</strong>
            </div>
          </article>

        </section>

        <section class="rejilla-principal-nueva">

          <article class="tarjeta-principal agenda-principal-nueva">

            <div class="cabecera-tarjeta-principal">
              <div class="titulo-con-icono-principal">
                <div class="icono-titulo-principal">
                  <CalendarDays :size="22" :stroke-width="2" />
                </div>
                <div>
                  <h2>Agenda de hoy</h2>
                  <p>{{ fechaHoyTexto }}</p>
                </div>
              </div>

              <button
                type="button"
                class="enlace-principal"
                @click="seleccionarOpcion('citas')"
              >
                Ver agenda completa ›
              </button>
            </div>

            <div
              v-if="citasHoyLista.length > 0"
              class="lista-agenda-principal"
            >
              <article
                v-for="cita in citasHoyLista.slice(0, 6)"
                :key="cita.id"
                class="fila-agenda-principal"
              >
                <div class="hora-agenda-principal">
                  {{ cita.hora }}
                </div>

                <div
                  class="punto-agenda-principal"
                  :class="cita.estado"
                ></div>

                <div class="datos-agenda-principal">
                  <strong>
                    {{ cita.nombrePaciente || 'Paciente' }}
                  </strong>
                  <span>
                    {{ cita.motivo || 'Consulta programada' }}
                  </span>
                </div>

                <span class="modalidad-agenda-principal">
                  {{ cita.modalidad || 'Presencial' }}
                </span>

                <span
                  class="estado-agenda-principal"
                  :class="cita.estado"
                >
                  {{ textoEstadoCita(cita.estado) }}
                </span>

                <button
                  type="button"
                  class="boton-ir-agenda"
                  @click="seleccionarOpcion('citas')"
                >
                  ›
                </button>
              </article>
            </div>

            <div v-else class="vacio-principal-compacto">
              <CalendarDays :size="28" :stroke-width="1.8" />
              <div>
                <strong>No hay citas programadas para hoy</strong>
                <span>Puedes consultar o crear citas desde tu agenda.</span>
              </div>
            </div>

          </article>

          <div class="columna-principal-derecha">

            <article class="tarjeta-principal">
              <div class="cabecera-tarjeta-principal">
                <div class="titulo-con-icono-principal">
                  <div class="icono-titulo-principal">
                    <Activity :size="21" :stroke-width="2" />
                  </div>
                  <h2>Alertas recientes</h2>
                </div>
              </div>

              <div class="vacio-alertas-principal">
                <div class="icono-alerta-vacia">✓</div>
                <div>
                  <strong>Sin alertas clínicas pendientes</strong>
                  <p>
                    Las alertas de seguimiento aparecerán aquí
                    cuando exista información que requiera revisión.
                  </p>
                </div>
              </div>
            </article>

            <article class="tarjeta-principal">
              <div class="cabecera-tarjeta-principal">
                <div class="titulo-con-icono-principal">
                  <div class="icono-titulo-principal">
                    <FileText :size="21" :stroke-width="2" />
                  </div>
                  <h2>Solicitudes pendientes</h2>
                </div>
              </div>

              <div
                v-if="
                  citasReagendaPreview.length > 0 ||
                  seguimientosPendientesPreview.length > 0
                "
                class="lista-solicitudes-principal"
              >

                <button
                  v-for="cita in citasReagendaPreview"
                  :key="`reagenda-${cita.id}`"
                  type="button"
                  class="solicitud-principal"
                  @click="seleccionarOpcion('citas')"
                >
                  <div class="solicitud-icono">
                    <CalendarDays :size="20" :stroke-width="2" />
                  </div>
                  <div class="solicitud-contenido">
                    <strong>Reagendar cita</strong>
                    <span>{{ cita.nombrePaciente || 'Paciente' }}</span>
                    <small>Solicitud pendiente de revisión</small>
                  </div>
                  <span class="solicitud-etiqueta reagenda">Reagenda</span>
                  <span class="flecha-solicitud">›</span>
                </button>

                <button
                  v-for="solicitud in seguimientosPendientesPreview"
                  :key="`seguimiento-${solicitud.seguimientoId}`"
                  type="button"
                  class="solicitud-principal"
                  @click="seleccionarOpcion('pacientes')"
                >
                  <div class="solicitud-icono seguimiento">
                    <Users :size="20" :stroke-width="2" />
                  </div>
                  <div class="solicitud-contenido">
                    <strong>Seguimiento pendiente</strong>
                    <span>Solicitud enviada al paciente</span>
                    <small>Esperando autorización</small>
                  </div>
                  <span class="solicitud-etiqueta seguimiento">Pendiente</span>
                  <span class="flecha-solicitud">›</span>
                </button>

              </div>

              <div v-else class="vacio-principal-compacto pequeño">
                <div>
                  <strong>No hay solicitudes pendientes</strong>
                  <span>Todo está al día.</span>
                </div>
              </div>
            </article>

          </div>
        </section>

        <section class="tarjeta-principal pacientes-principal-nuevo">
          <div class="cabecera-tarjeta-principal">
            <div class="titulo-con-icono-principal">
              <div class="icono-titulo-principal">
                <Users :size="22" :stroke-width="2" />
              </div>
              <div>
                <h2>Pacientes en seguimiento</h2>
                <p>Acceso rápido a tus pacientes vinculados.</p>
              </div>
            </div>

            <button
              type="button"
              class="enlace-principal"
              @click="seleccionarOpcion('pacientes')"
            >
              Ver todos ›
            </button>
          </div>

          <div
            v-if="pacientes.length > 0"
            class="tabla-pacientes-principal"
          >
            <div class="cabecera-tabla-principal">
              <span>Paciente</span>
              <span>Edad</span>
              <span>Estado</span>
              <span>Acción</span>
            </div>

            <div
              v-for="paciente in pacientes.slice(0, 4)"
              :key="paciente.uid"
              class="fila-paciente-principal"
            >
              <div class="paciente-principal-identidad">
                <div class="avatar-principal-paciente">
                  {{
                    (paciente.nombreCompleto || 'P')
                      .trim()
                      .charAt(0)
                      .toUpperCase()
                  }}
                </div>
                <strong>{{ paciente.nombreCompleto || 'Paciente' }}</strong>
              </div>

              <span>{{ paciente.edad || '—' }}</span>
              <span class="estado-paciente-principal">Activo</span>

              <button
                type="button"
                class="boton-detalle-principal"
                @click="abrirDetallePaciente(paciente)"
              >
                Ver detalle
              </button>
            </div>
          </div>

          <div v-else class="vacio-principal-compacto">
            <Users :size="28" :stroke-width="1.8" />
            <div>
              <strong>Aún no tienes pacientes en seguimiento</strong>
              <span>Entra a Pacientes para enviar tu primera solicitud.</span>
            </div>
          </div>
        </section>

      </template>

      <!-- ==================================================
           DETALLE DEL PACIENTE
           ================================================== -->
      <template
        v-else-if="
          opcionActiva === 'detalle-paciente'
        "
      >

        <header class="encabezado-panel detalle-paciente-nuevo-encabezado">

          <div>

            <button
              type="button"
              class="boton-volver-pacientes"
              @click="volverAPacientes"
            >
              ← Volver a pacientes
            </button>

            <span class="etiqueta-panel">
              Seguimiento
            </span>

            <h1>
              {{
                pacienteDetalle?.nombreCompleto ||
                'Paciente'
              }}
            </h1>

            <p>
              Información general y resumen de los datos
              más recientes del paciente.
            </p>

          </div>

          <button
            v-if="pacienteDetalle"
            type="button"
            class="boton-actualizar-health"
            :disabled="cargandoHealthPaciente"
            @click="
              cargarHealthPaciente(
                pacienteDetalle.uid
              )
            "
          >
            {{
              cargandoHealthPaciente
                ? 'Actualizando...'
                : 'Actualizar datos'
            }}
          </button>

        </header>


        <!-- ================================================
             IDENTIDAD
             ================================================ -->
        <section
          v-if="pacienteDetalle"
          class="detalle-paciente-identidad-nueva"
        >

          <div class="avatar-detalle-paciente-nuevo">
            {{
              pacienteDetalle.nombreCompleto
                ?.charAt(0)
                ?.toUpperCase() ||
              'P'
            }}
          </div>

          <div class="detalle-paciente-datos-nuevos">

            <strong>
              {{
                pacienteDetalle.nombreCompleto ||
                'Paciente'
              }}
            </strong>

            <div class="detalle-paciente-metadatos">

              <span>
                Edad:
                {{
                  pacienteDetalle.edad ||
                  'No registrada'
                }}
              </span>

              <span>
                Sexo:
                {{
                  pacienteDetalle.genero ||
                  'No registrado'
                }}
              </span>

              <span>
                {{
                  pacienteDetalle.correo ||
                  pacienteDetalle.email ||
                  'Correo no registrado'
                }}
              </span>

            </div>

          </div>

          <span class="estado-vinculo-activo detalle-estado-activo">
            Seguimiento activo
          </span>

        </section>


        <section
          v-if="cargandoHealthPaciente"
          class="estado-vacio-doctor"
        >
          <div class="icono-vacio-doctor">
            ↻
          </div>

          <div>
            <h2>
              Consultando Health Connect...
            </h2>

            <p>
              Estamos obteniendo la última información
              sincronizada por el paciente.
            </p>
          </div>
        </section>


        <section
          v-else-if="mensajeErrorHealthPaciente"
          class="estado-vacio-doctor estado-error-health"
        >
          <div class="icono-vacio-doctor">
            !
          </div>

          <div>
            <h2>
              No fue posible cargar los datos
            </h2>

            <p>
              {{ mensajeErrorHealthPaciente }}
            </p>
          </div>
        </section>


        <template v-else>

          <!-- ================================================
               RESUMEN CLARO
               ================================================ -->
          <section class="detalle-resumen-paciente-nuevo">

            <div class="detalle-resumen-cabecera">

              <div>
                <h2>
                  Resumen del paciente
                </h2>

                <p>
                  Datos principales para una revisión rápida.
                </p>
              </div>

              <div
                v-if="healthPaciente"
                class="detalle-ultima-sincronizacion"
              >
                <span>
                  Última sincronización
                </span>

                <strong>
                  {{
                    formatearUltimaSincronizacion(
                      healthPaciente.fechaSincronizacion,
                      healthPaciente.fecha ||
                      healthPaciente.id
                    )
                  }}
                </strong>
              </div>

            </div>


            <div class="detalle-metricas-principales">

              <article class="detalle-metrica-card">
                <span class="detalle-metrica-icono peso">⚖</span>

                <div>
                  <span>Peso</span>

                  <strong>
                    {{
                      pesoPacienteDetalle != null
                        ? `${pesoPacienteDetalle} kg`
                        : '—'
                    }}
                  </strong>

                  <small>
                    Último registro disponible
                  </small>
                </div>
              </article>


              <article class="detalle-metrica-card">
                <span class="detalle-metrica-icono sueno">☾</span>

                <div>
                  <span>Sueño</span>

                  <strong>
                    {{
                      healthPaciente
                        ? formatearMinutosSueno(
                            healthPaciente.suenoMinutos
                          )
                        : '—'
                    }}
                  </strong>

                  <small>
                    Tiempo total registrado
                  </small>
                </div>
              </article>


              <article class="detalle-metrica-card">
                <span class="detalle-metrica-icono pasos">◒</span>

                <div>
                  <span>Pasos</span>

                  <strong>
                    {{
                      healthPaciente?.pasos ??
                      '—'
                    }}
                  </strong>

                  <small>
                    Actividad registrada en el día
                  </small>
                </div>
              </article>


              <article class="detalle-metrica-card">
                <span class="detalle-metrica-icono corazon">♥</span>

                <div>
                  <span>Frecuencia cardiaca</span>

                  <strong>
                    {{
                      healthPaciente?.frecuenciaCardiaca ??
                      '—'
                    }}
                    <small
                      v-if="
                        healthPaciente?.frecuenciaCardiaca != null
                      "
                    >
                      lpm
                    </small>
                  </strong>

                  <small>
                    {{
                      healthPaciente?.frecuenciaCardiacaMinima != null ||
                      healthPaciente?.frecuenciaCardiacaMaxima != null
                        ? `Min. ${healthPaciente.frecuenciaCardiacaMinima ?? '—'} · Máx. ${healthPaciente.frecuenciaCardiacaMaxima ?? '—'}`
                        : 'Sin rango disponible'
                    }}
                  </small>
                </div>
              </article>

            </div>


            <div class="detalle-metricas-secundarias">

              <article>
                <span>IMC</span>
                <strong>
                  {{
                    imcPacienteDetalle ||
                    '—'
                  }}
                </strong>
                <small>
                  Último valor disponible
                </small>
              </article>

              <article>
                <span>Edad</span>
                <strong>
                  {{
                    pacienteDetalle?.edad ||
                    '—'
                  }}
                </strong>
                <small>
                  Perfil del paciente
                </small>
              </article>

              <article>
                <span>Estatura</span>
                <strong>
                  {{
                    pacienteDetalle?.estatura ||
                    pacienteDetalle?.altura ||
                    '—'
                  }}
                </strong>
                <small>
                  Perfil del paciente
                </small>
              </article>

              <article>
                <span>Fuente</span>
                <strong>
                  {{
                    healthPaciente?.fuente ||
                    'Sin sincronización'
                  }}
                </strong>
                <small>
                  Datos de salud conectados
                </small>
              </article>

            </div>

          </section>


          <!-- ================================================
               RESULTADOS RECIENTES
               ================================================ -->
          <section class="detalle-secciones-inferiores">

            <article class="detalle-resultados-recientes">

              <div class="detalle-seccion-titulo">
                <div>
                  <h2>
                    Resultados recientes
                  </h2>

                  <p>
                    Accesos rápidos a las evaluaciones del paciente.
                  </p>
                </div>

                <button
                  type="button"
                  @click="seleccionarOpcion('resultados')"
                >
                  Ver todos
                </button>
              </div>

              <div class="detalle-lista-resultados">

                <div class="detalle-resultado-fila">
                  <span class="detalle-resultado-icono imc">IMC</span>
                  <div>
                    <strong>Índice de masa corporal</strong>
                    <small>
                      {{
                        imcPacienteDetalle
                          ? `Último valor: ${imcPacienteDetalle}`
                          : 'Sin registros disponibles'
                      }}
                    </small>
                  </div>
                </div>

                <div class="detalle-resultado-fila">
                  <span class="detalle-resultado-icono dass">D</span>
                  <div>
                    <strong>DASS-21</strong>
                    <small>
                      Consulta los resultados de bienestar emocional.
                    </small>
                  </div>
                </div>

                <div class="detalle-resultado-fila">
                  <span class="detalle-resultado-icono ais">A</span>
                  <div>
                    <strong>AIS · Calidad del sueño</strong>
                    <small>
                      Consulta las evaluaciones registradas.
                    </small>
                  </div>
                </div>

                <div class="detalle-resultado-fila">
                  <span class="detalle-resultado-icono habitos">H</span>
                  <div>
                    <strong>Hábitos saludables</strong>
                    <small>
                      Progreso y evaluaciones educativas.
                    </small>
                  </div>
                </div>

              </div>

            </article>


            <article class="detalle-descanso-nuevo">

              <div class="detalle-seccion-titulo">
                <div>
                  <h2>
                    Desglose del descanso
                  </h2>

                  <p>
                    Información recibida desde Health Connect.
                  </p>
                </div>
              </div>

              <div class="detalle-descanso-grid">

                <div>
                  <span>Ligero</span>
                  <strong>
                    {{
                      healthPaciente
                        ? formatearMinutosSueno(
                            healthPaciente.suenoLigeroMinutos
                          )
                        : '—'
                    }}
                  </strong>
                </div>

                <div>
                  <span>Profundo</span>
                  <strong>
                    {{
                      healthPaciente
                        ? formatearMinutosSueno(
                            healthPaciente.suenoProfundoMinutos
                          )
                        : '—'
                    }}
                  </strong>
                </div>

                <div>
                  <span>REM</span>
                  <strong>
                    {{
                      healthPaciente
                        ? formatearMinutosSueno(
                            healthPaciente.suenoRemMinutos
                          )
                        : '—'
                    }}
                  </strong>
                </div>

                <div>
                  <span>Despierto</span>
                  <strong>
                    {{
                      healthPaciente
                        ? formatearMinutosSueno(
                            healthPaciente.despiertoMinutos
                          )
                        : '—'
                    }}
                  </strong>
                </div>

              </div>

              <div
                v-if="!healthPaciente"
                class="detalle-descanso-aviso"
              >
                Aún no hay datos de descanso sincronizados.
              </div>

            </article>

          </section>

        </template>

      </template>

      <!-- ==================================================
           PACIENTES
           ================================================== -->
      <template v-else-if="opcionActiva === 'pacientes'">

        <header class="encabezado-panel encabezado-pacientes pacientes-primera-imagen-encabezado">
          <div>
            <span class="etiqueta-panel">Seguimiento</span>
            <h1>Pacientes</h1>
            <p>Consulta tus pacientes vinculados, solicita nuevos seguimientos o quita vínculos existentes.</p>
          </div>

          <button
            type="button"
            class="boton-agregar-paciente"
            @click="abrirModalPaciente"
          >
            + Agregar paciente
          </button>
        </header>

        <section class="pacientes-primera-imagen">

          <div class="pacientes-primera-imagen-barra">
            <div class="pacientes-tabs-simples">
              <div class="paciente-tab-simple activo">
                Mis pacientes <span>({{ pacientes.length }})</span>
              </div>
            </div>

            <label class="buscador-pacientes-lista">
              <span aria-hidden="true">⌕</span>
              <input
                v-model="textoFiltroPacientes"
                type="search"
                placeholder="Buscar por nombre..."
                autocomplete="off"
              />
            </label>
          </div>

          <section v-if="cargandoPacientes" class="estado-vacio-doctor pacientes-estado-simple">
            <div>
              <h2>Cargando pacientes...</h2>
              <p>Estamos consultando tus vínculos activos.</p>
            </div>
          </section>

          <section v-else-if="mensajeErrorPacientes" class="estado-vacio-doctor pacientes-estado-simple">
            <div>
              <h2>No fue posible cargar pacientes</h2>
              <p>{{ mensajeErrorPacientes }}</p>
            </div>
          </section>

          <section v-else-if="pacientesFiltrados.length > 0" class="pacientes-listado-simple">
            <div class="pacientes-cabecera-simple pacientes-cabecera-minima">
              <span>Paciente</span>
              <span>Estado</span>
              <span>Acciones</span>
            </div>

            <article
              v-for="paciente in pacientesFiltrados"
              :key="paciente.uid"
              class="paciente-fila-simple paciente-fila-minima"
            >
              <div class="paciente-identidad-simple">
                <div class="paciente-avatar-simple">
                  {{ (paciente.nombreCompleto || 'P').trim().charAt(0).toUpperCase() }}
                </div>

                <div>
                  <strong>{{ paciente.nombreCompleto || 'Paciente' }}</strong>
                  <p>Paciente vinculado</p>
                </div>
              </div>

              <div>
                <span class="paciente-estado-simple">
                  <span class="punto-estado-simple"></span>
                  Activo
                </span>
              </div>

              <div class="paciente-acciones-simple">
                <button
                  type="button"
                  class="paciente-boton-detalle-simple"
                  @click="abrirDetallePaciente(paciente)"
                >
                  Ver detalle
                </button>

                <button
                  type="button"
                  class="paciente-boton-quitar-simple"
                  @click="quitarPaciente(paciente)"
                >
                  Quitar
                </button>
              </div>
            </article>
          </section>

          <section
            v-else-if="textoFiltroPacientes.trim() && pacientes.length > 0"
            class="estado-vacio-doctor pacientes-estado-simple"
          >
            <div>
              <h2>No encontramos coincidencias</h2>
              <p>Prueba con otro nombre.</p>
            </div>
          </section>

          <section v-else class="estado-vacio-doctor pacientes-estado-simple">
            <div class="icono-vacio-doctor">♡</div>
            <div>
              <h2>No hay pacientes vinculados</h2>
              <p>Presiona “Agregar paciente” para buscar personas registradas y enviar una solicitud de seguimiento.</p>
            </div>
          </section>
        </section>

        <!-- Conservamos el panel lateral para agregar paciente -->
        <div
          v-if="mostrarModalPaciente"
          class="fondo-panel-paciente"
          @click.self="cerrarModalPaciente"
        >
          <aside class="panel-agregar-paciente">
            <div class="cabecera-panel-agregar-paciente">
              <div>
                <h2>Agregar paciente al seguimiento</h2>
                <p>Busca un paciente registrado en la plataforma y envíale una solicitud de seguimiento.</p>
              </div>

              <button
                type="button"
                class="boton-cerrar-panel-paciente"
                aria-label="Cerrar"
                @click="cerrarModalPaciente"
              >×</button>
            </div>

            <section class="paso-agregar-paciente">
              <h3>1. Buscar paciente</h3>

              <div class="buscador-panel-paciente">
                <span class="icono-buscador-panel">⌕</span>
                <input
                  v-model="textoBusquedaPaciente"
                  type="search"
                  autocomplete="off"
                  placeholder="Buscar paciente..."
                  @input="alEscribirBusquedaPaciente"
                />
              </div>

              <p
                v-if="textoBusquedaPaciente.length > 0 && textoBusquedaPaciente.length < 2"
                class="ayuda-busqueda-paciente"
              >Escribe al menos 2 caracteres para buscar.</p>

              <p v-if="buscandoPaciente" class="estado-busqueda-paciente">Buscando pacientes...</p>

              <div
                v-else-if="resultadosBusquedaPaciente.length > 0"
                class="resultados-panel-paciente"
              >
                <button
                  v-for="paciente in resultadosBusquedaPaciente"
                  :key="paciente.uid"
                  type="button"
                  class="resultado-panel-paciente"
                  :class="{ seleccionado: pacienteSeleccionadoSolicitud?.uid === paciente.uid }"
                  :disabled="pacienteYaVinculado(paciente.uid) || pacienteConSolicitudPendiente(paciente.uid)"
                  @click="pacienteSeleccionadoSolicitud = paciente"
                >
                  <div class="avatar-resultado-panel">
                    {{ (paciente.nombreCompleto || 'P').trim().charAt(0).toUpperCase() }}
                  </div>

                  <div class="datos-resultado-panel">
                    <strong>{{ paciente.nombreCompleto || 'Paciente registrado' }}</strong>
                    <span v-if="pacienteYaVinculado(paciente.uid)" class="estado-resultado ya-vinculado">Paciente ya vinculado</span>
                    <span v-else-if="pacienteConSolicitudPendiente(paciente.uid)" class="estado-resultado pendiente">Solicitud pendiente</span>
                    <span v-else class="estado-resultado disponible">Paciente registrado</span>
                  </div>

                  <span class="flecha-resultado-panel">›</span>
                </button>
              </div>
            </section>

            <section v-if="pacienteSeleccionadoSolicitud" class="paso-agregar-paciente">
              <h3>2. Paciente seleccionado</h3>

              <article class="paciente-seleccionado-panel">
                <div class="avatar-paciente-seleccionado">
                  {{ (pacienteSeleccionadoSolicitud.nombreCompleto || 'P').trim().charAt(0).toUpperCase() }}
                </div>

                <div>
                  <strong>{{ pacienteSeleccionadoSolicitud.nombreCompleto || 'Paciente registrado' }}</strong>
                  <span>Paciente registrado en Vibra la Vida</span>
                </div>
              </article>

              <div class="aviso-autorizacion-panel">
                <div class="icono-aviso-autorizacion">i</div>
                <p><strong>El paciente deberá autorizar tu acceso</strong> antes de que puedas consultar sus datos.</p>
              </div>
            </section>

            <p
              v-if="mensajeBusquedaPaciente"
              class="mensaje-busqueda-paciente"
              :class="tipoMensajeBusquedaPaciente"
            >{{ mensajeBusquedaPaciente }}</p>

            <div class="acciones-panel-paciente">
              <button
                type="button"
                class="boton-enviar-seguimiento"
                :disabled="!pacienteSeleccionadoSolicitud || agregandoPacienteUid === pacienteSeleccionadoSolicitud?.uid"
                @click="agregarPaciente(pacienteSeleccionadoSolicitud)"
              >
                {{
                  agregandoPacienteUid === pacienteSeleccionadoSolicitud?.uid
                    ? 'Enviando...'
                    : 'Enviar solicitud de seguimiento'
                }}
              </button>

              <button
                type="button"
                class="boton-cancelar-panel-paciente"
                @click="cerrarModalPaciente"
              >Cancelar</button>
            </div>
          </aside>
        </div>

      </template>

      <!-- ==================================================
           RESULTADOS
           ================================================== -->
      <template v-else-if="opcionActiva === 'resultados'">

        <header class="encabezado-panel">
          <div>
            <span class="etiqueta-panel">
              Seguimiento
            </span>

            <h1>
              Resultados
            </h1>

            <p>
              Los resultados aparecerán cuando
              existan pacientes vinculados.
            </p>
          </div>
        </header>

        <section class="estado-vacio-doctor">

          <div class="icono-vacio-doctor">
            ▥
          </div>

          <div>
            <h2>
              Sin resultados disponibles
            </h2>

            <p>
              Todavía no hay información clínica
              vinculada a esta cuenta profesional.
            </p>
          </div>

        </section>

      </template>

      <!-- ==================================================
           CITAS
           ================================================== -->
      <template v-else-if="opcionActiva === 'citas'">

        <section class="agenda-profesional-vibra">

          <!-- ==================================================
               COLUMNA IZQUIERDA: MINI CALENDARIO
               ================================================== -->
          <aside class="agenda-columna-mini">

            <div class="agenda-mini-cabecera">
              <div>
                <span class="agenda-mini-etiqueta">
                  Agenda
                </span>

                <h1>
                  Citas
                </h1>
              </div>
            </div>


            <button
              type="button"
              class="boton-crear-cita-agenda"
              :disabled="pacientes.length === 0"
              @click="abrirNuevaCitaDesdeAgenda()"
            >
              <span>＋</span>
              Crear cita
            </button>


            <div class="agenda-vistas-selector">
              <button
                type="button"
                :class="{ activo: vistaCitas === 'agenda' }"
                @click="mostrarAgendaCitas"
              >
                Agenda
              </button>

              <button
                type="button"
                :class="{ activo: vistaCitas === 'historial' }"
                @click="mostrarHistorialCitas"
              >
                Historial
                <span v-if="citasHistorialDoctor.length > 0">
                  {{ citasHistorialDoctor.length }}
                </span>
              </button>
            </div>


            <div
              v-if="vistaCitas === 'agenda'"
              class="mini-calendario-agenda"
            >

              <div class="mini-calendario-cabecera">
                <button
                  type="button"
                  aria-label="Mes anterior"
                  @click="cambiarMesCalendarioCita(-1)"
                >
                  ‹
                </button>

                <strong>
                  {{ tituloMesCalendarioCita }}
                </strong>

                <button
                  type="button"
                  aria-label="Mes siguiente"
                  @click="cambiarMesCalendarioCita(1)"
                >
                  ›
                </button>
              </div>


              <div class="mini-calendario-semana">
                <span>L</span>
                <span>M</span>
                <span>M</span>
                <span>J</span>
                <span>V</span>
                <span>S</span>
                <span>D</span>
              </div>


              <div class="mini-calendario-dias">
                <button
                  v-for="dia in diasCalendarioCita"
                  :key="`mini-${dia.valor}`"
                  type="button"
                  :class="{
                    'otro-mes': !dia.esMesActual,
                    seleccionado:
                      dia.valor === fechaAgendaISO,
                  }"
                  @click="seleccionarDiaAgenda(dia.valor)"
                >
                  {{ dia.dia }}
                </button>
              </div>

            </div>


            <div v-if="vistaCitas === 'agenda'" class="agenda-mini-leyenda">
              <strong>
                Estados
              </strong>

              <span>
                <i class="punto-estado confirmada"></i>
                Confirmada
              </span>

              <span>
                <i class="punto-estado pendiente"></i>
                Pendiente
              </span>

              <span>
                <i class="punto-estado reagenda"></i>
                Reagenda
              </span>
            </div>

          </aside>


          <!-- ==================================================
               CENTRO: CALENDARIO SEMANAL GRANDE
               ================================================== -->
          <section
            v-if="vistaCitas === 'agenda'"
            class="agenda-semanal-doctor"
          >

            <div class="agenda-semanal-cabecera">

              <div>
                <span class="agenda-semanal-subtitulo">
                  Calendario semanal
                </span>

                <h2>
                  {{ tituloSemanaAgenda }}
                </h2>
              </div>


              <div class="agenda-semanal-controles">
                <button
                  type="button"
                  class="boton-hoy-agenda"
                  @click="irSemanaActual"
                >
                  Hoy
                </button>

                <button
                  type="button"
                  aria-label="Semana anterior"
                  @click="moverSemanaAgenda(-1)"
                >
                  ‹
                </button>

                <button
                  type="button"
                  aria-label="Semana siguiente"
                  @click="moverSemanaAgenda(1)"
                >
                  ›
                </button>
              </div>

            </div>


            <p
              v-if="mensajeCitas"
              class="mensaje-citas-doctor exito agenda-mensaje"
            >
              {{ mensajeCitas }}
            </p>

            <p
              v-if="mensajeErrorCitas"
              class="mensaje-citas-doctor error agenda-mensaje"
            >
              {{ mensajeErrorCitas }}
            </p>


            <div
              v-if="cargandoCitas"
              class="agenda-cargando"
            >
              Cargando agenda...
            </div>


            <div
              v-else
              class="agenda-semana-scroll"
            >

              <div class="agenda-semana-grid">

                <!-- Encabezado -->
                <div class="agenda-esquina-hora"></div>

                <button
                  v-for="dia in diasSemanaAgenda"
                  :key="`cabecera-${dia.iso}`"
                  type="button"
                  class="agenda-dia-cabecera"
                  :class="{
                    hoy: dia.hoy,
                    seleccionado: dia.seleccionado,
                  }"
                  @click="seleccionarDiaAgenda(dia.iso)"
                >
                  <span>
                    {{ dia.nombre }}
                  </span>

                  <strong>
                    {{ dia.numero }}
                  </strong>
                </button>


                <!-- Horas y celdas -->
                <template
                  v-for="hora in horasAgendaSemana"
                  :key="`fila-${hora}`"
                >

                  <div class="agenda-hora-lateral">
                    {{ hora }}
                  </div>


                  <div
                    v-for="dia in diasSemanaAgenda"
                    :key="`${dia.iso}-${hora}`"
                    class="agenda-celda-hora"
                    :class="{
                      hoy: dia.hoy,
                    }"
                    @dblclick="
                      abrirNuevaCitaDesdeAgenda(
                        dia.iso,
                        hora
                      )
                    "
                  >

                    <button
                      v-if="
                        citasEnCeldaAgenda(
                          dia.api,
                          hora
                        ).length === 0
                      "
                      type="button"
                      class="agenda-celda-vacia"
                      :aria-label="`Crear cita ${dia.api} ${hora}`"
                      @click="
                        abrirNuevaCitaDesdeAgenda(
                          dia.iso,
                          hora
                        )
                      "
                    >
                      <span>＋</span>
                    </button>


                    <button
                      v-for="cita in citasEnCeldaAgenda(
                        dia.api,
                        hora
                      )"
                      :key="cita.id"
                      type="button"
                      class="bloque-cita-agenda"
                      :class="cita.estado"
                      @click="abrirCitaDesdeAgenda(cita)"
                    >
                      <strong>
                        {{ cita.hora }}
                      </strong>

                      <span>
                        {{ cita.nombrePaciente || 'Paciente' }}
                      </span>

                      <small>
                        {{ cita.motivo || 'Consulta' }}
                      </small>
                    </button>

                  </div>

                </template>

              </div>

            </div>

          </section>


          <!-- ==================================================
               HISTORIAL DE CITAS
               ================================================== -->
          <section
            v-else
            class="historial-citas-doctor"
          >

            <div class="historial-citas-cabecera">
              <div>
                <span>Historial</span>
                <h2>Citas anteriores</h2>
                <p>
                  Aquí se conservan las citas canceladas,
                  completadas o marcadas como no asistidas.
                </p>
              </div>

              <button
                type="button"
                @click="mostrarAgendaCitas"
              >
                Volver a agenda
              </button>
            </div>

            <div
              v-if="citasHistorialDoctor.length === 0"
              class="historial-citas-vacio"
            >
              <strong>No hay citas en el historial.</strong>
              <span>Cuando una cita finalice o se cancele aparecerá aquí.</span>
            </div>

            <div
              v-else
              class="historial-citas-lista"
            >
              <article
                v-for="cita in citasHistorialDoctor"
                :key="`historial-${cita.id}`"
                class="historial-cita-item"
              >
                <div class="historial-cita-fecha">
                  <strong>{{ cita.fecha }}</strong>
                  <span>{{ cita.hora }}</span>
                </div>

                <div class="historial-cita-contenido">
                  <div class="historial-cita-titulo">
                    <div>
                      <strong>{{ cita.nombrePaciente || 'Paciente' }}</strong>
                      <span>{{ cita.motivo || 'Consulta' }}</span>
                    </div>

                    <span
                      class="estado-cita-doctor"
                      :class="cita.estado"
                    >
                      {{ textoEstadoCita(cita.estado) }}
                    </span>
                  </div>

                  <div class="historial-cita-datos">
                    <span>{{ cita.modalidad || 'Presencial' }}</span>
                    <span v-if="cita.lugar">{{ cita.lugar }}</span>
                  </div>

                  <p v-if="cita.notas" class="historial-cita-notas">
                    {{ cita.notas }}
                  </p>
                </div>
              </article>
            </div>

          </section>


          <!-- ==================================================
               PANEL DERECHO DESPLEGABLE
               ================================================== -->
          <aside
            v-if="vistaCitas === 'agenda' && mostrarFormularioCita"
            class="agenda-panel-derecho"
          >

            <div class="agenda-panel-derecho-cabecera">

              <div>
                <span class="mini-etiqueta-agenda-panel">
                  {{
                    citaEnEdicion?.estado === 'reagenda_solicitada'
                      ? 'Reagenda solicitada'
                      : citaEnEdicion
                        ? 'Detalle de cita'
                        : 'Nueva cita'
                  }}
                </span>

                <h2>
                  {{
                    citaEnEdicion
                      ? 'Información de la cita'
                      : 'Crear cita'
                  }}
                </h2>
              </div>

              <button
                type="button"
                class="boton-cerrar-panel-agenda"
                aria-label="Cerrar panel"
                @click="cancelarFormularioCita"
              >
                ×
              </button>

            </div>


            <div
              v-if="citaEnEdicion?.estado === 'reagenda_solicitada'"
              class="aviso-reagenda-panel-agenda"
            >
              <strong>
                El paciente solicitó reagendar
              </strong>

              <span v-if="citaEnEdicion.motivoReagenda">
                Motivo: {{ citaEnEdicion.motivoReagenda }}
              </span>

              <span v-if="citaEnEdicion.fechaSolicitadaPaciente">
                Fecha sugerida: {{ citaEnEdicion.fechaSolicitadaPaciente }}
              </span>

              <span v-if="citaEnEdicion.horaSolicitadaPaciente">
                Hora sugerida: {{ citaEnEdicion.horaSolicitadaPaciente }}
              </span>
            </div>


            <div class="agenda-panel-contenido">

              <label class="campo-agenda-panel campo-agenda-completo">
                <span>
                  Paciente *
                </span>

                <select
                  v-model="formularioCita.pacienteUid"
                  :disabled="Boolean(citaEnEdicion)"
                >
                  <option value="">
                    Selecciona un paciente
                  </option>

                  <option
                    v-for="paciente in pacientes"
                    :key="paciente.uid"
                    :value="paciente.uid"
                  >
                    {{
                      paciente.nombreCompleto ||
                      paciente.nombre ||
                      paciente.uid
                    }}
                  </option>
                </select>
              </label>


              <div class="agenda-panel-fecha-hora">

                <label class="campo-agenda-panel">
                  <span>
                    Fecha
                  </span>

                  <button
                    type="button"
                    class="campo-agenda-resumen"
                    @click="
                      formularioCita.fecha &&
                      seleccionarDiaAgenda(
                        formularioCita.fecha
                      )
                    "
                  >
                    {{
                      formularioCita.fecha
                        ? fechaSeleccionadaTexto
                        : 'Selecciona en el calendario'
                    }}
                  </button>
                </label>


                <label class="campo-agenda-panel">
                  <span>
                    Hora
                  </span>

                  <div class="campo-agenda-resumen hora">
                    {{
                      formularioCita.hora ||
                      'Selecciona una hora'
                    }}
                  </div>
                </label>

              </div>


              <div class="agenda-panel-dos-columnas">

                <label class="campo-agenda-panel">
                  <span>
                    Modalidad
                  </span>

                  <select v-model="formularioCita.modalidad">
                    <option>
                      Presencial
                    </option>

                    <option>
                      Virtual
                    </option>
                  </select>
                </label>


                <label class="campo-agenda-panel">
                  <span>
                    Lugar
                  </span>

                  <input
                    v-model="formularioCita.lugar"
                    type="text"
                    placeholder="Consultorio o enlace"
                  />
                </label>

              </div>


              <label class="campo-agenda-panel campo-agenda-completo">
                <span>
                  Motivo
                </span>

                <input
                  v-model="formularioCita.motivo"
                  type="text"
                  placeholder="Ej. Seguimiento general"
                />
              </label>


              <label class="campo-agenda-panel campo-agenda-completo">
                <span>
                  Notas
                </span>

                <textarea
                  v-model="formularioCita.notas"
                  rows="5"
                  placeholder="Indicaciones opcionales para la cita"
                ></textarea>
              </label>


              <label class="recordatorio-panel-agenda">
                <input
                  v-model="formularioCita.recordatorioActivo"
                  type="checkbox"
                />

                <div>
                  <strong>
                    Recordatorio para el paciente
                  </strong>

                  <span>
                    Mantener activo el recordatorio de esta cita.
                  </span>
                </div>
              </label>

            </div>


            <div class="agenda-panel-acciones">

              <button
                v-if="
                  citaEnEdicion &&
                  citaEnEdicion.estado !== 'cancelada' &&
                  citaEnEdicion.estado !== 'completada'
                "
                type="button"
                class="boton-cancelar-cita-panel"
                @click="cancelarCitaComoDoctor(citaEnEdicion)"
              >
                Cancelar cita
              </button>


              <div class="agenda-panel-acciones-derecha">
                <button
                  type="button"
                  class="boton-cerrar-detalle-agenda"
                  @click="cancelarFormularioCita"
                >
                  Cerrar
                </button>

                <button
                  type="button"
                  class="boton-guardar-cita-panel"
                  :disabled="guardandoCita"
                  @click="guardarNuevaCita"
                >
                  {{
                    guardandoCita
                      ? 'Guardando...'
                      : citaEnEdicion?.estado === 'reagenda_solicitada'
                        ? 'Enviar nueva fecha'
                        : citaEnEdicion
                          ? 'Guardar cambios'
                          : 'Crear cita'
                  }}
                </button>
              </div>

            </div>

          </aside>

        </section>

      </template>

      <!-- ==================================================
           MI CUENTA DEL DOCTOR
           ================================================== -->
      <template v-else-if="opcionActiva === 'mi-cuenta'">

        <header class="encabezado-panel encabezado-cuenta-doctor">

          <div>
            <span class="etiqueta-panel">
              Perfil profesional
            </span>

            <h1>
              Mi cuenta
            </h1>

            <p>
              Administra la información profesional
              que utilizarás dentro de Vibra la Vida.
            </p>
          </div>

        </header>

        <section
          v-if="cargandoCuenta"
          class="estado-vacio-doctor"
        >
          <div>
            <h2>
              Cargando información...
            </h2>
          </div>
        </section>

        <template v-else>

          <!-- ================================================
               MODO LECTURA
               ================================================ -->
          <section
            v-if="!editandoCuenta"
            class="cuenta-doctor"
          >

            <article class="tarjeta-profesional">

              <div class="cabecera-tarjeta-profesional">

                <div>
                  <span class="mini-etiqueta-doctor">
                    Información profesional
                  </span>

                  <h2>
                    {{ nombreProfesional }}
                  </h2>

                  <p>
                    {{ especialidadProfesional }}
                  </p>
                </div>

                <button
                  type="button"
                  class="boton-editar-doctor"
                  @click="activarEdicionCuenta"
                >
                  Editar información
                </button>

              </div>

              <div class="rejilla-datos-doctor">

                <div class="dato-doctor">
                  <span>
                    Nombre completo
                  </span>

                  <strong>
                    {{ nombreProfesional }}
                  </strong>
                </div>

                <div class="dato-doctor">
                  <span>
                    Profesión registrada
                  </span>

                  <strong>
                    {{ profesionRegistrada }}
                  </strong>
                </div>

                <div class="dato-doctor">
                  <span>
                    Especialidad / área de atención
                  </span>

                  <strong>
                    {{ especialidadProfesional }}
                  </strong>
                </div>

                <div class="dato-doctor">
                  <span>
                    Cédula profesional
                  </span>

                  <strong>
                    {{ cedulaProfesional }}
                  </strong>
                </div>

              </div>

            </article>

            <article class="tarjeta-formacion">

              <div class="cabecera-formacion">

                <div>
                  <span class="mini-etiqueta-doctor">
                    Formación académica adicional
                  </span>

                  <h2>
                    Estudios y certificaciones
                  </h2>

                  <p>
                    Agrega maestrías, especialidades,
                    doctorados, diplomados o certificaciones.
                  </p>
                </div>

                <button
                  v-if="!mostrarFormularioFormacion"
                  type="button"
                  class="boton-agregar-formacion"
                  @click="abrirFormularioFormacion"
                >
                  + Agregar formación
                </button>

              </div>

              <div
                v-if="
                  datosDoctor.formacionAdicional.length > 0
                "
                class="lista-formacion"
              >

                <article
                  v-for="
                    formacion in datosDoctor.formacionAdicional
                  "
                  :key="formacion.id"
                  class="item-formacion"
                >

                  <div class="contenido-formacion">

                    <div class="fila-tipo-formacion">

                      <span class="tipo-formacion">
                        {{ formacion.tipo }}
                      </span>

                      <span
                        class="estado-formacion"
                        :class="{
                          verificada:
                            formacion.verificada
                        }"
                      >
                        {{
                          formacion.verificada
                            ? 'Verificada'
                            : 'Información proporcionada'
                        }}
                      </span>

                    </div>

                    <h3>
                      {{ formacion.nombre }}
                    </h3>

                    <p>
                      {{ formacion.institucion }}
                    </p>

                    <div class="meta-formacion">

                      <span v-if="formacion.anio">
                        {{ formacion.anio }}
                      </span>

                      <span
                        v-if="
                          formacion.cedulaProfesional
                        "
                      >
                        Cédula:
                        {{ formacion.cedulaProfesional }}
                      </span>

                    </div>

                  </div>

                  <button
                    type="button"
                    class="boton-eliminar-formacion"
                    @click="
                      eliminarFormacion(formacion.id)
                    "
                  >
                    Eliminar
                  </button>

                </article>

              </div>

              <div
                v-else-if="
                  !mostrarFormularioFormacion
                "
                class="sin-formacion"
              >
                <p>
                  Aún no has agregado formación académica
                  adicional.
                </p>
              </div>

              <form
                v-if="mostrarFormularioFormacion"
                class="formulario-formacion"
                @submit.prevent="guardarFormacion"
              >

                <div class="rejilla-formacion">

                  <div class="grupo-campo-doctor">

                    <label for="tipoFormacion">
                      Tipo de formación
                    </label>

                    <select
                      id="tipoFormacion"
                      v-model="
                        formularioFormacion.tipo
                      "
                    >
                      <option
                        v-for="tipo in tiposFormacion"
                        :key="tipo"
                        :value="tipo"
                      >
                        {{ tipo }}
                      </option>
                    </select>

                  </div>

                  <div class="grupo-campo-doctor">

                    <label for="nombreFormacion">
                      Nombre
                    </label>

                    <input
                      id="nombreFormacion"
                      v-model="
                        formularioFormacion.nombre
                      "
                      type="text"
                      placeholder="Ej. Nutrición Clínica"
                    />

                    <small
                      v-if="
                        erroresFormacion.nombre
                      "
                    >
                      {{ erroresFormacion.nombre }}
                    </small>

                  </div>

                  <div class="grupo-campo-doctor">

                    <label for="institucionFormacion">
                      Institución
                    </label>

                    <input
                      id="institucionFormacion"
                      v-model="
                        formularioFormacion.institucion
                      "
                      type="text"
                      placeholder="Universidad o institución"
                    />

                    <small
                      v-if="
                        erroresFormacion.institucion
                      "
                    >
                      {{ erroresFormacion.institucion }}
                    </small>

                  </div>

                  <div class="grupo-campo-doctor">

                    <label for="anioFormacion">
                      Año
                    </label>

                    <input
                      id="anioFormacion"
                      v-model="
                        formularioFormacion.anio
                      "
                      type="text"
                      inputmode="numeric"
                      maxlength="4"
                      placeholder="Ej. 2024"
                    />

                    <small
                      v-if="
                        erroresFormacion.anio
                      "
                    >
                      {{ erroresFormacion.anio }}
                    </small>

                  </div>

                </div>

                <div class="bloque-cedula-formacion">

                  <div class="encabezado-cedula-formacion">

                    <div>
                      <strong>
                        ¿Esta formación tiene cédula profesional?
                      </strong>

                      <span>
                        Si cuenta con una cédula propia,
                        también podemos verificarla.
                      </span>
                    </div>

                    <div class="opciones-consultorio">

                      <button
                        type="button"
                        :class="{
                          activo:
                            formularioFormacion.tieneCedula
                        }"
                        @click="
                          formularioFormacion.tieneCedula = true
                        "
                      >
                        Sí
                      </button>

                      <button
                        type="button"
                        :class="{
                          activo:
                            !formularioFormacion.tieneCedula
                        }"
                        @click="quitarCedulaFormacion"
                      >
                        No
                      </button>

                    </div>

                  </div>

                  <div
                    v-if="
                      formularioFormacion.tieneCedula
                    "
                    class="fila-cedula-formacion"
                  >

                    <div class="grupo-campo-doctor">

                      <label for="cedulaFormacion">
                        Cédula profesional
                      </label>

                      <input
                        id="cedulaFormacion"
                        v-model="
                          formularioFormacion.cedulaProfesional
                        "
                        type="text"
                        inputmode="numeric"
                        maxlength="8"
                        placeholder="7 u 8 dígitos"
                        @input="alCambiarCedulaFormacion"
                      />

                      <small
                        v-if="
                          erroresFormacion.cedulaProfesional
                        "
                      >
                        {{
                          erroresFormacion.cedulaProfesional
                        }}
                      </small>

                    </div>

                    <button
                      type="button"
                      class="boton-verificar-formacion"
                      :disabled="
                        estadoCedulaFormacion === 'verificando' ||
                        !formularioFormacion.cedulaProfesional
                      "
                      @click="verificarCedulaFormacion"
                    >
                      {{
                        estadoCedulaFormacion === 'verificando'
                          ? 'Verificando...'
                          : estadoCedulaFormacion === 'verificada'
                            ? 'Verificada'
                            : 'Verificar cédula'
                      }}
                    </button>

                  </div>

                  <div
                    v-if="
                      estadoCedulaFormacion !== 'sin-verificar'
                    "
                    class="mensaje-verificacion-formacion"
                    :class="estadoCedulaFormacion"
                  >
                    {{
                      mensajeCedulaFormacion ||
                      (
                        estadoCedulaFormacion === 'verificando'
                          ? 'Consultando cédula...'
                          : ''
                      )
                    }}
                  </div>

                </div>

                <div class="acciones-formacion">

                  <button
                    type="button"
                    class="boton-cancelar-doctor"
                    :disabled="guardandoFormacion"
                    @click="cancelarFormacion"
                  >
                    Cancelar
                  </button>

                  <button
                    type="submit"
                    class="boton-guardar-doctor"
                    :disabled="guardandoFormacion"
                  >
                    {{
                      guardandoFormacion
                        ? 'Guardando...'
                        : 'Guardar formación'
                    }}
                  </button>

                </div>

              </form>

            </article>

            <article class="tarjeta-consultorio">

              <div class="cabecera-consultorio">

                <div>
                  <span class="mini-etiqueta-doctor">
                    Consultorio
                  </span>

                  <h2>
                    Datos de atención
                  </h2>
                </div>

                <span
                  class="estado-consultorio"
                  :class="{
                    activo:
                      datosDoctor.tieneConsultorio
                  }"
                >
                  {{
                    datosDoctor.tieneConsultorio
                      ? 'Consultorio registrado'
                      : 'Sin consultorio'
                  }}
                </span>

              </div>

              <template
                v-if="datosDoctor.tieneConsultorio"
              >

                <div class="rejilla-consultorio">

                  <div class="dato-doctor dato-ancho">
                    <span>
                      Ubicación
                    </span>

                    <strong>
                      {{ ubicacionConsultorio }}
                    </strong>
                  </div>

                  <div class="dato-doctor">
                    <span>
                      Horario de atención
                    </span>

                    <strong>
                      {{ horarioConsultorio }}
                    </strong>
                  </div>

                  <div class="dato-doctor">
                    <span>
                      Número de teléfono
                    </span>

                    <strong>
                      {{ telefonoConsultorio }}
                    </strong>
                  </div>

                </div>

              </template>

              <div
                v-else
                class="sin-consultorio"
              >
                <p>
                  Actualmente no tienes información
                  de un consultorio registrada.
                </p>

                <button
                  type="button"
                  class="boton-agregar-consultorio"
                  @click="activarEdicionCuenta"
                >
                  Agregar consultorio
                </button>
              </div>

            </article>

            <article class="tarjeta-legal-cuenta">

              <div class="cabecera-legal-cuenta">

                <div>
                  <span class="mini-etiqueta-doctor">
                    Privacidad y legal
                  </span>

                  <h2>
                    Protección de la información
                  </h2>

                  <p>
                    Consulta los documentos vigentes y el registro
                    de aceptación asociado a tu cuenta profesional.
                  </p>
                </div>

                <span
                  class="estado-legal-cuenta"
                  :class="{ vigente: consentimientoLegalVigente }"
                >
                  {{
                    consentimientoLegalVigente
                      ? 'Aceptación vigente'
                      : 'Revisión requerida'
                  }}
                </span>

              </div>

              <div class="lista-documentos-legales-cuenta">

                <button
                  type="button"
                  class="documento-legal-cuenta"
                  @click="abrirDocumentoLegal('aviso')"
                >
                  <div>
                    <strong>
                      Aviso de Privacidad
                    </strong>

                    <span>
                      Versión {{ VERSION_AVISO_PRIVACIDAD }}
                    </span>
                  </div>

                  <span class="flecha-documento-legal">
                    Ver documento ›
                  </span>
                </button>

                <button
                  type="button"
                  class="documento-legal-cuenta"
                  @click="abrirDocumentoLegal('terminos')"
                >
                  <div>
                    <strong>
                      Términos y Condiciones
                    </strong>

                    <span>
                      Versión {{ VERSION_TERMINOS }}
                    </span>
                  </div>

                  <span class="flecha-documento-legal">
                    Ver documento ›
                  </span>
                </button>

              </div>

              <div class="resumen-aceptacion-legal">
                <div>
                  <span>
                    Medio
                  </span>
                  <strong>
                    {{
                      consentimientoLegalActual?.medioAceptacion ||
                      'No registrado'
                    }}
                  </strong>
                </div>

                <div>
                  <span>
                    Fecha de aceptación
                  </span>
                  <strong>
                    {{ fechaAceptacionLegalTexto }}
                  </strong>
                </div>
              </div>

            </article>

            <p
              v-if="mensajeCuenta"
              class="mensaje-cuenta correcto"
            >
              {{ mensajeCuenta }}
            </p>

            <p
              v-if="mensajeErrorCuenta"
              class="mensaje-cuenta error"
            >
              {{ mensajeErrorCuenta }}
            </p>

          </section>

          <!-- ================================================
               MODO EDICIÓN
               ================================================ -->
          <form
            v-else
            class="formulario-cuenta-doctor"
            @submit.prevent="guardarCuentaDoctor"
          >

            <article class="tarjeta-formulario-doctor">

              <div class="cabecera-formulario-doctor">
                <div>
                  <span class="mini-etiqueta-doctor">
                    Información profesional
                  </span>

                  <h2>
                    Editar datos
                  </h2>
                </div>

                <p>
                  Completa la información que utilizarás
                  como profesional dentro de la plataforma.
                </p>
              </div>

              <div class="rejilla-formulario-doctor">

                <div class="grupo-campo-doctor">

                  <label for="nombreDoctor">
                    Nombre completo
                  </label>

                  <input
                    id="nombreDoctor"
                    v-model="
                      formularioDoctor.nombreCompleto
                    "
                    type="text"
                    autocomplete="name"
                    placeholder="Nombre completo"
                  />

                  <small
                    v-if="
                      erroresCuenta.nombreCompleto
                    "
                  >
                    {{
                      erroresCuenta.nombreCompleto
                    }}
                  </small>

                </div>

                <div class="grupo-campo-doctor">

                  <label for="especialidadDoctor">
                    Especialidad o área de atención
                  </label>

                  <input
                    id="especialidadDoctor"
                    v-model="
                      formularioDoctor.especialidad
                    "
                    type="text"
                    placeholder="Ej. Cardiología, Nutrición clínica, Psicología..."
                  />

                  <small
                    v-if="
                      erroresCuenta.especialidad
                    "
                  >
                    {{
                      erroresCuenta.especialidad
                    }}
                  </small>

                </div>

                <div class="grupo-campo-doctor">

                  <label for="cedulaDoctor">
                    Cédula profesional
                  </label>

                  <input
                    id="cedulaDoctor"
                    v-model="
                      formularioDoctor.cedulaProfesional
                    "
                    type="text"
                    inputmode="numeric"
                    placeholder="Número de cédula"
                  />

                  <small
                    v-if="
                      erroresCuenta.cedulaProfesional
                    "
                  >
                    {{
                      erroresCuenta.cedulaProfesional
                    }}
                  </small>

                </div>

              </div>

            </article>

            <article class="tarjeta-formulario-doctor">

              <div class="cabecera-formulario-doctor">

                <div>
                  <span class="mini-etiqueta-doctor">
                    Consultorio
                  </span>

                  <h2>
                    Información de atención
                  </h2>
                </div>

              </div>

              <div class="selector-consultorio">

                <div>
                  <strong>
                    ¿Cuentas con consultorio?
                  </strong>

                  <span>
                    Agrega esta información solamente
                    si actualmente atiendes en uno.
                  </span>
                </div>

                <div class="opciones-consultorio">

                  <button
                    type="button"
                    :class="{
                      activo:
                        formularioDoctor
                          .tieneConsultorio
                    }"
                    @click="
                      formularioDoctor
                        .tieneConsultorio = true
                    "
                  >
                    Sí
                  </button>

                  <button
                    type="button"
                    :class="{
                      activo:
                        !formularioDoctor
                          .tieneConsultorio
                    }"
                    @click="
                      formularioDoctor
                        .tieneConsultorio = false
                    "
                  >
                    No
                  </button>

                </div>

              </div>

              <div
                v-if="
                  formularioDoctor.tieneConsultorio
                "
                class="rejilla-formulario-doctor consultorio-formulario"
              >

                <div
                  class="grupo-campo-doctor campo-completo"
                >

                  <label for="ubicacionConsultorio">
                    Ubicación del consultorio
                  </label>

                  <input
                    id="ubicacionConsultorio"
                    v-model="
                      formularioDoctor.ubicacion
                    "
                    type="text"
                    placeholder="Dirección o ubicación"
                  />

                  <small
                    v-if="
                      erroresCuenta.ubicacion
                    "
                  >
                    {{ erroresCuenta.ubicacion }}
                  </small>

                </div>

                <div class="grupo-campo-doctor">

                  <label for="horarioConsultorio">
                    Horario de atención
                  </label>

                  <input
                    id="horarioConsultorio"
                    v-model="
                      formularioDoctor
                        .horarioAtencion
                    "
                    type="text"
                    placeholder="Ej. Lun - Vie, 9:00 a 17:00"
                  />

                  <small
                    v-if="
                      erroresCuenta.horarioAtencion
                    "
                  >
                    {{
                      erroresCuenta.horarioAtencion
                    }}
                  </small>

                </div>

                <div class="grupo-campo-doctor">

                  <label for="telefonoConsultorio">
                    Número de teléfono
                  </label>

                  <input
                    id="telefonoConsultorio"
                    v-model="
                      formularioDoctor.telefono
                    "
                    type="tel"
                    inputmode="tel"
                    placeholder="10 dígitos"
                  />

                  <small
                    v-if="
                      erroresCuenta.telefono
                    "
                  >
                    {{ erroresCuenta.telefono }}
                  </small>

                </div>

              </div>

            </article>

            <p
              v-if="mensajeErrorCuenta"
              class="mensaje-cuenta error"
            >
              {{ mensajeErrorCuenta }}
            </p>

            <div class="acciones-formulario-doctor">

              <button
                type="button"
                class="boton-cancelar-doctor"
                :disabled="guardandoCuenta"
                @click="cancelarEdicionCuenta"
              >
                Cancelar
              </button>

              <button
                type="submit"
                class="boton-guardar-doctor"
                :disabled="guardandoCuenta"
              >
                {{
                  guardandoCuenta
                    ? 'Guardando...'
                    : 'Guardar cambios'
                }}
              </button>

            </div>

          </form>

        </template>

      </template>

    </section>



    <!-- ====================================================
         CONSENTIMIENTO LEGAL OBLIGATORIO
         ==================================================== -->
    <div
      v-if="consentimientoLegalCargado && mostrarConsentimientoLegal"
      class="fondo-consentimiento-legal"
    >

      <section class="modal-consentimiento-legal">

        <div class="icono-privacidad-legal">
          🛡️
        </div>

        <span class="etiqueta-panel">
          Privacidad y seguridad
        </span>

        <h2>
          Tu información es importante
        </h2>

        <p class="introduccion-consentimiento-legal">
          Vibra la Vida utiliza información personal y datos
          relacionados con la salud para ofrecer sus funciones.
          La información deberá tratarse únicamente para las
          finalidades autorizadas y mediante las medidas de
          protección previstas por la plataforma.
        </p>

        <div class="documentos-consentimiento-legal">

          <button
            type="button"
            @click="abrirDocumentoLegal('aviso')"
          >
            <div>
              <strong>
                Aviso de Privacidad
              </strong>
              <span>
                Conoce qué datos se tratan y cómo se protegen.
              </span>
            </div>
            <span>Ver ›</span>
          </button>

          <button
            type="button"
            @click="abrirDocumentoLegal('terminos')"
          >
            <div>
              <strong>
                Términos y Condiciones
              </strong>
              <span>
                Conoce las reglas y alcance de la plataforma.
              </span>
            </div>
            <span>Ver ›</span>
          </button>

        </div>

        <div class="checks-consentimiento-legal">

          <label>
            <input
              v-model="aceptoAvisoPrivacidad"
              type="checkbox"
            />
            <span>
              He leído y acepto el Aviso de Privacidad
              versión {{ VERSION_AVISO_PRIVACIDAD }}.
            </span>
          </label>

          <label>
            <input
              v-model="aceptoTerminosCondiciones"
              type="checkbox"
            />
            <span>
              He leído y acepto los Términos y Condiciones
              versión {{ VERSION_TERMINOS }}.
            </span>
          </label>

          <label>
            <input
              v-model="aceptoConfidencialidadProfesional"
              type="checkbox"
            />
            <span>
              Reconozco que la información de los pacientes es
              confidencial y me comprometo a utilizarla únicamente
              dentro de las funciones y seguimientos autorizados
              en Vibra la Vida.
            </span>
          </label>

        </div>

        <p class="nota-proteccion-legal">
          Vibra la Vida no comercializará ni venderá los datos
          personales de sus usuarios.
        </p>

        <p
          v-if="mensajeErrorConsentimientoLegal"
          class="mensaje-legal-error"
        >
          {{ mensajeErrorConsentimientoLegal }}
        </p>

        <div class="acciones-consentimiento-legal">
          <button
            type="button"
            class="boton-no-acepto-consentimiento"
            :disabled="guardandoConsentimientoLegal"
            @click="rechazarConsentimientoLegal"
          >
            No acepto
          </button>

          <button
            type="button"
            class="boton-aceptar-consentimiento"
            :disabled="guardandoConsentimientoLegal"
            @click="guardarConsentimientoLegal"
          >
            {{
              guardandoConsentimientoLegal
                ? 'Guardando aceptación...'
                : 'Aceptar y continuar'
            }}
          </button>
        </div>

      </section>

    </div>

    <!-- ====================================================
         DOCUMENTO LEGAL COMPLETO
         ==================================================== -->
    <div
      v-if="documentoLegalAbierto"
      class="fondo-documento-legal"
      @click.self="cerrarDocumentoLegal"
    >

      <section class="modal-documento-legal">

        <header class="cabecera-documento-legal">
          <div>
            <span class="mini-etiqueta-doctor">
              Documento legal
            </span>

            <h2>
              {{
                documentoLegalAbierto === 'aviso'
                  ? 'Aviso de Privacidad'
                  : 'Términos y Condiciones'
              }}
            </h2>
          </div>

          <button
            type="button"
            aria-label="Cerrar documento"
            @click="cerrarDocumentoLegal"
          >
            ×
          </button>
        </header>

        <div class="contenido-documento-legal">
          <pre>{{
            documentoLegalAbierto === 'aviso'
              ? avisoPrivacidadTexto
              : terminosCondicionesTexto
          }}</pre>
        </div>

        <footer class="pie-documento-legal">
          <button
            type="button"
            @click="cerrarDocumentoLegal"
          >
            Cerrar documento
          </button>
        </footer>

      </section>

    </div>

  </main>
</template>

<style
  scoped
  src="../assets/styles/panelDoctor.css"></style>