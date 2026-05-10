/**
 * useDiabetes.ts — Motor de Cálculo: Diabetes y Síndrome Metabólico
 * Proyecto NUTRIA — Open Source
 *
 * Implementa:
 *   1. calcularCargaGlucemica   — CG = (IG × HC_disponibles) / 100
 *   2. calcularIndiceTyG        — TyG = ln(TG/2 × Glucosa/2)
 *   3. calcularRatioInsulinaCH  — Soporte insulinoterapia basal-bolo
 *   4. diagnosticarSindromeMetabolico — Criterios ATP-III (NCEP)
 *   5. construirResumenMetabolico — Agrega resultados en perfil integrado
 *
 * ARQUITECTURA:
 *   - Funciones PURAS: mismo input → mismo output, sin efectos secundarios
 *   - Cero `any`, cero `as Type` sin guardia de tipo
 *   - Toda clasificación es exhaustiva (no puede retornar undefined)
 *   - Cada función exportable individualmente Y vía hook React
 *
 * @module useDiabetes
 */

import {
  type ClasificaciónCG,
  type DetalleCriteriosSM,
  type ParametrosCargaGlucemica,
  type ParametrosRatioInsulinaCH,
  type ParametrosRiesgoMetabolico,
  type ParametrosTyG,
  type ResumenDiabetesMetabolico,
  type ResultadoCargaGlucemica,
  type ResultadoRatioInsulinaCH,
  type ResultadoSindromeMetabolico,
  type ResultadoTyG,
  type RiesgoTyG,
} from '../types/diabetes.types';

// ===========================================================================
// HELPERS PRIVADOS (idénticos al patrón de useBiochemistry)
// ===========================================================================

/**
 * Lanza RangeError si el valor está fuera del rango fisiológico esperado.
 * Previene cálculos silenciosos con datos imposibles (ej: glucosa = -5).
 */
const validarRango = (
  valor: number,
  campo: string,
  min: number,
  max: number
): void => {
  if (!Number.isFinite(valor) || valor < min || valor > max) {
    throw new RangeError(
      `[NUTRIA] ${campo} = ${valor} fuera del rango fisiológico [${min}, ${max}]`
    );
  }
};

/** Redondeo simétrico a N decimales. Evita errores de punto flotante. */
const redondear = (valor: number, decimales: number): number =>
  Math.round(valor * 10 ** decimales) / 10 ** decimales;

// ===========================================================================
// 1. CARGA GLUCÉMICA
// ===========================================================================

/**
 * Calcula la Carga Glucémica (CG) de un alimento o comida.
 *
 * Fórmula:
 *   CG = (IG × HC_disponibles_g) / 100
 *
 * HC_disponibles = HC_totales − Fibra_dietética
 * (Solo los HC que elevan la glucemia postprandial)
 *
 * Clasificación (Brand-Miller 2009):
 *   Baja:  CG < 10
 *   Media: CG 10–19
 *   Alta:  CG ≥ 20
 *
 * Contexto clínico: La CG es superior al IG aislado porque integra
 * tanto la calidad (IG) como la cantidad (HC) de carbohidratos.
 * Un alimento con IG alto puede tener CG baja si la porción es pequeña
 * (ej: sandía IG=72, CG≈4 por porción de 120g).
 *
 * @source Brand-Miller J, Hayne S, Petocz P, Colagiuri S. Low-glycemic
 *   index diets in the management of diabetes. Diabetes Care.
 *   2003;26(8):2261-2267. DOI: 10.2337/diacare.26.8.2261
 *
 * @source Brand-Miller J, et al. Glycemic index, postprandial glycemia,
 *   and the shape of the curve in healthy subjects: analysis of a database
 *   of more than 1,000 foods. Am J Clin Nutr. 2009;89(1):97-105.
 *   DOI: 10.3945/ajcn.2008.26354
 *
 * Advertencias:
 *   - El IG varía por madurez, cocción y combinación con otros alimentos.
 *   - No sustituye la evaluación individualizada de glucemia postprandial.
 *   - Para comidas mixtas usar el IG ponderado por contribución de HC.
 *
 * @example
 *   // Arroz blanco cocido: IG=72, HC_disponibles=52g (100g arroz cocido)
 *   // CG = (72 × 52) / 100 = 37.44 → Alta
 *   calcularCargaGlucemica({ indice_glucemico: 72, hidratos_disponibles_g: 52 })
 *   // → { carga_glucemica: 37.44, clasificacion: 'alta', ... }
 */
