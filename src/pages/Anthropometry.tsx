/**
 * Anthropometry.tsx — Evaluación Antropométrica Completa
 * Proyecto NUTRIA — Open Source
 *
 * Secciones con Progressive Disclosure:
 *   1. Medidas básicas → IMC en tiempo real con semáforo OMS
 *   2. Perímetros → ICC, ICE
 *   3. Pliegues cutáneos (colapsable) → %Grasa, masa grasa, masa magra
 *   4. Pesos de referencia → Hamwi, peso ajustado
 *   5. AMB — Área Muscular del Brazo (si hay datos suficientes)
 *
 * Cálculo en tiempo real — onChange, nunca onSubmit.
 * Sin dropdowns — toggles y cards seleccionables.
 *
 * @module Anthropometry
 */

import { useState, useMemo } from 'react'
import { Ruler, ChevronDown, ChevronUp, BookOpen } from 'lucide-react'

import {
  calcularIMC,
  calcularICC,
  calcularICE,
  calcularComposicion_JP3_Hombre,
  calcularComposicion_JP3_Mujer,
  calcularComposicion_Faulkner,
  calcularAMB,
} from '../hooks/useAnthropometry'
import { calcularPesoIdeal_Hamwi, calcularPesoAjustado } from '../hooks/useEnergyCalculator'

import type {
  ClasificaciónIMC,
  NivelRiesgo,
  ResultadoIMC,
  ResultadoICC,
  ResultadoICE,
  ResultadoDensidadCorporal,
  ResultadoFaulkner,
  ResultadoAMB,
  Sexo,
} from '../types/anthropometry.types'

// ─── Tipos locales ────────────────────────────────────────────────────────────

type MetodoPliegues = 'jackson_pollock' | 'faulkner'

interface FormBasico {
  peso_kg:  string
  talla_cm: string
  edad_anios: string
  sexo: Sexo
}

interface FormPerimetros {
  cintura_cm: string
  cadera_cm:  string
  brazo_cm:   string
}

interface FormJP3Hombre {
  pecho_mm:    string
  abdominal_mm: string
  muslo_mm:    string
}

interface FormJP3Mujer {
  triceps_mm:     string
  suprailiaco_mm: string
  muslo_mm:       string
}

interface FormFaulkner {
  triceps_mm:      string
  subescapular_mm: string
  suprailiaco_mm:  string
  abdominal_mm:    string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const parseNum = (s: string): number | undefined => {
  const n = parseFloat(s)
  return Number.isFinite(n) && n > 0 ? n : undefined
}

const fmt1 = (n: number): string => n.toLocaleString('es-MX', { maximumFractionDigits: 1 })
const fmt2 = (n: number): string => n.toLocaleString('es-MX', { maximumFractionDigits: 2 })

// ─── Colores de semáforo ──────────────────────────────────────────────────────

type Semaforo = 'verde' | 'amarillo' | 'rojo' | 'azul'

const COLOR_SEMAFORO: Record<Semaforo, string> = {
  verde:    '#34C759',
  amarillo: '#FF9500',
  rojo:     '#FF3B30',
  azul:     '#007AFF',
}

function colorIMC(c: ClasificaciónIMC): Semaforo {
  if (c === 'normal')    return 'verde'
  if (c === 'sobrepeso') return 'amarillo'
  if (c === 'bajo_peso_leve' || c === 'bajo_peso_moderado') return 'amarillo'
  return 'rojo'
}

function colorRiesgo(r: NivelRiesgo): Semaforo {
  if (r === 'sin_riesgo')      return 'verde'
  if (r === 'riesgo_bajo')     return 'verde'
  if (r === 'riesgo_moderado') return 'amarillo'
  return 'rojo'
}

const ETIQUETA_IMC: Record<ClasificaciónIMC, string> = {
  bajo_peso_severo:   'Bajo peso severo',
  bajo_peso_moderado: 'Bajo peso moderado',
  bajo_peso_leve:     'Bajo peso leve',
  normal:             'Peso normal',
  sobrepeso:          'Sobrepeso',
  obesidad_i:         'Obesidad grado I',
  obesidad_ii:        'Obesidad grado II',
  obesidad_iii:       'Obesidad grado III',
}

const ETIQUETA_RIESGO: Record<NivelRiesgo, string> = {
  sin_riesgo:      'Sin riesgo',
  riesgo_bajo:     'Riesgo bajo',
  riesgo_moderado: 'Riesgo moderado',
  riesgo_alto:     'Riesgo alto',
  riesgo_muy_alto: 'Riesgo muy alto',
}

// ─── Sub-componentes ──────────────────────────────────────────────────────────

/** Tarjeta de resultado con etiqueta, valor y fuente */
function ResultadoChip({
  label,
  valor,
  unidad,
  clasificacion,
  color,
  fuente,
}: {
  label:         string
  valor:         string | number
  unidad?:       string
  clasificacion?: string
  color?:        string
  fuente?:       string
}) {
  return (
    <div
      className="rounded-xl p-4 flex flex-col gap-1"
      style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)' }}
    >
      <p
        className="text-[12px] font-medium uppercase tracking-wide"
        style={{ color: 'var(--color-text-tertiary)' }}
      >
        {label}
      </p>
      <div className="flex items-baseline gap-1.5">
        <p className="font-mono text-[28px] font-bold" style={{ color: 'var(--color-text-primary)' }}>
          {valor}
        </p>
        {unidad && (
          <p className="text-[13px]" style={{ color: 'var(--color-text-secondary)' }}>
            {unidad}
          </p>
        )}
      </div>
      {clasificacion && color && (
        <span
          className="self-start text-[12px] font-semibold px-2 py-0.5 rounded-full"
          style={{ background: `${color}20`, color }}
        >
          {clasificacion}
        </span>
      )}
      {fuente && (
        <div className="flex items-center gap-1 mt-1">
          <BookOpen size={10} aria-hidden="true" style={{ color: 'var(--color-text-tertiary)' }} />
          <p className="text-[10px]" style={{ color: 'var(--color-text-tertiary)' }}>
            {fuente}
          </p>
        </div>
      )}
    </div>
  )
}

