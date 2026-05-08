/**
 * Biochemistry.tsx — Laboratorios Clínicos
 * Proyecto NUTRIA — Open Source
 *
 * Módulo de registro e interpretación de valores bioquímicos clínicos:
 *   1. Perfil glucémico (Glucosa, HbA1c, Insulina, HOMA-IR)
 *   2. Perfil lipídico (CT, LDL, HDL, TG)
 *   3. Función renal (CKD-EPI 2021, estadio ERC)
 *   4. Balance nitrogenado (colapsable)
 *   5. Ácido úrico, albúmina, hemoglobina (colapsable)
 *
 * Diseño Apple HIG: sin modales, Progressive Disclosure, semáforo inline.
 * Mobile-first 390px → responsive hasta 1280px.
 * Touch targets ≥ 44×44px. WCAG 2.1 AA.
 *
 * @source Matthews DR et al. Diabetologia. 1985;28(7):412-419.       (HOMA-IR)
 * @source Inker LA et al. NEJM. 2021;385:1737-1749.                  (CKD-EPI 2021)
 * @source Bistrian BR. Nutritional assessment. ASPEN. 1990.           (Balance N)
 * @source NOM-037-SSA2 + ATP-III (NCEP) + Harrison 21st ed.          (Lípidos)
 * @source ADA Standards of Care 2024.                                 (Glucosa)
 */

import { useState, useMemo, useCallback } from 'react'
import {
  FlaskConical,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Info,
} from 'lucide-react'
import { useBiochemistry } from '../hooks/useBiochemistry'
import type {
  ParámetrosHOMA,
  ParámetrosCKDEPI,
  ParámetrosBN,
  ResultadoHOMA,
  ResultadoCKDEPI,
  ResultadoBN,
} from '../types/biochemistry.types'

// ─────────────────────────────────────────────────────────────────────────────
// Tipos locales
// ─────────────────────────────────────────────────────────────────────────────

type SemaforoColor = 'verde' | 'amarillo' | 'rojo' | 'gris'

type SexoTipo = 'masculino' | 'femenino' | ''

interface ValorLipido {
  colesterol_total: string
  ldl: string
  hdl: string
  trigliceridos: string
}

