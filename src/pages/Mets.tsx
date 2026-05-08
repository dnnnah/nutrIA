/**
 * Mets.tsx — Calculadora METs (Gasto energético por actividad física)
 * Proyecto NUTRIA — Open Source
 *
 * Funcionalidades:
 *   1. Datos base: peso y duración
 *   2. Buscador local sobre mets.json (100+ actividades, sin red)
 *   3. Cards seleccionables agrupadas por categoría
 *   4. Resultado en tiempo real con equivalencia
 *   5. Comparador de hasta 3 actividades (modo paralelo)
 *
 * @source Ainsworth BE, Haskell WL, Herrmann SD, et al. (2011).
 *         2011 Compendium of Physical Activities.
 *         Med Sci Sports Exerc, 43(8):1575-1581.
 * @source Jetté M, Sidney K, Blümchen G. (1990).
 *         Metabolic equivalents (METS) in exercise testing.
 *         Clin Cardiol, 13(8):555-565.
 *
 * Diseño Apple HIG: sin modales, búsqueda local, Progressive Disclosure.
 * Touch targets ≥ 44×44px. WCAG 2.1 AA.
 */

import { useState, useMemo, useCallback, useRef } from 'react'
import { Zap, Search, X, Plus, Trash2, Info, ChevronDown, ChevronUp } from 'lucide-react'
import metsData from '../data/mets.json'
import type { ActividadFisica, CategoriaActividad } from '../types/data.types'

// ─────────────────────────────────────────────────────────────────────────────
// Constantes
// ─────────────────────────────────────────────────────────────────────────────

/** Etiquetas legibles para cada categoría del JSON */
const ETIQUETAS_CATEGORIA: Record<CategoriaActividad, string> = {
  sedentario:              'Sedentario / Descanso',
  caminar:                 'Caminar',
  correr:                  'Correr',
  ciclismo:                'Ciclismo',
  natacion:                'Natación',
  ejercicios_fuerza:       'Fuerza y musculación',
  deportes_raqueta:        'Deportes de raqueta',
  deportes_equipo:         'Deportes de equipo',
  artes_marciales:         'Artes marciales',
  baile:                   'Baile y danza',
  yoga_pilates:            'Yoga / Pilates / Meditación',
  actividades_acuaticas:   'Actividades acuáticas',
  trabajo_fisico:          'Trabajo físico',
  actividades_hogar:       'Actividades del hogar',
  actividades_recreativas: 'Recreativas / Ocio',
}

/** Icono representativo por categoría (emoji) */
const ICONO_CATEGORIA: Partial<Record<CategoriaActividad, string>> = {
  sedentario:              '🛋️',
  caminar:                 '🚶',
  correr:                  '🏃',
  ciclismo:                '🚴',
  natacion:                '🏊',
  ejercicios_fuerza:       '🏋️',
  deportes_raqueta:        '🎾',
  deportes_equipo:         '⚽',
  artes_marciales:         '🥋',
  baile:                   '💃',
  yoga_pilates:            '🧘',
  actividades_acuaticas:   '🌊',
  trabajo_fisico:          '🔧',
  actividades_hogar:       '🏠',
  actividades_recreativas: '🎯',
}

/** Color de intensidad por MET */
function colorIntensidad(met: number): { bg: string; text: string; etiqueta: string } {
  if (met < 1.6)  return { bg: '#F2F2F7', text: '#636366', etiqueta: 'Sedentario' }
  if (met < 3.0)  return { bg: '#E8F8EC', text: '#1B7A34', etiqueta: 'Ligero' }
  if (met < 6.0)  return { bg: '#FFF3E0', text: '#B45309', etiqueta: 'Moderado' }
  if (met < 9.0)  return { bg: '#FEE2E2', text: '#B91C1C', etiqueta: 'Vigoroso' }
  return                 { bg: '#EDE9FE', text: '#5B21B6', etiqueta: 'Muy vigoroso' }
}

