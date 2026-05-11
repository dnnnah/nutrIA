/**
 * useHidratacion.ts — Motor de Cálculo de Requerimiento Hídrico
 * Proyecto NUTRIA — Open Source
 *
 * Implementa:
 *   1. Hidratación por peso corporal (35 ml/kg — adulto; con ajuste etario)
 *   2. Hidratación por Gasto Energético Total (1 ml/kcal)
 *   3. Hidratación por edad (factor variable según rango etario)
 *   4. Tasa de sudoración post-ejercicio (ACSM)
 *   5. Ajuste por factores clínicos (fiebre, vómito, diarrea, etc.)
 *
 * ARQUITECTURA:
 *   - Funciones PURAS: mismo input → mismo output, sin efectos secundarios
 *   - Sin `any`, sin `as Type` sin guardia, sin mutaciones
 *   - Nombres de variables en español clínico
 *   - Cada fórmula con @source bibliográfico
 *
 * @module useHidratacion
 *
 * @source Holliday MA, Segar WE. (1957). Pediatrics, 19(5):823-832.        (Base 35 ml/kg)
 * @source Sawka MN et al. (ACSM Position Stand). Med Sci Sports Exerc.     (Tasa sudoración)
 *   2007;39(2):377-390.
 * @source DuBois EF. (1921). Arch Intern Med, 27(2):259.                   (Fiebre +13%/°C)
 * @source Institute of Medicine. Dietary Reference Intakes for Water.       (1 ml/kcal)
 *   National Academies Press. 2005.
 * @source Popkin BM, D'Anci KE, Rosenberg IH. (2010). Nutr Rev, 68(8):439-458.
 *   (Ajuste adulto mayor 30 ml/kg)
 */

// ===========================================================================
// TIPOS DE DOMINIO — importados desde hydration.types.ts (fuente canónica)
// ===========================================================================

import type {
  MétodoHidratación,
  ParámetrosPorPeso,
  ParámetrosPorGET,
  ParámetrosPorEdad,
  ParámetrosTasaSudoración,
  FactoresClínicos,
  ResultadoHidratación,
  ResultadoAjusteClínico,
  DetalleIncremento,
  ResultadoTasaSudoración,
} from '../types/hydration.types';

// Re-exportar para que tests e importadores del hook no necesiten
// conocer la ruta del archivo de tipos directamente.
export type {
  MétodoHidratación,
  ParámetrosPorPeso,
  ParámetrosPorGET,
  ParámetrosPorEdad,
  ParámetrosTasaSudoración,
  FactoresClínicos,
  ResultadoHidratación,
  ResultadoAjusteClínico,
  DetalleIncremento,
  ResultadoTasaSudoración,
};

// ===========================================================================
// CONSTANTES INTERNAS
// ===========================================================================

/**
 * Multiplicadores de hidratación por rango de edad (ml/kg/día).
 *
 * @source Chernoff R. (1994). J Am Diet Assoc, 94(8):878-882.
 * @source IOM. Dietary Reference Intakes for Water. National Academies Press. 2005.
 */
const MULTIPLICADORES_POR_EDAD: ReadonlyArray<{
  edad_min: number;
  edad_max: number;
  ml_por_kg: number;
  descripción: string;
}> = [
  { edad_min:  0, edad_max: 30, ml_por_kg: 40, descripción: '< 30 años — alta actividad metabólica' },
  { edad_min: 31, edad_max: 55, ml_por_kg: 35, descripción: '31–55 años — adulto activo' },
  { edad_min: 56, edad_max: 65, ml_por_kg: 30, descripción: '56–65 años — adulto mayor joven' },
  { edad_min: 66, edad_max: Infinity, ml_por_kg: 25, descripción: '> 65 años — adulto mayor; menor sensación de sed' },
] as const;

/**
 * Incremento por vómito y diarrea (ml por evento/día combinado).
 *
 * @source Maughan RJ, Shirreffs SM. (1997). J Sports Sci, 15(3):291-303.
 * @source ESPEN Guidelines on Clinical Nutrition. 2017.
 */
const INCREMENTO_VÓMITO_ML = 500;
const INCREMENTO_DIARREA_ML = 500;

/**
 * Incremento por actividad física intensa (ml/día).
 * Estimación conservadora sin medición de pérdidas.
 *
 * @source ACSM. Position Stand on Exercise and Fluid Replacement. 2007.
 */
const INCREMENTO_ACTIVIDAD_ML = 500;

/**
 * Incremento por clima caluroso (ml/día).
 *
 * @source Sawka MN et al. Med Sci Sports Exerc. 2007;39(2):377-390.
 */
