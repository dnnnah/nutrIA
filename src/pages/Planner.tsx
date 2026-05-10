/**
 * Planner.tsx — Planeador SMAE
 * Proyecto NUTRIA — Open Source
 *
 * UI del planeador dietético con 4 tabs:
 *   1. Presupuesto  — Equivalentes por grupo (Capa 1)
 *   2. Distribución — Distribución por tiempo de comida (Capa 2)
 *   3. Alimentos    — Selector de alimentos por tiempo/grupo (Capa 3)
 *   4. Adecuación   — Semáforo prescrito vs plan armado
 *
 * DISEÑO: Apple HIG — Mobile-first, 390px base, responsive hasta 1280px.
 * Sin modales. Sin alertas. Feedback inline. Progressive Disclosure.
 * Touch targets mínimo 44×44px.
 *
 * @source SMAE 5ª edición. Fomento de Nutrición y Salud A.C. 2014.
 */

import { useEffect, useMemo, useState } from 'react'
import { LayoutGrid, Plus, Search, X, Utensils, BarChart3, Grid3x3, ClipboardList } from 'lucide-react'

import { useSMAEPlanner } from '../hooks/useSMAEPlanner'
import { useUIStore } from '../stores/ui.store'
import { GRUPOS_SMAE_INFO, GRUPO_INFO_MAP, MACROS_POR_EQUIVALENTE } from '../constants/smae.constants'
import type { GrupoSMAE } from '../types/food.types'
import type { TiempoComida } from '../types/plan.types'
import type { AlimentoSMAE } from '../types/food.types'

// ---------------------------------------------------------------------------
// Datos de alimentos — seed desde smae.json
// INTEGRACIÓN: Para conectar smae.json, añadir en vite.config.ts:
//   json() plugin, o agregar "resolveJsonModule": true en tsconfig.json
// Mientras tanto, los alimentos se reciben del store de Dexie (Fase 2).
// Para desarrollo: poblar este array con el seed de smae.json manualmente.
// ---------------------------------------------------------------------------

// Placeholder tipado — reemplazar con import real cuando resolveJsonModule esté activo
const ALIMENTOS_SMAE: AlimentoSMAE[] = []

// ===========================================================================
// CONSTANTES UI
// ===========================================================================

type TabId = 'presupuesto' | 'distribucion' | 'alimentos' | 'adecuacion'

interface Tab {
  id:     TabId
  label:  string
  icono:  React.ReactNode
}

const TABS: Tab[] = [
  { id: 'presupuesto',  label: 'Presupuesto',  icono: <Grid3x3   size={16} /> },
  { id: 'distribucion', label: 'Distribución', icono: <BarChart3  size={16} /> },
  { id: 'alimentos',    label: 'Alimentos',    icono: <Utensils   size={16} /> },
  { id: 'adecuacion',   label: 'Adecuación',   icono: <ClipboardList size={16} /> },
]

const TIEMPOS_INFO: Record<TiempoComida, { label: string; pct: number; icono: string }> = {
  desayuno:   { label: 'Desayuno',    pct: 25, icono: '🌅' },
  colacion_1: { label: 'Colación 1',  pct: 10, icono: '🍎' },
  comida:     { label: 'Comida',      pct: 35, icono: '☀️' },
  colacion_2: { label: 'Colación 2',  pct: 10, icono: '🥜' },
  cena:       { label: 'Cena',        pct: 20, icono: '🌙' },
}

const TIEMPOS_ORDENADOS: TiempoComida[] = [
  'desayuno', 'colacion_1', 'comida', 'colacion_2', 'cena',
]

// ===========================================================================
// HELPERS UI
// ===========================================================================

const redondear1 = (v: number) => Math.round(v * 10) / 10

/**
 * Color del semáforo de GET según % de adecuación.
 * @source Instrucciones Globales NUTRIA — Algoritmo de Semáforo de Adecuación
 */
const colorPorcentaje = (pct: number): string => {
  if (pct >= 95 && pct <= 105) return '#34C759'
  if ((pct >= 90 && pct < 95) || (pct > 105 && pct <= 110)) return '#FF9500'
  return '#FF3B30'
}

const bgPorcentaje = (pct: number): string => {
  if (pct >= 95 && pct <= 105) return '#F0FBF3'
  if ((pct >= 90 && pct < 95) || (pct > 105 && pct <= 110)) return '#FFF8EC'
  return '#FFF0F0'
}

// ===========================================================================
// SUB-COMPONENTES
// ===========================================================================

// ── Stepper ─────────────────────────────────────────────────────────────────

interface StepperProps {
  valor:       number
  onIncrement: () => void
  onDecrement: () => void
  max?:        number
  min?:        number
  disabled?:   boolean
}