// ─────────────────────────────────────────────────────────────────────────────
// Tipos locales
// ─────────────────────────────────────────────────────────────────────────────

/** Actividad del compendio con su categoría adjunta */
type ActividadConCategoria = ActividadFisica & {
  categoria: CategoriaActividad
}

interface ItemComparador {
  actividad: ActividadConCategoria
  gasto_kcal: number
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Calcula el gasto calórico por actividad.
 * @source Jetté M et al. Clin Cardiol. 1990;13(8):555-565.
 *
 * Fórmula: Gasto_kcal = MET × 0.0175 × peso_kg × tiempo_min
 */
function calcularGastoMETs(met: number, peso_kg: number, tiempo_min: number): number {
  // @source Ainsworth BE et al. Med Sci Sports Exerc. 2011;43(8):1575-1581.
  return met * 0.0175 * peso_kg * tiempo_min
}

/**
 * Construye una lista plana de todas las actividades con su categoría.
 * Se ejecuta una sola vez (memo de módulo) — la lista no cambia en runtime.
 */
const TODAS_ACTIVIDADES: ActividadConCategoria[] = (() => {
  const actividades = metsData.actividades as Record<CategoriaActividad, ActividadFisica[]>
  return Object.entries(actividades).flatMap(([cat, lista]) =>
    (lista as ActividadFisica[]).map((act) => ({ ...act, categoria: cat as CategoriaActividad }))
  )
})()

/** Normaliza texto para búsqueda insensible a acentos y mayúsculas */
function normalizar(texto: string): string {
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
}

/** Filtra actividades por query. Retorna hasta 60 resultados ordenados por relevancia. */
function filtrarActividades(query: string): ActividadConCategoria[] {
  const q = normalizar(query.trim())
  if (!q) return []

  const scored = TODAS_ACTIVIDADES.map((act) => {
    const nombre = normalizar(act.actividad)
    const cat    = normalizar(ETIQUETAS_CATEGORIA[act.categoria] ?? act.categoria)
    let score = 0
    if (nombre.startsWith(q))    score = 100
    else if (nombre.includes(q)) score = 60
    else if (cat.includes(q))    score = 30
    return { act, score }
  })
  .filter(({ score }) => score > 0)
  .sort((a, b) => b.score - a.score)
  .slice(0, 60)

  return scored.map(({ act }) => act)
}

/** Agrupa actividades filtradas por categoría */
function agruparPorCategoria(
  lista: ActividadConCategoria[]
): Map<CategoriaActividad, ActividadConCategoria[]> {
  const mapa = new Map<CategoriaActividad, ActividadConCategoria[]>()
  for (const act of lista) {
    const grupo = mapa.get(act.categoria) ?? []
    grupo.push(act)
    mapa.set(act.categoria, grupo)
  }
  return mapa
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-componentes
// ─────────────────────────────────────────────────────────────────────────────

interface CardActividadProps {
  actividad: ActividadConCategoria
  seleccionada: boolean
  onSelect: (act: ActividadConCategoria) => void
  gasto_kcal?: number
}

function CardActividad({ actividad, seleccionada, onSelect, gasto_kcal }: CardActividadProps) {
  const intensidad = colorIntensidad(actividad.met)

  return (
    <button
      onClick={() => onSelect(actividad)}
      className={[
        'w-full text-left rounded-xl border px-4 py-3 transition-all duration-150',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#007AFF]',
        seleccionada
          ? 'border-[#007AFF] shadow-sm'
          : 'border-[color:var(--color-border)] bg-white hover:border-[color:var(--color-border-secondary)]',
      ].join(' ')}
      style={{
        minHeight: '56px',
        background: seleccionada ? '#EBF5FF' : 'white',
      }}
      aria-pressed={seleccionada}
      aria-label={`${actividad.actividad}, MET ${actividad.met}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className={`text-[14px] font-medium leading-snug truncate ${seleccionada ? 'text-[#007AFF]' : 'text-[color:var(--color-text-primary)]'}`}>
            {actividad.actividad}
          </p>
          {actividad.notas && (
            <p className="text-[11px] text-[color:var(--color-text-tertiary)] mt-0.5 leading-snug truncate">
              {actividad.notas}
            </p>
          )}
          {gasto_kcal !== undefined && (
            <p className="text-[12px] font-semibold text-[#007AFF] mt-1">
              {gasto_kcal.toFixed(1)} kcal
            </p>
          )}
        </div>
        <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
          <span
            className="text-[12px] font-bold font-mono px-2 py-0.5 rounded-lg"
            style={{ background: intensidad.bg, color: intensidad.text }}
          >
            {actividad.met} MET
          </span>
          <span
            className="text-[10px] font-medium px-1.5 py-0.5 rounded-md"
            style={{ background: intensidad.bg, color: intensidad.text }}
          >
            {intensidad.etiqueta}
          </span>
        </div>
      </div>
    </button>
  )
}

interface ResultadoPrincipalProps {
  actividad: ActividadConCategoria
  gasto_kcal: number
  peso_kg: number
  tiempo_min: number
}

function ResultadoPrincipal({ actividad, gasto_kcal, peso_kg, tiempo_min }: ResultadoPrincipalProps) {
  // Equivalencia: gasto / (3.5 MET × 0.0175 × peso × tiempo_unit) × tiempo  
  // = minutos caminando a paso normal (MET 3.5)
  const minutosCaminando = useMemo(() => {
    if (peso_kg <= 0) return 0
    const gastoXminCaminar = 3.5 * 0.0175 * peso_kg // kcal/min caminando
    return gastoXminCaminar > 0 ? Math.round(gasto_kcal / gastoXminCaminar) : 0
  }, [gasto_kcal, peso_kg])

  const intensidad = colorIntensidad(actividad.met)

  return (
    <div
      className="rounded-2xl p-5 border"
      style={{ background: '#EBF5FF', borderColor: '#93C5FD' }}
      role="status"
      aria-live="polite"
      aria-label={`Resultado: ${gasto_kcal.toFixed(1)} kilocalorías para ${actividad.actividad}`}
    >
      {/* Actividad seleccionada */}
      <div className="flex items-center gap-2 mb-4">
        <span className="text-xl">{ICONO_CATEGORIA[actividad.categoria] ?? '🏃'}</span>
        <div className="flex-1 min-w-0">
          <p className="text-[15px] font-semibold text-[#1D4ED8] truncate">{actividad.actividad}</p>
          <p className="text-[12px] text-[#3B82F6]">{ETIQUETAS_CATEGORIA[actividad.categoria]}</p>
        </div>
        <span
          className="text-[12px] font-bold px-2.5 py-1 rounded-xl flex-shrink-0"
          style={{ background: intensidad.bg, color: intensidad.text }}
        >
          {actividad.met} MET
        </span>
      </div>

      {/* Gasto calórico — número grande */}
      <div className="text-center py-4">
        <p className="text-[56px] font-bold font-mono leading-none text-[#1D4ED8]">
          {gasto_kcal.toFixed(0)}
        </p>
        <p className="text-[15px] text-[#3B82F6] mt-1 font-medium">kilocalorías</p>
        <p className="text-[12px] text-[#93C5FD] mt-0.5">
          {peso_kg} kg · {tiempo_min} min
        </p>
      </div>

      {/* Equivalencia */}
      {minutosCaminando > 0 && (
        <div
          className="flex items-center gap-2 px-4 py-3 rounded-xl mt-2"
          style={{ background: 'rgba(255,255,255,0.6)' }}
        >
          <span className="text-base">🚶</span>
          <p className="text-[13px] text-[#1D4ED8] leading-snug">
            Equivale a <span className="font-bold">≈{minutosCaminando} min</span> caminando a paso normal (MET 3.5)
          </p>
        </div>
      )}

      {/* Fórmula */}
      <div className="mt-3 p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.5)' }}>
        <p className="text-[11px] font-mono text-[#3B82F6]">
          {actividad.met} × 0.0175 × {peso_kg} kg × {tiempo_min} min = <span className="font-bold">{gasto_kcal.toFixed(2)} kcal</span>
        </p>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Comparador de actividades
// ─────────────────────────────────────────────────────────────────────────────

interface ComparadorProps {
  items: ItemComparador[]
  onEliminar: (id: string) => void
}

function Comparador({ items, onEliminar }: ComparadorProps) {
  if (items.length === 0) return null

  const maxGasto = Math.max(...items.map((i) => i.gasto_kcal))

  return (
    <div
      className="rounded-2xl bg-white border border-[color:var(--color-border)] overflow-hidden"
      style={{ boxShadow: 'var(--shadow)' }}
    >
      <div className="px-4 py-4 border-b border-[color:var(--color-border)]">
        <p className="text-[15px] font-semibold text-[color:var(--color-text-primary)]">
          Comparador de actividades
        </p>
        <p className="text-[12px] text-[color:var(--color-text-secondary)]">
          Hasta 3 actividades en paralelo
        </p>
      </div>
      <div className="p-4 flex flex-col gap-3">
        {items.map((item) => {
          const intensidad = colorIntensidad(item.actividad.met)
          const pct = maxGasto > 0 ? (item.gasto_kcal / maxGasto) * 100 : 0
          return (
            <div key={item.actividad.id} className="flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1 gap-2">
                  <p className="text-[13px] font-medium text-[color:var(--color-text-primary)] truncate">
                    {item.actividad.actividad}
                  </p>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span
                      className="text-[11px] font-bold px-2 py-0.5 rounded-lg"
                      style={{ background: intensidad.bg, color: intensidad.text }}
                    >
                      {item.actividad.met} MET
                    </span>
                    <span className="text-[14px] font-bold font-mono text-[#007AFF]">
                      {item.gasto_kcal.toFixed(1)} kcal
                    </span>
                  </div>
                </div>
                <div className="h-2 bg-[#F2F2F7] rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-[width] duration-500 ease-out"
                    style={{ width: `${pct}%`, background: '#007AFF' }}
                  />
                </div>
              </div>
              <button
                onClick={() => onEliminar(item.actividad.id)}
                className="p-2 rounded-lg text-[color:var(--color-text-tertiary)] hover:text-[#FF3B30] hover:bg-[#FEF2F2] transition-colors flex-shrink-0"
                style={{ minWidth: '36px', minHeight: '36px' }}
                aria-label={`Eliminar ${item.actividad.actividad} del comparador`}
              >
                <Trash2 size={15} />
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Sección buscador con categorías colapsables
// ─────────────────────────────────────────────────────────────────────────────

interface BuscadorActividadesProps {
  actividadSeleccionada: ActividadConCategoria | null
  onSelect: (act: ActividadConCategoria) => void
  peso_kg: number
  tiempo_min: number
}

function BuscadorActividades({
  actividadSeleccionada,
  onSelect,
  peso_kg,
  tiempo_min,
}: BuscadorActividadesProps) {
  const [query, setQuery]                   = useState('')
  const [categoriaAbierta, setCategoriaAbierta] = useState<CategoriaActividad | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const resultados = useMemo(() => filtrarActividades(query), [query])
  const grupos     = useMemo(() => agruparPorCategoria(resultados), [resultados])

  // Cuando no hay query, mostrar explorador de categorías
  const categorias = Object.keys(metsData.actividades) as CategoriaActividad[]

  const limpiar = useCallback(() => {
    setQuery('')
    inputRef.current?.focus()
  }, [])

  const calcularGasto = useCallback(
    (met: number) =>
      peso_kg > 0 && tiempo_min > 0
        ? calcularGastoMETs(met, peso_kg, tiempo_min)
        : undefined,
    [peso_kg, tiempo_min]
  )

  // Vista con query activa
  if (query.trim()) {
    return (
      <div>
        {/* Search bar */}
        <div
          className="flex items-center gap-2 px-4 rounded-2xl border border-[color:var(--color-border)] bg-white mb-4"
          style={{ minHeight: '52px', boxShadow: 'var(--shadow)' }}
        >
          <Search size={18} className="text-[color:var(--color-text-tertiary)] flex-shrink-0" />
          <input
            ref={inputRef}
            type="search"
            inputMode="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar actividad — fútbol, yoga, caminar…"
            className="flex-1 bg-transparent text-[15px] text-[color:var(--color-text-primary)] outline-none py-3 placeholder:text-[color:var(--color-text-tertiary)]"
            aria-label="Buscar actividad física"
          />
          <button
            onClick={limpiar}
            className="p-1.5 rounded-lg text-[color:var(--color-text-tertiary)] hover:text-[color:var(--color-text-primary)] transition-colors"
            aria-label="Limpiar búsqueda"
            style={{ minWidth: '36px', minHeight: '36px' }}
          >
            <X size={16} />
          </button>
        </div>

        {resultados.length === 0 ? (
          <div className="py-10 text-center">
            <p className="text-[15px] text-[color:var(--color-text-secondary)]">Sin resultados para «{query}»</p>
            <p className="text-[12px] text-[color:var(--color-text-tertiary)] mt-1">Prueba con: fútbol, natación, caminar, yoga…</p>
          </div>
        ) : (
          <div>
            <p className="text-[11px] text-[color:var(--color-text-tertiary)] mb-3 px-1">
              {resultados.length} actividad{resultados.length !== 1 ? 'es' : ''} encontrada{resultados.length !== 1 ? 's' : ''}
            </p>
            {Array.from(grupos.entries()).map(([cat, lista]) => (
              <div key={cat} className="mb-5">
                <div className="flex items-center gap-1.5 mb-2">
                  <span className="text-sm">{ICONO_CATEGORIA[cat] ?? '•'}</span>
                  <p className="text-[11px] font-semibold uppercase tracking-widest text-[color:var(--color-text-tertiary)]">
                    {ETIQUETAS_CATEGORIA[cat]}
                  </p>
                </div>
                <div className="flex flex-col gap-2">
                  {lista.map((act) => (
                    <CardActividad
                      key={act.id}
                      actividad={act}
                      seleccionada={actividadSeleccionada?.id === act.id}
                      onSelect={onSelect}
                      gasto_kcal={calcularGasto(act.met)}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  // Vista de explorador de categorías
  return (
    <div>
      {/* Search bar */}
      <div
        className="flex items-center gap-2 px-4 rounded-2xl border border-[color:var(--color-border)] bg-white mb-4"
        style={{ minHeight: '52px', boxShadow: 'var(--shadow)' }}
      >
        <Search size={18} className="text-[color:var(--color-text-tertiary)] flex-shrink-0" />
        <input
          ref={inputRef}
          type="search"
          inputMode="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar actividad — fútbol, yoga, caminar…"
          className="flex-1 bg-transparent text-[15px] text-[color:var(--color-text-primary)] outline-none py-3 placeholder:text-[color:var(--color-text-tertiary)]"
          aria-label="Buscar actividad física"
        />
      </div>

      {/* Explorador por categorías */}
      <p className="text-[11px] font-semibold uppercase tracking-widest text-[color:var(--color-text-tertiary)] mb-3 px-1">
        Explorar por categoría
      </p>
      <div className="flex flex-col gap-2">
        {categorias.map((cat) => {
          const lista = (metsData.actividades as Record<CategoriaActividad, ActividadFisica[]>)[cat] ?? []
          const abierta = categoriaAbierta === cat

          return (
            <div
              key={cat}
              className="rounded-2xl bg-white border border-[color:var(--color-border)] overflow-hidden"
              style={{ boxShadow: 'var(--shadow)' }}
            >
              <button
                onClick={() => setCategoriaAbierta(abierta ? null : cat)}
                className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-[#F9F9FB] transition-colors"
                style={{ minHeight: '52px' }}
                aria-expanded={abierta}
              >
                <div className="flex items-center gap-3">
                  <span className="text-lg w-7 text-center">{ICONO_CATEGORIA[cat] ?? '•'}</span>
                  <div>
                    <p className="text-[14px] font-medium text-[color:var(--color-text-primary)]">
                      {ETIQUETAS_CATEGORIA[cat]}
                    </p>
                    <p className="text-[11px] text-[color:var(--color-text-tertiary)]">
                      {lista.length} actividades
                    </p>
                  </div>
                </div>
                {abierta
                  ? <ChevronUp size={16} className="text-[color:var(--color-text-tertiary)]" />
                  : <ChevronDown size={16} className="text-[color:var(--color-text-tertiary)]" />
                }
              </button>

              {abierta && (
                <div className="border-t border-[color:var(--color-border)] px-3 pb-3">
                  <div className="pt-3 flex flex-col gap-2">
                    {lista.map((act) => (
                      <CardActividad
                        key={act.id}
                        actividad={{ ...act, categoria: cat }}
                        seleccionada={actividadSeleccionada?.id === act.id}
                        onSelect={onSelect}
                        gasto_kcal={calcularGasto(act.met)}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Componente principal
// ─────────────────────────────────────────────────────────────────────────────

export default function Mets() {
  const [peso,      setPeso]      = useState('')
  const [duracion,  setDuracion]  = useState('')
  const [actividad, setActividad] = useState<ActividadConCategoria | null>(null)
  const [comparador, setComparador] = useState<ItemComparador[]>([])
  const [comparadorAbierto, setComparadorAbierto] = useState(false)

  const peso_kg    = parseFloat(peso)
  const tiempo_min = parseFloat(duracion)

  const gastoActual = useMemo(() => {
    if (!actividad || isNaN(peso_kg) || isNaN(tiempo_min) || peso_kg <= 0 || tiempo_min <= 0) return null
    return calcularGastoMETs(actividad.met, peso_kg, tiempo_min)
  }, [actividad, peso_kg, tiempo_min])

  const enComparador = useMemo(
    () => new Set(comparador.map((i) => i.actividad.id)),
    [comparador]
  )

  const agregarAlComparador = useCallback((act: ActividadConCategoria) => {
    if (comparador.length >= 3) return
    if (enComparador.has(act.id)) return

    const gasto = !isNaN(peso_kg) && !isNaN(tiempo_min) && peso_kg > 0 && tiempo_min > 0
      ? calcularGastoMETs(act.met, peso_kg, tiempo_min)
      : 0

    setComparador((prev) => [...prev, { actividad: act, gasto_kcal: gasto }])
  }, [comparador.length, enComparador, peso_kg, tiempo_min])

  const eliminarDelComparador = useCallback((id: string) => {
    setComparador((prev) => prev.filter((i) => i.actividad.id !== id))
  }, [])

  const hayDatosBase = !isNaN(peso_kg) && !isNaN(tiempo_min) && peso_kg > 0 && tiempo_min > 0

  return (
    <div className="max-w-2xl mx-auto px-4 pt-6 pb-24 md:pb-8 md:px-6 md:pt-8">

      {/* ── Encabezado ── */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600 flex-shrink-0">
            <Zap size={22} />
          </div>
          <h1 className="text-[22px] font-semibold text-[color:var(--color-text-primary)]">
            Compendio METs
          </h1>
        </div>
        <p className="text-[13px] text-[color:var(--color-text-secondary)] leading-relaxed ml-[52px]">
          Calcula el gasto calórico por actividad física. Búsqueda offline sobre el compendio Ainsworth 2011 (100+ actividades).
        </p>
      </div>

      {/* ── Sección 1: Datos base ── */}
      <section
        className="rounded-2xl bg-white border border-[color:var(--color-border)] p-5 mb-4"
        style={{ boxShadow: 'var(--shadow)' }}
        aria-labelledby="datos-base-titulo"
      >
        <p
          id="datos-base-titulo"
          className="text-[13px] font-semibold text-[color:var(--color-text-secondary)] uppercase tracking-widest mb-4"
        >
          Datos del paciente
        </p>
        <div className="grid grid-cols-2 gap-3">
          {/* Peso */}
          <div className="flex flex-col gap-1">
            <label
              htmlFor="peso-mets"
              className="text-[11px] font-semibold uppercase tracking-widest text-[color:var(--color-text-tertiary)]"
            >
              Peso
            </label>
            <div
              className="flex items-center rounded-xl border border-[color:var(--color-border)] bg-white overflow-hidden"
              style={{ minHeight: '48px' }}
            >
              <input
                id="peso-mets"
                type="number"
                inputMode="decimal"
                value={peso}
                onChange={(e) => setPeso(e.target.value)}
                placeholder="65"
                className="flex-1 px-3 py-2.5 text-[17px] font-mono font-semibold text-[color:var(--color-text-primary)] bg-transparent outline-none placeholder:font-normal placeholder:text-[color:var(--color-text-tertiary)]"
                aria-label="Peso en kilogramos"
              />
              <span className="pr-3 text-[13px] text-[color:var(--color-text-tertiary)] font-medium">kg</span>
            </div>
          </div>

          {/* Duración */}
          <div className="flex flex-col gap-1">
            <label
              htmlFor="duracion-mets"
              className="text-[11px] font-semibold uppercase tracking-widest text-[color:var(--color-text-tertiary)]"
            >
              Duración
            </label>
            <div
              className="flex items-center rounded-xl border border-[color:var(--color-border)] bg-white overflow-hidden"
              style={{ minHeight: '48px' }}
            >
              <input
                id="duracion-mets"
                type="number"
                inputMode="decimal"
                value={duracion}
                onChange={(e) => setDuracion(e.target.value)}
                placeholder="30"
                className="flex-1 px-3 py-2.5 text-[17px] font-mono font-semibold text-[color:var(--color-text-primary)] bg-transparent outline-none placeholder:font-normal placeholder:text-[color:var(--color-text-tertiary)]"
                aria-label="Duración en minutos"
              />
              <span className="pr-3 text-[13px] text-[color:var(--color-text-tertiary)] font-medium">min</span>
            </div>
          </div>
        </div>

        {/* Fórmula visible */}
        <div className="mt-4 p-3 rounded-xl bg-[#F9F9FB] flex items-start gap-2">
          <Info size={13} className="text-[color:var(--color-text-tertiary)] mt-0.5 flex-shrink-0" />
          <p className="text-[11px] text-[color:var(--color-text-tertiary)] font-mono leading-relaxed">
            Gasto (kcal) = MET × 0.0175 × peso_kg × tiempo_min
            <span className="font-sans not-italic block mt-0.5 text-[10px]">
              Fuente: Jetté M et al. Clin Cardiol. 1990;13(8):555-565.
            </span>
          </p>
        </div>
      </section>

      {/* ── Advertencia si faltan datos base ── */}
      {!hayDatosBase && (
        <div
          className="flex items-center gap-3 px-4 py-3 rounded-2xl border mb-4"
          style={{ background: '#FFFBEB', borderColor: '#FDE68A' }}
        >
          <span className="text-base">💡</span>
          <p className="text-[12px] text-[#78350F]">
            Ingresa <span className="font-semibold">peso y duración</span> para ver el gasto calórico al seleccionar una actividad.
          </p>
        </div>
      )}

      {/* ── Hint: datos ok pero sin actividad seleccionada ── */}
      {hayDatosBase && !actividad && (
        <div
          className="flex items-center gap-3 px-4 py-3 rounded-2xl border mb-4"
          style={{ background: '#EBF5FF', borderColor: '#93C5FD' }}
        >
          <span className="text-base">👆</span>
          <p className="text-[13px] text-[#1D4ED8]">
            Toca cualquier actividad para ver el gasto calórico al instante.
          </p>
        </div>
      )}

      {/* ── Buscador de actividades ── */}
      <section aria-labelledby="buscador-titulo" className="mb-4">
        <p
          id="buscador-titulo"
          className="text-[15px] font-semibold text-[color:var(--color-text-primary)] mb-3"
        >
          Actividades
        </p>

        <BuscadorActividades
          actividadSeleccionada={actividad}
          onSelect={setActividad}
          peso_kg={hayDatosBase ? peso_kg : 0}
          tiempo_min={hayDatosBase ? tiempo_min : 0}
        />
      </section>

      {/* ── Resultado — aparece DEBAJO del buscador ── */}
      {gastoActual !== null && actividad && (
        <div className="mb-4">
          <ResultadoPrincipal
            actividad={actividad}
            gasto_kcal={gastoActual}
            peso_kg={peso_kg}
            tiempo_min={tiempo_min}
          />
        </div>
      )}

      {/* ── Comparador colapsable (flujo secundario) ── */}
      <section className="rounded-2xl bg-white border border-[color:var(--color-border)] overflow-hidden mb-4" style={{ boxShadow: 'var(--shadow)' }}>
        <button
          onClick={() => setComparadorAbierto((p) => !p)}
          className="w-full flex items-center justify-between px-4 py-4 text-left"
          style={{ minHeight: '56px' }}
          aria-expanded={comparadorAbierto}
        >
          <div className="flex items-center gap-2.5">
            <span className="text-[15px] font-semibold text-[color:var(--color-text-primary)]">
              Comparar actividades
            </span>
            {comparador.length > 0 && (
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-[#007AFF] text-white">
                {comparador.length}/3
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[12px] text-[color:var(--color-text-tertiary)]">
              Hasta 3 en paralelo
            </span>
            {comparadorAbierto
              ? <ChevronUp size={16} className="text-[color:var(--color-text-tertiary)]" />
              : <ChevronDown size={16} className="text-[color:var(--color-text-tertiary)]" />
            }
          </div>
        </button>

        {comparadorAbierto && (
          <div className="px-4 pb-4 border-t border-[color:var(--color-border)]">
            <div className="pt-4">
              {/* Agregar actividad seleccionada al comparador */}
              {actividad && !enComparador.has(actividad.id) && comparador.length < 3 && (
                <button
                  onClick={() => agregarAlComparador(actividad)}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 border-dashed border-[#007AFF] text-[#007AFF] text-[13px] font-medium mb-4 transition-colors hover:bg-[#EBF5FF]"
                  style={{ minHeight: '48px' }}
                >
                  <Plus size={16} />
                  Agregar «{actividad.actividad}» al comparador
                </button>
              )}

              {comparador.length === 0 ? (
                <p className="text-[13px] text-[color:var(--color-text-tertiary)] text-center py-4">
                  Selecciona una actividad y toca el botón de arriba para compararla.
                </p>
              ) : (
                <Comparador items={comparador} onEliminar={eliminarDelComparador} />
              )}
            </div>
          </div>
        )}
      </section>

      {/* ── Fuente bibliográfica global ── */}
      <div className="mt-2 flex items-start gap-1.5 p-3 rounded-xl bg-[#F2F2F7]">
        <Info size={12} className="text-[color:var(--color-text-tertiary)] mt-[1px] flex-shrink-0" />
        <p className="text-[11px] text-[color:var(--color-text-tertiary)] leading-relaxed">
          <span className="font-semibold">Fuente: </span>
          Ainsworth BE et al. 2011 Compendium of Physical Activities. Med Sci Sports Exerc. 2011;43(8):1575-1581. | Los METs son promedios poblacionales. Varían por condición física y técnica individual.
        </p>
      </div>

    </div>
  )
}