/** Sección con encabezado numerado */
function Seccion({
  numero,
  titulo,
  subtitulo,
  children,
}: {
  numero:    number
  titulo:    string
  subtitulo?: string
  children:  React.ReactNode
}) {
  return (
    <section
      className="rounded-2xl p-5 md:p-6"
      style={{ background: 'var(--color-surface)', boxShadow: 'var(--shadow)' }}
      aria-label={`Sección ${numero}: ${titulo}`}
    >
      <div className="flex items-start gap-3 mb-5">
        <div
          className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0 mt-0.5"
          style={{ background: 'var(--color-primary)' }}
          aria-hidden="true"
        >
          {numero}
        </div>
        <div>
          <h2 className="text-[17px] font-semibold text-[color:var(--color-text-primary)]">
            {titulo}
          </h2>
          {subtitulo && (
            <p className="text-[13px] mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>
              {subtitulo}
            </p>
          )}
        </div>
      </div>
      {children}
    </section>
  )
}

/** Input numérico clínico */
function Campo({
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
        className="text-[13px] font-medium"
        style={{ color: 'var(--color-text-secondary)' }}
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
          className="w-full rounded-xl border text-[17px] font-mono pl-4 pr-12 py-3 outline-none transition-all focus:ring-2"
          style={{
            borderColor: 'var(--color-border)',
            background: 'var(--color-bg)',
            color: 'var(--color-text-primary)',
            minHeight: '44px',
          }}
          aria-label={`${label} en ${unidad}`}
        />
        <span
          className="absolute right-4 top-1/2 -translate-y-1/2 text-[13px] font-medium pointer-events-none"
          style={{ color: 'var(--color-text-tertiary)' }}
          aria-hidden="true"
        >
          {unidad}
        </span>
      </div>
    </div>
  )
}

