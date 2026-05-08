/**
 * smae.constants.ts — Constantes del Sistema Mexicano de Alimentos Equivalentes
 * Proyecto NUTRIA — Open Source
 *
 * Define los macronutrientes por equivalente y la información visual de cada
 * grupo SMAE. Fuente canónica para todos los cálculos del Planeador.
 *
 * @source SMAE 5ª edición. Pérez Lizaur AB, Palacios González B,
 *   Castro Becerra AL, Flores Galicia I. Fomento de Nutrición y Salud A.C. 2014.
 *
 * @module smae.constants
 */

import type { GrupoSMAE, MacronutrientesEquivalente } from '../types/food.types'

// ===========================================================================
// MACROS POR EQUIVALENTE
// @source SMAE 5ª edición. Fomento de Nutrición y Salud A.C. 2014.
// ===========================================================================

/**
 * Macronutrientes por 1 equivalente de cada grupo SMAE.
 * Estos valores son la fuente de verdad para todos los cálculos del Planeador.
 *
 * Nota clínica: Los valores corresponden a 1 equivalente estándar SMAE,
 * no a 100g de alimento. La distribución se hace en unidades de equivalentes.
 */
export const MACROS_POR_EQUIVALENTE: Record<GrupoSMAE, MacronutrientesEquivalente> = {
  // ── Verduras ──────────────────────────────────────────────────────────────
  // Porción = ½ taza cocida o 1 taza cruda
  verduras: {
    energia_kcal: 25,
    proteina_g:   2,
    lipidos_g:    0,
    hidratos_g:   4,
    fibra_g:      2,
  },

  // ── Frutas ────────────────────────────────────────────────────────────────
  // Porción varía por fruta; aprox. ½–1 pieza mediana o 1 taza
  frutas: {
    energia_kcal: 60,
    proteina_g:   0,
    lipidos_g:    0,
    hidratos_g:   15,
    fibra_g:      2,
  },

  // ── Cereales sin grasa ────────────────────────────────────────────────────
  // Tortilla, arroz, pasta, pan simple, papa
  cereales_sin_grasa: {
    energia_kcal: 70,
    proteina_g:   2,
    lipidos_g:    0,
    hidratos_g:   15,
    fibra_g:      0,
  },

  // ── Cereales con grasa ────────────────────────────────────────────────────
  // Pan dulce, galletas, productos con grasa añadida
  cereales_con_grasa: {
    energia_kcal: 115,
    proteina_g:   2,
    lipidos_g:    5,
    hidratos_g:   15,
    fibra_g:      0,
  },

  // ── Leguminosas ───────────────────────────────────────────────────────────
  // Frijol, lenteja, garbanzo, haba, soya — ½ taza cocida
  leguminosas: {
    energia_kcal: 120,
    proteina_g:   8,
    lipidos_g:    1,
    hidratos_g:   20,
    fibra_g:      8,
  },

  // ── AOA Muy bajo aporte de grasa ──────────────────────────────────────────
  // Clara de huevo, atún en agua, mariscos, queso cottage
  aoa_muy_bajo: {
    energia_kcal: 40,
    proteina_g:   7,
    lipidos_g:    1,
    hidratos_g:   0,
    fibra_g:      0,
  },

  // ── AOA Bajo aporte de grasa ──────────────────────────────────────────────
  // Pollo sin piel, pavo, pescado blanco, queso panela
  aoa_bajo: {
    energia_kcal: 55,
    proteina_g:   7,
    lipidos_g:    3,
    hidratos_g:   0,
    fibra_g:      0,
  },

  // ── AOA Moderado aporte de grasa ──────────────────────────────────────────
  // Carne de res magra, cerdo, huevo entero, sardina
  aoa_moderado: {
    energia_kcal: 75,
    proteina_g:   7,
    lipidos_g:    5,
    hidratos_g:   0,
    fibra_g:      0,
  },

  // ── AOA Alto aporte de grasa ──────────────────────────────────────────────
  // Costilla, chorizos, quesos añejos, vísceras grasas
  aoa_alto: {
    energia_kcal: 100,
    proteina_g:   7,
    lipidos_g:    8,
    hidratos_g:   0,
    fibra_g:      0,
  },

  // ── Leche descremada ──────────────────────────────────────────────────────
  // ≤ 1g grasa por taza (240 ml) — Skim milk
  leche_descremada: {
    energia_kcal: 95,
    proteina_g:   9,
    lipidos_g:    2,
    hidratos_g:   12,
    fibra_g:      0,
  },

  // ── Leche semidescremada ──────────────────────────────────────────────────
  // ~2g grasa por taza (240 ml) — 2% milk
  leche_semidescremada: {
    energia_kcal: 110,
    proteina_g:   9,
    lipidos_g:    4,
    hidratos_g:   12,
    fibra_g:      0,
  },

  // ── Leche entera ──────────────────────────────────────────────────────────
  // ~8g grasa por taza (240 ml) — Whole milk
  leche_entera: {
    energia_kcal: 150,
    proteina_g:   9,
    lipidos_g:    8,
    hidratos_g:   12,
    fibra_g:      0,
  },

  // ── Leche con azúcar ──────────────────────────────────────────────────────
  // Leche condensada, yogur con azúcar añadida
  leche_con_azucar: {
    energia_kcal: 200,
    proteina_g:   8,
    lipidos_g:    5,
    hidratos_g:   30,
    fibra_g:      0,
    azucar_aniadida_g: 15,
  },

  // ── Aceites y grasas sin proteína ─────────────────────────────────────────
  // Aceites vegetales, mantequilla, margarina, mayonesa
  aceites_sin_proteina: {
    energia_kcal: 45,
    proteina_g:   0,
    lipidos_g:    5,
    hidratos_g:   0,
    fibra_g:      0,
  },

  // ── Aceites y grasas con proteína ─────────────────────────────────────────
  // Aguacate, nueces, almendras, semillas de girasol
  aceites_con_proteina: {
    energia_kcal: 70,
    proteina_g:   3,
    lipidos_g:    5,
    hidratos_g:   3,
    fibra_g:      1,
  },

  // ── Azúcares sin grasa ────────────────────────────────────────────────────
  // Azúcar, miel, mermelada, jaleas, bebidas azucaradas
  azucares_sin_grasa: {
    energia_kcal: 40,
    proteina_g:   0,
    lipidos_g:    0,
    hidratos_g:   10,
    fibra_g:      0,
    azucar_aniadida_g: 10,
  },

  // ── Azúcares con grasa ────────────────────────────────────────────────────
  // Chocolate, caramelos, pasteles, helado
  azucares_con_grasa: {
    energia_kcal: 85,
    proteina_g:   0,
    lipidos_g:    5,
    hidratos_g:   10,
    fibra_g:      0,
    azucar_aniadida_g: 10,
  },

  // ── Alimentos libres de energía ───────────────────────────────────────────
  // Agua, café/té sin azúcar, especias, hierbas, verduras de hoja <25 kcal/taza
  libres: {
    energia_kcal: 0,
    proteina_g:   0,
    lipidos_g:    0,
    hidratos_g:   0,
    fibra_g:      0,
  },
} as const

