/**
 * useSMAEPlanner.ts — Hook Principal del Planeador SMAE
 * Proyecto NUTRIA — Open Source
 *
 * Orquesta las 3 capas del sistema de planificación dietética:
 *   Capa 1 — Presupuesto de equivalentes por grupo SMAE
 *   Capa 2 — Distribución de equivalentes por tiempo de comida
 *   Capa 3 — Selección de alimentos específicos por tiempo/grupo
 *
 * PRINCIPIOS:
 *   - Función pura: mismo input → mismo output
 *   - Cero efectos secundarios fuera del estado local
 *   - useMemo para todos los cálculos derivados (performance)
 *   - Validaciones estrictas con mensajes de error clínicamente útiles
 *
 * @source SMAE 5ª edición. Pérez Lizaur AB et al.
 *   Fomento de Nutrición y Salud A.C. 2014.
 * @source Institute of Medicine. DRI for Macronutrients. 2005.
 *
 * @module useSMAEPlanner
 */

import { useCallback, useMemo, useState } from 'react'

import { MACROS_POR_EQUIVALENTE, GRUPOS_SMAE_ORDENADOS } from '../constants/smae.constants'
import type { GrupoSMAE, AlimentoSMAE, MacronutrientesEquivalente } from '../types/food.types'
import type { TiempoComida } from '../types/plan.types'

// ===========================================================================
// TIPOS LOCALES DEL HOOK
// ===========================================================================

/** Presupuesto diario: equivalentes asignados por grupo */
export type PresupuestoSMAE = Record<GrupoSMAE, number>

/** Distribución por tiempo de comida: Record<tiempo, Record<grupo, equivalentes>> */
export type DistribucionTiemposSMAE = Record<TiempoComida, Partial<Record<GrupoSMAE, number>>>

/** Alimento seleccionado en un tiempo de comida */
export interface AlimentoSeleccionado {
  /** UUID único para esta selección (permite múltiples del mismo alimento) */
  id_seleccion: string
  id_alimento: string
  nombre: string
  grupo_smae: GrupoSMAE
  /** Fracción de equivalente SMAE (1.0 = 1 equivalente completo) */
  fraccion_equivalente: number
  cantidad_g: number
  medida_casera: string
  /** Macros resultantes de esta selección */
  macros: MacronutrientesEquivalente
}

/** Alimentos seleccionados por tiempo de comida */
export type AlimentosPorTiempo = Record<TiempoComida, AlimentoSeleccionado[]>

/** Macros totales calculados del plan */
export interface MacrosTotalesSMAE {
  energia_kcal: number
  proteina_g:   number
  lipidos_g:    number
  hidratos_g:   number
  fibra_g:      number
}

/** Resultado de validación de distribución */
export interface ResultadoValidacion {
  valido:  boolean
  /** Grupos que exceden su presupuesto diario */
  grupos_excedidos: GrupoSMAE[]
}

/** Saldo disponible para un grupo en un tiempo */
export interface SaldoGrupo {
  grupo:       GrupoSMAE
  presupuesto: number
  distribuido: number
  disponible:  number
  agotado:     boolean
}

/** Snapshot de macros para un tiempo de comida específico */
export interface MacrosTiempo extends MacrosTotalesSMAE {
  tiempo: TiempoComida
}

// ===========================================================================
// CONSTANTES
// ===========================================================================

const TIEMPOS_COMIDA: TiempoComida[] = [
  'desayuno', 'colacion_1', 'comida', 'colacion_2', 'cena',
]

/** Presupuesto inicial: 0 equivalentes en todos los grupos */
const presupuesto_inicial = (): PresupuestoSMAE =>
  Object.fromEntries(
    GRUPOS_SMAE_ORDENADOS.map((grupo) => [grupo, 0])
  ) as PresupuestoSMAE

/** Distribución inicial: 0 equivalentes en todos los tiempos y grupos */
const distribucion_inicial = (): DistribucionTiemposSMAE =>
  Object.fromEntries(
    TIEMPOS_COMIDA.map((tiempo) => [tiempo, {}])
  ) as DistribucionTiemposSMAE

