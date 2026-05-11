/**
 * useEmbarazo.ts — Motor de Cálculo Clínico: Embarazo y Lactancia
 * Proyecto NUTRIA — Open Source
 *
 * Todas las funciones son PURAS: mismo input → mismo output, sin efectos secundarios.
 * Cada función valida sus parámetros y lanza errores descriptivos si están fuera de
 * rango fisiológico. Los objetos de retorno son inmutables (Object.freeze).
 *
 * FÓRMULAS IMPLEMENTADAS:
 *   1. calcularAdicionCalorica   — Adición kcal por trimestre/lactancia (IOM 2002)
 *   2. calcularGananciaPeso      — Rango IOM 2009 según IMC pregestacional
 *   3. calcularIDRAjustada       — IDR ajustadas embarazo/lactancia (IOM 2001-2011)
 *   4. calcularRecomendacionesNauseas — Manejo dietético NVE (ACOG 2021)
 *
 * @source IOM. Dietary Reference Intakes for Energy. 2002/2005.
 * @source IOM. Weight Gain During Pregnancy: Reexamining the Guidelines. 2009.
 * @source IOM. Dietary Reference Intakes for Vitamins and Minerals. 2001-2011.
 * @source ACOG Practice Bulletin No. 230. Nausea and Vomiting. 2021.
 * @source EFSA. DHA supplementation during pregnancy. EFSA Journal. 2014.
 */

import type {
  FilaGananciaPesoIOM,
  IMCPregestacional,
  ParametrosAdicionCalorica,
  ParametrosGananciaPeso,
  ParametrosIDRAjustada,
  ParametrosNauseas,
  ResultadoAdicionCalorica,
  ResultadoGananciaPeso,
  ResultadoIDRAjustada,
  ResultadoNauseas,
} from '../types/embarazo.types';

// ===========================================================================
// TABLAS DE REFERENCIA (constantes internas — no exportadas)
// ===========================================================================

/**
 * Adición calórica por trimestre sobre el GET basal.
 * T1: sin adición (requerimiento cubierto por reducción de actividad espontánea)
 * T2: +340 kcal/día | T3: +450 kcal/día
 *
 * @source IOM. Dietary Reference Intakes for Energy. 2002. Table 5-14, p.196.
 */
const ADICION_TRIMESTRE_KCAL: Record<'primero' | 'segundo' | 'tercero', number> = {
  primero: 0,
  segundo: 340,
  tercero: 450,
} as const;

/**
 * Adición calórica por estado de lactancia.
 * Lactancia exclusiva: +500 kcal/día | Parcial: +330 kcal/día
 *
 * @source IOM. DRI for Energy. 2005. p.363.
 */
const ADICION_LACTANCIA_KCAL: Record<'exclusiva' | 'parcial' | 'no_lactando', number> = {
  exclusiva:    500,
  parcial:      330,
  no_lactando:  0,
} as const;

/**
 * Tabla IOM 2009 de ganancia de peso gestacional por IMC pregestacional.
 * kg_t1_estimado = ganancia típica en el primer trimestre (semanas 1-13).
 *
 * @source IOM. Weight Gain During Pregnancy. 2009. Table 1, p.1.
 */
const TABLA_GANANCIA_PESO_IOM: Record<IMCPregestacional, FilaGananciaPesoIOM> = {
  bajo_peso:  { kg_total_min: 12.5, kg_total_max: 18.0, kg_sem_min: 0.51, kg_sem_max: 0.59, kg_t1_estimado: 2.0 },
  normal:     { kg_total_min: 11.5, kg_total_max: 16.0, kg_sem_min: 0.42, kg_sem_max: 0.59, kg_t1_estimado: 1.6 },
  sobrepeso:  { kg_total_min: 7.0,  kg_total_max: 11.5, kg_sem_min: 0.28, kg_sem_max: 0.42, kg_t1_estimado: 0.9 },
  obesidad:   { kg_total_min: 5.0,  kg_total_max: 9.0,  kg_sem_min: 0.22, kg_sem_max: 0.31, kg_t1_estimado: 0.5 },
} as const;

// ===========================================================================
// HELPERS INTERNOS
// ===========================================================================

