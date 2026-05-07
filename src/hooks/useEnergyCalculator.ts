/**
 * useEnergyCalculator.ts — Motor de Cálculo Energético
 * Proyecto NUTRIA — Open Source
 *
 * Implementa:
 *   1. TMB con 6 fórmulas validadas bibliográficamente
 *   2. GET = TMB × NAF + ETA
 *   3. Peso ajustado para obesidad (IMC > 30)
 *   4. Incrementos por estrés metabólico
 *
 * ARQUITECTURA:
 *   - Todas las funciones son PURAS (mismo input → mismo output, sin efectos secundarios)
 *   - Cada fórmula vive en su propia función testeable de forma independiente
 *   - Sin `any`, sin `as Type` sin guardia, sin mutaciones
 *
 * @module useEnergyCalculator
 */

import { 
  type CategoríaNAF,
  type FactorEstrés,
  type ParámetrosGET,
  type ParámetrosTMBBase,
  type ParámetrosTMBConMasaMagra,
  type ResultadoGET,
  type ResultadoTMB,
  type Sexo,
} from '../types/energy.types';

// ===========================================================================
// CONSTANTES INTERNAS (inmutables — no exportar; usar getFactorNAF en su lugar)
// ===========================================================================

/**
 * Factores NAF según OMS 1985 / IOM 2005.
 *
 * @source World Health Organization. Energy and Protein Requirements.
 *   Technical Report Series 724. Geneva: WHO; 1985.
 * @source Institute of Medicine. Dietary Reference Intakes for Energy,
 *   Carbohydrate, Fiber, Fat, Fatty Acids, Cholesterol, Protein, and
 *   Amino Acids. Washington DC: National Academies Press; 2005.
 */
const NAF_VALORES: Record<CategoríaNAF, number> = {
  sedentario:  1.20,
  ligero:      1.375,
  moderado:    1.55,
  intenso:     1.725,
  muy_intenso: 1.90,
} as const;

/**
 * Factores de estrés metabólico.
 * Para condiciones con rango se usa el valor medio como default clínico.
 *
 * @source ASPEN Clinical Guidelines. Nutrition Therapy in the Adult
 *   Hospitalized Patient. JPEN. 2016;40(2):159-211.
 */
const FACTORES_ESTRÉS: Record<FactorEstrés, number> = {
  ninguno:              0,
  cirugia_menor:        0.05,  // rango [0, 0.10] → media 0.05
  cirugia_mayor:        0.20,  // rango [0.10, 0.30] → media 0.20
  trauma_cerrado:       0.25,  // rango [0.15, 0.35] → media 0.25
  traumatismo_craneal:  0.50,  // valor fijo publicado
  infeccion_leve:       0.10,  // rango [0, 0.20] → media 0.10
  neumonia:             0.275, // rango [0.20, 0.35] → media 0.275
  sepsis:               0.40,  // rango [0.20, 0.60] → media 0.40
  quemaduras_leve:      0.20,  // valor fijo publicado
  quemaduras_moderada:  0.50,  // valor fijo publicado
  quemaduras_severa:    0.75,  // rango [0.50, 1.00] → media 0.75
  cancer:               0.10,  // rango [0, 0.20] → media 0.10
  fiebre:               0,     // especial: se calcula por temperatura
} as const;

// ===========================================================================
// HELPERS DE VALIDACIÓN (privados — no exportar)
// ===========================================================================

/**
 * Lanza error descriptivo si el valor está fuera del rango fisiológico.
 * Centraliza la validación para que cada fórmula no la repita.
 */
const validarRangoFisiológico = (
  valor: number,
  campo: string,
  min: number,
  max: number
): void => {
  if (!Number.isFinite(valor) || valor < min || valor > max) {
    throw new RangeError(
      `[NUTRIA] ${campo} = ${valor} está fuera del rango fisiológico [${min}, ${max}]`
    );
  }
};

// ===========================================================================
// 1. FÓRMULAS DE TMB (funciones puras y exportadas para tests)
// ===========================================================================