/** Alimentos iniciales: array vacío por tiempo */
const alimentos_inicial = (): AlimentosPorTiempo => ({
  desayuno:   [],
  colacion_1: [],
  comida:     [],
  colacion_2: [],
  cena:       [],
})

// ===========================================================================
// HELPERS PUROS (sin efectos secundarios)
// ===========================================================================

/**
 * Calcula los macros resultantes de una fracción de equivalente.
 * Multiplica cada macro del grupo por la fracción indicada.
 *
 * @source SMAE 5ª edición. Fomento de Nutrición y Salud A.C. 2014.
 */
const calcularMacrosFraccion = (
  grupo:    GrupoSMAE,
  fraccion: number,
): MacronutrientesEquivalente => {
  const base = MACROS_POR_EQUIVALENTE[grupo]
  const redondear = (v: number) => Math.round(v * 100) / 100
  return {
    energia_kcal: redondear(base.energia_kcal * fraccion),
    proteina_g:   redondear(base.proteina_g   * fraccion),
    lipidos_g:    redondear(base.lipidos_g    * fraccion),
    hidratos_g:   redondear(base.hidratos_g   * fraccion),
    fibra_g:      redondear((base.fibra_g ?? 0) * fraccion),
    azucar_aniadida_g: base.azucar_aniadida_g !== undefined
      ? redondear(base.azucar_aniadida_g * fraccion)
      : undefined,
  }
}

/**
 * Suma los equivalentes distribuidos en todos los tiempos para un grupo.
 * Invariante de validación de la Capa 2.
 */
const totalDistribuidoPorGrupo = (
  distribucion: DistribucionTiemposSMAE,
  grupo:        GrupoSMAE,
): number =>
  TIEMPOS_COMIDA.reduce(
    (suma, tiempo) => suma + (distribucion[tiempo][grupo] ?? 0),
    0,
  )

/**
 * Genera un UUID simple para identificar selecciones de alimentos.
 * No requiere uuid library — suficiente para el uso en cliente.
 */
const generarIdSeleccion = (): string =>
  `sel_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`

// ===========================================================================
// HOOK PRINCIPAL
// ===========================================================================

export interface UseSMAEPlannerReturn {
  // ── Estado ────────────────────────────────────────────────────────────────
  /** Equivalentes asignados por grupo (Capa 1) */
  presupuesto:            PresupuestoSMAE
  /** Equivalentes distribuidos por tiempo y grupo (Capa 2) */
  distribucion:           DistribucionTiemposSMAE
  /** Alimentos seleccionados por tiempo (Capa 3) */
  alimentos_por_tiempo:   AlimentosPorTiempo
  /** GET objetivo en kcal — referencia para el presupuesto */
  get_objetivo_kcal:      number

  // ── Derivados computados (useMemo) ────────────────────────────────────────
  /** Macros totales del día completo — suma de todos los equivalentes */
  macros_totales:         MacrosTotalesSMAE
  /** Macros por tiempo de comida — para vista de distribución */
  macros_por_tiempo:      MacrosTiempo[]
  /** Validación de distribución: ¿algún grupo excede su presupuesto? */
  validacion:             ResultadoValidacion
  /** % de cumplimiento del GET objetivo (0–100+) */
  porcentaje_get:         number

  // ── Capa 1 — Presupuesto ──────────────────────────────────────────────────
  /** Asigna equivalentes totales a un grupo SMAE para el día */
  asignarEquivalente:     (grupo: GrupoSMAE, cantidad: number) => void
  /** Incrementa en 1 el presupuesto de un grupo */
  incrementarGrupo:       (grupo: GrupoSMAE) => void
  /** Decrementa en 1 el presupuesto de un grupo (mínimo 0) */
  decrementarGrupo:       (grupo: GrupoSMAE) => void
  /** Define el GET objetivo del plan */
  setGetObjetivo:         (kcal: number) => void