/**
 * Clasifica el IMC pregestacional según los puntos de corte de la OMS.
 *
 * @source WHO. Obesity: preventing and managing the global epidemic. 2000.
 */
const clasificarIMCPregestacional = (imc: number): IMCPregestacional => {
  if (imc < 18.5) return 'bajo_peso';
  if (imc < 25.0) return 'normal';
  if (imc < 30.0) return 'sobrepeso';
  return 'obesidad';
};

/** Redondea a `decimales` cifras significativas */
const redondear = (valor: number, decimales: number): number =>
  Math.round(valor * 10 ** decimales) / 10 ** decimales;

/**
 * Valida que un valor numérico esté dentro de un rango, lanzando RangeError
 * con un mensaje descriptivo si no lo está.
 */
const validarRango = (
  valor: number,
  campo: string,
  min: number,
  max: number,
): void => {
  if (!Number.isFinite(valor) || valor < min || valor > max) {
    throw new RangeError(
      `[NUTRIA/useEmbarazo] ${campo} = ${valor} fuera del rango clínico [${min}, ${max}]`,
    );
  }
};

// ===========================================================================
// 1. calcularAdicionCalorica
// ===========================================================================

/**
 * Calcula las kilocalorías adicionales por trimestre de embarazo o estado de
 * lactancia y las suma al GET basal de la paciente.
 *
 * Lógica de prioridad:
 *   - Si se proporciona `trimestre`, se usa la tabla de embarazo (IOM 2002).
 *   - Si no hay trimestre pero sí `estado_lactancia`, se usa la tabla de lactancia.
 *   - Si ninguno se proporciona, la adición es 0 y se devuelve el GET base intacto.
 *
 * @source IOM. Dietary Reference Intakes for Energy. 2002. Table 5-14.
 * @source IOM. DRI for Energy. 2005. p.363.
 *
 * @throws {RangeError} Si get_base_kcal está fuera del rango fisiológico.
 */
export const calcularAdicionCalorica = (
  params: ParametrosAdicionCalorica,
): ResultadoAdicionCalorica => {
  const { get_base_kcal, trimestre, estado_lactancia } = params;

  validarRango(get_base_kcal, 'get_base_kcal', 500, 6000);

  let adicion_kcal = 0;
  let justificacion = '';
  let fuente = '';

  if (trimestre !== undefined) {
    adicion_kcal = ADICION_TRIMESTRE_KCAL[trimestre];
    const nombres: Record<typeof trimestre, string> = {
      primero: 'Primer trimestre',
      segundo: 'Segundo trimestre',
      tercero: 'Tercer trimestre',
    };
    justificacion =
      trimestre === 'primero'
        ? `${nombres[trimestre]}: sin adición calórica. El requerimiento adicional (≈85 kcal/día) queda cubierto por la reducción espontánea de actividad física.`
        : `${nombres[trimestre]}: +${adicion_kcal} kcal/día sobre el GET basal según IOM 2002.`;
    fuente =
      'IOM. Dietary Reference Intakes for Energy, Carbohydrate, Fiber, Fat, Fatty Acids, Cholesterol, Protein, and Amino Acids. National Academies Press. 2002. Table 5-14.';
  } else if (estado_lactancia !== undefined && estado_lactancia !== 'no_lactando') {
    adicion_kcal = ADICION_LACTANCIA_KCAL[estado_lactancia];
    const descripcion =
      estado_lactancia === 'exclusiva' ? 'Lactancia exclusiva' : 'Lactancia parcial';
    justificacion = `${descripcion}: +${adicion_kcal} kcal/día sobre el GET basal. La producción de leche materna incrementa el gasto energético total.`;
    fuente =
      'IOM. Dietary Reference Intakes for Energy. National Academies Press. 2005. p.363.';
  } else {
    justificacion =
      estado_lactancia === 'no_lactando'
        ? 'Sin lactancia activa: no se requiere adición calórica por este concepto.'
        : 'No se especificó trimestre ni estado de lactancia: adición calórica = 0 kcal.';
    fuente =
      'IOM. Dietary Reference Intakes for Energy. National Academies Press. 2005.';
  }

  const get_total_kcal = redondear(get_base_kcal + adicion_kcal, 1);

  return Object.freeze({
    get_base_kcal: redondear(get_base_kcal, 1),
    adicion_kcal,
    get_total_kcal,
    justificacion,
    fuente_bibliografica: fuente,
  } satisfies ResultadoAdicionCalorica);
};

