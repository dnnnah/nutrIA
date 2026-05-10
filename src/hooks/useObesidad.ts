/**
 * useObesidad.ts — Motor de Obesidad y Riesgo Cardiovascular
 * Proyecto NUTRIA — Open Source
 *
 * Implementa:
 *   1. Densidad Calórica — clasificación por DC (kcal/g)
 *   2. Índice Aterogénico — CT/HDL con semáforo
 *   3. No-HDL — marcador de lipoproteínas aterogénicas
 *   4. Índice de Conicidad — adiposidad central (Valdez 1991)
 *   5. Framingham Risk Score — Wilson 1998, tablas originales
 *
 * ARQUITECTURA:
 *   - Todas las funciones son PURAS (mismo input → mismo output, sin efectos)
 *   - TypeScript strict — cero `any`
 *   - Tipos centralizados en src/types/obesidad.types.ts
 *   - Cada fórmula tiene su @source bibliográfico documentado
 *   - Inmutabilidad garantizada con `Object.freeze` + `satisfies`
 *
 * @module useObesidad
 */

import type {
  CategoríaRiesgoCVD,
  ClasificaciónDC,
  ClasificaciónIA,
  ClasificaciónIC,
  ClasificaciónNoHDL,
  ParámetrosDensidadCalórica,
  ParámetrosFramingham,
  ParámetrosÍndiceAterogénico,
  ParámetrosÍndiceConicidad,
  ParámetrosNoHDL,
  ResultadoDensidadCalórica,
  ResultadoFramingham,
  ResultadoÍndiceAterogénico,
  ResultadoÍndiceConicidad,
  ResultadoMenuDC,
  ResultadoNoHDL,
} from '../types/obesidad.types';

// ===========================================================================
// HELPERS PRIVADOS
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
// 1. DENSIDAD CALÓRICA
// ===========================================================================

/**
 * Clasifica la densidad calórica de un alimento (kcal/g).
 *
 * Escala:
 *   Muy baja: < 0.6 kcal/g  (frutas y verduras frescas)
 *   Baja:     0.6 – 1.5      (leguminosas cocidas, carnes magras)
 *   Media:    1.5 – 4.0      (pan, cereales, quesos)
 *   Alta:     > 4.0          (aceites, mantequilla, nueces)
 *
 * @source Drewnowski A, Specter SE. Poverty and obesity: the role of energy
 *   density and energy costs. Am J Clin Nutr. 2004;79(1):6-16.
 *   DOI: 10.1093/ajcn/79.1.6
 * @source Rolls BJ. The relationship between dietary energy density and
 *   energy intake. Physiol Behav. 2009;97(5):609-615.
 */
export const calcularDensidadCalórica = (
  params: ParámetrosDensidadCalórica
): ResultadoDensidadCalórica => {
  const { nombre, kcal, gramos } = params;

  validarRango(kcal,   'kcal',   0, 9000);
  validarRango(gramos, 'gramos', 1, 5000);

  const dc_kcal_g = redondear(kcal / gramos, 2);

  let clasificacion: ClasificaciónDC;
  let etiqueta: string;

  if (dc_kcal_g < 0.6) {
    clasificacion = 'muy_baja';
    etiqueta = 'Muy baja';
  } else if (dc_kcal_g <= 1.5) {
    clasificacion = 'baja';
    etiqueta = 'Baja';
  } else if (dc_kcal_g <= 4.0) {
    clasificacion = 'media';
    etiqueta = 'Media';
  } else {
    clasificacion = 'alta';
    etiqueta = 'Alta';
  }

  return Object.freeze({
    nombre,
    dc_kcal_g,
    clasificacion,
    etiqueta,
    fuente_bibliografica:
      'Drewnowski A, Specter SE. Am J Clin Nutr. 2004;79(1):6-16.',
  } satisfies ResultadoDensidadCalórica);
};

/**
 * Calcula la densidad calórica promedio de un menú completo.
 *
 * DC_promedio = Σ(kcal_i) / Σ(gramos_i)
 * Método: proporción ponderada por peso (no media aritmética de DCs).
 */
