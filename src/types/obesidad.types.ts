/**
 * obesidad.types.ts — Tipos para el módulo de Obesidad y Riesgo Cardiovascular
 * Proyecto NUTRIA — Open Source
 *
 * Separados del hook para cumplir la convención del proyecto:
 *   hooks/ → lógica pura
 *   types/ → contratos de datos
 *
 * @source Wilson PWF et al. Circulation. 1998;97(18):1837-1847.   (Framingham)
 * @source Valdez R. J Clin Epidemiol. 1991;44(9):955-956.         (Índ. Conicidad)
 * @source Castelli WP et al. Circulation. 1983;67(4):730-734.     (Índ. Aterogénico)
 * @source NCEP ATP-III. JAMA. 2001;285(19):2486-2497.             (No-HDL)
 * @source Drewnowski A, Specter SE. Am J Clin Nutr. 2004;79(1):6-16. (DC)
 */

// ---------------------------------------------------------------------------
// CLASIFICACIONES / UNIONES LITERALES
// ---------------------------------------------------------------------------

/** Clasificación de densidad calórica según Drewnowski 2004. */
export type ClasificaciónDC =
  | 'muy_baja'   // < 0.6 kcal/g
  | 'baja'       // 0.6 – 1.5 kcal/g
  | 'media'      // 1.5 – 4.0 kcal/g
  | 'alta';      // > 4.0 kcal/g

/** Clasificación del Índice Aterogénico (CT/HDL) según Castelli 1983. */
export type ClasificaciónIA =
  | 'optimo'    // < 3.5
  | 'normal'    // 3.5 – 5.0
  | 'alto'      // 5.0 – 6.0
  | 'muy_alto'; // > 6.0

/** Clasificación de No-HDL según ATP-III / NCEP 2001. */
export type ClasificaciónNoHDL =
  | 'optimo'    // < 130 mg/dL
  | 'limite'    // 130 – 159 mg/dL
  | 'alto'      // 160 – 189 mg/dL
  | 'muy_alto'; // ≥ 190 mg/dL

/** Clasificación del Índice de Conicidad según Valdez 1991. */
export type ClasificaciónIC =
  | 'normal'
  | 'riesgo';

/** Categoría de riesgo cardiovascular a 10 años (Framingham Wilson 1998). */
export type CategoríaRiesgoCVD =
  | 'bajo'        // < 10 %
  | 'intermedio'  // 10 – 19 %
  | 'alto';       // ≥ 20 %

// ---------------------------------------------------------------------------
// PARÁMETROS DE ENTRADA (INPUT)
// ---------------------------------------------------------------------------

export interface ParámetrosDensidadCalórica {
  /** Nombre libre del alimento (solo para trazabilidad). */
  nombre: string;
  /** Energía en kcal. */
  kcal: number;
  /** Peso del alimento en gramos. */
  gramos: number;
}

export interface ParámetrosÍndiceAterogénico {
  colesterol_total_mg_dL: number;
  hdl_mg_dL: number;
}

export interface ParámetrosNoHDL {
  colesterol_total_mg_dL: number;
  hdl_mg_dL: number;
}

export interface ParámetrosÍndiceConicidad {
  cintura_cm: number;
  peso_kg: number;
  talla_cm: number;
  sexo: 'masculino' | 'femenino';
}

export interface ParámetrosFramingham {
  sexo: 'masculino' | 'femenino';
  /** Edad en años. Rango válido: 30–74. */
  edad_anios: number;
  colesterol_total_mg_dL: number;
  hdl_mg_dL: number;
  /** Presión arterial sistólica en mmHg. */
  presion_sistolica_mmHg: number;
  fumador_activo: boolean;
  bajo_tratamiento_antihipertensivo: boolean;
}

// ---------------------------------------------------------------------------
// RESULTADOS DE SALIDA (OUTPUT)
// ---------------------------------------------------------------------------

export interface ResultadoDensidadCalórica {
  readonly nombre: string;
  readonly dc_kcal_g: number;
  readonly clasificacion: ClasificaciónDC;
  readonly etiqueta: string;
  readonly fuente_bibliografica: string;
}

export interface ResultadoMenuDC {
  readonly alimentos: ResultadoDensidadCalórica[];
  readonly dc_promedio_kcal_g: number;
  readonly clasificacion_promedio: ClasificaciónDC;
  readonly etiqueta_promedio: string;
  readonly recomendacion: string;
}

export interface ResultadoÍndiceAterogénico {
  readonly ia: number;
  readonly clasificacion: ClasificaciónIA;
  readonly etiqueta: string;
  readonly fuente_bibliografica: string;
}

export interface ResultadoNoHDL {
  readonly no_hdl_mg_dL: number;
  readonly clasificacion: ClasificaciónNoHDL;
  readonly etiqueta: string;
  readonly fuente_bibliografica: string;
}

export interface ResultadoÍndiceConicidad {
  readonly ic: number;
  readonly clasificacion: ClasificaciónIC;
  readonly etiqueta: string;
  readonly punto_corte_sexo: number;
  readonly fuente_bibliografica: string;
}

export interface ResultadoFramingham {
  readonly puntos_obtenidos: number;
  readonly riesgo_10_anios_pct: number;
  readonly categoria: CategoríaRiesgoCVD;
  readonly etiqueta: string;
  readonly interpretacion_clinica: string;
  readonly fuente_bibliografica: string;
}