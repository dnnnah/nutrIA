/**
 * diabetes.types.ts — Tipos para el módulo de Diabetes y Síndrome Metabólico
 * Proyecto NUTRIA — Open Source
 *
 * Cubre:
 *   1. Carga glucémica de alimentos y comidas
 *   2. Índice TyG (Triglicéridos × Glucosa) — marcador de resistencia insulínica
 *   3. Ratio Insulina:Carbohidratos — soporte terapia insulínica
 *   4. Criterios diagnósticos Síndrome Metabólico (ATP-III / IDF)
 *   5. Resumen integrado del perfil metabólico
 *
 * Nomenclatura: español clínico según AGENT.md
 */

// ---------------------------------------------------------------------------
// CLASIFICACIONES (union types — sin magic strings en el código de negocio)
// ---------------------------------------------------------------------------

/** Categorías de Carga Glucémica según Brand-Miller. */
export type ClasificaciónCG =
  | 'baja'    // < 10
  | 'media'   // 10 – 19
  | 'alta';   // ≥ 20

/** Niveles de riesgo del Índice TyG. */
export type RiesgoTyG =
  | 'bajo'      // < 4.49
  | 'moderado'  // 4.49 – 4.68
  | 'alto';     // > 4.68

// ---------------------------------------------------------------------------
// PARÁMETROS DE ENTRADA
// ---------------------------------------------------------------------------

/**
 * Parámetros para calcular la Carga Glucémica (CG).
 *
 * CG = (IG × HC_disponibles_g) / 100
 *
 * Se puede usar por alimento individual o por comida completa
 * (sumando los HC disponibles de todos los ingredientes).
 */
export interface ParametrosCargaGlucemica {
  /** Índice glucémico del alimento o comida (0–100, referencia glucosa). */
  indice_glucemico: number;
  /**
   * Hidratos de carbono disponibles (netos) en gramos.
   * HC_netos = HC_totales − Fibra_dietética
   * Representa solo los HC que elevan la glucemia.
   */
  hidratos_disponibles_g: number;
}

/**
 * Parámetros para el Índice TyG.
 * Ambos valores deben provenir del mismo análisis en ayuno ≥ 8h.
 */
export interface ParametrosTyG {
  trigliceridos_mg_dl: number;
  glucosa_mg_dl: number;
}

/**
 * Parámetros para el Ratio Insulina:Carbohidratos.
 * Herramienta de soporte para pacientes con insulinoterapia intensiva.
 */
export interface ParametrosRatioInsulinaCH {
  /** Dosis de insulina de acción rápida o ultrarrápida en unidades. */
  dosis_insulina_unidades: number;
  /** Gramos de hidratos de carbono de la comida. */
  hidratos_g: number;
}

/**
 * Parámetros para diagnóstico de Síndrome Metabólico.
 * Los campos de presión y cintura son opcionales — el módulo los evalúa
 * solo si se proporcionan, marcando el criterio como "no evaluado" si faltan.
 */
export interface ParametrosRiesgoMetabolico {
  glucosa_mg_dl: number;
  trigliceridos_mg_dl: number;
  hdl_mg_dl: number;
  /** Presión arterial sistólica en mmHg. Opcional — criterio 4/5. */
  presion_sistolica?: number;
  /** Circunferencia de cintura en cm. Opcional — criterio 5/5. */
  circunferencia_cintura_cm?: number;
  sexo: 'masculino' | 'femenino';
}

// ---------------------------------------------------------------------------
// RESULTADOS DE SALIDA
// ---------------------------------------------------------------------------

/**
 * Resultado del cálculo de Carga Glucémica.
 *
 * @source Brand-Miller J, et al. Glycemic index, postprandial glycemia, and
 *   the shape of the curve in healthy subjects: analysis of a database of
 *   more than 1,000 foods. Am J Clin Nutr. 2009;89(1):97-105.
 *   DOI: 10.3945/ajcn.2008.26354
 */
export interface ResultadoCargaGlucemica {
  readonly carga_glucemica: number;
  readonly clasificacion: ClasificaciónCG;
  /** Refleja que el IG original es del alimento, no de la carga neta. */
  readonly indice_glucemico_usado: number;
  readonly hidratos_disponibles_g: number;
  readonly fuente_bibliografica: string;
}

/**
 * Resultado del Índice TyG (Triglyceryde-Glucose Index).
 *
 * Marcador surrogado de resistencia a la insulina obtenido de parámetros
 * de laboratorio de rutina, sin necesidad de insulinemia.
 *
 * @source Simental-Mendía LE, et al. The product of fasting glucose and
 *   triglycerides as surrogate for identifying insulin resistance in
 *   apparently healthy subjects. Metab Syndr Relat Disord. 2008;6(4):299-304.
 *   DOI: 10.1089/met.2008.0034
 *
 * Puntos de corte validados en población latinoamericana:
 * @source Guerrero-Romero F, et al. The product of triglycerides and glucose,
 *   a simple measure of insulin sensitivity. Comparison with the euglycemic-
 *   hyperinsulinemic clamp. J Clin Endocrinol Metab. 2010;95(7):3347-3351.
 *   DOI: 10.1210/jc.2010-0288
 */