export const calcularDensidadMenuCompleto = (
  alimentos: ParámetrosDensidadCalórica[]
): ResultadoMenuDC => {
  if (alimentos.length === 0) {
    throw new Error('[NUTRIA] calcularDensidadMenuCompleto: lista de alimentos vacía.');
  }

  const resultados = alimentos.map((a) => calcularDensidadCalórica(a));

  const sum_kcal   = alimentos.reduce((s, a) => s + a.kcal,   0);
  const sum_gramos = alimentos.reduce((s, a) => s + a.gramos, 0);

  // Densidad ponderada por peso — método correcto (Drewnowski 2004)
  const dc_prom = redondear(sum_kcal / sum_gramos, 2);

  // Reutilizar la función de clasificación sobre el "alimento virtual" del total
  const dummy = calcularDensidadCalórica({
    nombre: '_menu',
    kcal:   sum_kcal,
    gramos: sum_gramos,
  });

  return Object.freeze({
    alimentos:              resultados,
    dc_promedio_kcal_g:     dc_prom,
    clasificacion_promedio: dummy.clasificacion,
    etiqueta_promedio:      dummy.etiqueta,
    recomendacion:
      'Priorizar alimentos con DC < 1.5 kcal/g para mayor saciedad y control calórico.',
  } satisfies ResultadoMenuDC);
};

// ===========================================================================
// 2. ÍNDICE ATEROGÉNICO (CT / HDL)
// ===========================================================================

/**
 * Calcula el Índice Aterogénico (CT/HDL) y clasifica el riesgo.
 *
 * Valores de referencia (Castelli 1983):
 *   < 3.5   → Óptimo
 *   3.5–5.0 → Normal / Promedio
 *   5.0–6.0 → Alto
 *   > 6.0   → Muy alto
 *
 * @source Castelli WP, Abbott RD, McNamara PM. Summary estimates of
 *   cholesterol used to predict coronary heart disease.
 *   Circulation. 1983;67(4):730-734.
 *   DOI: 10.1161/01.CIR.67.4.730
 * @source NOM-037-SSA2-2012. Prevención, tratamiento y control de las
 *   dislipidemias. Diario Oficial de la Federación. 2012.
 */
export const calcularÍndiceAterogénico = (
  params: ParámetrosÍndiceAterogénico
): ResultadoÍndiceAterogénico => {
  const { colesterol_total_mg_dL, hdl_mg_dL } = params;

  validarRango(colesterol_total_mg_dL, 'colesterol_total_mg_dL', 50,  500);
  validarRango(hdl_mg_dL,             'hdl_mg_dL',               10,  150);

  const ia = redondear(colesterol_total_mg_dL / hdl_mg_dL, 2);

  let clasificacion: ClasificaciónIA;
  let etiqueta: string;

  if (ia < 3.5) {
    clasificacion = 'optimo';
    etiqueta = 'Óptimo';
  } else if (ia <= 5.0) {
    clasificacion = 'normal';
    etiqueta = 'Normal';
  } else if (ia <= 6.0) {
    clasificacion = 'alto';
    etiqueta = 'Alto';
  } else {
    clasificacion = 'muy_alto';
    etiqueta = 'Muy alto';
  }

  return Object.freeze({
    ia,
    clasificacion,
    etiqueta,
    fuente_bibliografica:
      'Castelli WP et al. Circulation. 1983;67(4):730-734. | NOM-037-SSA2-2012.',
  } satisfies ResultadoÍndiceAterogénico);
};

// ===========================================================================
// 3. NO-HDL
// ===========================================================================

/**
 * Calcula el colesterol No-HDL (CT − HDL).
 *
 * Representan todas las lipoproteínas aterogénicas: VLDL, IDL, LDL, Lp(a).
 * Considerado superior al LDL solo como predictor de riesgo cardiovascular.
 *
 * Clasificación ATP-III / NCEP:
 *   < 130 mg/dL → Óptimo
 *   130–159     → Límite
 *   160–189     → Alto
 *   ≥ 190       → Muy alto
 *
 * @source NCEP Expert Panel. Executive Summary of the Third Report of
 *   the National Cholesterol Education Program (NCEP) Expert Panel on
 *   Detection, Evaluation, and Treatment of High Blood Cholesterol in
 *   Adults (Adult Treatment Panel III). JAMA. 2001;285(19):2486-2497.
 *   DOI: 10.1001/jama.285.19.2486
 */