// ===========================================================================
// INFORMACIÓN VISUAL DE GRUPOS (nombre UI, color, ícono emoji)
// ===========================================================================

export interface GrupoSMAEInfo {
  /** Clave del grupo — coincide con GrupoSMAE */
  grupo: GrupoSMAE
  /** Nombre legible para la UI */
  nombre: string
  /** Nombre abreviado para espacios reducidos */
  nombre_corto: string
  /** Ícono emoji representativo */
  icono: string
  /** Color de acento del grupo (hex) — para badges y borders */
  color: string
  /** Color de fondo suave del grupo */
  color_fondo: string
  /** Categoría de agrupación para la UI */
  categoria: 'base' | 'proteina' | 'lacteo' | 'grasa' | 'azucar' | 'libre'
}

/**
 * Información visual y semántica de cada grupo SMAE.
 * Usada por la UI del Planeador para renderizar cards, chips y steppers.
 */
export const GRUPOS_SMAE_INFO: GrupoSMAEInfo[] = [
  {
    grupo:        'verduras',
    nombre:       'Verduras',
    nombre_corto: 'Verduras',
    icono:        '🥦',
    color:        '#34C759',
    color_fondo:  '#F0FBF3',
    categoria:    'base',
  },
  {
    grupo:        'frutas',
    nombre:       'Frutas',
    nombre_corto: 'Frutas',
    icono:        '🍎',
    color:        '#FF6B6B',
    color_fondo:  '#FFF2F2',
    categoria:    'base',
  },
  {
    grupo:        'cereales_sin_grasa',
    nombre:       'Cereales sin grasa',
    nombre_corto: 'Cereales',
    icono:        '🌾',
    color:        '#FF9500',
    color_fondo:  '#FFF8EC',
    categoria:    'base',
  },
  {
    grupo:        'cereales_con_grasa',
    nombre:       'Cereales con grasa',
    nombre_corto: 'Cereales+G',
    icono:        '🥐',
    color:        '#FF6B00',
    color_fondo:  '#FFF4EC',
    categoria:    'base',
  },
  {
    grupo:        'leguminosas',
    nombre:       'Leguminosas',
    nombre_corto: 'Leguminosas',
    icono:        '🫘',
    color:        '#8B6914',
    color_fondo:  '#FBF4E8',
    categoria:    'base',
  },
  {
    grupo:        'aoa_muy_bajo',
    nombre:       'AOA Muy bajo aporte de grasa',
    nombre_corto: 'AOA Muy bajo',
    icono:        '🍳',
    color:        '#007AFF',
    color_fondo:  '#EEF5FF',
    categoria:    'proteina',
  },
  {
    grupo:        'aoa_bajo',
    nombre:       'AOA Bajo aporte de grasa',
    nombre_corto: 'AOA Bajo',
    icono:        '🍗',
    color:        '#0A84FF',
    color_fondo:  '#EEF4FF',
    categoria:    'proteina',
  },
  {
    grupo:        'aoa_moderado',
    nombre:       'AOA Moderado aporte de grasa',
    nombre_corto: 'AOA Moderado',
    icono:        '🥩',
    color:        '#5856D6',
    color_fondo:  '#F2F1FD',
    categoria:    'proteina',
  },
  {
    grupo:        'aoa_alto',
    nombre:       'AOA Alto aporte de grasa',
    nombre_corto: 'AOA Alto',
    icono:        '🥓',
    color:        '#AF52DE',
    color_fondo:  '#F8F0FD',
    categoria:    'proteina',
  },
  {
    grupo:        'leche_descremada',
    nombre:       'Leche descremada',
    nombre_corto: 'Leche desc.',
    icono:        '🥛',
    color:        '#30B0C7',
    color_fondo:  '#EEF9FC',
    categoria:    'lacteo',
  },
  {
    grupo:        'leche_semidescremada',
    nombre:       'Leche semidescremada',
    nombre_corto: 'Leche semi.',
    icono:        '🥛',
    color:        '#2D9CDB',
    color_fondo:  '#EEF6FB',
    categoria:    'lacteo',
  },
  {
    grupo:        'leche_entera',
    nombre:       'Leche entera',
    nombre_corto: 'Leche entera',
    icono:        '🧈',
    color:        '#1D7FB5',
    color_fondo:  '#ECF4FA',
    categoria:    'lacteo',
  },
  {
    grupo:        'leche_con_azucar',
    nombre:       'Leche con azúcar',
    nombre_corto: 'Leche+azúcar',
    icono:        '🍯',
    color:        '#C9A227',
    color_fondo:  '#FDF8EC',
    categoria:    'lacteo',
  },
  {
    grupo:        'aceites_sin_proteina',
    nombre:       'Aceites sin proteína',
    nombre_corto: 'Aceites',
    icono:        '🫒',
    color:        '#6BAA3D',
    color_fondo:  '#F3F9EE',
    categoria:    'grasa',
  },
  {
    grupo:        'aceites_con_proteina',
    nombre:       'Aceites con proteína',
    nombre_corto: 'Aceites+P',
    icono:        '🥑',
    color:        '#4CAF50',
    color_fondo:  '#F1F9F1',
    categoria:    'grasa',
  },
  {
    grupo:        'azucares_sin_grasa',
    nombre:       'Azúcares sin grasa',
    nombre_corto: 'Azúcares',
    icono:        '🍬',
    color:        '#FF2D55',
    color_fondo:  '#FFF0F3',
    categoria:    'azucar',
  },
  {
    grupo:        'azucares_con_grasa',
    nombre:       'Azúcares con grasa',
    nombre_corto: 'Azúcares+G',
    icono:        '🍫',
    color:        '#C7003E',
    color_fondo:  '#FDEEF2',
    categoria:    'azucar',
  },
  {
    grupo:        'libres',
    nombre:       'Alimentos libres',
    nombre_corto: 'Libres',
    icono:        '💧',
    color:        '#8E8E93',
    color_fondo:  '#F2F2F7',
    categoria:    'libre',
  },
] as const

