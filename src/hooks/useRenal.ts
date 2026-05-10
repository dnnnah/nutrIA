/**
 * useRenal.ts — Motor de Nutrición Renal
 * Proyecto NUTRIA — Open Source
 *
 * Funciones puras de cálculo para la gestión nutricional en ERC:
 *   1. calcularAjusteProteina   — Prescripción proteica por estadio ERC
 *   2. calcularFosforoProteina  — Ratio mg fósforo / g proteína
 *   3. calcularRemojo           — Reducción de potasio por técnica culinaria
 *   4. calcularLiquidosRenal    — Volumen de líquido permitido
 *   5. calcularPRAL             — Potential Renal Acid Load
 *
 * TODAS las funciones son puras: mismo input → mismo output.
 * NINGUNA función modifica estado externo.
 * CADA función tiene @source con cita completa.
 *
 * @module useRenal
 */

import type { EstadioERC } from '../types/biochemistry.types';
import type {
  IngredientePRAL,
  ParametrosAjusteProteina,
  ParametrosFosforoProteina,
  ParametrosLiquidosRenal,
  ParametrosRemojo,
  ResultadoAjusteProteina,
  ResultadoFosforoProteina,
  ResultadoLiquidosRenal,
  ResultadoPRAL,
  ResultadoRemojo,
  TecnicaRemojo,
  ClasificacionFosforo,
  ClasificacionPRAL,
} from '../types/renal.types';

// ===========================================================================
// HELPERS PRIVADOS
// ===========================================================================

const validarRango = (
  valor:  number,
  campo:  string,
  min:    number,
  max:    number
): void => {
  if (!Number.isFinite(valor) || valor < min || valor > max) {
    throw new RangeError(
      `[NUTRIA] ${campo} = ${valor} fuera del rango fisiológico [${min}, ${max}]`
    );
  }
};

const redondear = (valor: number, decimales: number): number =>
  Math.round(valor * 10 ** decimales) / 10 ** decimales;

// ===========================================================================
// TABLA INTERNA: TFG → EstadioERC
// Debe mantenerse sincronizada con ESTADIOS_ERC en useBiochemistry.ts
// ===========================================================================

const tfgAEstadio = (tfg: number): EstadioERC => {
  if (tfg >= 90) return 'G1';
  if (tfg >= 60) return 'G2';
  if (tfg >= 45) return 'G3a';
  if (tfg >= 30) return 'G3b';
  if (tfg >= 15) return 'G4';
  return 'G5';
};

// ===========================================================================
// 1. AJUSTE DE PROTEÍNAS POR ESTADIO ERC
// ===========================================================================

/**
 * Tabla de prescripción proteica por estadio ERC y condición de diálisis.
 *
 * Sin diálisis (ERC conservadora):
 *   G1–G2: 0.8 g/kg/día  (recomendación general — igual que adulto sano)
 *   G3a:   0.8 g/kg/día
 *   G3b:   0.6–0.8 g/kg/día → se usa el mínimo 0.6 para limitar progresión
 *   G4:    0.6 g/kg/día      (dieta hipoproteica estricta)
 *   G5:    0.6 g/kg/día      (antes de iniciar TRS)
 *
 * Con diálisis (hemodiálisis / diálisis peritoneal):
 *   G5D:   1.2 g/kg/día     (compensar pérdidas por membrana dialítica)
 *
 * @source KDOQI Clinical Practice Guideline for Nutrition in CKD: 2020 Update.
 *   Am J Kidney Dis. 2020;76(3)(Suppl 1):S1-S107.
 *   DOI: 10.1053/j.ajkd.2020.05.006
 *   Específicamente: Guideline 3 — Protein Intake in Non-Dialysis CKD
 *   y Guideline 5 — Protein Intake in Maintenance Dialysis.
 */
const PROTEINA_POR_ESTADIO: Record<EstadioERC, { sin_dialisis: number; con_dialisis: number }> = {
  G1:  { sin_dialisis: 0.8, con_dialisis: 1.2 },
  G2:  { sin_dialisis: 0.8, con_dialisis: 1.2 },
  G3a: { sin_dialisis: 0.8, con_dialisis: 1.2 },
  G3b: { sin_dialisis: 0.6, con_dialisis: 1.2 },
  G4:  { sin_dialisis: 0.6, con_dialisis: 1.2 },
  G5:  { sin_dialisis: 0.6, con_dialisis: 1.2 },
} as const;