// ===========================================================================
// 2. calcularGananciaPeso
// ===========================================================================

/**
 * Calcula el rango de ganancia de peso gestacional recomendado según el IMC
 * pregestacional y la semana de gestación actual.
 *
 * Estimación de ganancia acumulada a la semana actual:
 *   - Semanas 1-13 (T1): ganancia estimada fija según categoría IOM.
 *   - Semanas 14-40 (T2/T3): ganancia T1 + (semanas sobre 13) × tasa_media_semanal
 *   - La tasa media semanal = (kg_sem_min + kg_sem_max) / 2
 *
 * @source IOM. Weight Gain During Pregnancy: Reexamining the Guidelines. 2009. Table 1.
 *
 * @throws {RangeError} Si imc_pregestacional o semana_gestacion están fuera de rango.
 */
export const calcularGananciaPeso = (
  params: ParametrosGananciaPeso,
): ResultadoGananciaPeso => {
  const { imc_pregestacional, semana_gestacion } = params;

  validarRango(imc_pregestacional, 'imc_pregestacional', 10, 70);
  validarRango(semana_gestacion, 'semana_gestacion', 1, 40);

  const clasificacion = clasificarIMCPregestacional(imc_pregestacional);
  const fila = TABLA_GANANCIA_PESO_IOM[clasificacion];

  const tasa_media = redondear((fila.kg_sem_min + fila.kg_sem_max) / 2, 3);

  // Ganancia acumulada estimada para la semana actual
  let ganancia_actual_recomendada_kg: number;
  if (semana_gestacion <= 13) {
    // Primer trimestre: interpolación lineal sobre la ganancia T1 estimada
    ganancia_actual_recomendada_kg = redondear(
      (fila.kg_t1_estimado / 13) * semana_gestacion,
      1,
    );
  } else {
    // T2/T3: ganancia T1 + semanas adicionales × tasa media
    const semanas_pos_t1 = semana_gestacion - 13;
    ganancia_actual_recomendada_kg = redondear(
      fila.kg_t1_estimado + semanas_pos_t1 * tasa_media,
      1,
    );
  }

  return Object.freeze({
    clasificacion_imc: clasificacion,
    ganancia_total_min_kg: fila.kg_total_min,
    ganancia_total_max_kg: fila.kg_total_max,
    ganancia_actual_recomendada_kg,
    ganancia_por_semana_kg: tasa_media,
    fuente_bibliografica:
      'IOM. Weight Gain During Pregnancy: Reexamining the Guidelines. National Academies Press. 2009. Table 1.',
  } satisfies ResultadoGananciaPeso);
};

// ===========================================================================
// 3. calcularIDRAjustada
// ===========================================================================

/**
 * Devuelve los valores de IDR ajustados para embarazo o lactancia en los
 * micronutrientes de mayor relevancia clínica obstétrica.
 *
 * Los valores corresponden a mujeres adultas (19-30 años) de referencia
 * según el IOM. Para adolescentes o mujeres >30 años los valores difieren
 * marginalmente — en el contexto clínico de NUTRIA se usan estos como base.
 *
 * Nota sobre DHA: El IOM no establece AI/RDA para DHA específicamente.
 * Se usa el valor de la EFSA (200 mg/día en embarazo/lactancia).
 *
 * @source IOM. DRI for Vitamins and Minerals: Iron, Folate, Calcium, Vit D.
 *   National Academies Press. 2001/2011.
 * @source IOM. DRI for Iodine. 2001. p.258.
 * @source EFSA. Scientific Opinion on DHA. EFSA Journal. 2014;12(11):3840.
 * @source IOM. DRI for Protein. 2005. p.664.
 *
 * @throws {RangeError} Si semana_gestacion está fuera de rango cuando se proporciona.
 */
