/**
 * renal.types.ts — Tipos para el módulo de Nutrición Renal
 * Proyecto NUTRIA — Open Source
 *
 * Cubre:
 *   1. Ajuste de proteínas por estadio ERC
 *   2. Ratio Fósforo/Proteína
 *   3. Técnica de remojo (reducción de potasio)
 *   4. Balance de líquidos renal
 *   5. PRAL Score (Potential Renal Acid Load)
 *
 * @source KDOQI Clinical Practice Guideline for Nutrition in CKD: 2020 Update.
 *   Am J Kidney Dis. 2020;76(3)(Suppl 1):S1-S107.
 * @source Remer T, Manz F. Potential renal acid load of foods and its influence
 *   on urine pH. J Am Diet Assoc. 1995;95(7):791-797.
 * @source KDIGO 2024 Clinical Practice Guideline for CKD.
 */

import type { EstadioERC } from './biochemistry.types';

// Re-exportar para que los consumidores de este módulo no necesiten importar
// desde biochemistry.types directamente.
export type { EstadioERC };

// ===========================================================================
// 1. AJUSTE DE PROTEÍNAS POR ESTADIO ERC
// ===========================================================================

/**
 * Parámetros para calcular la prescripción proteica en ERC.
 *
 * @field peso_kg          Peso actual (o ajustado si IMC > 30) en kg.
 * @field tfg_ml_min       TFG estimada por CKD-EPI 2021 en mL/min/1.73m².
 * @field en_dialisis      true si el paciente está en hemodiálisis o diálisis peritoneal.
 * @field proteina_actual_g Proteína que consume actualmente el paciente (para calcular alerta).
 */
export interface ParametrosAjusteProteina {
  readonly peso_kg:             number;
  readonly tfg_ml_min:          number;
  readonly en_dialisis:         boolean;
  readonly proteina_actual_g?:  number; // Opcional — activa campo `alerta`
}

/**
 * Resultado del ajuste proteico en ERC.
 *
 * @field gramos_por_kg        Prescripción en g/kg/día según estadio y condición.
 * @field gramos_totales       Prescripción total diaria en gramos.
 * @field estadio_erc          Estadio G1–G5 derivado de la TFG.
 * @field alerta               true si la ingesta actual supera el límite prescrito.
 * @field fuente_bibliografica Cita completa de la guía utilizada.
 */
export interface ResultadoAjusteProteina {
  readonly gramos_por_kg:        number;
  readonly gramos_totales:       number;
  readonly estadio_erc:          EstadioERC;
  readonly alerta:               boolean;
  readonly fuente_bibliografica: string;
}

// ===========================================================================
// 2. RATIO FÓSFORO / PROTEÍNA
// ===========================================================================

/**
 * Clasificación del ratio fósforo/proteína.
 *   óptimo  → < 12 mg P / g proteína  (fuentes animales magras, claras de huevo)
 *   límite  → 12–16 mg P / g proteína
 *   alto    → > 16 mg P / g proteína  (aditivos de fósforo inorgánico)
 *
 * @source Sullivan CM et al. Managing the protein-phosphorus balance in
 *   patients on hemodialysis. Nephrol Nurs J. 2009;36(3):247-250.
 */
export type ClasificacionFosforo = 'optimo' | 'limite' | 'alto';

/**
 * Parámetros para calcular el ratio fósforo/proteína de un alimento o menú.
 *
 * @field fosforo_mg  Contenido de fósforo en mg.
 * @field proteina_g  Contenido de proteína en gramos.
 */
export interface ParametrosFosforoProteina {
  readonly fosforo_mg: number;
  readonly proteina_g: number;
}

/**
 * Resultado del ratio fósforo/proteína.
 *
 * @field ratio_mg_por_g       mg de fósforo por cada g de proteína.
 * @field clasificacion        Evaluación cualitativa del ratio.
 * @field fuente_bibliografica Cita de la guía utilizada.
 */
export interface ResultadoFosforoProteina {
  readonly ratio_mg_por_g:       number;
  readonly clasificacion:        ClasificacionFosforo;
  readonly fuente_bibliografica: string;
}

// ===========================================================================
// 3. TÉCNICA DE REMOJO (REDUCCIÓN DE POTASIO)
// ===========================================================================