/**
 * Calcula la prescripción proteica ajustada al estadio de ERC del paciente.
 *
 * Lógica:
 *   1. Derivar estadio ERC desde TFG (CKD-EPI 2021 previo en useBiochemistry).
 *   2. Seleccionar g/kg/día según condición de diálisis (KDOQI 2020).
 *   3. Multiplicar por peso para obtener gramos totales diarios.
 *   4. Activar alerta si ingesta actual supera el límite calculado.
 *
 * @param params.peso_kg           Peso actual o ajustado (IMC > 30: usar peso ajustado).
 * @param params.tfg_ml_min        TFG de CKD-EPI 2021 — no recalcular aquí.
 * @param params.en_dialisis       Condiciona la prescripción radicalmente.
 * @param params.proteina_actual_g Ingesta actual del paciente para comparar.
 *
 * @source KDOQI Clinical Practice Guideline for Nutrition in CKD: 2020 Update.
 *   Am J Kidney Dis. 2020;76(3)(Suppl 1):S1-S107.
 */
export const calcularAjusteProteina = (
  params: ParametrosAjusteProteina
): ResultadoAjusteProteina => {
  const { peso_kg, tfg_ml_min, en_dialisis, proteina_actual_g } = params;

  validarRango(peso_kg,    'peso_kg',    20,   250);
  validarRango(tfg_ml_min, 'tfg_ml_min', 0,    200);

  const estadio       = tfgAEstadio(tfg_ml_min);
  const gramos_por_kg = en_dialisis
    ? PROTEINA_POR_ESTADIO[estadio].con_dialisis
    : PROTEINA_POR_ESTADIO[estadio].sin_dialisis;

  const gramos_totales = redondear(gramos_por_kg * peso_kg, 1);

  const alerta =
    proteina_actual_g !== undefined
      ? proteina_actual_g > gramos_totales
      : false;

  return Object.freeze({
    gramos_por_kg,
    gramos_totales,
    estadio_erc:           estadio,
    alerta,
    fuente_bibliografica:
      'KDOQI Nutrition in CKD 2020 Update. Am J Kidney Dis. 2020;76(3)(Suppl 1):S1-S107.',
  } satisfies ResultadoAjusteProteina);
};

// ===========================================================================
// 2. RATIO FÓSFORO / PROTEÍNA
// ===========================================================================

/**
 * Calcula el ratio mg fósforo / g proteína de un alimento o menú completo.
 *
 * Este ratio estima la carga de fósforo relativa a la proteína:
 *   < 12 mg/g → Óptimo  (proteínas de alto valor biológico: clara de huevo, pollo)
 *   12–16     → Límite  (carnes rojas, pescados de mar)
 *   > 16      → Alto    (lácteos enteros, leguminosas, alimentos con aditivos de P)
 *
 * Relevancia clínica: el fósforo inorgánico de aditivos se absorbe casi al 100%,
 * mientras que el fósforo orgánico de proteínas animales se absorbe ~40–60%.
 * El ratio no distingue biodisponibilidad, pero es útil como tamizaje rápido.
 *
 * @source Sullivan CM, Leon JB, Sehgal AR. Phosphorus-containing food additives
 *   and the accuracy of nutrient databases. J Ren Nutr. 2007;17(5):350-354.
 * @source Noori N et al. Association of dietary phosphorus intake with risk of
 *   death in patients on maintenance dialysis. Clin J Am Soc Nephrol.
 *   2010;5(4):683-692.
 */
export const calcularFosforoProteina = (
  params: ParametrosFosforoProteina
): ResultadoFosforoProteina => {
  const { fosforo_mg, proteina_g } = params;

  validarRango(fosforo_mg, 'fosforo_mg', 0, 3000);
  validarRango(proteina_g, 'proteina_g', 0.1, 300);

  const ratio_mg_por_g = redondear(fosforo_mg / proteina_g, 1);

  let clasificacion: ClasificacionFosforo;
  if (ratio_mg_por_g < 12)       clasificacion = 'optimo';
  else if (ratio_mg_por_g <= 16) clasificacion = 'limite';
  else                           clasificacion = 'alto';

  return Object.freeze({
    ratio_mg_por_g,
    clasificacion,
    fuente_bibliografica:
      'Sullivan CM et al. J Ren Nutr. 2007;17(5):350-354. | Noori N et al. Clin J Am Soc Nephrol. 2010;5(4):683-692.',
  } satisfies ResultadoFosforoProteina);
};

