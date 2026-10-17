<script setup>
// ============================================================================
// ITEM DEL HISTORIAL - VIBRA LA VIDA
// ============================================================================
//
// Este componente recibe un resultado guardado y lo muestra de forma visual.
// Está preparado para:
// - IMC
// - Calorías
// - DASS-21
// - Escala de Insomnio de Atenas
// - Riesgo cardiometabólico
// - Riesgo cardiovascular
//
// ============================================================================

const props = defineProps({
  resultado: {
    type: Object,
    required: true,
  },
})


// ============================================================================
// NOMBRE DE LA HERRAMIENTA
// ============================================================================

const obtenerNombreResultado = () => {
  if (props.resultado.nombreHerramienta) {
    return props.resultado.nombreHerramienta
  }

  const nombres = {
    imc: 'Calculadora de IMC',
    calorias: 'Calculadora de Calorías',
    dass21: 'Evaluación DASS-21',
    insomnio: 'Escala de Insomnio de Atenas',
    riesgo_cardiometabolico: 'Riesgo Cardiometabólico',
    riesgo_cardiovascular: 'Riesgo Cardiovascular',
  }

  return nombres[props.resultado.tipo] || 'Resultado guardado'
}


// ============================================================================
// TEXTO DEL ÍCONO
// ============================================================================

const obtenerIconoResultado = () => {
  const iconos = {
    imc: 'IMC',
    calorias: 'CAL',
    dass21: 'D21',
    insomnio: 'AIS',
    riesgo_cardiometabolico: 'RC',
    riesgo_cardiovascular: 'RC',
  }

  return iconos[props.resultado.tipo] || 'OK'
}


// ============================================================================
// CLASE DEL ÍCONO SEGÚN EL TIPO
// ============================================================================

const obtenerClaseHistorial = () => {
  const clases = {
    imc: 'historial-imc',
    calorias: 'historial-calorias',
    dass21: 'historial-dass',
    insomnio: 'historial-sueno',
    riesgo_cardiometabolico: 'historial-riesgo',
    riesgo_cardiovascular: 'historial-riesgo',
  }

  return clases[props.resultado.tipo] || 'historial-general'
}


// ============================================================================
// FECHA
// ============================================================================

const formatearFecha = () => {
  const fecha = props.resultado.fecha || props.resultado.fechaRegistro

  if (!fecha) {
    return 'Fecha reciente'
  }

  let fechaFinal = null

  // Timestamp directo de Firestore.
  if (typeof fecha?.toDate === 'function') {
    fechaFinal = fecha.toDate()
  }

  // Date de JavaScript.
  else if (fecha instanceof Date) {
    fechaFinal = fecha
  }

  // Timestamp serializado por Firebase Admin.
  else if (typeof fecha?._seconds === 'number') {
    fechaFinal = new Date(fecha._seconds * 1000)
  }

  // Otra variante posible del Timestamp serializado.
  else if (typeof fecha?.seconds === 'number') {
    fechaFinal = new Date(fecha.seconds * 1000)
  }

  // Fecha recibida como texto.
  else if (typeof fecha === 'string') {
    const fechaConvertida = new Date(fecha)

    if (!Number.isNaN(fechaConvertida.getTime())) {
      fechaFinal = fechaConvertida
    }
  }

  if (!fechaFinal || Number.isNaN(fechaFinal.getTime())) {
    return 'Fecha reciente'
  }

  return fechaFinal.toLocaleDateString('es-MX', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })
}


// ============================================================================
// FORMATEAR NÚMEROS
// ============================================================================
//
// Evita mostrar valores como:
// 27.141582391433676
//
// Y los convierte en:
// 27.14
//
// ============================================================================