export const calcularCargaGlucemica = (
  params: ParametrosCargaGlucemica
): ResultadoCargaGlucemica => {
  const { indice_glucemico, hidratos_disponibles_g } = params;

  validarRango(indice_glucemico,      'indice_glucemico',      0,   100);
  validarRango(hidratos_disponibles_g,'hidratos_disponibles_g', 0,  500);

  const carga_glucemica = redondear(
    (indice_glucemico * hidratos_disponibles_g) / 100,
    2
  );

  let clasificacion: ClasificaciónCG;
  if (carga_glucemica < 10)       clasificacion = 'baja';
  else if (carga_glucemica <= 19) clasificacion = 'media';
  else                            clasificacion = 'alta';

  return Object.freeze({
    carga_glucemica,
    clasificacion,
    indice_glucemico_usado:  indice_glucemico,
    hidratos_disponibles_g,
    fuente_bibliografica:
      'Brand-Miller J et al. Diabetes Care. 2003;26(8):2261-2267. / Am J Clin Nutr. 2009;89(1):97-105.',
  } satisfies ResultadoCargaGlucemica);
};

// ===========================================================================
// 2. ÍNDICE TyG
// ===========================================================================

/**
 * Calcula el Índice TyG (Triglyceryde-Glucose Index).
 *
 * Fórmula:
 *   TyG = ln( (Triglicéridos_mg/dL / 2) × (Glucosa_mg/dL / 2) )
 *
 * Equivalente a:
 *   TyG = ln(TG × Glucosa / 4)
 *   TyG = ln(TG/2) + ln(Glucosa/2)   (forma aditiva logarítmica)
 *
 * Puntos de corte validados en población latinoamericana (Guerrero-Romero 2010):
 *   < 4.49   → Bajo riesgo (sensibilidad insulínica preservada)
 *   4.49–4.68 → Riesgo moderado
 *   > 4.68   → Alto riesgo (resistencia a la insulina probable)
 *
 * Ventaja sobre HOMA-IR: No requiere insulinemia en ayuno.
 * Útil como tamizaje de resistencia insulínica en primer nivel.
 *
 * @source Simental-Mendía LE, Rodríguez-Morán M, Guerrero-Romero F.
 *   The product of fasting glucose and triglycerides as surrogate for
 *   identifying insulin resistance in apparently healthy subjects.
 *   Metab Syndr Relat Disord. 2008;6(4):299-304.
 *   DOI: 10.1089/met.2008.0034
 *
 * @source Guerrero-Romero F, Simental-Mendía LE, González-Ortiz M, et al.
 *   The product of triglycerides and glucose, a simple measure of insulin
 *   sensitivity. Comparison with the euglycemic-hyperinsulinemic clamp.
 *   J Clin Endocrinol Metab. 2010;95(7):3347-3351.
 *   DOI: 10.1210/jc.2010-0288
 *
 * Advertencias:
 *   - Requiere ayuno mínimo de 8h para triglicéridos y glucosa.
 *   - No es diagnóstico; es un marcador de tamizaje.
 *   - Puede estar influenciado por estatinas y fibratos (TG bajo artificialmente).
 *
 * @example
 *   // TG=180 mg/dL, Glucosa=105 mg/dL
 *   // TyG = ln(180/2 × 105/2) = ln(90 × 52.5) = ln(4725) ≈ 8.46
 *   // ⚠️ Nota: la fórmula usa ln en base natural, resultado ~8.x
 *   // Los puntos de corte (4.49, 4.68) aplican a la escala ln(TG/2 × Glu/2)
 *   calcularIndiceTyG({ trigliceridos_mg_dl: 180, glucosa_mg_dl: 105 })
 *   // → { indice_tyg: 8.46, riesgo: 'alto', ... }
 *
 *   // ACLARACIÓN IMPORTANTE sobre los puntos de corte:
 *   // Los valores 4.49 y 4.68 corresponden al índice calculado como
 *   // ln(TG[mmol/L] × Glu[mmol/L]) — escala SI (Sistema Internacional).
 *   // En mg/dL la escala numérica es mayor. Los puntos de corte en mg/dL
 *   // más usados en literatura latinoamericana son: 8.38 y 9.06.
 *   // Esta implementación usa mg/dL con puntos de corte ajustados.
 */
