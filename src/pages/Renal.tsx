/**
 * Renal.tsx — Módulo de Nutrición Renal
 * Proyecto NUTRIA — Open Source
 *
 * Herramientas clínicas para el manejo nutricional en ERC:
 *   1. Ajuste de proteínas por estadio ERC (KDOQI 2020)
 *   2. Ratio Fósforo/Proteína de alimentos
 *   3. Estimación de potasio tras técnica culinaria (remojo/cocción)
 *   4. Volumen de líquido permitido diario
 *   5. PRAL Score — carga ácida renal potencial (Remer & Manz 1995)
 *
 * Diseño Apple HIG: sin modales, Progressive Disclosure, semáforo inline.
 * Mobile-first 390px → responsive hasta 1280px.
 * Touch targets ≥ 44×44px. WCAG 2.1 AA.
 *
 * @source KDOQI Nutrition in CKD 2020 Update. Am J Kidney Dis. 2020;76(Suppl 1).
 * @source Remer T & Manz F. J Am Diet Assoc. 1995;95(7):791-797.
 * @source Bethke PC & Jansky SH. J Food Sci. 2008;73(5):H80-H85.
 * @source Kopple JD & Massry SG. Nutritional Management of Renal Disease. 3rd ed. 2013.
 */

import { useState, useMemo, useCallback } from 'react'
import { Info, ChevronDown, ChevronUp, AlertTriangle, CheckCircle2 } from 'lucide-react'
import {
  calcularAjusteProteina,
  calcularFosforoProteina,
  calcularRemojo,
  calcularLiquidosRenal,
  calcularPRAL,
} from '../hooks/useRenal'
import type { TecnicaRemojo, ClasificacionFosforo, ClasificacionPRAL } from '../types/renal.types'

// ─────────────────────────────────────────────────────────────────────────────
// Tipos locales
// ─────────────────────────────────────────────────────────────────────────────

type SemaforoColor = 'verde' | 'amarillo' | 'rojo' | 'gris'

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

const COLOR_MAP: Record<SemaforoColor, { bg: string; text: string; dot: string; badge: string }> = {
  verde:    { bg: '#E8F8EC', text: '#1B7A34', dot: '#34C759', badge: 'bg-[#E8F8EC] text-[#1B7A34]' },
  amarillo: { bg: '#FFF3E0', text: '#B45309', dot: '#FF9500', badge: 'bg-[#FFF3E0] text-[#B45309]' },
  rojo:     { bg: '#FDEAEA', text: '#B91C1C', dot: '#FF3B30', badge: 'bg-[#FDEAEA] text-[#B91C1C]' },
  gris:     { bg: '#F2F2F7', text: '#8E8E93', dot: '#C7C7CC', badge: 'bg-[#F2F2F7] text-[#8E8E93]' },
}

const parseFloat2 = (s: string): number => {
  const v = parseFloat(s)
  return Number.isFinite(v) ? v : NaN
}

// ─────────────────────────────────────────────────────────────────────────────
// Componentes UI compartidos (replicados del patrón Biochemistry.tsx)
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
  id: string
  label: string
  valor: string
  onChange: (v: string) => void
  unidad: string
  placeholder?: string
}

function InputClinico({ id, label, valor, onChange, unidad, placeholder = '—' }: InputClinicoProps) {
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
        <span
          className="text-[28px] font-bold font-mono"
          style={{ color: COLOR_MAP[color].text }}
        >
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
  accentColor?: string
  accentBg?: string
}

