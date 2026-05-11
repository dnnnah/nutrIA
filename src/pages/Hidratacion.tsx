/**
 * Hidratacion.tsx — Calculadora de Requerimiento Hídrico
 * Proyecto NUTRIA — Open Source
 *
 * Secciones (Progressive Disclosure):
 *   1. Requerimiento Hídrico Base (abierta) — 3 métodos seleccionables como cards
 *   2. Ajustes Clínicos (colapsable) — factores que incrementan el volumen
 *   3. Tasa de Sudoración (colapsable) — cálculo post-ejercicio ACSM
 *
 * Diseño Apple HIG: sin modales, cálculo en tiempo real (onChange),
 * Progressive Disclosure, touch targets ≥ 44×44px, WCAG 2.1 AA.
 * Mobile-first 390px → responsive hasta 1280px.
 *
 * @source Holliday MA, Segar WE. Pediatrics. 1957;19(5):823-832.
 * @source Sawka MN et al. ACSM Position Stand. Med Sci Sports Exerc. 2007;39(2):377-390.
 * @source IOM. Dietary Reference Intakes for Water. National Academies Press. 2005.
 * @source Chernoff R. J Am Diet Assoc. 1994;94(8):878-882.
 * @source DuBois EF. Arch Intern Med. 1921;27(2):259.
 *
 * @module Hidratacion
 */

import { useState, useMemo } from 'react'
import {
  Droplet,
  ChevronDown,
  ChevronUp,
  Info,
  Thermometer,
  Activity,
  Wind,
  Waves,
  BookOpen,
} from 'lucide-react'
import {
  calcularHidratación_PorPeso,
  calcularHidratación_PorGET,
  calcularHidratación_PorEdad,
  calcularTasaSudoración,
  calcularAjusteClínico,
} from '../hooks/useHidratacion'
import type {
  MétodoHidratación,
  ResultadoHidratación,
  ResultadoAjusteClínico,
  ResultadoTasaSudoración,
  FactoresClínicos,
} from '../types/hydration.types'

// ===========================================================================
// TIPOS LOCALES
// ===========================================================================

interface FormBase {
  método:          MétodoHidratación
  // Por peso
  peso_kg:         string
  adulto_mayor:    boolean
  // Por GET
  get_kcal:        string
  // Por edad
  peso_edad_kg:    string
  edad_anios:      string
}

interface FormAjuste extends FactoresClínicos {
  temperatura_str: string // String para el input antes de parsear
}

interface FormSudoración {
  peso_pre_kg:         string
  peso_post_kg:        string
  líquido_ingerido_ml: string
  orina_ml:            string
  duración_min:        string
}

// ===========================================================================
// DATOS ESTÁTICOS DE UI
// ===========================================================================

interface MétodoCard {
  id:          MétodoHidratación
  título:      string
  subtítulo:   string
  fuente:      string
}

const MÉTODOS: MétodoCard[] = [
  {
    id:        'por_peso',
    título:    'Por peso',
    subtítulo: '35 ml/kg · Método estándar',
    fuente:    'Holliday & Segar, 1957',
  },
  {
    id:        'por_get',
    título:    'Por GET',
    subtítulo: '1 ml/kcal · Requiere cálculo previo',
    fuente:    'IOM, 2005',
  },
  {
    id:        'por_edad',
    título:    'Por edad',
    subtítulo: 'Ajustado por rango etario',
    fuente:    'Chernoff, 1994',
  },
]

// ===========================================================================
// HELPERS
// ===========================================================================

function parseNum(s: string): number | null {
  const n = parseFloat(s.replace(',', '.'))
  return Number.isFinite(n) && n > 0 ? n : null
}

function parseNumAllow0(s: string): number | null {
  const n = parseFloat(s.replace(',', '.'))
  return Number.isFinite(n) && n >= 0 ? n : null
}

// ===========================================================================
// COMPONENTES AUXILIARES
// ===========================================================================