const INCREMENTO_CALOR_ML = 500;

// ===========================================================================
// VALIDADORES INTERNOS
// ===========================================================================

/**
 * Valida que el peso esté dentro de un rango fisiológico razonable.
 * Límite inferior: 1 kg (neonato mínimo). Superior: 400 kg.
 */
function validarPeso(peso_kg: number): void {
  if (!Number.isFinite(peso_kg) || peso_kg <= 0) {
    throw new RangeError(
      `peso_kg debe ser un número positivo. Recibido: ${peso_kg}`
    );
  }
  if (peso_kg < 1 || peso_kg > 400) {
    throw new RangeError(
      `peso_kg fuera de rango fisiológico [1, 400] kg. Recibido: ${peso_kg}`
    );
  }
}

function validarGET(get_kcal: number): void {
  if (!Number.isFinite(get_kcal) || get_kcal <= 0) {
    throw new RangeError(
      `get_kcal debe ser un número positivo. Recibido: ${get_kcal}`
    );
  }
}

function validarEdad(edad_anios: number): void {
  if (!Number.isFinite(edad_anios) || edad_anios < 0 || edad_anios > 120) {
    throw new RangeError(
      `edad_anios fuera de rango [0, 120]. Recibido: ${edad_anios}`
    );
  }
}

function validarTiempo(duración_min: number): void {
  if (!Number.isFinite(duración_min) || duración_min <= 0) {
    throw new RangeError(
      `duración_min debe ser un número positivo. Recibido: ${duración_min}`
    );
  }
}

// ===========================================================================
// UTILIDADES INTERNAS
// ===========================================================================

/**
 * Construye un ResultadoHidratación desde un volumen en ml.
 */
function construirResultado(
  volumen_ml: number,
  método: MétodoHidratación,
  multiplicador_ml_kg: number | null,
  fuente_bibliográfica: string
): ResultadoHidratación {
  const redondeado = Math.round(volumen_ml);
  return {
    volumen_ml:           redondeado,
    volumen_litros:       parseFloat((redondeado / 1000).toFixed(2)),
    vasos_240ml:          Math.round(redondeado / 240),
    método,
    multiplicador_ml_kg,
    fuente_bibliográfica,
  };
}

// ===========================================================================
// FÓRMULAS PRINCIPALES (FUNCIONES PURAS EXPORTADAS)
// ===========================================================================

/**
 * Hidratación por peso corporal.
 *
 * Adulto (< 65 años): 35 ml/kg/día
 * Adulto mayor (≥ 65 años): 30 ml/kg/día
 *
 * @source Holliday MA, Segar WE. (1957). Pediatrics, 19(5):823-832.
 * @source Popkin BM, D'Anci KE, Rosenberg IH. Nutr Rev. 2010;68(8):439-458.
 *
 * @throws {RangeError} si peso_kg ≤ 0 o fuera de rango fisiológico
 */
export function calcularHidratación_PorPeso(
  params: ParámetrosPorPeso
): ResultadoHidratación {
  const { peso_kg, adulto_mayor } = params;
  validarPeso(peso_kg);

  const multiplicador = adulto_mayor ? 30 : 35;
  const volumen_ml = multiplicador * peso_kg;

  return construirResultado(
    volumen_ml,
    'por_peso',
    multiplicador,
    adulto_mayor
      ? 'Popkin BM et al. Nutr Rev. 2010;68(8):439-458. (30 ml/kg — adulto mayor)'
      : 'Holliday MA, Segar WE. Pediatrics. 1957;19(5):823-832. (35 ml/kg — adulto)'
  );
}

/**
 * Hidratación por Gasto Energético Total.
 * 1 ml por cada kcal de GET.
 *
 * @source IOM. Dietary Reference Intakes for Water, Potassium, Sodium,
 *   Chloride, and Sulfate. National Academies Press. 2005. p. 73.
 *
 * @throws {RangeError} si get_kcal ≤ 0
 */
export function calcularHidratación_PorGET(
  params: ParámetrosPorGET
): ResultadoHidratación {
  const { get_kcal } = params;
  validarGET(get_kcal);

  return construirResultado(
    get_kcal, // 1 ml por 1 kcal
    'por_get',
    null,
    'IOM. Dietary Reference Intakes for Water. National Academies Press. 2005.'
  );
}

/**
 * Hidratación ajustada por rango de edad (ml/kg).
 *
 * Rango:
 *   < 30 años  → 40 ml/kg
 *   31–55 años → 35 ml/kg
 *   56–65 años → 30 ml/kg
 *   > 65 años  → 25 ml/kg
 *
 * @source Chernoff R. (1994). J Am Diet Assoc, 94(8):878-882.
 * @source IOM. Dietary Reference Intakes for Water. 2005.
 *
 * @throws {RangeError} si peso_kg ≤ 0 o edad fuera de rango
 */
