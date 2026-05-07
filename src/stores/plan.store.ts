/**
 * plan.store.ts — Store del Plan Dietético (Zustand)
 * Proyecto NUTRIA — Open Source
 *
 * Orquesta los hooks de cálculo y mantiene el estado del plan activo.
 *
 * FLUJO DE DATOS:
 *   setPaciente() + setConfiguraciónGET()
 *     → calcularPlan()
 *       → calcularGET()        (useEnergyCalculator)
 *       → calcularMacros()     (lógica interna)
 *       → generarResumen()     (useAdequacy)
 *       → estado actualizado   (Zustand)
 *
 * ARQUITECTURA:
 *   - Estado inmutable: siempre set() completo, nunca mutación directa
 *   - calcularPlan() es el único orquestador — no hay cálculos en los setters
 *   - Los hooks de cálculo son importados como funciones puras (sin instanciar)
 *
 * @module plan.store
 */

import { create } from 'zustand';

import { calcularGET } from '../hooks/useEnergyCalculator';
import { generarResumen }  from '../hooks/useAdequacy';

import {
  DISTRIBUCIÓN_DEFAULT,
  DISTRIBUCIÓN_MACROS_DEFAULT,
  type ConfiguraciónGET,
  type DatosPaciente,
  type DistribuciónMacros,
  type DistribuciónTiempos,
  type EnergíaPrescrita,
  type MacrosPrescritos,
  type NutrientesConsumidos,
  type PlanActions,
  type PlanState,
  type TiempoComida,
} from '../types/plan.types';

import type { NutrienteEvaluable } from '../types/adequacy.types';
import type { ResumenAdecuación }  from '../types/adequacy.types';

// ===========================================================================
// ESTADO INICIAL
// ===========================================================================

const CONFIGURACIÓN_GET_DEFAULT: ConfiguraciónGET = {
  formula_tmb:   'mifflin_st_jeor',
  naf:           'sedentario',
  factor_estres: 'ninguno',
} as const;

const ESTADO_INICIAL: PlanState = {
  paciente:             null,
  configuracion_get:    CONFIGURACIÓN_GET_DEFAULT,
  energia_prescrita:    null,
  distribucion_macros:  DISTRIBUCIÓN_MACROS_DEFAULT,
  macros_prescritos:    null,
  distribucion_tiempos: DISTRIBUCIÓN_DEFAULT,
  consumido_hoy:        {},
  resumen_adecuacion:   null,
  tiempo_activo:        'desayuno',
  calculando:           false,
};

// ===========================================================================
// HELPERS INTERNOS (funciones puras — no forman parte del store)
// ===========================================================================

/**
 * Calcula los gramos de macros a partir del GET y los porcentajes.
 *
 * Proteína:  4 kcal/g
 * Lípidos:   9 kcal/g
 * Hidratos:  4 kcal/g
 * Fibra:     estimado clínico estándar (14g por cada 1000 kcal GET)
 *
 * @source Institute of Medicine. DRI for Energy. 2005.
 */
const calcularMacrosDesdeGET = (
  get_kcal:  number,
  dist:      DistribuciónMacros
): MacrosPrescritos => {
  const proteina_kcal = get_kcal * (dist.proteina_pct / 100);
  const lipidos_kcal  = get_kcal * (dist.lipidos_pct  / 100);
  const hidratos_kcal = get_kcal * (dist.hidratos_pct / 100);

  return {
    proteina_g:  Math.round(proteina_kcal / 4),
    lipidos_g:   Math.round(lipidos_kcal  / 9),
    hidratos_g:  Math.round(hidratos_kcal / 4),
    fibra_g:     Math.round((get_kcal / 1000) * 14),
  };
};

/**
 * Construye el objeto de nutrientes prescritos para el semáforo.
 * Une energía + macros en el formato que espera useAdequacy.
 */
const buildPrescrito = (
  energia:  EnergíaPrescrita,
  macros:   MacrosPrescritos
): Partial<Record<NutrienteEvaluable, number>> => ({
  energia_kcal: energia.get_con_estres_kcal,
  proteina_g:   macros.proteina_g,
  lipidos_g:    macros.lipidos_g,
  hidratos_g:   macros.hidratos_g,
  fibra_g:      macros.fibra_g,
});

// ===========================================================================
// STORE
// ===========================================================================

