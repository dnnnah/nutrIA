/**
 * src/data/index.ts — Barrel file de datos de referencia clínica
 *
 * Importa los JSONs estáticos y los re-exporta con tipos estrictos.
 * Todos los datos son offline-first: disponibles sin conexión desde el
 * momento en que la PWA se instala (incluidos en el bundle de Vite).
 *
 * ADVERTENCIA DE USO:
 * - Estos datos son de SOLO LECTURA. Nunca mutar directamente.
 * - Para datos del paciente, usar las stores de Zustand + Dexie.
 * - Para acceso a un grupo específico de IDR, usar getGrupoIDR().
 *
 * @project NUTRIA — PWA clínica open source
 */

import type {
  IDRData,
  LabReferencesData,
  METsData,
  NAFData,
  MeasuresData,
  ClaveGrupoIDR,
  GrupoIDR,
  NivelActividadFisica,
  FactorNAF,
  ActividadFisica,
  CategoriaActividad,
} from '../types/data.types';

// ─────────────────────────────────────────────────────────────────────────────
// IMPORTACIONES DE JSON
// resolveJsonModule: true en tsconfig → TypeScript infiere el tipo del JSON.
// assetsInclude en vite.config → incluidos en el bundle para offline-first.
// ─────────────────────────────────────────────────────────────────────────────

import _idrRaw from './idr.json';
import _labRaw from './lab_references.json';
import _metsRaw from './mets.json';
import _nafRaw from './naf_constants.json';
import _measuresRaw from './measures.json';

// Casteo con tipos definidos en data.types.ts.
// Se usa `as` aquí porque los JSON no pueden declarar sus propios tipos —
// esta es la única excepción permitida al estándar del proyecto (ADR-008).
export const idrData = _idrRaw as IDRData;
export const labData = _labRaw as LabReferencesData;
export const metsData = _metsRaw as METsData;
export const nafData = _nafRaw as NAFData;
export const measuresData = _measuresRaw as MeasuresData;

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS DE ACCESO TIPADO
// Funciones puras — mismo input → mismo output.
// No tienen efectos secundarios ni estado interno.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Obtiene el grupo IDR correspondiente a edad, sexo y condición.
 *
 * @source IOM Dietary Reference Intakes. 2006.
 * @param clave - Identificador del grupo (ej: 'adulto_19_30_m')
 * @returns GrupoIDR con todos los valores de referencia, o null si no existe.
 *
 * @example
 * const ref = getGrupoIDR('adulto_19_30_m');
 * // ref.hierro_mg === 18  (mg/día — mujer en edad fértil)
 */
export function getGrupoIDR(clave: ClaveGrupoIDR): GrupoIDR | null {
  return idrData.grupos[clave] ?? null;
}

/**
 * Obtiene el factor NAF para un nivel de actividad física.
 *
 * @source WHO. Energy and Protein Requirements. Technical Report 724. 1985.
 * @param nivel - Nivel de actividad (sedentario | ligero | moderado | intenso | muy_intenso)
 * @returns FactorNAF con el multiplicador y descripción clínica.
 *
 * @example
 * const naf = getNAF('moderado');
 * // naf.naf === 1.55
 * // GET = TMB × 1.55
 */
export function getNAF(nivel: NivelActividadFisica): FactorNAF {
  return nafData.factores_actividad_fisica[nivel];
}

/**
 * Obtiene todas las actividades físicas de una categoría específica.
 *
 * @source Ainsworth BE, et al. (2011). Med Sci Sports Exerc. 43(8):1575-1581.
 * @param categoria - Categoría de actividad (caminar | correr | natacion | ...)
 * @returns Array de actividades con sus valores MET.
 *
 * @example
 * const actividades = getActividadesPorCategoria('natacion');
 * // actividades[0] === { id: 'nat-001', actividad: 'Natación general', met: 6.0, ... }
 */
export function getActividadesPorCategoria(
  categoria: CategoriaActividad
): ActividadFisica[] {
  return metsData.actividades[categoria] ?? [];
}

/**
 * Calcula el gasto calórico de una actividad física usando la fórmula de Jetté.
 *
 * @source Jetté M, et al. (1990). Clin Cardiol. 13(8):555-565.
 * @formula Gasto_kcal = MET × 0.0175 × peso_kg × tiempo_min
 * @param met - Valor MET de la actividad
 * @param peso_kg - Peso del paciente en kilogramos
 * @param tiempo_min - Duración de la actividad en minutos
 * @returns Gasto calórico estimado en kcal (redondeado a 1 decimal)
 *
 * @example
 * // Mujer 65 kg camina 30 min (MET 3.5)
 * calcularGastoMET(3.5, 65, 30) // → 119.4 kcal
 */
export function calcularGastoMET(
  met: number,
  peso_kg: number,
  tiempo_min: number
): number {
  const gasto = met * 0.0175 * peso_kg * tiempo_min;
  return Math.round(gasto * 10) / 10; // 1 decimal
}

/**
 * Busca actividades físicas por nombre (búsqueda parcial, case-insensitive).
 *
 * @param query - Término de búsqueda (ej: "caminar", "yoga", "fut")
 * @returns Array de actividades que coinciden en cualquier categoría
 *
 * @example
 * buscarActividad('yoga')
 * // → [{ id: 'yog-001', actividad: 'Yoga (general)', met: 2.5, ... }]
 */
export function buscarActividad(query: string): ActividadFisica[] {
  const termino = query.toLowerCase().trim();
  if (termino.length < 2) return [];

  const resultados: ActividadFisica[] = [];
  const categorias = Object.keys(metsData.actividades) as CategoriaActividad[];

  for (const cat of categorias) {
    const actividades = metsData.actividades[cat];
    for (const act of actividades) {
      if (act.actividad.toLowerCase().includes(termino)) {
        resultados.push(act);
      }
    }
  }

  return resultados;
}

// ─────────────────────────────────────────────────────────────────────────────
// RE-EXPORTAR TIPOS (para consumo desde otros módulos sin importar data.types.ts directamente)
// ─────────────────────────────────────────────────────────────────────────────

export type {
  IDRData,
  LabReferencesData,
  METsData,
  NAFData,
  MeasuresData,
  ClaveGrupoIDR,
  GrupoIDR,
  NivelActividadFisica,
  FactorNAF,
  ActividadFisica,
  CategoriaActividad,
} from '../types/data.types';