/**
 * Calcula la TMB según Mifflin-St Jeor.
 * Fórmula de referencia actual para población adulta general.
 *
 * @source Mifflin MD, St Jeor ST, Hill LA, Scott BJ, Daugherty SA, Koh YO.
 *   A new predictive equation for resting energy expenditure in healthy
 *   individuals. Am J Clin Nutr. 1990;51(2):241-247.
 *   DOI: 10.1093/ajcn/51.2.241
 *
 * Validación: Error estándar ~1-8% en adultos sanos no obesos.
 * Advertencia: Puede subestimar en adultos mayores con sarcopenia.
 */
export const calcularTMB_Mifflin = (
  params: ParámetrosTMBBase
): ResultadoTMB => {
  const { peso_kg, talla_cm, edad_anios, sexo } = params;

  validarRangoFisiológico(peso_kg,     'peso_kg',     10, 300);
  validarRangoFisiológico(talla_cm,    'talla_cm',    50, 250);
  validarRangoFisiológico(edad_anios,  'edad_anios',  18, 120);

  const base = (10 * peso_kg) + (6.25 * talla_cm) - (5 * edad_anios);
  const tmb_kcal = sexo === 'masculino' ? base + 5 : base - 161;

  return {
    tmb_kcal: Math.round(tmb_kcal * 10) / 10,
    formula_usada: 'mifflin_st_jeor',
    fuente_bibliografica:
      'Mifflin MD et al. Am J Clin Nutr. 1990;51(2):241-247.',
  };
};

/**
 * Calcula la TMB según Harris-Benedict revisada por Roza & Shizgal.
 * Preferida en entorno hospitalario y adultos mayores.
 *
 * @source Roza AM, Shizgal HM. The Harris Benedict equation reevaluated:
 *   resting energy requirements and the body cell mass.
 *   Am J Clin Nutr. 1984;40(1):168-182.
 *   DOI: 10.1093/ajcn/40.1.168
 *
 * Nota: La ecuación original de Harris-Benedict (1919) tiene mayor error;
 * esta revisión de 1984 es la versión clínicamente vigente.
 */
export const calcularTMB_HarrisBenedict = (
  params: ParámetrosTMBBase
): ResultadoTMB => {
  const { peso_kg, talla_cm, edad_anios, sexo } = params;

  validarRangoFisiológico(peso_kg,    'peso_kg',    10, 300);
  validarRangoFisiológico(talla_cm,   'talla_cm',   50, 250);
  validarRangoFisiológico(edad_anios, 'edad_anios', 18, 120);

  const tmb_kcal =
    sexo === 'masculino'
      ? 88.362 + (13.397 * peso_kg) + (4.799 * talla_cm) - (5.677 * edad_anios)
      : 447.593 + (9.247 * peso_kg) + (3.098 * talla_cm) - (4.330 * edad_anios);

  return {
    tmb_kcal: Math.round(tmb_kcal * 10) / 10,
    formula_usada: 'harris_benedict',
    fuente_bibliografica:
      'Roza AM, Shizgal HM. Am J Clin Nutr. 1984;40(1):168-182.',
  };
};

/**
 * Calcula la TMB según Valencia (población mexicana — INNSZ).
 * Desarrollada y validada específicamente en adultos mexicanos de 30-60 años.
 * Diferenciador clínico clave de NUTRIA vs apps genéricas.
 *
 * @source Valencia ME, Moya SY, McNeill G, Haggarty P.
 *   Basal metabolic rate and body fatness of adult men in northern Mexico.
 *   Eur J Clin Nutr. 1994;48(3):209-220.
 *
 * Advertencia: Validada solo para rango 30-60 años. Fuera de ese rango,
 * preferir Mifflin-St Jeor.
 */
export const calcularTMB_Valencia = (
  params: ParámetrosTMBBase
): ResultadoTMB => {
  const { peso_kg, edad_anios, sexo } = params;

  validarRangoFisiológico(peso_kg,    'peso_kg',    30, 200);
  validarRangoFisiológico(edad_anios, 'edad_anios', 30, 60);

  const tmb_kcal =
    sexo === 'masculino'
      ? (13.08 * peso_kg) + 693
      : (10.92 * peso_kg) + 679;

  return {
    tmb_kcal: Math.round(tmb_kcal * 10) / 10,
    formula_usada: 'valencia',
    fuente_bibliografica:
      'Valencia ME et al. Eur J Clin Nutr. 1994;48(3):209-220. (INNSZ)',
  };
};