export function calcularHidratación_PorEdad(
  params: ParámetrosPorEdad
): ResultadoHidratación {
  const { peso_kg, edad_anios } = params;
  validarPeso(peso_kg);
  validarEdad(edad_anios);

  const rango = MULTIPLICADORES_POR_EDAD.find(
    (r) => edad_anios >= r.edad_min && edad_anios <= r.edad_max
  );

  // Safety — nunca debería ocurrir dado que la tabla cubre [0, ∞)
  if (!rango) {
    throw new RangeError(
      `No se encontró multiplicador para edad ${edad_anios} años`
    );
  }

  const volumen_ml = rango.ml_por_kg * peso_kg;

  return construirResultado(
    volumen_ml,
    'por_edad',
    rango.ml_por_kg,
    'Chernoff R. J Am Diet Assoc. 1994;94(8):878-882. | IOM. DRI for Water. 2005.'
  );
}

/**
 * Tasa de sudoración post-ejercicio con reposición recomendada.
 *
 * Pérdida neta (ml) = (peso_pre − peso_post) × 1000 + líquido_ingerido − orina
 * Tasa (ml/min)    = Pérdida / duración_min
 * Reposición       = Pérdida × 1.5 (150% — protocolo ACSM)
 *
 * @source Sawka MN, Burke LM, Eichner ER, Maughan RJ, Montain SJ,
 *   Stachenfeld NS. (ACSM Position Stand). Med Sci Sports Exerc.
 *   2007;39(2):377-390. doi:10.1249/mss.0b013e31802ca597
 *
 * @throws {RangeError} si duración_min ≤ 0
 * @throws {RangeError} si peso_post es significativamente mayor que peso_pre
 *   (margen de +2 kg tolera error de medición / ingesta intensa de líquido)
 */
export function calcularTasaSudoración(
  params: ParámetrosTasaSudoración
): ResultadoTasaSudoración {
  const {
    peso_pre_kg,
    peso_post_kg,
    líquido_ingerido_ml,
    orina_ml,
    duración_min,
  } = params;

  validarPeso(peso_pre_kg);
  validarPeso(peso_post_kg);
  validarTiempo(duración_min);

  // Validar que líquido y orina no sean negativos
  if (líquido_ingerido_ml < 0) {
    throw new RangeError(`líquido_ingerido_ml no puede ser negativo. Recibido: ${líquido_ingerido_ml}`);
  }
  if (orina_ml < 0) {
    throw new RangeError(`orina_ml no puede ser negativo. Recibido: ${orina_ml}`);
  }

  // Margen de +2 kg para acomodar ingesta masiva de líquido o error de báscula
  if (peso_post_kg > peso_pre_kg + 2) {
    throw new RangeError(
      `peso_post_kg (${peso_post_kg}) supera peso_pre_kg (${peso_pre_kg}) en más de 2 kg. ` +
      'Verificar mediciones.'
    );
  }

  // Fórmula ACSM
  const cambio_peso_ml = (peso_pre_kg - peso_post_kg) * 1000;
  const pérdida_neta_ml = cambio_peso_ml + líquido_ingerido_ml - orina_ml;

  // Si el resultado es negativo (ej. bebió más de lo que sudó) → 0
  const pérdida_efectiva_ml = Math.max(0, pérdida_neta_ml);

  const tasa_ml_por_min  = pérdida_efectiva_ml / duración_min;
  const tasa_ml_por_hora = tasa_ml_por_min * 60;

  // Reposición al 150% del volumen perdido (ACSM)
  const reposición_recomendada_ml = pérdida_efectiva_ml * 1.5;

  return {
    pérdida_neta_ml:           Math.round(pérdida_efectiva_ml),
    tasa_ml_por_min:           parseFloat(tasa_ml_por_min.toFixed(1)),
    tasa_ml_por_hora:          Math.round(tasa_ml_por_hora),
    reposición_recomendada_ml: Math.round(reposición_recomendada_ml),
    botellas_600ml:            parseFloat((reposición_recomendada_ml / 600).toFixed(1)),
    fuente_bibliográfica:
      'Sawka MN et al. ACSM Position Stand. Med Sci Sports Exerc. 2007;39(2):377-390.',
  };
}