export interface ResultadoTyG {
  readonly indice_tyg: number;
  readonly riesgo: RiesgoTyG;
  /** Triglicéridos originales usados en el cálculo. */
  readonly trigliceridos_mg_dl: number;
  /** Glucosa original usada en el cálculo. */
  readonly glucosa_mg_dl: number;
  readonly fuente_bibliografica: string;
}

/**
 * Resultado del Ratio Insulina:Carbohidratos.
 *
 * Herramienta de soporte para nutriólogos que trabajan con pacientes DM1
 * o DM2 en insulinoterapia intensiva basal-bolo.
 *
 * @source Walsh J, Roberts R. Pumping Insulin. 5th ed. Torrey Pines Press; 2012.
 * @source ADA Standards of Medical Care in Diabetes — Insulin Therapy Section.
 *   Diabetes Care. 2024;47(Suppl 1):S158-S178.
 */
export interface ResultadoRatioInsulinaCH {
  /**
   * Unidades de insulina por gramo de HC.
   * Ejemplo: 0.1 U/g → 1 U cubre 10g de HC.
   */
  readonly ratio_u_por_g: number;
  /**
   * Gramos de HC cubiertos por 1 unidad de insulina (inverso del ratio).
   * Más intuitivo para el paciente: "1 unidad cubre X gramos de carbohidratos".
   */
  readonly gramos_ch_por_unidad: number;
  readonly dosis_insulina_unidades: number;
  readonly hidratos_g: number;
  readonly fuente_bibliografica: string;
}

/**
 * Detalle booleano de cada criterio del Síndrome Metabólico.
 * `null` indica que el dato no fue proporcionado (criterio no evaluable).
 */
export interface DetalleCriteriosSM {
  /** Glucosa ≥ 100 mg/dL en ayuno (o tratamiento hipoglucemiante activo). */
  readonly glucosa_alterada: boolean;
  /** Triglicéridos ≥ 150 mg/dL (o tratamiento hipolipemiante activo). */
  readonly trigliceridos_altos: boolean;
  /** HDL < 40 mg/dL ♂ / < 50 mg/dL ♀ (o tratamiento farmacológico). */
  readonly hdl_bajo: boolean;
  /** PAS ≥ 130 mmHg. null si no se proporcionó presión arterial. */
  readonly presion_alta: boolean | null;
  /** Cintura > 102 cm ♂ / > 88 cm ♀ (ATP-III). null si no se proporcionó. */
  readonly cintura_aumentada: boolean | null;
}

/**
 * Resultado del diagnóstico de Síndrome Metabólico.
 *
 * Se usa el criterio ATP-III (NCEP) revisado, el más utilizado en práctica
 * clínica latinoamericana y estudios epidemiológicos mexicanos.
 * Diagnóstico: ≥ 3 de 5 criterios positivos.
 *
 * @source Expert Panel on Detection, Evaluation, and Treatment of High Blood
 *   Cholesterol in Adults. Executive Summary of the Third Report of the NCEP
 *   (ATP III). JAMA. 2001;285(19):2486-2497.
 *   DOI: 10.1001/jama.285.19.2486
 *
 * @source Grundy SM, et al. Diagnosis and Management of the Metabolic Syndrome:
 *   An American Heart Association/National Heart, Lung, and Blood Institute
 *   Scientific Statement. Circulation. 2005;112(17):2735-2752.
 *   DOI: 10.1161/CIRCULATIONAHA.105.169404
 */
export interface ResultadoSindromeMetabolico {
  /**
   * Número de criterios ATP-III positivos (0–5).
   * Solo cuenta criterios evaluados (no los que son null).
   */
  readonly criterios_positivos: number;
  /**
   * Cuántos criterios fueron evaluados (pueden ser < 5 si faltan datos).
   * Útil para informar al usuario que el diagnóstico es parcial.
   */
  readonly criterios_evaluados: number;
  /**
   * true si criterios_positivos ≥ 3 Y criterios_evaluados ≥ 3.
   * Si hay < 3 criterios evaluados, este campo es null (diagnóstico incompleto).
   */
  readonly tiene_sindrome_metabolico: boolean | null;
  readonly criterios_detalle: DetalleCriteriosSM;
  readonly fuente_bibliografica: string;
}

/**
 * Resumen integrado del perfil de diabetes y metabolismo del paciente.
 *
 * Agrega resultados de múltiples cálculos en un solo objeto para facilitar
 * la visualización en el Dashboard y exportación al expediente clínico.
 * Todos los campos son opcionales porque el nutriólogo puede no tener
 * todos los datos disponibles en cada consulta.
 */
export interface ResumenDiabetesMetabolico {
  /** Resultado HOMA-IR (calculado en useBiochemistry — se importa aquí). */
  homa_ir?: number;
  /** Clasificación HOMA para mostrar en UI sin re-calcular. */
  clasificacion_homa?: 'normal' | 'resistencia_leve' | 'resistencia_sig';
  /** Carga glucémica total del plan alimenticio del día. */
  carga_glucemica_total?: ResultadoCargaGlucemica;
  /** Índice TyG calculado a partir del perfil lipídico. */
  indice_tyg?: ResultadoTyG;
  /** Diagnóstico de Síndrome Metabólico. */
  sindrome_metabolico?: ResultadoSindromeMetabolico;
  /** Ratio insulina:CH (solo para pacientes con insulinoterapia). */
  ratio_insulina_ch?: ResultadoRatioInsulinaCH;
}