export const calcularNoHDL = (
  params: ParámetrosNoHDL
): ResultadoNoHDL => {
  const { colesterol_total_mg_dL, hdl_mg_dL } = params;

  validarRango(colesterol_total_mg_dL, 'colesterol_total_mg_dL', 50,  500);
  validarRango(hdl_mg_dL,             'hdl_mg_dL',               10,  150);

  const no_hdl = redondear(colesterol_total_mg_dL - hdl_mg_dL, 1);

  let clasificacion: ClasificaciónNoHDL;
  let etiqueta: string;

  if (no_hdl < 130) {
    clasificacion = 'optimo';
    etiqueta = 'Óptimo';
  } else if (no_hdl < 160) {
    clasificacion = 'limite';
    etiqueta = 'Límite';
  } else if (no_hdl < 190) {
    clasificacion = 'alto';
    etiqueta = 'Alto';
  } else {
    clasificacion = 'muy_alto';
    etiqueta = 'Muy alto';
  }

  return Object.freeze({
    no_hdl_mg_dL: no_hdl,
    clasificacion,
    etiqueta,
    fuente_bibliografica: 'NCEP ATP-III. JAMA. 2001;285(19):2486-2497.',
  } satisfies ResultadoNoHDL);
};

// ===========================================================================
// 4. ÍNDICE DE CONICIDAD
// ===========================================================================

/**
 * Calcula el Índice de Conicidad (IC) para evaluar adiposidad central.
 *
 * Fórmula:
 *   IC = cintura_m / (0.109 × √(peso_kg / talla_m))
 *
 * Puntos de corte (Valdez 1991):
 *   Hombre: > 1.25 → riesgo metabólico elevado
 *   Mujer:  > 1.18 → riesgo metabólico elevado
 *
 * @source Valdez R. A simple model-based index of abdominal adiposity.
 *   J Clin Epidemiol. 1991;44(9):955-956.
 *   DOI: 10.1016/0895-4356(91)90059-I
 * @source Pitanga FJ, Lessa I. Rev Bras Epidemiol. 2005;8(4):360-367.
 */
export const calcularÍndiceConicidad = (
  params: ParámetrosÍndiceConicidad
): ResultadoÍndiceConicidad => {
  const { cintura_cm, peso_kg, talla_cm, sexo } = params;

  validarRango(cintura_cm, 'cintura_cm',  40,  200);
  validarRango(peso_kg,    'peso_kg',     20,  300);
  validarRango(talla_cm,  'talla_cm',   100,  250);

  const cintura_m = cintura_cm / 100;
  const talla_m   = talla_cm   / 100;

  const denominador = 0.109 * Math.sqrt(peso_kg / talla_m);
  const ic = redondear(cintura_m / denominador, 3);

  const punto_corte: number = sexo === 'masculino' ? 1.25 : 1.18;
  const clasificacion: ClasificaciónIC = ic > punto_corte ? 'riesgo' : 'normal';
  const etiqueta = clasificacion === 'riesgo'
    ? 'Riesgo metabólico elevado'
    : 'Normal';

  return Object.freeze({
    ic,
    clasificacion,
    etiqueta,
    punto_corte_sexo:    punto_corte,
    fuente_bibliografica: 'Valdez R. J Clin Epidemiol. 1991;44(9):955-956.',
  } satisfies ResultadoÍndiceConicidad);
};

// ===========================================================================
// 5. FRAMINGHAM RISK SCORE — Wilson 1998
// ===========================================================================

// Alias de tipos para las tuplas de tabla — mejoran legibilidad
type TablaRango3 = ReadonlyArray<readonly [number, number, number]>;
type TablaRango4 = ReadonlyArray<readonly [number, number, number, number]>;

// ── Puntos por Edad ─────────────────────────────────────────────────────────

const PUNTOS_EDAD_H: TablaRango3 = [
  [30, 34, -1], [35, 39,  0], [40, 44,  1],
  [45, 49,  2], [50, 54,  3], [55, 59,  4],
  [60, 64,  5], [65, 69,  6], [70, 74,  7],
] as const;

const PUNTOS_EDAD_M: TablaRango3 = [
  [30, 34, -9], [35, 39, -4], [40, 44,  0],
  [45, 49,  3], [50, 54,  6], [55, 59,  7],
  [60, 64,  8], [65, 69,  8], [70, 74,  8],
] as const;

// ── Puntos por Colesterol Total ────────────────────────────────────────────

const PUNTOS_CT_H: TablaRango3 = [
  [   0, 159, -3], [160, 199,  0], [200, 239,  1],
  [ 240, 279,  2], [280, 999,  3],
] as const;

const PUNTOS_CT_M: TablaRango3 = [
  [   0, 159, -2], [160, 199,  0], [200, 239,  1],
  [ 240, 279,  1], [280, 999,  3],
] as const;

// ── Puntos por HDL ─────────────────────────────────────────────────────────