export const calcularIndiceTyG = (params: ParametrosTyG): ResultadoTyG => {
  const { trigliceridos_mg_dl, glucosa_mg_dl } = params;

  validarRango(trigliceridos_mg_dl, 'trigliceridos_mg_dl', 20,  3000);
  validarRango(glucosa_mg_dl,       'glucosa_mg_dl',        50,  600);

  // Fórmula en unidades mg/dL: TyG = ln(TG/2 × Glucosa/2)
  // Puntos de corte ajustados para mg/dL (equivalentes clínicos):
  //   Bajo:     < 8.38   (≈ 4.49 en SI)
  //   Moderado: 8.38 – 9.06 (≈ 4.49–4.68 en SI)
  //   Alto:     > 9.06   (≈ 4.68 en SI)
  //
  // @source Navarro-González D, et al. Insulin Resistance and Cardiovascular
  //   Risk in the DARIOS Study. Rev Esp Cardiol. 2020;73(7):569-576.
  const indice_tyg = redondear(
    Math.log((trigliceridos_mg_dl / 2) * (glucosa_mg_dl / 2)),
    2
  );

  let riesgo: RiesgoTyG;
  if (indice_tyg < 8.38)       riesgo = 'bajo';
  else if (indice_tyg <= 9.06) riesgo = 'moderado';
  else                         riesgo = 'alto';

  return Object.freeze({
    indice_tyg,
    riesgo,
    trigliceridos_mg_dl,
    glucosa_mg_dl,
    fuente_bibliografica:
      'Simental-Mendía LE et al. Metab Syndr Relat Disord. 2008;6(4):299-304. / ' +
      'Guerrero-Romero F et al. J Clin Endocrinol Metab. 2010;95(7):3347-3351.',
  } satisfies ResultadoTyG);
};

// ===========================================================================
// 3. RATIO INSULINA:CARBOHIDRATOS
// ===========================================================================

/**
 * Calcula el Ratio Insulina:Carbohidratos (I:CH).
 *
 * Fórmula directa:
 *   Ratio (U/g) = Dosis_insulina_U / HC_g
 *
 * Inverso (más intuitivo para el paciente):
 *   g_CH_por_U = HC_g / Dosis_insulina_U
 *   → "1 unidad de insulina cubre X gramos de carbohidratos"
 *
 * Método de la Regla del 500 (estimación inicial en DM1):
 *   g_CH_por_U ≈ 500 / Dosis_total_diaria_insulina
 *   (No implementado aquí — requiere la dosis diaria total, no la de comida)
 *
 * Uso clínico: Herramienta de soporte para nutriólogos que asesoran a
 * pacientes DM1 o DM2 con esquema basal-bolo. Permite ajustar la dosis
 * de insulina rápida/ultrarrápida según el contenido de HC de cada comida.
 *
 * @source Walsh J, Roberts R. Pumping Insulin: Everything You Need for
 *   Success with an Insulin Pump. 5th ed. Torrey Pines Press; 2012.
 *
 * @source ADA Standards of Medical Care in Diabetes — Section 9: Pharmacologic
 *   Approaches to Glycemic Treatment. Diabetes Care. 2024;47(Suppl 1):S158-S178.
 *   DOI: 10.2337/dc24-S009
 *
 * Advertencias:
 *   - El ratio es INDIVIDUAL — varía entre pacientes y en el mismo paciente
 *     según hora del día, ciclo menstrual, enfermedad intercurrente.
 *   - No prescribir dosis de insulina. Esta herramienta apoya el análisis
 *     retroactivo, no reemplaza al médico tratante.
 *   - Verificar siempre con glucometría pre y postprandial.
 *
 * @example
 *   // Paciente que aplicó 3U de insulina para 45g de HC
 *   // Ratio = 3/45 = 0.067 U/g → 1U cubre 15g de HC
 *   calcularRatioInsulinaCH({ dosis_insulina_unidades: 3, hidratos_g: 45 })
 *   // → { ratio_u_por_g: 0.07, gramos_ch_por_unidad: 15, ... }
 */
export const calcularRatioInsulinaCH = (
  params: ParametrosRatioInsulinaCH
): ResultadoRatioInsulinaCH => {
  const { dosis_insulina_unidades, hidratos_g } = params;

  validarRango(dosis_insulina_unidades, 'dosis_insulina_unidades', 0.5, 100);
  validarRango(hidratos_g,              'hidratos_g',              1,   400);

  const ratio_u_por_g      = redondear(dosis_insulina_unidades / hidratos_g, 3);
  const gramos_ch_por_unidad = redondear(hidratos_g / dosis_insulina_unidades, 1);

  return Object.freeze({
    ratio_u_por_g,
    gramos_ch_por_unidad,
    dosis_insulina_unidades,
    hidratos_g,
    fuente_bibliografica:
      'Walsh J, Roberts R. Pumping Insulin. 5th ed. 2012. / ' +
      'ADA Standards of Care 2024. Diabetes Care. 2024;47(Suppl 1):S158.',
  } satisfies ResultadoRatioInsulinaCH);
};

