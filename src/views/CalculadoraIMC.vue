<script setup>
// Importamos lo que necesitamos para que la página funcione
import { ref } from 'vue'
import { RouterLink } from 'vue-router'
import { calcularIMCApi } from '../services/calculadorasApi'
import { guardarResultadoBienestar } from '../services/resultadosService'
import BotonVolver from '../components/BotonVolver.vue'

// Guardamos los datos que ingresa el usuario (edad, peso, altura, género)
const formulario = ref({
  edad: '',
  genero: 'hombre',
  altura: '',
  peso: '',
})

const errores = ref({})
const calculado = ref(false)
const calculando = ref(false)
const mensajeGuardado = ref('')

// Aquí guardamos el resultado del cálculo del Índice de Masa Corporal
const resultadoIMC = ref({
  valor: '--',
  categoria: 'Sin calcular',
  clase: 'sin-calcular',
  descripcion: 'Ingresa tus datos y presiona el botón para calcular tu IMC.',
  posicionIndicador: 0,
})

const ocultarResultado = () => {
  calculado.value = false
  mensajeGuardado.value = ''
  errores.value = {}

  resultadoIMC.value = {
    valor: '--',
    categoria: 'Sin calcular',
    clase: 'sin-calcular',
    descripcion: 'Ingresa tus datos y presiona el botón para calcular tu IMC.',
    posicionIndicador: 0,
  }
}

const seleccionarGenero = (genero) => {
  formulario.value.genero = genero
  ocultarResultado()
}

// Revisamos que los datos ingresados sean correctos
const validarFormulario = () => {
  const nuevosErrores = {}

  const edad = Number(formulario.value.edad)
  const altura = Number(formulario.value.altura)
  const peso = Number(formulario.value.peso)

  if (!edad) {
    nuevosErrores.edad = 'Ingresa tu edad.'
  } else if (edad < 10 || edad > 100) {
    nuevosErrores.edad = 'Ingresa una edad válida.'
  }

  if (!altura) {
    nuevosErrores.altura = 'Ingresa tu altura.'
  } else if (altura < 100 || altura > 230) {
    nuevosErrores.altura = 'Ingresa una altura válida en centímetros.'
  }

  if (!peso) {
    nuevosErrores.peso = 'Ingresa tu peso.'
  } else if (peso < 25 || peso > 250) {
    nuevosErrores.peso = 'Ingresa un peso válido en kilogramos.'
  }

  errores.value = nuevosErrores

  return Object.keys(nuevosErrores).length === 0
}

// Guardamos el resultado en la cuenta del usuario
const guardarResultadoIMC = async () => {
  mensajeGuardado.value = ''

  try {
    await guardarResultadoBienestar({
      tipo: 'imc',
      nombreHerramienta: 'Calculadora de IMC',
      edad: Number(formulario.value.edad),
      genero: formulario.value.genero,
      alturaCm: Number(formulario.value.altura),
      pesoKg: Number(formulario.value.peso),
      imc: resultadoIMC.value.valor,
      categoria: resultadoIMC.value.categoria,
      descripcion: resultadoIMC.value.descripcion,
    })

    mensajeGuardado.value = 'Resultado guardado correctamente en Mi cuenta.'
  } catch (error) {
    console.error('Error al guardar el resultado de IMC:', error)

    if (error.message?.includes('iniciar sesión')) {
      mensajeGuardado.value =
        '¿Quieres guardar este resultado? Inicia sesión en tu cuenta para conservarlo.'
      return
    }

    mensajeGuardado.value =
      'Resultado calculado, pero no se pudo guardar en este momento.'
  }
}

// Función que calcula el Índice de Masa Corporal
const calcularIMC = async () => {
  if (!validarFormulario()) {
    calculado.value = false
    return
  }

  calculando.value = true
  mensajeGuardado.value = ''

  try {
    const respuesta = await calcularIMCApi({
      edad: Number(formulario.value.edad),
      peso: Number(formulario.value.peso),
      altura: Number(formulario.value.altura),
      genero: formulario.value.genero,
    })

    const datosResultado = respuesta.resultado

    resultadoIMC.value = {
      valor: String(datosResultado.valor),
      categoria: datosResultado.categoria,
      clase: datosResultado.clase,
      descripcion: datosResultado.descripcion,
      posicionIndicador: datosResultado.posicionIndicador,
    }

    calculado.value = true
    await guardarResultadoIMC()
  } catch (error) {
    console.error('Error al calcular IMC desde la API:', error)

    if (error.errores) {
      errores.value = error.errores
    }

    calculado.value = false
    mensajeGuardado.value =
      'No se pudo calcular el IMC. Verifica que la API esté activa.'
  } finally {
    calculando.value = false
  }
}
</script>