export const calcularIDRAjustada = (
  params: ParametrosIDRAjustada,
): ResultadoIDRAjustada => {
  const { es_lactancia, semana_gestacion, estado_lactancia } = params;

  if (semana_gestacion !== undefined) {
    validarRango(semana_gestacion, 'semana_gestacion', 1, 40);
  }

  // ── Hierro ──────────────────────────────────────────────────────────────────
  // Embarazo: 27 mg/día | Lactancia: 9 mg/día (absorción aumentada por amenorrea)
  // @source IOM DRI Iron. 2001. Table 9-4.
  const hierro_mg = es_lactancia ? 9 : 27;

  // ── Folato ──────────────────────────────────────────────────────────────────
  // Embarazo: 600 mcg DFE/día | Lactancia: 500 mcg DFE/día
  // Crítico en las primeras 28 días postconcepción para prevenir defectos del tubo neural.
  // @source IOM DRI Folate. 1998. p.196.
  const folato_mcg_dfe = es_lactancia ? 500 : 600;

  // ── Calcio ───────────────────────────────────────────────────────────────────
  // Sin cambio respecto a la mujer adulta: 1000 mg/día (la absorción intestinal aumenta)
  // @source IOM DRI Calcium. 2011. Table 1-1.
  const calcio_mg = 1000;

  // ── Vitamina D ───────────────────────────────────────────────────────────────
  // 15 mcg/día (600 UI) — igual en embarazo y lactancia para adultas
  // @source IOM DRI Vitamin D. 2011. Table 1-1.
  const vitamina_d_mcg = 15;

  // ── Yodo ─────────────────────────────────────────────────────────────────────
  // Embarazo: 220 mcg/día | Lactancia: 290 mcg/día
  // @source IOM DRI Iodine. 2001. p.258.
  const yodo_mcg = es_lactancia ? 290 : 220;

  // ── DHA (omega-3) ────────────────────────────────────────────────────────────
  // EFSA: 200 mg DHA/día (además de la AI para adultos de 250 mg/día)
  // @source EFSA. EFSA Journal. 2014;12(11):3840.
  const omega3_dha_mg = 200;

  // ── Proteína adicional ────────────────────────────────────────────────────────
  // T1: +1 g/día | T2/T3: +25 g/día | Lactancia exclusiva: +25 g/día | Parcial: +11 g/día
  // @source IOM. DRI for Macronutrients. 2005. p.664.
  let proteina_adicional_g: number;
  if (es_lactancia) {
    proteina_adicional_g = estado_lactancia === 'parcial' ? 11 : 25;
  } else if (semana_gestacion !== undefined && semana_gestacion <= 13) {
    proteina_adicional_g = 1;
  } else {
    proteina_adicional_g = 25;
  }

  return Object.freeze({
    hierro_mg,
    folato_mcg_dfe,
    calcio_mg,
    vitamina_d_mcg,
    yodo_mcg,
    omega3_dha_mg,
    proteina_adicional_g,
    fuente_bibliografica:
      'IOM. Dietary Reference Intakes for Vitamins and Minerals. National Academies Press. 2001-2011. | EFSA. EFSA Journal. 2014;12(11):3840.',
  } satisfies ResultadoIDRAjustada);
};

// ===========================================================================
// 4. calcularRecomendacionesNauseas
// ===========================================================================

/**
 * Genera recomendaciones dietéticas basadas en evidencia para el manejo de las
 * náuseas y vómito del embarazo (NVE), adaptadas a la intensidad clínica.
 *
 * Las náuseas son más prevalentes en las semanas 6-12 (hiperemesis antes de 16).
 * Las recomendaciones siguen el algoritmo escalonado de la ACOG 2021.
 *
 * @source ACOG Practice Bulletin No. 230. Nausea and Vomiting of Pregnancy. 2021.
 * @source Ebrahimi N et al. J Popul Ther Clin Pharmacol. 2010;17(2):e325-e337.
 *
 * @throws {RangeError} Si semana_gestacion está fuera de rango.
 */