/** Tarjeta de selección de método */
function MétodoCardBtn({
  card,
  seleccionado,
  onSelect,
}: {
  card:        MétodoCard
  seleccionado: boolean
  onSelect:    () => void
}) {
  return (
    <button
      onClick={onSelect}
      className="flex-1 flex flex-col gap-1 px-3 py-3 rounded-xl border-2 text-left transition-all duration-150"
      style={{
        minHeight:       '72px',
        borderColor:     seleccionado ? 'var(--color-primary)' : 'var(--color-border)',
        background:      seleccionado ? '#EFF6FF' : 'var(--color-surface)',
        color:           seleccionado ? 'var(--color-primary)' : 'var(--color-text-primary)',
      }}
      aria-pressed={seleccionado}
      aria-label={`Seleccionar método ${card.título}`}
    >
      <span className="text-[14px] font-semibold leading-tight">{card.título}</span>
      <span
        className="text-[12px] leading-snug"
        style={{ color: seleccionado ? '#3B82F6' : 'var(--color-text-secondary)' }}
      >
        {card.subtítulo}
      </span>
      <span
        className="text-[11px] font-medium mt-0.5"
        style={{ color: seleccionado ? '#60A5FA' : 'var(--color-text-tertiary)' }}
      >
        {card.fuente}
      </span>
    </button>
  )
}

/** Campo de input clínico estandarizado */
function CampoInput({
  label,
  value,
  onChange,
  placeholder,
  unidad,
  tipo = 'number',
  hint,
}: {
  label:        string
  value:        string
  onChange:     (v: string) => void
  placeholder?: string
  unidad?:      string
  tipo?:        string
  hint?:        string
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label
        className="text-[13px] font-medium"
        style={{ color: 'var(--color-text-secondary)' }}
      >
        {label}
      </label>
      <div className="relative">
        <input
          type={tipo}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full px-3 py-2.5 rounded-xl border text-[15px] outline-none transition-all"
          style={{
            minHeight:    '44px',
            borderColor:  'var(--color-border)',
            background:   'var(--color-bg)',
            color:        'var(--color-text-primary)',
            paddingRight: unidad ? '52px' : '12px',
          }}
          onFocus={(e) =>
            (e.currentTarget.style.borderColor = 'var(--color-primary)')
          }
          onBlur={(e) =>
            (e.currentTarget.style.borderColor = 'var(--color-border)')
          }
          inputMode="decimal"
        />
        {unidad && (
          <span
            className="absolute right-3 top-1/2 -translate-y-1/2 text-[13px] font-medium pointer-events-none"
            style={{ color: 'var(--color-text-tertiary)' }}
          >
            {unidad}
          </span>
        )}
      </div>
      {hint && (
        <p className="text-[12px]" style={{ color: 'var(--color-text-tertiary)' }}>
          {hint}
        </p>
      )}
    </div>
  )
}

/** Toggle Sí / No para factores clínicos */
function ToggleSíNo({
  label,
  valor,
  onChange,
  ícono,
}: {
  label:    string
  valor:    boolean
  onChange: (v: boolean) => void
  ícono?:   React.ReactNode
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-2">
      <div className="flex items-center gap-2">
        {ícono && (
          <span style={{ color: 'var(--color-text-tertiary)' }}>{ícono}</span>
        )}
        <span className="text-[15px]" style={{ color: 'var(--color-text-primary)' }}>
          {label}
        </span>
      </div>
      <div className="flex gap-2">
        <button
          onClick={() => onChange(true)}
          className="px-3 py-1.5 rounded-lg text-[13px] font-medium transition-all"
          style={{
            minWidth:    '44px',
            minHeight:   '36px',
            background:  valor ? 'var(--color-primary)' : 'var(--color-bg)',
            color:       valor ? '#fff' : 'var(--color-text-secondary)',
            border:      `1.5px solid ${valor ? 'var(--color-primary)' : 'var(--color-border)'}`,
          }}
          aria-pressed={valor}
        >
          Sí
        </button>
        <button
          onClick={() => onChange(false)}
          className="px-3 py-1.5 rounded-lg text-[13px] font-medium transition-all"
          style={{
            minWidth:    '44px',
            minHeight:   '36px',
            background:  !valor ? 'var(--color-bg)' : 'var(--color-surface)',
            color:       !valor ? 'var(--color-text-secondary)' : 'var(--color-text-tertiary)',
            border:      `1.5px solid ${!valor ? 'var(--color-border)' : 'var(--color-border)'}`,
          }}
          aria-pressed={!valor}
        >
          No
        </button>
      </div>
    </div>
  )
}

