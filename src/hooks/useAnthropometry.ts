/**
 * useAnthropometry.ts — Motor de Antropometría y Composición Corporal
 * Proyecto NUTRIA — Open Source
 *
 * Implementa:
 *   1. IMC + clasificación OMS
 *   2. ICC — Índice Cintura-Cadera (riesgo CV)
 *   3. ICE — Índice Cintura-Estatura (riesgo metabólico)
 *   4. Jackson-Pollock 3 pliegues → Densidad corporal → %Grasa (Siri)
 *   5. Faulkner 4 pliegues → %Grasa (deportistas)
 *   6. AMB — Área Muscular del Brazo (reserva proteica)
 *   7. CMB — Circunferencia Muscular del Brazo
 *
 * ARQUITECTURA: Funciones puras, sin efectos secundarios, sin `any`.
 *
 * @module useAnthropometry
 */

import {
  type ClasificaciónAMB,
  type ClasificaciónIMC,
  type NivelRiesgo,
  type ParámetrosAMB,
  type ParámetrosICE,
  type ParámetrosICC,
  type ParámetrosIMC,
  type PlieguesFaulkner,
  type PlieguesHombre,
  type PlieguesMujer,
  type ResultadoAMB,
  type ResultadoDensidadCorporal,
  type ResultadoFaulkner,
  type ResultadoICE,
  type ResultadoICC,
  type ResultadoIMC,
  type Sexo,
} from '../types/anthropometry.types';

// ===========================================================================
// HELPERS DE VALIDACIÓN (privados)
// ===========================================================================

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

const redondear = (valor: number, decimales: number): number =>
  Math.round(valor * 10 ** decimales) / 10 ** decimales;

// ===========================================================================
// 1. IMC — Índice de Masa Corporal
// ===========================================================================

/**
 * Tabla de clasificación IMC según OMS 2000.
 * Cada entrada: [imc_min_incluido, clasificacion, descripcion]
 */
const TABLA_IMC: Array<{
  min: number;
  max: number;
  clasificacion: ClasificaciónIMC;
  descripcion: string;
}> = [
  { min: 0,    max: 15.99, clasificacion: 'bajo_peso_severo',   descripcion: 'Delgadez severa' },
  { min: 16,   max: 16.99, clasificacion: 'bajo_peso_moderado', descripcion: 'Delgadez moderada' },
  { min: 17,   max: 18.49, clasificacion: 'bajo_peso_leve',     descripcion: 'Delgadez leve' },
  { min: 18.5, max: 24.99, clasificacion: 'normal',             descripcion: 'Peso normal' },
  { min: 25,   max: 29.99, clasificacion: 'sobrepeso',          descripcion: 'Sobrepeso' },
  { min: 30,   max: 34.99, clasificacion: 'obesidad_i',         descripcion: 'Obesidad grado I' },
  { min: 35,   max: 39.99, clasificacion: 'obesidad_ii',        descripcion: 'Obesidad grado II' },
  { min: 40,   max: Infinity, clasificacion: 'obesidad_iii',    descripcion: 'Obesidad grado III (mórbida)' },
] as const;

/**
 * Calcula el IMC y devuelve su clasificación OMS.
 *
 * @source World Health Organization. Obesity: preventing and managing
 *   the global epidemic. Technical Report Series 894. Geneva: WHO; 2000.
 *
 * Advertencia: IMC no distingue masa grasa de masa muscular.
 * En atletas con alta masa muscular puede clasificar como sobrepeso
 * con composición corporal normal. Complementar con pliegues o BIA.
 */
export const calcularIMC = (params: ParámetrosIMC): ResultadoIMC => {
  const { peso_kg, talla_cm } = params;

  validarRango(peso_kg,  'peso_kg',  10, 300);
  validarRango(talla_cm, 'talla_cm', 50, 250);

  const talla_m = talla_cm / 100;
  const imc     = redondear(peso_kg / (talla_m * talla_m), 1);

  const fila = TABLA_IMC.find((r) => imc >= r.min && imc <= r.max);

  // El rango cubre 0-Infinity, por lo que fila nunca será undefined
  // pero TypeScript no lo sabe → guardia explícita
  if (fila === undefined) {
    throw new RangeError(`[NUTRIA] IMC ${imc} sin clasificación — revisar tabla`);
  }

  return Object.freeze({
    imc,
    clasificacion:        fila.clasificacion,
    descripcion:          fila.descripcion,
    fuente_bibliografica: 'WHO. Obesity TRS 894. Geneva: WHO; 2000.',
  } satisfies ResultadoIMC);
};

