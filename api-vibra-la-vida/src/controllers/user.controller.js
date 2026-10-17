// ============================================================================
// USER CONTROLLER - VIBRA LA VIDA
// ============================================================================
//
// INTEGRACIÓN SEGURA APP MÓVIL -> API -> FIRESTORE -> WEB
//
// Esta versión conserva el sistema ACTUAL de la web:
//
//   rol: "usuario"
//   rol: "profesional_salud"
//   rol: "doctor"
//
// TODAVÍA NO migramos a "roles: []".
// Eso lo haremos después, cuando todo lo actual esté estable.
//
// OBJETIVOS DE ESTA VERSIÓN:
//
// 1. La app Android puede crear/actualizar usuarios/{uid}.
// 2. Si el usuario es paciente, también se crea/actualiza:
//      directorio_pacientes/{uid}
// 3. Los datos existentes NO se borran cuando Android manda
//    solamente algunos campos.
// 4. Una cuenta profesional existente conserva su rol.
// 5. Al eliminar una cuenta paciente también se elimina su
//    registro del directorio.
//
// ============================================================================


// ============================================================================
// FIREBASE
// ============================================================================

const {
  db,
  auth,
  FieldValue,
} = require("../config/firebase");


// ============================================================================
// FUNCIÓN AUXILIAR: NORMALIZAR NOMBRE PARA BÚSQUEDA
// ============================================================================
//
// "José Pérez" -> "jose perez"
//
// Debe coincidir con la lógica utilizada por la web.
// ============================================================================

function normalizarNombreBusqueda(
  texto = ""
) {

  return String(texto)
    .normalize("NFD")
    .replace(
      /[\u0300-\u036f]/g,
      ""
    )
    .toLowerCase()
    .replace(
      /\s+/g,
      " "
    )
    .trim();
}


// ============================================================================
// OBTENER MI PERFIL
// ============================================================================
//
// GET /api/users/me
//
// El UID se obtiene del token Firebase.
// ============================================================================

async function getMyProfile(
  req,
  res
) {

  try {

    const uid =
      req.user?.uid;


    if (!uid) {

      return res
        .status(401)
        .json({

          success: false,

          message:
            "No se pudo identificar al usuario autenticado.",
        });
    }


    const userDoc =
      await db
        .collection("usuarios")
        .doc(uid)
        .get();


    if (!userDoc.exists) {

      return res
        .status(404)
        .json({

          success: false,

          message:
            "Perfil no encontrado.",
        });
    }


    return res.json({

      success: true,

      user: {
        id: userDoc.id,
        ...userDoc.data(),
      },
    });


  } catch (error) {

    console.error(
      "Error en getMyProfile:",
      error
    );


    return res
      .status(500)
      .json({

        success: false,

        message:
          "Error al obtener el perfil.",

        error:
          error.message,
      });
  }
}


// ============================================================================
// ACTUALIZAR O CREAR MI PERFIL
// ============================================================================
//
// PUT /api/users/me
//
// FLUJO:
//
// Android crea/inicia sesión con Firebase Authentication
//                     ↓
// manda su token a Express
//                     ↓
// PUT /api/users/me
//                     ↓
// usuarios/{uid}
//                     ↓
// si es paciente:
// directorio_pacientes/{uid}
//
// IMPORTANTE:
//
// Esta función utiliza merge y conserva la información que ya
// existe. Si Android no manda un campo, NO lo pone en null.
//
// ============================================================================

