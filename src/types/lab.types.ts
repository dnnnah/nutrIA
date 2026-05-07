/**
 * LABORATORIOS — Rangos de referencia y valores clínicos
 * @source ADA, Harrison, NOM-015-SSA2, NOM-030-SSA2
 */

export interface RangoReferencia {
  baja_mg_dl?: number
  baja_g_dl?: number
  alta_mg_dl?: number
  alta_g_dl?: number
  baja_pct?: number
  alta_pct?: number
  unidad: string
  fuente: string
  nota?: string
}

export interface RangosLaboratorio {
  glucosa_ayuno: RangoReferencia
  HbA1c: RangoReferencia
  colesterol_total: RangoReferencia
  LDL: RangoReferencia
  HDL: RangoReferencia
  trigliceridos: RangoReferencia
  creatinina: RangoReferencia
  acido_urico: RangoReferencia
  albumina: RangoReferencia
  hemoglobina: RangoReferencia
  hematocrito: RangoReferencia
}

export interface ResultadoLaboratorio {
  nombre: string
  valor: number
  unidad: string
  rango_referencia: RangoReferencia
  clasificacion: 'bajo' | 'normal' | 'alto'
  fecha: Date
}