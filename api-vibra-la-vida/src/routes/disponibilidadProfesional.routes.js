const express = require('express')

const {
  obtenerDisponibilidad,
  guardarDisponibilidad,
} = require('../controllers/disponibilidadProfesional.controller')

const {
  verifyFirebaseToken,
} = require('../middlewares/auth.middleware')

const router = express.Router()

router.use(verifyFirebaseToken)

router.get('/', obtenerDisponibilidad)
router.put('/', guardarDisponibilidad)

module.exports = router