const formatearNumero = (valor) => {
  const numero = Number(valor)

  if (!Number.isFinite(numero)) {
    return null
  }

  return new Intl.NumberFormat('es-MX', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(numero)
}


// ============================================================================
// CLASE SEMÁNTICA PARA RESULTADOS
// ============================================================================

const obtenerClaseCategoria = (texto = '') => {
  const valor = String(texto)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')

  if (
    valor.includes('normal') ||
    valor.includes('saludable') ||
    valor.includes('bajo riesgo')
  ) {
    return 'chip-verde'
  }

  if (
    valor.includes('sobrepeso') ||
    valor.includes('moderado') ||
    valor.includes('leve')
  ) {
    return 'chip-amarillo'
  }

  if (
    valor.includes('obesidad') ||
    valor.includes('alto') ||
    valor.includes('severo') ||
    valor.includes('grave')
  ) {
    return 'chip-rojo'
  }

  if (valor.includes('bajo peso')) {
    return 'chip-azul'
  }

  return 'chip-neutro'
}


// ============================================================================
// ETIQUETAS DEL RESULTADO
// ============================================================================
//
// En vez de mostrar todo el resultado como una frase larga,
// lo dividimos en pequeñas etiquetas visuales.
//
// ============================================================================

const obtenerEtiquetasResultado = () => {
  const resultado = props.resultado

  // --------------------------------------------------------------------------
  // IMC
  // --------------------------------------------------------------------------

  if (resultado.tipo === 'imc') {
    const categoria =
      resultado.categoria ||
      resultado.clasificacion ||
      'IMC registrado'

    const valorImc =
      formatearNumero(
        resultado.imc ??
        resultado.puntaje
      )

    const etiquetas = [
      {
        texto: categoria,
        clase: obtenerClaseCategoria(categoria),
      },
    ]

    if (valorImc !== null) {
      etiquetas.push({
        texto: `IMC ${valorImc}`,
        clase: 'chip-valor',
      })
    }

    return etiquetas
  }


  // --------------------------------------------------------------------------
  // CALORÍAS
  // --------------------------------------------------------------------------

  if (resultado.tipo === 'calorias') {
    const calorias =
      formatearNumero(
        resultado.calorias ??
        resultado.puntaje
      )

    return [
      {
        texto:
          calorias !== null
            ? `${calorias} kcal/día`
            : 'Estimación registrada',
        clase: 'chip-verde',
      },
    ]
  }


  // --------------------------------------------------------------------------
  // DASS-21
  // --------------------------------------------------------------------------

  if (resultado.tipo === 'dass21') {
    return [
      {
        texto: `Depresión: ${resultado.nivelDepresion || 'N/A'}`,
        clase: obtenerClaseCategoria(resultado.nivelDepresion),
      },
      {
        texto: `Ansiedad: ${resultado.nivelAnsiedad || 'N/A'}`,
        clase: obtenerClaseCategoria(resultado.nivelAnsiedad),
      },
      {
        texto: `Estrés: ${resultado.nivelEstres || 'N/A'}`,
        clase: obtenerClaseCategoria(resultado.nivelEstres),
      },
    ]
  }


  // --------------------------------------------------------------------------
  // INSOMNIO DE ATENAS
  // --------------------------------------------------------------------------

  if (resultado.tipo === 'insomnio') {
    const texto =
      resultado.interpretacion ||
      resultado.categoria ||
      resultado.clasificacion ||
      'Resultado de sueño registrado'

    return [
      {
        texto,
        clase: obtenerClaseCategoria(texto),
      },
    ]
  }


  // --------------------------------------------------------------------------
  // RIESGO CARDIOMETABÓLICO / CARDIOVASCULAR
  // --------------------------------------------------------------------------

  if (
    resultado.tipo === 'riesgo_cardiometabolico' ||
    resultado.tipo === 'riesgo_cardiovascular'
  ) {
    const nivel =
      resultado.nivelRiesgo ||
      resultado.nivel ||
      resultado.clasificacion ||
      'Resultado calculado'

    const porcentaje =
      formatearNumero(
        resultado.porcentaje ??
        resultado.puntaje
      )

    const etiquetas = [
      {
        texto: nivel,
        clase: obtenerClaseCategoria(nivel),
      },
    ]

    if (porcentaje !== null) {
      etiquetas.push({
        texto: `${porcentaje}%`,
        clase: 'chip-valor',
      })
    }

    return etiquetas
  }


  // --------------------------------------------------------------------------
  // OTROS RESULTADOS
  // --------------------------------------------------------------------------

  return [
    {
      texto:
        resultado.clasificacion ||
        resultado.categoria ||
        'Registro guardado correctamente',
      clase: 'chip-neutro',
    },
  ]
}
</script>


<template>
  <article class="item-historial">
    <!-- Ícono de la herramienta -->
    <div
      class="icono-historial"
      :class="obtenerClaseHistorial()"
    >
      {{ obtenerIconoResultado() }}
    </div>


    <!-- Información -->
    <div class="contenido-historial">

      <!-- Encabezado -->
      <div class="cabecera-historial">
        <strong class="titulo-historial">
          {{ obtenerNombreResultado() }}
        </strong>

        <time class="fecha-historial">
          {{ formatearFecha() }}
        </time>
      </div>


      <!-- Resultado -->
      <div class="chips-historial">
        <span
          v-for="(etiqueta, index) in obtenerEtiquetasResultado()"
          :key="`${etiqueta.texto}-${index}`"
          class="chip-resultado"
          :class="etiqueta.clase"
        >
          {{ etiqueta.texto }}
        </span>
      </div>

    </div>
  </article>
</template>


<style scoped>
/* ============================================================================
   TARJETA PRINCIPAL
   ============================================================================ */

.item-historial {
  display: flex;
  align-items: flex-start;
  gap: 18px;

  width: 100%;
  padding: 20px 22px;

  border: 1px solid #dce8ec;
  border-radius: 20px;

  background: #ffffff;

  box-shadow:
    0 8px 22px rgba(23, 59, 87, 0.05);

  transition:
    transform 0.2s ease,
    box-shadow 0.2s ease,
    border-color 0.2s ease;
}


.item-historial:hover {
  transform: translateY(-2px);

  border-color: #b8dfe3;

  box-shadow:
    0 12px 28px rgba(23, 59, 87, 0.09);
}


/* ============================================================================
   ÍCONO
   ============================================================================ */

.icono-historial {
  flex: 0 0 58px;

  width: 58px;
  height: 58px;

  display: flex;
  align-items: center;
  justify-content: center;

  border-radius: 18px;

  font-size: 13px;
  font-weight: 900;
  letter-spacing: 0.03em;
}


/* IMC */
.historial-imc {
  color: #0f6e83;
  background: #e4f6f8;
}


/* Calorías */
.historial-calorias {
  color: #2e7d32;
  background: #edf8e9;
}


/* DASS-21 */
.historial-dass {
  color: #087f8c;
  background: #e6f8f8;
}


/* Sueño */
.historial-sueno {
  color: #355d83;
  background: #edf4fb;
}


/* Riesgos */
.historial-riesgo {
  color: #b45309;
  background: #fff7e6;
}


/* General */
.historial-general {
  color: #173b57;
  background: #eef4f7;
}


/* ============================================================================
   CONTENIDO
   ============================================================================ */

.contenido-historial {
  flex: 1;
  min-width: 0;
}


/* ============================================================================
   CABECERA
   ============================================================================ */

.cabecera-historial {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 18px;

  margin-bottom: 14px;
}


.titulo-historial {
  color: #173b57;

  font-size: 18px;
  font-weight: 900;
  line-height: 1.35;
}


.fecha-historial {
  flex-shrink: 0;

  padding-top: 2px;

  color: #64748b;

  font-size: 13px;
  font-weight: 600;

  white-space: nowrap;
}


/* ============================================================================
   CHIPS DEL RESULTADO
   ============================================================================ */

.chips-historial {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 9px;
}


.chip-resultado {
  display: inline-flex;
  align-items: center;

  min-height: 34px;

  padding: 7px 12px;

  border-radius: 999px;

  font-size: 13px;
  font-weight: 800;
  line-height: 1.2;
}


/* Resultado normal / favorable */
.chip-verde {
  color: #16723b;
  background: #e7f8ee;
}


/* Resultado intermedio */
.chip-amarillo {
  color: #9a6700;
  background: #fff4d6;
}


/* Resultado elevado */
.chip-rojo {
  color: #b42318;
  background: #fdecec;
}


/* Bajo peso / informativo */
.chip-azul {
  color: #1769aa;
  background: #eaf4ff;
}


/* Valor numérico */
.chip-valor {
  color: #0f6e83;
  background: #e7f7f8;
}


/* Otro */
.chip-neutro {
  color: #475569;
  background: #f1f5f9;
}


/* ============================================================================
   RESPONSIVE
   ============================================================================ */

@media (max-width: 680px) {

  .item-historial {
    gap: 14px;
    padding: 17px;
  }


  .icono-historial {
    flex-basis: 50px;

    width: 50px;
    height: 50px;

    border-radius: 15px;

    font-size: 12px;
  }


  .cabecera-historial {
    flex-direction: column;
    gap: 5px;

    margin-bottom: 12px;
  }


  .titulo-historial {
    font-size: 16px;
  }


  .fecha-historial {
    white-space: normal;
  }


  .chip-resultado {
    font-size: 12px;
  }
}
</style>
