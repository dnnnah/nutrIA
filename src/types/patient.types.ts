/**
 * PACIENTE — Tipos clínicos y de datos del expediente
 * @source SMAE, NOM-043-SSA2-2005, IOM DRI Guidelines
 */

export type SexoBiologico = 'masculino' | 'femenino' | 'otro'
export type EstadoCivil = 'soltero' | 'casado' | 'divorciado' | 'viudo'
export type OcupacionFisica = 'sedentario' | 'ligero' | 'moderado' | 'intenso' | 'muy_intenso'

export interface PatientBasic {
  id: string
  nombre: string
  apellido: string
  fecha_nacimiento: Date
  sexo: SexoBiologico
  ocupacion?: string
  telefono?: string
  email?: string
  notas_clinicas?: string
}

export interface PatientAnthropometry extends PatientBasic {
  peso_kg: number
  talla_cm: number
  edad_anios: number
  cintura_cm?: number
  cadera_cm?: number
  pliegue_triceps_mm?: number
  pliegue_subescapular_mm?: number
  pliegue_suprailiaco_mm?: number
  pliegue_abdominal_mm?: number
}

export interface PatientPediatric extends PatientAnthropometry {
  edad_meses?: number
  z_score_peso_edad?: number
  z_score_talla_edad?: number
  z_score_imc_edad?: number
  estadio_tanner?: number
}

export interface PatientBiochemistry {
  glucosa_ayuno_mg_dl?: number
  HbA1c_pct?: number
  colesterol_total_mg_dl?: number
  LDL_mg_dl?: number
  HDL_mg_dl?: number
  trigliceridos_mg_dl?: number
  creatinina_mg_dl?: number
  acido_urico_mg_dl?: number
  albumina_g_dl?: number
  hemoglobina_g_dl?: number
  hematocrito_pct?: number
  fecha_laboratorio?: Date
}

export interface PatientFull extends PatientPediatric, PatientBiochemistry {
  diagnosticos?: string[]
  medicamentos?: string[]
  alergias?: string[]
  restricciones_dieteticas?: string[]
  fecha_registro: Date
  fecha_ultima_consulta?: Date
}

export interface PatientConsultation {
  id: string
  id_paciente: string
  fecha: Date
  motivo_consulta: string
  peso_actual_kg: number
  presion_arterial?: string
  notas_clinico: string
  plan_alimenticio_id?: string
  proxima_cita?: Date
}