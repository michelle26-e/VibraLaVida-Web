// ==========================================================
// ROUTER - VIBRA LA VIDA
// ==========================================================

import {
  createRouter,
  createWebHashHistory,
} from 'vue-router'


// ==========================================================
// VISTAS
// ==========================================================

import HomeView from '../views/HomeView.vue'

import RiesgoCardiovascularView from '../views/EnCardio.vue'

import CalculadoraIMCView from '../views/CalculadoraIMC.vue'

import CalculadoraCaloriasView from '../views/CalculadoraCalorias.vue'

import EvaluacionDass21View from '../views/EvaDASS-21.vue'

import EscalaInsomnioAtenasView from '../views/EsInsomnioAtenas.vue'

import IniciarSesionView from '../views/IniciarSesion.vue'

import CrearCuentaView from '../views/CrearCuenta.vue'

import MiCuentaView from '../views/MiCuenta.vue'

import PanelDoctor from '../views/PanelDoctor.vue'

import RegistroDoctor from '../views/RegistroDoctor.vue'

import MiEquipoSalud from '../views/MiEquipoSalud.vue'


// ==========================================================
// ROUTER
// ==========================================================

const router = createRouter({

  history:
    createWebHashHistory(
      import.meta.env.BASE_URL
    ),


  // ========================================================
  // RUTAS
  // ========================================================

  routes: [

    {
      path: '/',
      name: 'inicio',
      component: HomeView,
    },


    {
      path: '/riesgo-cardiovascular',
      name: 'riesgo-cardiovascular',
      component: RiesgoCardiovascularView,
    },


    {
      path: '/calculadora-imc',
      name: 'calculadora-imc',
      component: CalculadoraIMCView,
    },


    {
      path: '/calculadora-calorias',
      name: 'calculadora-calorias',
      component: CalculadoraCaloriasView,
    },


    {
      path: '/evaluacion-dass21',
      name: 'evaluacion-dass21',
      component: EvaluacionDass21View,
    },


    {
      path: '/escala-insomnio-atenas',
      name: 'escala-insomnio-atenas',
      component: EscalaInsomnioAtenasView,
    },


    {
      path: '/iniciar-sesion',
      name: 'iniciar-sesion',
      component: IniciarSesionView,
    },


    {
      path: '/registro',
      name: 'registro',
      component: CrearCuentaView,
    },


    {
      path: '/mi-cuenta',
      name: 'mi-cuenta',
      component: MiCuentaView,
    },


    {
      path: '/mi-equipo-salud',
      name: 'mi-equipo-salud',
      component: MiEquipoSalud,
    },


    {
      path: '/registro-doctor',
      name: 'registro-doctor',
      component: RegistroDoctor,
    },


    {
      path: '/doctor',
      name: 'doctor',
      component: PanelDoctor,
    },

  ],


  // ========================================================
  // POSICIÓN DEL SCROLL
  // ========================================================
  //
  // Esto hace que:
  //
  // Home
  // ↓
  // usuario baja hasta Diabetes
  // ↓
  // entra a una pantalla
  // ↓
  // presiona Volver
  // ↓
  // regresa exactamente a Diabetes
  //
  // ========================================================

  scrollBehavior(
    to,
    from,
    savedPosition
  ) {

    // Si el usuario está regresando con el historial
    // del navegador, Vue recuerda dónde estaba.
    if (savedPosition) {

      return savedPosition

    }


    // Si alguna ruta tiene un #ancla,
    // se desplaza directamente a esa sección.
    if (to.hash) {

      return {
        el: to.hash,
        behavior: 'smooth',
      }

    }


    // Cuando realmente entra a una página nueva,
    // comienza desde arriba.
    return {
      top: 0,
      left: 0,
    }

  },

})


// ==========================================================
// EXPORTAR
// ==========================================================

export default router