<template>
  <section class="disponibilidad-card">
    <div class="encabezado">
      <div>
        <h2>Disponibilidad profesional</h2>
        <p>Define cómo y cuándo atiendes a tus pacientes.</p>
      </div>

      <span
        v-if="mensaje"
        class="mensaje"
      >
        {{ mensaje }}
      </span>
    </div>

    <div class="modalidades">
      <label class="opcion">
        <input
          v-model="form.consultaConsultorio"
          type="checkbox"
        >
        <span>🏥 Consulta en consultorio</span>
      </label>

      <label class="opcion">
        <input
          v-model="form.consultaDomicilio"
          type="checkbox"
        >
        <span>🏠 Consulta a domicilio</span>
      </label>
    </div>

    <div class="nota-clinica">
      <strong>🔔 Alertas clínicas</strong>

      <p>
        Las alertas importantes de tus pacientes seguirán
        apareciendo aunque estés fuera de tu horario de consulta.
      </p>
    </div>

    <div class="horarios">
      <div
        v-for="dia in dias"
        :key="dia.clave"
        class="fila-horario"
      >
        <label class="dia">
          <input
            v-model="form.horario[dia.clave].activo"
            type="checkbox"
          >
          <span>{{ dia.nombre }}</span>
        </label>

        <div
          v-if="form.horario[dia.clave].activo"
          class="horas"
        >
          <input
            v-model="form.horario[dia.clave].inicio"
            type="time"
          >

          <span>a</span>

          <input
            v-model="form.horario[dia.clave].fin"
            type="time"
          >
        </div>

        <span
          v-else
          class="no-atiende"
        >
          No atiende
        </span>
      </div>
    </div>

    <button
      class="guardar"
      :disabled="guardando"
      @click="guardar"
    >
      {{
        guardando
          ? 'Guardando...'
          : 'Guardar disponibilidad'
      }}
    </button>
  </section>
</template>

<script setup>
import {
  onMounted,
  reactive,
  ref,
} from 'vue'

import {
  guardarDisponibilidadProfesional,
  obtenerDisponibilidadProfesional,
} from '@/services/disponibilidadProfesionalService'

const dias = [
  { clave: 'lunes', nombre: 'Lunes' },
  { clave: 'martes', nombre: 'Martes' },
  { clave: 'miercoles', nombre: 'Miércoles' },
  { clave: 'jueves', nombre: 'Jueves' },
  { clave: 'viernes', nombre: 'Viernes' },
  { clave: 'sabado', nombre: 'Sábado' },
  { clave: 'domingo', nombre: 'Domingo' },
]

const horarioInicial = () => ({
  lunes: { activo: true, inicio: '09:00', fin: '18:00' },
  martes: { activo: true, inicio: '09:00', fin: '18:00' },
  miercoles: { activo: true, inicio: '09:00', fin: '18:00' },
  jueves: { activo: true, inicio: '09:00', fin: '18:00' },
  viernes: { activo: true, inicio: '09:00', fin: '18:00' },
  sabado: { activo: false, inicio: null, fin: null },
  domingo: { activo: false, inicio: null, fin: null },
})

const form = reactive({
  consultaDomicilio: false,
  consultaConsultorio: true,
  zonaHoraria: 'America/Cancun',
  horario: horarioInicial(),
})

const guardando = ref(false)
const mensaje = ref('')

const cargar = async () => {
  try {
    const datos =
      await obtenerDisponibilidadProfesional()

    form.consultaDomicilio =
      Boolean(datos?.consultaDomicilio)

    form.consultaConsultorio =
      datos?.consultaConsultorio !== false

    form.zonaHoraria =
      datos?.zonaHoraria ||
      'America/Cancun'

    if (datos?.horario) {
      dias.forEach(({ clave }) => {
        form.horario[clave] = {
          ...form.horario[clave],
          ...datos.horario[clave],
        }
      })
    }
  } catch (error) {
    mensaje.value = error.message
  }
}

const guardar = async () => {
  guardando.value = true
  mensaje.value = ''

  try {
    await guardarDisponibilidadProfesional(
      JSON.parse(JSON.stringify(form))
    )

    mensaje.value =
      'Disponibilidad guardada ✓'
  } catch (error) {
    mensaje.value = error.message
  } finally {
    guardando.value = false
  }
}

onMounted(cargar)
</script>

<style scoped>
.disponibilidad-card {
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 22px;
  padding: 24px;
  max-width: 820px;
  box-shadow: 0 10px 28px rgba(15, 118, 110, .08);
}

.encabezado {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: flex-start;
  margin-bottom: 22px;
}

.encabezado h2 {
  margin: 0;
  color: #0f766e;
}

.encabezado p {
  margin: 6px 0 0;
  color: #64748b;
}

.mensaje {
  color: #0f766e;
  font-weight: 600;
}

.modalidades {
  display: flex;
  flex-wrap: wrap;
  gap: 14px;
  margin-bottom: 18px;
}

.opcion {
  display: flex;
  gap: 9px;
  align-items: center;
  background: #f8fafc;
  padding: 12px 14px;
  border-radius: 14px;
}

.nota-clinica {
  background: #ecfeff;
  border-left: 4px solid #0891b2;
  border-radius: 14px;
  padding: 14px;
  margin-bottom: 20px;
  color: #334155;
}

.nota-clinica p {
  margin: 5px 0 0;
  line-height: 1.5;
}

.horarios {
  display: grid;
  gap: 10px;
}

.fila-horario {
  display: grid;
  grid-template-columns: 160px 1fr;
  align-items: center;
  min-height: 52px;
  padding: 10px 12px;
  border: 1px solid #edf2f7;
  border-radius: 14px;
}

.dia {
  display: flex;
  gap: 9px;
  align-items: center;
  font-weight: 600;
  color: #334155;
}

.horas {
  display: flex;
  align-items: center;
  gap: 10px;
}

.horas input {
  padding: 8px 10px;
  border: 1px solid #cbd5e1;
  border-radius: 10px;
}

.no-atiende {
  color: #94a3b8;
}

.guardar {
  width: 100%;
  margin-top: 20px;
  border: 0;
  border-radius: 14px;
  padding: 13px;
  background: #0f766e;
  color: white;
  font-weight: 700;
  cursor: pointer;
}

.guardar:disabled {
  opacity: .6;
  cursor: default;
}

@media (max-width: 650px) {
  .fila-horario {
    grid-template-columns: 1fr;
    gap: 10px;
  }

  .horas {
    flex-wrap: wrap;
  }

  .encabezado {
    flex-direction: column;
  }
}
</style>