/** Toggle Masculino / Femenino */
function ToggleSexo({ valor, onChange }: { valor: Sexo; onChange: (s: Sexo) => void }) {
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
              color: valor === o.id ? '#ffffff' : 'var(--color-text-secondary)',
              boxShadow: valor === o.id ? 'var(--shadow)' : 'none',
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

// ─── Barra de IMC visual ──────────────────────────────────────────────────────

function BarraIMC({ imc }: { imc: number }) {
  // Rangos: 0 → 15 (bajo severo) → 18.5 (normal) → 25 (sobrepeso) → 30 → 40+
  const zonas = [
    { label: 'Bajo', color: '#5AC8FA', hasta: 18.5 },
    { label: 'Normal', color: '#34C759', hasta: 25 },
    { label: 'Sobrepeso', color: '#FF9500', hasta: 30 },
    { label: 'Obesidad', color: '#FF3B30', hasta: 50 },
  ]

  // Posición del marcador: lineal 15–45 → 0–100%
  const clampedIMC = Math.max(15, Math.min(45, imc))
  const pct = ((clampedIMC - 15) / 30) * 100

  return (
    <div className="mt-4" aria-label={`IMC ${imc.toFixed(1)} visualizado en barra`}>
      {/* Barra con gradiente */}
      <div className="relative h-3 rounded-full overflow-visible flex" aria-hidden="true">
        {zonas.map((z, i) => {
          const inicio = i === 0 ? 15 : (zonas[i - 1]?.hasta ?? 15)
          const widthPct = ((z.hasta - inicio) / 30) * 100
          return (
            <div
              key={z.label}
              className={`h-full ${i === 0 ? 'rounded-l-full' : ''} ${i === zonas.length - 1 ? 'rounded-r-full' : ''}`}
              style={{ width: `${widthPct}%`, background: z.color, opacity: 0.75 }}
            />
          )
        })}

        {/* Marcador de posición */}
        <div
          className="absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full border-2 border-white shadow-md transition-all duration-500"
          style={{
            left: `calc(${pct}% - 8px)`,
            background: '#1C1C1E',
          }}
        />
      </div>

      {/* Etiquetas de rango */}
      <div className="flex justify-between mt-1.5">
        {['<18.5', '18.5', '25', '30', '>40'].map((e) => (
          <span key={e} className="text-[10px]" style={{ color: 'var(--color-text-tertiary)' }}>
            {e}
          </span>
        ))}
      </div>
    </div>
  )
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function Anthropometry() {
  // ── Estado ─────────────────────────────────────────────────────────────────
  const [basico, setBasico] = useState<FormBasico>({
    peso_kg:    '',
    talla_cm:   '',
    edad_anios: '',
    sexo:       'masculino',
  })

  const [perimetros, setPerimetros] = useState<FormPerimetros>({
    cintura_cm: '',
    cadera_cm:  '',
    brazo_cm:   '',
  })

  const [plieguesExpandido, setPlieguesExpandido] = useState(false)
  const [metodopliegues, setMetodoPliegues] = useState<MetodoPliegues>('jackson_pollock')

  const [jp3H, setJp3H] = useState<FormJP3Hombre>({ pecho_mm: '', abdominal_mm: '', muslo_mm: '' })
  const [jp3M, setJp3M] = useState<FormJP3Mujer>({ triceps_mm: '', suprailiaco_mm: '', muslo_mm: '' })
  const [faulkner, setFaulkner] = useState<FormFaulkner>({
    triceps_mm: '', subescapular_mm: '', suprailiaco_mm: '', abdominal_mm: '',
  })

  // ── Helpers setter parciales ────────────────────────────────────────────────
  const setB = (k: keyof FormBasico, v: string | Sexo) =>
    setBasico((p) => ({ ...p, [k]: v }))
  const setP = (k: keyof FormPerimetros, v: string) =>
    setPerimetros((p) => ({ ...p, [k]: v }))

  // ── Valores parseados ───────────────────────────────────────────────────────
  const peso    = parseNum(basico.peso_kg)
  const talla   = parseNum(basico.talla_cm)
  const edad    = parseNum(basico.edad_anios)
  const cintura = parseNum(perimetros.cintura_cm)
  const cadera  = parseNum(perimetros.cadera_cm)
  const brazo   = parseNum(perimetros.brazo_cm)

  // ── Cálculos memoizados ─────────────────────────────────────────────────────

  /** @source WHO TRS 894 (2000) */
  const resultadoIMC: ResultadoIMC | null = useMemo(() => {
    if (!peso || !talla) return null
    try { return calcularIMC({ peso_kg: peso, talla_cm: talla }) }
    catch { return null }
  }, [peso, talla])

  /** @source OMS — WHO 1997 */
  const resultadoICC: ResultadoICC | null = useMemo(() => {
    if (!cintura || !cadera) return null
    try { return calcularICC({ cintura_cm: cintura, cadera_cm: cadera, sexo: basico.sexo }) }
    catch { return null }
  }, [cintura, cadera, basico.sexo])

  /** @source Ashwell M, Hsieh SD. Nutr Res Rev. 2005 */
  const resultadoICE: ResultadoICE | null = useMemo(() => {
    if (!cintura || !talla) return null
    try { return calcularICE({ cintura_cm: cintura, talla_cm: talla }) }
    catch { return null }
  }, [cintura, talla])

  /** Composición corporal — Jackson-Pollock o Faulkner */
  const resultadoComposicion: ResultadoDensidadCorporal | ResultadoFaulkner | null = useMemo(() => {
    if (!edad) return null
    try {
      if (metodopliegues === 'faulkner') {
        const t = parseNum(faulkner.triceps_mm)
        const s = parseNum(faulkner.subescapular_mm)
        const su = parseNum(faulkner.suprailiaco_mm)
        const a = parseNum(faulkner.abdominal_mm)
        if (!t || !s || !su || !a || !peso) return null
        return calcularComposicion_Faulkner({
          triceps_mm: t, subescapular_mm: s, suprailiaco_mm: su, abdominal_mm: a,
        }, peso)
      } else {
        // Jackson-Pollock según sexo
        if (basico.sexo === 'masculino') {
          const pe = parseNum(jp3H.pecho_mm)
          const ab = parseNum(jp3H.abdominal_mm)
          const mu = parseNum(jp3H.muslo_mm)
          if (!pe || !ab || !mu || !peso) return null
          return calcularComposicion_JP3_Hombre(
            { pecho_mm: pe, abdominal_mm: ab, muslo_mm: mu, edad_anios: edad },
            peso
          )
        } else {
          const tr = parseNum(jp3M.triceps_mm)
          const si = parseNum(jp3M.suprailiaco_mm)
          const mu = parseNum(jp3M.muslo_mm)
          if (!tr || !si || !mu || !peso) return null
          return calcularComposicion_JP3_Mujer(
            { triceps_mm: tr, suprailiaco_mm: si, muslo_mm: mu, edad_anios: edad },
            peso
          )
        }
      }
    } catch {
      return null
    }
  }, [metodopliegues, jp3H, jp3M, faulkner, basico.sexo, edad, peso])

  /** Peso ideal Hamwi */
  const pesoIdeal: number | null = useMemo(() => {
    if (!talla) return null
    try { return calcularPesoIdeal_Hamwi(talla, basico.sexo) }
    catch { return null }
  }, [talla, basico.sexo])

  /** Peso ajustado — solo si IMC > 30 */
  const pesoAjustado: number | null = useMemo(() => {
    if (!peso || !pesoIdeal) return null
    if (!resultadoIMC || resultadoIMC.imc < 30) return null
    try {
      return calcularPesoAjustado(peso, pesoIdeal)
    } catch { return null }
  }, [peso, pesoIdeal, resultadoIMC])

  /** AMB — requiere circunferencia de brazo + pliegue tríceps */
  const pliegueTricesp: number | null = useMemo(() => {
    // Obtener pliegue tricipital de cualquier método activo
    if (metodopliegues === 'jackson_pollock' && basico.sexo === 'femenino')
      return parseNum(jp3M.triceps_mm) ?? null
    if (metodopliegues === 'faulkner')
      return parseNum(faulkner.triceps_mm) ?? null
    // Para JP3 hombre no hay tríceps → no podemos calcular AMB
    return null
  }, [metodopliegues, basico.sexo, jp3M.triceps_mm, faulkner.triceps_mm])

  const resultadoAMB: ResultadoAMB | null = useMemo(() => {
    if (!brazo || !pliegueTricesp || !edad) return null
    try {
      return calcularAMB({
        circunferencia_brazo_cm: brazo,
        pliegue_triceps_mm:      pliegueTricesp,
        sexo:                    basico.sexo,
        edad_anios:              edad,
      })
    } catch { return null }
  }, [brazo, pliegueTricesp, edad, basico.sexo])

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
            style={{ background: '#F5F0FF', color: '#AF52DE' }}
          >
            <Ruler size={22} />
          </div>
          <h1 className="text-[22px] font-semibold text-[color:var(--color-text-primary)]">
            Antropometría
          </h1>
        </div>
        <p
          className="text-[15px] leading-relaxed ml-[52px]"
          style={{ color: 'var(--color-text-secondary)' }}
        >
          IMC, composición corporal, índices de riesgo CV y reserva proteica.
        </p>
      </header>

      <div className="space-y-4">

        {/* ── Sección 1 — Medidas básicas ── */}
        <Seccion numero={1} titulo="Medidas básicas">
          <div className="grid grid-cols-2 gap-4">
            <Campo
              id="peso_kg" label="Peso actual" unidad="kg"
              valor={basico.peso_kg} placeholder="70"
              min={10} max={300} onChange={(v) => setB('peso_kg', v)}
            />
            <Campo
              id="talla_cm" label="Talla" unidad="cm"
              valor={basico.talla_cm} placeholder="170"
              min={50} max={250} onChange={(v) => setB('talla_cm', v)}
            />
            <Campo
              id="edad_anios" label="Edad" unidad="años"
              valor={basico.edad_anios} placeholder="30"
              min={1} max={120} onChange={(v) => setB('edad_anios', v)}
            />
            <div className="col-span-2 sm:col-span-1">
              <ToggleSexo valor={basico.sexo} onChange={(s) => setB('sexo', s)} />
            </div>
          </div>

          {/* IMC en tiempo real */}
          {resultadoIMC ? (
            <div
              className="mt-5 rounded-xl p-4"
              style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)' }}
              aria-live="polite"
              aria-label={`IMC ${resultadoIMC.imc.toFixed(1)}: ${ETIQUETA_IMC[resultadoIMC.clasificacion]}`}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p
                    className="text-[12px] font-medium uppercase tracking-wide mb-1"
                    style={{ color: 'var(--color-text-tertiary)' }}
                  >
                    Índice de Masa Corporal
                  </p>
                  <p
                    className="font-mono text-[40px] font-bold leading-none"
                    style={{ color: 'var(--color-text-primary)' }}
                  >
                    {fmt1(resultadoIMC.imc)}
                  </p>
                  <p
                    className="text-[13px] mt-1"
                    style={{ color: 'var(--color-text-secondary)' }}
                  >
                    kg/m²
                  </p>
                </div>
                <div className="text-right flex-shrink-0">
                  <span
                    className="text-[13px] font-semibold px-3 py-1.5 rounded-full"
                    style={{
                      background: `${COLOR_SEMAFORO[colorIMC(resultadoIMC.clasificacion)]}20`,
                      color: COLOR_SEMAFORO[colorIMC(resultadoIMC.clasificacion)],
                    }}
                  >
                    {ETIQUETA_IMC[resultadoIMC.clasificacion]}
                  </span>
                  <p
                    className="text-[11px] mt-2"
                    style={{ color: 'var(--color-text-tertiary)' }}
                  >
                    @source WHO TRS 894, 2000
                  </p>
                </div>
              </div>

              <BarraIMC imc={resultadoIMC.imc} />
            </div>
          ) : (
            peso || talla ? (
              <p
                className="mt-4 text-[13px] rounded-lg px-3 py-2"
                style={{ background: 'var(--color-bg)', color: 'var(--color-text-tertiary)' }}
              >
                Ingresa peso y talla para calcular el IMC
              </p>
            ) : null
          )}
        </Seccion>

        {/* ── Sección 2 — Perímetros ── */}
        <Seccion
          numero={2}
          titulo="Perímetros corporales"
          subtitulo="Opcional — ICC, ICE y AMB"
        >
          <div className="grid grid-cols-2 gap-4">
            <Campo
              id="cintura_cm" label="Cintura" unidad="cm"
              valor={perimetros.cintura_cm} placeholder="80"
              min={40} max={200} onChange={(v) => setP('cintura_cm', v)}
            />
            <Campo
              id="cadera_cm" label="Cadera" unidad="cm"
              valor={perimetros.cadera_cm} placeholder="95"
              min={40} max={200} onChange={(v) => setP('cadera_cm', v)}
            />
            <div className="col-span-2 sm:col-span-1">
              <Campo
                id="brazo_cm" label="Circunferencia brazo" unidad="cm"
                valor={perimetros.brazo_cm} placeholder="30"
                min={10} max={60} onChange={(v) => setP('brazo_cm', v)}
              />
            </div>
          </div>

          {/* Resultados ICC / ICE en tiempo real */}
          {(resultadoICC || resultadoICE) && (
            <div className="grid grid-cols-2 gap-3 mt-4" aria-live="polite">
              {resultadoICC && (
                <ResultadoChip
                  label="ICC"
                  valor={fmt2(resultadoICC.icc)}
                  clasificacion={ETIQUETA_RIESGO[resultadoICC.riesgo]}
                  color={COLOR_SEMAFORO[colorRiesgo(resultadoICC.riesgo)]}
                  fuente="OMS 1997"
                />
              )}
              {resultadoICE && (
                <ResultadoChip
                  label="ICE"
                  valor={fmt2(resultadoICE.ice)}
                  clasificacion={ETIQUETA_RIESGO[resultadoICE.riesgo]}
                  color={COLOR_SEMAFORO[colorRiesgo(resultadoICE.riesgo)]}
                  fuente="Ashwell, 2005"
                />
              )}
            </div>
          )}

          {cintura && !cadera && (
            <p
              className="mt-3 text-[13px]"
              style={{ color: 'var(--color-text-tertiary)' }}
            >
              Agrega la medida de cadera para calcular el ICC.
            </p>
          )}
        </Seccion>

        {/* ── Sección 3 — Pliegues cutáneos (colapsable) ── */}
        <section
          className="rounded-2xl overflow-hidden"
          style={{ background: 'var(--color-surface)', boxShadow: 'var(--shadow)' }}
          aria-label="Sección 3: Pliegues cutáneos"
        >
          <button
            type="button"
            onClick={() => setPlieguesExpandido((p) => !p)}
            className="w-full flex items-center justify-between px-5 py-4"
            style={{ minHeight: '68px' }}
            aria-expanded={plieguesExpandido}
            aria-controls="pliegues-panel"
          >
            <div className="flex items-center gap-3">
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                style={{ background: 'var(--color-primary)' }}
                aria-hidden="true"
              >
                3
              </div>
              <div className="text-left">
                <p
                  className="text-[17px] font-semibold"
                  style={{ color: 'var(--color-text-primary)' }}
                >
                  Pliegues cutáneos
                </p>
                <p
                  className="text-[13px]"
                  style={{ color: 'var(--color-text-secondary)' }}
                >
                  Composición corporal — % grasa, masa magra
                </p>
              </div>
            </div>
            <span style={{ color: 'var(--color-text-tertiary)' }} aria-hidden="true">
              {plieguesExpandido ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
            </span>
          </button>

          {plieguesExpandido && (
            <div
              id="pliegues-panel"
              className="px-5 pb-5 border-t space-y-5"
              style={{ borderColor: 'var(--color-border)' }}
            >
              {/* Selector de método */}
              <div className="pt-4">
                <p
                  className="text-[13px] font-medium mb-3"
                  style={{ color: 'var(--color-text-secondary)' }}
                >
                  Método de medición
                </p>
                <div
                  className="flex rounded-xl p-1 gap-1"
                  style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)' }}
                  role="group"
                  aria-label="Seleccionar método de pliegues"
                >
                  {([
                    { id: 'jackson_pollock' as MetodoPliegues, label: 'Jackson-Pollock 3P' },
                    { id: 'faulkner' as MetodoPliegues, label: 'Faulkner 4P' },
                  ]).map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setMetodoPliegues(m.id)}
                      className="flex-1 rounded-lg text-[14px] font-medium py-2.5 transition-all duration-150"
                      style={{
                        minHeight: '44px',
                        background: metodopliegues === m.id ? 'var(--color-primary)' : 'transparent',
                        color: metodopliegues === m.id ? '#fff' : 'var(--color-text-secondary)',
                      }}
                      aria-pressed={metodopliegues === m.id}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Campos según método y sexo */}
              {metodopliegues === 'jackson_pollock' ? (
                basico.sexo === 'masculino' ? (
                  <div className="space-y-3">
                    <p className="text-[12px] uppercase tracking-wide font-semibold" style={{ color: 'var(--color-text-tertiary)' }}>
                      Jackson-Pollock 3P — Hombre (Pecho, Abdomen, Muslo)
                    </p>
                    <div className="grid grid-cols-3 gap-3">
                      <Campo id="pecho_mm" label="Pecho" unidad="mm"
                        valor={jp3H.pecho_mm} placeholder="15"
                        min={1} max={80} onChange={(v) => setJp3H((p) => ({ ...p, pecho_mm: v }))}
                      />
                      <Campo id="abdominal_h_mm" label="Abdominal" unidad="mm"
                        valor={jp3H.abdominal_mm} placeholder="18"
                        min={1} max={80} onChange={(v) => setJp3H((p) => ({ ...p, abdominal_mm: v }))}
                      />
                      <Campo id="muslo_h_mm" label="Muslo" unidad="mm"
                        valor={jp3H.muslo_mm} placeholder="12"
                        min={1} max={80} onChange={(v) => setJp3H((p) => ({ ...p, muslo_mm: v }))}
                      />
                    </div>
                    <p className="text-[11px]" style={{ color: 'var(--color-text-tertiary)' }}>
                      @source Jackson AS, Pollock ML. Br J Nutr. 1978;40(3):497-504.
                      · Grasa: Fórmula de Siri (1956)
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <p className="text-[12px] uppercase tracking-wide font-semibold" style={{ color: 'var(--color-text-tertiary)' }}>
                      Jackson-Pollock 3P — Mujer (Tríceps, Suprailiaco, Muslo)
                    </p>
                    <div className="grid grid-cols-3 gap-3">
                      <Campo id="triceps_m_mm" label="Tríceps" unidad="mm"
                        valor={jp3M.triceps_mm} placeholder="18"
                        min={1} max={80} onChange={(v) => setJp3M((p) => ({ ...p, triceps_mm: v }))}
                      />
                      <Campo id="suprailiaco_m_mm" label="Suprailiaco" unidad="mm"
                        valor={jp3M.suprailiaco_mm} placeholder="16"
                        min={1} max={80} onChange={(v) => setJp3M((p) => ({ ...p, suprailiaco_mm: v }))}
                      />
                      <Campo id="muslo_m_mm" label="Muslo" unidad="mm"
                        valor={jp3M.muslo_mm} placeholder="24"
                        min={1} max={80} onChange={(v) => setJp3M((p) => ({ ...p, muslo_mm: v }))}
                      />
                    </div>
                    <p className="text-[11px]" style={{ color: 'var(--color-text-tertiary)' }}>
                      @source Jackson AS, Pollock ML. Br J Nutr. 1978;40(3):497-504.
                      · Grasa: Fórmula de Siri (1956)
                    </p>
                  </div>
                )
              ) : (
                <div className="space-y-3">
                  <p className="text-[12px] uppercase tracking-wide font-semibold" style={{ color: 'var(--color-text-tertiary)' }}>
                    Faulkner 4P — Deportistas (Tríceps, Subescapular, Suprailiaco, Abdominal)
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    <Campo id="triceps_f_mm" label="Tríceps" unidad="mm"
                      valor={faulkner.triceps_mm} placeholder="10"
                      min={1} max={80} onChange={(v) => setFaulkner((p) => ({ ...p, triceps_mm: v }))}
                    />
                    <Campo id="subescapular_f_mm" label="Subescapular" unidad="mm"
                      valor={faulkner.subescapular_mm} placeholder="12"
                      min={1} max={80} onChange={(v) => setFaulkner((p) => ({ ...p, subescapular_mm: v }))}
                    />
                    <Campo id="suprailiaco_f_mm" label="Suprailiaco" unidad="mm"
                      valor={faulkner.suprailiaco_mm} placeholder="10"
                      min={1} max={80} onChange={(v) => setFaulkner((p) => ({ ...p, suprailiaco_mm: v }))}
                    />
                    <Campo id="abdominal_f_mm" label="Abdominal" unidad="mm"
                      valor={faulkner.abdominal_mm} placeholder="14"
                      min={1} max={80} onChange={(v) => setFaulkner((p) => ({ ...p, abdominal_mm: v }))}
                    />
                  </div>
                  <p className="text-[11px]" style={{ color: 'var(--color-text-tertiary)' }}>
                    @source Faulkner JA. Physiology of swimming and diving. 1968.
                  </p>
                </div>
              )}

              {/* Resultados composición — en tiempo real */}
              {resultadoComposicion && (
                <div
                  className="rounded-xl p-4 space-y-3"
                  style={{ background: 'var(--color-bg)' }}
                  aria-live="polite"
                  aria-label="Resultados de composición corporal"
                >
                  <p
                    className="text-[12px] font-semibold uppercase tracking-wide"
                    style={{ color: 'var(--color-text-tertiary)' }}
                  >
                    Composición corporal
                  </p>

                  <div className="grid grid-cols-3 gap-3">
                    {/* % Grasa */}
                    <div>
                      <p className="text-[11px]" style={{ color: 'var(--color-text-tertiary)' }}>% Grasa</p>
                      <p className="font-mono text-[22px] font-bold" style={{ color: 'var(--color-text-primary)' }}>
                        {fmt1(resultadoComposicion.porcentaje_grasa)}
                        <span className="text-[13px] font-normal ml-0.5">%</span>
                      </p>
                    </div>
                    {/* Masa grasa */}
                    <div>
                      <p className="text-[11px]" style={{ color: 'var(--color-text-tertiary)' }}>Masa grasa</p>
                      <p className="font-mono text-[22px] font-bold" style={{ color: '#FF3B30' }}>
                        {fmt1(resultadoComposicion.masa_grasa_kg)}
                        <span className="text-[13px] font-normal ml-0.5">kg</span>
                      </p>
                    </div>
                    {/* Masa magra */}
                    <div>
                      <p className="text-[11px]" style={{ color: 'var(--color-text-tertiary)' }}>Masa magra</p>
                      <p className="font-mono text-[22px] font-bold" style={{ color: '#34C759' }}>
                        {fmt1(resultadoComposicion.masa_magra_kg)}
                        <span className="text-[13px] font-normal ml-0.5">kg</span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <BookOpen size={11} aria-hidden="true" style={{ color: 'var(--color-text-tertiary)' }} />
                    <p className="text-[11px]" style={{ color: 'var(--color-text-tertiary)' }}>
                      {resultadoComposicion.fuente_bibliografica}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </section>

        {/* ── Sección 4 — Pesos de referencia ── */}
        {(pesoIdeal || pesoAjustado) && (
          <Seccion numero={4} titulo="Pesos de referencia">
            <div className="grid grid-cols-2 gap-3" aria-live="polite">
              {pesoIdeal && (
                <ResultadoChip
                  label="Peso ideal Hamwi"
                  valor={fmt1(pesoIdeal)}
                  unidad="kg"
                  fuente="Hamwi GJ, 1964"
                />
              )}
              {pesoAjustado && (
                <ResultadoChip
                  label="Peso ajustado"
                  valor={fmt1(pesoAjustado)}
                  unidad="kg"
                  clasificacion="IMC > 30 · Ajuste 25%"
                  color="#FF9500"
                  fuente="ASPEN 2016"
                />
              )}
              {pesoIdeal && peso && (
                <div className="col-span-2">
                  <ResultadoChip
                    label="Adecuación peso actual / ideal"
                    valor={fmt1((peso / pesoIdeal) * 100)}
                    unidad="%"
                    clasificacion={
                      Math.abs((peso / pesoIdeal) * 100 - 100) <= 10
                        ? 'Dentro del rango'
                        : 'Fuera del rango'
                    }
                    color={
                      Math.abs((peso / pesoIdeal) * 100 - 100) <= 10
                        ? '#34C759'
                        : '#FF9500'
                    }
                  />
                </div>
              )}
            </div>
          </Seccion>
        )}

        {/* ── Sección 5 — AMB ── */}
        {resultadoAMB && (
          <Seccion
            numero={5}
            titulo="Área Muscular del Brazo"
            subtitulo="Indicador de reserva proteica"
          >
            <div className="grid grid-cols-2 gap-3" aria-live="polite">
              <ResultadoChip
                label="AMB"
                valor={fmt1(resultadoAMB.amb_cm2)}
                unidad="cm²"
                clasificacion={
                  {
                    adecuada:           'Adecuada',
                    deplecion_leve:     'Depleción leve',
                    deplecion_moderada: 'Depleción moderada',
                    deplecion_severa:   'Depleción severa',
                  }[resultadoAMB.clasificacion]
                }
                color={
                  {
                    adecuada:           '#34C759',
                    deplecion_leve:     '#FF9500',
                    deplecion_moderada: '#FF6B00',
                    deplecion_severa:   '#FF3B30',
                  }[resultadoAMB.clasificacion]
                }
                fuente={resultadoAMB.fuente_bibliografica}
              />
              <ResultadoChip
                label="CMB"
                valor={fmt1(resultadoAMB.cmb_cm)}
                unidad="cm"
                fuente="Frisancho AR, 1981"
              />
            </div>
          </Seccion>
        )}

        {/* Hint cuando no hay secciones opcionales completadas */}
        {!resultadoICC && !resultadoICE && !resultadoComposicion && !resultadoAMB && resultadoIMC && (
          <p
            className="text-center text-[13px] py-2"
            style={{ color: 'var(--color-text-tertiary)' }}
          >
            Completa perímetros o pliegues para una evaluación más completa.
          </p>
        )}

      </div>
    </div>
  )
}