/** Chip de resultado grande (volumen principal) */
function ResultadoVolumen({
  resultado,
  label,
}: {
  resultado: ResultadoHidratación | ResultadoAjusteClínico
  label:     string
}) {
  const ml =
    'volumen_ml' in resultado
      ? resultado.volumen_ml
      : resultado.volumen_ajustado_ml
  const litros =
    'volumen_litros' in resultado
      ? resultado.volumen_litros
      : resultado.volumen_ajustado_litros
  const vasos = resultado.vasos_240ml

  return (
    <div
      className="rounded-2xl p-4"
      style={{ background: '#EFF6FF', border: '1px solid #BFDBFE' }}
    >
      <p
        className="text-[12px] font-semibold uppercase tracking-wider mb-1"
        style={{ color: '#3B82F6' }}
      >
        {label}
      </p>
      <div className="flex items-baseline gap-2">
        <span className="text-[36px] font-bold" style={{ color: 'var(--color-primary)' }}>
          {ml.toLocaleString('es-MX')}
        </span>
        <span className="text-[17px] font-medium" style={{ color: '#3B82F6' }}>
          ml
        </span>
        <span className="text-[22px] font-semibold ml-2" style={{ color: '#60A5FA' }}>
          ({litros} L)
        </span>
      </div>
      <p className="text-[14px] mt-1" style={{ color: '#3B82F6' }}>
        ≈ {vasos} vasos de 240 ml
      </p>
    </div>
  )
}

