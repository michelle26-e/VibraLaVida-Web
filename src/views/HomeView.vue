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
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
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
// PRIVACIDAD Y LEGAL - HOME WEB DEL PACIENTE
// ==========================================================
// El Home sigue siendo público. El consentimiento obligatorio
// solamente se muestra cuando existe una sesión de paciente y
// no hay una aceptación vigente de la versión actual.
// ==========================================================

const VERSION_AVISO_PRIVACIDAD = '1.0'
const VERSION_TERMINOS = '1.0'

const consentimientoLegalCargado = ref(false)
const mostrarConsentimientoLegal = ref(false)
const documentoLegalAbierto = ref('')

const aceptoAvisoPrivacidad = ref(false)
const aceptoTerminosCondiciones = ref(false)
const aceptoDatosSensibles = ref(false)

const guardandoConsentimientoLegal = ref(false)
const mensajeErrorConsentimientoLegal = ref('')

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

const abrirDocumentoLegal = (tipo) => {
  documentoLegalAbierto.value = tipo
}

const cerrarDocumentoLegal = () => {
  documentoLegalAbierto.value = ''
}

const revisarConsentimientoLegal = async (usuario) => {
  consentimientoLegalCargado.value = false
  mensajeErrorConsentimientoLegal.value = ''

  try {
    const referencia = doc(db, 'usuarios', usuario.uid)
    const snapshot = await getDoc(referencia)
    const consentimiento = snapshot.exists()
      ? snapshot.data()?.consentimientoLegal || null
      : null

    const vigente = Boolean(
      consentimiento?.avisoPrivacidadAceptado === true &&
      consentimiento?.avisoPrivacidadVersion === VERSION_AVISO_PRIVACIDAD &&
      consentimiento?.terminosAceptados === true &&
      consentimiento?.terminosVersion === VERSION_TERMINOS &&
      consentimiento?.datosSensiblesAceptados === true
    )

    mostrarConsentimientoLegal.value = !vigente
    aceptoAvisoPrivacidad.value = vigente
    aceptoTerminosCondiciones.value = vigente
    aceptoDatosSensibles.value = vigente
  } catch (error) {
    console.error('Error al revisar consentimiento legal del paciente:', error)
    mostrarConsentimientoLegal.value = true
    mensajeErrorConsentimientoLegal.value =
      'No fue posible comprobar tu aceptación anterior. Revisa los documentos e inténtalo nuevamente.'
  } finally {
    consentimientoLegalCargado.value = true
  }
}

const guardarConsentimientoLegal = async () => {
  mensajeErrorConsentimientoLegal.value = ''

  if (
    !aceptoAvisoPrivacidad.value ||
    !aceptoTerminosCondiciones.value ||
    !aceptoDatosSensibles.value
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
    await setDoc(
      doc(db, 'usuarios', usuario.uid),
      {
        consentimientoLegal: {
          avisoPrivacidadAceptado: true,
          avisoPrivacidadVersion: VERSION_AVISO_PRIVACIDAD,
          terminosAceptados: true,
          terminosVersion: VERSION_TERMINOS,
          datosSensiblesAceptados: true,
          estadoConsentimiento: 'activo',
          medioAceptacion: 'web-home-paciente',
          fechaAceptacion: serverTimestamp(),
        },
      },
      { merge: true }
    )

    mostrarConsentimientoLegal.value = false
  } catch (error) {
    console.error('Error al guardar consentimiento legal del paciente:', error)
    mensajeErrorConsentimientoLegal.value =
      'No fue posible guardar tu aceptación. Intenta nuevamente.'
  } finally {
    guardandoConsentimientoLegal.value = false
  }
}

