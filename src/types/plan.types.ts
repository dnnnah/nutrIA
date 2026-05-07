/**
 * plan.types.ts — Tipos para el Store del Plan Dietético
 * Proyecto NUTRIA — Open Source
 *
 * Define las estructuras de datos que vive en plan.store.ts (Zustand).
 * Es la capa de estado entre los hooks de cálculo y la UI.
 */

import type { CategoríaNAF, FactorEstrés, FormulasTMB, Sexo } from './energy.types';
import type { NutrienteEvaluable, ResumenAdecuación } from './adequacy.types';

// ---------------------------------------------------------------------------
// TIEMPOS DE COMIDA
// ---------------------------------------------------------------------------

export type TiempoComida =
  | 'desayuno'    // 25%
  | 'colacion_1'  // 10%
  | 'comida'      // 35%
  | 'colacion_2'  // 10%
  | 'cena';       // 20%

/**
 * Distribución porcentual por tiempo de comida.
 * Suma debe ser 100. Valores por defecto según instrucciones globales.
 */
export type DistribuciónTiempos = Record<TiempoComida, number>;

export const DISTRIBUCIÓN_DEFAULT: DistribuciónTiempos = {
  desayuno:   25,
  colacion_1: 10,
  comida:     35,
  colacion_2: 10,
  cena:       20,
} as const;

// ---------------------------------------------------------------------------
// DATOS DEL PACIENTE (básico — para cálculo energético)
// ---------------------------------------------------------------------------

/**
 * Datos mínimos del paciente para calcular GET y evaluar adecuación.
 * El expediente completo vivirá en patient.store.ts (próxima fase).
 */
export interface DatosPaciente {
  nombre:        string;
  edad_anios:    number;
  sexo:          Sexo;
  peso_kg:       number;
  talla_cm:      number;
  masa_magra_kg?: number;   // Opcional — requerido para Katch/Cunningham
}

// ---------------------------------------------------------------------------
// PRESCRIPCIÓN ENERGÉTICA
// ---------------------------------------------------------------------------

/**
 * Configuración para el cálculo del GET del paciente.
 */
export interface ConfiguraciónGET {
  formula_tmb:   FormulasTMB;
  naf:           CategoríaNAF;
  factor_estres: FactorEstrés;
  temperatura_corporal_celsius?: number;
}

/**
 * Resultado del cálculo energético almacenado en el store.
 */
export interface EnergíaPrescrita {
  get_final_kcal:      number;
  get_con_estres_kcal: number;
  tmb_kcal:            number;
  formula_usada:       FormulasTMB;
}

// ---------------------------------------------------------------------------
// MACROS PRESCRITOS
// ---------------------------------------------------------------------------

/**
 * Distribución de macronutrientes en gramos por día.
 * Se calcula a partir del GET y los porcentajes de distribución.
 */
export interface MacrosPrescritos {
  proteina_g:  number;
  lipidos_g:   number;
  hidratos_g:  number;
  fibra_g:     number;
}

/**
 * Porcentajes de distribución de macros (deben sumar ~100%).
 */
export interface DistribuciónMacros {
  proteina_pct: number;   // Default: 15%
  lipidos_pct:  number;   // Default: 30%
  hidratos_pct: number;   // Default: 55%
}

export const DISTRIBUCIÓN_MACROS_DEFAULT: DistribuciónMacros = {
  proteina_pct: 15,
  lipidos_pct:  30,
  hidratos_pct: 55,
} as const;

// ---------------------------------------------------------------------------
// REGISTRO DE CONSUMO
// ---------------------------------------------------------------------------

/**
 * Nutrientes consumidos en el día — estructura espejo de la prescripción.
 * Se actualiza cada vez que el usuario registra un alimento.
 */
export type NutrientesConsumidos = Partial<Record<NutrienteEvaluable, number>>;

// ---------------------------------------------------------------------------
// ESTADO DEL STORE
// ---------------------------------------------------------------------------

/**
 * Estado completo del plan activo.
 * Este es el shape del store de Zustand.
 */
export interface PlanState {
  // Datos del paciente
  paciente:              DatosPaciente | null;

  // Configuración energética
  configuracion_get:     ConfiguraciónGET;
  energia_prescrita:     EnergíaPrescrita | null;

  // Macros
  distribucion_macros:   DistribuciónMacros;
  macros_prescritos:     MacrosPrescritos | null;

  // Distribución por tiempos
  distribucion_tiempos:  DistribuciónTiempos;

  // Registro de consumo del día
  consumido_hoy:         NutrientesConsumidos;

  // Semáforo de adecuación (calculado)
  resumen_adecuacion:    ResumenAdecuación | null;

  // UI state
  tiempo_activo:         TiempoComida;
  calculando:            boolean;
}

/**
 * Acciones disponibles en el store.
 * Separadas del estado para claridad (patrón Zustand recomendado).
 */
export interface PlanActions {
  // Paciente
  setPaciente:           (paciente: DatosPaciente) => void;
  clearPaciente:         () => void;

  // Configuración GET
  setConfiguraciónGET:   (config: Partial<ConfiguraciónGET>) => void;

  // Macros
  setDistribuciónMacros: (dist: Partial<DistribuciónMacros>) => void;

  // Tiempos
  setDistribuciónTiempos:(dist: Partial<DistribuciónTiempos>) => void;
  setTiempoActivo:       (tiempo: TiempoComida) => void;

  // Consumo
  registrarConsumo:      (nutriente: NutrienteEvaluable, cantidad: number) => void;
  resetConsumoHoy:       () => void;

  // Cálculo (orquestador principal)
  calcularPlan:          () => void;

  // Reset
  resetPlan:             () => void;
}