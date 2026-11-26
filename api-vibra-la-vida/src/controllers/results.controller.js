// Importamos Firestore y FieldValue desde Firebase.
const { db, FieldValue } = require("../config/firebase");


/**
 * Guardar resultado general.
 *
 * Este endpoint sirve para guardar:
 * - DASS-21: depresión, ansiedad, estrés
 * - AIS: sueño / insomnio
 * - IMC
 * - Calorías
 * - Riesgo cardiovascular
 */
async function saveResult(req, res) {
  try {
    const uid = req.user.uid;

    const {
      tipo,
      categoria,
      puntaje,
      clasificacion,
      descripcion,
      respuestas,
      datosExtra,
    } = req.body;

    if (!tipo) {
      return res.status(400).json({
        success: false,
        message: "El tipo de resultado es obligatorio.",
      });
    }

    const resultRef = await db
      .collection("usuarios")
      .doc(uid)
      .collection("resultados")
      .add({
        tipo: tipo,
        categoria: categoria ?? null,
        puntaje: puntaje ?? null,
        clasificacion: clasificacion ?? null,
        descripcion: descripcion ?? null,
        respuestas: respuestas ?? null,
        datosExtra: datosExtra ?? null,
        fechaRegistro: FieldValue.serverTimestamp(),
      });

    return res.status(201).json({
      success: true,
      message: "Resultado guardado correctamente.",
      resultId: resultRef.id,
    });
  } catch (error) {
    console.error("Error en saveResult:", error);

    return res.status(500).json({
      success: false,
      message: "Error al guardar el resultado.",
      error: error.message,
    });
  }
}


/**
 * Obtener todos los resultados del usuario autenticado.
 */
async function getMyResults(req, res) {
  try {
    const uid = req.user.uid;

    const snapshot = await db
      .collection("usuarios")
      .doc(uid)
      .collection("resultados")
      .orderBy("fechaRegistro", "desc")
      .get();

    const results = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return res.json({
      success: true,
      results,
    });
  } catch (error) {
    console.error("Error en getMyResults:", error);

    return res.status(500).json({
      success: false,
      message: "Error al obtener resultados.",
      error: error.message,
    });
  }
}


/**
 * Obtener resultados filtrados por tipo.
 *
 * Ejemplo:
 * GET /api/results/type/dass_depresion
 * GET /api/results/type/ais
 * GET /api/results/type/imc
 */
async function getResultsByType(req, res) {
  try {
    const uid = req.user.uid;
    const { tipo } = req.params;

    const snapshot = await db
      .collection("usuarios")
      .doc(uid)
      .collection("resultados")
      .where("tipo", "==", tipo)
      .orderBy("fechaRegistro", "desc")
      .get();

    const results = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return res.json({
      success: true,
      tipo,
      results,
    });
  } catch (error) {
    console.error("Error en getResultsByType:", error);

    return res.status(500).json({
      success: false,
      message: "Error al obtener resultados por tipo.",
      error: error.message,
    });
  }
}


/**
 * Eliminar un resultado específico.
 */
async function deleteResult(req, res) {
  try {
    const uid = req.user.uid;
    const { id } = req.params;

    const resultRef = db
      .collection("usuarios")
      .doc(uid)
      .collection("resultados")
      .doc(id);

    const resultDoc = await resultRef.get();

    if (!resultDoc.exists) {
      return res.status(404).json({
        success: false,
        message: "Resultado no encontrado.",
      });
    }

    await resultRef.delete();

    return res.json({
      success: true,
      message: "Resultado eliminado correctamente.",
    });
  } catch (error) {
    console.error("Error en deleteResult:", error);

    return res.status(500).json({
      success: false,
      message: "Error al eliminar el resultado.",
      error: error.message,
    });
  }
}


// ============================================================================
// ACCESO DEL PROFESIONAL A LOS RESULTADOS DEL PACIENTE
// ============================================================================
//
// Estas funciones son ADICIONALES.
// No modifican los endpoints que ya utiliza Android.
//
// Se valida:
//
// 1. Que el usuario autenticado sea profesional.
// 2. Que exista el paciente.
// 3. Que exista un vínculo ACTIVO en seguimiento_profesional.
// 4. Solo entonces se consultan los resultados.
//
// ============================================================================


// ============================================================================
// VALIDAR QUE EL USUARIO AUTENTICADO SEA PROFESIONAL
// ============================================================================

async function validarProfesionalActual(profesionalUid) {
  const profesionalDoc = await db
    .collection("usuarios")
    .doc(profesionalUid)
    .get();

  if (!profesionalDoc.exists) {
    return {
      autorizado: false,
      status: 404,
      code: "PROFESIONAL_NO_ENCONTRADO",
      message: "No se encontró el perfil profesional.",
    };
  }

  const profesional = profesionalDoc.data();

  const rol = String(
    profesional.rol || ""
  )
    .trim()
    .toLowerCase();

  const roles = Array.isArray(profesional.roles)
    ? profesional.roles.map((item) =>
        String(item)
          .trim()
          .toLowerCase()
      )
    : [];

  const esProfesional =
    rol === "profesional_salud" ||
    rol === "doctor" ||
    rol === "especialista" ||
    roles.includes("especialista");

  if (!esProfesional) {
    return {
      autorizado: false,
      status: 403,
      code: "USUARIO_NO_PROFESIONAL",
      message:
        "Esta acción requiere una cuenta profesional.",
    };
  }

  return {
    autorizado: true,
    profesional,
  };
}


// ============================================================================
// VALIDAR VÍNCULO ACTIVO ENTRE PROFESIONAL Y PACIENTE
// ============================================================================