<template>
  <main class="pagina-imc">
    <BotonVolver />

    <section class="contenedor-imc">
      <div class="columna-formulario">
        <h1>Calculadora de IMC</h1>

        <p class="descripcion">
          El índice de masa corporal (IMC) es un número que se calcula con base
          en el peso y la estatura de la persona. Para la mayoría de las
          personas adultas, el IMC se usa como una referencia general para
          identificar categorías de peso que pueden relacionarse con problemas
          de salud.
        </p>

        <form class="formulario-imc" @submit.prevent="calcularIMC">
          <div class="fila-superior">
            <div class="grupo-campo">
              <label for="edad">Edad</label>

              <div class="campo-con-unidad">
                <input
                  id="edad"
                  v-model="formulario.edad"
                  type="number"
                  placeholder="Ej. 18"
                  @input="ocultarResultado"
                />
                <span>años</span>
              </div>

              <small v-if="errores.edad">{{ errores.edad }}</small>
            </div>

            <div class="grupo-campo">
              <label>Género</label>

              <div class="selector-genero">
                <button
                  type="button"
                  :class="{ activo: formulario.genero === 'hombre' }"
                  @click="seleccionarGenero('hombre')"
                >
                  Hombre
                </button>

                <button
                  type="button"
                  :class="{ activo: formulario.genero === 'mujer' }"
                  @click="seleccionarGenero('mujer')"
                >
                  Mujer
                </button>
              </div>
            </div>
          </div>

          <div class="grupo-campo">
            <label for="altura">Altura</label>

            <div class="campo-con-unidad campo-largo">
              <input
                id="altura"
                v-model="formulario.altura"
                type="number"
                placeholder="Ej. 170"
                @input="ocultarResultado"
              />
              <span>cm</span>
            </div>

            <small v-if="errores.altura">{{ errores.altura }}</small>
          </div>

          <div class="grupo-campo">
            <label for="peso">Peso</label>

            <div class="campo-con-unidad campo-largo">
              <input
                id="peso"
                v-model="formulario.peso"
                type="number"
                placeholder="Ej. 60"
                @input="ocultarResultado"
              />
              <span>kg</span>
            </div>

            <small v-if="errores.peso">{{ errores.peso }}</small>
          </div>

          <button
            type="submit"
            class="boton-calcular"
            :disabled="calculando"
          >
            {{ calculando ? 'Calculando...' : 'Calcular IMC' }}
          </button>
        </form>
      </div>

      <div class="columna-resultado">
        <p class="texto-resultado">Tu IMC es de</p>

        <div class="valor-imc">
          {{ resultadoIMC.valor }}
          <span v-if="calculado">kg/m²</span>
        </div>

        <h2 :class="resultadoIMC.clase">
          {{ resultadoIMC.categoria }}
        </h2>

        <div class="barra-imc">
          <span
            v-if="calculado"
            class="indicador-imc"
            :style="{ left: `${resultadoIMC.posicionIndicador}%` }"
          ></span>
        </div>

        <div class="marcas-imc">
          <span>15</span>
          <span>18.5</span>
          <span>25</span>
          <span>30</span>
          <span>40</span>
        </div>

        <div class="tarjeta-informacion">
          <p>
            {{ resultadoIMC.descripcion }}
          </p>

          <p class="nota">
            *Nota: Para adolescentes menores de 19 años, los médicos suelen usar
            tablas de percentiles por edad y sexo. Esta calculadora utiliza la
            escala estándar como una referencia educativa general.
          </p>
        </div>

        <p v-if="mensajeGuardado" class="mensaje-guardado">
          {{ mensajeGuardado }}
        </p>
      </div>
    </section>
  </main>
</template>

<style scoped src="../assets/styles/CalculadoraIMC.css"></style>