function SeccionColapsable({
  titulo, icono, children, defaultAbierta = false, accentColor = '#1C1C1E', accentBg = '#F2F2F7',
}: SeccionColapsableProps) {
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
          <span
            className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 text-base"
            style={{ background: accentBg, color: accentColor }}
          >
            {icono}
          </span>
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



// ─────────────────────────────────────────────────────────────────────────────
// Sección 1 — Ajuste de Proteína ERC
// ─────────────────────────────────────────────────────────────────────────────

function SeccionProteina() {
  const [peso, setPeso]           = useState('')
  const [tfg, setTfg]             = useState('')
  const [protActual, setProtActual] = useState('')
  const [dialisis, setDialisis]   = useState(false)

  const resultado = useMemo(() => {
    const peso_kg    = parseFloat2(peso)
    const tfg_ml_min = parseFloat2(tfg)
    if (isNaN(peso_kg) || isNaN(tfg_ml_min)) return null
    try {
      return calcularAjusteProteina({
        peso_kg,
        tfg_ml_min,
        en_dialisis:        dialisis,
        proteina_actual_g:  parseFloat2(protActual) || undefined,
      })
    } catch {
      return null
    }
  }, [peso, tfg, dialisis, protActual])

  const colorEstadio = useCallback((estadio: string): SemaforoColor => {
    if (['G1', 'G2'].includes(estadio)) return 'verde'
    if (['G3a', 'G3b'].includes(estadio)) return 'amarillo'
    return 'rojo'
  }, [])

  return (
    <SeccionColapsable
      titulo="Ajuste de Proteínas en ERC"
      icono="🥩"
      defaultAbierta
      accentBg="#EEF2FF"
      accentColor="#3730A3"
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <InputClinico
          id="renal-peso"
          label="Peso del paciente"
          valor={peso}
          onChange={setPeso}
          unidad="kg"
          placeholder="65"
        />
        <InputClinico
          id="renal-tfg"
          label="TFG (CKD-EPI 2021)"
          valor={tfg}
          onChange={setTfg}
          unidad="mL/min/1.73m²"
          placeholder="38"
        />
        <InputClinico
          id="renal-prot-actual"
          label="Proteína actual (opcional)"
          valor={protActual}
          onChange={setProtActual}
          unidad="g/día"
          placeholder="—"
        />
        {/* Toggle de diálisis */}
        <div className="flex flex-col gap-1">
          <span className="text-[11px] font-semibold uppercase tracking-widest text-[color:var(--color-text-tertiary)]">
            Terapia renal sustitutiva
          </span>
          <div
            className="flex rounded-xl border border-[#E5E5EA] overflow-hidden"
            role="group"
            aria-label="Estado de diálisis"
          >
            {[false, true].map((v) => (
              <button
                key={String(v)}
                onClick={() => setDialisis(v)}
                className="flex-1 text-[15px] font-medium transition-colors"
                style={{
                  minHeight: '44px',
                  background: dialisis === v ? '#007AFF' : '#FFFFFF',
                  color: dialisis === v ? '#FFFFFF' : '#3C3C43',
                }}
                aria-pressed={dialisis === v}
              >
                {v ? 'En diálisis' : 'Sin diálisis'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {resultado && (
        <>
          <DividerSeccion titulo="Prescripción proteica" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <ResultadoCard
              label="Estadio ERC"
              valor={resultado.estadio_erc}
              color={colorEstadio(resultado.estadio_erc)}
              etiqueta={dialisis ? 'En diálisis' : 'Sin TRS'}
            />
            <ResultadoCard
              label="Prescripción"
              valor={`${resultado.gramos_totales}`}
              unidad="g/día"
              color={colorEstadio(resultado.estadio_erc)}
              etiqueta={`${resultado.gramos_por_kg} g/kg/día`}
              nota={`Peso: ${parseFloat2(peso)} kg`}
            />
          </div>

          {/* Alerta de exceso proteico */}
          {resultado.alerta && (
            <div
              className="flex items-start gap-2 mt-3 p-3 rounded-xl"
              style={{ background: '#FDEAEA' }}
              role="alert"
            >
              <AlertTriangle size={15} className="text-[#FF3B30] mt-0.5 flex-shrink-0" />
              <p className="text-[13px] text-[#B91C1C] leading-relaxed font-medium">
                La ingesta actual ({protActual} g/día) supera el límite prescrito ({resultado.gramos_totales} g/día).
                Ajustar el plan alimenticio para reducir la carga proteica.
              </p>
            </div>
          )}

          {/* Tabla rápida de referencia KDOQI */}
          <div className="mt-4 rounded-xl border border-[color:var(--color-border)] overflow-hidden">
            <table className="w-full text-[12px]" aria-label="Referencia proteínas por estadio ERC">
              <thead>
                <tr style={{ background: '#F2F2F7' }}>
                  <th className="px-3 py-2 text-left font-semibold text-[color:var(--color-text-secondary)]">Estadio</th>
                  <th className="px-3 py-2 text-left font-semibold text-[color:var(--color-text-secondary)]">Sin TRS</th>
                  <th className="px-3 py-2 text-left font-semibold text-[color:var(--color-text-secondary)]">Con diálisis</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { e: 'G1–G3a', sin: '0.8', con: '1.2' },
                  { e: 'G3b–G5', sin: '0.6', con: '1.2' },
                ].map((row) => (
                  <tr key={row.e} className="border-t border-[color:var(--color-border)]">
                    <td className="px-3 py-2 font-mono font-semibold">{row.e}</td>
                    <td className="px-3 py-2 font-mono">{row.sin} g/kg/día</td>
                    <td className="px-3 py-2 font-mono">{row.con} g/kg/día</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      <FuenteBibliografica texto="KDOQI Clinical Practice Guideline for Nutrition in CKD: 2020 Update. Am J Kidney Dis. 2020;76(3)(Suppl 1):S1-S107." />
    </SeccionColapsable>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Sección 2 — Ratio Fósforo/Proteína
// ─────────────────────────────────────────────────────────────────────────────

function SeccionFosforo() {
  const [fosforo, setFosforo] = useState('')
  const [proteina, setProteina] = useState('')

  const resultado = useMemo(() => {
    const fosforo_mg = parseFloat2(fosforo)
    const proteina_g = parseFloat2(proteina)
    if (isNaN(fosforo_mg) || isNaN(proteina_g) || proteina_g <= 0) return null
    try {
      return calcularFosforoProteina({ fosforo_mg, proteina_g })
    } catch {
      return null
    }
  }, [fosforo, proteina])

  const colorFosforo = (clas: string): SemaforoColor => {
    if (clas === 'optimo')  return 'verde'
    if (clas === 'limite')  return 'amarillo'
    return 'rojo'
  }

  const etiquetaFosforo: Record<ClasificacionFosforo, string> = {
    optimo:  '< 12 mg/g — Óptimo',
    limite:  '12–16 mg/g — Límite',
    alto:    '> 16 mg/g — Alto',
  }

  return (
    <SeccionColapsable
      titulo="Ratio Fósforo/Proteína"
      icono="⚗️"
      accentBg="#FFF7ED"
      accentColor="#C2410C"
    >
      <p className="text-[13px] text-[color:var(--color-text-secondary)] leading-relaxed mb-4">
        Evalúa la calidad de la fuente proteica para pacientes con hiperfosfatemia.
        Valores &lt;12 mg P/g proteína indican fuentes de bajo impacto fosférico.
      </p>
      <div className="grid grid-cols-2 gap-3">
        <InputClinico
          id="fosforo-p"
          label="Fósforo"
          valor={fosforo}
          onChange={setFosforo}
          unidad="mg"
          placeholder="210"
        />
        <InputClinico
          id="fosforo-prot"
          label="Proteína"
          valor={proteina}
          onChange={setProteina}
          unidad="g"
          placeholder="31"
        />
      </div>

      {resultado && (
        <>
          <DividerSeccion titulo="Resultado" />
          <ResultadoCard
            label="Ratio Fósforo/Proteína"
            valor={resultado.ratio_mg_por_g.toFixed(1)}
            unidad="mg P / g proteína"
            color={colorFosforo(resultado.clasificacion)}
            etiqueta={etiquetaFosforo[resultado.clasificacion]}
          />

          {/* Guía rápida de alimentos por categoría */}
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-2">
            {[
              { titulo: '✅ Óptimo (<12)', items: ['Clara de huevo', 'Pechuga de pollo', 'Pescado blanco'], bg: '#E8F8EC', text: '#1B7A34' },
              { titulo: '⚠️ Límite (12–16)', items: ['Carne roja magra', 'Salmón', 'Tofu'], bg: '#FFF3E0', text: '#B45309' },
              { titulo: '🚫 Alto (>16)', items: ['Queso añejo', 'Lácteos enteros', 'Embutidos (aditivos P)'], bg: '#FDEAEA', text: '#B91C1C' },
            ].map((cat) => (
              <div
                key={cat.titulo}
                className="rounded-xl p-3 flex flex-col gap-1.5"
                style={{ background: cat.bg }}
              >
                <p className="text-[11px] font-semibold" style={{ color: cat.text }}>{cat.titulo}</p>
                {cat.items.map((item) => (
                  <p key={item} className="text-[12px]" style={{ color: cat.text }}>• {item}</p>
                ))}
              </div>
            ))}
          </div>
        </>
      )}

      <FuenteBibliografica texto="Sullivan CM et al. J Ren Nutr. 2007;17(5):350-354. | Noori N et al. Clin J Am Soc Nephrol. 2010;5(4):683-692." />
    </SeccionColapsable>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Sección 3 — Técnica de Remojo (Reducción de Potasio)
// ─────────────────────────────────────────────────────────────────────────────

function SeccionRemojo() {
  const [potasio, setPotasio]   = useState('')
  const [tecnica, setTecnica]   = useState<TecnicaRemojo>('remojo_simple')

  const resultado = useMemo(() => {
    const potasio_original_mg = parseFloat2(potasio)
    if (isNaN(potasio_original_mg) || potasio_original_mg <= 0) return null
    try {
      return calcularRemojo({ potasio_original_mg, tecnica })
    } catch {
      return null
    }
  }, [potasio, tecnica])

  const tecnicas: { value: TecnicaRemojo; label: string; desc: string }[] = [
    { value: 'remojo_simple',        label: 'Remojo simple',      desc: '2h en agua fría — 30% reducción' },
    { value: 'doble_coccion',        label: 'Doble cocción',      desc: 'Hervir, cambiar agua, rehervir — 50% reducción' },
    { value: 'remojo_doble_coccion', label: 'Remojo + doble coc.', desc: 'Remojo 12h + doble cocción — 70% reducción' },
  ]

  return (
    <SeccionColapsable
      titulo="Técnica de Remojo (Potasio)"
      icono="🫙"
      accentBg="#F0FDF4"
      accentColor="#166534"
    >
      <p className="text-[13px] text-[color:var(--color-text-secondary)] leading-relaxed mb-4">
        Estima el potasio residual de verduras y tubérculos según la técnica culinaria aplicada.
        Útil para pacientes con hiperpotasemia en ERC.
      </p>

      <InputClinico
        id="remojo-k"
        label="Potasio original (crudo)"
        valor={potasio}
        onChange={setPotasio}
        unidad="mg"
        placeholder="420"
      />

      {/* Selector de técnica */}
      <div className="mt-3 flex flex-col gap-2">
        <span className="text-[11px] font-semibold uppercase tracking-widest text-[color:var(--color-text-tertiary)]">
          Técnica culinaria
        </span>
        {tecnicas.map((t) => (
          <button
            key={t.value}
            onClick={() => setTecnica(t.value)}
            className="flex items-center gap-3 p-3 rounded-xl border text-left transition-colors"
            style={{
              minHeight: '56px',
              borderColor: tecnica === t.value ? '#007AFF' : '#E5E5EA',
              background:  tecnica === t.value ? '#EBF5FF' : '#FFFFFF',
            }}
            aria-pressed={tecnica === t.value}
          >
            <span
              className="w-4 h-4 rounded-full border-2 flex-shrink-0"
              style={{
                borderColor:     tecnica === t.value ? '#007AFF' : '#C7C7CC',
                backgroundColor: tecnica === t.value ? '#007AFF' : 'transparent',
              }}
              aria-hidden="true"
            />
            <div>
              <p className="text-[14px] font-semibold text-[color:var(--color-text-primary)]">{t.label}</p>
              <p className="text-[12px] text-[color:var(--color-text-tertiary)]">{t.desc}</p>
            </div>
          </button>
        ))}
      </div>

      {resultado && (
        <>
          <DividerSeccion titulo="Resultado estimado" />
          <div className="grid grid-cols-2 gap-3">
            <ResultadoCard
              label="K residual"
              valor={resultado.potasio_resultante_mg.toFixed(0)}
              unidad="mg"
              color="verde"
              etiqueta={`−${resultado.reduccion_porcentaje}% reducción`}
            />
            <div
              className="rounded-xl p-4 flex flex-col justify-center gap-1"
              style={{ background: '#F2F2F7' }}
            >
              <p className="text-[13px] text-[color:var(--color-text-secondary)]">K original</p>
              <p className="text-[22px] font-bold font-mono text-[color:var(--color-text-primary)]">
                {parseFloat2(potasio).toFixed(0)} <span className="text-[13px] font-normal">mg</span>
              </p>
              <p className="text-[11px] text-[color:var(--color-text-tertiary)]">crudo, sin tratar</p>
            </div>
          </div>
        </>
      )}

      <FuenteBibliografica texto="Bethke PC & Jansky SH. J Food Sci. 2008;73(5):H80-H85. | Burrowes JD & Ramer NJ. J Ren Nutr. 2006;16(4):304-311." />
    </SeccionColapsable>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Sección 4 — Balance de Líquidos Renal
// ─────────────────────────────────────────────────────────────────────────────

function SeccionLiquidos() {
  const [diuresis, setDiuresis]         = useState('')
  const [aguaEndogena, setAguaEndogena] = useState(true)

  const resultado = useMemo(() => {
    const diuresis_ml_24h = parseFloat2(diuresis)
    if (isNaN(diuresis_ml_24h)) return null
    try {
      return calcularLiquidosRenal({ diuresis_ml_24h, incluir_agua_endogena: aguaEndogena })
    } catch {
      return null
    }
  }, [diuresis, aguaEndogena])

  return (
    <SeccionColapsable
      titulo="Balance de Líquidos"
      icono="💧"
      accentBg="#EFF6FF"
      accentColor="#1D4ED8"
    >
      <p className="text-[13px] text-[color:var(--color-text-secondary)] leading-relaxed mb-4">
        Calcula el volumen diario permitido en pacientes oligúricos.
        Fórmula: diuresis 24h + 500 mL (pérdidas insensibles) ± agua endógena.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <InputClinico
          id="liquidos-diuresis"
          label="Diuresis 24h (0 si anuria)"
          valor={diuresis}
          onChange={setDiuresis}
          unidad="mL"
          placeholder="600"
        />

        {/* Toggle agua endógena */}
        <div className="flex flex-col gap-1">
          <span className="text-[11px] font-semibold uppercase tracking-widest text-[color:var(--color-text-tertiary)]">
            Agua metabólica endógena
          </span>
          <div
            className="flex rounded-xl border border-[#E5E5EA] overflow-hidden"
            role="group"
          >
            {[true, false].map((v) => (
              <button
                key={String(v)}
                onClick={() => setAguaEndogena(v)}
                className="flex-1 text-[15px] font-medium transition-colors"
                style={{
                  minHeight: '44px',
                  background: aguaEndogena === v ? '#007AFF' : '#FFFFFF',
                  color: aguaEndogena === v ? '#FFFFFF' : '#3C3C43',
                }}
                aria-pressed={aguaEndogena === v}
              >
                {v ? 'Incluir (+300 mL)' : 'No incluir'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {resultado !== null && (
        <>
          <DividerSeccion titulo="Volumen permitido" />
          <ResultadoCard
            label="Líquido total permitido"
            valor={resultado.volumen_permitido_ml.toLocaleString('es-MX')}
            unidad="mL/día"
            color="verde"
            etiqueta={`≈ ${(resultado.volumen_permitido_ml / 1000).toFixed(2)} L/día`}
            nota={`Diuresis ${parseFloat2(diuresis) || 0} mL + 500 mL insensibles${aguaEndogena ? ' + 300 mL endógena' : ''}`}
          />
        </>
      )}

      <FuenteBibliografica texto="Kopple JD & Massry SG. Nutritional Management of Renal Disease. 3rd ed. Elsevier, 2013. Cap. 9." />
    </SeccionColapsable>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Sección 5 — PRAL Score
// ─────────────────────────────────────────────────────────────────────────────

function SeccionPRAL() {
  const [proteina,  setProteina]  = useState('')
  const [fosforo,   setFosforo]   = useState('')
  const [potasio,   setPotasio]   = useState('')
  const [calcio,    setCalcio]    = useState('')
  const [magnesio,  setMagnesio]  = useState('')

  const resultado = useMemo(() => {
    const proteina_g  = parseFloat2(proteina)
    const fosforo_mg  = parseFloat2(fosforo)
    const potasio_mg  = parseFloat2(potasio)
    const calcio_mg   = parseFloat2(calcio)
    const magnesio_mg = parseFloat2(magnesio)

    if ([proteina_g, fosforo_mg, potasio_mg, calcio_mg, magnesio_mg].some(isNaN)) return null

    try {
      return calcularPRAL({ proteina_g, fosforo_mg, potasio_mg, calcio_mg, magnesio_mg })
    } catch {
      return null
    }
  }, [proteina, fosforo, potasio, calcio, magnesio])

  const colorPRAL = (clas: string): SemaforoColor => {
    if (clas === 'alcalinizante') return 'verde'
    if (clas === 'neutro')        return 'amarillo'
    return 'rojo'
  }

  const etiquetaPRAL: Record<ClasificacionPRAL, string> = {
    alcalinizante: '< −1 mEq — Alcalinizante',
    neutro:        '−1 a +1 mEq — Neutro',
    acidificante:  '> +1 mEq — Acidificante',
  }

  return (
    <SeccionColapsable
      titulo="PRAL Score (Carga Ácida Renal)"
      icono="🧪"
      accentBg="#FDF4FF"
      accentColor="#7E22CE"
    >
      <p className="text-[13px] text-[color:var(--color-text-secondary)] leading-relaxed mb-4">
        El PRAL estima la contribución de un alimento o menú a la carga ácida renal.
        Una dieta alcalinizante (frutas y verduras) puede retrasar la progresión en ERC G3–G4.
        Ingresar valores por 100g o por ración completa del menú.
      </p>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <InputClinico id="pral-prot" label="Proteína"  valor={proteina}  onChange={setProteina}  unidad="g"  placeholder="20" />
        <InputClinico id="pral-p"    label="Fósforo"   valor={fosforo}   onChange={setFosforo}   unidad="mg" placeholder="200" />
        <InputClinico id="pral-k"    label="Potasio"   valor={potasio}   onChange={setPotasio}   unidad="mg" placeholder="400" />
        <InputClinico id="pral-ca"   label="Calcio"    valor={calcio}    onChange={setCalcio}    unidad="mg" placeholder="100" />
        <InputClinico id="pral-mg"   label="Magnesio"  valor={magnesio}  onChange={setMagnesio}  unidad="mg" placeholder="30" />
      </div>

      {resultado && (
        <>
          <DividerSeccion titulo="PRAL calculado" />
          <ResultadoCard
            label="PRAL Score"
            valor={resultado.pral_meq_dia > 0
              ? `+${resultado.pral_meq_dia.toFixed(2)}`
              : resultado.pral_meq_dia.toFixed(2)
            }
            unidad="mEq/día"
            color={colorPRAL(resultado.clasificacion)}
            etiqueta={etiquetaPRAL[resultado.clasificacion]}
            nota={resultado.clasificacion === 'alcalinizante'
              ? 'Este alimento/menú reduce la carga ácida renal — favorable en ERC.'
              : resultado.clasificacion === 'acidificante'
              ? 'Este alimento/menú aumenta la carga ácida renal — limitar en ERC G3–G4.'
              : 'Contribución neutra al equilibrio ácido-base renal.'
            }
          />

          {/* Fórmula expandida para aprendizaje */}
          <div className="mt-3 p-3 rounded-xl bg-[#F2F2F7]">
            <p className="text-[11px] font-semibold text-[color:var(--color-text-secondary)] mb-2">
              Fórmula PRAL (Remer &amp; Manz, 1995)
            </p>
            <p className="text-[12px] font-mono text-[color:var(--color-text-primary)] leading-relaxed">
              PRAL = (0.49 × {proteina || '?'}) + (0.037 × {fosforo || '?'})
              − (0.021 × {potasio || '?'}) − (0.026 × {calcio || '?'})
              − (0.026 × {magnesio || '?'})
            </p>
          </div>
        </>
      )}

      <FuenteBibliografica texto="Remer T, Manz F. Potential renal acid load of foods and its influence on urine pH. J Am Diet Assoc. 1995;95(7):791-797." />
    </SeccionColapsable>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Página principal
// ─────────────────────────────────────────────────────────────────────────────

export default function Renal() {
  return (
    <main
      className="min-h-screen"
      style={{ background: '#F2F2F7', paddingBottom: 'env(safe-area-inset-bottom, 24px)' }}
    >
      {/* Header */}
      <header
        className="sticky top-0 z-10 flex items-center gap-3 px-4 py-4 border-b border-[color:var(--color-border)]"
        style={{ background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(12px)' }}
      >
        <span className="text-2xl" aria-hidden="true">🫘</span>
        <div>
          <h1 className="text-[22px] font-bold text-[color:var(--color-text-primary)] leading-tight">
            Nutrición Renal
          </h1>
          <p className="text-[13px] text-[color:var(--color-text-tertiary)]">
            Herramientas clínicas para ERC — KDOQI 2020
          </p>
        </div>
      </header>

      {/* Aviso clínico */}
      <div className="px-4 pt-4">
        <div
          className="flex items-start gap-2 p-3 rounded-xl"
          style={{ background: '#FFF7ED', border: '1px solid #FED7AA' }}
          role="note"
        >
          <CheckCircle2 size={15} className="text-[#C2410C] mt-0.5 flex-shrink-0" />
          <p className="text-[12px] text-[#92400E] leading-relaxed">
            <strong>Uso clínico:</strong> Estos cálculos son auxiliares de decisión.
            La prescripción nutricional renal requiere valoración médica integral
            (estadio ERC, albuminuria, comorbilidades, medicación concomitante).
          </p>
        </div>
      </div>

      {/* Secciones */}
      <div className="px-4 pt-4 pb-8 flex flex-col gap-4 max-w-2xl mx-auto">
        <SeccionProteina />
        <SeccionFosforo />
        <SeccionRemojo />
        <SeccionLiquidos />
        <SeccionPRAL />
      </div>
    </main>
  )
}