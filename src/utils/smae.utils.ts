/**
 * smae.utils.ts — Adaptador de datos SMAE
 * Proyecto NUTRIA — Open Source
 *
 * Responsabilidad única: convertir la estructura raw de los JSONs
 * (smae_frutas.json, smae_verduras.json, smae_cereales_sin_grasa.json)
 * al tipo canónico `AlimentoSMAE` que espera `useSMAEPlanner`.
 *
 * PRINCIPIO ARQUITECTÓNICO:
 *   El adaptador es la ÚNICA capa que conoce la estructura interna de los JSONs.
 *   Los hooks y la UI NUNCA importan los JSONs directamente.
 *   Si mañana cambia el schema del JSON, solo se edita este archivo.
 *
 * @source SMAE 5ª edición. Pérez Lizaur AB, Palacios González B.
 *   Fomento de Nutrición y Salud A.C. / INCMNSZ / Ogali. 2023.
 *
 * @module smae.utils
 */

import type { GrupoSMAE, AlimentoSMAE, FuenteDatos } from '../types/food.types'

// ===========================================================================
// TIPO RAW — Estructura exacta de los JSONs (no exportar fuera de este módulo)
// ===========================================================================

/**
 * Estructura de cada alimento en los JSONs del proyecto.
 * Refleja schema_version: "2.0" de smae_frutas/verduras/cereales.
 */
interface AlimentoRaw {
  id: string
  metadata: {
    nombre:     string
    grupo_smae: string
    fuente:     string
    validado:   boolean
  }
  porcion: {
    cantidad_sugerida: string
    unidad:            string
    peso_bruto_g:      number | null
    peso_neto_g:       number
  }
  nutrientes: {
    energia_kcal: number
    macros: {
      proteina_g:             number
      lipidos_g:              number
      hidratos_g:             number
      fibra_g:                number | null
      azucar_g?:              number | null
      ag_saturados_g?:        number | null
      ag_monoinsaturados_g?:  number | null
      ag_poliinsaturados_g?:  number | null
      colesterol_mg?:         number | null
      etanol_g?:              number | null
    }
    micros: {
      vitamina_a_mcg_re?:  number | null
      acido_ascorbico_mg?: number | null
      acido_folico_mcg?:   number | null
      calcio_mg?:          number | null
      hierro_mg?:          number | null
      potasio_mg?:         number | null
      sodio_mg?:           number | null
      fosforo_mg?:         number | null
      zinc_mg?:            number | null
      magnesio_mg?:        number | null
      vitamina_b12_mcg?:   number | null
      vitamina_d_mcg?:     number | null
    }
  }
  indices?: {
    glucemico?:       number | null
    carga_glucemica?: number | null
  }
}

/** Estructura raíz de cada JSON (tiene _meta + alimentos[]) */
interface JsonSMAERaw {
  _meta:     Record<string, unknown>
  alimentos: AlimentoRaw[]
}

// ===========================================================================
// FUNCIÓN CENTRAL: adaptarAlimentoSMAE
// ===========================================================================

/**
 * Convierte un alimento raw del JSON al tipo canónico `AlimentoSMAE`.
 *
 * Decisiones de adaptación:
 *  - `medida_casera`: construida como "cantidad_sugerida unidad" (ej: "1/2 taza")
 *  - Micros nulos → 0  (el tipo AlimentoSMAE pide number, no number|null)
 *  - `fuente_datos` siempre inferida desde metadata.fuente
 *  - `alergenos`: vacío por ahora (el JSON raw no tiene este campo)
 *  - `apto_vegano` / `apto_vegetariano` / `contiene_gluten` / `contiene_lactosa`:
 *    valores conservadores (false) hasta que los JSONs los incluyan
 *
 * @param raw - Objeto alimento tal como viene del JSON
 * @returns AlimentoSMAE listo para el hook
 */
export const adaptarAlimentoSMAE = (raw: AlimentoRaw): AlimentoSMAE => {
  const m  = raw.nutrientes.macros
  const mi = raw.nutrientes.micros

  // Inferir FuenteDatos desde el string del JSON
  const fuente_datos = inferirFuenteDatos(raw.metadata.fuente)

  // Medida casera legible: "4 cda", "1/2 taza", etc.
  const medida_casera = `${raw.porcion.cantidad_sugerida} ${raw.porcion.unidad}`

  return {
    // ── Identidad ──────────────────────────────────────────────────────────
    id:         raw.id,
    nombre:     raw.metadata.nombre,
    grupo_smae: raw.metadata.grupo_smae as GrupoSMAE,

    // ── Porción ────────────────────────────────────────────────────────────
    porcion_estandar_g: raw.porcion.peso_neto_g,
    medida_casera,
    medida_casera_g:    raw.porcion.peso_neto_g,
    peso_bruto_g:       raw.porcion.peso_bruto_g ?? undefined,
    peso_neto_g:        raw.porcion.peso_neto_g,

    // ── Macronutrientes por 1 equivalente ─────────────────────────────────
    energia_kcal: raw.nutrientes.energia_kcal,
    proteina_g:   m.proteina_g,
    lipidos_g:    m.lipidos_g,
    hidratos_g:   m.hidratos_g,
    fibra_g:      m.fibra_g ?? 0,
    azucar_aniadida_g: m.azucar_g ?? undefined,

    // ── Micronutrientes (nulos → 0; normalizados por 100g en el JSON) ──────
    sodio_mg:        mi.sodio_mg        ?? 0,
    potasio_mg:      mi.potasio_mg      ?? 0,
    calcio_mg:       mi.calcio_mg       ?? 0,
    hierro_mg:       mi.hierro_mg       ?? 0,
    zinc_mg:         mi.zinc_mg         ?? 0,
    magnesio_mg:     mi.magnesio_mg     ?? 0,
    fosforo_mg:      mi.fosforo_mg      ?? 0,
    vitamina_c_mg:   mi.acido_ascorbico_mg ?? 0,
    folato_mcg:      mi.acido_folico_mcg   ?? 0,
    vitamina_b12_mcg: mi.vitamina_b12_mcg  ?? 0,
    vitamina_a_mcg_rae: mi.vitamina_a_mcg_re ?? undefined,
    vitamina_d_mcg:  mi.vitamina_d_mcg  ?? undefined,

    // ── Índices clínicos ───────────────────────────────────────────────────
    indice_glucemico: raw.indices?.glucemico        ?? undefined,
    carga_glucemica:  raw.indices?.carga_glucemica  ?? undefined,

    // ── Metadatos ─────────────────────────────────────────────────────────
    fuente_datos,
    alergenos:           [],
    apto_vegano:         false,   // sin dato en JSON raw v2.0
    apto_vegetariano:    false,   // sin dato en JSON raw v2.0
    contiene_gluten:     false,   // sin dato en JSON raw v2.0
    contiene_lactosa:    false,   // sin dato en JSON raw v2.0
  }
}