/**
 * Técnicas validadas para reducir contenido de potasio en verduras y tubérculos.
 *
 *   remojo_simple           → ~30% de reducción (2h en agua fría)
 *   doble_coccion           → ~50% de reducción (hervido, cambio de agua, rehervido)
 *   remojo_doble_coccion    → ~70% de reducción (remojo previo + doble cocción)
 *
 * @source Cupisti A et al. Dietary Habits and Counseling Focused on Phosphate
 *   Intake in Patients with Chronic Renal Insufficiency With Secondary
 *   Hyperparathyroidism. J Ren Nutr. 2004;14(4):220-225.
 * @source Bethke PC, Jansky SH. The effects of boiling and leaching on the
 *   content of potassium and other minerals in potatoes. J Food Sci.
 *   2008;73(5):H80-H85.
 */
export type TecnicaRemojo =
  | 'remojo_simple'
  | 'doble_coccion'
  | 'remojo_doble_coccion';

/** Parámetros para la estimación de potasio tras técnica culinaria. */
export interface ParametrosRemojo {
  readonly potasio_original_mg: number;
  readonly tecnica:             TecnicaRemojo;
}

/** Resultado de la aplicación de la técnica de remojo/cocción. */
export interface ResultadoRemojo {
  readonly potasio_resultante_mg:  number;
  readonly reduccion_porcentaje:   number;
  readonly fuente_bibliografica:   string;
}

// ===========================================================================
// 4. BALANCE DE LÍQUIDOS RENAL
// ===========================================================================

/**
 * Parámetros para el cálculo del volumen de líquido permitido en ERC.
 *
 * @field diuresis_ml_24h        Orina de 24 horas en mL. Si anuria → 0.
 * @field incluir_agua_endogena  Sumar ~300 mL/día de agua metabólica endógena.
 */
export interface ParametrosLiquidosRenal {
  readonly diuresis_ml_24h:       number;
  readonly incluir_agua_endogena: boolean;
}

/**
 * Resultado del cálculo de líquidos permitidos.
 *
 * Fórmula:
 *   volumen_permitido = diuresis_24h + 500 (pérdidas insensibles) [+ 300 endógena]
 *
 * @source Kopple JD, Massry SG. Nutritional Management of Renal Disease. 3rd ed.
 *   Elsevier, 2013. Cap. 9: Fluid and Electrolyte Management.
 */
export interface ResultadoLiquidosRenal {
  readonly volumen_permitido_ml: number;
  readonly agua_endogena_ml:     number; // 300 ml si se incluye, 0 si no
  readonly fuente_bibliografica: string;
}

// ===========================================================================
// 5. PRAL SCORE (Potential Renal Acid Load)
// ===========================================================================

/**
 * Clasificación de la carga ácida renal potencial.
 *   alcalinizante → PRAL < −1 mEq/día  (frutas, verduras)
 *   neutro        → PRAL −1 a +1 mEq/día
 *   acidificante  → PRAL > +1 mEq/día  (carnes, quesos, cereales)
 *
 * @source Remer T, Manz F. J Am Diet Assoc. 1995;95(7):791-797.
 */
export type ClasificacionPRAL = 'alcalinizante' | 'neutro' | 'acidificante';

/**
 * Contenido de macrominerales de un alimento o menú (por 100g o por ración).
 * Todos los valores son por la misma unidad de referencia.
 */
export interface IngredientePRAL {
  readonly proteina_g:  number; // g
  readonly fosforo_mg:  number; // mg → se convierte a mmol internamente
  readonly potasio_mg:  number; // mg → se convierte a mmol internamente
  readonly calcio_mg:   number; // mg → se convierte a mmol internamente
  readonly magnesio_mg: number; // mg → se convierte a mmol internamente
}

/**
 * Resultado del PRAL Score.
 *
 * Fórmula (Remer & Manz, 1995):
 *   PRAL = (0.49 × proteina_g)
 *          + (0.037 × fosforo_mg)
 *          − (0.021 × potasio_mg)
 *          − (0.026 × calcio_mg)
 *          − (0.026 × magnesio_mg)
 *
 * Unidad: mEq/día
 */
export interface ResultadoPRAL {
  readonly pral_meq_dia:         number;
  readonly clasificacion:        ClasificacionPRAL;
  readonly fuente_bibliografica: string;
}