async function updateMyProfile(
  req,
  res
) {

  try {

    // ========================================================================
    // 1. IDENTIDAD DESDE FIREBASE TOKEN
    // ========================================================================

    const uid =
      req.user?.uid;


    if (!uid) {

      return res
        .status(401)
        .json({

          success: false,

          message:
            "No se pudo identificar al usuario autenticado.",
        });
    }


    const body =
      req.body || {};


    // ========================================================================
    // 2. DOCUMENTO ACTUAL EN FIRESTORE
    // ========================================================================

    const usuarioRef =
      db
        .collection("usuarios")
        .doc(uid);


    const usuarioDoc =
      await usuarioRef.get();


    const datosExistentes =
      usuarioDoc.exists
        ? usuarioDoc.data()
        : {};


    // ========================================================================
    // 3. DATOS DE FIREBASE AUTHENTICATION
    // ========================================================================
    //
    // Nos ayuda a recuperar correo y nombre si Android no los
    // envía expresamente.
    // ========================================================================

    const usuarioAuth =
      await auth.getUser(
        uid
      );


    const correo =
      req.user?.email ||
      usuarioAuth.email ||
      datosExistentes.correo ||
      null;


    // ========================================================================
    // 4. NOMBRE
    // ========================================================================

    const nombreRecibido =
      typeof body.nombreCompleto ===
        "string"
        ? body.nombreCompleto.trim()
        : "";


    const nombreCompleto =
      (
        nombreRecibido ||
        datosExistentes.nombreCompleto ||
        datosExistentes.nombre ||
        usuarioAuth.displayName ||
        req.user?.name ||
        ""
      )
        .trim();


    // ========================================================================
    // 5. ROL ACTUAL
    // ========================================================================
    //
    // NO migramos todavía a "roles".
    //
    // - Si el documento ya existe, respetamos su rol.
    // - Si viene de Android y aún no existe en Firestore,
    //   lo creamos como "usuario" (paciente).
    //
    // De esta manera NO convertimos accidentalmente a Laura
    // de profesional a paciente.
    // ========================================================================

    const rolActual =
      datosExistentes.rol ||
      "usuario";


    // ========================================================================
    // 6. ENFERMEDADES CRÓNICAS
    // ========================================================================

    const enfermedadesFinales =
      Array.isArray(
        body.enfermedadesCronicas
      )
        ? body.enfermedadesCronicas
        : (
            Array.isArray(
              datosExistentes.enfermedadesCronicas
            )
              ? datosExistentes.enfermedadesCronicas
              : []
          );


    // ========================================================================
    // 7. DATOS A GUARDAR
    // ========================================================================
    //
    // Usamos valores existentes como respaldo.
    // Así una actualización parcial desde Android no borra datos.
    // ========================================================================

    const datosUsuario = {

      uid,

      correo,

      nombreCompleto,

      rol:
        rolActual,

      edad:
        body.edad ??
        datosExistentes.edad ??
        null,

      genero:
        body.genero ??
        datosExistentes.genero ??
        null,

      peso:
        body.peso ??
        datosExistentes.peso ??
        null,

      estatura:
        body.estatura ??
        datosExistentes.estatura ??
        null,

      nivelActividad:
        body.nivelActividad ??
        datosExistentes.nivelActividad ??
        null,

      enfermedadesCronicas:
        enfermedadesFinales,

      otraEnfermedadCronica:
        body.otraEnfermedadCronica ??
        datosExistentes.otraEnfermedadCronica ??
        "",

      actualizadoEn:
        FieldValue.serverTimestamp(),
    };


    // ========================================================================
    // 8. FECHA DE REGISTRO
    // ========================================================================

    if (!usuarioDoc.exists) {

      datosUsuario.fechaRegistro =
        FieldValue.serverTimestamp();
    }


    // ========================================================================
    // 9. GUARDAR usuarios/{uid}
    // ========================================================================

    await usuarioRef.set(
      datosUsuario,
      {
        merge: true,
      }
    );


    // ========================================================================
    // 10. SINCRONIZAR directorio_pacientes/{uid}
    // ========================================================================
    //
    // Solo pacientes.
    //
    // Esto es justamente lo que permitirá:
    //
    // Cuenta creada en Android
    //         ↓
    // aparece en Firebase
    //         ↓
    // Laura puede buscarla desde la web
    //
    // NO guardamos aquí información médica.
    // Solo datos mínimos para búsqueda.
    // ========================================================================

    if (
      rolActual === "usuario" &&
      nombreCompleto
    ) {

      const directorioRef =
        db
          .collection(
            "directorio_pacientes"
          )
          .doc(uid);


      const directorioDoc =
        await directorioRef.get();


      const datosDirectorio = {

        uid,

        nombreCompleto,

        nombreBusqueda:
          normalizarNombreBusqueda(
            nombreCompleto
          ),
      };


      if (!directorioDoc.exists) {

        datosDirectorio.fechaRegistro =
          FieldValue.serverTimestamp();
      }


      await directorioRef.set(
        datosDirectorio,
        {
          merge: true,
        }
      );
    }


    // ========================================================================
    // 11. RESPUESTA
    // ========================================================================

    const perfilGuardado =
      await usuarioRef.get();


    console.log(
      "======================================"
    );

    console.log(
      "PERFIL SINCRONIZADO DESDE APP"
    );

    console.log(
      "UID:",
      uid
    );

    console.log(
      "Correo:",
      correo
    );

    console.log(
      "Nombre:",
      nombreCompleto
    );

    console.log(
      "Rol:",
      rolActual
    );

    console.log(
      "Documento:",
      `usuarios/${uid}`
    );

    console.log(
      "======================================"
    );


    return res
      .status(200)
      .json({

        success: true,

        message:
          usuarioDoc.exists
            ? "Perfil actualizado correctamente."
            : "Perfil creado correctamente.",

        uid,

        user:
          perfilGuardado.data(),
      });


  } catch (error) {

    console.error(
      "Error en updateMyProfile:",
      error
    );


    return res
      .status(500)
      .json({

        success: false,

        message:
          "Error al guardar el perfil.",

        error:
          error.message,
      });
  }
}