  // ── Capa 2 — Distribución ─────────────────────────────────────────────────
  /**
   * Distribuye equivalentes de un grupo a un tiempo de comida.
   * Valida que no se exceda el presupuesto total del grupo.
   * Devuelve false si la operación viola el invariante.
   */
  distribuirEquivalente:  (tiempo: TiempoComida, grupo: GrupoSMAE, cantidad: number) => boolean
  /** Incrementa distribución en un tiempo/grupo (con validación) */
  incrementarDistribucion:(tiempo: TiempoComida, grupo: GrupoSMAE) => boolean
  /** Decrementa distribución en un tiempo/grupo (mínimo 0) */
  decrementarDistribucion:(tiempo: TiempoComida, grupo: GrupoSMAE) => void
  /** Obtiene el saldo disponible de un grupo considerando toda la distribución */
  obtenerSaldo:           (grupo: GrupoSMAE) => SaldoGrupo
  /** Obtiene el saldo disponible de un grupo EN un tiempo específico */
  obtenerSaldoTiempo:     (tiempo: TiempoComida, grupo: GrupoSMAE) => number

  // ── Capa 3 — Alimentos ────────────────────────────────────────────────────
  /**
   * Agrega un alimento seleccionado a un tiempo de comida.
   * Calcula automáticamente la fracción de equivalente y los macros.
   */
  agregarAlimento:        (tiempo: TiempoComida, alimento: AlimentoSMAE, fraccion: number) => void
  /** Elimina un alimento de un tiempo por su id_seleccion */
  quitarAlimento:         (tiempo: TiempoComida, id_seleccion: string) => void
  /** Obtiene todos los alimentos de un tiempo de comida */
  obtenerAlimentosTiempo: (tiempo: TiempoComida) => AlimentoSeleccionado[]

  // ── Reset ─────────────────────────────────────────────────────────────────
  /** Limpia todo el plan — presupuesto, distribución y alimentos */
  resetearPlan:           () => void
  /** Solo limpia la distribución y los alimentos, mantiene el presupuesto */
  resetearDistribucion:   () => void
}

/**
 * useSMAEPlanner — Hook principal del Planeador SMAE.
 *
 * @param get_inicial - GET objetivo inicial en kcal (puede actualizarse luego)
 *
 * @example
 * const {
 *   presupuesto, asignarEquivalente, macros_totales,
 *   distribuirEquivalente, agregarAlimento, validacion,
 * } = useSMAEPlanner(2000)
 */