// ===========================================================================
// 2. ICC — Índice Cintura-Cadera
// ===========================================================================

/**
 * Puntos de corte ICC para riesgo cardiovascular.
 *
 * @source World Health Organization. Waist circumference and waist-hip
 *   ratio: report of a WHO Expert Consultation. Geneva: WHO; 2008.
 */
const ICC_PUNTOS_CORTE: Record<Sexo, number> = {
  masculino: 0.95,
  femenino:  0.85,
} as const;

/**
 * Calcula el ICC y clasifica el riesgo cardiovascular.
 *
 * @source WHO Expert Consultation. Waist circumference and waist-hip ratio.
 *   Geneva: WHO; 2008.
 *
 * Advertencia: El ICC no diferencia grasa visceral de subcutánea.
 * Complementar con ICE y medición de circunferencia de cintura aislada.
 */
export const calcularICC = (params: ParámetrosICC): ResultadoICC => {
  const { cintura_cm, cadera_cm, sexo } = params;

  validarRango(cintura_cm, 'cintura_cm', 40, 200);
  validarRango(cadera_cm,  'cadera_cm',  50, 200);

  if (cadera_cm === 0) {
    throw new RangeError('[NUTRIA] cadera_cm no puede ser 0');
  }

  const icc          = redondear(cintura_cm / cadera_cm, 3);
  const punto_corte  = ICC_PUNTOS_CORTE[sexo];
  const riesgo: NivelRiesgo = icc > punto_corte ? 'riesgo_alto' : 'sin_riesgo';

  return Object.freeze({
    icc,
    riesgo,
    punto_corte_sexo:     punto_corte,
    fuente_bibliografica: 'WHO Expert Consultation. Waist-hip ratio. Geneva: WHO; 2008.',
  } satisfies ResultadoICC);
};

// ===========================================================================
// 3. ICE — Índice Cintura-Estatura
// ===========================================================================

/**
 * Calcula el ICE y clasifica el riesgo metabólico.
 * Punto de corte universal > 0.50 para adultos.
 *
 * @source Ashwell M, Gunn P, Gibson S. Waist-to-height ratio is a better
 *   screening tool than waist circumference and BMI for adult
 *   cardiometabolic risk factors: systematic review and meta-analysis.
 *   Obes Rev. 2012;13(3):275-286. DOI: 10.1111/j.1467-789X.2011.00952.x
 *
 * Regla práctica: "Mantén tu cintura a menos de la mitad de tu estatura"
 */
export const calcularICE = (params: ParámetrosICE): ResultadoICE => {
  const { cintura_cm, talla_cm } = params;

  validarRango(cintura_cm, 'cintura_cm', 40, 200);
  validarRango(talla_cm,   'talla_cm',   50, 250);

  const ice = redondear(cintura_cm / talla_cm, 3);

  let riesgo: NivelRiesgo;
  if (ice < 0.40)      riesgo = 'sin_riesgo';
  else if (ice < 0.50) riesgo = 'riesgo_bajo';
  else if (ice < 0.60) riesgo = 'riesgo_moderado';
  else                 riesgo = 'riesgo_alto';

  return Object.freeze({
    ice,
    riesgo,
    fuente_bibliografica:
      'Ashwell M et al. Obes Rev. 2012;13(3):275-286.',
  } satisfies ResultadoICE);
};

// ===========================================================================
// 4. JACKSON-POLLOCK 3 PLIEGUES → Densidad Corporal → %Grasa (Siri)
// ===========================================================================

/**
 * Calcula la densidad corporal en hombres — Jackson-Pollock 3 pliegues.
 * Sitios: Pecho, Abdominal, Muslo.
 *
 * @source Jackson AS, Pollock ML. Generalized equations for predicting
 *   body density of men. Br J Nutr. 1978;40(3):497-504.
 *   DOI: 10.1079/BJN19780152
 *
 * Advertencia: Validado en hombres 18-61 años. No aplicar en obesidad
 * extrema (IMC > 35) ni en niños.
 */
