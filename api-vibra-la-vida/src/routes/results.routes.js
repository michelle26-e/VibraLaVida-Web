// Importamos Express.
const express = require("express");

// Importamos controladores.
const {
  saveResult,
  getMyResults,
  getResultsByType,
  deleteResult,

  // Nuevos controladores para el profesional.
  getPatientResults,
  getPatientResultsByType,
} = require("../controllers/results.controller");

// Importamos middleware de autenticación.
const {
  verifyFirebaseToken,
} = require("../middlewares/auth.middleware");

// Creamos el router.
const router = express.Router();


/**
 * Guardar resultado.
 *
 * POST /api/results
 *
 * Se conserva exactamente para Android / paciente.
 */
router.post(
  "/",
  verifyFirebaseToken,
  saveResult
);


/**
 * Obtener todos mis resultados.
 *
 * GET /api/results
 *
 * Se conserva exactamente para el usuario autenticado.
 */
router.get(
  "/",
  verifyFirebaseToken,
  getMyResults
);


/**
 * Obtener resultados por tipo.
 *
 * GET /api/results/type/:tipo
 *
 * Se conserva exactamente para el usuario autenticado.
 */
router.get(
  "/type/:tipo",
  verifyFirebaseToken,
  getResultsByType
);


// ============================================================================
// RUTAS DEL PROFESIONAL
// ============================================================================
//
// IMPORTANTE:
//
// Estas rutas son nuevas.
// No reemplazan las rutas anteriores.
//
// ============================================================================


/**
 * Profesional:
 * obtener todos los resultados de un paciente vinculado.
 *
 * GET /api/results/paciente/:pacienteUid
 */
router.get(
  "/paciente/:pacienteUid",
  verifyFirebaseToken,
  getPatientResults
);


/**
 * Profesional:
 * obtener los resultados de un paciente filtrados por tipo.
 *
 * GET /api/results/paciente/:pacienteUid/type/:tipo
 */
router.get(
  "/paciente/:pacienteUid/type/:tipo",
  verifyFirebaseToken,
  getPatientResultsByType
);


/**
 * Eliminar resultado.
 *
 * DELETE /api/results/:id
 *
 * Se conserva exactamente para el propietario del resultado.
 */
router.delete(
  "/:id",
  verifyFirebaseToken,
  deleteResult
);


module.exports = router;