/**
 * Calculator.tsx — Calculadora GET / TMB
 * Proyecto NUTRIA — Open Source
 *
 * Implementa Progressive Disclosure en 4 secciones:
 *   1. Datos del paciente (peso, talla, edad, sexo)
 *   2. Selección visual de fórmula TMB (6 opciones como cards)
 *   3. Factor NAF (5 cards con ícono + descripción)
 *   4. Factor de estrés metabólico (colapsable)
 *
 * Resultado sticky en mobile con TMB, GET sin ETA, ETA y GET final.
 * Cálculo en tiempo real — onChange, nunca onSubmit.
 *
 * @module Calculator
 */

import { useState, useMemo } from 'react'
import {
  Calculator as CalculatorIcon,
  ChevronDown,
  ChevronUp,
  Info,
  Dumbbell,
  Armchair,
  Bike,
  Zap,
  Flame,
  Stethoscope,
  BookOpen,
  Save,
} from 'lucide-react'

import { calcularGET, calcularPesoIdeal_Hamwi } from '../hooks/useEnergyCalculator'
import type {
  CategoríaNAF,
  FactorEstrés,
  FormulasTMB,
  ParámetrosGET,
  ResultadoGET,
  Sexo,
} from '../types/energy.types'

// ─── Tipos locales ────────────────────────────────────────────────────────────

interface FormState {
  peso_kg:      string
  talla_cm:     string
  edad_anios:   string
  sexo:         Sexo
  masa_magra_kg: string
  formula_tmb:  FormulasTMB
  naf:          CategoríaNAF
  factor_estres: FactorEstrés
  estres_activo: boolean
}

// ─── Datos estáticos de UI ────────────────────────────────────────────────────

interface FormulaCard {
  id:          FormulasTMB
  nombre:      string
  badge:       string
  badgeColor:  string
  descripcion: string
  requiereMM:  boolean
}

const FORMULAS: FormulaCard[] = [
  {
    id:          'mifflin_st_jeor',
    nombre:      'Mifflin-St Jeor',
    badge:       'Estándar',
    badgeColor:  '#007AFF',
    descripcion: 'Población general adulta. La más validada actualmente.',
    requiereMM:  false,
  },
  {
    id:          'harris_benedict',
    nombre:      'Harris-Benedict',
    badge:       'Hospitalaria',
    badgeColor:  '#FF9500',
    descripcion: 'Revisada por Roza & Shizgal (1984). Entorno clínico.',
    requiereMM:  false,
  },
  {
    id:          'valencia',
    nombre:      'Valencia',
    badge:       'Población MX',
    badgeColor:  '#34C759',
    descripcion: 'INNSZ. Derivada de muestra mexicana. 30–60 años.',
    requiereMM:  false,
  },
  {
    id:          'katch_mcardle',
    nombre:      'Katch-McArdle',
    badge:       'Atletas',
    badgeColor:  '#AF52DE',
    descripcion: 'Requiere masa magra. Alta precisión en deportistas.',
    requiereMM:  true,
  },
  {
    id:          'cunningham',
    nombre:      'Cunningham',
    badge:       'Masa muscular',
    badgeColor:  '#5AC8FA',
    descripcion: 'Alta masa muscular. Requiere masa magra (kg).',
    requiereMM:  true,
  },
  {
    id:          'schofield',
    nombre:      'Schofield',
    badge:       'Pediatría / OMS',
    badgeColor:  '#FF6B35',
    descripcion: 'OMS 1985. Pediatría y adolescentes por rango de edad.',
    requiereMM:  false,
  },
]

interface NAFCard {
  id:          CategoríaNAF
  valor:       number
  nombre:      string
  descripcion: string
  icono:       React.ReactNode
}

const NAF_OPCIONES: NAFCard[] = [
  {
    id:          'sedentario',
    valor:       1.20,
    nombre:      'Sedentario',
    descripcion: 'Poco o nada de ejercicio estructurado.',
    icono:       <Armchair size={20} />,
  },
  {
    id:          'ligero',
    valor:       1.375,
    nombre:      'Ligero',
    descripcion: 'Ejercicio 1–3 días/semana.',
    icono:       <Bike size={20} />,
  },
  {
    id:          'moderado',
    valor:       1.55,
    nombre:      'Moderado',
    descripcion: 'Ejercicio 3–5 días/semana.',
    icono:       <Zap size={20} />,
  },
  {
    id:          'intenso',
    valor:       1.725,
    nombre:      'Intenso',
    descripcion: 'Ejercicio 6–7 días/semana.',
    icono:       <Dumbbell size={20} />,
  },
  {
    id:          'muy_intenso',
    valor:       1.90,
    nombre:      'Muy intenso',
    descripcion: 'Trabajo físico + doble entrenamiento.',
    icono:       <Flame size={20} />,
  },
]