export const calcularDensidadCorporal_JP3_Hombre = (
  pliegues: PlieguesHombre
): number => {
  const { pecho_mm, abdominal_mm, muslo_mm, edad_anios } = pliegues;

  validarRango(pecho_mm,    'pecho_mm',    1, 80);
  validarRango(abdominal_mm,'abdominal_mm',1, 80);
  validarRango(muslo_mm,    'muslo_mm',    1, 80);
  validarRango(edad_anios,  'edad_anios',  18, 61);

  const Σ3 = pecho_mm + abdominal_mm + muslo_mm;

  const dc =
    1.10938 -
    (0.0008267 * Σ3) +
    (0.0000016 * Σ3 * Σ3) -
    (0.0002574 * edad_anios);

  return redondear(dc, 6);
};

/**
 * Calcula la densidad corporal en mujeres — Jackson-Pollock 3 pliegues.
 * Sitios: Tríceps, Suprailiaco, Muslo.
 *
 * @source Jackson AS, Pollock ML, Ward A. Generalized equations for
 *   predicting body density of women. Med Sci Sports Exerc.
 *   1980;12(3):175-181. DOI: 10.1249/00005768-198023000-00009
 *
 * Advertencia: Validado en mujeres 18-55 años.
 */
export const calcularDensidadCorporal_JP3_Mujer = (
  pliegues: PlieguesMujer
): number => {
  const { triceps_mm, suprailiaco_mm, muslo_mm, edad_anios } = pliegues;

  validarRango(triceps_mm,    'triceps_mm',    1, 80);
  validarRango(suprailiaco_mm,'suprailiaco_mm',1, 80);
  validarRango(muslo_mm,      'muslo_mm',      1, 80);
  validarRango(edad_anios,    'edad_anios',    18, 55);

  const Σ3 = triceps_mm + suprailiaco_mm + muslo_mm;

  const dc =
    1.099492 -
    (0.0009929 * Σ3) +
    (0.0000023 * Σ3 * Σ3) -
    (0.0001392 * edad_anios);

  return redondear(dc, 6);
};

/**
 * Convierte densidad corporal a % de grasa — Fórmula de Siri.
 *
 * @source Siri WE. Body composition from fluid spaces and density:
 *   analysis of methods. In: Brozek J, Henschel A, eds.
 *   Techniques for Measuring Body Composition.
 *   Washington DC: National Academies Press; 1961. p. 223-244.
 *
 * Advertencia: Asume densidad de grasa = 0.9 g/mL y tejido magro = 1.1 g/mL.
 * Puede sobreestimar en adultos mayores con menor densidad ósea.
 */
export const calcularPorcentajeGrasa_Siri = (
  densidad_g_mL: number
): number => {
  validarRango(densidad_g_mL, 'densidad_g_mL', 0.85, 1.12);

  const porcentaje = ((4.95 / densidad_g_mL) - 4.50) * 100;
  return redondear(porcentaje, 1);
};

/**
 * Orquesta Jackson-Pollock 3 pliegues + Siri para hombres.
 * Devuelve composición corporal completa.
 */
export const calcularComposicion_JP3_Hombre = (
  pliegues:  PlieguesHombre,
  peso_kg:   number
): ResultadoDensidadCorporal => {
  validarRango(peso_kg, 'peso_kg', 10, 300);

  const densidad         = calcularDensidadCorporal_JP3_Hombre(pliegues);
  const porcentaje_grasa = calcularPorcentajeGrasa_Siri(densidad);
  const masa_grasa_kg    = redondear((porcentaje_grasa / 100) * peso_kg, 1);
  const masa_magra_kg    = redondear(peso_kg - masa_grasa_kg, 1);
  const Σ3               = pliegues.pecho_mm + pliegues.abdominal_mm + pliegues.muslo_mm;

  return Object.freeze({
    densidad_g_mL:        densidad,
    porcentaje_grasa,
    masa_grasa_kg,
    masa_magra_kg,
    formula_pliegues:     'jackson_pollock_3h',
    formula_grasa:        'siri',
    suma_pliegues_mm:     Σ3,
    fuente_bibliografica:
      'Jackson AS, Pollock ML. Br J Nutr. 1978;40(3):497-504. / Siri WE. 1961.',
  } satisfies ResultadoDensidadCorporal);
};

