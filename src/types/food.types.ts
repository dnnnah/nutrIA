/**
 * ALIMENTOS SMAE — Tipos del Sistema Mexicano de Alimentos Equivalentes
 * @source SMAE 5ª ed., Pérez Lizaur AB et al.
 */

export type GrupoSMAE =
  | 'verduras'
  | 'frutas'
  | 'cereales_sin_grasa'
  | 'cereales_con_grasa'
  | 'leguminosas'
  | 'aoa_muy_bajo'
  | 'aoa_bajo'
  | 'aoa_moderado'
  | 'aoa_alto'
  | 'leche_descremada'
  | 'leche_semidescremada'
  | 'leche_entera'
  | 'leche_con_azucar'
  | 'aceites_sin_proteina'
  | 'aceites_con_proteina'
  | 'azucares_sin_grasa'
  | 'azucares_con_grasa'
  | 'libres'

export type FuenteDatos = 'SMAE_2023' | 'USDA_FDC' | 'INNSZ' | 'BEDCA' | 'manual'

export interface MacronutrientesEquivalente {
  energia_kcal: number
  proteina_g: number
  lipidos_g: number
  hidratos_g: number
  fibra_g?: number
  azucar_aniadida_g?: number
}

export interface AlimentoSMAE {
  // Identidad
  id: string
  nombre: string
  nombre_alternativo?: string[]
  grupo_smae: GrupoSMAE
  subgrupo?: string

  // Porción de referencia (= 1 equivalente SMAE)
  porcion_estandar_g: number
  medida_casera: string
  medida_casera_g: number
  peso_bruto_g?: number
  peso_neto_g: number

  // Macronutrientes por 1 equivalente
  energia_kcal: number
  proteina_g: number
  lipidos_g: number
  hidratos_g: number
  fibra_g: number
  azucar_aniadida_g?: number

  // Micronutrientes por 100g (normalizados para facilitar cálculos)
  sodio_mg: number
  potasio_mg: number
  calcio_mg: number
  hierro_mg: number
  zinc_mg: number
  magnesio_mg: number
  fosforo_mg: number
  vitamina_c_mg: number
  folato_mcg: number
  vitamina_b12_mcg: number
  vitamina_a_mcg_rae?: number
  vitamina_d_mcg?: number

  // Índices clínicos
  indice_glucemico?: number
  carga_glucemica?: number

  // Metadatos
  fuente_datos: FuenteDatos
  alergenos: string[]
  apto_vegano: boolean
  apto_vegetariano: boolean
  contiene_gluten: boolean
  contiene_lactosa: boolean
}

export interface SeleccionAlimento {
  id_alimento: string
  nombre: string
  cantidad_equivalentes: number
  cantidad_g: number
  energia_kcal: number
  proteina_g: number
  lipidos_g: number
  hidratos_g: number
}