/**
 * Recientes.tsx — Historial de Cálculos Recientes
 *
 * Estado actual: Empty state (Fase 1)
 * Fase 2: Se conectará a Dexie.js para mostrar historial real de cálculos.
 *
 * Diseño:
 *   - Ícono grande centrado
 *   - Título y subtítulo descriptivos
 *   - CTA a /calculadora
 *   - Consistente con tokens Apple HIG del proyecto
 */

import { Link } from 'react-router-dom'
import { Clock, Calculator, ArrowRight } from 'lucide-react'

export default function Recientes() {
  return (
    <div className="max-w-md mx-auto px-4 pt-6 pb-8 md:px-6 md:pt-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-1">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: 'var(--color-bg)', color: 'var(--color-text-secondary)' }}
          >
            <Clock size={20} />
          </div>
          <h1 className="text-[22px] font-semibold text-[color:var(--color-text-primary)]">
            Recientes
          </h1>
        </div>
        <p className="text-sm text-[color:var(--color-text-secondary)] ml-[52px]">
          Historial de cálculos y consultas
        </p>
      </div>

      {/* Empty state */}
      <div
        className="rounded-2xl flex flex-col items-center justify-center py-16 px-6 text-center"
        style={{
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          boxShadow: 'var(--shadow)',
        }}
      >
        {/* Ícono decorativo */}
        <div
          className="w-20 h-20 rounded-3xl flex items-center justify-center mb-6"
          style={{ background: 'var(--color-bg)' }}
        >
          <Clock size={36} className="text-[color:var(--color-text-tertiary)]" strokeWidth={1.5} />
        </div>

        <h2 className="text-lg font-semibold text-[color:var(--color-text-primary)] mb-2">
          Sin cálculos recientes
        </h2>

        <p className="text-sm text-[color:var(--color-text-secondary)] leading-relaxed mb-8 max-w-xs">
          Los cálculos de GET, TMB, antropometría y laboratorios que realices aparecerán aquí para consulta rápida.
        </p>

        {/* CTA */}
        <Link
          to="/calculadora"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-90 active:opacity-80"
          style={{
            background: 'var(--color-primary)',
            minHeight: '44px',
          }}
          aria-label="Ir a la calculadora de GET y TMB"
        >
          <Calculator size={16} />
          Ir a Calculadora
          <ArrowRight size={16} />
        </Link>
      </div>

      {/* Nota de fase */}
      <p className="mt-4 text-center text-[11px] text-[color:var(--color-text-tertiary)]">
        El historial automático se implementa en Fase 2.
      </p>
    </div>
  )
}