/**
 * Orquesta Jackson-Pollock 3 pliegues + Siri para mujeres.
 * Devuelve composición corporal completa.
 */
export const calcularComposicion_JP3_Mujer = (
  pliegues: PlieguesMujer,
  peso_kg:  number
): ResultadoDensidadCorporal => {
  validarRango(peso_kg, 'peso_kg', 10, 300);

  const densidad         = calcularDensidadCorporal_JP3_Mujer(pliegues);
  const porcentaje_grasa = calcularPorcentajeGrasa_Siri(densidad);
  const masa_grasa_kg    = redondear((porcentaje_grasa / 100) * peso_kg, 1);
  const masa_magra_kg    = redondear(peso_kg - masa_grasa_kg, 1);
  const Σ3               = pliegues.triceps_mm + pliegues.suprailiaco_mm + pliegues.muslo_mm;

  return Object.freeze({
    densidad_g_mL:        densidad,
    porcentaje_grasa,
    masa_grasa_kg,
    masa_magra_kg,
    formula_pliegues:     'jackson_pollock_3m',
    formula_grasa:        'siri',
    suma_pliegues_mm:     Σ3,
    fuente_bibliografica:
      'Jackson AS et al. Med Sci Sports Exerc. 1980;12(3):175-181. / Siri WE. 1961.',
  } satisfies ResultadoDensidadCorporal);
};

// ===========================================================================
// 5. FAULKNER 4 PLIEGUES (Deportistas)
// ===========================================================================

/**
 * Calcula % de grasa corporal — Fórmula de Faulkner (4 pliegues).
 * Diseñada para deportistas; más precisa en sujetos con baja adiposidad.
 * Sitios: Tríceps, Subescapular, Suprailiaco, Abdominal.
 *
 * @source Faulkner JA. Physiology of swimming and diving.
 *   In: Falls H, ed. Exercise Physiology.
 *   Baltimore: Academic Press; 1968. p. 415-446.
 *
 * Advertencia: Puede subestimar % grasa en población sedentaria o con obesidad.
 * Indicada en: natación, atletismo, fútbol, ciclismo.
 */
export const calcularComposicion_Faulkner = (
  pliegues: PlieguesFaulkner,
  peso_kg:  number
): ResultadoFaulkner => {
  const { triceps_mm, subescapular_mm, suprailiaco_mm, abdominal_mm } = pliegues;

  validarRango(triceps_mm,      'triceps_mm',      1, 80);
  validarRango(subescapular_mm, 'subescapular_mm', 1, 80);
  validarRango(suprailiaco_mm,  'suprailiaco_mm',  1, 80);
  validarRango(abdominal_mm,    'abdominal_mm',    1, 80);
  validarRango(peso_kg,         'peso_kg',         10, 300);

  const Σ4               = triceps_mm + subescapular_mm + suprailiaco_mm + abdominal_mm;
  const porcentaje_grasa = redondear((Σ4 * 0.153) + 5.783, 1);
  const masa_grasa_kg    = redondear((porcentaje_grasa / 100) * peso_kg, 1);
  const masa_magra_kg    = redondear(peso_kg - masa_grasa_kg, 1);

  return Object.freeze({
    porcentaje_grasa,
    masa_grasa_kg,
    masa_magra_kg,
    suma_pliegues_mm:     Σ4,
    formula_pliegues:     'faulkner_4',
    fuente_bibliografica: 'Faulkner JA. Exercise Physiology. Academic Press; 1968.',
  } satisfies ResultadoFaulkner);
};

// ===========================================================================
// 6. AMB — Área Muscular del Brazo + CMB
// ===========================================================================

/**
 * Valores de referencia AMB (cm²) para clasificación — percentil 50.
 * Se usa como referencia del 100% para calcular % de adecuación.
 *
 * @source Frisancho AR. New norms of upper limb fat and muscle areas
 *   for assessment of nutritional status.
 *   Am J Clin Nutr. 1981;34(11):2540-2545.
 *
 * Nota: Los valores reales de Frisancho son tablas por edad y sexo.
 * Estos son los valores del percentil 50 para adultos 25-34 años
 * como referencia de normalidad en adultos activos.
 * TODO: Implementar tabla completa por grupo etario (Frisancho 1981 tabla 3).
 */
