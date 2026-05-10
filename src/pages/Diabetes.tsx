/**
 * Diabetes.tsx — Diabetes y Síndrome Metabólico
 * Proyecto NUTRIA — Open Source
 *
 * Módulo de evaluación metabólica integrada:
 *   1. Carga Glucémica — CG de alimentos o comidas completas
 *   2. Índice TyG — marcador surrogado de resistencia insulínica
 *   3. Ratio Insulina:Carbohidratos — soporte terapia basal-bolo
 *   4. Síndrome Metabólico — criterios ATP-III (NCEP)
 *
 * Diseño Apple HIG: sin modales, Progressive Disclosure, semáforo inline.
 * Mobile-first 390px → responsive hasta 1280px.
 * Touch targets ≥ 44×44px. WCAG 2.1 AA.
 *
 * @source Brand-Miller J et al. Diabetes Care. 2003;26(8):2261-2267.       (CG)
 * @source Simental-Mendía LE et al. Metab Syndr. 2008;6(4):299-304.        (TyG)
 * @source Guerrero-Romero F et al. J Clin Endocrinol Metab. 2010;95:3347.  (TyG cortes)
 * @source Walsh J, Roberts R. Pumping Insulin. 5th ed. 2012.               (Ratio I:CH)
 * @source NCEP ATP-III. JAMA. 2001;285(19):2486-2497.                      (SM)
 * @source Grundy SM et al. Circulation. 2005;112(17):2735-2752.            (SM revisado)
 */

import { useState, useMemo, useCallback } from 'react'
import {
  Activity,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Info,
  Syringe,
  Zap,
} from 'lucide-react'
import { useDiabetes } from '../hooks/useDiabetes'
import type {
  ResultadoCargaGlucemica,
  ResultadoTyG,
  ResultadoRatioInsulinaCH,
  ResultadoSindromeMetabolico,
} from '../types/diabetes.types'

// ─────────────────────────────────────────────────────────────────────────────
// Tipos locales
// ─────────────────────────────────────────────────────────────────────────────

type SemaforoColor = 'verde' | 'amarillo' | 'rojo' | 'gris'
type SexoTipo = 'masculino' | 'femenino' | ''

// ─────────────────────────────────────────────────────────────────────────────
// Sistema de color del semáforo (idéntico a Biochemistry.tsx)
// ─────────────────────────────────────────────────────────────────────────────

const COLOR_MAP: Record<SemaforoColor, { bg: string; text: string; dot: string; badge: string }> = {
  verde:    { bg: '#E8F8EC', text: '#1B7A34', dot: '#34C759', badge: 'bg-[#E8F8EC] text-[#1B7A34]' },
  amarillo: { bg: '#FFF3E0', text: '#B45309', dot: '#FF9500', badge: 'bg-[#FFF3E0] text-[#B45309]' },
  rojo:     { bg: '#FDEAEA', text: '#B91C1C', dot: '#FF3B30', badge: 'bg-[#FDEAEA] text-[#B91C1C]' },
  gris:     { bg: '#F2F2F7', text: '#8E8E93', dot: '#C7C7CC', badge: 'bg-[#F2F2F7] text-[#8E8E93]' },
}

// ─────────────────────────────────────────────────────────────────────────────
// Componentes base reutilizables (mismo patrón que Biochemistry.tsx)
// ─────────────────────────────────────────────────────────────────────────────

function SemaforoDot({ color }: { color: SemaforoColor }) {
  return (
    <span
      aria-hidden="true"
      className="inline-block w-2.5 h-2.5 rounded-full flex-shrink-0"
      style={{ background: COLOR_MAP[color].dot }}
    />
  )
}

