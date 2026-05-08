/**
 * Adequacy.tsx — Página de Adecuación Nutricional
 * Proyecto NUTRIA — Open Source
 *
 * Muestra el semáforo de adecuación usando:
 *   - usePlanStore  → macros_prescritos + consumido_hoy
 *   - useSMAEPlanner → macros_totales del plan SMAE armado
 *   - SemaforoAdecuacion → componente visual
 *
 * DISEÑO: Apple HIG — Mobile-first, sin modales, feedback inline.
 * @source Gibson RS. Principles of Nutritional Assessment. 2005.
 */

import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { CheckCircle, LayoutGrid, Calculator, ArrowRight, Info } from 'lucide-react'

import { usePlanStore }      from '../stores/plan.store'
import { useSMAEPlanner }    from '../hooks/useSMAEPlanner'
import SemaforoAdecuacion    from '../components/shared/SemaforoAdecuacion'
import type { AdecuacionDiaria, NutrienteRowData } from '../types/adequacy.types'

// ===========================================================================
// HELPERS
// ===========================================================================

/** Etiquetas legibles por nutriente */
const ETIQUETAS: Partial<Record<string, { label: string; unidad: string; grupo: 'macro' | 'micro' }>> = {
  energia_kcal:    { label: 'Energía',    unidad: 'kcal', grupo: 'macro' },
  proteina_g:      { label: 'Proteína',   unidad: 'g',    grupo: 'macro' },
  lipidos_g:       { label: 'Lípidos',    unidad: 'g',    grupo: 'macro' },
  hidratos_g:      { label: 'Hidratos',   unidad: 'g',    grupo: 'macro' },
  fibra_g:         { label: 'Fibra',      unidad: 'g',    grupo: 'macro' },
  calcio_mg:       { label: 'Calcio',     unidad: 'mg',   grupo: 'micro' },
  hierro_mg:       { label: 'Hierro',     unidad: 'mg',   grupo: 'micro' },
  zinc_mg:         { label: 'Zinc',       unidad: 'mg',   grupo: 'micro' },
  vitamina_c_mg:   { label: 'Vitamina C', unidad: 'mg',   grupo: 'micro' },
  sodio_mg:        { label: 'Sodio',      unidad: 'mg',   grupo: 'micro' },
}

// ===========================================================================
// SUB-COMPONENTES
// ===========================================================================

/** Card de métricas de resumen en la parte superior */
function ResumenChips({
  optimos, total, con_deficit_critico, con_exceso_critico,
}: {
  optimos: number
  total: number
  con_deficit_critico: number
  con_exceso_critico: number
}) {
  const pct_optimo = total > 0 ? Math.round((optimos / total) * 100) : 0

  return (
    <div className="flex gap-2 flex-wrap">
      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-green-50 border border-green-100">
        <div className="w-2 h-2 rounded-full bg-[#34C759]" />
        <span className="text-[12px] font-semibold text-[#1B7A34]">
          {pct_optimo}% óptimo
        </span>
      </div>
      {con_deficit_critico > 0 && (
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-red-50 border border-red-100">
          <div className="w-2 h-2 rounded-full bg-[#FF3B30]" />
          <span className="text-[12px] font-semibold text-[#B91C1C]">
            {con_deficit_critico} déficit crítico{con_deficit_critico > 1 ? 's' : ''}
          </span>
        </div>
      )}
      {con_exceso_critico > 0 && (
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-orange-50 border border-orange-100">
          <div className="w-2 h-2 rounded-full bg-[#FF9500]" />
          <span className="text-[12px] font-semibold text-[#92400E]">
            {con_exceso_critico} exceso crítico{con_exceso_critico > 1 ? 's' : ''}
          </span>
        </div>
      )}
    </div>
  )
}

/** Estado vacío cuando no hay plan activo */
function EstadoSinPlan({ tipo }: { tipo: 'sin_get' | 'sin_smae' }) {
  return (
    <div
      className="rounded-2xl flex flex-col items-center justify-center py-14 px-6 text-center gap-3"
      style={{
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        boxShadow: 'var(--shadow)',
      }}
    >
      <div
        className="w-16 h-16 rounded-2xl flex items-center justify-center"
        style={{ background: 'var(--color-bg)' }}
        aria-hidden="true"
      >
        {tipo === 'sin_get'
          ? <Calculator size={30} className="text-[color:var(--color-text-tertiary)]" strokeWidth={1.5} />
          : <LayoutGrid  size={30} className="text-[color:var(--color-text-tertiary)]" strokeWidth={1.5} />
        }
      </div>

      <div>
        <h2 className="text-[15px] font-semibold text-[color:var(--color-text-primary)] mb-1">
          {tipo === 'sin_get'
            ? 'Calcula el GET primero'
            : 'Arma el plan SMAE primero'
          }
        </h2>
        <p className="text-[13px] text-[color:var(--color-text-secondary)] leading-relaxed max-w-[260px]">
          {tipo === 'sin_get'
            ? 'El semáforo necesita la prescripción energética. Ve a la Calculadora y usa el botón "Usar en Planeador".'
            : 'Asigna equivalentes SMAE en el Planeador para ver la adecuación del plan.'
          }
        </p>
      </div>

      <Link
        to={tipo === 'sin_get' ? '/calculadora' : '/planeador'}
        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-[13px] font-semibold text-white transition-opacity hover:opacity-90 active:opacity-80"
        style={{ background: 'var(--color-primary)', minHeight: '44px' }}
      >
        {tipo === 'sin_get' ? <Calculator size={15} /> : <LayoutGrid size={15} />}
        {tipo === 'sin_get' ? 'Ir a Calculadora' : 'Ir a Planeador'}
        <ArrowRight size={15} />
      </Link>
    </div>
  )
}