const rechazarConsentimientoLegal = async () => {
  mensajeErrorConsentimientoLegal.value = ''
  mostrarConsentimientoLegal.value = false

  try {
    await cerrarSesionUsuario()
  } catch (error) {
    console.error('Error al cerrar sesión después de rechazar:', error)
  }

  usuarioActual.value = null
  datosUsuario.value = null
  tieneEquipoSalud.value = false
  consentimientoLegalCargado.value = true

  await router.push('/')
}


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

        await revisarConsentimientoLegal(
          usuario
        )
      } else {
        tieneEquipoSalud.value = false
        consentimientoLegalCargado.value = true
        mostrarConsentimientoLegal.value = false
      }
    } else {
      datosUsuario.value = null
      tieneEquipoSalud.value = false
      consentimientoLegalCargado.value = true
      mostrarConsentimientoLegal.value = false
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

    <!-- ====================================================
         ENLACES LEGALES PÚBLICOS
         ==================================================== -->
    <footer class="pie-legal-home">
      <span>© Vibra la Vida</span>
      <button type="button" @click="abrirDocumentoLegal('aviso')">
        Aviso de Privacidad
      </button>
      <button type="button" @click="abrirDocumentoLegal('terminos')">
        Términos y Condiciones
      </button>
    </footer>

    <!-- ====================================================
         CONSENTIMIENTO LEGAL DEL PACIENTE
         ==================================================== -->
    <div
      v-if="usuarioActual && consentimientoLegalCargado && mostrarConsentimientoLegal"
      class="fondo-consentimiento-home"
    >
      <section class="modal-consentimiento-home">
        <div class="icono-privacidad-home">🛡️</div>
        <span class="etiqueta-legal-home">Privacidad y seguridad</span>

        <h2>Tu información es importante</h2>

        <p class="introduccion-consentimiento-home">
          Vibra la Vida utiliza información personal y datos relacionados
          con tu salud para ofrecer sus funciones. Antes de continuar,
          revisa cómo se utilizará y protegerá tu información.
        </p>

        <div class="documentos-consentimiento-home">
          <button type="button" @click="abrirDocumentoLegal('aviso')">
            <div>
              <strong>Aviso de Privacidad</strong>
              <span>Conoce qué datos se tratan y cómo se protegen.</span>
            </div>
            <span>Ver ›</span>
          </button>

          <button type="button" @click="abrirDocumentoLegal('terminos')">
            <div>
              <strong>Términos y Condiciones</strong>
              <span>Conoce las reglas y alcance de la plataforma.</span>
            </div>
            <span>Ver ›</span>
          </button>
        </div>

        <div class="checks-consentimiento-home">
          <label>
            <input v-model="aceptoAvisoPrivacidad" type="checkbox" />
            <span>
              He leído y acepto el Aviso de Privacidad versión
              {{ VERSION_AVISO_PRIVACIDAD }}.
            </span>
          </label>

          <label>
            <input v-model="aceptoTerminosCondiciones" type="checkbox" />
            <span>
              He leído y acepto los Términos y Condiciones versión
              {{ VERSION_TERMINOS }}.
            </span>
          </label>

          <label>
            <input v-model="aceptoDatosSensibles" type="checkbox" />
            <span>
              Otorgo mi consentimiento expreso para el tratamiento de mis
              datos personales sensibles relacionados con mi salud, conforme
              al Aviso de Privacidad.
            </span>
          </label>
        </div>

        <p class="nota-proteccion-home">
          Vibra la Vida no comercializará ni venderá tus datos personales.
        </p>

        <p v-if="mensajeErrorConsentimientoLegal" class="mensaje-legal-home-error">
          {{ mensajeErrorConsentimientoLegal }}
        </p>

        <div class="acciones-consentimiento-home">
          <button
            type="button"
            class="boton-no-acepto-home"
            :disabled="guardandoConsentimientoLegal"
            @click="rechazarConsentimientoLegal"
          >
            No acepto
          </button>

          <button
            type="button"
            class="boton-aceptar-home"
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
         DOCUMENTOS LEGALES COMPLETOS
         ==================================================== -->
    <div
      v-if="documentoLegalAbierto"
      class="fondo-documento-home"
      @click.self="cerrarDocumentoLegal"
    >
      <section class="modal-documento-home">
        <header class="cabecera-documento-home">
          <div>
            <span>Documento legal</span>
            <h2>
              {{
                documentoLegalAbierto === 'aviso'
                  ? 'Aviso de Privacidad'
                  : 'Términos y Condiciones'
              }}
            </h2>
          </div>

          <button type="button" aria-label="Cerrar documento" @click="cerrarDocumentoLegal">
            ×
          </button>
        </header>

        <div class="contenido-documento-home">
          <pre>{{
            documentoLegalAbierto === 'aviso'
              ? avisoPrivacidadTexto
              : terminosCondicionesTexto
          }}</pre>
        </div>

        <footer class="pie-documento-home">
          <button type="button" @click="cerrarDocumentoLegal">
            Cerrar documento
          </button>
        </footer>
      </section>
    </div>
  </div>
</template>

<style scoped src="../assets/styles/home.css"></style>