/**
 * Calculator.tsx — Calculadora GET / TMB
 * Estado: PLACEHOLDER — Módulo en desarrollo
 */

import { Calculator as CalculatorIcon } from 'lucide-react'

export default function Calculator() {
  return (
    <div className="max-w-2xl mx-auto px-4 pt-6 pb-4 md:px-6 md:pt-8">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
            <CalculatorIcon size={22} />
          </div>
          <h1 className="text-[22px] font-semibold text-[color:var(--color-text-primary)]">
            Calculadora GET / TMB
          </h1>
        </div>
        <p className="text-sm text-[color:var(--color-text-secondary)] leading-relaxed ml-[52px]">
          Calcula el gasto energético total usando Mifflin-St Jeor, Harris-Benedict, Valencia y otras fórmulas clínicas validadas.
        </p>
      </div>
      <div className="rounded-2xl border-2 border-dashed border-[color:var(--color-border)] flex flex-col items-center justify-center py-16 px-6 text-center">
        <div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-400 mb-4">
          <CalculatorIcon size={28} />
        </div>
        <h2 className="text-base font-semibold text-[color:var(--color-text-primary)] mb-2">
          Módulo en construcción
        </h2>
        <p className="text-sm text-[color:var(--color-text-tertiary)] max-w-sm leading-relaxed">
          Este módulo está planificado en el roadmap de NUTRIA. El layout y la navegación ya funcionan — el contenido clínico viene pronto.
        </p>
        <div className="mt-5 px-4 py-2 rounded-full bg-blue-50 text-blue-600 text-xs font-semibold tracking-wide">
          PRÓXIMAMENTE
        </div>
      </div>
    </div>
  )
}