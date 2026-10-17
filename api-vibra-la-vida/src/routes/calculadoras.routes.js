const express = require('express')

const {
  obtenerMisCitas,
  crearCita,
  actualizarCita,
  confirmarCitaPaciente,
  solicitarReagendaPaciente,
  cancelarCitaPaciente,
  reagendarCitaProfesional,
  eliminarCita,
} = require('../controllers/citas.controller')

const {
  verifyFirebaseToken,
} = require('../middlewares/auth.middleware')

const router = express.Router()

router.use(verifyFirebaseToken)

router.get('/', obtenerMisCitas)
router.post('/', crearCita)

router.post(
  '/:id/confirmar',
  confirmarCitaPaciente
)

router.post(
  '/:id/cancelar',
  cancelarCitaPaciente
)

router.post(
  '/:id/solicitar-reagenda',
  solicitarReagendaPaciente
)

router.put('/:id', actualizarCita)

router.post(
  '/:id/reagendar-profesional',
  reagendarCitaProfesional
)

router.delete('/:id', eliminarCita)

module.exports = router
