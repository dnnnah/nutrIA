/**
 * energy.types.ts — Tipos para el motor de cálculo energético
 * Proyecto NUTRIA — Open Source
 *
 * Nomenclatura en español clínico según AGENT.md
 */

// ---------------------------------------------------------------------------
// ENUMERACIONES
// ---------------------------------------------------------------------------

export type Sexo = 'masculino' | 'femenino';

/**
 * Fórmulas de TMB disponibles.
 * Cada variante corresponde a una publicación bibliográfica independiente.
 */
export type FormulasTMB =
  | 'mifflin_st_jeor'     // Mifflin MD et al., 1990 — Estándar actual población general
  | 'harris_benedict'      // Roza AM & Shizgal HM, 1984 — Entorno hospitalario
  | 'valencia'             // Valencia ME et al., INNSZ — Población mexicana
  | 'katch_mcardle'        // McArdle WD et al., 2015 — Requiere masa magra; atletas
  | 'cunningham'           // Cunningham JJ, 1980 — Alta masa muscular
  | 'schofield';           // Schofield WN, 1985 — Pediatría/adolescentes (OMS)

/**
 * Categorías de Nivel de Actividad Física (NAF).
 * Valores tomados de OMS 1985 / IOM 2005.
 */
export type CategoríaNAF =
  | 'sedentario'    // 1.20 — sin ejercicio estructurado
  | 'ligero'        // 1.375 — ejercicio 1-3 días/semana
  | 'moderado'      // 1.55 — ejercicio 3-5 días/semana
  | 'intenso'       // 1.725 — ejercicio 6-7 días/semana
  | 'muy_intenso';  // 1.90 — trabajo físico + doble entrenamiento

/**
 * Condiciones de estrés metabólico que incrementan el GET.
 * Fuente: ASPEN Clinical Guidelines 2016.
 */
export type FactorEstrés =
  | 'ninguno'
  | 'cirugia_menor'          // × 1.0 – 1.1
  | 'cirugia_mayor'          // × 1.1 – 1.3
  | 'trauma_cerrado'         // × 1.15 – 1.35
  | 'traumatismo_craneal'    // × 1.5 (fijo)
  | 'infeccion_leve'         // × 1.0 – 1.2
  | 'neumonia'               // × 1.2 – 1.35
  | 'sepsis'                 // × 1.2 – 1.6
  | 'quemaduras_leve'        // × 1.2 (fijo)
  | 'quemaduras_moderada'    // × 1.5 (fijo)
  | 'quemaduras_severa'      // × 1.5 – 2.0
  | 'cancer'                 // × 1.0 – 1.2
  | 'fiebre';                // +13% por °C sobre 37°C (DuBois)

// ---------------------------------------------------------------------------
// PARÁMETROS DE ENTRADA (INPUT)
// ---------------------------------------------------------------------------

/**
 * Parámetros base comunes a todas las fórmulas de TMB.
 */
export interface ParámetrosTMBBase {
  peso_kg: number;
  talla_cm: number;
  edad_anios: number;
  sexo: Sexo;
}

/**
 * Parámetros extendidos para fórmulas que requieren composición corporal.
 * Obligatorio para Katch-McArdle y Cunningham.
 */
export interface ParámetrosTMBConMasaMagra extends ParámetrosTMBBase {
  masa_magra_kg: number;
}

/**
 * Parámetros para el cálculo completo de GET.
 * Une TMB + NAF + ETA + estrés opcional.
 */
export interface ParámetrosGET {
  // Antropometría
  peso_kg: number;
  talla_cm: number;
  edad_anios: number;
  sexo: Sexo;
  // Composición corporal (opcional — requerido por algunas fórmulas)
  masa_magra_kg?: number;
  // Actividad
  naf: CategoríaNAF;
  formula_tmb: FormulasTMB;
  // Clínico
  factor_estres?: FactorEstrés;
  temperatura_corporal_celsius?: number; // Solo si factor_estres === 'fiebre'
}

// ---------------------------------------------------------------------------
// RESULTADOS DE SALIDA (OUTPUT)
// ---------------------------------------------------------------------------

/**
 * Resultado intermedio de una fórmula de TMB específica.
 */
export interface ResultadoTMB {
  tmb_kcal: number;
  formula_usada: FormulasTMB;
  fuente_bibliografica: string;
}

/**
 * Desglose completo del Gasto Energético Total.
 * Todos los campos son readonly para garantizar inmutabilidad post-cálculo.
 */
export interface ResultadoGET {
  // Desglose energético
  readonly tmb_kcal: number;
  readonly get_sin_eta_kcal: number;   // TMB × NAF (antes de ETA)
  readonly eta_kcal: number;           // Efecto Térmico de Alimentos (10%)
  readonly get_final_kcal: number;     // GET con ETA incluida
  readonly get_con_estres_kcal: number;// GET final + factor estrés (= get_final si no hay estrés)

  // Peso clínico usado
  readonly peso_utilizado_kg: number;  // Puede ser ajustado si hay obesidad
  readonly peso_ajustado: boolean;     // Bandera: se usó peso ajustado

  // Actividad
  readonly naf_valor: number;
  readonly naf_categoria: CategoríaNAF;

  // Metadatos
  readonly formula_tmb: FormulasTMB;
  readonly fuente_bibliografica: string;
  readonly factor_estres_aplicado: FactorEstrés;
  readonly factor_estres_valor: number; // 0 si no aplica
}

// ---------------------------------------------------------------------------
// TIPOS AUXILIARES INTERNOS
// ---------------------------------------------------------------------------

/**
 * Rango [min, max] para factores de estrés con variación.
 * Se usa el valor medio para el cálculo por defecto.
 */
export interface RangoFactor {
  min: number;
  max: number;
  valor_default: number; // (min + max) / 2
}