function SemaforoBadge({ texto, color }: { texto: string; color: SemaforoColor }) {
  return (
    <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${COLOR_MAP[color].badge}`}>
      {texto}
    </span>
  )
}

interface InputClinicoProps {
  label: string
  valor: string
  onChange: (v: string) => void
  unidad: string
  placeholder?: string
  id: string
}

function InputClinico({ label, valor, onChange, unidad, placeholder = '—', id }: InputClinicoProps) {
  return (
    <div className="flex flex-col gap-1">
      <label
        htmlFor={id}
        className="text-[11px] font-semibold uppercase tracking-widest text-[color:var(--color-text-tertiary)]"
      >
        {label}
      </label>
      <div
        className="flex items-center rounded-xl border border-[color:var(--color-border)] bg-white overflow-hidden"
        style={{ minHeight: '44px' }}
      >
        <input
          id={id}
          type="number"
          inputMode="decimal"
          value={valor}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="flex-1 px-3 py-2.5 text-[15px] font-mono text-[color:var(--color-text-primary)] bg-transparent outline-none placeholder:text-[color:var(--color-text-tertiary)]"
          style={{ minWidth: 0 }}
          aria-label={label}
        />
        <span className="pr-3 text-[13px] text-[color:var(--color-text-tertiary)] font-medium flex-shrink-0">
          {unidad}
        </span>
      </div>
    </div>
  )
}

interface SelectClinicoProps {
  label: string
  valor: string
  onChange: (v: string) => void
  opciones: { valor: string; etiqueta: string }[]
  id: string
}

function SelectClinico({ label, valor, onChange, opciones, id }: SelectClinicoProps) {
  return (
    <div className="flex flex-col gap-1">
      <label
        htmlFor={id}
        className="text-[11px] font-semibold uppercase tracking-widest text-[color:var(--color-text-tertiary)]"
      >
        {label}
      </label>
      <select
        id={id}
        value={valor}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-xl border border-[color:var(--color-border)] bg-white px-3 text-[15px] text-[color:var(--color-text-primary)] outline-none appearance-none"
        style={{ minHeight: '44px', backgroundImage: 'none' }}
        aria-label={label}
      >
        <option value="">Seleccionar…</option>
        {opciones.map((op) => (
          <option key={op.valor} value={op.valor}>{op.etiqueta}</option>
        ))}
      </select>
    </div>
  )
}

interface ResultadoCardProps {
  label: string
  valor: string
  unidad?: string
  color: SemaforoColor
  etiqueta: string
  nota?: string
}

function ResultadoCard({ label, valor, unidad, color, etiqueta, nota }: ResultadoCardProps) {
  return (
    <div
      className="rounded-xl p-4 flex flex-col gap-2"
      style={{ background: COLOR_MAP[color].bg }}
      role="status"
      aria-label={`${label}: ${valor}${unidad ? ' ' + unidad : ''} — ${etiqueta}`}
    >
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <SemaforoDot color={color} />
          <span className="text-[13px] font-medium text-[color:var(--color-text-secondary)]">{label}</span>
        </div>
        <SemaforoBadge texto={etiqueta} color={color} />
      </div>
      <div className="flex items-baseline gap-1">
        <span className="text-[28px] font-bold font-mono" style={{ color: COLOR_MAP[color].text }}>
          {valor}
        </span>
        {unidad && (
          <span className="text-[13px] text-[color:var(--color-text-secondary)]">{unidad}</span>
        )}
      </div>
      {nota && (
        <p className="text-[11px] text-[color:var(--color-text-secondary)] leading-relaxed">{nota}</p>
      )}
    </div>
  )
}

interface SeccionColapsableProps {
  titulo: string
  icono: React.ReactNode
  children: React.ReactNode
  defaultAbierta?: boolean
}

function SeccionColapsable({ titulo, icono, children, defaultAbierta = false }: SeccionColapsableProps) {
  const [abierta, setAbierta] = useState(defaultAbierta)
  return (
    <section
      className="rounded-2xl bg-white border border-[color:var(--color-border)] overflow-hidden"
      style={{ boxShadow: 'var(--shadow)' }}
    >
      <button
        onClick={() => setAbierta((p) => !p)}
        className="w-full flex items-center justify-between px-4 py-4 text-left"
        style={{ minHeight: '56px' }}
        aria-expanded={abierta}
        aria-label={`${abierta ? 'Colapsar' : 'Expandir'} sección ${titulo}`}
      >
        <div className="flex items-center gap-2.5">
          <span className="text-[color:var(--color-text-tertiary)]">{icono}</span>
          <span className="text-[15px] font-semibold text-[color:var(--color-text-primary)]">{titulo}</span>
        </div>
        {abierta
          ? <ChevronUp size={16} className="text-[color:var(--color-text-tertiary)]" />
          : <ChevronDown size={16} className="text-[color:var(--color-text-tertiary)]" />
        }
      </button>
      {abierta && (
        <div className="px-4 pb-5 border-t border-[color:var(--color-border)]">
          <div className="pt-4">{children}</div>
        </div>
      )}
    </section>
  )
}

function DividerSeccion({ titulo }: { titulo: string }) {
  return (
    <p className="text-[10px] font-semibold uppercase tracking-widest text-[color:var(--color-text-tertiary)] mt-5 mb-3 px-1">
      {titulo}
    </p>
  )
}

function FuenteBibliografica({ texto }: { texto: string }) {
  return (
    <div className="flex items-start gap-1.5 mt-4 p-3 rounded-xl bg-[#F2F2F7]">
      <Info size={12} className="text-[color:var(--color-text-tertiary)] mt-[1px] flex-shrink-0" />
      <p className="text-[11px] text-[color:var(--color-text-tertiary)] leading-relaxed">{texto}</p>
    </div>
  )
}

function SeccionHeader({
  titulo, descripcion, icono, colorBg, colorText,
}: {
  titulo: string; descripcion: string; icono: React.ReactNode; colorBg: string; colorText: string
}) {
  return (
    <div className="flex items-center gap-3 mb-1.5">
      <div
        className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ background: colorBg, color: colorText }}
      >
        {icono}
      </div>
      <div>
        <h2 className="text-[15px] font-semibold text-[color:var(--color-text-primary)]">{titulo}</h2>
        <p className="text-[12px] text-[color:var(--color-text-secondary)]">{descripcion}</p>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Componente: indicador de criterio del Síndrome Metabólico
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Fila de criterio con semáforo booleano + texto + valor referencia.
 * null = dato no proporcionado ("No evaluado").
 */
function CriterioSM({
  label,
  cumple,
  referencia,
}: {
  label: string
  cumple: boolean | null
  referencia: string
}) {
  const color: SemaforoColor =
    cumple === null ? 'gris' : cumple ? 'rojo' : 'verde'
  const etiqueta =
    cumple === null ? 'No evaluado' : cumple ? 'Criterio positivo' : 'Normal'

  return (
    <div
      className="flex items-center justify-between gap-3 py-2.5 px-3 rounded-xl"
      style={{ background: COLOR_MAP[color].bg }}
      role="listitem"
    >
      <div className="flex items-center gap-2 min-w-0">
        <SemaforoDot color={color} />
        <div className="min-w-0">
          <p className="text-[13px] font-medium text-[color:var(--color-text-primary)] truncate">{label}</p>
          <p className="text-[11px] text-[color:var(--color-text-tertiary)]">{referencia}</p>
        </div>
      </div>
      <SemaforoBadge texto={etiqueta} color={color} />
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Sección 1 — Carga Glucémica (abierta por defecto — herramienta de uso diario)
// ─────────────────────────────────────────────────────────────────────────────

function SeccionCargaGlucemica() {
  const { calcularCargaGlucemica } = useDiabetes()

  const [ig,  setIg]  = useState('')
  const [hc,  setHc]  = useState('')

  const igNum = parseFloat(ig)
  const hcNum = parseFloat(hc)

  const resultado = useMemo<ResultadoCargaGlucemica | null>(() => {
    if (isNaN(igNum) || isNaN(hcNum) || igNum <= 0 || hcNum <= 0) return null
    try {
      return calcularCargaGlucemica({ indice_glucemico: igNum, hidratos_disponibles_g: hcNum })
    } catch {
      return null
    }
  }, [igNum, hcNum, calcularCargaGlucemica])

  const colorCG = (r: ResultadoCargaGlucemica): SemaforoColor => {
    if (r.clasificacion === 'baja')  return 'verde'
    if (r.clasificacion === 'media') return 'amarillo'
    return 'rojo'
  }

  const etiquetaCG = (r: ResultadoCargaGlucemica): string => {
    if (r.clasificacion === 'baja')  return `CG Baja — ${r.carga_glucemica.toFixed(1)} (< 10)`
    if (r.clasificacion === 'media') return `CG Media — ${r.carga_glucemica.toFixed(1)} (10–19)`
    return `CG Alta — ${r.carga_glucemica.toFixed(1)} (≥ 20)`
  }

  const notaCG = (r: ResultadoCargaGlucemica): string => {
    if (r.clasificacion === 'baja')
      return 'Impacto glucémico bajo. Adecuado para planes con control de glucemia postprandial.'
    if (r.clasificacion === 'media')
      return 'Impacto glucémico moderado. Considerar distribución de HC en tiempos de comida.'
    return 'Impacto glucémico alto. Revisar tamaño de porción o sustituir por alimentos de IG menor.'
  }

  return (
    <section
      className="rounded-2xl bg-white border border-[color:var(--color-border)] overflow-hidden"
      style={{ boxShadow: 'var(--shadow)' }}
      aria-labelledby="titulo-cg"
    >
      <div className="px-4 pt-5 pb-4">
        <SeccionHeader
          titulo="Carga Glucémica"
          descripcion="Impacto real en glucemia según porción consumida"
          icono={<Zap size={18} />}
          colorBg="#FEF3F2"
          colorText="#B91C1C"
        />
      </div>

      <div className="px-4 pb-5 border-t border-[color:var(--color-border)]">
        <div className="pt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <InputClinico
            id="cg-ig"
            label="Índice glucémico del alimento"
            valor={ig}
            onChange={setIg}
            unidad="(0–100)"
            placeholder="ej. 72 (arroz)"
          />
          <InputClinico
            id="cg-hc"
            label="HC disponibles de la porción"
            valor={hc}
            onChange={setHc}
            unidad="g"
            placeholder="ej. 53 g"
          />
        </div>

        {/* Fórmula visual */}
        <div className="mt-3 p-3 rounded-xl border border-[color:var(--color-border)] bg-[#F9F9FB]">
          <p className="text-[12px] font-mono text-[color:var(--color-text-secondary)]">
            CG = (IG × HC_disponibles_g) / 100
          </p>
          <p className="text-[11px] text-[color:var(--color-text-tertiary)] mt-1">
            HC_disponibles = HC_totales − Fibra dietética (solo HC que elevan glucemia)
          </p>
        </div>

        {resultado && (
          <>
            <DividerSeccion titulo="Resultado" />
            <ResultadoCard
              label="Carga Glucémica"
              valor={resultado.carga_glucemica.toFixed(1)}
              color={colorCG(resultado)}
              etiqueta={etiquetaCG(resultado)}
              nota={notaCG(resultado)}
            />
          </>
        )}

        <FuenteBibliografica texto="Brand-Miller J et al. Diabetes Care. 2003;26(8):2261-2267. | Am J Clin Nutr. 2009;89(1):97-105." />
      </div>
    </section>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Sección 2 — Índice TyG
// ─────────────────────────────────────────────────────────────────────────────

function SeccionIndiceTyG() {
  const { calcularIndiceTyG } = useDiabetes()

  const [tg,       setTg]       = useState('')
  const [glucosa,  setGlucosa]  = useState('')

  const tgNum  = parseFloat(tg)
  const glcNum = parseFloat(glucosa)

  const resultado = useMemo<ResultadoTyG | null>(() => {
    if (isNaN(tgNum) || isNaN(glcNum) || tgNum <= 0 || glcNum <= 0) return null
    try {
      return calcularIndiceTyG({ trigliceridos_mg_dl: tgNum, glucosa_mg_dl: glcNum })
    } catch {
      return null
    }
  }, [tgNum, glcNum, calcularIndiceTyG])

  const colorTyG = (r: ResultadoTyG): SemaforoColor => {
    if (r.riesgo === 'bajo')     return 'verde'
    if (r.riesgo === 'moderado') return 'amarillo'
    return 'rojo'
  }

  const etiquetaTyG = (r: ResultadoTyG): string => {
    if (r.riesgo === 'bajo')     return 'Bajo riesgo (< 8.38)'
    if (r.riesgo === 'moderado') return 'Riesgo moderado (8.38–9.06)'
    return 'Riesgo alto (> 9.06)'
  }

  const notaTyG = (r: ResultadoTyG): string => {
    if (r.riesgo === 'bajo')
      return 'Sensibilidad insulínica preservada. Marcador surrogado sin necesidad de insulinemia.'
    if (r.riesgo === 'moderado')
      return 'Posible resistencia a la insulina. Complementar con HOMA-IR si hay insulinemia disponible.'
    return 'Alta probabilidad de resistencia insulínica. Evaluar síndrome metabólico y otros factores de riesgo CV.'
  }

  return (
    <SeccionColapsable
      titulo="Índice TyG (Triglicéridos × Glucosa)"
      icono={<Activity size={16} />}
      defaultAbierta={false}
    >
      <p className="text-[13px] text-[color:var(--color-text-secondary)] mb-4 leading-relaxed">
        Marcador surrogado de resistencia insulínica obtenido de laboratorios de rutina.
        No requiere insulinemia — útil como tamizaje en primer nivel de atención.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <InputClinico
          id="tyg-tg"
          label="Triglicéridos en ayuno"
          valor={tg}
          onChange={setTg}
          unidad="mg/dL"
          placeholder="< 150 normal"
        />
        <InputClinico
          id="tyg-glc"
          label="Glucosa en ayuno"
          valor={glucosa}
          onChange={setGlucosa}
          unidad="mg/dL"
          placeholder="70–99 normal"
        />
      </div>

      <div className="mt-3 p-3 rounded-xl border border-[color:var(--color-border)] bg-[#F9F9FB]">
        <p className="text-[12px] font-mono text-[color:var(--color-text-secondary)]">
          TyG = ln( (TG / 2) × (Glucosa / 2) )
        </p>
        <p className="text-[11px] text-[color:var(--color-text-tertiary)] mt-1">
          Puntos de corte en mg/dL: {'< 8.38'} bajo · 8.38–9.06 moderado · {'> 9.06'} alto
        </p>
      </div>

      {resultado && (
        <>
          <DividerSeccion titulo="Resultado" />
          <ResultadoCard
            label="Índice TyG"
            valor={resultado.indice_tyg.toFixed(2)}
            color={colorTyG(resultado)}
            etiqueta={etiquetaTyG(resultado)}
            nota={notaTyG(resultado)}
          />
        </>
      )}

      <FuenteBibliografica texto="Simental-Mendía LE et al. Metab Syndr Relat Disord. 2008;6(4):299-304. | Guerrero-Romero F et al. J Clin Endocrinol Metab. 2010;95(7):3347-3351." />
    </SeccionColapsable>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Sección 3 — Ratio Insulina:Carbohidratos
// ─────────────────────────────────────────────────────────────────────────────

function SeccionRatioInsulinaCH() {
  const { calcularRatioInsulinaCH } = useDiabetes()

  const [dosis, setDosis] = useState('')
  const [hc,    setHc]    = useState('')

  const dosisNum = parseFloat(dosis)
  const hcNum    = parseFloat(hc)

  const resultado = useMemo<ResultadoRatioInsulinaCH | null>(() => {
    if (isNaN(dosisNum) || isNaN(hcNum) || dosisNum <= 0 || hcNum <= 0) return null
    try {
      return calcularRatioInsulinaCH({
        dosis_insulina_unidades: dosisNum,
        hidratos_g: hcNum,
      })
    } catch {
      return null
    }
  }, [dosisNum, hcNum, calcularRatioInsulinaCH])

  return (
    <SeccionColapsable
      titulo="Ratio Insulina:Carbohidratos"
      icono={<Syringe size={16} />}
      defaultAbierta={false}
    >
      <p className="text-[13px] text-[color:var(--color-text-secondary)] mb-4 leading-relaxed">
        Soporte para pacientes con insulinoterapia intensiva (basal-bolo).
        Calcula cuántos gramos de HC cubre 1 unidad de insulina de acción rápida.
      </p>

      {/* Advertencia clínica específica — inline, sin modal */}
      <div
        className="flex items-start gap-2.5 p-3 rounded-xl mb-4 border"
        style={{ background: '#FFFBEB', borderColor: '#FDE68A' }}
        role="note"
      >
        <AlertCircle size={14} className="flex-shrink-0 mt-0.5" style={{ color: '#B45309' }} />
        <p className="text-[11px] leading-relaxed" style={{ color: '#78350F' }}>
          <span className="font-semibold">Uso de apoyo únicamente.</span> El ratio
          es individual y varía por hora del día y condición clínica. No reemplaza
          la prescripción del médico tratante.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <InputClinico
          id="ratio-dosis"
          label="Dosis de insulina rápida"
          valor={dosis}
          onChange={setDosis}
          unidad="U"
          placeholder="ej. 3"
        />
        <InputClinico
          id="ratio-hc"
          label="Hidratos de carbono de la comida"
          valor={hc}
          onChange={setHc}
          unidad="g"
          placeholder="ej. 45"
        />
      </div>

      <div className="mt-3 p-3 rounded-xl border border-[color:var(--color-border)] bg-[#F9F9FB]">
        <p className="text-[12px] font-mono text-[color:var(--color-text-secondary)]">
          Ratio (U/g) = Dosis_U / HC_g &nbsp;·&nbsp; Inverso (g/U) = HC_g / Dosis_U
        </p>
      </div>

      {resultado && (
        <>
          <DividerSeccion titulo="Resultado" />
          {/* Dos tarjetas: ratio y su inverso — el inverso es más intuitivo */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <ResultadoCard
              label="Ratio insulina:CH"
              valor={resultado.ratio_u_por_g.toFixed(3)}
              unidad="U/g"
              color="gris"
              etiqueta="Calculado"
              nota="Unidades de insulina por gramo de carbohidrato."
            />
            <ResultadoCard
              label="Cobertura por unidad"
              valor={resultado.gramos_ch_por_unidad.toFixed(1)}
              unidad="g HC / U"
              color="gris"
              etiqueta="Para el paciente"
              nota={`1 unidad de insulina cubre ${resultado.gramos_ch_por_unidad.toFixed(1)} g de carbohidratos.`}
            />
          </div>
        </>
      )}

      <FuenteBibliografica texto="Walsh J, Roberts R. Pumping Insulin. 5th ed. Torrey Pines Press; 2012. | ADA Standards of Care 2024. Diabetes Care. 2024;47(Suppl 1):S158." />
    </SeccionColapsable>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Sección 4 — Síndrome Metabólico (ATP-III)
// ─────────────────────────────────────────────────────────────────────────────

function SeccionSindromeMetabolico() {
  const { diagnosticarSindromeMetabolico } = useDiabetes()

  const [sexo,     setSexo]     = useState<SexoTipo>('')
  const [glucosa,  setGlucosa]  = useState('')
  const [tg,       setTg]       = useState('')
  const [hdl,      setHdl]      = useState('')
  const [pas,      setPas]      = useState('')
  const [cintura,  setCintura]  = useState('')

  const actualizarSexo = useCallback((v: string) => setSexo(v as SexoTipo), [])

  const glcNum = parseFloat(glucosa)
  const tgNum  = parseFloat(tg)
  const hdlNum = parseFloat(hdl)
  const pasNum = parseFloat(pas)
  const cinNum = parseFloat(cintura)

  // Datos mínimos requeridos: glucosa, TG, HDL y sexo
  const datosMinimos =
    !isNaN(glcNum) && glcNum > 0 &&
    !isNaN(tgNum)  && tgNum  > 0 &&
    !isNaN(hdlNum) && hdlNum > 0 &&
    sexo !== ''

  const resultado = useMemo<ResultadoSindromeMetabolico | null>(() => {
    if (!datosMinimos) return null
    try {
      return diagnosticarSindromeMetabolico({
        glucosa_mg_dl:           glcNum,
        trigliceridos_mg_dl:     tgNum,
        hdl_mg_dl:               hdlNum,
        presion_sistolica:       !isNaN(pasNum) && pasNum > 0 ? pasNum : undefined,
        circunferencia_cintura_cm: !isNaN(cinNum) && cinNum > 0 ? cinNum : undefined,
        sexo:                    sexo as 'masculino' | 'femenino',
      })
    } catch {
      return null
    }
  }, [glcNum, tgNum, hdlNum, pasNum, cinNum, sexo, datosMinimos, diagnosticarSindromeMetabolico])

  // Color del veredicto final
  const colorVeredicto = (r: ResultadoSindromeMetabolico): SemaforoColor => {
    if (r.tiene_sindrome_metabolico === null) return 'gris'
    return r.tiene_sindrome_metabolico ? 'rojo' : 'verde'
  }

  const etiquetaVeredicto = (r: ResultadoSindromeMetabolico): string => {
    if (r.tiene_sindrome_metabolico === null)
      return `Datos insuficientes (${r.criterios_evaluados}/5 evaluados)`
    if (r.tiene_sindrome_metabolico)
      return `Síndrome Metabólico — ${r.criterios_positivos}/${r.criterios_evaluados} criterios`
    return `Sin síndrome metabólico — ${r.criterios_positivos}/${r.criterios_evaluados} criterios`
  }

  const notaVeredicto = (r: ResultadoSindromeMetabolico): string => {
    if (r.tiene_sindrome_metabolico === null)
      return 'Ingresa presión arterial y cintura para un diagnóstico completo (5/5 criterios).'
    if (r.tiene_sindrome_metabolico)
      return 'Diagnóstico ATP-III: ≥3 criterios positivos. Riesgo aumentado de DM2 y ECV. Intervención de estilo de vida prioritaria.'
    return 'No cumple criterios ATP-III para síndrome metabólico en los datos disponibles.'
  }

  // Referencia de cada criterio según sexo
  const refHDL = sexo === 'femenino' ? 'HDL < 50 mg/dL ♀' : 'HDL < 40 mg/dL ♂'
  const refCintura = sexo === 'femenino' ? 'Cintura > 88 cm ♀ (ATP-III)' : 'Cintura > 102 cm ♂ (ATP-III)'

  return (
    <SeccionColapsable
      titulo="Síndrome Metabólico"
      icono={<Activity size={16} />}
      defaultAbierta={false}
    >
      <p className="text-[13px] text-[color:var(--color-text-secondary)] mb-4 leading-relaxed">
        Evaluación de los 5 criterios ATP-III (NCEP). Diagnóstico: ≥ 3 criterios positivos.
        Los dos últimos campos son opcionales — sin ellos el diagnóstico es parcial.
      </p>

      {/* Sexo — obligatorio para umbrales de HDL y cintura */}
      <div className="mb-3">
        <SelectClinico
          id="sm-sexo"
          label="Sexo biológico"
          valor={sexo}
          onChange={actualizarSexo}
          opciones={[
            { valor: 'masculino', etiqueta: 'Masculino' },
            { valor: 'femenino',  etiqueta: 'Femenino' },
          ]}
        />
      </div>

      {/* Campos obligatorios */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <InputClinico
          id="sm-glc"
          label="Glucosa en ayuno"
          valor={glucosa}
          onChange={setGlucosa}
          unidad="mg/dL"
          placeholder="≥ 100 = criterio +"
        />
        <InputClinico
          id="sm-tg"
          label="Triglicéridos"
          valor={tg}
          onChange={setTg}
          unidad="mg/dL"
          placeholder="≥ 150 = criterio +"
        />
        <InputClinico
          id="sm-hdl"
          label="HDL-Colesterol"
          valor={hdl}
          onChange={setHdl}
          unidad="mg/dL"
          placeholder="H < 40 / M < 50"
        />
      </div>

      {/* Campos opcionales */}
      <p className="text-[10px] font-semibold uppercase tracking-widest text-[color:var(--color-text-tertiary)] mt-4 mb-2 px-1">
        Opcionales (criterios 4 y 5)
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <InputClinico
          id="sm-pas"
          label="Presión arterial sistólica"
          valor={pas}
          onChange={setPas}
          unidad="mmHg"
          placeholder="≥ 130 = criterio +"
        />
        <InputClinico
          id="sm-cintura"
          label="Circunferencia de cintura"
          valor={cintura}
          onChange={setCintura}
          unidad="cm"
          placeholder="H > 102 / M > 88"
        />
      </div>

      {resultado && (
        <>
          <DividerSeccion titulo="Veredicto" />

          {/* Tarjeta de diagnóstico principal */}
          <ResultadoCard
            label="Diagnóstico ATP-III"
            valor={`${resultado.criterios_positivos} / ${resultado.criterios_evaluados}`}
            unidad="criterios positivos"
            color={colorVeredicto(resultado)}
            etiqueta={etiquetaVeredicto(resultado)}
            nota={notaVeredicto(resultado)}
          />

          {/* Detalle de cada criterio */}
          <DividerSeccion titulo="Desglose de criterios" />
          <div className="flex flex-col gap-2" role="list" aria-label="Criterios ATP-III evaluados">
            <CriterioSM
              label="Glucosa alterada en ayuno"
              cumple={resultado.criterios_detalle.glucosa_alterada}
              referencia="Glucosa ≥ 100 mg/dL"
            />
            <CriterioSM
              label="Triglicéridos elevados"
              cumple={resultado.criterios_detalle.trigliceridos_altos}
              referencia="TG ≥ 150 mg/dL"
            />
            <CriterioSM
              label="HDL bajo"
              cumple={resultado.criterios_detalle.hdl_bajo}
              referencia={refHDL}
            />
            <CriterioSM
              label="Presión arterial elevada"
              cumple={resultado.criterios_detalle.presion_alta}
              referencia="PAS ≥ 130 mmHg"
            />
            <CriterioSM
              label="Cintura aumentada"
              cumple={resultado.criterios_detalle.cintura_aumentada}
              referencia={refCintura}
            />
          </div>

          {/* Nota sobre criterios IDF para Latinoamérica */}
          {resultado.criterios_detalle.cintura_aumentada === false && sexo !== '' && (
            <div
              className="flex items-start gap-2 mt-3 p-3 rounded-xl border"
              style={{ background: '#EFF6FF', borderColor: '#BFDBFE' }}
            >
              <Info size={13} className="flex-shrink-0 mt-0.5" style={{ color: '#1D4ED8' }} />
              <p className="text-[11px] leading-relaxed" style={{ color: '#1E40AF' }}>
                <span className="font-semibold">Nota IDF para latinoamericanos:</span> La Federación Internacional de Diabetes usa puntos de corte más estrictos (♂ &gt; 90 cm / ♀ &gt; 80 cm). El criterio de cintura podría ser positivo con estos umbrales.
              </p>
            </div>
          )}
        </>
      )}

      <FuenteBibliografica texto="NCEP Expert Panel. ATP-III. JAMA. 2001;285(19):2486-2497. | Grundy SM et al. Circulation. 2005;112(17):2735-2752. | IDF. Worldwide definition of metabolic syndrome. 2006." />
    </SeccionColapsable>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Banner de aviso clínico (idéntico al de Biochemistry.tsx)
// ─────────────────────────────────────────────────────────────────────────────

function BannerClinical() {
  return (
    <div
      className="flex items-start gap-3 p-4 rounded-2xl border"
      style={{ background: '#FFFBEB', borderColor: '#FDE68A' }}
      role="note"
      aria-label="Advertencia clínica"
    >
      <AlertCircle size={18} className="flex-shrink-0 mt-0.5" style={{ color: '#B45309' }} />
      <p className="text-[12px] leading-relaxed" style={{ color: '#78350F' }}>
        <span className="font-semibold">Uso clínico:</span> Herramienta de apoyo para estudiantes de nutrición. Los resultados deben interpretarse en contexto clínico completo. No sustituye el juicio del profesional de salud ni reemplaza la prescripción médica en pacientes con insulinoterapia.
      </p>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Componente principal exportado
// ─────────────────────────────────────────────────────────────────────────────

export default function Diabetes() {
  return (
    <div className="max-w-2xl mx-auto px-4 pt-6 pb-24 md:pb-8 md:px-6 md:pt-8">

      {/* ── Encabezado ── */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center text-red-600 flex-shrink-0">
            <Activity size={22} />
          </div>
          <h1 className="text-[22px] font-semibold text-[color:var(--color-text-primary)]">
            Diabetes y Síndrome Metabólico
          </h1>
        </div>
        <p className="text-[13px] text-[color:var(--color-text-secondary)] leading-relaxed ml-[52px]">
          Carga glucémica, índice TyG, ratio insulina:CH y criterios ATP-III de síndrome metabólico.
        </p>
      </div>

      <BannerClinical />

      {/* ── Secciones ── */}
      <div className="mt-5 flex flex-col gap-4">
        <SeccionCargaGlucemica />
        <SeccionIndiceTyG />
        <SeccionRatioInsulinaCH />
        <SeccionSindromeMetabolico />
      </div>

    </div>
  )
}