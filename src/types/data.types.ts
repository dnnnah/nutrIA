/**
 * data.types.ts — Tipos TypeScript para los JSONs de referencia clínica de NUTRIA
 *
 * Cada interfaz mapea EXACTAMENTE la estructura del JSON correspondiente.
 * Strict mode: prohibido usar `any` o aserciones sin guarda de tipo.
 *
 * @project NUTRIA — PWA clínica open source
 */

// ─────────────────────────────────────────────────────────────────────────────
// SECCIÓN 1: idr.json — Ingestas Diarias Recomendadas
// @source Institute of Medicine. Dietary Reference Intakes. 2006.
// @source NOM-051-SCFI/SSA1-2010. Secretaría de Salud México.
// ─────────────────────────────────────────────────────────────────────────────

export type SexoIDR = 'masculino' | 'femenino' | 'ambos';
export type CondicionIDR = 'embarazo' | 'lactancia';

export interface GrupoIDR {
  descripcion: string;
  sexo: SexoIDR;
  condicion?: CondicionIDR;
  edad_min_meses?: number;
  edad_max_meses?: number;
  edad_min_anios?: number;
  edad_max_anios?: number | null;
  // Energía — algunos grupos de embarazo tienen energía por trimestre
  energia_kcal?: number;
  energia_kcal_t1?: number;
  energia_kcal_t2?: number;
  energia_kcal_t3?: number;
  energia_kcal_referencia?: number;
  // Macronutrientes
  proteina_g: number;
  lipidos_g: number;
  hidratos_g: number;
  fibra_g: number | null;
  // Minerales
  calcio_mg: number;
  hierro_mg: number;
  zinc_mg: number;
  magnesio_mg: number;
  fosforo_mg: number;
  sodio_mg: number;
  potasio_mg: number;
  // Vitaminas
  vitamina_c_mg: number;
  vitamina_d_mcg: number;
  vitamina_a_mcg_rae: number;
  vitamina_b12_mcg: number;
  folato_mcg_dfe: number;
  vitamina_b6_mg: number;
  tiamina_mg: number;
  riboflavina_mg: number;
  niacina_mg_ne: number;
  acidos_grasos_omega3_g: number;
  notas?: string;
  fuente_adicional?: string;
}

export type ClaveGrupoIDR =
  | 'lactante_0_6m'
  | 'lactante_7_12m'
  | 'nino_1_3'
  | 'nino_4_8'
  | 'nino_9_13_h'
  | 'nino_9_13_m'
  | 'adolescente_14_18_h'
  | 'adolescente_14_18_m'
  | 'adulto_19_30_h'
  | 'adulto_19_30_m'
  | 'adulto_31_50_h'
  | 'adulto_31_50_m'
  | 'adulto_51_70_h'
  | 'adulto_51_70_m'
  | 'adulto_mayor_71_h'
  | 'adulto_mayor_71_m'
  | 'embarazo_14_18'
  | 'embarazo_19_30'
  | 'embarazo_31_50'
  | 'lactancia_14_18'
  | 'lactancia_19_30'
  | 'lactancia_31_50';

export interface RangoGananciaEmbarazo {
  kg_total_min: number;
  kg_total_max: number;
  kg_sem_t2_t3_min: number;
  kg_sem_t2_t3_max: number;
}

