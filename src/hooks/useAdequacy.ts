/**
 * useAdequacy.ts — Motor de Adecuación Dietética (Semáforo)
 * Proyecto NUTRIA — Open Source
 *
 * Implementa:
 *   1. calcularAdecuación    — % adecuación + estado semáforo para 1 nutriente
 *   2. getColorSemáforo      — mapea estado → color de UI
 *   3. evaluarPlan           — evalúa todos los nutrientes de un plan
 *   4. generarResumen        — resumen ejecutivo del plan completo
 *
 * RANGOS DE ADECUACIÓN (Instrucciones Globales NUTRIA):
 *   Verde:    95% – 105%   → 'optimo'
 *   Amarillo: 90% – 94%    → 'deficit_leve'
 *             106% – 110%  → 'exceso_leve'
 *   Rojo:     < 90%        → 'deficit_critico'
 *             > 110%       → 'exceso_critico'
 *
 * @module useAdequacy
 */

import {
  type ColorSemáforo,
  type EstadoAdecuación,
  type NutrienteEvaluable,
  type ParámetrosAdecuación,
  type ParámetrosPlanAdecuación,
  type ResumenAdecuación,
  type ResultadoAdecuación,
  type ResultadoPlanAdecuación,
} from '../types/adequacy.types';

// ===========================================================================
// CONSTANTES DE RANGOS
// ===========================================================================

/**
 * Rangos de adecuación del sistema NUTRIA.
 * Definidos en las Instrucciones Globales del proyecto.
 * Modificar aquí afecta todo el sistema de semáforo de forma centralizada.
 */
const RANGOS = {
  OPTIMO_MIN:         95,
  OPTIMO_MAX:        105,
  DEFICIT_LEVE_MIN:   90,   // 90 – 94%
  EXCESO_LEVE_MAX:   110,   // 106 – 110%
} as const;

// ===========================================================================
// HELPERS PRIVADOS
// ===========================================================================

const redondear = (valor: number, decimales: number): number =>
  Math.round(valor * 10 ** decimales) / 10 ** decimales;

// ===========================================================================
// 1. CALCULAR ADECUACIÓN — 1 nutriente
// ===========================================================================

/**
 * Calcula el porcentaje de adecuación y clasifica el estado semáforo
 * para un único nutriente.
 *
 * Fórmula:
 *   % Adecuación = (consumido / prescrito) × 100
 *
 * Casos especiales:
 *   - prescrito = 0: No se puede calcular adecuación. Lanza error.
 *   - consumido = 0: % = 0 → déficit crítico (salvo prescrito = 0).
 *   - sodio: nutriente con límite superior — exceso es más relevante que déficit.
 *     (El semáforo es el mismo, la interpretación clínica la hace el nutriólogo.)
 *
 * @throws {RangeError} Si prescrito = 0 (división por cero sin sentido clínico)
 * @throws {RangeError} Si consumido o prescrito son negativos
 */
export const calcularAdecuación = (
  params: ParámetrosAdecuación
): ResultadoAdecuación => {
  const { prescrito, consumido } = params;

  if (!Number.isFinite(prescrito) || !Number.isFinite(consumido)) {
    throw new TypeError(
      `[NUTRIA] calcularAdecuación: prescrito y consumido deben ser números finitos`
    );
  }

  if (prescrito < 0 || consumido < 0) {
    throw new RangeError(
      `[NUTRIA] calcularAdecuación: prescrito (${prescrito}) y consumido (${consumido}) no pueden ser negativos`
    );
  }

  if (prescrito === 0) {
    throw new RangeError(
      `[NUTRIA] calcularAdecuación: prescrito = 0 no tiene sentido clínico — verificar plan`
    );
  }

  const porcentaje = redondear((consumido / prescrito) * 100, 1);
  const diferencia = redondear(consumido - prescrito, 2);

  const estado = clasificarEstado(porcentaje);
  const color  = getColorSemáforo(estado);

  return Object.freeze({
    porcentaje,
    estado,
    color,
    prescrito,
    consumido,
    diferencia,
  } satisfies ResultadoAdecuación);
};

// ===========================================================================
// 2. CLASIFICAR ESTADO (privado)
// ===========================================================================

/**
 * Determina el EstadoAdecuación a partir del porcentaje calculado.
 * Función pura — mismo input → mismo output, sin efectos secundarios.
 */