const Stepper = ({ valor, onIncrement, onDecrement, max, min = 0, disabled }: StepperProps) => {
  const puedeDecrementar = valor > min
  const puedeIncrementar = max === undefined || valor < max

  return (
    <div className="flex items-center gap-1" role="group" aria-label={`Valor: ${valor}`}>
      <button
        aria-label="Disminuir"
        onClick={onDecrement}
        disabled={disabled || !puedeDecrementar}
        className={`
          w-[36px] h-[36px] rounded-[10px] flex items-center justify-center
          font-medium text-[17px] transition-all duration-100
          ${puedeDecrementar && !disabled
            ? 'bg-[#F2F2F7] text-[#1C1C1E] active:scale-95 active:bg-[#E5E5EA]'
            : 'bg-[#F2F2F7] text-[#C7C7CC] cursor-not-allowed'
          }
        `}
      >
        −
      </button>

      <span
        className="min-w-[28px] text-center text-[17px] font-semibold text-[#1C1C1E] tabular-nums"
        aria-live="polite"
      >
        {valor}
      </span>

      <button
        aria-label="Aumentar"
        onClick={onIncrement}
        disabled={disabled || !puedeIncrementar}
        className={`
          w-[36px] h-[36px] rounded-[10px] flex items-center justify-center
          font-medium text-[17px] transition-all duration-100
          ${puedeIncrementar && !disabled
            ? 'bg-[#007AFF] text-white active:scale-95 active:bg-[#0071EB]'
            : 'bg-[#F2F2F7] text-[#C7C7CC] cursor-not-allowed'
          }
        `}
      >
        +
      </button>
    </div>
  )
}

// ── Panel de macros resumen ──────────────────────────────────────────────────

interface MacroResumenProps {
  energia_kcal: number
  proteina_g:   number
  lipidos_g:    number
  hidratos_g:   number
  fibra_g:      number
  get_objetivo: number
}