/**
 * Aplica ajustes clínicos sobre un volumen hídrico base.
 *
 * Factores y sus incrementos:
 *   • Fiebre:             +150 ml por cada °C sobre 37 °C
 *     @source DuBois EF. Arch Intern Med. 1921;27(2):259.
 *   • Vómito:             +500 ml/día
 *     @source ESPEN Guidelines on Clinical Nutrition. Clin Nutr. 2017.
 *   • Diarrea:            +500 ml/día
 *     @source ESPEN Guidelines on Clinical Nutrition. Clin Nutr. 2017.
 *   • Actividad intensa:  +500 ml/día
 *     @source ACSM Position Stand. Med Sci Sports Exerc. 2007.
 *   • Clima caluroso:     +500 ml/día
 *     @source Sawka MN et al. Med Sci Sports Exerc. 2007;39(2):377-390.
 *
 * @throws {RangeError} si volumen_base_ml ≤ 0
 * @throws {RangeError} si fiebre === true y temperatura_celsius es null/< 37
 */
export function calcularAjusteClínico(
  volumen_base_ml: number,
  factores: FactoresClínicos
): ResultadoAjusteClínico {
  if (!Number.isFinite(volumen_base_ml) || volumen_base_ml <= 0) {
    throw new RangeError(
      `volumen_base_ml debe ser positivo. Recibido: ${volumen_base_ml}`
    );
  }

  const desglose: DetalleIncremento[] = [];
  let incremento_total = 0;

  // Fiebre: +150 ml por cada °C sobre 37 °C
  if (factores.fiebre) {
    const temp = factores.temperatura_celsius;
    if (temp === null || !Number.isFinite(temp) || temp < 37) {
      throw new RangeError(
        `temperatura_celsius debe ser ≥ 37 °C cuando fiebre = true. Recibido: ${temp}`
      );
    }
    const grados_sobre_37 = temp - 37;
    const incremento_fiebre = Math.round(grados_sobre_37 * 150);
    if (incremento_fiebre > 0) {
      incremento_total += incremento_fiebre;
      desglose.push({
        factor:        'Fiebre',
        incremento_ml: incremento_fiebre,
        descripción:   `${grados_sobre_37.toFixed(1)} °C sobre 37 °C × 150 ml/°C`,
      });
    }
  }

  // Vómito: +500 ml/día
  if (factores.vómito) {
    incremento_total += INCREMENTO_VÓMITO_ML;
    desglose.push({
      factor:        'Vómito',
      incremento_ml: INCREMENTO_VÓMITO_ML,
      descripción:   'Pérdidas gastrointestinales — estimación conservadora',
    });
  }

  // Diarrea: +500 ml/día
  if (factores.diarrea) {
    incremento_total += INCREMENTO_DIARREA_ML;
    desglose.push({
      factor:        'Diarrea',
      incremento_ml: INCREMENTO_DIARREA_ML,
      descripción:   'Pérdidas por heces acuosas — estimación conservadora',
    });
  }

  // Actividad física intensa: +500 ml/día
  if (factores.actividad_intensa) {
    incremento_total += INCREMENTO_ACTIVIDAD_ML;
    desglose.push({
      factor:        'Actividad física intensa',
      incremento_ml: INCREMENTO_ACTIVIDAD_ML,
      descripción:   'Incremento por sudoración durante ejercicio',
    });
  }

  // Clima caluroso: +500 ml/día
  if (factores.clima_caluroso) {
    incremento_total += INCREMENTO_CALOR_ML;
    desglose.push({
      factor:        'Clima caluroso',
      incremento_ml: INCREMENTO_CALOR_ML,
      descripción:   'Pérdidas insensibles aumentadas por temperatura ambiental',
    });
  }

  const volumen_ajustado_ml = Math.round(volumen_base_ml + incremento_total);

  return {
    volumen_base_ml:          Math.round(volumen_base_ml),
    incremento_total_ml:      incremento_total,
    volumen_ajustado_ml,
    volumen_ajustado_litros:  parseFloat((volumen_ajustado_ml / 1000).toFixed(2)),
    vasos_240ml:              Math.round(volumen_ajustado_ml / 240),
    desglose,
  };
}

/**
 * Devuelve el multiplicador (ml/kg) y su descripción para un rango de edad.
 * Útil para mostrar en la UI cuál regla se está aplicando.
 */
export function getMultiplicadorPorEdad(edad_anios: number): {
  ml_por_kg: number;
  descripción: string;
} {
  validarEdad(edad_anios);
  const rango = MULTIPLICADORES_POR_EDAD.find(
    (r) => edad_anios >= r.edad_min && edad_anios <= r.edad_max
  );
  if (!rango) {
    throw new RangeError(`Sin rango para edad ${edad_anios} años`);
  }
  return { ml_por_kg: rango.ml_por_kg, descripción: rango.descripción };
}