const PUNTOS_HDL_H: TablaRango3 = [
  [  0,  34,  2], [35,  44,  1], [45,  49,  0],
  [ 50,  59,  0], [60, 999, -2],
] as const;

const PUNTOS_HDL_M: TablaRango3 = [
  [  0,  34,  5], [35,  44,  2], [45,  49,  1],
  [ 50,  59,  0], [60, 999, -3],
] as const;

// ── Puntos por Presión Sistólica [min, max, sinTto, conTto] ───────────────

const PUNTOS_PA_H: TablaRango4 = [
  [   0, 119,  0,  0], [120, 129,  0,  2],
  [ 130, 139,  1,  2], [140, 159,  2,  3],
  [ 160, 999,  3,  3],
] as const;

const PUNTOS_PA_M: TablaRango4 = [
  [   0, 119, -3,  0], [120, 129,  0,  3],
  [ 130, 139,  0,  3], [140, 159,  2,  5],
  [ 160, 999,  3,  6],
] as const;

// ── Tabaquismo (puntos fijos) ──────────────────────────────────────────────

const PUNTOS_TABACO_H = 2 as const;
const PUNTOS_TABACO_M = 2 as const;

// ── Tabla puntos → % riesgo a 10 años (Wilson 1998 Table 2 & 3) ──────────

const RIESGO_H: ReadonlyMap<number, number> = new Map([
  [-3,  1], [-2,  2], [-1,  2], [ 0,  3],
  [ 1,  4], [ 2,  4], [ 3,  6], [ 4,  7],
  [ 5,  9], [ 6, 11], [ 7, 14], [ 8, 18],
  [ 9, 22], [10, 27], [11, 33], [12, 40], [13, 47],
]);

const RIESGO_M: ReadonlyMap<number, number> = new Map([
  [-2,  1], [-1,  2], [ 0,  2],
  [ 1,  2], [ 2,  3], [ 3,  3],
  [ 4,  4], [ 5,  5], [ 6,  6],
  [ 7,  7], [ 8,  8], [ 9, 11],
  [10, 14], [11, 18], [12, 24], [13, 30],
]);

// ── Helpers de búsqueda — TypeScript strict-safe ───────────────────────────

/**
 * Busca puntos en tabla de 3 columnas [min, max, puntos].
 *
 * Diseño de seguridad en dos capas:
 *   1. Runtime: `validarRango()` garantiza que `valor` siempre cae dentro
 *      del rango fisiológico cubierto por las tablas.
 *   2. Compilación: la non-null assertion sobre `ultima` está justificada
 *      porque todas las tablas son constantes de módulo no vacías.
 */
const buscarRango3 = (tabla: TablaRango3, valor: number): number => {
  for (const fila of tabla) {
    if (valor >= fila[0] && valor <= fila[1]) return fila[2];
  }
  // Extrapolación conservadora al último intervalo.
  // Las tablas son constantes de módulo con longitud conocida ≥ 1.
  // Usamos tabla.length - 1 en lugar de .at(-1) para compatibilidad con ES2020.
  const ultimaIdx = tabla.length - 1;
  const ultima = tabla[ultimaIdx];
  if (ultima === undefined) {
    throw new Error('[NUTRIA] buscarRango3: tabla vacía — error de configuración.');
  }
  return ultima[2];
};

/**
 * Busca puntos en tabla de 4 columnas [min, max, sinTto, conTto].
 * Selecciona la columna según `conTratamiento`.
 */
const buscarRango4 = (
  tabla: TablaRango4,
  valor: number,
  conTratamiento: boolean
): number => {
  for (const fila of tabla) {
    if (valor >= fila[0] && valor <= fila[1]) {
      return conTratamiento ? fila[3] : fila[2];
    }
  }
  const ultimaIdx = tabla.length - 1;
  const ultima = tabla[ultimaIdx];
  if (ultima === undefined) {
    throw new Error('[NUTRIA] buscarRango4: tabla vacía — error de configuración.');
  }
  return conTratamiento ? ultima[3] : ultima[2];
};

/**
 * Resuelve el % de riesgo clampando puntos al rango cubierto por la tabla.
 */
const resolverRiesgoPct = (
  mapa: ReadonlyMap<number, number>,
  puntos: number
): number => {
  const claves = [...mapa.keys()];
  const minClave = Math.min(...claves);
  const maxClave = Math.max(...claves);
  const puntosClamped = Math.max(minClave, Math.min(maxClave, puntos));
  return mapa.get(puntosClamped) ?? 1;
};

