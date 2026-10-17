const { db, FieldValue } = require('../config/firebase')

const DIAS = ['lunes','martes','miercoles','jueves','viernes','sabado','domingo']

const esProfesional = (u) =>
  u?.rol === 'profesional_salud' || u?.rol === 'doctor'

const horaValida = (h) =>
  /^([01]\d|2[0-3]):[0-5]\d$/.test(String(h || ''))

const normalizarDia = (dia = {}) => {
  const activo = Boolean(dia.activo)

  if (!activo) {
    return { activo: false, inicio: null, fin: null }
  }

  const inicio = String(dia.inicio || '').trim()
  const fin = String(dia.fin || '').trim()

  if (!horaValida(inicio) || !horaValida(fin)) {
    throw new Error('HORARIO_INVALIDO')
  }

  if (inicio >= fin) {
    throw new Error('RANGO_INVALIDO')
  }

  return { activo: true, inicio, fin }
}

const horarioPredeterminado = () => ({
  lunes: { activo: true, inicio: '09:00', fin: '18:00' },
  martes: { activo: true, inicio: '09:00', fin: '18:00' },
  miercoles: { activo: true, inicio: '09:00', fin: '18:00' },
  jueves: { activo: true, inicio: '09:00', fin: '18:00' },
  viernes: { activo: true, inicio: '09:00', fin: '18:00' },
  sabado: { activo: false, inicio: null, fin: null },
  domingo: { activo: false, inicio: null, fin: null },
})

const obtenerDisponibilidad = async (req, res) => {
  try {
    const uid = req.user?.uid
    const ref = db.collection('usuarios').doc(uid)
    const snap = await ref.get()

    if (!snap.exists) {
      return res.status(404).json({
        success: false,
        message: 'No se encontró el perfil.',
      })
    }

    const usuario = snap.data()

    if (!esProfesional(usuario)) {
      return res.status(403).json({
        success: false,
        message: 'Solo un profesional puede administrar su disponibilidad.',
      })
    }

    const disponibilidad =
      usuario.disponibilidadProfesional || {
        consultaDomicilio: false,
        consultaConsultorio: true,
        zonaHoraria: 'America/Cancun',
        horario: horarioPredeterminado(),
      }

    return res.json({
      success: true,
      disponibilidad,
    })

  } catch (error) {
    console.error('Error al obtener disponibilidad:', error)

    return res.status(500).json({
      success: false,
      message: 'No fue posible obtener la disponibilidad.',
    })
  }
}

const guardarDisponibilidad = async (req, res) => {
  try {
    const uid = req.user?.uid
    const ref = db.collection('usuarios').doc(uid)
    const snap = await ref.get()

    if (!snap.exists) {
      return res.status(404).json({
        success: false,
        message: 'No se encontró el perfil.',
      })
    }

    const usuario = snap.data()

    if (!esProfesional(usuario)) {
      return res.status(403).json({
        success: false,
        message: 'Solo un profesional puede modificar su disponibilidad.',
      })
    }

    const {
      consultaDomicilio = false,
      consultaConsultorio = true,
      zonaHoraria = 'America/Cancun',
      horario = {},
    } = req.body || {}

    const horarioLimpio = {}

    for (const dia of DIAS) {
      horarioLimpio[dia] = normalizarDia(horario[dia])
    }

    const disponibilidad = {
      consultaDomicilio: Boolean(consultaDomicilio),
      consultaConsultorio: Boolean(consultaConsultorio),
      zonaHoraria: String(zonaHoraria || 'America/Cancun'),
      horario: horarioLimpio,
      actualizadoEn: FieldValue.serverTimestamp(),
    }

    await ref.update({
      disponibilidadProfesional: disponibilidad,
    })

    return res.json({
      success: true,
      message: 'Disponibilidad actualizada correctamente.',
      disponibilidad,
    })

  } catch (error) {
    if (error.message === 'HORARIO_INVALIDO') {
      return res.status(400).json({
        success: false,
        message: 'Usa horarios válidos con formato HH:mm.',
      })
    }

    if (error.message === 'RANGO_INVALIDO') {
      return res.status(400).json({
        success: false,
        message: 'La hora de inicio debe ser anterior a la hora de fin.',
      })
    }

    console.error('Error al guardar disponibilidad:', error)

    return res.status(500).json({
      success: false,
      message: 'No fue posible guardar la disponibilidad.',
    })
  }
}

module.exports = {
  obtenerDisponibilidad,
  guardarDisponibilidad,
}
