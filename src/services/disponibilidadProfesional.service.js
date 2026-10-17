const diasSemana = [
  'domingo',
  'lunes',
  'martes',
  'miercoles',
  'jueves',
  'viernes',
  'sabado',
]

const estaDentroDeDisponibilidad = ({
  fecha,
  hora,
  disponibilidad,
}) => {
  if (!fecha || !hora || !disponibilidad?.horario) {
    return true
  }

  const partes =
    String(fecha)
      .split('-')
      .map(Number)

  if (
    partes.length !== 3 ||
    partes.some((v) => !Number.isFinite(v))
  ) {
    return true
  }

  const [anio, mes, dia] = partes

  const fechaLocal =
    new Date(anio, mes - 1, dia)

  const nombreDia =
    diasSemana[fechaLocal.getDay()]

  const config =
    disponibilidad.horario[nombreDia]

  if (!config || !config.activo) {
    return false
  }

  return (
    hora >= config.inicio &&
    hora < config.fin
  )
}

module.exports = {
  estaDentroDeDisponibilidad,
}
