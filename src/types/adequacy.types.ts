/**
 * adequacy.types.ts — Tipos para el módulo de Adecuación Dietética
 * Proyecto NUTRIA — Open Source
 *
 * Define los contratos para comparar lo prescrito vs lo consumido
 * y generar el semáforo de adecuación por nutriente.
 */

// ---------------------------------------------------------------------------
// CLASIFICACIONES
// ---------------------------------------------------------------------------

/**
 * Estado del semáforo de adecuación.
 * Basado en los rangos definidos en las instrucciones globales de NUTRIA.
 *
 *   Verde:    95% – 105%  → Excelente
 *   Amarillo: 90% – 94%   → Revisar (déficit leve)
 *             106% – 110% → Revisar (exceso leve)
 *   Rojo:     < 90%       → Déficit crítico
 *             > 110%      → Exceso crítico
 */
export type EstadoAdecuación =
  | 'optimo'          // 95 – 105%
  | 'deficit_leve'    // 90 – 94%
  | 'exceso_leve'     // 106 – 110%
  | 'deficit_critico' // < 90%
  | 'exceso_critico'; // > 110%

/**
 * Color del semáforo para renderizado en UI.
 * Mapea directamente a los tokens de diseño del sistema.
 */
export type ColorSemáforo = 'verde' | 'amarillo' | 'rojo';

/**
 * Nutrientes evaluables por el semáforo de adecuación.
 * Corresponden a los campos del planificador SMAE y las IDR.
 */
export type NutrienteEvaluable =
  | 'energia_kcal'
  | 'proteina_g'
  | 'lipidos_g'
  | 'hidratos_g'
  | 'fibra_g'
  | 'calcio_mg'
  | 'hierro_mg'
  | 'zinc_mg'
  | 'vitamina_c_mg'
  | 'vitamina_d_mcg'
  | 'folato_mcg_dfe'
  | 'vitamina_b12_mcg'
  | 'sodio_mg'
  | 'potasio_mg';

// ---------------------------------------------------------------------------
// PARÁMETROS DE ENTRADA
// ---------------------------------------------------------------------------

/** Par prescrito/consumido para un solo nutriente. */
export interface ParámetrosAdecuación {
  prescrito: number;
  consumido: number;
}

/**
 * Plan completo de nutrientes para evaluar adecuación global.
 * Partial porque no todos los nutrientes son obligatorios en cada plan.
 */
export type PlanNutrientes = Partial<Record<NutrienteEvaluable, number>>;

/** Parámetros para evaluar un plan completo vs prescripción. */
export interface ParámetrosPlanAdecuación {
  prescrito: PlanNutrientes;
  consumido:  PlanNutrientes;
}

// ---------------------------------------------------------------------------
// RESULTADOS DE SALIDA
// ---------------------------------------------------------------------------

/** Resultado de adecuación para un solo nutriente. */
export interface ResultadoAdecuación {
  readonly porcentaje:  number;           // % de adecuación (consumido/prescrito × 100)
  readonly estado:      EstadoAdecuación;
  readonly color:       ColorSemáforo;
  readonly prescrito:   number;
  readonly consumido:   number;
  readonly diferencia:  number;           // consumido − prescrito (positivo = exceso)
}

/** Resultado de adecuación para cada nutriente del plan. */
export type ResultadoPlanAdecuación = Partial<
  Record<NutrienteEvaluable, ResultadoAdecuación>
>;

/** Resumen ejecutivo del plan completo. */
export interface ResumenAdecuación {
  readonly total_nutrientes:    number;
  readonly optimos:             number;
  readonly con_deficit_leve:    number;
  readonly con_exceso_leve:     number;
  readonly con_deficit_critico: number;
  readonly con_exceso_critico:  number;
  readonly porcentaje_optimo:   number; // % de nutrientes en verde
  readonly detalle: ResultadoPlanAdecuación;
}

// ---------------------------------------------------------------------------
// ALIAS DE COMPATIBILIDAD — usados por SemaforoAdecuacion.tsx
// ---------------------------------------------------------------------------

/**
 * Alias de ColorSemáforo para compatibilidad con el componente UI.
 * El componente usa el nombre SemaforoColor (sin acento).
 */
export type SemaforoColor = ColorSemáforo;

/**
 * Representa un nutriente individual listo para renderizar en el semáforo.
 * El componente SemaforoAdecuacion.tsx trabaja con este tipo.
 */
export interface NutrienteRowData {
  id: string;
  label: string;
  unidad: string;
  consumido: number;
  prescrito: number;
  nota_clinica?: string;
  grupo: 'macro' | 'micro';
}

/**
 * Datos que recibe el componente SemaforoAdecuacion.
 * Contiene la lista de nutrientes ya transformados y listos para UI.
 */
export interface AdecuacionDiaria {
  nutrientes: NutrienteRowData[];
}