// ===========================================================================
// 3. TÉCNICA DE REMOJO (REDUCCIÓN DE POTASIO)
// ===========================================================================

/**
 * Factores de reducción de potasio por técnica culinaria (% de reducción).
 *
 * Evidencia:
 *   remojo_simple           → ~30% (2h en agua fría, con corte fino)
 *   doble_coccion           → ~50% (1ª cocción 10 min, descartar agua, 2ª cocción)
 *   remojo_doble_coccion    → ~70% (remojo 12h + doble cocción)
 *
 * Nota: la reducción varía según el vegetal, tamaño del corte y temperatura
 * del agua. Valores conservadores tomados del rango inferior de los estudios.
 *
 * @source Bethke PC, Jansky SH. The effects of boiling and leaching on the
 *   content of potassium and other minerals in potatoes.
 *   J Food Sci. 2008;73(5):H80-H85.
 * @source Burrowes JD, Ramer NJ. Removal of potassium from tuberous root
 *   vegetables by leaching. J Ren Nutr. 2006;16(4):304-311.
 * @source Ramos CI et al. Effect of cooking techniques on potassium in
 *   vegetables for patients with chronic kidney disease.
 *   J Hum Nutr Diet. 2011;24(4):392-396.
 */
const REDUCCION_POTASIO: Record<TecnicaRemojo, number> = {
  remojo_simple:         0.30,
  doble_coccion:         0.50,
  remojo_doble_coccion:  0.70,
} as const;

/**
 * Estima el contenido de potasio residual tras aplicar la técnica culinaria.
 *
 * @param params.potasio_original_mg  Potasio del alimento crudo en mg.
 * @param params.tecnica              Técnica de reducción aplicada.
 *
 * @source Bethke & Jansky. J Food Sci. 2008;73(5):H80-H85.
 * @source Burrowes JD & Ramer NJ. J Ren Nutr. 2006;16(4):304-311.
 */
export const calcularRemojo = (params: ParametrosRemojo): ResultadoRemojo => {
  const { potasio_original_mg, tecnica } = params;

  validarRango(potasio_original_mg, 'potasio_original_mg', 0, 10000);

  const reduccion_porcentaje  = REDUCCION_POTASIO[tecnica];
  const potasio_resultante_mg = redondear(
    potasio_original_mg * (1 - reduccion_porcentaje),
    1
  );

  return Object.freeze({
    potasio_resultante_mg,
    reduccion_porcentaje: reduccion_porcentaje * 100,  // devolver en %
    fuente_bibliografica:
      'Bethke PC & Jansky SH. J Food Sci. 2008;73(5):H80-H85. | Burrowes JD & Ramer NJ. J Ren Nutr. 2006;16(4):304-311.',
  } satisfies ResultadoRemojo);
};

// ===========================================================================
// 4. BALANCE DE LÍQUIDOS RENAL
// ===========================================================================

/** Pérdidas insensibles estándar en ERC sin fiebre ni falla cardíaca. */
const PERDIDAS_INSENSIBLES_ML = 500 as const;

/** Agua metabólica endógena estándar (~300 mL/día en adulto en reposo). */
const AGUA_ENDOGENA_ML = 300 as const;

/**
 * Calcula el volumen de líquido permitido en ERC.
 *
 * Fórmula:
 *   Volumen_permitido = Diuresis_24h + 500 (pérdidas insensibles)
 *                       [+ 300 si se incluye agua metabólica endógena]
 *
 * Indicación: En pacientes oligúricos o con restricción de líquidos.
 * No aplica directamente a pacientes en hemodiálisis (la restricción
 * depende del intervalo interdiálisis y ganancia de peso establecida).
 *
 * @source Kopple JD, Massry SG. Nutritional Management of Renal Disease.
 *   3rd ed. Elsevier; 2013. Cap. 9.
 * @source NKF-KDOQI Clinical Practice Guidelines and Clinical Practice
 *   Recommendations: 2006 Updates. Am J Kidney Dis. 2006;48(S1):S1-S322.
 */
