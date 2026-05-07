/**
 * useBiochemistry.ts — Motor de Bioquímica Clínica
 * Proyecto NUTRIA — Open Source
 *
 * Implementa:
 *   1. HOMA-IR — Resistencia a la insulina
 *   2. CKD-EPI 2021 — Filtrado Glomerular Estimado (sin factor raza)
 *   3. Balance Nitrogenado — Estado anabólico/catabólico
 *   4. evaluarSemáforo — Clasificador universal de valores de laboratorio
 *   5. clasificarAlbuminuria — Categorías KDIGO 2024
 *
 * @module useBiochemistry
 */

import {
  type CategoríaAlbuminuria,
  type ClasificaciónHOMA,
  type EstadoBN,
  type EstadioERC,
  type ParámetrosBN,
  type ParámetrosCKDEPI,
  type ParámetrosHOMA,
  type ParámetrosSemáforo,
  type ResultadoBN,
  type ResultadoCKDEPI,
  type ResultadoHOMA,
  type ResultadoSemáforo,
  type SemáforoLab,
} from '../types/biochemistry.types';

// ===========================================================================
// HELPERS PRIVADOS
// ===========================================================================

const validarRango = (
  valor: number,
  campo: string,
  min:   number,
  max:   number
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
// 1. HOMA-IR
// ===========================================================================

/**
 * Calcula HOMA-IR y clasifica la resistencia a la insulina.
 *
 * Fórmula: HOMA-IR = (Glucosa_mg/dL × Insulina_uIU/mL) / 405
 *
 * Clasificación:
 *   < 2.5   → Normal
 *   2.5–3.5 → Resistencia leve
 *   > 3.5   → Resistencia significativa
 *
 * @source Matthews DR, Hosker JP, Rudenski AS, Naylor BA, Treacher DF,
 *   Turner RC. Homeostasis model assessment: insulin resistance and
 *   beta-cell function from fasting plasma glucose and insulin
 *   concentrations in man. Diabetologia. 1985;28(7):412-419.
 *   DOI: 10.1007/BF00280883
 *
 * Advertencia: No válido en DM1, uso de insulina exógena, insuficiencia
 * hepática grave o hemoglobinopatías. Requiere ayuno mínimo de 8h.
 */
export const calcularHOMA_IR = (params: ParámetrosHOMA): ResultadoHOMA => {
  const { glucosa_ayuno_mg_dL, insulina_ayuno_uIU_mL } = params;

  validarRango(glucosa_ayuno_mg_dL,   'glucosa_ayuno_mg_dL',   40,  600);
  validarRango(insulina_ayuno_uIU_mL, 'insulina_ayuno_uIU_mL', 0.5, 300);

  const homa_ir = redondear(
    (glucosa_ayuno_mg_dL * insulina_ayuno_uIU_mL) / 405,
    2
  );

  let clasificacion: ClasificaciónHOMA;
  if (homa_ir < 2.5)       clasificacion = 'normal';
  else if (homa_ir <= 3.5) clasificacion = 'resistencia_leve';
  else                     clasificacion = 'resistencia_sig';

  return Object.freeze({
    homa_ir,
    clasificacion,
    glucosa_mg_dL:        glucosa_ayuno_mg_dL,
    insulina_uIU_mL:      insulina_ayuno_uIU_mL,
    fuente_bibliografica: 'Matthews DR et al. Diabetologia. 1985;28(7):412-419.',
  } satisfies ResultadoHOMA);
};

// ===========================================================================
// 2. CKD-EPI 2021
// ===========================================================================

/**
 * Tabla de estadios ERC con TFG y descripción.
 * @source KDIGO 2024 Clinical Practice Guidelines for CKD.
 */
// Ordenada de mayor a menor — se busca el primer estadio donde tfg >= tfg_min
// Esto evita huecos por redondeo decimal (ej: TFG=59.4 entre G2 y G3a)
const ESTADIOS_ERC: Array<{
  estadio:     EstadioERC;
  tfg_min:     number;
  descripcion: string;
}> = [
  { estadio: 'G1',  tfg_min: 90,  descripcion: 'Normal o alta — ERC si hay marcadores de daño' },
  { estadio: 'G2',  tfg_min: 60,  descripcion: 'Ligeramente disminuida' },
  { estadio: 'G3a', tfg_min: 45,  descripcion: 'Leve a moderadamente disminuida' },
  { estadio: 'G3b', tfg_min: 30,  descripcion: 'Moderada a severamente disminuida' },
  { estadio: 'G4',  tfg_min: 15,  descripcion: 'Severamente disminuida — preparar TRS' },
  { estadio: 'G5',  tfg_min: 0,   descripcion: 'Falla renal — diálisis / trasplante' },
] as const;

/**
 * Calcula el Filtrado Glomerular Estimado — CKD-EPI 2021 (sin factor raza).
 *
 * Ecuación CKD-EPI 2021:
 *   κ (kappa): 0.7 mujeres / 0.9 hombres
 *   α (alpha): −0.241 mujeres / −0.302 hombres
 *
 *   TFG = 142 × (Cr/κ)^exp × (0.9938)^edad × [× 1.012 si mujer]
 *
 *   Donde exp = α si Cr ≤ κ, o −1.200 si Cr > κ
 *
 * @source Inker LA, Eneanya ND, Coresh J, et al. New Creatinine- and
 *   Cystatin C-Based Equations to Estimate GFR without Race.
 *   N Engl J Med. 2021;385(19):1737-1749.
 *   DOI: 10.1056/NEJMoa2102953
 *
 * Advertencia: Puede subestimar daño renal en sarcopenia o sobreestimar
 * en culturistas. Para mayor precisión, combinar con cistatina C.
 */
export const calcularCKDEPI = (params: ParámetrosCKDEPI): ResultadoCKDEPI => {
  const { creatinina_serica_mg_dL, edad_anios, sexo } = params;

  validarRango(creatinina_serica_mg_dL, 'creatinina_serica_mg_dL', 0.1, 20);
  validarRango(edad_anios,              'edad_anios',               18,  120);

  const Cr        = creatinina_serica_mg_dL;
  const kappa     = sexo === 'femenino' ? 0.7    : 0.9;
  const alpha     = sexo === 'femenino' ? -0.241 : -0.302;
  const mult_sexo = sexo === 'femenino' ? 1.012  : 1.0;
  const exp_cr    = Cr <= kappa ? alpha : -1.200;

  const tfg_raw =
    142 *
    Math.pow(Cr / kappa, exp_cr) *
    Math.pow(0.9938, edad_anios) *
    mult_sexo;

  const tfg  = redondear(tfg_raw, 1);

  const fila = ESTADIOS_ERC.find((r) => tfg >= r.tfg_min);

  if (fila === undefined) {
    throw new RangeError(`[NUTRIA] TFG ${tfg} sin estadio — revisar tabla ERC`);
  }

  return Object.freeze({
    tfg_mL_min_1_73m2:    tfg,
    estadio_erc:          fila.estadio,
    descripcion_estadio:  fila.descripcion,
    fuente_bibliografica: 'Inker LA et al. N Engl J Med. 2021;385(19):1737-1749.',
  } satisfies ResultadoCKDEPI);
};

// ===========================================================================
// 3. BALANCE NITROGENADO
// ===========================================================================

/**
 * Calcula el Balance Nitrogenado (BN) en g N/día.
 *
 * Fórmula:
 *   N_ingerido = Proteína_g / 6.25
 *   N_perdido  = NUU_g + 4        (4g = pérdidas insensibles: heces, piel, sudor)
 *   BN         = N_ingerido − N_perdido
 *
 * Interpretación:
 *   BN > +1 → Anabolismo
 *   −1 a +1 → Equilibrio
 *   BN < −1 → Catabolismo
 *
 * @source Bistrian BR. Nutritional assessment and therapy of protein-calorie
 *   malnutrition in the hospital. J Am Diet Assoc. 1977;71(4):393-397.
 * @source ASPEN Clinical Guidelines. JPEN. 2016;40(2):159-211.
 *
 * Advertencia: No válido en ERC (NUU subestima pérdidas totales de N).
 * Requiere recolección precisa de orina de 24h y proteína dietética medida.
 */
export const calcularBalanceNitrogenado = (params: ParámetrosBN): ResultadoBN => {
  const { proteina_consumida_g, nuu_g } = params;

  validarRango(proteina_consumida_g, 'proteina_consumida_g', 0,  500);
  validarRango(nuu_g,                'nuu_g',                0,  80);

  const nitrogeno_ingerido = redondear(proteina_consumida_g / 6.25, 2);
  const nitrogeno_perdido  = redondear(nuu_g + 4, 2);
  const bn_g_dia           = redondear(nitrogeno_ingerido - nitrogeno_perdido, 2);

  let estado: EstadoBN;
  if (bn_g_dia > 1)        estado = 'anabolismo';
  else if (bn_g_dia >= -1) estado = 'equilibrio';
  else                     estado = 'catabolismo';

  return Object.freeze({
    bn_g_dia,
    estado,
    nitrogeno_ingerido,
    nitrogeno_perdido,
    fuente_bibliografica:
      'Bistrian BR. J Am Diet Assoc. 1977;71(4):393-397. / ASPEN 2016.',
  } satisfies ResultadoBN);
};

// ===========================================================================
// 4. SEMÁFORO DE LABORATORIO
// ===========================================================================

/**
 * Evalúa un valor de laboratorio y devuelve su estado semáforo.
 *
 * Prioridad de evaluación:
 *   1. Rango crítico (critico_bajo / critico_alto) — si se proporciona
 *   2. Rango normal (bajo / normal / alto)
 *
 * null en min/max = sin límite en esa dirección.
 *
 * Esta función es el corazón del sistema de alertas de NUTRIA.
 * Se combina con lab_references.json para evaluar cualquier parámetro
 * bioquímico sin duplicar lógica en los componentes.
 */
export const evaluarSemáforo = (
  params: ParámetrosSemáforo
): ResultadoSemáforo => {
  const { valor, rango_normal, rango_critico } = params;

  if (!Number.isFinite(valor)) {
    throw new TypeError(
      `[NUTRIA] evaluarSemáforo: valor no es un número finito (${valor})`
    );
  }

  // Paso 1: Rango crítico (prioridad máxima)
  if (rango_critico !== undefined) {
    const { min: crit_min, max: crit_max } = rango_critico;
    if (crit_min !== null && valor < crit_min) {
      return Object.freeze({ valor, estado: 'critico_bajo' } satisfies ResultadoSemáforo);
    }
    if (crit_max !== null && valor > crit_max) {
      return Object.freeze({ valor, estado: 'critico_alto' } satisfies ResultadoSemáforo);
    }
  }

  // Paso 2: Rango normal
  const { min: norm_min, max: norm_max } = rango_normal;
  const bajo = norm_min !== null && valor < norm_min;
  const alto = norm_max !== null && valor > norm_max;

  const estado: SemáforoLab = bajo ? 'bajo' : alto ? 'alto' : 'normal';

  return Object.freeze({ valor, estado } satisfies ResultadoSemáforo);
};

// ===========================================================================
// 5. ALBUMINURIA — KDIGO 2024
// ===========================================================================

/**
 * Clasifica la albuminuria según categorías KDIGO 2024.
 * Complementa el estadio ERC para estratificación de riesgo compuesta.
 *
 * @source KDIGO 2024 Clinical Practice Guidelines for the Evaluation
 *   and Management of Chronic Kidney Disease.
 */
export const clasificarAlbuminuria = (
  albumina_creatinina_ratio_mg_g: number
): CategoríaAlbuminuria => {
  validarRango(albumina_creatinina_ratio_mg_g, 'albumina_creatinina_ratio_mg_g', 0, 10000);

  if (albumina_creatinina_ratio_mg_g < 30)   return 'A1';
  if (albumina_creatinina_ratio_mg_g <= 300)  return 'A2';
  return 'A3';
};

// ===========================================================================
// HOOK REACT
// ===========================================================================

export const useBiochemistry = () => ({
  calcularHOMA_IR,
  calcularCKDEPI,
  calcularBalanceNitrogenado,
  evaluarSemáforo,
  clasificarAlbuminuria,
});