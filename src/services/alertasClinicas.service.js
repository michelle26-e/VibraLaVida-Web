const { db, FieldValue } = require('../config/firebase')

const PRIORIDADES = new Set([
  'alta',
  'media',
  'informativa',
])

const crearAlertaClinicaProfesional = async ({
  profesionalUid,
  pacienteUid,
  pacienteNombre = '',
  tipo,
  prioridad = 'media',
  titulo,
  mensaje,
  detalle = '',
  origen = 'app',
  datos = {},
}) => {
  if (
    !profesionalUid ||
    !pacienteUid ||
    !tipo ||
    !titulo ||
    !mensaje
  ) {
    throw new Error(
      'Faltan datos para crear la alerta clínica.'
    )
  }

  const prioridadSegura =
    PRIORIDADES.has(prioridad)
      ? prioridad
      : 'media'

  const ref =
    await db
      .collection('notificaciones_profesional')
      .add({
        profesionalUid,
        pacienteUid,
        pacienteNombre: pacienteNombre || null,
        categoria: 'clinica',
        tipo,
        prioridad: prioridadSegura,
        titulo,
        mensaje,
        detalle,
        origen,
        datos: datos || {},
        requiereRevision:
          prioridadSegura !== 'informativa',
        leida: false,
        revisada: false,

        // Las alertas clínicas NUNCA se filtran por horario.
        restringidaPorHorario: false,

        creadoEn:
          FieldValue.serverTimestamp(),
      })

  return ref.id
}

module.exports = {
  crearAlertaClinicaProfesional,
}