async function validarVinculoProfesionalPaciente(
  profesionalUid,
  pacienteUid
) {
  const profesional =
    await validarProfesionalActual(
      profesionalUid
    );

  if (!profesional.autorizado) {
    return profesional;
  }

  const pacienteDoc = await db
    .collection("usuarios")
    .doc(pacienteUid)
    .get();

  if (!pacienteDoc.exists) {
    return {
      autorizado: false,
      status: 404,
      code: "PACIENTE_NO_ENCONTRADO",
      message: "No se encontró el paciente.",
    };
  }

  const vinculosSnapshot = await db
    .collection("seguimiento_profesional")
    .where(
      "profesionalUid",
      "==",
      profesionalUid
    )
    .get();

  const vinculoActivo =
    vinculosSnapshot.docs.some(
      (documento) => {
        const vinculo =
          documento.data();

        return (
          vinculo.pacienteUid ===
            pacienteUid &&
          vinculo.estado ===
            "activo"
        );
      }
    );

  if (!vinculoActivo) {
    return {
      autorizado: false,
      status: 403,
      code: "VINCULO_NO_ACTIVO",
      message:
        "No tienes un vínculo activo con este paciente.",
    };
  }

  return {
    autorizado: true,

    paciente: {
      id: pacienteDoc.id,
      ...pacienteDoc.data(),
    },
  };
}


// ============================================================================
// PROFESIONAL: OBTENER TODOS LOS RESULTADOS DE UN PACIENTE
// ============================================================================
//
// GET /api/results/paciente/:pacienteUid
//
// ============================================================================

async function getPatientResults(
  req,
  res
) {
  try {
    const profesionalUid =
      req.user?.uid;

    const pacienteUid =
      String(
        req.params?.pacienteUid || ""
      ).trim();

    if (!profesionalUid) {
      return res
        .status(401)
        .json({
          success: false,
          message:
            "No se pudo identificar al usuario autenticado.",
        });
    }

    if (!pacienteUid) {
      return res
        .status(400)
        .json({
          success: false,
          message:
            "El paciente es obligatorio.",
        });
    }

    const acceso =
      await validarVinculoProfesionalPaciente(
        profesionalUid,
        pacienteUid
      );

    if (!acceso.autorizado) {
      return res
        .status(
          acceso.status || 403
        )
        .json({
          success: false,
          code:
            acceso.code || null,
          message:
            acceso.message,
        });
    }

    const snapshot = await db
      .collection("usuarios")
      .doc(pacienteUid)
      .collection("resultados")
      .orderBy(
        "fechaRegistro",
        "desc"
      )
      .get();

    const results =
      snapshot.docs.map(
        (documento) => ({
          id:
            documento.id,
          ...documento.data(),
        })
      );

    return res.json({
      success: true,

      pacienteUid,

      paciente:
        acceso.paciente,

      total:
        results.length,

      results,
    });

  } catch (error) {

    console.error(
      "Error en getPatientResults:",
      error
    );

    return res
      .status(500)
      .json({
        success: false,

        message:
          "Error al obtener los resultados del paciente.",

        error:
          error.message,
      });
  }
}


// ============================================================================
// PROFESIONAL: OBTENER RESULTADOS DE UN PACIENTE POR TIPO
// ============================================================================
//
// GET /api/results/paciente/:pacienteUid/type/:tipo
//
// Ejemplos:
//
// /api/results/paciente/UID/type/imc
// /api/results/paciente/UID/type/ais
// /api/results/paciente/UID/type/dass_depresion
//
// ============================================================================

async function getPatientResultsByType(
  req,
  res
) {
  try {
    const profesionalUid =
      req.user?.uid;

    const pacienteUid =
      String(
        req.params?.pacienteUid || ""
      ).trim();

    const tipo =
      String(
        req.params?.tipo || ""
      ).trim();

    if (!profesionalUid) {
      return res
        .status(401)
        .json({
          success: false,
          message:
            "No se pudo identificar al usuario autenticado.",
        });
    }

    if (!pacienteUid) {
      return res
        .status(400)
        .json({
          success: false,
          message:
            "El paciente es obligatorio.",
        });
    }

    if (!tipo) {
      return res
        .status(400)
        .json({
          success: false,
          message:
            "El tipo de resultado es obligatorio.",
        });
    }

    const acceso =
      await validarVinculoProfesionalPaciente(
        profesionalUid,
        pacienteUid
      );

    if (!acceso.autorizado) {
      return res
        .status(
          acceso.status || 403
        )
        .json({
          success: false,
          code:
            acceso.code || null,
          message:
            acceso.message,
        });
    }

    const snapshot = await db
      .collection("usuarios")
      .doc(pacienteUid)
      .collection("resultados")
      .where(
        "tipo",
        "==",
        tipo
      )
      .orderBy(
        "fechaRegistro",
        "desc"
      )
      .get();

    const results =
      snapshot.docs.map(
        (documento) => ({
          id:
            documento.id,
          ...documento.data(),
        })
      );

    return res.json({
      success: true,

      pacienteUid,

      paciente:
        acceso.paciente,

      tipo,

      total:
        results.length,

      results,
    });

  } catch (error) {

    console.error(
      "Error en getPatientResultsByType:",
      error
    );

    return res
      .status(500)
      .json({
        success: false,

        message:
          "Error al obtener los resultados del paciente por tipo.",

        error:
          error.message,
      });
  }
}


module.exports = {
  saveResult,
  getMyResults,
  getResultsByType,
  deleteResult,

  // Nuevos endpoints para el panel profesional.
  getPatientResults,
  getPatientResultsByType,
};