/**
 * Calcula la TMB según Katch-McArdle.
 * Requiere masa magra medida. Indicada para atletas donde el peso total
 * sobrestima el gasto por alta masa muscular.
 *
 * @source McArdle WD, Katch FI, Katch VL.
 *   Exercise Physiology: Nutrition, Energy, and Human Performance.
 *   8th ed. Philadelphia: Wolters Kluwer; 2015. p. 226-228.
 *
 * Advertencia: No aplica sin medición de masa magra (pliegues, DEXA, BIA).
 * Error de composición corporal se propaga directamente al cálculo.
 */
export const calcularTMB_KatchMcArdle = (
  params: ParámetrosTMBConMasaMagra
): ResultadoTMB => {
  const { masa_magra_kg, peso_kg } = params;

  validarRangoFisiológico(masa_magra_kg, 'masa_magra_kg', 5, 150);

  // Guardia: la masa magra no puede superar el peso total
  if (masa_magra_kg >= peso_kg) {
    throw new RangeError(
      `[NUTRIA] masa_magra_kg (${masa_magra_kg}) debe ser menor a peso_kg (${peso_kg})`
    );
  }

  const tmb_kcal = 370 + (21.6 * masa_magra_kg);

  return {
    tmb_kcal: Math.round(tmb_kcal * 10) / 10,
    formula_usada: 'katch_mcardle',
    fuente_bibliografica:
      'McArdle WD, Katch FI, Katch VL. Exercise Physiology. 8th ed. Wolters Kluwer; 2015.',
  };
};

/**
 * Calcula la TMB según Cunningham.
 * Alternativa a Katch-McArdle para atletas de alta masa muscular.
 * Tiende a dar valores mayores; preferida en contexto de hipertrofia.
 *
 * @source Cunningham JJ. A reanalysis of the factors influencing basal
 *   metabolic rate in normal adults.
 *   Am J Clin Nutr. 1980;33(11):2372-2374.
 *   DOI: 10.1093/ajcn/33.11.2372
 */
export const calcularTMB_Cunningham = (
  params: ParámetrosTMBConMasaMagra
): ResultadoTMB => {
  const { masa_magra_kg, peso_kg } = params;

  validarRangoFisiológico(masa_magra_kg, 'masa_magra_kg', 5, 150);

  if (masa_magra_kg >= peso_kg) {
    throw new RangeError(
      `[NUTRIA] masa_magra_kg (${masa_magra_kg}) debe ser menor a peso_kg (${peso_kg})`
    );
  }

  const tmb_kcal = 500 + (22 * masa_magra_kg);

  return {
    tmb_kcal: Math.round(tmb_kcal * 10) / 10,
    formula_usada: 'cunningham',
    fuente_bibliografica:
      'Cunningham JJ. Am J Clin Nutr. 1980;33(11):2372-2374.',
  };
};

// ---------------------------------------------------------------------------
// Schofield — Tabla por rango de edad y sexo (OMS / pediatría)
// ---------------------------------------------------------------------------

/**
 * Coeficientes de Schofield por rango de edad y sexo.
 * La fórmula general es: TMB = (a × peso_kg) + b
 *
 * @source Schofield WN. Predicting basal metabolic rate, new standards and
 *   review of previous work. Human Nutrition: Clinical Nutrition.
 *   1985;39C(Suppl 1):5-41.
 * @source World Health Organization. Energy and Protein Requirements.
 *   Technical Report Series 724. Geneva: WHO; 1985.
 */
type CoeficientesSchofield = { a: number; b: number };

const SCHOFIELD_COEFICIENTES: Record<
  Sexo,
  Array<{ edad_min: number; edad_max: number; coef: CoeficientesSchofield }>