interface EstresCard {
  id:    FactorEstrés
  label: string
  rango: string
}

const ESTRES_OPCIONES: EstresCard[] = [
  { id: 'ninguno',            label: 'Sin estrés',         rango: '×1.00' },
  { id: 'cirugia_menor',      label: 'Cirugía menor',      rango: '×1.0–1.1' },
  { id: 'cirugia_mayor',      label: 'Cirugía mayor',      rango: '×1.1–1.3' },
  { id: 'infeccion_leve',     label: 'Infección leve',     rango: '×1.0–1.2' },
  { id: 'neumonia',           label: 'Neumonía',           rango: '×1.2–1.35' },
  { id: 'trauma_cerrado',     label: 'Trauma cerrado',     rango: '×1.15–1.35' },
  { id: 'traumatismo_craneal',label: 'Trauma craneal',     rango: '×1.5' },
  { id: 'sepsis',             label: 'Sepsis',             rango: '×1.2–1.6' },
  { id: 'cancer',             label: 'Cáncer',             rango: '×1.0–1.2' },
  { id: 'quemaduras_leve',    label: 'Quemaduras leves',   rango: '×1.2' },
  { id: 'quemaduras_moderada',label: 'Quemaduras moderadas',rango: '×1.5' },
  { id: 'quemaduras_severa',  label: 'Quemaduras severas', rango: '×1.5–2.0' },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Parsea string a number; devuelve undefined si no es un número válido */
const parseNum = (s: string): number | undefined => {
  const n = parseFloat(s)
  return Number.isFinite(n) && n > 0 ? n : undefined
}

/** Formatea kcal con separador de miles */
const fmtKcal = (n: number): string =>
  n.toLocaleString('es-MX', { maximumFractionDigits: 0 })

// ─── Sub-componentes ──────────────────────────────────────────────────────────

/** Sección con encabezado numerado */
function Seccion({
  numero,
  titulo,
  children,
}: {
  numero: number
  titulo: string
  children: React.ReactNode
}) {
  return (
    <section
      className="rounded-2xl p-5 md:p-6"
      style={{ background: 'var(--color-surface)', boxShadow: 'var(--shadow)' }}
      aria-label={`Sección ${numero}: ${titulo}`}
    >
      <div className="flex items-center gap-3 mb-5">
        <div
          className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
          style={{ background: 'var(--color-primary)' }}
          aria-hidden="true"
        >
          {numero}
        </div>
        <h2 className="text-[17px] font-semibold text-[color:var(--color-text-primary)]">
          {titulo}
        </h2>
      </div>
      {children}
    </section>
  )
}

/** Campo numérico con label y unidad */
function CampoNumerico({
  id,
  label,
  unidad,
  valor,
  placeholder,
  onChange,
  min,
  max,
}: {
  id:          string
  label:       string
  unidad:      string
  valor:       string
  placeholder: string
  onChange:    (v: string) => void
  min?:        number
  max?:        number
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label
        htmlFor={id}
        className="text-[13px] font-medium text-[color:var(--color-text-secondary)]"
      >
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type="number"
          inputMode="decimal"
          value={valor}
          placeholder={placeholder}
          min={min}
          max={max}
          onChange={(e) => onChange(e.target.value)}
          className="w-full rounded-xl border text-[17px] font-mono pl-4 pr-14 py-3 outline-none transition-all focus:ring-2"
          style={{
            borderColor: 'var(--color-border)',
            background: 'var(--color-bg)',
            color: 'var(--color-text-primary)',
            minHeight: '44px',
          }}
          aria-label={`${label} en ${unidad}`}
        />
        <span
          className="absolute right-4 top-1/2 -translate-y-1/2 text-[13px] font-medium"
          style={{ color: 'var(--color-text-tertiary)' }}
          aria-hidden="true"
        >
          {unidad}
        </span>
      </div>
    </div>
  )
}

/** Toggle binario para sexo — mismo patrón que Anthropometry.tsx */
function ToggleSexo({
  valor,
  onChange,
}: {
  valor:    Sexo
  onChange: (s: Sexo) => void
}) {
  const opts: { id: Sexo; label: string }[] = [
    { id: 'masculino', label: 'Masculino' },
    { id: 'femenino',  label: 'Femenino' },
  ]
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[13px] font-medium" style={{ color: 'var(--color-text-secondary)' }}>
        Sexo biológico
      </span>
      <div
        className="flex rounded-xl p-1 gap-1"
        style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)' }}
        role="group"
        aria-label="Seleccionar sexo"
      >
        {opts.map((o) => (
          <button
            key={o.id}
            type="button"
            onClick={() => onChange(o.id)}
            className="flex-1 rounded-lg text-[15px] font-medium py-2.5 transition-all duration-150"
            style={{
              minHeight: '44px',
              background: valor === o.id ? 'var(--color-primary)' : 'transparent',
              color:      valor === o.id ? '#ffffff' : 'var(--color-text-secondary)',
              boxShadow:  valor === o.id ? 'var(--shadow)' : 'none',
            }}
            aria-pressed={valor === o.id}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  )
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function Calculator() {
  // ── Estado del formulario ──────────────────────────────────────────────────
  const [form, setForm] = useState<FormState>({
    peso_kg:       '',
    talla_cm:      '',
    edad_anios:    '',
    sexo:          'masculino',
    masa_magra_kg: '',
    formula_tmb:   'mifflin_st_jeor',
    naf:           'moderado',
    factor_estres: 'ninguno',
    estres_activo: false,
  })

  const [estresExpandido, setEstresExpandido] = useState(false)
  const [tooltipETA, setTooltipETA] = useState(false)

  // ── Helpers de actualización ───────────────────────────────────────────────
  const set = <K extends keyof FormState>(key: K, val: FormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: val }))

  // ── Cálculo en tiempo real ─────────────────────────────────────────────────
  const resultado: ResultadoGET | null = useMemo(() => {
    const peso      = parseNum(form.peso_kg)
    const talla     = parseNum(form.talla_cm)
    const edad      = parseNum(form.edad_anios)
    const masa_magra = parseNum(form.masa_magra_kg)

    if (!peso || !talla || !edad) return null

    // Fórmulas que requieren masa magra — bloquear si no se proporcionó
    const formulaRequiereMM =
      form.formula_tmb === 'katch_mcardle' || form.formula_tmb === 'cunningham'
    if (formulaRequiereMM && !masa_magra) return null

    try {
      const params: ParámetrosGET = {
        peso_kg:       peso,
        talla_cm:      talla,
        edad_anios:    edad,
        sexo:          form.sexo,
        naf:           form.naf,
        formula_tmb:   form.formula_tmb,
        factor_estres: form.estres_activo ? form.factor_estres : 'ninguno',
        ...(masa_magra ? { masa_magra_kg: masa_magra } : {}),
      }
      return calcularGET(params)
    } catch {
      return null
    }
  }, [form])

  // Peso ideal Hamwi (para mostrar como referencia)
  const pesoIdeal: number | null = useMemo(() => {
    const talla = parseNum(form.talla_cm)
    if (!talla) return null
    try {
      return calcularPesoIdeal_Hamwi(talla, form.sexo)
    } catch {
      return null
    }
  }, [form.talla_cm, form.sexo])

  const formulaActual = FORMULAS.find((f) => f.id === form.formula_tmb)!

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div
      className="max-w-2xl mx-auto px-4 pt-6 pb-8 md:px-6 md:pt-8"
      style={{ fontFamily: 'var(--font-family)' }}
    >
      {/* ── Encabezado ── */}
      <header className="mb-6">
        <div className="flex items-center gap-3 mb-1.5">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: '#EFF6FF', color: 'var(--color-primary)' }}
          >
            <CalculatorIcon size={22} />
          </div>
          <h1 className="text-[22px] font-semibold text-[color:var(--color-text-primary)]">
            Calculadora GET / TMB
          </h1>
        </div>
        <p
          className="text-[15px] leading-relaxed ml-[52px]"
          style={{ color: 'var(--color-text-secondary)' }}
        >
          Gasto energético total con 6 fórmulas clínicas validadas.
          Cálculo en tiempo real.
        </p>
      </header>

      <div className="space-y-4">
        {/* ── Sección 1 — Datos del paciente ── */}
        <Seccion numero={1} titulo="Datos del paciente">
          <div className="grid grid-cols-2 gap-4">
            <CampoNumerico
              id="peso_kg"
              label="Peso actual"
              unidad="kg"
              valor={form.peso_kg}
              placeholder="70"
              min={10}
              max={300}
              onChange={(v) => set('peso_kg', v)}
            />
            <CampoNumerico
              id="talla_cm"
              label="Talla"
              unidad="cm"
              valor={form.talla_cm}
              placeholder="170"
              min={50}
              max={250}
              onChange={(v) => set('talla_cm', v)}
            />
            <CampoNumerico
              id="edad_anios"
              label="Edad"
              unidad="años"
              valor={form.edad_anios}
              placeholder="30"
              min={1}
              max={120}
              onChange={(v) => set('edad_anios', v)}
            />
            <div className="col-span-2 sm:col-span-1">
              <ToggleSexo valor={form.sexo} onChange={(s) => set('sexo', s)} />
            </div>
          </div>

          {/* Peso ideal de referencia — Progressive Disclosure */}
          {pesoIdeal !== null && (
            <p
              className="mt-4 text-[13px] rounded-lg px-3 py-2"
              style={{ background: 'var(--color-bg)', color: 'var(--color-text-secondary)' }}
            >
              Peso ideal Hamwi:{' '}
              <span className="font-mono font-semibold text-[color:var(--color-text-primary)]">
                {pesoIdeal.toFixed(1)} kg
              </span>
              {resultado?.peso_ajustado && (
                <span className="ml-2" style={{ color: 'var(--color-warning)' }}>
                  · Se usó peso ajustado por obesidad
                </span>
              )}
            </p>
          )}
        </Seccion>

        {/* ── Sección 2 — Fórmula TMB ── */}
        <Seccion numero={2} titulo="Fórmula TMB">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {FORMULAS.map((f) => {
              const activa = form.formula_tmb === f.id
              return (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => set('formula_tmb', f.id)}
                  className="text-left rounded-xl p-4 transition-all duration-150"
                  style={{
                    minHeight: '80px',
                    border: activa
                      ? `2px solid ${f.badgeColor}`
                      : '2px solid var(--color-border)',
                    background: activa ? `${f.badgeColor}0D` : 'var(--color-bg)',
                  }}
                  aria-pressed={activa}
                  aria-label={`Seleccionar fórmula ${f.nombre}`}
                >
                  {/* Nombre en su propia línea */}
                  <p
                    className="text-[15px] font-semibold leading-tight mb-1"
                    style={{ color: 'var(--color-text-primary)' }}
                  >
                    {f.nombre}
                  </p>
                  {/* Badge en línea propia — nunca desborda */}
                  <span
                    className="inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full mb-1.5"
                    style={{
                      background: `${f.badgeColor}20`,
                      color: f.badgeColor,
                    }}
                  >
                    {f.badge}
                  </span>
                  {/* Descripción */}
                  <p
                    className="text-[12px] leading-snug"
                    style={{ color: 'var(--color-text-secondary)' }}
                  >
                    {f.descripcion}
                  </p>
                </button>
              )
            })}
          </div>

          {/* Campo masa magra — Progressive Disclosure */}
          {formulaActual.requiereMM && (
            <div className="mt-4">
              <CampoNumerico
                id="masa_magra_kg"
                label="Masa magra"
                unidad="kg"
                valor={form.masa_magra_kg}
                placeholder="55.0"
                min={5}
                max={150}
                onChange={(v) => set('masa_magra_kg', v)}
              />
              <p
                className="mt-1.5 text-[12px]"
                style={{ color: 'var(--color-text-tertiary)' }}
              >
                Requerida para {formulaActual.nombre}. Puedes obtenerla en Antropometría.
              </p>
            </div>
          )}
        </Seccion>

        {/* ── Sección 3 — Factor NAF ── */}
        <Seccion numero={3} titulo="Nivel de Actividad Física (NAF)">
          <div className="space-y-2">
            {NAF_OPCIONES.map((n) => {
              const activo = form.naf === n.id
              return (
                <button
                  key={n.id}
                  type="button"
                  onClick={() => set('naf', n.id)}
                  className="w-full flex items-center gap-4 rounded-xl px-4 py-3 text-left transition-all duration-150"
                  style={{
                    minHeight: '60px',
                    border: activo
                      ? '2px solid var(--color-primary)'
                      : '2px solid var(--color-border)',
                    background: activo ? '#007AFF0D' : 'var(--color-bg)',
                  }}
                  aria-pressed={activo}
                  aria-label={`NAF ${n.nombre} — ${n.descripcion}`}
                >
                  <span
                    className="flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center"
                    style={{
                      background: activo ? 'var(--color-primary)' : 'var(--color-border)',
                      color: activo ? '#fff' : 'var(--color-text-tertiary)',
                    }}
                    aria-hidden="true"
                  >
                    {n.icono}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p
                      className="text-[15px] font-semibold leading-tight"
                      style={{ color: 'var(--color-text-primary)' }}
                    >
                      {n.nombre}
                    </p>
                    <p
                      className="text-[13px] leading-tight mt-0.5"
                      style={{ color: 'var(--color-text-secondary)' }}
                    >
                      {n.descripcion}
                    </p>
                  </div>
                  <span
                    className="font-mono text-[13px] font-semibold flex-shrink-0"
                    style={{ color: activo ? 'var(--color-primary)' : 'var(--color-text-tertiary)' }}
                    aria-hidden="true"
                  >
                    ×{n.valor}
                  </span>
                </button>
              )
            })}
          </div>
          <p
            className="mt-3 text-[12px]"
            style={{ color: 'var(--color-text-tertiary)' }}
          >
            @source OMS TRS 724 (1985) · IOM DRI for Energy (2005)
          </p>
        </Seccion>

        {/* ── Sección 4 — Factor de estrés (colapsable) ── */}
        <section
          className="rounded-2xl overflow-hidden"
          style={{ background: 'var(--color-surface)', boxShadow: 'var(--shadow)' }}
          aria-label="Sección 4: Factor de estrés metabólico"
        >
          {/* Cabecera toggle */}
          <button
            type="button"
            onClick={() => setEstresExpandido((p) => !p)}
            className="w-full flex items-center justify-between px-5 py-4"
            style={{ minHeight: '60px' }}
            aria-expanded={estresExpandido}
            aria-controls="estres-panel"
          >
            <div className="flex items-center gap-3">
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                style={{ background: 'var(--color-primary)' }}
                aria-hidden="true"
              >
                4
              </div>
              <div className="text-left">
                <p
                  className="text-[17px] font-semibold"
                  style={{ color: 'var(--color-text-primary)' }}
                >
                  Factor de estrés metabólico
                </p>
                <p
                  className="text-[13px]"
                  style={{ color: 'var(--color-text-secondary)' }}
                >
                  Opcional — Nutrición clínica / hospitalaria
                </p>
              </div>
            </div>
            <span style={{ color: 'var(--color-text-tertiary)' }} aria-hidden="true">
              {estresExpandido ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
            </span>
          </button>

          {/* Panel colapsable */}
          {estresExpandido && (
            <div id="estres-panel" className="px-5 pb-5 border-t" style={{ borderColor: 'var(--color-border)' }}>
              {/* Botón clínico para activar/desactivar estrés */}
              <div className="py-4">
                <button
                  type="button"
                  onClick={() => set('estres_activo', !form.estres_activo)}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg text-[13px] font-medium transition-colors border"
                  style={{
                    background:   form.estres_activo ? '#FFF3E0' : '#F2F2F7',
                    color:        form.estres_activo ? '#B45309' : '#8E8E93',
                    borderColor:  form.estres_activo ? '#FFD9A0' : 'transparent',
                    minHeight:    '44px',
                  }}
                  aria-pressed={form.estres_activo}
                  aria-label="Activar o desactivar factor de estrés metabólico"
                >
                  <span>
                    {form.estres_activo ? '✕ Quitar estrés metabólico' : '+ Agregar estrés metabólico'}
                  </span>
                </button>
              </div>

              {/* Cards de condiciones — solo si activo */}
              {form.estres_activo && (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {ESTRES_OPCIONES.map((e) => {
                    const activo = form.factor_estres === e.id
                    return (
                      <button
                        key={e.id}
                        type="button"
                        onClick={() => set('factor_estres', e.id)}
                        className="rounded-xl p-3 text-left transition-all duration-150"
                        style={{
                          minHeight: '64px',
                          border: activo
                            ? '2px solid var(--color-danger)'
                            : '2px solid var(--color-border)',
                          background: activo ? '#FF3B300D' : 'var(--color-bg)',
                        }}
                        aria-pressed={activo}
                      >
                        <p
                          className="text-[13px] font-semibold leading-tight"
                          style={{ color: 'var(--color-text-primary)' }}
                        >
                          {e.label}
                        </p>
                        <p
                          className="text-[11px] font-mono mt-0.5"
                          style={{ color: activo ? 'var(--color-danger)' : 'var(--color-text-tertiary)' }}
                        >
                          {e.rango}
                        </p>
                      </button>
                    )
                  })}
                </div>
              )}

              <p
                className="mt-3 text-[12px]"
                style={{ color: 'var(--color-text-tertiary)' }}
              >
                @source ASPEN Clinical Guidelines. JPEN. 2016;40(2):159-211.
              </p>
            </div>
          )}
        </section>

        {/* ── Panel de resultados ── */}
        <div
          className="rounded-2xl overflow-hidden"
          style={{
            background: resultado ? 'var(--color-primary)' : 'var(--color-surface)',
            boxShadow: resultado
              ? '0 4px 24px rgba(0,122,255,0.28)'
              : 'var(--shadow)',
            transition: 'all 0.3s ease',
          }}
          aria-live="polite"
          aria-label="Resultados del cálculo"
        >
          {resultado ? (
            /* ── Resultados reales ── */
            <div>
              {/* GET final — protagonista */}
              <div className="px-6 pt-6 pb-4 text-center">
                <p className="text-[13px] font-medium text-white opacity-75 mb-1">
                  Gasto Energético Total
                </p>
                <p className="font-mono text-[52px] font-bold text-white leading-none">
                  {fmtKcal(
                    form.estres_activo && resultado.factor_estres_valor > 0
                      ? resultado.get_con_estres_kcal
                      : resultado.get_final_kcal
                  )}
                </p>
                <p className="text-[17px] text-white opacity-75 mt-1">kcal/día</p>
              </div>

              {/* Desglose */}
              <div
                className="mx-4 mb-4 rounded-xl divide-y divide-white/10"
                style={{ background: 'rgba(255,255,255,0.15)' }}
              >
                {/* TMB */}
                <div className="flex items-center justify-between px-4 py-3">
                  <div>
                    <p className="text-[13px] font-semibold text-white">TMB</p>
                    <p className="text-[11px] text-white opacity-70">
                      {formulaActual.nombre}
                    </p>
                  </div>
                  <p className="font-mono text-[17px] font-bold text-white">
                    {fmtKcal(resultado.tmb_kcal)}
                    <span className="text-[13px] font-normal opacity-70 ml-1">kcal</span>
                  </p>
                </div>

                {/* NAF */}
                <div className="flex items-center justify-between px-4 py-3">
                  <div>
                    <p className="text-[13px] font-semibold text-white">GET sin ETA</p>
                    <p className="text-[11px] text-white opacity-70">
                      TMB × {resultado.naf_valor} (NAF {resultado.naf_categoria})
                    </p>
                  </div>
                  <p className="font-mono text-[17px] font-bold text-white">
                    {fmtKcal(resultado.get_sin_eta_kcal)}
                    <span className="text-[13px] font-normal opacity-70 ml-1">kcal</span>
                  </p>
                </div>

                {/* ETA */}
                <div className="flex items-center justify-between px-4 py-3">
                  <div className="flex items-center gap-1.5">
                    <div>
                      <p className="text-[13px] font-semibold text-white">ETA</p>
                      <p className="text-[11px] text-white opacity-70">
                        Efecto térmico alimentos (10%)
                      </p>
                    </div>
                    {/* Tooltip ETA */}
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setTooltipETA((p) => !p)}
                        className="text-white opacity-60 hover:opacity-100"
                        aria-label="Información sobre ETA"
                        style={{ minWidth: '28px', minHeight: '28px' }}
                      >
                        <Info size={14} />
                      </button>
                      {tooltipETA && (
                        <div
                          className="absolute left-0 bottom-full mb-2 w-56 rounded-xl p-3 text-[12px] z-10"
                          style={{
                            background: 'rgba(0,0,0,0.85)',
                            color: '#fff',
                            backdropFilter: 'blur(12px)',
                          }}
                        >
                          Energía usada para digerir y metabolizar alimentos.
                          10% del GET base.{' '}
                          <span className="opacity-70">
                            @source Tappy L. Reprod Nutr Dev. 1996.
                          </span>
                          <button
                            onClick={() => setTooltipETA(false)}
                            className="block mt-1 text-blue-300 underline"
                          >
                            Cerrar
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                  <p className="font-mono text-[17px] font-bold text-white">
                    +{fmtKcal(resultado.eta_kcal)}
                    <span className="text-[13px] font-normal opacity-70 ml-1">kcal</span>
                  </p>
                </div>

                {/* Factor estrés — solo si aplica */}
                {form.estres_activo && resultado.factor_estres_valor > 0 && (
                  <div className="flex items-center justify-between px-4 py-3">
                    <div>
                      <p className="text-[13px] font-semibold text-white">Estrés metabólico</p>
                      <p className="text-[11px] text-white opacity-70">
                        {ESTRES_OPCIONES.find((e) => e.id === resultado.factor_estres_aplicado)?.label}{' '}
                        (+{(resultado.factor_estres_valor * 100).toFixed(0)}% TMB)
                      </p>
                    </div>
                    <p className="font-mono text-[17px] font-bold text-white">
                      +{fmtKcal(resultado.get_con_estres_kcal - resultado.get_final_kcal)}
                      <span className="text-[13px] font-normal opacity-70 ml-1">kcal</span>
                    </p>
                  </div>
                )}
              </div>

              {/* Peso utilizado */}
              {resultado.peso_ajustado && (
                <div
                  className="mx-4 mb-4 rounded-xl px-4 py-3"
                  style={{ background: 'rgba(255,149,0,0.25)' }}
                >
                  <p className="text-[13px] text-white">
                    ⚠ Se usó peso ajustado{' '}
                    <strong>{resultado.peso_utilizado_kg.toFixed(1)} kg</strong>{' '}
                    por IMC {'>'} 30. Método Hamwi + ajuste 25%.
                  </p>
                </div>
              )}

              {/* Fuente bibliográfica + botón guardar */}
              <div className="flex items-center justify-between px-6 pb-5">
                <div className="flex items-center gap-1.5 text-white opacity-60">
                  <BookOpen size={12} aria-hidden="true" />
                  <p className="text-[11px]">{resultado.fuente_bibliografica}</p>
                </div>
                <button
                  type="button"
                  className="flex items-center gap-1.5 rounded-xl px-4 py-2 text-[13px] font-semibold transition-all"
                  style={{
                    background: 'rgba(255,255,255,0.2)',
                    color: '#fff',
                    minHeight: '44px',
                  }}
                  aria-label="Guardar cálculo (próximamente)"
                  title="Próximamente — requiere expediente activo"
                >
                  <Save size={14} aria-hidden="true" />
                  Guardar
                </button>
              </div>
            </div>
          ) : (
            /* ── Estado vacío ── */
            <div className="flex flex-col items-center justify-center py-12 px-6 text-center gap-3">
              <div
                className="w-12 h-12 rounded-2xl flex items-center justify-center"
                style={{ background: 'var(--color-bg)' }}
                aria-hidden="true"
              >
                <Stethoscope size={24} style={{ color: 'var(--color-text-tertiary)' }} />
              </div>
              <p
                className="text-[15px] font-medium"
                style={{ color: 'var(--color-text-secondary)' }}
              >
                Ingresa peso, talla y edad para calcular el GET
              </p>
              {(form.formula_tmb === 'katch_mcardle' || form.formula_tmb === 'cunningham') &&
                !parseNum(form.masa_magra_kg) && (
                  <p
                    className="text-[13px]"
                    style={{ color: 'var(--color-warning)' }}
                  >
                    La fórmula seleccionada requiere masa magra (kg)
                  </p>
                )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}