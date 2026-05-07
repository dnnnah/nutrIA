/**
 * anthropometry.types.ts — Tipos para el módulo de Antropometría
 * Proyecto NUTRIA — Open Source
 *
 * Nomenclatura en español clínico según AGENT.md
 */

import type { Sexo } from './energy.types';

// Re-exportar Sexo para que los consumidores solo importen de un lugar
export type { Sexo };

// ---------------------------------------------------------------------------
// CLASIFICACIONES
// ---------------------------------------------------------------------------

/**
 * Clasificación IMC según OMS.
 * @source WHO. Obesity: preventing and managing the global epidemic.
 *   Technical Report Series 894. Geneva: WHO; 2000.
 */
export type ClasificaciónIMC =
  | 'bajo_peso_severo'   // < 16.0
  | 'bajo_peso_moderado' // 16.0 – 16.9
  | 'bajo_peso_leve'     // 17.0 – 18.4
  | 'normal'             // 18.5 – 24.9
  | 'sobrepeso'          // 25.0 – 29.9
  | 'obesidad_i'         // 30.0 – 34.9
  | 'obesidad_ii'        // 35.0 – 39.9
  | 'obesidad_iii';      // ≥ 40.0

/**
 * Nivel de riesgo cardiovascular/metabólico.
 * Usado en ICC e ICE.
 */
export type NivelRiesgo =
  | 'sin_riesgo'
  | 'riesgo_bajo'
  | 'riesgo_moderado'
  | 'riesgo_alto'
  | 'riesgo_muy_alto';

/**
 * Clasificación de depleción de masa muscular por AMB.
 * @source Frisancho AR. Am J Clin Nutr. 1981;34(11):2540-2545.
 */
export type ClasificaciónAMB =
  | 'adecuada'          // ≥ 90% del percentil 50
  | 'deplecion_leve'    // 80 – 89%
  | 'deplecion_moderada'// 70 – 79%
  | 'deplecion_severa'; // < 70%

// ---------------------------------------------------------------------------
// PARÁMETROS DE ENTRADA
// ---------------------------------------------------------------------------

/** Medidas básicas para IMC */
export interface ParámetrosIMC {
  peso_kg:  number;
  talla_cm: number;
}

/** Medidas para ICC */
export interface ParámetrosICC {
  cintura_cm: number;
  cadera_cm:  number;
  sexo:       Sexo;
}

/** Medidas para ICE */
export interface ParámetrosICE {
  cintura_cm: number;
  talla_cm:   number;
}

/** Pliegues para Jackson-Pollock 3 pliegues — Hombre */
export interface PlieguesHombre {
  pecho_mm:   number;
  abdominal_mm: number;
  muslo_mm:   number;
  edad_anios: number;
}

/** Pliegues para Jackson-Pollock 3 pliegues — Mujer */
export interface PlieguesMujer {
  triceps_mm:      number;
  suprailiaco_mm:  number;
  muslo_mm:        number;
  edad_anios:      number;
}

/** Pliegues para Faulkner 4 pliegues (deportistas) */
export interface PlieguesFaulkner {
  triceps_mm:      number;
  subescapular_mm: number;
  suprailiaco_mm:  number;
  abdominal_mm:    number;
}

/** Medidas para Área Muscular del Brazo */
export interface ParámetrosAMB {
  circunferencia_brazo_cm: number;
  pliegue_triceps_mm:      number;
  sexo:                    Sexo;
  edad_anios:              number;
}

// ---------------------------------------------------------------------------
// RESULTADOS DE SALIDA
// ---------------------------------------------------------------------------

export interface ResultadoIMC {
  readonly imc:              number;
  readonly clasificacion:    ClasificaciónIMC;
  readonly descripcion:      string;
  readonly fuente_bibliografica: string;
}

export interface ResultadoICC {
  readonly icc:              number;
  readonly riesgo:           NivelRiesgo;
  readonly punto_corte_sexo: number;
  readonly fuente_bibliografica: string;
}

export interface ResultadoICE {
  readonly ice:           number;
  readonly riesgo:        NivelRiesgo;
  readonly fuente_bibliografica: string;
}

export interface ResultadoDensidadCorporal {
  readonly densidad_g_mL:       number;
  readonly porcentaje_grasa:    number;  // Fórmula de Siri
  readonly masa_grasa_kg:       number;
  readonly masa_magra_kg:       number;
  readonly formula_pliegues:    'jackson_pollock_3h' | 'jackson_pollock_3m';
  readonly formula_grasa:       'siri';
  readonly suma_pliegues_mm:    number;
  readonly fuente_bibliografica: string;
}

export interface ResultadoFaulkner {
  readonly porcentaje_grasa:    number;
  readonly masa_grasa_kg:       number;
  readonly masa_magra_kg:       number;
  readonly suma_pliegues_mm:    number;
  readonly formula_pliegues:    'faulkner_4';
  readonly fuente_bibliografica: string;
}

export interface ResultadoAMB {
  readonly amb_cm2:             number;
  readonly cmb_cm:              number;   // Circunferencia Muscular del Brazo
  readonly clasificacion:       ClasificaciónAMB;
  readonly fuente_bibliografica: string;
}