> = {
  masculino: [
    { edad_min: 0,  edad_max: 2,  coef: { a: 60.9,  b: -54   } },
    { edad_min: 3,  edad_max: 9,  coef: { a: 22.7,  b: 495   } },
    { edad_min: 10, edad_max: 17, coef: { a: 17.5,  b: 651   } },
    { edad_min: 18, edad_max: 29, coef: { a: 15.3,  b: 679   } },
    { edad_min: 30, edad_max: 59, coef: { a: 11.6,  b: 879   } },
    { edad_min: 60, edad_max: 999,coef: { a: 13.5,  b: 487   } },
  ],
  femenino: [
    { edad_min: 0,  edad_max: 2,  coef: { a: 61.0,  b: -51   } },
    { edad_min: 3,  edad_max: 9,  coef: { a: 22.5,  b: 499   } },
    { edad_min: 10, edad_max: 17, coef: { a: 12.2,  b: 746   } },
    { edad_min: 18, edad_max: 29, coef: { a: 14.7,  b: 496   } },
    { edad_min: 30, edad_max: 59, coef: { a: 8.7,   b: 829   } },
    { edad_min: 60, edad_max: 999,coef: { a: 10.5,  b: 596   } },
  ],
} as const;

/**
 * Calcula la TMB según Schofield (tablas OMS 1985).
 * Indicada para pediatría, adolescentes y cuando se requiere consistencia
 * con estándares internacionales OMS.
 */
export const calcularTMB_Schofield = (
  params: ParámetrosTMBBase
): ResultadoTMB => {
  const { peso_kg, edad_anios, sexo } = params;

  validarRangoFisiológico(peso_kg,    'peso_kg',    2,  300);
  validarRangoFisiológico(edad_anios, 'edad_anios', 0,  120);

  const tabla = SCHOFIELD_COEFICIENTES[sexo];
  const fila  = tabla.find(
    (r) => edad_anios >= r.edad_min && edad_anios <= r.edad_max
  );

  if (fila === undefined) {
    throw new RangeError(
      `[NUTRIA] No se encontró coeficiente Schofield para edad ${edad_anios} y sexo ${sexo}`
    );
  }

  const tmb_kcal = (fila.coef.a * peso_kg) + fila.coef.b;

  return {
    tmb_kcal: Math.round(tmb_kcal * 10) / 10,
    formula_usada: 'schofield',
    fuente_bibliografica:
      'Schofield WN. Hum Nutr Clin Nutr. 1985;39C(Suppl 1):5-41. / WHO TRS 724, 1985.',
  };
};

// ===========================================================================
// 2. PESO AJUSTADO (Obesidad — IMC > 30)
// ===========================================================================

/**
 * Calcula el Peso Ideal según Hamwi.
 * Base para calcular el Peso Ajustado en obesidad.
 *
 * @source Hamwi GJ. Therapy: Changing dietary concepts.
 *   In: Danowski TS, ed. Diabetes Mellitus: Diagnosis and Treatment.
 *   New York: American Diabetes Association; 1964. p. 73-78.
 */
export const calcularPesoIdeal_Hamwi = (
  talla_cm: number,
  sexo: Sexo
): number => {
  validarRangoFisiológico(talla_cm, 'talla_cm', 100, 250);

  const base_kg    = sexo === 'masculino' ? 48 : 45;
  const factor_kg  = sexo === 'masculino' ? 2.7 : 2.2;
  const talla_base = 150; // cm de referencia
  const exceso_cm  = Math.max(0, talla_cm - talla_base);

  const peso_ideal_kg = base_kg + (factor_kg * (exceso_cm / 2.5));
  return Math.round(peso_ideal_kg * 10) / 10;
};

/**
 * Calcula el Peso Ajustado para pacientes con obesidad (IMC > 30).
 * Evita sobreestimar el requerimiento energético usando solo el exceso de
 * tejido adiposo metabólicamente activo (25%).
 *
 * @source Bray GA. Drug treatment of obesity. Am J Clin Nutr.
 *   1992;55(2 Suppl):538S-544S.
 * @source ASPEN Clinical Guidelines 2016 — Obesity formulas.
 *
 * Advertencia: Solo aplicar cuando IMC > 30. Si IMC ≤ 30, usar peso actual.
 */
export const calcularPesoAjustado = (
  peso_actual_kg: number,
  peso_ideal_kg: number
): number => {
  if (peso_actual_kg <= peso_ideal_kg) {
    return peso_actual_kg; // Sin ajuste necesario
  }

  const peso_ajustado = ((peso_actual_kg - peso_ideal_kg) * 0.25) + peso_ideal_kg;
  return Math.round(peso_ajustado * 10) / 10;
};