/**
 * Calcula el Framingham Risk Score (Wilson 1998).
 *
 * Estima el riesgo de enfermedad coronaria (angina, IM, muerte coronaria)
 * a 10 años en adultos sin enfermedad cardiovascular previa.
 *
 * Categorías:
 *   Bajo:        < 10 %
 *   Intermedio:  10 – 19 %
 *   Alto:        ≥ 20 %
 *
 * Rango de edad validado: 30–74 años.
 *
 * @source Wilson PWF, D'Agostino RB, Levy D, Belanger AM, Silbershatz H,
 *   Kannel WB. Prediction of Coronary Heart Disease Using Risk Factor
 *   Categories. Circulation. 1998;97(18):1837-1847.
 *   DOI: 10.1161/01.CIR.97.18.1837
 */
export const calcularFramingham = (
  params: ParámetrosFramingham
): ResultadoFramingham => {
  const {
    sexo,
    edad_anios,
    colesterol_total_mg_dL,
    hdl_mg_dL,
    presion_sistolica_mmHg,
    fumador_activo,
    bajo_tratamiento_antihipertensivo,
  } = params;

  validarRango(edad_anios,             'edad_anios',              30,  74);
  validarRango(colesterol_total_mg_dL, 'colesterol_total_mg_dL',  50, 500);
  validarRango(hdl_mg_dL,             'hdl_mg_dL',               10, 150);
  validarRango(presion_sistolica_mmHg,'presion_sistolica_mmHg',  70, 220);

  const esHombre = sexo === 'masculino';

  const pts_edad   = buscarRango3(esHombre ? PUNTOS_EDAD_H : PUNTOS_EDAD_M, edad_anios);
  const pts_ct     = buscarRango3(esHombre ? PUNTOS_CT_H   : PUNTOS_CT_M,   colesterol_total_mg_dL);
  const pts_hdl    = buscarRango3(esHombre ? PUNTOS_HDL_H  : PUNTOS_HDL_M,  hdl_mg_dL);
  const pts_pa     = buscarRango4(
    esHombre ? PUNTOS_PA_H : PUNTOS_PA_M,
    presion_sistolica_mmHg,
    bajo_tratamiento_antihipertensivo
  );
  const pts_tabaco = fumador_activo
    ? (esHombre ? PUNTOS_TABACO_H : PUNTOS_TABACO_M)
    : 0;

  const puntos_totales = pts_edad + pts_ct + pts_hdl + pts_pa + pts_tabaco;
  const riesgo_pct     = resolverRiesgoPct(esHombre ? RIESGO_H : RIESGO_M, puntos_totales);

  let categoria: CategoríaRiesgoCVD;
  let etiqueta: string;
  let interpretacion: string;

  if (riesgo_pct < 10) {
    categoria      = 'bajo';
    etiqueta       = 'Riesgo bajo';
    interpretacion = 'Riesgo a 10 años < 10 %. Mantener hábitos saludables y control periódico de factores de riesgo.';
  } else if (riesgo_pct < 20) {
    categoria      = 'intermedio';
    etiqueta       = 'Riesgo intermedio';
    interpretacion = 'Riesgo a 10 años 10–19 %. Indicado estilo de vida terapéutico intensivo. Considerar farmacoterapia según juicio clínico.';
  } else {
    categoria      = 'alto';
    etiqueta       = 'Riesgo alto';
    interpretacion = 'Riesgo a 10 años ≥ 20 %. Intervención farmacológica generalmente indicada. Manejo multidisciplinario recomendado.';
  }

  return Object.freeze({
    puntos_obtenidos:       puntos_totales,
    riesgo_10_anios_pct:    riesgo_pct,
    categoria,
    etiqueta,
    interpretacion_clinica: interpretacion,
    fuente_bibliografica:   'Wilson PWF et al. Circulation. 1998;97(18):1837-1847.',
  } satisfies ResultadoFramingham);
};

// ===========================================================================
// HOOK REACT (wrapper sobre funciones puras)
// ===========================================================================

/**
 * Hook que expone el motor de evaluación de obesidad y riesgo cardiovascular.
 * No gestiona estado interno — devuelve funciones puras directamente.
 *
 * USO:
 *   const { calcularFramingham, calcularÍndiceAterogénico } = useObesidad();
 */
export const useObesidad = () => ({
  calcularDensidadCalórica,
  calcularDensidadMenuCompleto,
  calcularÍndiceAterogénico,
  calcularNoHDL,
  calcularÍndiceConicidad,
  calcularFramingham,
});