const MacroResumen = ({
  energia_kcal, proteina_g, lipidos_g, hidratos_g, fibra_g, get_objetivo,
}: MacroResumenProps) => {
  const pct_get = get_objetivo > 0
    ? Math.round((energia_kcal / get_objetivo) * 100)
    : 0

  return (
    <div className="bg-white rounded-2xl border border-[#E5E5EA] p-4 shadow-sm">
      {/* Energía principal */}
      <div className="flex items-end justify-between mb-3">
        <div>
          <p className="text-[11px] font-medium text-[#8E8E93] uppercase tracking-[0.06em] mb-[2px]">
            Energía del plan
          </p>
          <p className="text-[28px] font-bold text-[#1C1C1E] leading-none tabular-nums">
            {Math.round(energia_kcal)}
            <span className="text-[15px] font-medium text-[#8E8E93] ml-1">kcal</span>
          </p>
        </div>

        {get_objetivo > 0 && (
          <div
            className="px-3 py-1.5 rounded-full text-[13px] font-semibold tabular-nums transition-colors"
            style={{
              color:           colorPorcentaje(pct_get),
              backgroundColor: bgPorcentaje(pct_get),
            }}
          >
            {pct_get}%
          </div>
        )}
      </div>

      {/* Barra de GET */}
      {get_objetivo > 0 && (
        <div className="mb-4">
          <div className="h-[6px] bg-[#F2F2F7] rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-[width] duration-500 ease-out"
              style={{
                width:           `${Math.min(pct_get, 110)}%`,
                backgroundColor: colorPorcentaje(pct_get),
              }}
            />
          </div>
          <div className="flex justify-between mt-1">
            <span className="text-[10px] text-[#8E8E93]">0 kcal</span>
            <span className="text-[10px] text-[#8E8E93]">
              Meta: {Math.round(get_objetivo)} kcal
            </span>
          </div>
        </div>
      )}

      {/* Grid macros */}
      <div className="grid grid-cols-4 gap-2">
        {[
          { label: 'Proteína', valor: proteina_g,  unidad: 'g',  color: '#007AFF' },
          { label: 'Lípidos',  valor: lipidos_g,   unidad: 'g',  color: '#FF9500' },
          { label: 'H.C.',     valor: hidratos_g,  unidad: 'g',  color: '#34C759' },
          { label: 'Fibra',    valor: fibra_g,     unidad: 'g',  color: '#8E8E93' },
        ].map(({ label, valor, unidad, color }) => (
          <div key={label} className="bg-[#F2F2F7] rounded-[10px] p-2 text-center">
            <p
              className="text-[15px] font-bold tabular-nums leading-none mb-[2px]"
              style={{ color }}
            >
              {redondear1(valor)}
            </p>
            <p className="text-[10px] text-[#8E8E93]">{label}</p>
            <p className="text-[9px] text-[#8E8E93]">{unidad}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Card de grupo SMAE ───────────────────────────────────────────────────────

interface GrupoCardProps {
  grupo:       GrupoSMAE
  equivalentes:number
  onIncrement: () => void
  onDecrement: () => void
}

const GrupoCard = ({ grupo, equivalentes, onIncrement, onDecrement }: GrupoCardProps) => {
  const info   = GRUPO_INFO_MAP[grupo]
  const macros = MACROS_POR_EQUIVALENTE[grupo]
  const kcal_total = macros.energia_kcal * equivalentes

  return (
    <div
      className={`
        bg-white rounded-2xl border p-4 transition-all duration-200
        ${equivalentes > 0
          ? 'border-[color:var(--color-border-secondary,#C6C6C8)] shadow-sm'
          : 'border-[#F2F2F7]'
        }
      `}
      style={{
        borderLeftWidth: equivalentes > 0 ? 3 : 1,
        borderLeftColor: equivalentes > 0 ? info.color : '#F2F2F7',
      }}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="text-[22px] leading-none flex-shrink-0" aria-hidden="true">
            {info.icono}
          </span>
          <div className="min-w-0">
            <p className="text-[14px] font-semibold text-[#1C1C1E] leading-tight truncate">
              {info.nombre}
            </p>
            {equivalentes > 0 && (
              <p className="text-[11px] tabular-nums mt-[1px]" style={{ color: info.color }}>
                {Math.round(kcal_total)} kcal totales
              </p>
            )}
          </div>
        </div>

        <Stepper
          valor={equivalentes}
          onIncrement={onIncrement}
          onDecrement={onDecrement}
        />
      </div>

      {/* Macros por equivalente — referencia rápida */}
      {equivalentes > 0 && (
        <div className="flex gap-2 flex-wrap">
          {macros.proteina_g > 0 && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#EEF5FF] text-[#0055CC] font-medium">
              P {macros.proteina_g}g
            </span>
          )}
          {macros.lipidos_g > 0 && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#FFF8EC] text-[#B45309] font-medium">
              G {macros.lipidos_g}g
            </span>
          )}
          {macros.hidratos_g > 0 && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#F0FBF3] text-[#1B7A34] font-medium">
              HC {macros.hidratos_g}g
            </span>
          )}
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#F2F2F7] text-[#8E8E93] font-medium">
            × {equivalentes} equiv.
          </span>
        </div>
      )}
    </div>
  )
}

// ===========================================================================
// TAB 1 — PRESUPUESTO
// ===========================================================================

interface TabPresupuestoProps {
  get_objetivo:   number
  setGetObjetivo: (v: number) => void
  presupuesto:    Record<GrupoSMAE, number>
  onIncrement:    (g: GrupoSMAE) => void
  onDecrement:    (g: GrupoSMAE) => void
  macros_totales: {
    energia_kcal: number
    proteina_g:   number
    lipidos_g:    number
    hidratos_g:   number
    fibra_g:      number
  }
}

const TabPresupuesto = ({
  get_objetivo, setGetObjetivo,
  presupuesto, onIncrement, onDecrement, macros_totales,
}: TabPresupuestoProps) => {
  const [input_get, setInputGet] = useState(get_objetivo > 0 ? String(get_objetivo) : '')

  const handleGetSubmit = () => {
    const parsed = parseFloat(input_get)
    if (!isNaN(parsed) && parsed > 0) setGetObjetivo(parsed)
  }

  return (
    <div className="space-y-4">
      {/* Input GET objetivo */}
      <div className="bg-white rounded-2xl border border-[#E5E5EA] p-4 shadow-sm">
        <label
          htmlFor="get-input"
          className="block text-[13px] font-semibold text-[#1C1C1E] mb-1"
        >
          Gasto Energético Total (GET) objetivo
        </label>
        <p className="text-[12px] text-[#8E8E93] mb-3">
          Calculado desde la sección Calculadora. Ingrésalo manualmente si no lo tienes.
        </p>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <input
              id="get-input"
              type="number"
              inputMode="decimal"
              value={input_get}
              onChange={(e) => setInputGet(e.target.value)}
              onBlur={handleGetSubmit}
              onKeyDown={(e) => e.key === 'Enter' && handleGetSubmit()}
              placeholder="Ej: 2000"
              min={500}
              max={6000}
              aria-label="GET objetivo en kilocalorías"
              className="
                w-full h-[44px] px-4 rounded-[10px] border border-[#E5E5EA]
                text-[17px] font-medium text-[#1C1C1E]
                placeholder:text-[#C7C7CC] focus:outline-none
                focus:border-[#007AFF] focus:ring-2 focus:ring-[#007AFF]/20
                transition-colors
              "
            />
          </div>
          <span className="self-center text-[14px] text-[#8E8E93] font-medium pr-1">kcal</span>
        </div>
      </div>

      {/* Panel resumen macros */}
      <MacroResumen
        {...macros_totales}
        get_objetivo={get_objetivo}
      />

      {/* Grid de grupos SMAE */}
      <div>
        <p className="text-[11px] font-semibold text-[#8E8E93] uppercase tracking-[0.07em] mb-3 px-1">
          Grupos SMAE — Equivalentes del día
        </p>

        <div className="space-y-2">
          {GRUPOS_SMAE_INFO
            .filter((g) => g.grupo !== 'libres') // Libres no necesitan stepper
            .map((info) => (
              <GrupoCard
                key={info.grupo}
                grupo={info.grupo}
                equivalentes={presupuesto[info.grupo]}
                onIncrement={() => onIncrement(info.grupo)}
                onDecrement={() => onDecrement(info.grupo)}
              />
            ))}
        </div>
      </div>
    </div>
  )
}

// ===========================================================================
// TAB 2 — DISTRIBUCIÓN
// ===========================================================================

interface TabDistribucionProps {
  presupuesto:          Record<GrupoSMAE, number>
  distribucion:         Record<TiempoComida, Partial<Record<GrupoSMAE, number>>>
  onIncrementar:        (tiempo: TiempoComida, grupo: GrupoSMAE) => boolean
  onDecrementar:        (tiempo: TiempoComida, grupo: GrupoSMAE) => void
  obtenerSaldo:         (grupo: GrupoSMAE) => { distribuido: number; presupuesto: number }
}

const TabDistribucion = ({
  presupuesto, distribucion, onIncrementar, onDecrementar, obtenerSaldo,
}: TabDistribucionProps) => {
  const [tiempo_activo, setTiempoActivo] = useState<TiempoComida>('desayuno')

  // Grupos con presupuesto asignado — únicos relevantes
  const grupos_con_presupuesto = GRUPOS_SMAE_INFO.filter(
    (g) => presupuesto[g.grupo] > 0 && g.grupo !== 'libres'
  )

  // Sin presupuesto: estado vacío global
  if (grupos_con_presupuesto.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="text-[40px] mb-3" aria-hidden="true">🫙</div>
        <p className="text-[15px] font-semibold text-[#1C1C1E] mb-1">
          Sin presupuesto asignado
        </p>
        <p className="text-[13px] text-[#8E8E93] max-w-[260px]">
          Primero asigna equivalentes en la tab Presupuesto
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Chips de tiempo */}
      <div
        className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1"
        role="tablist"
        aria-label="Tiempos de comida"
      >
        {TIEMPOS_ORDENADOS.map((tiempo) => {
          const info   = TIEMPOS_INFO[tiempo]
          const activo = tiempo === tiempo_activo
          // Badge: total de equivalentes asignados en ese tiempo
          const total_en_tiempo = grupos_con_presupuesto.reduce(
            (sum, g) => sum + (distribucion[tiempo][g.grupo] ?? 0), 0
          )
          return (
            <button
              key={tiempo}
              role="tab"
              aria-selected={activo}
              onClick={() => setTiempoActivo(tiempo)}
              className={`
                flex-shrink-0 flex items-center gap-1.5 px-3 h-[36px]
                rounded-full text-[13px] font-medium transition-all duration-150
                ${activo
                  ? 'bg-[#007AFF] text-white shadow-sm'
                  : 'bg-[#F2F2F7] text-[#3C3C43]'
                }
              `}
            >
              <span aria-hidden="true">{info.icono}</span>
              <span>{info.label}</span>
              {total_en_tiempo > 0 && (
                <span
                  className={`
                    text-[11px] font-semibold px-1.5 py-0.5 rounded-full tabular-nums
                    ${activo ? 'bg-white/20 text-white' : 'bg-[#007AFF]/10 text-[#007AFF]'}
                  `}
                >
                  {total_en_tiempo}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Tarjeta de distribución del tiempo activo */}
      <div className="bg-white rounded-2xl border border-[#E5E5EA] p-4 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <p className="text-[13px] font-semibold text-[#1C1C1E]">
            {TIEMPOS_INFO[tiempo_activo].icono} {TIEMPOS_INFO[tiempo_activo].label}
          </p>
          <span className="text-[12px] text-[#8E8E93]">
            Meta: {TIEMPOS_INFO[tiempo_activo].pct}% del total
          </span>
        </div>

        <div className="space-y-4">
          {grupos_con_presupuesto.map(({ grupo, icono, nombre_corto, color }) => {
            const saldo        = obtenerSaldo(grupo)           // { distribuido, presupuesto }
            const en_tiempo    = distribucion[tiempo_activo][grupo] ?? 0
            // Disponible = lo que queda sin distribuir + lo ya puesto en este tiempo
            const disponible   = (saldo.presupuesto - saldo.distribuido) + en_tiempo
            // Barra: porcentaje que representa este tiempo sobre el presupuesto total del grupo
            const pct_tiempo   = saldo.presupuesto > 0
              ? Math.round((en_tiempo / saldo.presupuesto) * 100)
              : 0
            // Porcentaje global del grupo (cuánto del presupuesto total ya se distribuyó)
            const pct_global   = saldo.presupuesto > 0
              ? Math.round((saldo.distribuido / saldo.presupuesto) * 100)
              : 0

            return (
              <div key={grupo}>
                {/* Nombre + saldo disponible + stepper */}
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="text-[15px] flex-shrink-0" aria-hidden="true">{icono}</span>
                    <span className="text-[13px] font-medium text-[#1C1C1E] truncate">{nombre_corto}</span>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {/* Saldo disponible para poner en cualquier tiempo */}
                    <span className="text-[12px] text-[#8E8E93] tabular-nums">
                      {disponible > 0
                        ? `${disponible} disponible${disponible !== 1 ? 's' : ''}`
                        : 'sin saldo'
                      }
                    </span>
                    <Stepper
                      valor={en_tiempo}
                      onIncrement={() => onIncrementar(tiempo_activo, grupo)}
                      onDecrement={() => onDecrementar(tiempo_activo, grupo)}
                      max={saldo.presupuesto}   // el hook bloquea si no hay saldo real
                    />
                  </div>
                </div>

                {/* Barra segmentada: porción en este tiempo (color vivo) + resto distribuido (gris claro) */}
                <div className="relative h-[6px] bg-[#F2F2F7] rounded-full overflow-hidden">
                  {/* Resto distribuido en otros tiempos */}
                  <div
                    className="absolute left-0 top-0 h-full rounded-full opacity-30"
                    style={{
                      width: `${Math.min(pct_global, 100)}%`,
                      backgroundColor: color,
                    }}
                  />
                  {/* Porción en este tiempo (encima, opaco) */}
                  <div
                    className="absolute left-0 top-0 h-full rounded-full transition-[width] duration-300"
                    style={{
                      width: `${Math.min(pct_tiempo, 100)}%`,
                      backgroundColor: en_tiempo > 0 ? color : 'transparent',
                    }}
                  />
                </div>

                {/* Etiqueta de estado */}
                <div className="flex items-center justify-between mt-1">
                  <span className="text-[11px] text-[#8E8E93] tabular-nums">
                    {en_tiempo} de {saldo.presupuesto} equiv. en este tiempo
                  </span>
                  {pct_global > 100 && (
                    <span className="text-[11px] text-[#FF3B30] font-medium" role="alert">
                      ⚠ Excede el presupuesto
                    </span>
                  )}
                  {pct_global === 100 && (
                    <span className="text-[11px] text-[#34C759] font-medium">
                      ✓ Distribuido completo
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Resumen global — mini chips por grupo */}
      <div className="bg-white rounded-2xl border border-[#E5E5EA] px-4 py-3 shadow-sm">
        <p className="text-[11px] font-semibold text-[#8E8E93] uppercase tracking-[0.07em] mb-3">
          Saldo restante del día
        </p>
        <div className="flex flex-wrap gap-2">
          {grupos_con_presupuesto.map(({ grupo, icono, nombre_corto, color }) => {
            const saldo      = obtenerSaldo(grupo)
            const restante   = saldo.presupuesto - saldo.distribuido
            const completo   = restante === 0
            return (
              <div
                key={grupo}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full border text-[12px] font-medium tabular-nums"
                style={{
                  borderColor: completo ? '#34C759' : color + '40',
                  background:  completo ? '#F0FBF3' : color + '10',
                  color:       completo ? '#1B7A34' : '#1C1C1E',
                }}
              >
                <span aria-hidden="true">{icono}</span>
                <span>{nombre_corto}</span>
                <span className="font-semibold" style={{ color: completo ? '#1B7A34' : color }}>
                  {restante}/{saldo.presupuesto}
                </span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ===========================================================================
// TAB 3 — ALIMENTOS
// ===========================================================================

interface AlimentoCardProps {
  alimento:    AlimentoSMAE
  onAgregar:   (alimento: AlimentoSMAE, fraccion: number) => void
}

const AlimentoCard = ({ alimento, onAgregar }: AlimentoCardProps) => {
  const [fraccion, setFraccion] = useState(1)
  const info = GRUPO_INFO_MAP[alimento.grupo_smae]

  const kcal_fraccion = Math.round(alimento.energia_kcal * fraccion)

  return (
    <div className="bg-white rounded-2xl border border-[#E5E5EA] p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 mb-0.5">
            <span className="text-[14px]" aria-hidden="true">{info.icono}</span>
            <p className="text-[14px] font-semibold text-[#1C1C1E] truncate">
              {alimento.nombre}
            </p>
          </div>
          <p className="text-[12px] text-[#8E8E93]">
            {alimento.medida_casera} · {Math.round(alimento.peso_neto_g * fraccion)}g
          </p>
          <p className="text-[13px] font-medium mt-1" style={{ color: info.color }}>
            {kcal_fraccion} kcal
          </p>
        </div>

        <div className="flex flex-col items-end gap-2">
          <Stepper
            valor={fraccion}
            onIncrement={() => setFraccion((f) => Math.round((f + 0.5) * 10) / 10)}
            onDecrement={() => setFraccion((f) => Math.max(0.5, Math.round((f - 0.5) * 10) / 10))}
            min={0.5}
          />
          <button
            aria-label={`Agregar ${alimento.nombre}`}
            onClick={() => onAgregar(alimento, fraccion)}
            className="
              flex items-center gap-1 px-3 h-[36px] rounded-[10px]
              bg-[#007AFF] text-white text-[13px] font-semibold
              transition-all duration-100 active:scale-95 active:bg-[#0071EB]
            "
          >
            <Plus size={14} />
            Agregar
          </button>
        </div>
      </div>
    </div>
  )
}

interface TabAlimentosProps {
  distribucion:         Record<TiempoComida, Partial<Record<GrupoSMAE, number>>>
  alimentos_por_tiempo: Record<TiempoComida, Array<{
    id_seleccion: string; nombre: string; grupo_smae: GrupoSMAE;
    fraccion_equivalente: number; cantidad_g: number;
    macros: { energia_kcal: number; proteina_g: number; lipidos_g: number; hidratos_g: number }
  }>>
  onAgregar:            (tiempo: TiempoComida, alimento: AlimentoSMAE, fraccion: number) => void
  onQuitar:             (tiempo: TiempoComida, id_seleccion: string) => void
}

const TabAlimentos = ({
  distribucion, alimentos_por_tiempo, onAgregar, onQuitar,
}: TabAlimentosProps) => {
  const [tiempo_activo, setTiempoActivo] = useState<TiempoComida>('desayuno')
  const [busqueda, setBusqueda]          = useState('')
  const [grupo_filtro, setGrupoFiltro]   = useState<GrupoSMAE | null>(null)

  // Grupos con equivalentes asignados en el tiempo activo
  const grupos_en_tiempo = useMemo(() =>
    GRUPOS_SMAE_INFO.filter((g) =>
      (distribucion[tiempo_activo][g.grupo] ?? 0) > 0 && g.grupo !== 'libres'
    ), [tiempo_activo, distribucion]
  )

  // Alimentos filtrados por grupo y búsqueda
  const alimentos_filtrados = useMemo(() => {
    const grupo_efectivo = grupo_filtro ?? grupos_en_tiempo[0]?.grupo
    if (!grupo_efectivo) return []

    return ALIMENTOS_SMAE.filter((a) => {
      const coincide_grupo  = a.grupo_smae === grupo_efectivo
      const coincide_buscar = busqueda.trim() === '' ||
        a.nombre.toLowerCase().includes(busqueda.toLowerCase())
      return coincide_grupo && coincide_buscar
    })
  }, [grupo_filtro, grupos_en_tiempo, busqueda])

  const grupo_activo_efectivo = grupo_filtro ?? grupos_en_tiempo[0]?.grupo

  if (grupos_en_tiempo.length === 0) {
    return (
      <div className="space-y-4">
        {/* Selector de tiempo */}
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
          {TIEMPOS_ORDENADOS.map((tiempo) => {
            const info   = TIEMPOS_INFO[tiempo]
            const activo = tiempo === tiempo_activo
            return (
              <button
                key={tiempo}
                onClick={() => { setTiempoActivo(tiempo); setGrupoFiltro(null); setBusqueda('') }}
                className={`
                  flex-shrink-0 flex items-center gap-1.5 px-3 h-[36px]
                  rounded-full text-[13px] font-medium transition-all duration-150
                  ${activo ? 'bg-[#007AFF] text-white' : 'bg-[#F2F2F7] text-[#3C3C43]'}
                `}
              >
                <span>{info.icono}</span>
                <span>{info.label}</span>
              </button>
            )
          })}
        </div>
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="text-[36px] mb-3" aria-hidden="true">🍽️</div>
          <p className="text-[15px] font-semibold text-[#1C1C1E] mb-1">
            Sin equivalentes distribuidos
          </p>
          <p className="text-[13px] text-[#8E8E93] max-w-[240px]">
            Ve a Distribución y asigna equivalentes a este tiempo de comida.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Selector de tiempo */}
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
        {TIEMPOS_ORDENADOS.map((tiempo) => {
          const info        = TIEMPOS_INFO[tiempo]
          const activo      = tiempo === tiempo_activo
          const n_alimentos = alimentos_por_tiempo[tiempo].length
          return (
            <button
              key={tiempo}
              onClick={() => { setTiempoActivo(tiempo); setGrupoFiltro(null); setBusqueda('') }}
              className={`
                flex-shrink-0 flex items-center gap-1.5 px-3 h-[36px]
                rounded-full text-[13px] font-medium transition-all duration-150
                ${activo ? 'bg-[#007AFF] text-white' : 'bg-[#F2F2F7] text-[#3C3C43]'}
              `}
            >
              <span>{info.icono}</span>
              <span>{info.label}</span>
              {n_alimentos > 0 && (
                <span className={`
                  text-[11px] px-1.5 py-0.5 rounded-full font-semibold tabular-nums
                  ${activo ? 'bg-white/20 text-white' : 'bg-[#007AFF]/10 text-[#007AFF]'}
                `}>
                  {n_alimentos}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Chips de grupos en el tiempo activo */}
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
        {grupos_en_tiempo.map(({ grupo, icono, nombre_corto, color }) => {
          const activo = grupo_activo_efectivo === grupo
          return (
            <button
              key={grupo}
              onClick={() => { setGrupoFiltro(grupo); setBusqueda('') }}
              className={`
                flex-shrink-0 flex items-center gap-1.5 px-3 h-[34px]
                rounded-full text-[12px] font-medium transition-all duration-150 border
                ${activo
                  ? 'text-white border-transparent'
                  : 'bg-white text-[#3C3C43] border-[#E5E5EA]'
                }
              `}
              style={activo ? { backgroundColor: color, borderColor: color } : {}}
            >
              <span aria-hidden="true">{icono}</span>
              <span>{nombre_corto}</span>
            </button>
          )
        })}
      </div>

      {/* Buscador */}
      <div className="relative">
        <Search
          size={16}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8E8E93] pointer-events-none"
          aria-hidden="true"
        />
        <input
          type="search"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder={`Buscar en ${GRUPO_INFO_MAP[grupo_activo_efectivo ?? 'verduras'].nombre}…`}
          aria-label="Buscar alimento"
          className="
            w-full h-[44px] pl-9 pr-4 rounded-[12px] border border-[#E5E5EA]
            bg-white text-[15px] text-[#1C1C1E] placeholder:text-[#C7C7CC]
            focus:outline-none focus:border-[#007AFF] focus:ring-2 focus:ring-[#007AFF]/20
            transition-colors
          "
        />
      </div>

      {/* Lista de alimentos */}
      <div className="space-y-2">
        {alimentos_filtrados.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-[14px] text-[#8E8E93]">
              {busqueda ? `Sin resultados para "${busqueda}"` : 'Sin alimentos en este grupo'}
            </p>
          </div>
        ) : (
          alimentos_filtrados.map((alimento) => (
            <AlimentoCard
              key={alimento.id}
              alimento={alimento}
              onAgregar={(a, f) => onAgregar(tiempo_activo, a, f)}
            />
          ))
        )}
      </div>

      {/* Alimentos agregados en este tiempo */}
      {alimentos_por_tiempo[tiempo_activo].length > 0 && (
        <div>
          <p className="text-[11px] font-semibold text-[#8E8E93] uppercase tracking-[0.07em] mb-2 px-1">
            Agregados en {TIEMPOS_INFO[tiempo_activo].label}
          </p>
          <div className="space-y-2">
            {alimentos_por_tiempo[tiempo_activo].map((sel) => {
              const info = GRUPO_INFO_MAP[sel.grupo_smae]
              return (
                <div
                  key={sel.id_seleccion}
                  className="
                    bg-white rounded-[12px] border border-[#E5E5EA]
                    flex items-center gap-3 px-4 py-3
                  "
                >
                  <span className="text-[16px]" aria-hidden="true">{info.icono}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-medium text-[#1C1C1E] truncate">
                      {sel.nombre}
                    </p>
                    <p className="text-[11px] text-[#8E8E93] tabular-nums">
                      {sel.fraccion_equivalente} eq · {Math.round(sel.cantidad_g)}g · {Math.round(sel.macros.energia_kcal)} kcal
                    </p>
                  </div>
                  <button
                    aria-label={`Quitar ${sel.nombre}`}
                    onClick={() => onQuitar(tiempo_activo, sel.id_seleccion)}
                    className="
                      w-[30px] h-[30px] rounded-full bg-[#F2F2F7]
                      flex items-center justify-center text-[#FF3B30]
                      transition-all active:scale-90 flex-shrink-0
                    "
                  >
                    <X size={14} />
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

// ===========================================================================
// TAB 4 — ADECUACIÓN
// ===========================================================================

interface TabAdecuacionProps {
  macros_totales:  {
    energia_kcal: number; proteina_g: number; lipidos_g: number; hidratos_g: number; fibra_g: number;
  }
  get_objetivo:    number
  porcentaje_get:  number
  macros_por_tiempo: Array<{
    tiempo:       TiempoComida
    energia_kcal: number
    proteina_g:   number
    lipidos_g:    number
    hidratos_g:   number
  }>
}

const TabAdecuacion = ({ macros_totales, get_objetivo, porcentaje_get, macros_por_tiempo }: TabAdecuacionProps) => {
  const nutrientes = [
    { id: 'energia', label: 'Energía',   prescrito: get_objetivo,             consumido: macros_totales.energia_kcal, unidad: 'kcal' },
    { id: 'prot',    label: 'Proteína',  prescrito: get_objetivo > 0 ? Math.round(get_objetivo * 0.15 / 4) : 0, consumido: macros_totales.proteina_g, unidad: 'g' },
    { id: 'lip',     label: 'Lípidos',   prescrito: get_objetivo > 0 ? Math.round(get_objetivo * 0.30 / 9) : 0, consumido: macros_totales.lipidos_g,  unidad: 'g' },
    { id: 'hc',      label: 'H.C.',      prescrito: get_objetivo > 0 ? Math.round(get_objetivo * 0.55 / 4) : 0, consumido: macros_totales.hidratos_g, unidad: 'g' },
    { id: 'fibra',   label: 'Fibra',     prescrito: get_objetivo > 0 ? Math.round(get_objetivo / 1000 * 14) : 0, consumido: macros_totales.fibra_g,   unidad: 'g' },
  ]

  if (get_objetivo <= 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="text-[40px] mb-3" aria-hidden="true">📊</div>
        <p className="text-[15px] font-semibold text-[#1C1C1E] mb-1">
          Define el GET objetivo
        </p>
        <p className="text-[13px] text-[#8E8E93] max-w-[260px]">
          Ingresa el GET en la pestaña Presupuesto para ver la adecuación del plan.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Resumen global */}
      <div
        className="rounded-2xl p-4 border"
        style={{
          backgroundColor: bgPorcentaje(porcentaje_get),
          borderColor:     colorPorcentaje(porcentaje_get) + '40',
        }}
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[12px] font-semibold text-[#8E8E93] uppercase tracking-[0.06em]">
              Adecuación energética
            </p>
            <p className="text-[28px] font-bold tabular-nums leading-tight" style={{ color: colorPorcentaje(porcentaje_get) }}>
              {porcentaje_get}%
            </p>
          </div>
          <div className="text-right">
            <p className="text-[13px] text-[#8E8E93]">Meta: {Math.round(get_objetivo)} kcal</p>
            <p className="text-[15px] font-semibold text-[#1C1C1E]">
              {Math.round(macros_totales.energia_kcal)} kcal
            </p>
          </div>
        </div>
      </div>

      {/* Filas de nutrientes */}
      <div className="space-y-2">
        {nutrientes.map(({ id, label, prescrito, consumido, unidad }) => {
          if (prescrito <= 0) return null
          const pct   = Math.round((consumido / prescrito) * 100)
          const color = colorPorcentaje(pct)
          const bg    = bgPorcentaje(pct)

          return (
            <div
              key={id}
              className="bg-white rounded-2xl border border-[#E5E5EA] px-4 py-3 shadow-sm"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-[14px] font-semibold text-[#1C1C1E]">{label}</span>
                <div className="flex items-center gap-2">
                  <span className="text-[13px] text-[#8E8E93] tabular-nums">
                    {redondear1(consumido)} / {Math.round(prescrito)} {unidad}
                  </span>
                  <span
                    className="text-[12px] font-semibold px-2 py-0.5 rounded-full tabular-nums"
                    style={{ color, backgroundColor: bg }}
                  >
                    {pct}%
                  </span>
                </div>
              </div>
              <div className="h-[5px] bg-[#F2F2F7] rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-[width] duration-500"
                  style={{ width: `${Math.min(pct, 110)}%`, backgroundColor: color }}
                />
              </div>
            </div>
          )
        })}
      </div>

      {/* Distribución calórica por tiempo */}
      <div>
        <p className="text-[11px] font-semibold text-[#8E8E93] uppercase tracking-[0.07em] mb-2 px-1">
          Distribución por tiempo de comida
        </p>
        <div className="space-y-2">
          {macros_por_tiempo.map(({ tiempo, energia_kcal }) => {
            const info = TIEMPOS_INFO[tiempo]
            const pct_del_total = macros_totales.energia_kcal > 0
              ? Math.round((energia_kcal / macros_totales.energia_kcal) * 100)
              : 0

            return (
              <div key={tiempo} className="bg-white rounded-[12px] border border-[#E5E5EA] px-4 py-3">
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-[14px]" aria-hidden="true">{info.icono}</span>
                    <span className="text-[13px] font-medium text-[#1C1C1E]">{info.label}</span>
                    <span className="text-[11px] text-[#8E8E93]">meta {info.pct}%</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[13px] font-semibold text-[#1C1C1E] tabular-nums">
                      {Math.round(energia_kcal)} kcal
                    </span>
                    <span className="text-[11px] text-[#8E8E93] tabular-nums">
                      {pct_del_total}%
                    </span>
                  </div>
                </div>
                <div className="h-[4px] bg-[#F2F2F7] rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-[width] duration-500"
                    style={{
                      width:           `${Math.min(pct_del_total, 50)}%`,
                      backgroundColor: Math.abs(pct_del_total - info.pct) <= 5 ? '#34C759' : '#FF9500',
                    }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ===========================================================================
// COMPONENTE PRINCIPAL — Planner
// ===========================================================================

export default function Planner() {
  const [tab_activo, setTabActivo] = useState<TabId>('presupuesto')

  const {
    presupuesto,
    distribucion,
    alimentos_por_tiempo,
    get_objetivo_kcal,
    macros_totales,
    macros_por_tiempo,
    porcentaje_get,
    incrementarGrupo,
    decrementarGrupo,
    setGetObjetivo,
    incrementarDistribucion,
    decrementarDistribucion,
    obtenerSaldo,
    agregarAlimento,
    quitarAlimento,
    resetearPlan,
  } = useSMAEPlanner()

  // ── Pre-llenar GET desde Calculator ─────────────────────────────────────
  const { get_calculado, clearGetCalculado } = useUIStore()
  useEffect(() => {
    if (get_calculado !== null && get_calculado > 0) {
      setGetObjetivo(get_calculado)
      clearGetCalculado()  // consumir una sola vez
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="max-w-2xl mx-auto px-4 pt-6 pb-24 md:px-6 md:pt-8">

      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: '#EEF4FF' }}
              aria-hidden="true"
            >
              <LayoutGrid size={20} color="#007AFF" />
            </div>
            <h1 className="text-[22px] font-semibold text-[#1C1C1E] leading-tight">
              Planeador SMAE
            </h1>
          </div>
          <p className="text-[13px] text-[#8E8E93] ml-[52px] leading-relaxed">
            Sistema Mexicano de Alimentos Equivalentes · 5ª Ed.
          </p>
        </div>

        <button
          aria-label="Reiniciar plan completo"
          onClick={resetearPlan}
          className="
            px-3 h-[36px] rounded-[10px] bg-[#F2F2F7]
            text-[13px] font-medium text-[#FF3B30]
            transition-all active:scale-95
          "
        >
          Limpiar
        </button>
      </div>

      {/* ── Tabs ──────────────────────────────────────────────────────────── */}
      <div
        className="flex bg-[#F2F2F7] rounded-[14px] p-1 mb-6"
        role="tablist"
        aria-label="Secciones del planeador"
      >
        {TABS.map(({ id, label, icono }) => {
          const activo = id === tab_activo
          return (
            <button
              key={id}
              role="tab"
              aria-selected={activo}
              aria-controls={`panel-${id}`}
              onClick={() => setTabActivo(id)}
              className={`
                flex-1 flex flex-col items-center justify-center gap-0.5
                py-2 px-1 rounded-[10px] transition-all duration-200
                text-[10px] font-semibold
                ${activo
                  ? 'bg-white shadow-sm text-[#007AFF]'
                  : 'text-[#8E8E93]'
                }
              `}
            >
              {icono}
              <span className="leading-none mt-0.5">{label}</span>
            </button>
          )
        })}
      </div>

      {/* ── Contenido de tabs ─────────────────────────────────────────────── */}
      <div id={`panel-${tab_activo}`} role="tabpanel">
        {tab_activo === 'presupuesto' && (
          <TabPresupuesto
            get_objetivo={get_objetivo_kcal}
            setGetObjetivo={setGetObjetivo}
            presupuesto={presupuesto}
            onIncrement={incrementarGrupo}
            onDecrement={decrementarGrupo}
            macros_totales={macros_totales}
          />
        )}

        {tab_activo === 'distribucion' && (
          <TabDistribucion
            presupuesto={presupuesto}
            distribucion={distribucion}
            onIncrementar={incrementarDistribucion}
            onDecrementar={decrementarDistribucion}
            obtenerSaldo={obtenerSaldo}
          />
        )}

        {tab_activo === 'alimentos' && (
          <TabAlimentos
            distribucion={distribucion}
            alimentos_por_tiempo={alimentos_por_tiempo}
            onAgregar={agregarAlimento}
            onQuitar={quitarAlimento}
          />
        )}

        {tab_activo === 'adecuacion' && (
          <TabAdecuacion
            macros_totales={macros_totales}
            get_objetivo={get_objetivo_kcal}
            porcentaje_get={porcentaje_get}
            macros_por_tiempo={macros_por_tiempo}
          />
        )}
      </div>
    </div>
  )
}