/**
 * Determina el IMC y si corresponde aplicar peso ajustado.
 */
const calcularIMC = (peso_kg: number, talla_cm: number): number => {
  const talla_m = talla_cm / 100;
  return peso_kg / (talla_m * talla_m);
};

// ===========================================================================
// 3. FACTOR NAF (getter puro)
// ===========================================================================

/**
 * Devuelve el valor numérico del NAF para una categoría dada.
 *
 * @source WHO TRS 724 (1985) + IOM DRI for Energy (2005).
 */
export const getFactorNAF = (categoria: CategoríaNAF): number =>
  NAF_VALORES[categoria];

// ===========================================================================
// 4. FACTOR DE ESTRÉS METABÓLICO
// ===========================================================================

/**
 * Calcula el factor de estrés metabólico adicional.
 * Para "fiebre" se usa la ecuación de DuBois (+13% por °C sobre 37°C).
 *
 * @source DuBois EF. Basal Metabolism in Health and Disease.
 *   3rd ed. Philadelphia: Lea & Febiger; 1936.
 * @source ASPEN Clinical Guidelines. JPEN. 2016;40(2):159-211.
 */
export const calcularFactorEstrés = (
  factor_estres: FactorEstrés,
  temperatura_celsius?: number
): number => {
  if (factor_estres === 'fiebre') {
    const temp = temperatura_celsius ?? 37;

    if (temp < 35 || temp > 43) {
      throw new RangeError(
        `[NUTRIA] temperatura_corporal_celsius = ${temp} fuera de rango clínico [35, 43]`
      );
    }

    const grados_sobre_37 = Math.max(0, temp - 37);
    return +(grados_sobre_37 * 0.13).toFixed(4);
  }

  return FACTORES_ESTRÉS[factor_estres];
};

// ===========================================================================
// 5. FUNCIÓN PRINCIPAL — calcularGET (hook orchestrator)
// ===========================================================================

/**
 * Orquesta el cálculo completo del Gasto Energético Total.
 *
 * Flujo de cálculo:
 *   1. Determinar si aplica peso ajustado (IMC > 30 → Hamwi + ajuste 25%)
 *   2. Calcular TMB con la fórmula seleccionada
 *   3. GET_base = TMB × NAF
 *   4. ETA = GET_base × 0.10
 *   5. GET_final = GET_base + ETA
 *   6. GET_con_estrés = GET_final + (TMB × factor_estrés)
 *
 * @throws {RangeError} Si algún parámetro está fuera de rango fisiológico.
 * @throws {Error} Si la fórmula seleccionada requiere masa_magra_kg y no se proporcionó.
 *
 * @source ETA: Tappy L. Thermic effect of food and sympathetic nervous
 *   system activity in humans. Reprod Nutr Dev. 1996;36(4):391-397.
 */
