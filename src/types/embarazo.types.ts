/**
 * embarazo.types.ts — Tipos TypeScript para el módulo de Embarazo y Lactancia
 * Proyecto NUTRIA — Open Source
 *
 * Strict mode: prohibido usar `any` o aserciones sin guarda de tipo.
 *
 * @source IOM. Weight Gain During Pregnancy: Reexamining the Guidelines. 2009.
 * @source IOM. Dietary Reference Intakes for Energy. 2002/2005.
 * @source ACOG Practice Bulletin No. 230. 2021. (Náuseas y vómito)
 */

// ─────────────────────────────────────────────────────────────────────────────
// Enumeraciones canónicas
// ─────────────────────────────────────────────────────────────────────────────

export type Trimestre = 'primero' | 'segundo' | 'tercero';

export type EstadoLactancia = 'exclusiva' | 'parcial' | 'no_lactando';

export type IMCPregestacional =
  | 'bajo_peso'   // IMC < 18.5
  | 'normal'      // IMC 18.5 – 24.9
  | 'sobrepeso'   // IMC 25.0 – 29.9
  | 'obesidad';   // IMC ≥ 30.0

export type IntensidadNauseas = 'leve' | 'moderada' | 'severa';

// ─────────────────────────────────────────────────────────────────────────────
// Adición calórica por trimestre y lactancia
// @source IOM. Energy requirements during pregnancy. 2002.
// @source IOM. DRI for Energy. 2005. Table 5-14.
// ─────────────────────────────────────────────────────────────────────────────

export interface ParametrosAdicionCalorica {
  /** GET basal de la paciente (sin adición de embarazo/lactancia) */
  get_base_kcal: number;
  /**
   * Trimestre del embarazo.
   * Si se omite, se asume que la paciente está en lactancia (usar estado_lactancia).
   */
  trimestre?: Trimestre;
  /**
   * Estado de lactancia.
   * Si trimestre está presente, este campo se ignora.
   */
  estado_lactancia?: EstadoLactancia;
}

export interface ResultadoAdicionCalorica {
  readonly get_base_kcal: number;
  /** Kilocalorías adicionales según trimestre o estado de lactancia */
  readonly adicion_kcal: number;
  readonly get_total_kcal: number;
  /** Texto explicativo del origen de la adición calórica */
  readonly justificacion: string;
  readonly fuente_bibliografica: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Ganancia de peso gestacional (IOM 2009)
// @source IOM. Weight Gain During Pregnancy. 2009. Table 1.
// ─────────────────────────────────────────────────────────────────────────────

export interface ParametrosGananciaPeso {
  /** IMC pregestacional de la paciente (kg/m²) */
  imc_pregestacional: number;
  /** Semana de gestación actual (1–40) */
  semana_gestacion: number;
}

export interface ResultadoGananciaPeso {
  readonly clasificacion_imc: IMCPregestacional;
  /** Rango mínimo de ganancia de peso total recomendado al término */
  readonly ganancia_total_min_kg: number;
  /** Rango máximo de ganancia de peso total recomendado al término */
  readonly ganancia_total_max_kg: number;
  /**
   * Ganancia acumulada recomendada para la semana actual.
   * Calculada con la tasa media de ganancia por semana (T2/T3)
   * más los ~0.5–2 kg del primer trimestre.
   */
  readonly ganancia_actual_recomendada_kg: number;
  /** Tasa de ganancia por semana recomendada (promedio T2/T3) en kg */
  readonly ganancia_por_semana_kg: number;
  readonly fuente_bibliografica: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// IDR ajustadas para embarazo y lactancia
// @source IOM. DRI for Vitamins and Minerals. 2001-2011.
// @source EFSA. DHA supplementation during pregnancy. 2014.
// ─────────────────────────────────────────────────────────────────────────────

export interface ParametrosIDRAjustada {
  /** Si true, se usan valores de lactancia; si false, se usan de embarazo */
  es_lactancia: boolean;
  /** Semana de gestación (solo embarazo, para ajuste de proteína por trimestre) */
  semana_gestacion?: number;
  /** Estado de lactancia para determinar adición de proteína */
  estado_lactancia?: EstadoLactancia;
}

export interface ResultadoIDRAjustada {
  readonly hierro_mg: number;
  readonly folato_mcg_dfe: number;
  readonly calcio_mg: number;
  readonly vitamina_d_mcg: number;
  readonly yodo_mcg: number;
  /** DHA — ácido docosahexaenoico (omega-3 de cadena larga) */
  readonly omega3_dha_mg: number;
  /** Gramos adicionales de proteína sobre el requerimiento basal adulto */
  readonly proteina_adicional_g: number;
  readonly fuente_bibliografica: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Náuseas y vómito del embarazo (NVE)
// @source ACOG Practice Bulletin No. 230 (2021). Nausea and Vomiting.
// @source Ebrahimi N et al. J Popul Ther Clin Pharmacol. 2010.
// ─────────────────────────────────────────────────────────────────────────────

export interface ParametrosNauseas {
  /** Semana de gestación actual (1–40) */
  semana_gestacion: number;
  /** Intensidad clínica de las náuseas */
  intensidad: IntensidadNauseas;
}

export interface ResultadoNauseas {
  /** Recomendaciones dietéticas generales adaptadas a la intensidad */
  readonly recomendaciones: readonly string[];
  /** Número de tiempos de comida sugeridos por día */
  readonly fraccionamiento_comidas: number;
  /** Alimentos y preparaciones bien toleradas */
  readonly alimentos_recomendados: readonly string[];
  /** Alimentos que suelen exacerbar los síntomas */
  readonly alimentos_evitar: readonly string[];
  /** Indicación de si el caso requiere derivación médica */
  readonly requiere_derivacion: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// Ganancia de peso gestacional IOM — tablas de referencia (internas al hook)
// ─────────────────────────────────────────────────────────────────────────────

/** Fila de la tabla IOM 2009 por categoría de IMC pregestacional */
export interface FilaGananciaPesoIOM {
  kg_total_min: number;
  kg_total_max: number;
  /** Tasa mínima de ganancia por semana en T2/T3 */
  kg_sem_min: number;
  /** Tasa máxima de ganancia por semana en T2/T3 */
  kg_sem_max: number;
  /** Ganancia estimada en el primer trimestre (~semanas 1-13) */
  kg_t1_estimado: number;
}