/** Infiere FuenteDatos a partir del string crudo del JSON */
const inferirFuenteDatos = (fuente_raw: string): FuenteDatos => {
  if (fuente_raw.startsWith('SMAE')) return 'SMAE_2023'
  if (fuente_raw.startsWith('USDA')) return 'USDA_FDC'
  if (fuente_raw.startsWith('INNSZ')) return 'INNSZ'
  if (fuente_raw.startsWith('BEDCA')) return 'BEDCA'
  return 'manual'
}

// ===========================================================================
// FUNCIÓN: cargarAlimentosPorGrupo
// ===========================================================================

/**
 * Carga y adapta todos los alimentos de un grupo SMAE.
 *
 * Importa el JSON correspondiente vía dynamic import.
 * Devuelve [] de forma síncrona para los grupos sin JSON aún disponible.
 *
 * NOTA: Los imports son estáticos (no dynamic) para compatibilidad con
 * el tree-shaking de Vite y soporte offline-first (bundled en el build).
 *
 * @param grupo - Clave del grupo SMAE
 * @returns Array de AlimentoSMAE adaptados
 */

// Importaciones estáticas — Vite los incluye en el bundle al build
// resolveJsonModule debe estar activo en tsconfig.json
import frutasRaw      from '../data/smae_frutas.json'
import verdurasRaw    from '../data/smae_verduras.json'
import cerealesSGRaw  from '../data/smae_cereales_sin_grasa.json'

// Cache en memoria — evita re-adaptar en cada render
const _cache: Partial<Record<GrupoSMAE, AlimentoSMAE[]>> = {}

export const cargarAlimentosPorGrupo = (grupo: GrupoSMAE): AlimentoSMAE[] => {
  // Cache hit — devolver sin re-procesar
  if (_cache[grupo]) return _cache[grupo]!

  let rawJson: JsonSMAERaw | null = null

  switch (grupo) {
    case 'frutas':
      rawJson = frutasRaw as JsonSMAERaw
      break
    case 'verduras':
      rawJson = verdurasRaw as JsonSMAERaw
      break
    case 'cereales_sin_grasa':
      rawJson = cerealesSGRaw as JsonSMAERaw
      break
    default:
      // Grupos sin JSON aún — devolver vacío sin error
      _cache[grupo] = []
      return []
  }

  const adaptados = rawJson.alimentos.map(adaptarAlimentoSMAE)
  _cache[grupo]   = adaptados
  return adaptados
}

// ===========================================================================
// FUNCIÓN: buscarAlimentos
// ===========================================================================

/**
 * Filtra alimentos por nombre dentro de un grupo SMAE.
 *
 * Normaliza la búsqueda: sin acentos, sin distinción de mayúsculas.
 * Usa el cache de `cargarAlimentosPorGrupo` — no re-lee el JSON.
 *
 * Ejemplo:
 *   buscarAlimentos('manzana', 'frutas') → [Manzana con cáscara, Manzana sin cáscara]
 *   buscarAlimentos('brocoli', 'verduras') → [Brócoli] (normaliza acento)
 *
 * @param query - Texto libre de búsqueda
 * @param grupo - Grupo SMAE donde buscar
 * @returns Alimentos que coinciden, en el orden original del JSON
 */
export const buscarAlimentos = (query: string, grupo: GrupoSMAE): AlimentoSMAE[] => {
  const todos = cargarAlimentosPorGrupo(grupo)

  const termino = normalizar(query.trim())
  if (termino === '') return todos

  return todos.filter((a) => normalizar(a.nombre).includes(termino))
}

// ===========================================================================
// UTILITARIOS INTERNOS
// ===========================================================================

/**
 * Normaliza un string para búsqueda tolerante a acentos.
 * 'Brócoli' → 'brocoli' | 'MANZANA' → 'manzana'
 *
 * Usa NFD + regex para separar diacríticos y eliminarlos.
 */
const normalizar = (texto: string): string =>
  texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')