export const usePlanStore = create<PlanState & PlanActions>((set, get) => ({
  // ── Estado inicial ────────────────────────────────────────────────────────
  ...ESTADO_INICIAL,

  // ── Paciente ──────────────────────────────────────────────────────────────

  setPaciente: (paciente: DatosPaciente) => {
    set({ paciente });
  },

  clearPaciente: () => {
    set({ paciente: null, energia_prescrita: null, macros_prescritos: null });
  },

  // ── Configuración GET ─────────────────────────────────────────────────────

  setConfiguraciónGET: (config: Partial<ConfiguraciónGET>) => {
    set((state) => ({
      configuracion_get: { ...state.configuracion_get, ...config },
    }));
  },

  // ── Distribución de macros ────────────────────────────────────────────────

  setDistribuciónMacros: (dist: Partial<DistribuciónMacros>) => {
    set((state) => ({
      distribucion_macros: { ...state.distribucion_macros, ...dist },
    }));
  },

  // ── Tiempos de comida ─────────────────────────────────────────────────────

  setDistribuciónTiempos: (dist: Partial<DistribuciónTiempos>) => {
    set((state) => ({
      distribucion_tiempos: { ...state.distribucion_tiempos, ...dist },
    }));
  },

  setTiempoActivo: (tiempo: TiempoComida) => {
    set({ tiempo_activo: tiempo });
  },

  // ── Registro de consumo ───────────────────────────────────────────────────

  /**
   * Registra o acumula el consumo de un nutriente en el día.
   * Después de registrar, recalcula el resumen de adecuación automáticamente.
   */
  registrarConsumo: (nutriente: NutrienteEvaluable, cantidad: number) => {
    set((state) => {
      const anterior = state.consumido_hoy[nutriente] ?? 0;
      const consumido_hoy: NutrientesConsumidos = {
        ...state.consumido_hoy,
        [nutriente]: anterior + cantidad,
      };

      // Recalcular adecuación si hay prescripción activa
      const resumen_adecuacion = state.energia_prescrita && state.macros_prescritos
        ? generarResumen({
            prescrito: buildPrescrito(state.energia_prescrita, state.macros_prescritos),
            consumido:  consumido_hoy,
          })
        : state.resumen_adecuacion;

      return { consumido_hoy, resumen_adecuacion };
    });
  },

  resetConsumoHoy: () => {
    set({ consumido_hoy: {}, resumen_adecuacion: null });
  },

  // ── Orquestador principal ─────────────────────────────────────────────────

  /**
   * Calcula el plan completo a partir del paciente y la configuración actual.
   *
   * Orden de operaciones:
   *   1. Validar que hay paciente
   *   2. Calcular GET (useEnergyCalculator)
   *   3. Calcular macros en gramos (helpers internos)
   *   4. Generar resumen de adecuación (useAdequacy)
   *   5. Actualizar estado en un solo set() atómico
   *
   * Errores de cálculo son capturados y expuestos como null en el estado.
   */
  calcularPlan: () => {
    const { paciente, configuracion_get, distribucion_macros, consumido_hoy } = get();

    if (paciente === null) {
      console.warn('[NUTRIA] calcularPlan: no hay paciente definido');
      return;
    }

    set({ calculando: true });

    try {
      // Paso 1: GET
      const resultadoGET = calcularGET({
        peso_kg:    paciente.peso_kg,
        talla_cm:   paciente.talla_cm,
        edad_anios: paciente.edad_anios,
        sexo:       paciente.sexo,
        masa_magra_kg: paciente.masa_magra_kg,
        naf:        configuracion_get.naf,
        formula_tmb:configuracion_get.formula_tmb,
        factor_estres: configuracion_get.factor_estres,
        temperatura_corporal_celsius:
          configuracion_get.temperatura_corporal_celsius,
      });

      const energia_prescrita: EnergíaPrescrita = {
        get_final_kcal:      resultadoGET.get_final_kcal,
        get_con_estres_kcal: resultadoGET.get_con_estres_kcal,
        tmb_kcal:            resultadoGET.tmb_kcal,
        formula_usada:       configuracion_get.formula_tmb,
      };

      // Paso 2: Macros
      const macros_prescritos = calcularMacrosDesdeGET(
        resultadoGET.get_con_estres_kcal,
        distribucion_macros
      );

      // Paso 3: Adecuación
      const prescrito = buildPrescrito(energia_prescrita, macros_prescritos);
      const resumen_adecuacion: ResumenAdecuación = generarResumen({
        prescrito,
        consumido: consumido_hoy,
      });

      set({
        energia_prescrita,
        macros_prescritos,
        resumen_adecuacion,
        calculando: false,
      });

    } catch (error) {
      console.error('[NUTRIA] calcularPlan error:', error);
      set({
        energia_prescrita:  null,
        macros_prescritos:  null,
        resumen_adecuacion: null,
        calculando:         false,
      });
    }
  },

  // ── Reset total ───────────────────────────────────────────────────────────

  resetPlan: () => {
    set(ESTADO_INICIAL);
  },
}));