// ===========================================================================
// COMPONENTE PRINCIPAL
// ===========================================================================

export default function Adequacy() {
  // ── Fuente 1: plan.store (GET prescrito + consumido del día)
  const { macros_prescritos, consumido_hoy, resumen_adecuacion } = usePlanStore()

  // ── Fuente 2: useSMAEPlanner (macros del plan SMAE armado = "consumido")
  const { macros_totales, get_objetivo_kcal } = useSMAEPlanner()

  const hay_prescripcion = macros_prescritos !== null
  const hay_plan_smae   = macros_totales.energia_kcal > 0

  // ── Construir AdecuacionDiaria para el componente ──────────────────────────
  const adecuacion_diaria = useMemo<AdecuacionDiaria | null>(() => {
    if (!hay_prescripcion) return null

    // Consumido: fusión de lo del Planner SMAE + lo registrado manualmente
    const consumido_efectivo: Record<string, number> = {
      energia_kcal: macros_totales.energia_kcal > 0
        ? macros_totales.energia_kcal
        : (consumido_hoy.energia_kcal ?? 0),
      proteina_g: macros_totales.proteina_g > 0
        ? macros_totales.proteina_g
        : (consumido_hoy.proteina_g ?? 0),
      lipidos_g: macros_totales.lipidos_g > 0
        ? macros_totales.lipidos_g
        : (consumido_hoy.lipidos_g ?? 0),
      hidratos_g: macros_totales.hidratos_g > 0
        ? macros_totales.hidratos_g
        : (consumido_hoy.hidratos_g ?? 0),
      fibra_g: macros_totales.fibra_g > 0
        ? macros_totales.fibra_g
        : (consumido_hoy.fibra_g ?? 0),
    }

    // Construir filas para el semáforo
    const nutrientes: NutrienteRowData[] = Object.entries({
      energia_kcal: macros_prescritos.proteina_g > 0
        ? get_objetivo_kcal   // GET del planeador
        : 0,
      proteina_g: macros_prescritos.proteina_g,
      lipidos_g:  macros_prescritos.lipidos_g,
      hidratos_g: macros_prescritos.hidratos_g,
      fibra_g:    macros_prescritos.fibra_g,
    })
      .filter(([, prescrito]) => prescrito > 0)
      .map(([id, prescrito]) => {
        const meta = ETIQUETAS[id]
        return {
          id,
          label:    meta?.label  ?? id,
          unidad:   meta?.unidad ?? '',
          grupo:    meta?.grupo  ?? 'macro',
          prescrito,
          consumido: consumido_efectivo[id] ?? 0,
        }
      })

    return { nutrientes }
  }, [
    hay_prescripcion, macros_prescritos, macros_totales,
    consumido_hoy, get_objetivo_kcal,
  ])

  // ── Estado vacío — no hay prescripción energética todavía
  if (!hay_prescripcion) {
    return (
      <PageShell>
        <EstadoSinPlan tipo="sin_get" />
      </PageShell>
    )
  }

  return (
    <PageShell>
      {/* Resumen ejecutivo */}
      {resumen_adecuacion && (
        <div className="mb-5">
          <ResumenChips
            optimos={resumen_adecuacion.optimos}
            total={resumen_adecuacion.total_nutrientes}
            con_deficit_critico={resumen_adecuacion.con_deficit_critico}
            con_exceso_critico={resumen_adecuacion.con_exceso_critico}
          />
        </div>
      )}

      {/* Aviso si no hay plan SMAE armado */}
      {!hay_plan_smae && (
        <div
          className="flex items-start gap-3 px-4 py-3 mb-5 rounded-xl"
          style={{ background: '#FFF9EC', border: '1px solid #FDDFA0' }}
          role="status"
          aria-live="polite"
        >
          <Info size={16} className="text-amber-600 flex-shrink-0 mt-0.5" aria-hidden="true" />
          <div>
            <p className="text-[13px] font-semibold text-amber-800">
              Plan SMAE vacío
            </p>
            <p className="text-[12px] text-amber-700 mt-0.5">
              Los valores de consumo están en 0. Ve al{' '}
              <Link to="/planeador" className="underline font-medium">Planeador</Link>{' '}
              para asignar equivalentes.
            </p>
          </div>
        </div>
      )}

      {/* Semáforo principal */}
      <div
        className="rounded-2xl overflow-hidden"
        style={{
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          boxShadow: 'var(--shadow)',
        }}
      >
        <SemaforoAdecuacion
          adecuacion={adecuacion_diaria}
          nombre_paciente="Paciente"
        />
      </div>

      {/* Nota metodológica */}
      <p className="text-center text-[11px] text-[color:var(--color-text-tertiary)] mt-4 leading-relaxed">
        Prescrito vs. plan SMAE armado · Rangos OMS / Gibson 2005
      </p>
    </PageShell>
  )
}

// ===========================================================================
// SHELL — layout wrapper reutilizable
// ===========================================================================

function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="max-w-2xl mx-auto px-4 pt-6 pb-8 md:px-6 md:pt-8">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: '#EDFAF2' }}
            aria-hidden="true"
          >
            <CheckCircle size={20} color="#34C759" />
          </div>
          <h1 className="text-[22px] font-semibold text-[color:var(--color-text-primary)]">
            Adecuación Nutricional
          </h1>
        </div>
        <p className="text-[13px] text-[color:var(--color-text-secondary)] ml-[52px] leading-relaxed">
          Prescrito vs. consumido por nutriente
        </p>
      </div>

      {children}
    </div>
  )
}