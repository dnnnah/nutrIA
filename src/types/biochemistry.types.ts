/**
 * biochemistry.types.ts — Tipos para el módulo de Bioquímica Clínica
 * Proyecto NUTRIA — Open Source
 */

// ---------------------------------------------------------------------------
// CLASIFICACIONES
// ---------------------------------------------------------------------------

/**
 * Estadios de Enfermedad Renal Crónica según KDIGO 2024.
 * @source KDIGO 2024 Clinical Practice Guidelines for CKD.
 */
export type EstadioERC =
  | 'G1'   // TFG ≥ 90
  | 'G2'   // TFG 60–89
  | 'G3a'  // TFG 45–59
  | 'G3b'  // TFG 30–44
  | 'G4'   // TFG 15–29
  | 'G5';  // TFG < 15

/** Categorías de albuminuria KDIGO 2024. */
export type CategoríaAlbuminuria =
  | 'A1'   // < 30 mg/g
  | 'A2'   // 30–300 mg/g
  | 'A3';  // > 300 mg/g

/** Estado del Balance Nitrogenado. */
export type EstadoBN =
  | 'anabolismo'
  | 'equilibrio'
  | 'catabolismo';

/** Clasificación de resistencia a la insulina por HOMA-IR. */
export type ClasificaciónHOMA =
  | 'normal'
  | 'resistencia_leve'
  | 'resistencia_sig';

/** Estado del semáforo de laboratorio. */
export type SemáforoLab =
  | 'normal'
  | 'bajo'
  | 'alto'
  | 'critico_bajo'
  | 'critico_alto';

// ---------------------------------------------------------------------------
// PARÁMETROS DE ENTRADA
// ---------------------------------------------------------------------------

export interface ParámetrosHOMA {
  glucosa_ayuno_mg_dL:   number;
  insulina_ayuno_uIU_mL: number;
}

/**
 * Parámetros para CKD-EPI 2021 (sin factor raza).
 * @source Inker LA et al. NEJM. 2021;385:1737-1749.
 */
export interface ParámetrosCKDEPI {
  creatinina_serica_mg_dL: number;
  edad_anios:              number;
  sexo:                    'masculino' | 'femenino';
}

export interface ParámetrosBN {
  proteina_consumida_g: number; // Proteína ingerida en 24h
  nuu_g:               number; // Nitrógeno Ureico Urinario en orina 24h
}

/** Evalúa un valor de laboratorio contra rangos de referencia. */
export interface ParámetrosSemáforo {
  valor:          number;
  rango_normal:   { min: number | null; max: number | null };
  rango_critico?: { min: number | null; max: number | null };
}

// ---------------------------------------------------------------------------
// RESULTADOS DE SALIDA
// ---------------------------------------------------------------------------

export interface ResultadoHOMA {
  readonly homa_ir:              number;
  readonly clasificacion:        ClasificaciónHOMA;
  readonly glucosa_mg_dL:        number;
  readonly insulina_uIU_mL:      number;
  readonly fuente_bibliografica: string;
}

export interface ResultadoCKDEPI {
  readonly tfg_mL_min_1_73m2:    number;
  readonly estadio_erc:          EstadioERC;
  readonly descripcion_estadio:  string;
  readonly fuente_bibliografica: string;
}

export interface ResultadoBN {
  readonly bn_g_dia:             number;
  readonly estado:               EstadoBN;
  readonly nitrogeno_ingerido:   number;
  readonly nitrogeno_perdido:    number;
  readonly fuente_bibliografica: string;
}

export interface ResultadoSemáforo {
  readonly valor:  number;
  readonly estado: SemáforoLab;
}