export const useSMAEPlanner = (get_inicial = 0): UseSMAEPlannerReturn => {

  // ── Estado base ────────────────────────────────────────────────────────────
  const [presupuesto,          setPresupuesto]         = useState<PresupuestoSMAE>(presupuesto_inicial)
  const [distribucion,         setDistribucion]        = useState<DistribucionTiemposSMAE>(distribucion_inicial)
  const [alimentos_por_tiempo, setAlimentosPorTiempo]  = useState<AlimentosPorTiempo>(alimentos_inicial)
  const [get_objetivo_kcal,    setGetObjetivoInterno]  = useState<number>(get_inicial)

  // ── Capa 1 — Presupuesto ──────────────────────────────────────────────────

  const asignarEquivalente = useCallback((grupo: GrupoSMAE, cantidad: number): void => {
    if (cantidad < 0) return
    setPresupuesto((prev) => ({ ...prev, [grupo]: cantidad }))
  }, [])

  const incrementarGrupo = useCallback((grupo: GrupoSMAE): void => {
    setPresupuesto((prev) => ({ ...prev, [grupo]: prev[grupo] + 1 }))
  }, [])

  const decrementarGrupo = useCallback((grupo: GrupoSMAE): void => {
    setPresupuesto((prev) => ({
      ...prev,
      [grupo]: Math.max(0, prev[grupo] - 1),
    }))
  }, [])

  const setGetObjetivo = useCallback((kcal: number): void => {
    if (kcal >= 0) setGetObjetivoInterno(kcal)
  }, [])

  // ── Capa 2 — Distribución ─────────────────────────────────────────────────

  const distribuirEquivalente = useCallback((
    tiempo:   TiempoComida,
    grupo:    GrupoSMAE,
    cantidad: number,
  ): boolean => {
    if (cantidad < 0) return false

    // Calcular cuánto se está distribuyendo en OTROS tiempos (no el actual)
    const distribuido_otros = TIEMPOS_COMIDA
      .filter((t) => t !== tiempo)
      .reduce((suma, t) => suma + (distribucion[t][grupo] ?? 0), 0)

    // Invariante: distribuido_otros + nueva_cantidad ≤ presupuesto[grupo]
    if (distribuido_otros + cantidad > presupuesto[grupo]) {
      return false // Bloqueo — violación del invariante de la Capa 2
    }

    setDistribucion((prev) => ({
      ...prev,
      [tiempo]: { ...prev[tiempo], [grupo]: cantidad },
    }))
    return true
  }, [distribucion, presupuesto])

  const incrementarDistribucion = useCallback((
    tiempo: TiempoComida,
    grupo:  GrupoSMAE,
  ): boolean => {
    const actual = distribucion[tiempo][grupo] ?? 0
    return distribuirEquivalente(tiempo, grupo, actual + 1)
  }, [distribucion, distribuirEquivalente])

  const decrementarDistribucion = useCallback((
    tiempo: TiempoComida,
    grupo:  GrupoSMAE,
  ): void => {
    const actual = distribucion[tiempo][grupo] ?? 0
    if (actual <= 0) return
    setDistribucion((prev) => ({
      ...prev,
      [tiempo]: { ...prev[tiempo], [grupo]: actual - 1 },
    }))
  }, [distribucion])

  const obtenerSaldo = useCallback((grupo: GrupoSMAE): SaldoGrupo => {
    const distribuido = totalDistribuidoPorGrupo(distribucion, grupo)
    const disponible  = presupuesto[grupo] - distribuido
    return {
      grupo,
      presupuesto: presupuesto[grupo],
      distribuido,
      disponible:  Math.max(0, disponible),
      agotado:     disponible <= 0,
    }
  }, [distribucion, presupuesto])

  const obtenerSaldoTiempo = useCallback((
    tiempo: TiempoComida,
    grupo:  GrupoSMAE,
  ): number => {
    return distribucion[tiempo][grupo] ?? 0
  }, [distribucion])

  // ── Capa 3 — Alimentos ────────────────────────────────────────────────────

  const agregarAlimento = useCallback((
    tiempo:   TiempoComida,
    alimento: AlimentoSMAE,
    fraccion: number,
  ): void => {
    if (fraccion <= 0) return

    const macros_calculados = calcularMacrosFraccion(alimento.grupo_smae, fraccion)
    const cantidad_g        = Math.round(alimento.peso_neto_g * fraccion * 100) / 100

    const nueva_seleccion: AlimentoSeleccionado = {
      id_seleccion:         generarIdSeleccion(),
      id_alimento:          alimento.id,
      nombre:               alimento.nombre,
      grupo_smae:           alimento.grupo_smae,
      fraccion_equivalente: fraccion,
      cantidad_g,
      medida_casera:        alimento.medida_casera,
      macros:               macros_calculados,
    }

    setAlimentosPorTiempo((prev) => ({
      ...prev,
      [tiempo]: [...prev[tiempo], nueva_seleccion],
    }))
  }, [])

  const quitarAlimento = useCallback((
    tiempo:       TiempoComida,
    id_seleccion: string,
  ): void => {
    setAlimentosPorTiempo((prev) => ({
      ...prev,
      [tiempo]: prev[tiempo].filter((a) => a.id_seleccion !== id_seleccion),
    }))
  }, [])

  const obtenerAlimentosTiempo = useCallback((tiempo: TiempoComida): AlimentoSeleccionado[] => {
    return alimentos_por_tiempo[tiempo]
  }, [alimentos_por_tiempo])

  // ── Reset ─────────────────────────────────────────────────────────────────

  const resetearPlan = useCallback((): void => {
    setPresupuesto(presupuesto_inicial())
    setDistribucion(distribucion_inicial())
    setAlimentosPorTiempo(alimentos_inicial())
  }, [])

  const resetearDistribucion = useCallback((): void => {
    setDistribucion(distribucion_inicial())
    setAlimentosPorTiempo(alimentos_inicial())
  }, [])

  // ── Derivados con useMemo (cálculos puros sin efectos) ───────────────────

  /**
   * Macros totales del día: suma de (equivalentes × macros_por_grupo) para todos los grupos.
   * @source SMAE 5ª edición. Fomento de Nutrición y Salud A.C. 2014.
   */
  const macros_totales = useMemo((): MacrosTotalesSMAE => {
    return GRUPOS_SMAE_ORDENADOS.reduce(
      (acum, grupo) => {
        const equiv = presupuesto[grupo]
        if (equiv === 0) return acum
        const base = MACROS_POR_EQUIVALENTE[grupo]
        return {
          energia_kcal: acum.energia_kcal + base.energia_kcal * equiv,
          proteina_g:   acum.proteina_g   + base.proteina_g   * equiv,
          lipidos_g:    acum.lipidos_g    + base.lipidos_g    * equiv,
          hidratos_g:   acum.hidratos_g   + base.hidratos_g   * equiv,
          fibra_g:      acum.fibra_g      + (base.fibra_g ?? 0) * equiv,
        }
      },
      { energia_kcal: 0, proteina_g: 0, lipidos_g: 0, hidratos_g: 0, fibra_g: 0 },
    )
  }, [presupuesto])

  /**
   * Macros por tiempo de comida — basados en equivalentes distribuidos.
   */
  const macros_por_tiempo = useMemo((): MacrosTiempo[] => {
    return TIEMPOS_COMIDA.map((tiempo) => {
      const grupos_tiempo = distribucion[tiempo]
      const macros = Object.entries(grupos_tiempo).reduce(
        (acum, [grupo, equiv]) => {
          if (!equiv || equiv === 0) return acum
          const base = MACROS_POR_EQUIVALENTE[grupo as GrupoSMAE]
          return {
            energia_kcal: acum.energia_kcal + base.energia_kcal * equiv,
            proteina_g:   acum.proteina_g   + base.proteina_g   * equiv,
            lipidos_g:    acum.lipidos_g    + base.lipidos_g    * equiv,
            hidratos_g:   acum.hidratos_g   + base.hidratos_g   * equiv,
            fibra_g:      acum.fibra_g      + (base.fibra_g ?? 0) * equiv,
          }
        },
        { energia_kcal: 0, proteina_g: 0, lipidos_g: 0, hidratos_g: 0, fibra_g: 0 },
      )
      return { ...macros, tiempo }
    })
  }, [distribucion])

  /**
   * Validación de invariante Capa 2:
   * ∀ grupo: Σ(distribuido[tiempo][grupo]) ≤ presupuesto[grupo]
   * En teoría, la lógica de distribuirEquivalente ya lo previene,
   * pero esta validación actúa como guard de integridad para la UI.
   */
  const validacion = useMemo((): ResultadoValidacion => {
    const grupos_excedidos: GrupoSMAE[] = GRUPOS_SMAE_ORDENADOS.filter((grupo) => {
      const total_distribuido = totalDistribuidoPorGrupo(distribucion, grupo)
      return total_distribuido > presupuesto[grupo]
    })
    return {
      valido:          grupos_excedidos.length === 0,
      grupos_excedidos,
    }
  }, [distribucion, presupuesto])

  /**
   * % de cumplimiento del GET objetivo.
   * Verde: 95–105% | Amarillo: 90–94% y 106–110% | Rojo: <90% y >110%
   */
  const porcentaje_get = useMemo((): number => {
    if (get_objetivo_kcal <= 0) return 0
    return Math.round((macros_totales.energia_kcal / get_objetivo_kcal) * 100)
  }, [macros_totales.energia_kcal, get_objetivo_kcal])

  // ── Return ────────────────────────────────────────────────────────────────

  return {
    // Estado
    presupuesto,
    distribucion,
    alimentos_por_tiempo,
    get_objetivo_kcal,

    // Derivados
    macros_totales,
    macros_por_tiempo,
    validacion,
    porcentaje_get,

    // Capa 1
    asignarEquivalente,
    incrementarGrupo,
    decrementarGrupo,
    setGetObjetivo,

    // Capa 2
    distribuirEquivalente,
    incrementarDistribucion,
    decrementarDistribucion,
    obtenerSaldo,
    obtenerSaldoTiempo,

    // Capa 3
    agregarAlimento,
    quitarAlimento,
    obtenerAlimentosTiempo,

    // Reset
    resetearPlan,
    resetearDistribucion,
  }
}

export default useSMAEPlanner