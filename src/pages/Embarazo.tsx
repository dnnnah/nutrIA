/**
 * Embarazo.tsx — Módulo de Embarazo y Lactancia
 * Proyecto NUTRIA — Open Source
 *
 * Secciones con Progressive Disclosure:
 *   1. Configuración inicial — estado (embarazo/lactancia) + trimestre/semana
 *   2. Adición calórica — GET base → GET ajustado en tiempo real
 *   3. Ganancia de peso gestacional — barra de progreso IOM 2009
 *   4. IDR ajustadas — micronutrientes críticos en tarjeta compacta
 *   5. Manejo de náuseas — colapsable, solo visible en embarazo
 *
 * Diseño Apple HIG: sin modales, cálculo en tiempo real (onChange).
 * Mobile-first 390px → responsive hasta 1280px.
 * Touch targets ≥ 44×44px. WCAG 2.1 AA.
 *
 * @source IOM. DRI for Energy. 2002/2005.
 * @source IOM. Weight Gain During Pregnancy. 2009.
 * @source ACOG Practice Bulletin No. 230. 2021.
 */

import { useState, useMemo, useCallback } from 'react'
import {
  Baby,
  ChevronDown,
  ChevronUp,
  Info,
  AlertTriangle,
  BookOpen,
} from 'lucide-react'

import {
  calcularAdicionCalorica,
  calcularGananciaPeso,
  calcularIDRAjustada,
  calcularRecomendacionesNauseas,
} from '../hooks/useEmbarazo'

import type {
  EstadoLactancia,
  IMCPregestacional,
  IntensidadNauseas,
  ResultadoAdicionCalorica,
  ResultadoGananciaPeso,
  ResultadoIDRAjustada,
  ResultadoNauseas,
  Trimestre,
} from '../types/embarazo.types'

// ─────────────────────────────────────────────────────────────────────────────
// Tipos locales
// ─────────────────────────────────────────────────────────────────────────────

type ModoModulo = 'embarazo' | 'lactancia'

interface FormEmbarazo {
  get_base: string
  semana: string
  imc_pregestacional: string
  trimestre: Trimestre
  intensidad_nauseas: IntensidadNauseas
}