// ============================================================================
// ELIMINAR MI CUENTA
// ============================================================================
//
// DELETE /api/users/me
//
// Se conserva el funcionamiento actual y además:
//
// si existe directorio_pacientes/{uid}, también se elimina.
//
// ============================================================================

async function deleteMyAccount(
  req,
  res
) {

  try {

    const uid =
      req.user?.uid;


    if (!uid) {

      return res
        .status(401)
        .json({

          success: false,

          message:
            "No se pudo identificar al usuario autenticado.",
        });
    }


    // ========================================================================
    // LEER DATOS ACTUALES
    // ========================================================================

    const usuarioRef =
      db
        .collection("usuarios")
        .doc(uid);


    const usuarioDoc =
      await usuarioRef.get();


    const datosUsuario =
      usuarioDoc.exists
        ? usuarioDoc.data()
        : {};


    // ========================================================================
    // ELIMINAR DIRECTORIO DEL PACIENTE
    // ========================================================================

    if (
      datosUsuario.rol ===
      "usuario"
    ) {

      const directorioRef =
        db
          .collection(
            "directorio_pacientes"
          )
          .doc(uid);


      const directorioDoc =
        await directorioRef.get();


      if (
        directorioDoc.exists
      ) {

        await directorioRef.delete();
      }
    }


    // ========================================================================
    // ELIMINAR PERFIL Y SUBCOLECCIONES
    // ========================================================================

    await db.recursiveDelete(
      usuarioRef
    );


    // ========================================================================
    // ELIMINAR FIREBASE AUTHENTICATION
    // ========================================================================

    await auth.deleteUser(
      uid
    );


    console.log(
      "======================================"
    );

    console.log(
      "CUENTA ELIMINADA"
    );

    console.log(
      "UID:",
      uid
    );

    console.log(
      "======================================"
    );


    return res
      .status(200)
      .json({

        success: true,

        message:
          "Cuenta eliminada correctamente.",
      });


  } catch (error) {

    console.error(
      "Error en deleteMyAccount:",
      error
    );


    return res
      .status(500)
      .json({

        success: false,

        message:
          "Error al eliminar la cuenta.",

        error:
          error.message,
      });
  }
}


// ============================================================================
// EXPORTACIONES
// ============================================================================

module.exports = {

  getMyProfile,

  updateMyProfile,

  deleteMyAccount,
};
