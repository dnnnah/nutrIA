/**
 * FÓRMULAS CLÍNICAS — Tipos para cálculos nutricionales
 * Cada fórmula es una función pura que devuelve un resultado tipado
 */

export type FormulaEnergia = 'mifflin' | 'harris_benedict' | 'valencia' | 'katch_mcardle' | 'cunningham' | 'schofield'

export interface MifflinParams {
  peso_kg: number
  talla_cm: number
  edad_anios: number
  sexo: 'masculino' | 'femenino'
}

export interface TMBResult {
  tmb_kcal: number
  formula_usada: FormulaEnergia
  fuente_bibliografica: string
  advertencias?: string[]
}

export interface GETParams {
  tmb_kcal: number
  naf: number
  estres_metabolico?: number
}

export interface GETResult extends TMBResult {
  naf: number
  eta_kcal: number
  get_final_kcal: number
  estres_metabolico?: number
  desglose: {
    tmb: number
    incremento_naf: number
    eta: number
    estres: number
  }
}

export interface IMCResult {
  imc: number
  clasificacion: 'bajo_peso' | 'normal' | 'sobrepeso' | 'obesidad_i' | 'obesidad_ii' | 'obesidad_iii'
  peso_ideal_hamwi_kg?: number
  peso_ajustado_kg?: number
}

export interface HOMAIRResult {
  homa_ir: number
  clasificacion: 'normal' | 'resistencia_leve' | 'resistencia_significativa'
  advertencia?: string
}

export interface CKDEPIResult {
  fgc_ml_min_1_73m2: number
  estadio_erc: 'G1' | 'G2' | 'G3a' | 'G3b' | 'G4' | 'G5'
  descripcion: string
}

export interface ZScoreLMSParams {
  medida: number
  L: number
  M: number
  S: number
}

export interface ZScoreResult {
  z_score: number
  clasificacion: 'desnutricion' | 'normal' | 'sobrepeso' | 'obesidad'
  percentil?: number
}