interface ValorOtros {
  acido_urico: string
  albumina: string
  hemoglobina: string
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers de semáforo
// ─────────────────────────────────────────────────────────────────────────────

const COLOR_MAP: Record<SemaforoColor, { bg: string; text: string; dot: string; badge: string }> = {
  verde:   { bg: '#E8F8EC', text: '#1B7A34', dot: '#34C759', badge: 'bg-[#E8F8EC] text-[#1B7A34]' },
  amarillo:{ bg: '#FFF3E0', text: '#B45309', dot: '#FF9500', badge: 'bg-[#FFF3E0] text-[#B45309]' },
  rojo:    { bg: '#FDEAEA', text: '#B91C1C', dot: '#FF3B30', badge: 'bg-[#FDEAEA] text-[#B91C1C]' },
  gris:    { bg: '#F2F2F7', text: '#8E8E93', dot: '#C7C7CC', badge: 'bg-[#F2F2F7] text-[#8E8E93]' },
}

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

// ─────────────────────────────────────────────────────────────────────────────
// Componentes UI reutilizables
// ─────────────────────────────────────────────────────────────────────────────

interface InputClinicoProps {
  label: string
  valor: string
  onChange: (v: string) => void
  unidad: string
  placeholder?: string
  min?: number
  max?: number
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
      aria-label={`${label}: ${valor} ${unidad ?? ''} — ${etiqueta}`}
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
    <section className="rounded-2xl bg-white border border-[color:var(--color-border)] overflow-hidden" style={{ boxShadow: 'var(--shadow)' }}>
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

function SeccionHeader({ titulo, descripcion, icono, colorBg, colorText }: {
  titulo: string; descripcion: string; icono: React.ReactNode; colorBg: string; colorText: string
}) {
  return (
    <div className="flex items-center gap-3 mb-1.5">
      <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: colorBg, color: colorText }}>
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
// Lógica de clasificación glucémica
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Clasifica la glucosa en ayuno.
 * @source ADA Standards of Care 2024. Diabetes Care 2024;47(Suppl 1):S20–S45.
 */
function clasificarGlucosa(glucosa: number): { etiqueta: string; color: SemaforoColor } {
  if (glucosa < 70)  return { etiqueta: 'Hipoglucemia',  color: 'rojo' }
  if (glucosa <= 99) return { etiqueta: 'Normal',         color: 'verde' }
  if (glucosa <= 125) return { etiqueta: 'Prediabetes',  color: 'amarillo' }
  return                    { etiqueta: 'Diabetes',       color: 'rojo' }
}

/**
 * Clasifica HbA1c.
 * @source ADA Standards of Care 2024.
 */
function clasificarHbA1c(hba1c: number): { etiqueta: string; color: SemaforoColor } {
  if (hba1c < 5.7)  return { etiqueta: 'Normal',      color: 'verde' }
  if (hba1c <= 6.4) return { etiqueta: 'Prediabetes', color: 'amarillo' }
  return                   { etiqueta: 'Diabetes',     color: 'rojo' }
}

// ─────────────────────────────────────────────────────────────────────────────
// Lógica de clasificación lipídica
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Clasifica el colesterol total.
 * @source NOM-037-SSA2 + ATP-III (NCEP).
 */
function clasificarColesterolTotal(v: number): { etiqueta: string; color: SemaforoColor } {
  if (v < 200) return { etiqueta: 'Deseable',      color: 'verde' }
  if (v < 240) return { etiqueta: 'Limítrofe alto', color: 'amarillo' }
  return              { etiqueta: 'Alto',            color: 'rojo' }
}

function clasificarLDL(v: number): { etiqueta: string; color: SemaforoColor } {
  if (v < 100) return { etiqueta: 'Óptimo',        color: 'verde' }
  if (v < 130) return { etiqueta: 'Casi óptimo',   color: 'verde' }
  if (v < 160) return { etiqueta: 'Limítrofe alto', color: 'amarillo' }
  if (v < 190) return { etiqueta: 'Alto',           color: 'rojo' }
  return              { etiqueta: 'Muy alto',        color: 'rojo' }
}

function clasificarHDL(v: number, sexo: SexoTipo): { etiqueta: string; color: SemaforoColor } {
  const umbral_bajo = sexo === 'femenino' ? 50 : 40
  if (v < umbral_bajo) return { etiqueta: 'Bajo — riesgo CV', color: 'rojo' }
  if (v < 60)          return { etiqueta: 'Normal',           color: 'amarillo' }
  return                      { etiqueta: 'Óptimo — protector', color: 'verde' }
}

function clasificarTrigliceridos(v: number): { etiqueta: string; color: SemaforoColor } {
  if (v < 150) return { etiqueta: 'Normal',         color: 'verde' }
  if (v < 200) return { etiqueta: 'Limítrofe alto', color: 'amarillo' }
  if (v < 500) return { etiqueta: 'Alto',           color: 'rojo' }
  return              { etiqueta: 'Muy alto',        color: 'rojo' }
}

/**
 * Riesgo CV compuesto simplificado (no reemplaza SCORE o Framingham).
 */
function clasificarRiesgoCV(
  ct: number, ldl: number, hdl: number, tg: number, sexo: SexoTipo
): { etiqueta: string; color: SemaforoColor } {
  const umbralHDL = sexo === 'femenino' ? 50 : 40
  const factoresRiesgo = [
    ct >= 240, ldl >= 160, hdl < umbralHDL, tg >= 200
  ].filter(Boolean).length

  if (factoresRiesgo === 0) return { etiqueta: 'Bajo',    color: 'verde' }
  if (factoresRiesgo === 1) return { etiqueta: 'Moderado', color: 'amarillo' }
  return                           { etiqueta: 'Alto',     color: 'rojo' }
}

// ─────────────────────────────────────────────────────────────────────────────
// Lógica de clasificación de ácido úrico, albúmina, hemoglobina
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @source Harrison's Principles of Internal Medicine. 21st ed.
 */
function clasificarAcidoUrico(v: number, sexo: SexoTipo): { etiqueta: string; color: SemaforoColor } {
  const max = sexo === 'femenino' ? 6.0 : 7.2
  const min = sexo === 'femenino' ? 2.5 : 3.5
  if (v < min) return { etiqueta: 'Bajo', color: 'amarillo' }
  if (v <= max) return { etiqueta: 'Normal', color: 'verde' }
  return              { etiqueta: 'Hiperuricemia', color: 'rojo' }
}

function clasificarAlbumina(v: number): { etiqueta: string; color: SemaforoColor } {
  if (v >= 3.5) return { etiqueta: 'Normal',                   color: 'verde' }
  if (v >= 3.0) return { etiqueta: 'Hipoalbuminemia leve',     color: 'amarillo' }
  if (v >= 2.5) return { etiqueta: 'Hipoalbuminemia moderada', color: 'rojo' }
  return               { etiqueta: 'Hipoalbuminemia severa',   color: 'rojo' }
}

function clasificarHemoglobina(v: number, sexo: SexoTipo): { etiqueta: string; color: SemaforoColor } {
  const min = sexo === 'femenino' ? 12.0 : 13.5
  const max = sexo === 'femenino' ? 16.0 : 17.5
  if (v < min) return { etiqueta: 'Anemia',   color: 'rojo' }
  if (v > max) return { etiqueta: 'Elevada',  color: 'amarillo' }
  return              { etiqueta: 'Normal',   color: 'verde' }
}

// ─────────────────────────────────────────────────────────────────────────────
// Componente de proteína recomendada por estadio ERC
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Recomendación proteica ajustada por estadio ERC.
 * @source KDOQI Clinical Practice Guidelines for Nutrition in CKD: 2020 Update.
 */
function proteínaERC(estadio: string): string {
  if (estadio === 'G1' || estadio === 'G2') return '0.8 g/kg/día (requerimiento estándar)'
  if (estadio === 'G3a' || estadio === 'G3b') return '0.6–0.8 g/kg/día (restricción moderada)'
  return '0.6 g/kg/día (restricción estricta — evitar progresión)'
}

function colorEstadioERC(estadio: string): SemaforoColor {
  if (estadio === 'G1') return 'verde'
  if (estadio === 'G2') return 'verde'
  if (estadio === 'G3a') return 'amarillo'
  if (estadio === 'G3b') return 'amarillo'
  return 'rojo'
}

// ─────────────────────────────────────────────────────────────────────────────
// Sección 1 — Perfil Glucémico
// ─────────────────────────────────────────────────────────────────────────────

function SeccionGlucemica() {
  const { calcularHOMA_IR } = useBiochemistry()

  const [glucosa,  setGlucosa]  = useState('')
  const [hba1c,    setHba1c]    = useState('')
  const [insulina, setInsulina] = useState('')

  const glucosaNum  = parseFloat(glucosa)
  const hba1cNum    = parseFloat(hba1c)
  const insulinaNum = parseFloat(insulina)

  const resGlucosa = useMemo(
    () => !isNaN(glucosaNum) && glucosaNum > 0 ? clasificarGlucosa(glucosaNum) : null,
    [glucosaNum]
  )
  const resHba1c = useMemo(
    () => !isNaN(hba1cNum) && hba1cNum > 0 ? clasificarHbA1c(hba1cNum) : null,
    [hba1cNum]
  )

  const resHOMA = useMemo<ResultadoHOMA | null>(() => {
    if (isNaN(glucosaNum) || isNaN(insulinaNum) || glucosaNum <= 0 || insulinaNum <= 0) return null
    try {
      const params: ParámetrosHOMA = {
        glucosa_ayuno_mg_dL:   glucosaNum,
        insulina_ayuno_uIU_mL: insulinaNum,
      }
      return calcularHOMA_IR(params)
    } catch {
      return null
    }
  }, [glucosaNum, insulinaNum, calcularHOMA_IR])

  const colorHOMA = (homa: ResultadoHOMA): SemaforoColor => {
    if (homa.clasificacion === 'normal')           return 'verde'
    if (homa.clasificacion === 'resistencia_leve') return 'amarillo'
    return 'rojo'
  }

  const etiquetaHOMA = (homa: ResultadoHOMA): string => {
    if (homa.clasificacion === 'normal')           return 'Normal — sensibilidad conservada'
    if (homa.clasificacion === 'resistencia_leve') return 'Resistencia leve (2.5–3.5)'
    return 'Resistencia significativa (>3.5)'
  }

  return (
    <section
      className="rounded-2xl bg-white border border-[color:var(--color-border)] overflow-hidden"
      style={{ boxShadow: 'var(--shadow)' }}
      aria-labelledby="titulo-glucemico"
    >
      <div className="px-4 pt-5 pb-4">
        <SeccionHeader
          titulo="Perfil Glucémico"
          descripcion="Glucosa, HbA1c e insulina en ayuno"
          icono={<span className="text-base">🩸</span>}
          colorBg="#FEF3F2"
          colorText="#B91C1C"
        />
      </div>

      <div className="px-4 pb-5 border-t border-[color:var(--color-border)]">
        <div className="pt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <InputClinico
            id="glucosa-ayuno"
            label="Glucosa en ayuno"
            valor={glucosa}
            onChange={setGlucosa}
            unidad="mg/dL"
            placeholder="70–99"
          />
          <InputClinico
            id="hba1c"
            label="HbA1c"
            valor={hba1c}
            onChange={setHba1c}
            unidad="%"
            placeholder="4.0–5.6"
          />
          <InputClinico
            id="insulina"
            label="Insulina en ayuno"
            valor={insulina}
            onChange={setInsulina}
            unidad="µIU/mL"
            placeholder="2–20"
          />
        </div>

        {/* Resultados */}
        {(resGlucosa || resHba1c || resHOMA) && (
          <>
            <DividerSeccion titulo="Interpretación" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {resGlucosa && (
                <ResultadoCard
                  label="Glucosa en ayuno"
                  valor={glucosaNum.toFixed(0)}
                  unidad="mg/dL"
                  color={resGlucosa.color}
                  etiqueta={resGlucosa.etiqueta}
                  nota={
                    resGlucosa.etiqueta === 'Normal'
                      ? 'Rango ADA 2024: 70–99 mg/dL en ayuno ≥8h'
                      : resGlucosa.etiqueta === 'Prediabetes'
                      ? 'ADA 2024: 100–125 mg/dL — Confirmar con OGTT o HbA1c'
                      : resGlucosa.etiqueta === 'Hipoglucemia'
                      ? 'Por debajo de 70 mg/dL — Evaluar síntomas'
                      : 'ADA 2024: ≥126 mg/dL — Confirmar en segunda muestra'
                  }
                />
              )}
              {resHba1c && (
                <ResultadoCard
                  label="HbA1c"
                  valor={hba1cNum.toFixed(1)}
                  unidad="%"
                  color={resHba1c.color}
                  etiqueta={resHba1c.etiqueta}
                  nota={
                    resHba1c.etiqueta === 'Normal'
                      ? 'ADA 2024: <5.7% — Sin riesgo actual'
                      : resHba1c.etiqueta === 'Prediabetes'
                      ? 'ADA 2024: 5.7–6.4% — Intervención de estilo de vida'
                      : 'ADA 2024: ≥6.5% — Diagnóstico de DM en contexto clínico'
                  }
                />
              )}
              {resHOMA && (
                <ResultadoCard
                  label="HOMA-IR"
                  valor={resHOMA.homa_ir.toFixed(2)}
                  color={colorHOMA(resHOMA)}
                  etiqueta={etiquetaHOMA(resHOMA)}
                  nota="Fórmula: (Glucosa × Insulina) / 405 — Requiere ayuno mínimo 8h. No válido en DM1 ni con insulina exógena."
                />
              )}
            </div>
          </>
        )}

        <FuenteBibliografica texto="HOMA-IR: Matthews DR et al. Diabetologia. 1985;28(7):412-419. | Glucosa/HbA1c: ADA Standards of Care 2024." />
      </div>
    </section>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Sección 2 — Perfil Lipídico
// ─────────────────────────────────────────────────────────────────────────────

function SeccionLipidica() {
  const [sexo, setSexo]  = useState<SexoTipo>('')
  const [lipidos, setLipidos] = useState<ValorLipido>({
    colesterol_total: '', ldl: '', hdl: '', trigliceridos: '',
  })

  const actualizar = useCallback((campo: keyof ValorLipido) => (v: string) => {
    setLipidos((prev) => ({ ...prev, [campo]: v }))
  }, [])

  const ct  = parseFloat(lipidos.colesterol_total)
  const ldl = parseFloat(lipidos.ldl)
  const hdl = parseFloat(lipidos.hdl)
  const tg  = parseFloat(lipidos.trigliceridos)

  const resCT  = useMemo(() => !isNaN(ct)  && ct  > 0 ? clasificarColesterolTotal(ct)       : null, [ct])
  const resLDL = useMemo(() => !isNaN(ldl) && ldl > 0 ? clasificarLDL(ldl)                  : null, [ldl])
  const resHDL = useMemo(() => !isNaN(hdl) && hdl > 0 ? clasificarHDL(hdl, sexo)             : null, [hdl, sexo])
  const resTG  = useMemo(() => !isNaN(tg)  && tg  > 0 ? clasificarTrigliceridos(tg)          : null, [tg])

  const hayTodos = !isNaN(ct) && !isNaN(ldl) && !isNaN(hdl) && !isNaN(tg) && ct > 0 && ldl > 0 && hdl > 0 && tg > 0
  const resRCV   = useMemo(
    () => hayTodos ? clasificarRiesgoCV(ct, ldl, hdl, tg, sexo) : null,
    [ct, ldl, hdl, tg, sexo, hayTodos]
  )

  const hayAlguno = resCT || resLDL || resHDL || resTG

  return (
    <section
      className="rounded-2xl bg-white border border-[color:var(--color-border)] overflow-hidden"
      style={{ boxShadow: 'var(--shadow)' }}
      aria-labelledby="titulo-lipidico"
    >
      <div className="px-4 pt-5 pb-4">
        <SeccionHeader
          titulo="Perfil Lipídico"
          descripcion="Colesterol total, LDL, HDL y triglicéridos"
          icono={<span className="text-base">💛</span>}
          colorBg="#FFFBEB"
          colorText="#B45309"
        />
      </div>

      <div className="px-4 pb-5 border-t border-[color:var(--color-border)]">
        <div className="pt-4">
          <div className="mb-3">
            <SelectClinico
              id="sexo-lipidico"
              label="Sexo biológico (para HDL)"
              valor={sexo}
              onChange={(v) => setSexo(v as SexoTipo)}
              opciones={[
                { valor: 'masculino', etiqueta: 'Masculino' },
                { valor: 'femenino',  etiqueta: 'Femenino' },
              ]}
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <InputClinico id="ct"  label="Colesterol total" valor={lipidos.colesterol_total} onChange={actualizar('colesterol_total')} unidad="mg/dL" placeholder="<200" />
            <InputClinico id="ldl" label="LDL"              valor={lipidos.ldl}               onChange={actualizar('ldl')}               unidad="mg/dL" placeholder="<100" />
            <InputClinico id="hdl" label="HDL"              valor={lipidos.hdl}               onChange={actualizar('hdl')}               unidad="mg/dL" placeholder=">60" />
            <InputClinico id="tg"  label="Triglicéridos"    valor={lipidos.trigliceridos}     onChange={actualizar('trigliceridos')}     unidad="mg/dL" placeholder="<150" />
          </div>
        </div>

        {hayAlguno && (
          <>
            <DividerSeccion titulo="Interpretación" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {resCT  && <ResultadoCard label="Colesterol total" valor={ct.toFixed(0)}  unidad="mg/dL" color={resCT.color}  etiqueta={resCT.etiqueta}  nota="ATP-III: <200 deseable | 200–239 limítrofe | ≥240 alto" />}
              {resLDL && <ResultadoCard label="LDL"              valor={ldl.toFixed(0)} unidad="mg/dL" color={resLDL.color} etiqueta={resLDL.etiqueta} nota="ATP-III: <100 óptimo | <70 en alto riesgo CV" />}
              {resHDL && <ResultadoCard label="HDL"              valor={hdl.toFixed(0)} unidad="mg/dL" color={resHDL.color} etiqueta={resHDL.etiqueta} nota={`Umbral bajo: ${sexo === 'femenino' ? '<50' : '<40'} mg/dL. ≥60 mg/dL factor protector.`} />}
              {resTG  && <ResultadoCard label="Triglicéridos"    valor={tg.toFixed(0)}  unidad="mg/dL" color={resTG.color}  etiqueta={resTG.etiqueta}  nota="Normal: <150 | Limítrofe: 150–199 | Alto: 200–499 | Muy alto ≥500 (riesgo pancreatitis)" />}
            </div>

            {resRCV && (
              <div className="mt-3">
                <ResultadoCard
                  label="Riesgo cardiovascular global (estimado)"
                  valor={resRCV.etiqueta}
                  color={resRCV.color}
                  etiqueta={`${resRCV.etiqueta} riesgo`}
                  nota="Evaluación simplificada basada en número de parámetros alterados. No reemplaza Framingham, SCORE ni ASCVD Risk Estimator."
                />
              </div>
            )}
          </>
        )}

        <FuenteBibliografica texto="NOM-037-SSA2 | ATP-III (NCEP) | Harrison's Principles of Internal Medicine, 21st ed." />
      </div>
    </section>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Sección 3 — Función Renal (CKD-EPI 2021)
// ─────────────────────────────────────────────────────────────────────────────

function SeccionRenal() {
  const { calcularCKDEPI } = useBiochemistry()

  const [creatinina, setCreatinina] = useState('')
  const [edad,       setEdad]       = useState('')
  const [sexo,       setSexo]       = useState<SexoTipo>('')

  const creatNum = parseFloat(creatinina)
  const edadNum  = parseFloat(edad)

  const resCKD = useMemo<ResultadoCKDEPI | null>(() => {
    if (isNaN(creatNum) || isNaN(edadNum) || !sexo || creatNum <= 0 || edadNum <= 0) return null
    try {
      const params: ParámetrosCKDEPI = {
        creatinina_serica_mg_dL: creatNum,
        edad_anios:              edadNum,
        sexo:                    sexo as 'masculino' | 'femenino',
      }
      return calcularCKDEPI(params)
    } catch {
      return null
    }
  }, [creatNum, edadNum, sexo, calcularCKDEPI])

  return (
    <section
      className="rounded-2xl bg-white border border-[color:var(--color-border)] overflow-hidden"
      style={{ boxShadow: 'var(--shadow)' }}
      aria-labelledby="titulo-renal"
    >
      <div className="px-4 pt-5 pb-4">
        <SeccionHeader
          titulo="Función Renal"
          descripcion="TFG estimada por CKD-EPI 2021 (sin factor raza)"
          icono={<span className="text-base">🫘</span>}
          colorBg="#EEF2FF"
          colorText="#3730A3"
        />
      </div>

      <div className="px-4 pb-5 border-t border-[color:var(--color-border)]">
        <div className="pt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
          <InputClinico
            id="creatinina"
            label="Creatinina sérica"
            valor={creatinina}
            onChange={setCreatinina}
            unidad="mg/dL"
            placeholder="0.7–1.3"
          />
          <InputClinico
            id="edad-renal"
            label="Edad"
            valor={edad}
            onChange={setEdad}
            unidad="años"
            placeholder="18–90"
          />
          <SelectClinico
            id="sexo-renal"
            label="Sexo biológico"
            valor={sexo}
            onChange={(v) => setSexo(v as SexoTipo)}
            opciones={[
              { valor: 'masculino', etiqueta: 'Masculino' },
              { valor: 'femenino',  etiqueta: 'Femenino' },
            ]}
          />
        </div>

        {resCKD && (
          <>
            <DividerSeccion titulo="Resultado CKD-EPI 2021" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <ResultadoCard
                label="TFG estimada"
                valor={resCKD.tfg_mL_min_1_73m2.toFixed(1)}
                unidad="mL/min/1.73m²"
                color={colorEstadioERC(resCKD.estadio_erc)}
                etiqueta={`Estadio ${resCKD.estadio_erc}`}
                nota={resCKD.descripcion_estadio}
              />
              <div
                className="rounded-xl p-4 flex flex-col gap-2"
                style={{ background: '#F0FDF4' }}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[13px] font-medium text-[color:var(--color-text-secondary)]">
                    Recomendación proteína
                  </span>
                </div>
                <p className="text-[15px] font-semibold text-[#1B7A34]">
                  {proteínaERC(resCKD.estadio_erc)}
                </p>
                <p className="text-[11px] text-[color:var(--color-text-secondary)] leading-relaxed">
                  KDOQI 2020 Update. Ajustar según tolerancia, diálisis y estado nutricional del paciente.
                </p>
              </div>
            </div>

            {/* Tabla de estadios */}
            <div className="mt-4 rounded-xl border border-[color:var(--color-border)] overflow-hidden">
              <table className="w-full text-[12px]" aria-label="Tabla de estadios ERC">
                <thead>
                  <tr style={{ background: '#F2F2F7' }}>
                    <th className="px-3 py-2 text-left font-semibold text-[color:var(--color-text-secondary)]">Estadio</th>
                    <th className="px-3 py-2 text-left font-semibold text-[color:var(--color-text-secondary)]">TFG</th>
                    <th className="px-3 py-2 text-left font-semibold text-[color:var(--color-text-secondary)] hidden sm:table-cell">Descripción</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { estadio: 'G1',  rango: '≥90',   desc: 'Normal o alta' },
                    { estadio: 'G2',  rango: '60–89', desc: 'Ligeramente disminuida' },
                    { estadio: 'G3a', rango: '45–59', desc: 'Leve a moderadamente disminuida' },
                    { estadio: 'G3b', rango: '30–44', desc: 'Moderada a severamente disminuida' },
                    { estadio: 'G4',  rango: '15–29', desc: 'Severamente disminuida' },
                    { estadio: 'G5',  rango: '<15',   desc: 'Falla renal' },
                  ].map((row) => (
                    <tr
                      key={row.estadio}
                      className="border-t border-[color:var(--color-border)]"
                      style={{
                        background: row.estadio === resCKD.estadio_erc
                          ? COLOR_MAP[colorEstadioERC(resCKD.estadio_erc)].bg
                          : 'white',
                        fontWeight: row.estadio === resCKD.estadio_erc ? '600' : '400',
                      }}
                    >
                      <td className="px-3 py-2 font-mono">{row.estadio}</td>
                      <td className="px-3 py-2 font-mono">{row.rango}</td>
                      <td className="px-3 py-2 hidden sm:table-cell text-[color:var(--color-text-secondary)]">{row.desc}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        <FuenteBibliografica texto="CKD-EPI 2021: Inker LA et al. N Engl J Med. 2021;385:1737-1749. | Proteína: KDOQI Clinical Practice Guidelines for Nutrition in CKD: 2020 Update." />
      </div>
    </section>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Sección 4 — Balance Nitrogenado (colapsable)
// ─────────────────────────────────────────────────────────────────────────────

function SeccionBalanceNitrogenado() {
  const { calcularBalanceNitrogenado } = useBiochemistry()

  const [proteina, setProteina] = useState('')
  const [nuu,      setNuu]      = useState('')

  const protNum = parseFloat(proteina)
  const nuuNum  = parseFloat(nuu)

  const resBN = useMemo<ResultadoBN | null>(() => {
    if (isNaN(protNum) || isNaN(nuuNum) || protNum <= 0 || nuuNum < 0) return null
    try {
      const params: ParámetrosBN = {
        proteina_consumida_g: protNum,
        nuu_g:               nuuNum,
      }
      return calcularBalanceNitrogenado(params)
    } catch {
      return null
    }
  }, [protNum, nuuNum, calcularBalanceNitrogenado])

  const colorBN = (r: ResultadoBN): SemaforoColor => {
    if (r.estado === 'anabolismo') return 'verde'
    if (r.estado === 'equilibrio') return 'amarillo'
    return 'rojo'
  }

  const etiquetaBN = (r: ResultadoBN): string => {
    if (r.estado === 'anabolismo') return `Anabolismo (+${r.bn_g_dia.toFixed(1)} g N)`
    if (r.estado === 'equilibrio') return 'Equilibrio nitrogenado'
    return `Catabolismo (${r.bn_g_dia.toFixed(1)} g N)`
  }

  return (
    <SeccionColapsable
      titulo="Balance Nitrogenado"
      icono={<FlaskConical size={16} />}
      defaultAbierta={false}
    >
      <p className="text-[13px] text-[color:var(--color-text-secondary)] mb-4 leading-relaxed">
        Evalúa el estado anabólico o catabólico del paciente mediante el nitrógeno ureico urinario de 24h.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <InputClinico
          id="proteina-bn"
          label="Proteína consumida (24h)"
          valor={proteina}
          onChange={setProteina}
          unidad="g/día"
          placeholder="50–100"
        />
        <InputClinico
          id="nuu"
          label="NUU — Nitrógeno Ureico Urinario"
          valor={nuu}
          onChange={setNuu}
          unidad="g/24h"
          placeholder="10–15"
        />
      </div>

      <div className="mt-3 p-3 rounded-xl border border-[color:var(--color-border)] bg-[#F9F9FB]">
        <p className="text-[12px] font-mono text-[color:var(--color-text-secondary)]">
          BN = (Proteína_g / 6.25) − (NUU_g + 4)
        </p>
        <p className="text-[11px] text-[color:var(--color-text-tertiary)] mt-1">
          El factor +4 estima pérdidas no urinarias (heces, piel, cabello).
        </p>
      </div>

      {resBN && (
        <>
          <DividerSeccion titulo="Resultado" />
          <ResultadoCard
            label="Balance Nitrogenado"
            valor={resBN.bn_g_dia.toFixed(2)}
            unidad="g N"
            color={colorBN(resBN)}
            etiqueta={etiquetaBN(resBN)}
            nota={
              resBN.estado === 'anabolismo'
                ? 'Síntesis proteica neta — el paciente está ganando masa.'
                : resBN.estado === 'catabolismo'
                ? 'Pérdida proteica neta — revisar ingesta y condición clínica.'
                : 'Estado de mantenimiento — ingestión ≈ pérdida.'
            }
          />
        </>
      )}

      <FuenteBibliografica texto="Bistrian BR. Nutritional assessment. In: Fischer JE. Surgical Nutrition. ASPEN. 1990." />
    </SeccionColapsable>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Sección 5 — Ácido Úrico, Albúmina, Hemoglobina (colapsable)
// ─────────────────────────────────────────────────────────────────────────────

function SeccionOtros() {
  const [sexo,      setSexo]      = useState<SexoTipo>('')
  const [otros, setOtros] = useState<ValorOtros>({
    acido_urico: '', albumina: '', hemoglobina: '',
  })

  const actualizar = useCallback((campo: keyof ValorOtros) => (v: string) => {
    setOtros((prev) => ({ ...prev, [campo]: v }))
  }, [])

  const auNum  = parseFloat(otros.acido_urico)
  const albNum = parseFloat(otros.albumina)
  const hbNum  = parseFloat(otros.hemoglobina)

  const resAU  = useMemo(() => !isNaN(auNum)  && auNum  > 0 ? clasificarAcidoUrico(auNum, sexo)       : null, [auNum, sexo])
  const resAlb = useMemo(() => !isNaN(albNum) && albNum > 0 ? clasificarAlbumina(albNum)               : null, [albNum])
  const resHb  = useMemo(() => !isNaN(hbNum)  && hbNum  > 0 ? clasificarHemoglobina(hbNum, sexo)       : null, [hbNum, sexo])

  const hayAlguno = resAU || resAlb || resHb

  return (
    <SeccionColapsable
      titulo="Ácido Úrico, Albúmina y Hemoglobina"
      icono={<FlaskConical size={16} />}
      defaultAbierta={false}
    >
      <div className="mb-3">
        <SelectClinico
          id="sexo-otros"
          label="Sexo biológico"
          valor={sexo}
          onChange={(v) => setSexo(v as SexoTipo)}
          opciones={[
            { valor: 'masculino', etiqueta: 'Masculino' },
            { valor: 'femenino',  etiqueta: 'Femenino' },
          ]}
        />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <InputClinico id="acido-urico"  label="Ácido úrico"  valor={otros.acido_urico}  onChange={actualizar('acido_urico')}  unidad="mg/dL" placeholder="3.5–7.2" />
        <InputClinico id="albumina-ser" label="Albúmina sérica" valor={otros.albumina} onChange={actualizar('albumina')}   unidad="g/dL"  placeholder="3.5–5.0" />
        <InputClinico id="hemoglobina"  label="Hemoglobina"  valor={otros.hemoglobina}  onChange={actualizar('hemoglobina')}  unidad="g/dL"  placeholder="12–17.5" />
      </div>

      {hayAlguno && (
        <>
          <DividerSeccion titulo="Interpretación" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {resAU  && <ResultadoCard label="Ácido úrico"   valor={auNum.toFixed(1)}  unidad="mg/dL" color={resAU.color}  etiqueta={resAU.etiqueta}  nota={`Normal H: 3.5–7.2 | M: 2.5–6.0 mg/dL. >7.2 = hiperuricemia — riesgo gota y ERC.`} />}
            {resAlb && <ResultadoCard label="Albúmina sérica" valor={albNum.toFixed(1)} unidad="g/dL" color={resAlb.color} etiqueta={resAlb.etiqueta} nota="Normal: 3.5–5.0 g/dL. Vida media 20 días — marcador de desnutrición CRÓNICA, no aguda." />}
            {resHb  && <ResultadoCard label="Hemoglobina"   valor={hbNum.toFixed(1)}  unidad="g/dL"  color={resHb.color}  etiqueta={resHb.etiqueta}  nota={`Normal: H 13.5–17.5 | M 12.0–16.0 g/dL. OMS 2023.`} />}
          </div>
        </>
      )}

      <FuenteBibliografica texto="Harrison's Principles of Internal Medicine. 21st ed. | OMS. Haemoglobin concentrations for the diagnosis of anaemia. 2023." />
    </SeccionColapsable>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Advertencia clínica (banner)
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
        <span className="font-semibold">Uso clínico:</span> Esta herramienta es de apoyo para estudiantes de nutrición. Los valores deben interpretarse en contexto clínico completo. Los rangos de referencia pueden variar según el laboratorio y la población. No sustituye el juicio clínico del profesional de salud.
      </p>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Componente principal
// ─────────────────────────────────────────────────────────────────────────────

export default function Biochemistry() {
  return (
    <div className="max-w-2xl mx-auto px-4 pt-6 pb-24 md:pb-8 md:px-6 md:pt-8">

      {/* ── Encabezado ── */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 flex-shrink-0">
            <FlaskConical size={22} />
          </div>
          <h1 className="text-[22px] font-semibold text-[color:var(--color-text-primary)]">
            Laboratorios Clínicos
          </h1>
        </div>
        <p className="text-[13px] text-[color:var(--color-text-secondary)] leading-relaxed ml-[52px]">
          Registro e interpretación de glucosa, HbA1c, perfil lipídico, función renal y otros parámetros bioquímicos.
        </p>
      </div>

      <BannerClinical />

      {/* ── Secciones ── */}
      <div className="mt-5 flex flex-col gap-4">
        <SeccionGlucemica />
        <SeccionLipidica />
        <SeccionRenal />
        <SeccionBalanceNitrogenado />
        <SeccionOtros />
      </div>

    </div>
  )
}