export const calcularLiquidosRenal = (
  params: ParametrosLiquidosRenal
): ResultadoLiquidosRenal => {
  const { diuresis_ml_24h, incluir_agua_endogena } = params;

  validarRango(diuresis_ml_24h, 'diuresis_ml_24h', 0, 5000);

  const agua_endogena_ml = incluir_agua_endogena ? AGUA_ENDOGENA_ML : 0;

  const volumen_permitido_ml = redondear(
    diuresis_ml_24h + PERDIDAS_INSENSIBLES_ML + agua_endogena_ml,
    0
  );

  return Object.freeze({
    volumen_permitido_ml,
    agua_endogena_ml,
    fuente_bibliografica:
      'Kopple JD & Massry SG. Nutritional Management of Renal Disease. 3rd ed. Elsevier, 2013. Cap. 9.',
  } satisfies ResultadoLiquidosRenal);
};

// ===========================================================================
// 5. PRAL SCORE (Potential Renal Acid Load)
// ===========================================================================

/**
 * Calcula el PRAL Score (Carga Ácida Renal Potencial) de Remer & Manz 1995.
 *
 * Fórmula original:
 *   PRAL (mEq/día) = 0.49 × proteina_g
 *                    + 0.037 × fosforo_mg
 *                    − 0.021 × potasio_mg
 *                    − 0.026 × calcio_mg
 *                    − 0.026 × magnesio_mg
 *
 * Donde los coeficientes representan:
 *   - Absorciones intestinales netas estimadas de cada mineral.
 *   - Contribución al pool ácido-base renal en mEq.
 *
 * Interpretación:
 *   PRAL < −1  → Alcalinizante (frutas, verduras — reduce carga ácida)
 *   PRAL −1 a 1→ Neutro
 *   PRAL > +1  → Acidificante  (proteínas, quesos, cereales — aumenta carga)
 *
 * Relevancia en ERC: la acidosis metabólica crónica acelera la progresión de
 * daño renal y el catabolismo proteico. Una dieta alcalinizante puede retrasar
 * la progresión en estadios G3–G4.
 *
 * @source Remer T, Manz F. Potential renal acid load of foods and its influence
 *   on urine pH. J Am Diet Assoc. 1995;95(7):791-797.
 *   DOI: 10.1016/S0002-8223(95)00219-7
 * @source Kalantar-Zadeh K et al. Understanding sources of dietary phosphorus
 *   in the treatment of patients with chronic kidney disease.
 *   Clin J Am Soc Nephrol. 2010;5(3):519-530.
 */
export const calcularPRAL = (params: IngredientePRAL): ResultadoPRAL => {
  const { proteina_g, fosforo_mg, potasio_mg, calcio_mg, magnesio_mg } = params;

  validarRango(proteina_g,  'proteina_g',  0, 200);
  validarRango(fosforo_mg,  'fosforo_mg',  0, 3000);
  validarRango(potasio_mg,  'potasio_mg',  0, 10000);
  validarRango(calcio_mg,   'calcio_mg',   0, 3000);
  validarRango(magnesio_mg, 'magnesio_mg', 0, 1500);

  const pral_meq_dia = redondear(
    0.49  * proteina_g
    + 0.037 * fosforo_mg
    - 0.021 * potasio_mg
    - 0.026 * calcio_mg
    - 0.026 * magnesio_mg,
    2
  );

  let clasificacion: ClasificacionPRAL;
  if (pral_meq_dia < -1)      clasificacion = 'alcalinizante';
  else if (pral_meq_dia <= 1) clasificacion = 'neutro';
  else                        clasificacion = 'acidificante';

  return Object.freeze({
    pral_meq_dia,
    clasificacion,
    fuente_bibliografica:
      'Remer T, Manz F. Potential renal acid load of foods. J Am Diet Assoc. 1995;95(7):791-797.',
  } satisfies ResultadoPRAL);
};

// ===========================================================================
// HOOK REACT (Expone todas las funciones como un objeto estable)
// ===========================================================================

/**
 * useRenal — Hook de composición que agrupa los calculadores renales.
 *
 * Al ser funciones puras sin estado interno, el hook es simplemente
 * un objeto de referencias estables (no requiere useState/useReducer).
 * Útil para inyectar en componentes UI sin imports individuales.
 *
 * @example
 *   const { calcularAjusteProteina } = useRenal();
 *   const resultado = calcularAjusteProteina({ peso_kg: 65, tfg_ml_min: 42, en_dialisis: false });
 */
export const useRenal = () => ({
  calcularAjusteProteina,
  calcularFosforoProteina,
  calcularRemojo,
  calcularLiquidosRenal,
  calcularPRAL,
} as const);

export default useRenal;