const AMB_REFERENCIA_P50: Record<Sexo, number> = {
  masculino: 54.0, // cm² — hombre adulto referencia
  femenino:  30.5, // cm² — mujer adulta referencia
} as const;

/**
 * Clasifica el AMB respecto al percentil 50 de referencia.
 */
const clasificarAMB = (
  amb_cm2: number,
  sexo:    Sexo
): ClasificaciónAMB => {
  const referencia  = AMB_REFERENCIA_P50[sexo];
  const adecuacion  = (amb_cm2 / referencia) * 100;

  if (adecuacion >= 90) return 'adecuada';
  if (adecuacion >= 80) return 'deplecion_leve';
  if (adecuacion >= 70) return 'deplecion_moderada';
  return 'deplecion_severa';
};

/**
 * Calcula el AMB (Área Muscular del Brazo) y CMB (Circunferencia Muscular).
 * Indicador de reserva proteica somática / músculo esquelético.
 *
 * Fórmulas:
 *   CMB (cm)  = CB_cm − (π × PT_cm)
 *   AMB (cm²) = [CB_cm − (π × PT_cm)]² / (4π)
 *
 * Donde CB = circunferencia de brazo relajado, PT = pliegue tricipital
 *
 * @source Frisancho AR. New norms of upper limb fat and muscle areas
 *   for assessment of nutritional status.
 *   Am J Clin Nutr. 1981;34(11):2540-2545.
 *   DOI: 10.1093/ajcn/34.11.2540
 *
 * Advertencia: Asume sección transversal circular del brazo (simplificación).
 * Puede sobreestimar AMB en obesidad. Siempre interpretar con otros marcadores
 * (albúmina, prealbúmina, fuerza de prensión).
 */
export const calcularAMB = (params: ParámetrosAMB): ResultadoAMB => {
  const {
    circunferencia_brazo_cm,
    pliegue_triceps_mm,
    sexo,
    edad_anios,
  } = params;

  validarRango(circunferencia_brazo_cm, 'circunferencia_brazo_cm', 10, 60);
  validarRango(pliegue_triceps_mm,      'pliegue_triceps_mm',       1, 80);
  validarRango(edad_anios,              'edad_anios',               1, 120);

  // Convertir pliegue a cm para la fórmula
  const pt_cm = pliegue_triceps_mm / 10;
  const cb_cm = circunferencia_brazo_cm;

  const cmb_cm  = redondear(cb_cm - (Math.PI * pt_cm), 2);
  const amb_cm2 = redondear((cmb_cm * cmb_cm) / (4 * Math.PI), 2);

  if (amb_cm2 <= 0) {
    throw new RangeError(
      '[NUTRIA] AMB calculada es ≤ 0 — verificar circunferencia de brazo y pliegue tricipital'
    );
  }

  const clasificacion = clasificarAMB(amb_cm2, sexo);

  return Object.freeze({
    amb_cm2,
    cmb_cm,
    clasificacion,
    fuente_bibliografica:
      'Frisancho AR. Am J Clin Nutr. 1981;34(11):2540-2545.',
  } satisfies ResultadoAMB);
};

// ===========================================================================
// HOOK REACT (wrapper sobre las funciones puras)
// ===========================================================================

/**
 * Hook que expone el motor de antropometría y composición corporal.
 * No gestiona estado interno — devuelve funciones puras directamente.
 *
 * USO:
 *   const { calcularIMC, calcularComposicion_JP3_Mujer } = useAnthropometry();
 */
export const useAnthropometry = () => ({
  // Índices básicos
  calcularIMC,
  calcularICC,
  calcularICE,

  // Composición corporal — pliegues
  calcularComposicion_JP3_Hombre,
  calcularComposicion_JP3_Mujer,
  calcularComposicion_Faulkner,

  // Funciones atómicas (para comparativas o tests)
  calcularDensidadCorporal_JP3_Hombre,
  calcularDensidadCorporal_JP3_Mujer,
  calcularPorcentajeGrasa_Siri,

  // Masa muscular
  calcularAMB,
});