export const calcularGET = (params: ParámetrosGET): ResultadoGET => {
  const {
    peso_kg,
    talla_cm,
    edad_anios,
    sexo,
    masa_magra_kg,
    naf,
    formula_tmb,
    factor_estres = 'ninguno',
    temperatura_corporal_celsius,
  } = params;

  // --- Validaciones globales ---
  validarRangoFisiológico(peso_kg,    'peso_kg',    5,  300);
  validarRangoFisiológico(talla_cm,   'talla_cm',   50, 250);
  validarRangoFisiológico(edad_anios, 'edad_anios', 0,  120);

  // --- Paso 1: Determinar peso de cálculo ---
  const imc = calcularIMC(peso_kg, talla_cm);
  let peso_calculo = peso_kg;
  let usó_peso_ajustado = false;

  if (imc > 30) {
    const peso_ideal = calcularPesoIdeal_Hamwi(talla_cm, sexo);
    peso_calculo      = calcularPesoAjustado(peso_kg, peso_ideal);
    usó_peso_ajustado = true;
  }

  // --- Paso 2: Calcular TMB según fórmula ---
  let resultadoTMB: ResultadoTMB;

  const paramsBase: ParámetrosTMBBase = {
    peso_kg: peso_calculo,
    talla_cm,
    edad_anios,
    sexo,
  };

  switch (formula_tmb) {
    case 'mifflin_st_jeor':
      resultadoTMB = calcularTMB_Mifflin(paramsBase);
      break;

    case 'harris_benedict':
      resultadoTMB = calcularTMB_HarrisBenedict(paramsBase);
      break;

    case 'valencia':
      resultadoTMB = calcularTMB_Valencia(paramsBase);
      break;

    case 'schofield':
      resultadoTMB = calcularTMB_Schofield(paramsBase);
      break;

    case 'katch_mcardle': {
      if (masa_magra_kg === undefined) {
        throw new Error(
          '[NUTRIA] calcularGET: masa_magra_kg es requerida para la fórmula katch_mcardle'
        );
      }
      resultadoTMB = calcularTMB_KatchMcArdle({
        ...paramsBase,
        masa_magra_kg,
      });
      break;
    }

    case 'cunningham': {
      if (masa_magra_kg === undefined) {
        throw new Error(
          '[NUTRIA] calcularGET: masa_magra_kg es requerida para la fórmula cunningham'
        );
      }
      resultadoTMB = calcularTMB_Cunningham({
        ...paramsBase,
        masa_magra_kg,
      });
      break;
    }

    // TypeScript exhaustiveness check — nunca debe llegar aquí
    default: {
      const _nunca: never = formula_tmb;
      throw new Error(`[NUTRIA] Fórmula desconocida: ${String(_nunca)}`);
    }
  }

  // --- Paso 3: GET base y ETA ---
  const naf_valor          = getFactorNAF(naf);
  const get_sin_eta        = resultadoTMB.tmb_kcal * naf_valor;
  const eta_kcal           = get_sin_eta * 0.10;
  const get_final          = get_sin_eta + eta_kcal;

  // --- Paso 4: Factor de estrés ---
  const factor_estres_valor = calcularFactorEstrés(
    factor_estres,
    temperatura_corporal_celsius
  );

  // Fórmula de estrés: GET_final + (TMB × factor_estrés)
  // El factor se aplica sobre la TMB, no sobre el GET total
  const incremento_estres   = resultadoTMB.tmb_kcal * factor_estres_valor;
  const get_con_estres       = get_final + incremento_estres;

  // --- Resultado inmutable ---
  return Object.freeze({
    tmb_kcal:                Math.round(resultadoTMB.tmb_kcal * 10) / 10,
    get_sin_eta_kcal:        Math.round(get_sin_eta * 10) / 10,
    eta_kcal:                Math.round(eta_kcal * 10) / 10,
    get_final_kcal:          Math.round(get_final * 10) / 10,
    get_con_estres_kcal:     Math.round(get_con_estres * 10) / 10,
    peso_utilizado_kg:       peso_calculo,
    peso_ajustado:           usó_peso_ajustado,
    naf_valor,
    naf_categoria:           naf,
    formula_tmb,
    fuente_bibliografica:    resultadoTMB.fuente_bibliografica,
    factor_estres_aplicado:  factor_estres,
    factor_estres_valor,
  } satisfies ResultadoGET);
};

// ===========================================================================
// HOOK REACT (wrapper sobre las funciones puras)
// ===========================================================================

/**
 * Hook React que expone el motor de cálculo energético.
 *
 * Retorna las funciones puras directamente — no gestiona estado interno.
 * El estado del resultado es responsabilidad del componente o store superior.
 *
 * USO:
 *   const { calcularGET, calcularTMB_Mifflin } = useEnergyCalculator();
 */
export const useEnergyCalculator = () => ({
  // Motor principal
  calcularGET,

  // Fórmulas individuales (útiles para comparativas)
  calcularTMB_Mifflin,
  calcularTMB_HarrisBenedict,
  calcularTMB_Valencia,
  calcularTMB_KatchMcArdle,
  calcularTMB_Cunningham,
  calcularTMB_Schofield,

  // Helpers
  calcularPesoIdeal_Hamwi,
  calcularPesoAjustado,
  getFactorNAF,
  calcularFactorEstrés,
});