interface FormLactancia {
  get_base: string
  estado_lactancia: EstadoLactancia
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

const parseNum = (s: string): number | undefined => {
  const n = parseFloat(s)
  return Number.isFinite(n) && n > 0 ? n : undefined
}

/** Mapea clasificación IMC a texto legible */
const labelIMC: Record<IMCPregestacional, string> = {
  bajo_peso:  'Bajo peso (< 18.5)',
  normal:     'Normal (18.5–24.9)',
  sobrepeso:  'Sobrepeso (25.0–29.9)',
  obesidad:   'Obesidad (≥ 30.0)',
}

/** Mapea trimestre a semanas aproximadas */
const semanasPorTrimestre: Record<Trimestre, string> = {
  primero:  'Sem. 1–13',
  segundo:  'Sem. 14–27',
  tercero:  'Sem. 28–40',
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-componentes atómicos
// ─────────────────────────────────────────────────────────────────────────────

/** Chip de información con icono */
function ChipInfo({ texto, color }: { texto: string; color: 'verde' | 'azul' | 'ambar' | 'rojo' }) {
  const estilos = {
    verde: 'bg-[#F0FBF4] text-[#1C7A3D] border-[#34C759]/30',
    azul:  'bg-[#F0F6FF] text-[#0062CC] border-[#007AFF]/30',
    ambar: 'bg-[#FFF8EE] text-[#9A5700] border-[#FF9500]/30',
    rojo:  'bg-[#FFF1F0] text-[#C0392B] border-[#FF3B30]/30',
  }
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${estilos[color]}`}
    >
      {texto}
    </span>
  )
}

/** Toggle canónico de dos opciones (patrón NUTRIA) */
function Toggle<T extends string>({
  opciones,
  valor,
  onChange,
  ariaLabel,
}: {
  opciones: { valor: T; label: string }[]
  valor: T
  onChange: (v: T) => void
  ariaLabel: string
}) {
  return (
    <div
      className="flex rounded-xl overflow-hidden border border-[#E5E5EA]"
      role="group"
      aria-label={ariaLabel}
    >
      {opciones.map((op) => (
        <button
          key={op.valor}
          type="button"
          onClick={() => onChange(op.valor)}
          aria-pressed={valor === op.valor}
          style={{ minHeight: '44px' }}
          className={[
            'flex-1 px-4 text-sm font-semibold transition-all duration-150',
            valor === op.valor
              ? 'bg-[#007AFF] text-white shadow-sm'
              : 'bg-white text-[#3C3C43] hover:bg-[#F2F2F7]',
          ].join(' ')}
        >
          {op.label}
        </button>
      ))}
    </div>
  )
}

/** Input numérico con label y unidad */
function CampoNumerico({
  label,
  valor,
  onChange,
  placeholder,
  unidad,
  min,
  max,
  step = '1',
  ayuda,
}: {
  label: string
  valor: string
  onChange: (v: string) => void
  placeholder: string
  unidad?: string
  min?: number
  max?: number
  step?: string
  ayuda?: string
}) {
  return (
    <div className="space-y-1.5">
      <label className="block text-[13px] font-semibold text-[#3C3C43]">{label}</label>
      {ayuda && (
        <p className="text-[12px] text-[#8E8E93] leading-snug">{ayuda}</p>
      )}
      <div className="relative flex items-center">
        <input
          type="number"
          value={valor}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          min={min}
          max={max}
          step={step}
          style={{ minHeight: '44px' }}
          className="w-full rounded-xl border border-[#E5E5EA] bg-white px-4 text-[15px] text-[#1C1C1E] placeholder-[#C7C7CC] focus:outline-none focus:ring-2 focus:ring-[#007AFF] focus:border-transparent transition-shadow pr-16"
        />
        {unidad && (
          <span className="absolute right-4 text-[13px] text-[#8E8E93] font-medium pointer-events-none">
            {unidad}
          </span>
        )}
      </div>
    </div>
  )
}

/** Fila de dato clínico con label + valor */
function FilaDato({
  label,
  valor,
  unidad,
  destacado,
}: {
  label: string
  valor: string | number
  unidad?: string
  destacado?: boolean
}) {
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-[#F2F2F7] last:border-0">
      <span className="text-[14px] text-[#3C3C43]">{label}</span>
      <span
        className={`text-[14px] font-semibold ${destacado ? 'text-[#007AFF]' : 'text-[#1C1C1E]'}`}
      >
        {valor}
        {unidad && (
          <span className="ml-1 text-[12px] font-normal text-[#8E8E93]">{unidad}</span>
        )}
      </span>
    </div>
  )
}

/** Barra de progreso con color semafórico */
function BarraProgreso({
  porcentaje,
  colorBarra,
  etiqueta,
}: {
  porcentaje: number
  colorBarra: string
  etiqueta: string
}) {
  const ancho = Math.min(porcentaje, 100)
  return (
    <div className="space-y-1.5">
      <div className="h-2.5 w-full rounded-full bg-[#F2F2F7] overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${ancho}%`, background: colorBarra }}
          role="progressbar"
          aria-valuenow={Math.round(porcentaje)}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={etiqueta}
        />
      </div>
      <p className="text-[12px] text-[#8E8E93] text-right">{Math.round(porcentaje)}%</p>
    </div>
  )
}

/** Tarjeta contenedora estándar */
function Tarjeta({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`bg-white rounded-2xl shadow-sm border border-[#F2F2F7] overflow-hidden ${className}`}
      style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}
    >
      {children}
    </div>
  )
}

