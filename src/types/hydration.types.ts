/**
 * hydration_types.ts — Tipos del módulo de Hidratación
 * Proyecto NUTRIA — Open Source
 *
 * Los tipos viven aquí. El hook los importa desde aquí.
 * Los componentes UI los importan desde aquí.
 * Ninguno importa tipos desde el hook directamente.
 *
 * Patrón consistente con energy.types.ts, anthropometry_types.ts, etc.
 *
 * @source Holliday MA, Segar WE. Pediatrics. 1957;19(5):823-832.
 * @source Sawka MN et al. ACSM Position Stand. Med Sci Sports Exerc. 2007;39(2):377-390.
 * @source IOM. Dietary Reference Intakes for Water. National Academies Press. 2005.
 * @source Chernoff R. J Am Diet Assoc. 1994;94(8):878-882.
 * @source DuBois EF. Arch Intern Med. 1921;27(2):259.
 */

// ===========================================================================
// ENUMERACIONES
// ===========================================================================

/** Métodos disponibles para calcular el requerimiento hídrico basal */
export type MétodoHidratación =
  | 'por_peso'   // 35 ml/kg (adulto) | 30 ml/kg (adulto mayor)
  | 'por_get'    // 1 ml por kcal de GET
  | 'por_edad'   // Factor variable según rango etario

// ===========================================================================
// PARÁMETROS DE ENTRADA (INPUT)
// ===========================================================================

/**
 * Parámetros para hidratación por peso.
 * adulto_mayor activa el multiplicador reducido (30 ml/kg).
 *
 * @source Popkin BM, D'Anci KE, Rosenberg IH. Nutr Rev. 2010;68(8):439-458.
 */
export interface ParámetrosPorPeso {
  peso_kg:      number
  adulto_mayor: boolean
}

/**
 * Parámetros para hidratación por Gasto Energético Total.
 *
 * @source IOM. Dietary Reference Intakes for Water. National Academies Press. 2005.
 */
export interface ParámetrosPorGET {
  get_kcal: number
}

/**
 * Parámetros para hidratación ajustada por edad.
 *
 * @source Chernoff R. J Am Diet Assoc. 1994;94(8):878-882.
 * @source IOM. Dietary Reference Intakes for Water. 2005.
 */
export interface ParámetrosPorEdad {
  peso_kg:    number
  edad_anios: number
}

/**
 * Parámetros para cálculo de tasa de sudoración post-ejercicio.
 * Fórmula ACSM: Pérdida = (peso_pre − peso_post)×1000 + líquido − orina
 *
 * @source Sawka MN et al. ACSM Position Stand. Med Sci Sports Exerc. 2007;39(2):377-390.
 */
export interface ParámetrosTasaSudoración {
  peso_pre_kg:          number
  peso_post_kg:         number
  líquido_ingerido_ml:  number
  orina_ml:             number
  duración_min:         number
}

/**
 * Factores clínicos que incrementan el requerimiento hídrico.
 */
export interface FactoresClínicos {
  fiebre:              boolean
  temperatura_celsius: number | null
  vómito:              boolean
  diarrea:             boolean
  actividad_intensa:   boolean
  clima_caluroso:      boolean
}

// ===========================================================================
// RESULTADOS DE SALIDA (OUTPUT)
// ===========================================================================

/** Resultado de cualquier cálculo de requerimiento hídrico basal */
export interface ResultadoHidratación {
  readonly volumen_ml:           number
  readonly volumen_litros:       number
  readonly vasos_240ml:          number
  readonly método:               MétodoHidratación
  readonly multiplicador_ml_kg:  number | null
  readonly fuente_bibliográfica: string
}

/** Detalle de un incremento individual por factor clínico */
export interface DetalleIncremento {
  readonly factor:        string
  readonly incremento_ml: number
  readonly descripción:   string
}

/** Resultado de ajuste por factores clínicos aplicado sobre un volumen base */
export interface ResultadoAjusteClínico {
  readonly volumen_base_ml:         number
  readonly incremento_total_ml:     number
  readonly volumen_ajustado_ml:     number
  readonly volumen_ajustado_litros: number
  readonly vasos_240ml:             number
  readonly desglose:                DetalleIncremento[]
}

/** Resultado de tasa de sudoración post-ejercicio */
export interface ResultadoTasaSudoración {
  readonly pérdida_neta_ml:           number
  readonly tasa_ml_por_min:           number
  readonly tasa_ml_por_hora:          number
  readonly reposición_recomendada_ml: number
  readonly botellas_600ml:            number
  readonly fuente_bibliográfica:      string
}