export const calcularRecomendacionesNauseas = (
  params: ParametrosNauseas,
): ResultadoNauseas => {
  const { semana_gestacion, intensidad } = params;

  validarRango(semana_gestacion, 'semana_gestacion', 1, 40);

  const esHiperemesisRiesgo = intensidad === 'severa';

  // ── Fraccionamiento ───────────────────────────────────────────────────────
  const fraccionamiento_comidas =
    intensidad === 'leve' ? 5 : intensidad === 'moderada' ? 6 : 8;

  // ── Recomendaciones generales ──────────────────────────────────────────────
  const recomendaciones_base: string[] = [
    'Consumir porciones pequeñas y frecuentes a lo largo del día.',
    'Preferir alimentos fríos o a temperatura ambiente (el calor intensifica el olor).',
    'Mantener galletas saladas o tostadas en la mesita de noche para consumir antes de levantarse.',
    'Hidratarse con pequeños sorbos de agua o líquidos fríos entre comidas, no durante.',
    'Evitar ayunos prolongados — el estómago vacío empeora las náuseas.',
    'Descansar después de comer en posición semisentada (no recostarse de inmediato).',
  ];

  const recomendaciones_moderadas: string[] = [
    ...recomendaciones_base,
    'Separar sólidos y líquidos: consumir líquidos 30-60 min antes o después de los sólidos.',
    'Considerar jengibre en infusión o cápsulas (250 mg × 4/día) — evidencia moderada de eficacia.',
    'Aumentar la vitamina B6 (piridoxina): 10-25 mg cada 8 horas (consultar con médico).',
  ];

  const recomendaciones_severas: string[] = [
    ...recomendaciones_moderadas,
    'Priorizar la hidratación oral con rehidratantes de bajo sabor o suero de rehidratación.',
    'Si no es posible retener líquidos por más de 24 horas: derivación médica urgente (riesgo de hiperemesis gravidarum).',
    'Registrar la frecuencia de vómitos y pérdida de peso para informar al equipo médico.',
  ];

  const recomendaciones =
    intensidad === 'leve'
      ? recomendaciones_base
      : intensidad === 'moderada'
        ? recomendaciones_moderadas
        : recomendaciones_severas;

  // ── Alimentos recomendados ─────────────────────────────────────────────────
  const alimentos_recomendados: string[] = [
    'Galletas saladas, tostadas o pan blanco',
    'Arroz blanco cocido o papas al vapor',
    'Manzana pelada o pera (sin cáscara)',
    'Plátano maduro',
    'Caldo de pollo desgrasado',
    'Gelatina baja en azúcar',
    'Paletas heladas de fruta natural',
    'Agua de limón fría',
  ];

  if (intensidad !== 'severa') {
    alimentos_recomendados.push('Infusión de jengibre tibia', 'Yogur natural sin azúcar');
  }

  // ── Alimentos a evitar ─────────────────────────────────────────────────────
  const alimentos_evitar: string[] = [
    'Alimentos grasosos o fritos',
    'Comidas muy condimentadas o picantes',
    'Café y bebidas con cafeína',
    'Jugos cítricos concentrados (naranja, toronja) en ayunas',
    'Leche entera caliente',
    'Alimentos con olores fuertes (ajo crudo, cebolla, pescado)',
  ];

  if (intensidad === 'severa') {
    alimentos_evitar.push(
      'Suplementos de hierro en dosis altas (administrar con alimentos o diferir si no se toleran)',
    );
  }

  return Object.freeze({
    recomendaciones: Object.freeze(recomendaciones),
    fraccionamiento_comidas,
    alimentos_recomendados: Object.freeze(alimentos_recomendados),
    alimentos_evitar: Object.freeze(alimentos_evitar),
    requiere_derivacion: esHiperemesisRiesgo,
  } satisfies ResultadoNauseas);
};

// ===========================================================================
// HOOK REACT (wrapper sobre las funciones puras)
// ===========================================================================

/**
 * Hook que expone el motor de cálculo clínico para embarazo y lactancia.
 * No gestiona estado interno — devuelve funciones puras directamente.
 *
 * USO:
 *   const { calcularAdicionCalorica, calcularGananciaPeso } = useEmbarazo();
 */
export const useEmbarazo = () => ({
  calcularAdicionCalorica,
  calcularGananciaPeso,
  calcularIDRAjustada,
  calcularRecomendacionesNauseas,
});