/** Header de sección con icono */
function HeaderSeccion({
  icono,
  titulo,
  subtitulo,
}: {
  icono: React.ReactNode
  titulo: string
  subtitulo?: string
}) {
  return (
    <div className="flex items-start gap-3 px-4 pt-4 pb-3 border-b border-[#F2F2F7]">
      <div
        className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
        style={{ background: '#F0F6FF', color: '#007AFF' }}
      >
        {icono}
      </div>
      <div>
        <h2 className="text-[15px] font-semibold text-[#1C1C1E] leading-tight">{titulo}</h2>
        {subtitulo && (
          <p className="text-[12px] text-[#8E8E93] mt-0.5 leading-snug">{subtitulo}</p>
        )}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Sección: Adición calórica
// ─────────────────────────────────────────────────────────────────────────────

function SeccionAdicionCalorica({ resultado }: { resultado: ResultadoAdicionCalorica }) {
  return (
    <Tarjeta>
      <HeaderSeccion
        icono={<Baby size={16} />}
        titulo="Adición Calórica"
        subtitulo="GET ajustado según etapa"
      />
      <div className="px-4 pb-4 pt-2">
        <FilaDato label="GET basal" valor={resultado.get_base_kcal.toFixed(0)} unidad="kcal/día" />
        <FilaDato
          label="Adición por embarazo/lactancia"
          valor={resultado.adicion_kcal === 0 ? '—' : `+${resultado.adicion_kcal}`}
          unidad={resultado.adicion_kcal > 0 ? 'kcal/día' : undefined}
        />
        <FilaDato
          label="GET total ajustado"
          valor={resultado.get_total_kcal.toFixed(0)}
          unidad="kcal/día"
          destacado
        />
        <div className="mt-3 p-3 rounded-xl bg-[#F0F6FF]">
          <p className="text-[12px] text-[#0062CC] leading-relaxed">{resultado.justificacion}</p>
        </div>
        <p className="mt-2 text-[11px] text-[#8E8E93] leading-snug">
          📚 {resultado.fuente_bibliografica}
        </p>
      </div>
    </Tarjeta>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Sección: Ganancia de peso
// ─────────────────────────────────────────────────────────────────────────────

function SeccionGananciaPeso({
  resultado,
  semana,
}: {
  resultado: ResultadoGananciaPeso
  semana: number
}) {
  // Porcentaje de ganancia acumulada sobre el máximo del rango
  const porcentajeSobreMax =
    (resultado.ganancia_actual_recomendada_kg / resultado.ganancia_total_max_kg) * 100

  // Color de la barra según porcentaje de gestación completada
  const porcentajeGestacion = (semana / 40) * 100
  const colorBarra =
    porcentajeGestacion < 33 ? '#007AFF' : porcentajeGestacion < 66 ? '#FF9500' : '#34C759'

  return (
    <Tarjeta>
      <HeaderSeccion
        icono={<Baby size={16} />}
        titulo="Ganancia de Peso Gestacional"
        subtitulo={`IOM 2009 — ${labelIMC[resultado.clasificacion_imc]}`}
      />
      <div className="px-4 pb-4 pt-2">
        <div className="mb-3">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[13px] text-[#3C3C43]">
              Ganancia acumulada recomendada (semana {semana})
            </span>
            <span className="text-[14px] font-bold text-[#1C1C1E]">
              {resultado.ganancia_actual_recomendada_kg} kg
            </span>
          </div>
          <BarraProgreso
            porcentaje={porcentajeSobreMax}
            colorBarra={colorBarra}
            etiqueta={`Ganancia recomendada semana ${semana}`}
          />
        </div>
        <FilaDato
          label="Rango total al término"
          valor={`${resultado.ganancia_total_min_kg}–${resultado.ganancia_total_max_kg}`}
          unidad="kg"
        />
        <FilaDato
          label="Tasa semanal media (T2/T3)"
          valor={resultado.ganancia_por_semana_kg.toFixed(3)}
          unidad="kg/sem"
        />
        <div className="mt-2 flex flex-wrap gap-2">
          <ChipInfo texto={`Semana ${semana}/40`} color="azul" />
          <ChipInfo texto={labelIMC[resultado.clasificacion_imc]} color="verde" />
        </div>
        <p className="mt-3 text-[11px] text-[#8E8E93] leading-snug">
          📚 {resultado.fuente_bibliografica}
        </p>
      </div>
    </Tarjeta>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Sección: IDR ajustadas
// ─────────────────────────────────────────────────────────────────────────────

function SeccionIDRAjustada({ resultado }: { resultado: ResultadoIDRAjustada }) {
  const nutrientes = [
    { label: 'Hierro', valor: resultado.hierro_mg, unidad: 'mg/día' },
    { label: 'Folato', valor: resultado.folato_mcg_dfe, unidad: 'mcg DFE/día' },
    { label: 'Calcio', valor: resultado.calcio_mg, unidad: 'mg/día' },
    { label: 'Vitamina D', valor: resultado.vitamina_d_mcg, unidad: 'mcg/día' },
    { label: 'Yodo', valor: resultado.yodo_mcg, unidad: 'mcg/día' },
    { label: 'DHA (omega-3)', valor: resultado.omega3_dha_mg, unidad: 'mg/día' },
    { label: 'Proteína adicional', valor: resultado.proteina_adicional_g, unidad: 'g/día' },
  ]

  return (
    <Tarjeta>
      <HeaderSeccion
        icono={<BookOpen size={16} />}
        titulo="IDR Ajustadas"
        subtitulo="Micronutrientes críticos — IOM 2001-2011"
      />
      <div className="px-4 pb-4 pt-2">
        {nutrientes.map((n) => (
          <FilaDato
            key={n.label}
            label={n.label}
            valor={n.valor}
            unidad={n.unidad}
          />
        ))}
        <p className="mt-3 text-[11px] text-[#8E8E93] leading-snug">
          📚 {resultado.fuente_bibliografica}
        </p>
      </div>
    </Tarjeta>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Sección: Recomendaciones de náuseas (colapsable)
// ─────────────────────────────────────────────────────────────────────────────

function SeccionNauseas({ resultado }: { resultado: ResultadoNauseas }) {
  const [expandida, setExpandida] = useState(false)

  return (
    <Tarjeta>
      {/* Header colapsable */}
      <button
        type="button"
        onClick={() => setExpandida((v) => !v)}
        style={{ minHeight: '56px' }}
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-[#F9F9F9] transition-colors"
        aria-expanded={expandida}
        aria-controls="panel-nauseas"
      >
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: '#FFF8EE', color: '#FF9500' }}
          >
            <AlertTriangle size={16} />
          </div>
          <div className="text-left">
            <p className="text-[15px] font-semibold text-[#1C1C1E] leading-tight">
              Manejo de Náuseas y Vómito
            </p>
            <p className="text-[12px] text-[#8E8E93] mt-0.5">
              {resultado.fraccionamiento_comidas} tiempos de comida recomendados
              {resultado.requiere_derivacion && ' · ⚠️ Derivación médica sugerida'}
            </p>
          </div>
        </div>
        {expandida ? (
          <ChevronUp size={18} className="text-[#8E8E93] flex-shrink-0" />
        ) : (
          <ChevronDown size={18} className="text-[#8E8E93] flex-shrink-0" />
        )}
      </button>

      {/* Contenido expandible */}
      {expandida && (
        <div id="panel-nauseas" className="px-4 pb-4 space-y-4 border-t border-[#F2F2F7]">
          {resultado.requiere_derivacion && (
            <div className="mt-3 p-3 rounded-xl bg-[#FFF1F0] border border-[#FF3B30]/20 flex items-start gap-2">
              <AlertTriangle size={14} className="text-[#FF3B30] flex-shrink-0 mt-0.5" />
              <p className="text-[12px] text-[#C0392B] leading-relaxed">
                Los síntomas severos pueden indicar hiperemesis gravidarum. Se recomienda
                evaluación médica si la paciente no puede retener líquidos por más de 24 horas.
              </p>
            </div>
          )}

          {/* Recomendaciones generales */}
          <div className="mt-3">
            <p className="text-[12px] font-semibold text-[#3C3C43] mb-2 uppercase tracking-wide">
              Recomendaciones dietéticas
            </p>
            <ul className="space-y-2">
              {resultado.recomendaciones.map((rec, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-[#007AFF] text-[11px] font-bold mt-0.5 flex-shrink-0">
                    {i + 1}.
                  </span>
                  <span className="text-[13px] text-[#3C3C43] leading-relaxed">{rec}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Alimentos recomendados */}
          <div>
            <p className="text-[12px] font-semibold text-[#1C7A3D] mb-2 uppercase tracking-wide">
              ✓ Alimentos tolerados
            </p>
            <div className="flex flex-wrap gap-2">
              {resultado.alimentos_recomendados.map((a) => (
                <span
                  key={a}
                  className="px-2.5 py-1 rounded-lg bg-[#F0FBF4] text-[#1C7A3D] text-[12px] font-medium border border-[#34C759]/25"
                >
                  {a}
                </span>
              ))}
            </div>
          </div>

          {/* Alimentos a evitar */}
          <div>
            <p className="text-[12px] font-semibold text-[#C0392B] mb-2 uppercase tracking-wide">
              ✗ Evitar
            </p>
            <div className="flex flex-wrap gap-2">
              {resultado.alimentos_evitar.map((a) => (
                <span
                  key={a}
                  className="px-2.5 py-1 rounded-lg bg-[#FFF1F0] text-[#C0392B] text-[12px] font-medium border border-[#FF3B30]/25"
                >
                  {a}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}
    </Tarjeta>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Panel de embarazo
// ─────────────────────────────────────────────────────────────────────────────

function PanelEmbarazo() {
  const [form, setForm] = useState<FormEmbarazo>({
    get_base: '',
    semana: '',
    imc_pregestacional: '',
    trimestre: 'segundo',
    intensidad_nauseas: 'leve',
  })

  const update = useCallback(
    <K extends keyof FormEmbarazo>(campo: K, valor: FormEmbarazo[K]) =>
      setForm((prev) => ({ ...prev, [campo]: valor })),
    [],
  )

  // Calcular trimestre automáticamente desde la semana
  const trimestreDeducido: 'primero' | 'segundo' | 'tercero' | undefined = useMemo(() => {
    const sem = parseNum(form.semana)
    if (!sem) return undefined
    if (sem <= 13) return 'primero'
    if (sem <= 27) return 'segundo'
    return 'tercero'
  }, [form.semana])

  const resultados = useMemo(() => {
    const get = parseNum(form.get_base)
    const sem = parseNum(form.semana)
    const imc = parseNum(form.imc_pregestacional)
    const trimestre = trimestreDeducido ?? form.trimestre

    if (!get) return null

    try {
      const adicion = calcularAdicionCalorica({ get_base_kcal: get, trimestre })
      const ganancia = sem && imc
        ? calcularGananciaPeso({ imc_pregestacional: imc, semana_gestacion: sem })
        : null
      const idr = calcularIDRAjustada({
        es_lactancia: false,
        semana_gestacion: sem,
      })
      const nauseas = sem
        ? calcularRecomendacionesNauseas({
            semana_gestacion: sem,
            intensidad: form.intensidad_nauseas,
          })
        : null
      return { adicion, ganancia, idr, nauseas }
    } catch {
      return null
    }
  }, [form, trimestreDeducido])

  const TRIMESTRES: { valor: Trimestre; label: string }[] = [
    { valor: 'primero', label: '1er Trim.' },
    { valor: 'segundo', label: '2do Trim.' },
    { valor: 'tercero', label: '3er Trim.' },
  ]

  const INTENSIDADES: { valor: IntensidadNauseas; label: string }[] = [
    { valor: 'leve', label: 'Leve' },
    { valor: 'moderada', label: 'Moderada' },
    { valor: 'severa', label: 'Severa' },
  ]

  return (
    <div className="space-y-4">
      {/* Formulario de ingreso */}
      <Tarjeta>
        <HeaderSeccion
          icono={<Baby size={16} />}
          titulo="Datos del Embarazo"
          subtitulo="Ingresa los datos para calcular en tiempo real"
        />
        <div className="px-4 pb-4 pt-3 space-y-4">
          <CampoNumerico
            label="GET basal (sin embarazo)"
            valor={form.get_base}
            onChange={(v) => update('get_base', v)}
            placeholder="1800"
            unidad="kcal/día"
            min={500}
            max={6000}
            ayuda="Gasto energético calculado previamente en el módulo GET/TMB"
          />
          <CampoNumerico
            label="Semana de gestación"
            valor={form.semana}
            onChange={(v) => update('semana', v)}
            placeholder="20"
            unidad="sem"
            min={1}
            max={40}
          />
          <CampoNumerico
            label="IMC pregestacional"
            valor={form.imc_pregestacional}
            onChange={(v) => update('imc_pregestacional', v)}
            placeholder="22.5"
            unidad="kg/m²"
            min={10}
            max={70}
            step="0.1"
            ayuda="IMC antes del embarazo — determina el rango de ganancia de peso IOM 2009"
          />

          {/* Trimestre (solo si no se puede deducir de la semana) */}
          {!trimestreDeducido && (
            <div className="space-y-1.5">
              <label className="block text-[13px] font-semibold text-[#3C3C43]">
                Trimestre (o ingresa la semana para deducirlo)
              </label>
              <div className="grid grid-cols-3 gap-2">
                {TRIMESTRES.map((t) => (
                  <button
                    key={t.valor}
                    type="button"
                    onClick={() => update('trimestre', t.valor)}
                    aria-pressed={form.trimestre === t.valor}
                    style={{ minHeight: '44px' }}
                    className={[
                      'rounded-xl border text-[13px] font-semibold transition-all duration-150 px-2',
                      form.trimestre === t.valor
                        ? 'bg-[#007AFF] text-white border-[#007AFF] shadow-sm'
                        : 'bg-white text-[#3C3C43] border-[#E5E5EA] hover:bg-[#F2F2F7]',
                    ].join(' ')}
                  >
                    <span className="block text-[11px] opacity-70">
                      {semanasPorTrimestre[t.valor]}
                    </span>
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Trimestre auto-deducido */}
          {trimestreDeducido && (
            <div className="flex items-center gap-2">
              <Info size={14} className="text-[#007AFF] flex-shrink-0" />
              <span className="text-[12px] text-[#007AFF]">
                Trimestre deducido de la semana {form.semana}:{' '}
                <strong>
                  {trimestreDeducido === 'primero' ? '1er' : trimestreDeducido === 'segundo' ? '2do' : '3er'}{' '}
                  trimestre
                </strong>
              </span>
            </div>
          )}

          {/* Intensidad de náuseas */}
          <div className="space-y-1.5">
            <label className="block text-[13px] font-semibold text-[#3C3C43]">
              Intensidad de náuseas y vómito
            </label>
            <div className="flex rounded-xl overflow-hidden border border-[#E5E5EA]">
              {INTENSIDADES.map((op) => (
                <button
                  key={op.valor}
                  type="button"
                  onClick={() => update('intensidad_nauseas', op.valor)}
                  aria-pressed={form.intensidad_nauseas === op.valor}
                  style={{ minHeight: '44px' }}
                  className={[
                    'flex-1 text-[13px] font-semibold transition-all duration-150',
                    form.intensidad_nauseas === op.valor
                      ? 'bg-[#007AFF] text-white'
                      : 'bg-white text-[#3C3C43] hover:bg-[#F2F2F7]',
                  ].join(' ')}
                >
                  {op.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </Tarjeta>

      {/* Resultados */}
      {resultados && (
        <>
          <SeccionAdicionCalorica resultado={resultados.adicion} />
          {resultados.ganancia && parseNum(form.semana) && (
            <SeccionGananciaPeso
              resultado={resultados.ganancia}
              semana={parseNum(form.semana)!}
            />
          )}
          <SeccionIDRAjustada resultado={resultados.idr} />
          {resultados.nauseas && <SeccionNauseas resultado={resultados.nauseas} />}
        </>
      )}

      {/* Estado vacío */}
      {!resultados && (
        <Tarjeta>
          <div className="px-4 py-8 flex flex-col items-center text-center gap-3">
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center"
              style={{ background: '#F0F6FF' }}
            >
              <Baby size={22} style={{ color: '#007AFF' }} />
            </div>
            <p className="text-[15px] font-semibold text-[#1C1C1E]">
              Ingresa el GET basal
            </p>
            <p className="text-[13px] text-[#8E8E93] max-w-xs leading-relaxed">
              Completa el campo de GET basal para ver la adición calórica ajustada.
              Agrega la semana de gestación e IMC para un análisis completo.
            </p>
          </div>
        </Tarjeta>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Panel de lactancia
// ─────────────────────────────────────────────────────────────────────────────

function PanelLactancia() {
  const [form, setForm] = useState<FormLactancia>({
    get_base: '',
    estado_lactancia: 'exclusiva',
  })

  const update = useCallback(
    <K extends keyof FormLactancia>(campo: K, valor: FormLactancia[K]) =>
      setForm((prev) => ({ ...prev, [campo]: valor })),
    [],
  )

  const resultados = useMemo(() => {
    const get = parseNum(form.get_base)
    if (!get) return null
    try {
      const adicion = calcularAdicionCalorica({
        get_base_kcal: get,
        estado_lactancia: form.estado_lactancia,
      })
      const idr = calcularIDRAjustada({
        es_lactancia: true,
        estado_lactancia: form.estado_lactancia,
      })
      return { adicion, idr }
    } catch {
      return null
    }
  }, [form])

  const ESTADOS_LACTANCIA: { valor: EstadoLactancia; label: string }[] = [
    { valor: 'exclusiva', label: 'Exclusiva' },
    { valor: 'parcial', label: 'Parcial' },
    { valor: 'no_lactando', label: 'No lactando' },
  ]

  return (
    <div className="space-y-4">
      <Tarjeta>
        <HeaderSeccion
          icono={<Baby size={16} />}
          titulo="Datos de Lactancia"
          subtitulo="Ingresa los datos para calcular en tiempo real"
        />
        <div className="px-4 pb-4 pt-3 space-y-4">
          <CampoNumerico
            label="GET basal"
            valor={form.get_base}
            onChange={(v) => update('get_base', v)}
            placeholder="1750"
            unidad="kcal/día"
            min={500}
            max={6000}
          />
          <div className="space-y-1.5">
            <label className="block text-[13px] font-semibold text-[#3C3C43]">
              Estado de lactancia
            </label>
            <div className="grid grid-cols-3 gap-2">
              {ESTADOS_LACTANCIA.map((op) => (
                <button
                  key={op.valor}
                  type="button"
                  onClick={() => update('estado_lactancia', op.valor)}
                  aria-pressed={form.estado_lactancia === op.valor}
                  style={{ minHeight: '44px' }}
                  className={[
                    'rounded-xl border text-[13px] font-semibold transition-all duration-150 px-2',
                    form.estado_lactancia === op.valor
                      ? 'bg-[#007AFF] text-white border-[#007AFF] shadow-sm'
                      : 'bg-white text-[#3C3C43] border-[#E5E5EA] hover:bg-[#F2F2F7]',
                  ].join(' ')}
                >
                  {op.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </Tarjeta>

      {resultados ? (
        <>
          <SeccionAdicionCalorica resultado={resultados.adicion} />
          <SeccionIDRAjustada resultado={resultados.idr} />
        </>
      ) : (
        <Tarjeta>
          <div className="px-4 py-8 flex flex-col items-center text-center gap-3">
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center"
              style={{ background: '#F0F6FF' }}
            >
              <Baby size={22} style={{ color: '#007AFF' }} />
            </div>
            <p className="text-[15px] font-semibold text-[#1C1C1E]">Ingresa el GET basal</p>
            <p className="text-[13px] text-[#8E8E93] max-w-xs leading-relaxed">
              Completa el campo para ver la adición calórica y las IDR ajustadas para lactancia.
            </p>
          </div>
        </Tarjeta>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Componente principal
// ─────────────────────────────────────────────────────────────────────────────

export default function Embarazo() {
  const [modo, setModo] = useState<ModoModulo>('embarazo')

  const MODOS: { valor: ModoModulo; label: string }[] = [
    { valor: 'embarazo', label: 'Embarazo' },
    { valor: 'lactancia', label: 'Lactancia' },
  ]

  return (
    <div
      className="min-h-screen"
      style={{ background: 'var(--color-bg, #F2F2F7)' }}
    >
      <div className="max-w-2xl mx-auto px-4 pt-6 pb-10 space-y-5">

        {/* Header de página */}
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-sm"
            style={{ background: '#007AFF' }}
          >
            <Baby size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-[22px] font-bold text-[#1C1C1E] leading-tight">
              Embarazo y Lactancia
            </h1>
            <p className="text-[13px] text-[#8E8E93] leading-snug">
              Adición calórica · Ganancia de peso · IDR ajustadas
            </p>
          </div>
        </div>

        {/* Toggle modo — patrón canónico NUTRIA */}
        <Toggle
          opciones={MODOS}
          valor={modo}
          onChange={setModo}
          ariaLabel="Seleccionar modo: embarazo o lactancia"
        />

        {/* Panel activo */}
        {modo === 'embarazo' ? <PanelEmbarazo /> : <PanelLactancia />}

        {/* Nota clínica al pie */}
        <div
          className="rounded-2xl p-4 flex items-start gap-3"
          style={{ background: '#FFF8EE', border: '1px solid rgba(255,149,0,0.2)' }}
        >
          <Info size={16} className="text-[#FF9500] flex-shrink-0 mt-0.5" />
          <p className="text-[12px] text-[#9A5700] leading-relaxed">
            <strong>Nota clínica:</strong> Los valores de este módulo son de referencia
            basados en las guías IOM 2009 y ACOG 2021. Siempre individualizar según la
            evaluación clínica de cada paciente y considerar patologías concomitantes
            (diabetes gestacional, preeclampsia, embarazo múltiple).
          </p>
        </div>

      </div>
    </div>
  )
}