/**
 * Mapa de acceso rápido por clave de grupo.
 * Evita búsquedas lineales en el array durante renders.
 */
export const GRUPO_INFO_MAP: Record<GrupoSMAE, GrupoSMAEInfo> = Object.fromEntries(
  GRUPOS_SMAE_INFO.map((g) => [g.grupo, g])
) as Record<GrupoSMAE, GrupoSMAEInfo>

/**
 * Orden canónico de grupos para la UI del Planeador.
 * Agrupa por categoría clínica: base → proteína → lácteos → grasas → azúcares → libres.
 */
export const GRUPOS_SMAE_ORDENADOS: GrupoSMAE[] = GRUPOS_SMAE_INFO.map((g) => g.grupo)

// ===========================================================================
// GRUPOS CON RELEVANCIA CLÍNICA — subsets útiles
// ===========================================================================

/** Grupos que aportan proteína significativa (≥ 7g por equivalente) */
export const GRUPOS_PROTEICOS: GrupoSMAE[] = [
  'aoa_muy_bajo', 'aoa_bajo', 'aoa_moderado', 'aoa_alto',
  'leguminosas', 'leche_descremada', 'leche_semidescremada',
  'leche_entera', 'leche_con_azucar',
]

/** Grupos que aportan hidratos de carbono significativos (≥ 10g por equivalente) */
export const GRUPOS_CON_HC: GrupoSMAE[] = [
  'verduras', 'frutas', 'cereales_sin_grasa', 'cereales_con_grasa',
  'leguminosas', 'leche_descremada', 'leche_semidescremada',
  'leche_entera', 'leche_con_azucar', 'azucares_sin_grasa', 'azucares_con_grasa',
]

/** Grupos con azúcar añadida — relevantes para DM2 y control glucémico */
export const GRUPOS_CON_AZUCAR_ANIADIDA: GrupoSMAE[] = [
  'leche_con_azucar', 'azucares_sin_grasa', 'azucares_con_grasa',
]