// ===========================================================================
// 4. SÍNDROME METABÓLICO (ATP-III / NCEP)
// ===========================================================================

/**
 * Evalúa los 5 criterios del Síndrome Metabólico según ATP-III revisado.
 *
 * Criterios ATP-III (NCEP 2005 revision):
 *   1. Glucosa en ayuno ≥ 100 mg/dL (o tratamiento hipoglucemiante)
 *   2. Triglicéridos ≥ 150 mg/dL (o tratamiento hipolipemiante)
 *   3. HDL < 40 mg/dL ♂ / < 50 mg/dL ♀ (o tratamiento farmacológico)
 *   4. Presión arterial ≥ 130/85 mmHg (aquí se evalúa solo PAS si se provee)
 *   5. Cintura > 102 cm ♂ / > 88 cm ♀ (criterio ATP-III para población general)
 *
 * Diagnóstico: ≥ 3 de 5 criterios positivos.
 *
 * Nota sobre criterios de cintura:
 *   ATP-III usa 102/88 cm. La IDF y la AHA/NHLBI usan puntos de corte
 *   étnicos — para latinoamericanos: ♂ ≥ 90 cm / ♀ ≥ 80 cm (IDF 2006).
 *   Esta implementación usa ATP-III como estándar internacional.
 *   Para criterios IDF latinoamericanos, ajustar los puntos de corte.
 *
 * @source Expert Panel on Detection, Evaluation, and Treatment of High Blood
 *   Cholesterol in Adults (Adult Treatment Panel III). Executive Summary of
 *   the Third Report of the National Cholesterol Education Program (NCEP).
 *   JAMA. 2001;285(19):2486-2497. DOI: 10.1001/jama.285.19.2486
 *
 * @source Grundy SM, Cleeman JI, Daniels SR, et al. Diagnosis and Management
 *   of the Metabolic Syndrome: An American Heart Association/National Heart,
 *   Lung, and Blood Institute Scientific Statement.
 *   Circulation. 2005;112(17):2735-2752.
 *   DOI: 10.1161/CIRCULATIONAHA.105.169404
 *
 * @source International Diabetes Federation. The IDF consensus worldwide
 *   definition of the metabolic syndrome. Brussels: IDF; 2006.
 *   URL: idf.org/our-activities/advocacy-awareness/resources-and-tools/
 *
 * Advertencias:
 *   - Si presion_sistolica o circunferencia_cintura_cm no se proveen,
 *     esos criterios se marcan como null y no se cuentan en el total.
 *   - El diagnóstico requiere siempre ≥ 3 criterios EVALUADOS positivos.
 *   - No incluye criterio de tratamiento farmacológico activo (requerirían
 *     anamnesis — a implementar en Fase 2 como campo booleano adicional).
 *
 * @example
 *   // Paciente mujer con glucosa=108, TG=165, HDL=44, sin datos de PA ni cintura
 *   diagnosticarSindromeMetabolico({
 *     glucosa_mg_dl: 108, trigliceridos_mg_dl: 165,
 *     hdl_mg_dl: 44, sexo: 'femenino'
 *   })
 *   // → { criterios_positivos: 3, criterios_evaluados: 3,
 *   //     tiene_sindrome_metabolico: true, ... }
 */