export interface IDRData {
  _meta: {
    version: string;
    nombre: string;
    fuente_primaria: string;
    fuente_secundaria: string;
    fuente_terciaria: string;
    advertencia: string;
    unidades: Record<string, string>;
    grupos_disponibles: ClaveGrupoIDR[];
  };
  grupos: Record<ClaveGrupoIDR, GrupoIDR>;
  // _nota convive con los valores numéricos — Record<string, unknown> refleja la realidad del JSON
  limites_superiores_tolerables: Record<string, unknown>;
  incrementos_embarazo_sobre_basal: {
    _nota: string;
    trimestre_1_kcal: number;
    trimestre_2_kcal: number;
    trimestre_3_kcal: number;
  };
  ganancia_peso_embarazo_iom_2009: {
    _fuente: string;
    bajo_peso_imc_menor_18_5: RangoGananciaEmbarazo;
    normal_imc_18_5_24_9: RangoGananciaEmbarazo;
    sobrepeso_imc_25_29_9: RangoGananciaEmbarazo;
    obesidad_imc_mayor_30: RangoGananciaEmbarazo;
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// SECCIÓN 2: lab_references.json — Rangos de Laboratorio Clínico
// @source ADA Standards of Care 2024
// @source NOM-015-SSA2 / NOM-030-SSA2 / NOM-037-SSA2
// @source Harrison's Principles of Internal Medicine. 21st ed.
// @source CKD-EPI 2021 — Inker LA et al. NEJM. 2021;385:1737.
// ─────────────────────────────────────────────────────────────────────────────

export interface RangoLab {
  min: number | null;
  max: number | null;
  interpretacion?: string;
  estadio?: string;
  descripcion?: string;
  categoria?: string;
  texto?: string;
  // Campos específicos para presión arterial
  sistolica_max?: number;
  diastolica_max?: number;
  sistolica_min?: number;
  sistolica_max_pa?: number;
  diastolica_min?: number;
  diastolica_max_pa?: number;
}

export interface LabReferencesData {
  _meta: {
    version: string;
    nombre: string;
    fuentes: string[];
    advertencia: string;
    unidades_principales: string;
  };
  metabolismo_glucosa: Record<string, unknown>;
  perfil_lipidico: Record<string, unknown>;
  funcion_renal: Record<string, unknown>;
  funcion_hepatica: Record<string, unknown>;
  hemograma: Record<string, unknown>;
  micronutrientes_sericos: Record<string, unknown>;
  funcion_tiroidea: Record<string, unknown>;
  presion_arterial: Record<string, unknown>;
  indices_nutricionales: Record<string, unknown>;
}

// ─────────────────────────────────────────────────────────────────────────────
// SECCIÓN 3: mets.json — Compendio de Actividades Físicas (METs)
// @source Ainsworth BE, et al. (2011). Med Sci Sports Exerc. 43(8):1575-1581.
// @source Jetté M, et al. (1990). Clin Cardiol. 13(8):555-565.
// ─────────────────────────────────────────────────────────────────────────────

export interface ActividadFisica {
  id: string;
  actividad: string;
  met: number;
  codigo_ainsworth?: string;
  notas?: string;
  velocidad_kmh?: number;
}

export type CategoriaActividad =
  | 'sedentario'
  | 'caminar'
  | 'correr'
  | 'ciclismo'
  | 'natacion'
  | 'ejercicios_fuerza'
  | 'deportes_raqueta'
  | 'deportes_equipo'
  | 'artes_marciales'
  | 'baile'
  | 'yoga_pilates'
  | 'actividades_acuaticas'
  | 'trabajo_fisico'
  | 'actividades_hogar'
  | 'actividades_recreativas';

export interface ClasificacionIntensidad {
  met_min: number;
  met_max: number | null;
  descripcion: string;
}

export interface METsData {
  _meta: {
    version: string;
    nombre: string;
    fuente_primaria: string;
    fuente_secundaria: string;
    url_oficial: string;
    advertencia: string;
    formula_calculo: string;
    formula_fuente: string;
    categorias_disponibles: CategoriaActividad[];
  };
  formula_ejemplo: {
    descripcion: string;
    calculo: string;
    nota: string;
  };
  actividades: Record<CategoriaActividad, ActividadFisica[]>;
  // _fuente es string, no ClasificacionIntensidad — usar unknown para la key mixta
  clasificacion_intensidad: Record<string, unknown>;
}

// ─────────────────────────────────────────────────────────────────────────────
// SECCIÓN 4: naf_constants.json — Factores de Actividad Física (NAF/TDEE)
// @source WHO. Energy and Protein Requirements. Technical Report 724. 1985.
// @source IOM. Dietary Reference Intakes for Energy. 2005.
// ─────────────────────────────────────────────────────────────────────────────

export type NivelActividadFisica =
  | 'sedentario'
  | 'ligero'
  | 'moderado'
  | 'intenso'
  | 'muy_intenso';

export interface FactorNAF {
  naf: number;
  descripcion: string;
  ejemplo_paciente: string;
  rango_tipico: string;
  fuente: string;
}

export interface FilaNAF {
  descripcion: string;
  naf: number;
}

export interface NAFData {
  _meta: {
    version: string;
    nombre: string;
    fuente_primaria: string;
    fuente_secundaria: string;
    fuente_terciaria: string;
    advertencia: string;
    formula_uso: string;
    unidades: string;
  };
  factores_actividad_fisica: Record<NivelActividadFisica, FactorNAF>;
  factores_estres_metabolico: Record<string, unknown>;
  factores_comparativos: Record<string, unknown>;
  seleccion_naf_recomendada: {
    _para_NUTRIA: string;
    reasoning: string;
    excepciones: string;
  };
  algoritmo_seleccion_naf: Record<string, unknown>;
  ejemplos_clinicos: unknown[];
  tabla_rapida_referencia: {
    titulo: string;
    filas: FilaNAF[];
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// SECCIÓN 5: measures.json — Medidas Caseras Mexicanas
// @source Pérez Lizaur AB et al. SMAE 5ª ed. Fomento de Nutrición y Salud. 2014.
// @source Bourges H et al. Recomendaciones de Ingestión de Nutrimentos. 2005.
// ─────────────────────────────────────────────────────────────────────────────

export interface MeasuresData {
  _meta: {
    version: string;
    nombre: string;
    fuentes: string[];
    advertencia: string;
    sistema_medicion: string;
    utensilios_referencia: Record<string, string>;
  };
  unidades_volumetricas: Record<string, unknown>;
  medidas_por_alimento: Record<string, unknown>;
  conversiones_peso_medida: {
    _descripcion: string;
    equivalencias_generales: Array<{ medida: string; g_aprox: number }>;
    regla_mano: Record<
      string,
      { equivale_a: string; uso: string } | string
    >;
  };
}