/** Encabezado de sección colapsable */
function SecciónColapsable({
  título,
  subtítulo,
  abierta,
  onToggle,
  children,
}: {
  título:    string
  subtítulo: string
  abierta:   boolean
  onToggle:  () => void
  children:  React.ReactNode
}) {
  return (
    <section
      className="rounded-2xl overflow-hidden"
      style={{
        background:  'var(--color-surface)',
        border:      '1px solid var(--color-border)',
        boxShadow:   'var(--shadow)',
      }}
    >
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-4 py-4 text-left transition-colors"
        style={{ minHeight: '60px' }}
        aria-expanded={abierta}
      >
        <div>
          <p className="text-[17px] font-semibold" style={{ color: 'var(--color-text-primary)' }}>
            {título}
          </p>
          <p className="text-[13px]" style={{ color: 'var(--color-text-secondary)' }}>
            {subtítulo}
          </p>
        </div>
        <span style={{ color: 'var(--color-text-tertiary)' }}>
          {abierta ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </span>
      </button>

      {abierta && (
        <div
          className="px-4 pb-4 border-t"
          style={{ borderColor: 'var(--color-border)' }}
        >
          {children}
        </div>
      )}
    </section>
  )
}

// ===========================================================================
// COMPONENTE PRINCIPAL
// ===========================================================================

export default function Hidratacion() {
  // ── Estado — Sección 1 (Base) ─────────────────────────────────────────────
  const [formBase, setFormBase] = useState<FormBase>({
    método:       'por_peso',
    peso_kg:      '',
    adulto_mayor: false,
    get_kcal:     '',
    peso_edad_kg: '',
    edad_anios:   '',
  })

  // ── Estado — Sección 2 (Ajuste clínico) ──────────────────────────────────
  const [ajusteAbierto, setAjusteAbierto] = useState(false)
  const [formAjuste, setFormAjuste] = useState<FormAjuste>({
    fiebre:              false,
    temperatura_celsius: null,
    temperatura_str:     '',
    vómito:              false,
    diarrea:             false,
    actividad_intensa:   false,
    clima_caluroso:      false,
  })

  // ── Estado — Sección 3 (Sudoración) ──────────────────────────────────────
  const [sudoraciónAbierta, setSudoraciónAbierta] = useState(false)
  const [formSud, setFormSud] = useState<FormSudoración>({
    peso_pre_kg:         '',
    peso_post_kg:        '',
    líquido_ingerido_ml: '',
    orina_ml:            '0',
    duración_min:        '',
  })

  // ── Cálculo base (tiempo real) ────────────────────────────────────────────
  const resultadoBase = useMemo((): ResultadoHidratación | null => {
    try {
      switch (formBase.método) {
        case 'por_peso': {
          const peso = parseNum(formBase.peso_kg)
          if (!peso) return null
          return calcularHidratación_PorPeso({
            peso_kg:      peso,
            adulto_mayor: formBase.adulto_mayor,
          })
        }
        case 'por_get': {
          const get = parseNum(formBase.get_kcal)
          if (!get) return null
          return calcularHidratación_PorGET({ get_kcal: get })
        }
        case 'por_edad': {
          const peso = parseNum(formBase.peso_edad_kg)
          const edad = parseNum(formBase.edad_anios)
          if (!peso || !edad) return null
          return calcularHidratación_PorEdad({ peso_kg: peso, edad_anios: edad })
        }
      }
    } catch {
      return null
    }
  }, [formBase])

  // ── Cálculo ajuste clínico (tiempo real) ──────────────────────────────────
  const resultadoAjuste = useMemo((): ResultadoAjusteClínico | null => {
    if (!resultadoBase) return null
    try {
      const tempStr  = formAjuste.temperatura_str
      const tempNum  = parseNum(tempStr)
      return calcularAjusteClínico(resultadoBase.volumen_ml, {
        fiebre:              formAjuste.fiebre,
        temperatura_celsius: formAjuste.fiebre ? (tempNum ?? null) : null,
        vómito:              formAjuste.vómito,
        diarrea:             formAjuste.diarrea,
        actividad_intensa:   formAjuste.actividad_intensa,
        clima_caluroso:      formAjuste.clima_caluroso,
      })
    } catch {
      return null
    }
  }, [resultadoBase, formAjuste])

  // ── Cálculo tasa de sudoración (tiempo real) ──────────────────────────────
  const resultadoSudoración = useMemo((): ResultadoTasaSudoración | null => {
    try {
      const pre     = parseNum(formSud.peso_pre_kg)
      const post    = parseNum(formSud.peso_post_kg)
      const líquido = parseNumAllow0(formSud.líquido_ingerido_ml)
      const orina   = parseNumAllow0(formSud.orina_ml)
      const dur     = parseNum(formSud.duración_min)
      if (!pre || !post || líquido === null || orina === null || !dur) return null
      return calcularTasaSudoración({
        peso_pre_kg:         pre,
        peso_post_kg:        post,
        líquido_ingerido_ml: líquido,
        orina_ml:            orina,
        duración_min:        dur,
      })
    } catch {
      return null
    }
  }, [formSud])

  // ── Helpers de mutación de estado ────────────────────────────────────────
  const setBase = <K extends keyof FormBase>(key: K, val: FormBase[K]) =>
    setFormBase((prev) => ({ ...prev, [key]: val }))

  const setSud = <K extends keyof FormSudoración>(key: K, val: string) =>
    setFormSud((prev) => ({ ...prev, [key]: val }))

  const setAjuste = <K extends keyof FormAjuste>(key: K, val: FormAjuste[K]) =>
    setFormAjuste((prev) => ({ ...prev, [key]: val }))

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div
      className="max-w-2xl mx-auto px-4 pt-6 pb-10 md:px-6 md:pt-8 flex flex-col gap-4"
      style={{ fontFamily: 'var(--font-family)' }}
    >
      {/* ── Encabezado ─────────────────────────────────────────────────────── */}
      <header className="mb-2">
        <div className="flex items-center gap-3 mb-1.5">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: '#EFF6FF', color: 'var(--color-primary)' }}
          >
            <Droplet size={22} />
          </div>
          <h1 className="text-[22px] font-semibold" style={{ color: 'var(--color-text-primary)' }}>
            Hidratación
          </h1>
        </div>
        <p
          className="text-[15px] leading-relaxed ml-[52px]"
          style={{ color: 'var(--color-text-secondary)' }}
        >
          Requerimiento hídrico diario con 3 métodos clínicos validados.
          Cálculo en tiempo real.
        </p>
      </header>

      {/* ══════════════════════════════════════════════════════════════════════
          SECCIÓN 1 — Requerimiento Hídrico Base
      ══════════════════════════════════════════════════════════════════════ */}
      <section
        className="rounded-2xl p-4 flex flex-col gap-4"
        style={{
          background: 'var(--color-surface)',
          border:     '1px solid var(--color-border)',
          boxShadow:  'var(--shadow)',
        }}
      >
        <div>
          <p
            className="text-[17px] font-semibold mb-0.5"
            style={{ color: 'var(--color-text-primary)' }}
          >
            Requerimiento Hídrico Base
          </p>
          <p className="text-[13px]" style={{ color: 'var(--color-text-secondary)' }}>
            Selecciona el método de cálculo
          </p>
        </div>

        {/* Cards de método — 3 columnas en desktop, verticales en mobile */}
        <div className="flex gap-2.5" role="group" aria-label="Método de cálculo de hidratación">
          {MÉTODOS.map((m) => (
            <MétodoCardBtn
              key={m.id}
              card={m}
              seleccionado={formBase.método === m.id}
              onSelect={() => setBase('método', m.id)}
            />
          ))}
        </div>

        {/* Inputs según método seleccionado */}
        {formBase.método === 'por_peso' && (
          <div className="flex flex-col gap-3">
            <CampoInput
              label="Peso corporal"
              value={formBase.peso_kg}
              onChange={(v) => setBase('peso_kg', v)}
              placeholder="ej. 70"
              unidad="kg"
            />
            {/* Toggle adulto mayor */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[15px]" style={{ color: 'var(--color-text-primary)' }}>
                  ¿Adulto mayor?
                </p>
                <p className="text-[12px]" style={{ color: 'var(--color-text-tertiary)' }}>
                  ≥ 65 años — reduce multiplicador a 30 ml/kg
                </p>
              </div>
              <div className="flex gap-2">
                {(['Sí', 'No'] as const).map((label) => {
                  const esActivo = label === 'Sí' ? formBase.adulto_mayor : !formBase.adulto_mayor
                  return (
                    <button
                      key={label}
                      onClick={() => setBase('adulto_mayor', label === 'Sí')}
                      className="px-4 py-2 rounded-lg text-[13px] font-medium transition-all"
                      style={{
                        minWidth:  '52px',
                        minHeight: '44px',
                        background: esActivo ? 'var(--color-primary)' : 'var(--color-bg)',
                        color:      esActivo ? '#fff' : 'var(--color-text-secondary)',
                        border:    `1.5px solid ${esActivo ? 'var(--color-primary)' : 'var(--color-border)'}`,
                      }}
                      aria-pressed={esActivo}
                    >
                      {label}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        )}

        {formBase.método === 'por_get' && (
          <div className="flex flex-col gap-3">
            <CampoInput
              label="Gasto Energético Total (GET)"
              value={formBase.get_kcal}
              onChange={(v) => setBase('get_kcal', v)}
              placeholder="ej. 2000"
              unidad="kcal"
              hint="Obtén el GET desde la Calculadora GET / TMB"
            />
            <div
              className="flex items-start gap-2 p-3 rounded-xl"
              style={{ background: '#FFF3E0', border: '1px solid #FED7AA' }}
            >
              <Info size={15} style={{ color: '#B45309', flexShrink: 0, marginTop: 1 }} />
              <p className="text-[12px]" style={{ color: '#92400E' }}>
                ¿No tienes el GET calculado?{' '}
                <a
                  href="/calculadora"
                  className="underline font-medium"
                  style={{ color: '#B45309' }}
                >
                  Ir a Calculadora GET / TMB →
                </a>
              </p>
            </div>
          </div>
        )}

        {formBase.método === 'por_edad' && (
          <div className="grid grid-cols-2 gap-3">
            <CampoInput
              label="Peso corporal"
              value={formBase.peso_edad_kg}
              onChange={(v) => setBase('peso_edad_kg', v)}
              placeholder="ej. 70"
              unidad="kg"
            />
            <CampoInput
              label="Edad"
              value={formBase.edad_anios}
              onChange={(v) => setBase('edad_anios', v)}
              placeholder="ej. 45"
              unidad="años"
            />
          </div>
        )}

        {/* Resultado base */}
        {resultadoBase && (
          <ResultadoVolumen
            resultado={resultadoBase}
            label={ajusteAbierto && resultadoAjuste ? 'Volumen base (sin ajustes)' : 'Volumen recomendado'}
          />
        )}

        {/* Fuente bibliográfica */}
        {resultadoBase && (
          <div className="flex items-start gap-2">
            <BookOpen size={13} style={{ color: 'var(--color-text-tertiary)', flexShrink: 0, marginTop: 2 }} />
            <p className="text-[12px]" style={{ color: 'var(--color-text-tertiary)' }}>
              {resultadoBase.fuente_bibliográfica}
            </p>
          </div>
        )}
      </section>

      {/* ══════════════════════════════════════════════════════════════════════
          SECCIÓN 2 — Ajustes Clínicos (colapsable)
      ══════════════════════════════════════════════════════════════════════ */}
      <SecciónColapsable
        título="Ajustes Clínicos"
        subtítulo={
          ajusteAbierto && resultadoAjuste && resultadoAjuste.incremento_total_ml > 0
            ? `+${resultadoAjuste.incremento_total_ml.toLocaleString('es-MX')} ml adicionales`
            : 'Fiebre, vómito, diarrea, actividad, clima'
        }
        abierta={ajusteAbierto}
        onToggle={() => setAjusteAbierto((v) => !v)}
      >
        <div className="flex flex-col gap-1 pt-3">
          {/* Fiebre */}
          <ToggleSíNo
            label="Fiebre"
            valor={formAjuste.fiebre}
            onChange={(v) => setAjuste('fiebre', v)}
            ícono={<Thermometer size={16} />}
          />
          {formAjuste.fiebre && (
            <div className="ml-6 mb-2">
              <CampoInput
                label="Temperatura corporal"
                value={formAjuste.temperatura_str}
                onChange={(v) => {
                  setAjuste('temperatura_str', v)
                  const n = parseNum(v)
                  setAjuste('temperatura_celsius', n !== null && n >= 37 ? n : null)
                }}
                placeholder="ej. 39"
                unidad="°C"
                hint="+150 ml por cada °C sobre 37 °C (DuBois, 1921)"
              />
            </div>
          )}

          <div style={{ borderTop: '1px solid var(--color-border)' }} />

          <ToggleSíNo
            label="Vómito"
            valor={formAjuste.vómito}
            onChange={(v) => setAjuste('vómito', v)}
            ícono={<Waves size={16} />}
          />

          <div style={{ borderTop: '1px solid var(--color-border)' }} />

          <ToggleSíNo
            label="Diarrea"
            valor={formAjuste.diarrea}
            onChange={(v) => setAjuste('diarrea', v)}
            ícono={<Waves size={16} />}
          />

          <div style={{ borderTop: '1px solid var(--color-border)' }} />

          <ToggleSíNo
            label="Actividad física intensa"
            valor={formAjuste.actividad_intensa}
            onChange={(v) => setAjuste('actividad_intensa', v)}
            ícono={<Activity size={16} />}
          />

          <div style={{ borderTop: '1px solid var(--color-border)' }} />

          <ToggleSíNo
            label="Clima caluroso"
            valor={formAjuste.clima_caluroso}
            onChange={(v) => setAjuste('clima_caluroso', v)}
            ícono={<Wind size={16} />}
          />
        </div>

        {/* Resultado ajustado */}
        {resultadoAjuste && (
          <div className="mt-4 flex flex-col gap-3">
            <ResultadoVolumen
              resultado={resultadoAjuste}
              label="Volumen ajustado"
            />

            {/* Desglose de incrementos */}
            {resultadoAjuste.desglose.length > 0 && (
              <div
                className="rounded-xl p-3 flex flex-col gap-2"
                style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)' }}
              >
                <p className="text-[12px] font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text-tertiary)' }}>
                  Incrementos aplicados
                </p>
                {resultadoAjuste.desglose.map((item) => (
                  <div key={item.factor} className="flex justify-between items-start gap-2">
                    <div>
                      <p className="text-[14px] font-medium" style={{ color: 'var(--color-text-primary)' }}>
                        {item.factor}
                      </p>
                      <p className="text-[12px]" style={{ color: 'var(--color-text-secondary)' }}>
                        {item.descripción}
                      </p>
                    </div>
                    <span
                      className="text-[14px] font-semibold flex-shrink-0"
                      style={{ color: 'var(--color-warning)' }}
                    >
                      +{item.incremento_ml} ml
                    </span>
                  </div>
                ))}
              </div>
            )}

            {resultadoAjuste.incremento_total_ml === 0 && (
              <p className="text-[14px] text-center py-2" style={{ color: 'var(--color-text-secondary)' }}>
                Sin factores activos — volumen sin cambio
              </p>
            )}
          </div>
        )}

        {!resultadoBase && (
          <p className="text-[14px] text-center py-4" style={{ color: 'var(--color-text-tertiary)' }}>
            Completa primero el Requerimiento Hídrico Base
          </p>
        )}
      </SecciónColapsable>

      {/* ══════════════════════════════════════════════════════════════════════
          SECCIÓN 3 — Tasa de Sudoración (colapsable)
      ══════════════════════════════════════════════════════════════════════ */}
      <SecciónColapsable
        título="Tasa de Sudoración"
        subtítulo="Para usar después del entrenamiento · ACSM"
        abierta={sudoraciónAbierta}
        onToggle={() => setSudoraciónAbierta((v) => !v)}
      >
        <div className="flex flex-col gap-3 pt-3">
          <div
            className="flex items-start gap-2 p-3 rounded-xl"
            style={{ background: '#F0FDF4', border: '1px solid #BBF7D0' }}
          >
            <Info size={14} style={{ color: '#166534', flexShrink: 0, marginTop: 1 }} />
            <p className="text-[12px]" style={{ color: '#14532D' }}>
              Mide peso antes y después del ejercicio (sin ropa) para mayor precisión.
              La reposición recomendada es el 150% de la pérdida neta (protocolo ACSM 2007).
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <CampoInput
              label="Peso antes del ejercicio"
              value={formSud.peso_pre_kg}
              onChange={(v) => setSud('peso_pre_kg', v)}
              placeholder="ej. 70.0"
              unidad="kg"
            />
            <CampoInput
              label="Peso después del ejercicio"
              value={formSud.peso_post_kg}
              onChange={(v) => setSud('peso_post_kg', v)}
              placeholder="ej. 69.0"
              unidad="kg"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <CampoInput
              label="Líquido ingerido durante"
              value={formSud.líquido_ingerido_ml}
              onChange={(v) => setSud('líquido_ingerido_ml', v)}
              placeholder="ej. 500"
              unidad="ml"
            />
            <CampoInput
              label="Orina producida (opcional)"
              value={formSud.orina_ml}
              onChange={(v) => setSud('orina_ml', v)}
              placeholder="ej. 0"
              unidad="ml"
              hint="Dejar en 0 si no se midió"
            />
          </div>

          <CampoInput
            label="Duración del ejercicio"
            value={formSud.duración_min}
            onChange={(v) => setSud('duración_min', v)}
            placeholder="ej. 60"
            unidad="min"
          />

          {/* Resultados de sudoración */}
          {resultadoSudoración && (
            <div className="flex flex-col gap-3 mt-1">
              {/* Reposición — número grande */}
              <div
                className="rounded-2xl p-4"
                style={{ background: '#F0FDF4', border: '1px solid #BBF7D0' }}
              >
                <p
                  className="text-[12px] font-semibold uppercase tracking-wider mb-1"
                  style={{ color: '#166534' }}
                >
                  Reposición recomendada (ACSM 150%)
                </p>
                <div className="flex items-baseline gap-2">
                  <span className="text-[36px] font-bold" style={{ color: '#15803D' }}>
                    {resultadoSudoración.reposición_recomendada_ml.toLocaleString('es-MX')}
                  </span>
                  <span className="text-[17px] font-medium" style={{ color: '#16A34A' }}>ml</span>
                </div>
                <p className="text-[14px] mt-1" style={{ color: '#166534' }}>
                  ≈ {resultadoSudoración.botellas_600ml} botellas de 600 ml
                </p>
              </div>

              {/* Tabla de métricas */}
              <div
                className="rounded-xl overflow-hidden"
                style={{ border: '1px solid var(--color-border)' }}
              >
                {[
                  {
                    label: 'Pérdida neta',
                    valor: `${resultadoSudoración.pérdida_neta_ml.toLocaleString('es-MX')} ml`,
                  },
                  {
                    label: 'Tasa de sudoración',
                    valor: `${resultadoSudoración.tasa_ml_por_min} ml/min · ${resultadoSudoración.tasa_ml_por_hora.toLocaleString('es-MX')} ml/h`,
                  },
                ].map((fila, i) => (
                  <div
                    key={fila.label}
                    className="flex justify-between items-center px-4 py-3"
                    style={{
                      background: i % 2 === 0 ? 'var(--color-surface)' : 'var(--color-bg)',
                    }}
                  >
                    <span className="text-[14px]" style={{ color: 'var(--color-text-secondary)' }}>
                      {fila.label}
                    </span>
                    <span className="text-[14px] font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                      {fila.valor}
                    </span>
                  </div>
                ))}
              </div>

              <div className="flex items-start gap-2">
                <BookOpen size={13} style={{ color: 'var(--color-text-tertiary)', flexShrink: 0, marginTop: 2 }} />
                <p className="text-[12px]" style={{ color: 'var(--color-text-tertiary)' }}>
                  {resultadoSudoración.fuente_bibliográfica}
                </p>
              </div>
            </div>
          )}
        </div>
      </SecciónColapsable>
    </div>
  )
}