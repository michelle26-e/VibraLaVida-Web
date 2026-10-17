// ==========================================================
// CONFIGURACIÓN CENTRAL DE LA API - VIBRA LA VIDA
// ==========================================================
//
// Todas las funciones web que consumen Express deben usar esta
// misma URL. Así Vue, Android y posteriormente iOS trabajan
// contra un único backend en Render.
//
// ==========================================================

const apiUrl = (
  import.meta.env.VITE_API_URL ||
  'https://api-vibra-la-vida.onrender.com'
).replace(/\/$/, '')

export const API_BASE_URL = apiUrl