const clasificarEstado = (porcentaje: number): EstadoAdecuación => {
  if (porcentaje >= RANGOS.OPTIMO_MIN && porcentaje <= RANGOS.OPTIMO_MAX) {
    return 'optimo';
  }
  if (porcentaje >= RANGOS.DEFICIT_LEVE_MIN && porcentaje < RANGOS.OPTIMO_MIN) {
    return 'deficit_leve';
  }
  if (porcentaje > RANGOS.OPTIMO_MAX && porcentaje <= RANGOS.EXCESO_LEVE_MAX) {
    return 'exceso_leve';
  }
  if (porcentaje < RANGOS.DEFICIT_LEVE_MIN) {
    return 'deficit_critico';
  }
  // porcentaje > EXCESO_LEVE_MAX
  return 'exceso_critico';
};

// ===========================================================================
// 3. COLOR SEMÁFORO
// ===========================================================================

/**
 * Mapea un EstadoAdecuación al color correspondiente del semáforo.
 * Conecta directamente con los tokens de diseño del sistema:
 *   verde    → --color-success: #34C759
 *   amarillo → --color-warning: #FF9500
 *   rojo     → --color-danger:  #FF3B30
 */
export const getColorSemáforo = (estado: EstadoAdecuación): ColorSemáforo => {
  switch (estado) {
    case 'optimo':          return 'verde';
    case 'deficit_leve':    return 'amarillo';
    case 'exceso_leve':     return 'amarillo';
    case 'deficit_critico': return 'rojo';
    case 'exceso_critico':  return 'rojo';
    // Exhaustiveness check
    default: {
      const _nunca: never = estado;
      throw new Error(`[NUTRIA] Estado desconocido: ${String(_nunca)}`);
    }
  }
};

// ===========================================================================
// 4. EVALUAR PLAN COMPLETO
// ===========================================================================

/**
 * Evalúa todos los nutrientes de un plan dietético completo.
 * Solo evalúa los nutrientes que están presentes en AMBOS objetos
 * (prescrito y consumido). Nutrientes ausentes en prescrito se omiten.
 *
 * Retorna un objeto parcial — un nutriente por key con su ResultadoAdecuación.
 */
export const evaluarPlan = (
  params: ParámetrosPlanAdecuación
): ResultadoPlanAdecuación => {
  const { prescrito, consumido } = params;

  const resultado: ResultadoPlanAdecuación = {};

  // Iterar solo los nutrientes que tienen valor prescrito
  const nutrientes = Object.keys(prescrito) as NutrienteEvaluable[];

  for (const nutriente of nutrientes) {
    const valor_prescrito = prescrito[nutriente];
    const valor_consumido = consumido[nutriente] ?? 0; // Si no se registró consumo → 0

    // Saltar si prescrito es undefined o 0 (no calculable)
    if (valor_prescrito === undefined || valor_prescrito === 0) continue;

    resultado[nutriente] = calcularAdecuación({
      prescrito: valor_prescrito,
      consumido:  valor_consumido,
    });
  }

  return Object.freeze(resultado);
};

// ===========================================================================
// 5. RESUMEN EJECUTIVO
// ===========================================================================

/**
 * Genera un resumen ejecutivo del plan con conteos por estado de semáforo.
 * Útil para el Dashboard y el header del plan del día.
 *
 * Ejemplo de uso:
 *   const resumen = generarResumen({ prescrito, consumido });
 *   // resumen.porcentaje_optimo → 75% de nutrientes en verde
 */
export const generarResumen = (
  params: ParámetrosPlanAdecuación
): ResumenAdecuación => {
  const detalle = evaluarPlan(params);
  const entradas = Object.values(detalle) as ResultadoAdecuación[];

  const total            = entradas.length;
  const optimos          = entradas.filter((e) => e.estado === 'optimo').length;
  const deficit_leve     = entradas.filter((e) => e.estado === 'deficit_leve').length;
  const exceso_leve      = entradas.filter((e) => e.estado === 'exceso_leve').length;
  const deficit_critico  = entradas.filter((e) => e.estado === 'deficit_critico').length;
  const exceso_critico   = entradas.filter((e) => e.estado === 'exceso_critico').length;

  const porcentaje_optimo = total > 0
    ? redondear((optimos / total) * 100, 1)
    : 0;

  return Object.freeze({
    total_nutrientes:    total,
    optimos,
    con_deficit_leve:    deficit_leve,
    con_exceso_leve:     exceso_leve,
    con_deficit_critico: deficit_critico,
    con_exceso_critico:  exceso_critico,
    porcentaje_optimo,
    detalle,
  } satisfies ResumenAdecuación);
};

// ===========================================================================
// HOOK REACT
// ===========================================================================

/**
 * Hook que expone el motor de adecuación dietética.
 * No gestiona estado interno — devuelve funciones puras directamente.
 *
 * USO:
 *   const { calcularAdecuación, evaluarPlan, generarResumen } = useAdequacy();
 */
export const useAdequacy = () => ({
  calcularAdecuación,
  getColorSemáforo,
  evaluarPlan,
  generarResumen,
});