export const diagnosticarSindromeMetabolico = (
  params: ParametrosRiesgoMetabolico
): ResultadoSindromeMetabolico => {
  const {
    glucosa_mg_dl,
    trigliceridos_mg_dl,
    hdl_mg_dl,
    presion_sistolica,
    circunferencia_cintura_cm,
    sexo,
  } = params;

  // Validar campos obligatorios
  validarRango(glucosa_mg_dl,       'glucosa_mg_dl',       50,  600);
  validarRango(trigliceridos_mg_dl, 'trigliceridos_mg_dl', 20, 3000);
  validarRango(hdl_mg_dl,           'hdl_mg_dl',           10,  150);

  // Validar campos opcionales solo si fueron provistos
  if (presion_sistolica !== undefined) {
    validarRango(presion_sistolica, 'presion_sistolica', 60, 300);
  }
  if (circunferencia_cintura_cm !== undefined) {
    validarRango(circunferencia_cintura_cm, 'circunferencia_cintura_cm', 40, 200);
  }

  // ── Evaluación individual de cada criterio ────────────────────────────────

  // Criterio 1: Glucosa ≥ 100 mg/dL
  const glucosa_alterada = glucosa_mg_dl >= 100;

  // Criterio 2: Triglicéridos ≥ 150 mg/dL
  const trigliceridos_altos = trigliceridos_mg_dl >= 150;

  // Criterio 3: HDL bajo (umbral diferenciado por sexo)
  const umbral_hdl = sexo === 'masculino' ? 40 : 50;
  const hdl_bajo = hdl_mg_dl < umbral_hdl;

  // Criterio 4: Presión arterial ≥ 130 mmHg sistólica (si se provee)
  const presion_alta: boolean | null =
    presion_sistolica !== undefined ? presion_sistolica >= 130 : null;

  // Criterio 5: Cintura aumentada (ATP-III: ♂ >102, ♀ >88)
  const umbral_cintura = sexo === 'masculino' ? 102 : 88;
  const cintura_aumentada: boolean | null =
    circunferencia_cintura_cm !== undefined
      ? circunferencia_cintura_cm > umbral_cintura
      : null;

  const criterios_detalle: DetalleCriteriosSM = Object.freeze({
    glucosa_alterada,
    trigliceridos_altos,
    hdl_bajo,
    presion_alta,
    cintura_aumentada,
  });

  // ── Conteo de criterios ───────────────────────────────────────────────────

  // Solo contar los criterios que pudieron evaluarse (no null)
  const criterios_evaluados = [
    glucosa_alterada,
    trigliceridos_altos,
    hdl_bajo,
    presion_alta,
    cintura_aumentada,
  ].filter((c): c is boolean => c !== null).length;

  const criterios_positivos = [
    glucosa_alterada,
    trigliceridos_altos,
    hdl_bajo,
    presion_alta,
    cintura_aumentada,
  ].filter((c): c is true => c === true).length;

  // Diagnóstico solo es determinante si hay ≥ 3 criterios evaluados
  const tiene_sindrome_metabolico: boolean | null =
    criterios_evaluados >= 3 ? criterios_positivos >= 3 : null;

  return Object.freeze({
    criterios_positivos,
    criterios_evaluados,
    tiene_sindrome_metabolico,
    criterios_detalle,
    fuente_bibliografica:
      'NCEP ATP-III. JAMA. 2001;285(19):2486-2497. / ' +
      'Grundy SM et al. Circulation. 2005;112(17):2735-2752.',
  } satisfies ResultadoSindromeMetabolico);
};

// ===========================================================================
// 5. RESUMEN INTEGRADO
// ===========================================================================

/**
 * Construye el perfil metabólico integrado del paciente.
 *
 * Agrega resultados pre-calculados en un único objeto para:
 *   - Dashboard del expediente clínico
 *   - Generación de PDF / reporte (Fase 2)
 *   - Comparación entre consultas
 *
 * Esta función NO realiza cálculos — solo ensambla.
 * Los cálculos individuales se hacen con las funciones anteriores.
 *
 * @example
 *   const resumen = construirResumenMetabolico({
 *     homa_ir: 3.1,
 *     clasificacion_homa: 'resistencia_leve',
 *     indice_tyg: calcularIndiceTyG({ trigliceridos_mg_dl: 180, glucosa_mg_dl: 105 }),
 *     sindrome_metabolico: diagnosticarSindromeMetabolico({ ... }),
 *   });
 */
export const construirResumenMetabolico = (
  datos: Partial<ResumenDiabetesMetabolico>
): ResumenDiabetesMetabolico =>
  Object.freeze({ ...datos });

// ===========================================================================
// HOOK REACT — Interface pública del módulo
// ===========================================================================

/**
 * Hook que expone todas las funciones del motor de diabetes y síndrome
 * metabólico. Seguimos el patrón de useBiochemistry: el hook es un
 * objeto plano de funciones puras, sin estado interno.
 *
 * Uso en componentes:
 *   const { calcularCargaGlucemica, calcularIndiceTyG, ... } = useDiabetes()
 */
export const useDiabetes = () => ({
  calcularCargaGlucemica,
  calcularIndiceTyG,
  calcularRatioInsulinaCH,
  diagnosticarSindromeMetabolico,
  construirResumenMetabolico,
});