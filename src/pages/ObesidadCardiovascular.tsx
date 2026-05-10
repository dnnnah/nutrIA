/**
 * ObesidadCardiovascular.tsx — Obesidad y Riesgo Cardiovascular
 * Proyecto NUTRIA — Open Source
 *
 * Secciones con Progressive Disclosure (Apple HIG):
 *   1. Riesgo Cardiovascular Framingham — abierta por defecto
 *   2. Índices de Lípidos (colapsable)
 *   3. Densidad Calórica del Menú (colapsable)
 *   4. Índice de Conicidad (colapsable)
 *
 * Principios de diseño:
 *   - Cálculo en tiempo real (onChange)
 *   - Sin modales ni alertas bloqueantes
 *   - Touch targets ≥ 44×44px (WCAG 2.1 AA)
 *   - Progressive Disclosure inline
 *   - Tokens CSS del proyecto Apple HIG
 *   - TypeScript strict — cero `any`
 *
 * @source Wilson PWF et al. Circulation. 1998;97(18):1837-1847.   (Framingham)
 * @source Valdez R. J Clin Epidemiol. 1991;44(9):955-956.         (Índice Conicidad)
 * @source Castelli WP et al. Circulation. 1983;67(4):730-734.     (Índice Aterogénico)
 * @source NCEP ATP-III. JAMA. 2001;285(19):2486-2497.             (No-HDL)
 * @source Drewnowski A, Specter SE. Am J Clin Nutr. 2004;79(1):6-16. (DC)
 */

import { useState, useMemo, useCallback, useId } from 'react'
import { Heart, ChevronDown, ChevronUp, Plus, Trash2, AlertCircle } from 'lucide-react'

import {
  calcularFramingham,
  calcularÍndiceAterogénico,
  calcularNoHDL,
  calcularÍndiceConicidad,
  calcularDensidadCalórica,
  calcularDensidadMenuCompleto,
} from '../hooks/useObesidad'
import type {
  ClasificaciónDC,
  ClasificaciónIA,
  ClasificaciónNoHDL,
  ClasificaciónIC,
  CategoríaRiesgoCVD,
} from '../types/obesidad.types'

// ===========================================================================
// TIPOS LOCALES
// ===========================================================================

type Sexo = 'masculino' | 'femenino'

interface AlimentoItem {
  id: string
  nombre: string
  kcal: string
  gramos: string
}

// ===========================================================================
// SISTEMA DE SEMÁFOROS
// ===========================================================================

type ColorSemáforo = 'verde' | 'amarillo' | 'rojo' | 'gris'

const COLORES: Record<ColorSemáforo, { bg: string; texto: string; borde: string; dot: string }> = {
  verde:    { bg: '#E8F8EC', texto: '#1B7A34', borde: '#A7F3C0', dot: '#34C759' },
  amarillo: { bg: '#FFF7E6', texto: '#B45309', borde: '#FDE68A', dot: '#FF9500' },
  rojo:     { bg: '#FDEAEA', texto: '#B91C1C', borde: '#FECACA', dot: '#FF3B30' },
  gris:     { bg: '#F2F2F7', texto: '#8E8E93', borde: '#E5E5EA', dot: '#C7C7CC' },
}

const colorFramingham = (cat: CategoríaRiesgoCVD): ColorSemáforo => {
  if (cat === 'bajo')       return 'verde'
  if (cat === 'intermedio') return 'amarillo'
  return 'rojo'
}

const colorIA = (cat: ClasificaciónIA): ColorSemáforo => {
  if (cat === 'optimo') return 'verde'
  if (cat === 'normal') return 'amarillo'
  return 'rojo'
}

const colorNoHDL = (cat: ClasificaciónNoHDL): ColorSemáforo => {
  if (cat === 'optimo') return 'verde'
  if (cat === 'limite') return 'amarillo'
  return 'rojo'
}

const colorDC = (cat: ClasificaciónDC): ColorSemáforo => {
  if (cat === 'muy_baja') return 'verde'
  if (cat === 'baja')     return 'verde'
  if (cat === 'media')    return 'amarillo'
  return 'rojo'
}

const colorIC = (cat: ClasificaciónIC): ColorSemáforo =>
  cat === 'normal' ? 'verde' : 'rojo'

// ===========================================================================
// COMPONENTES ATÓMICOS REUTILIZABLES
// ===========================================================================

/** Punto de semáforo circular */
function SemaforoDot({ color }: { color: ColorSemáforo }) {
  return (
    <span
      aria-hidden="true"
      className="inline-block w-2.5 h-2.5 rounded-full flex-shrink-0"
      style={{ background: COLORES[color].dot }}
    />
  )
}

/** Badge de estado con color */
function Badge({ texto, color }: { texto: string; color: ColorSemáforo }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full"
      style={{ background: COLORES[color].bg, color: COLORES[color].texto }}
    >
      <SemaforoDot color={color} />
      {texto}
    </span>
  )
}

/** Input clínico estándar */
interface InputClinicoProps {
  label: string
  valor: string
  onChange: (v: string) => void
  unidad: string
  placeholder?: string
  id?: string
}
function InputClinico({ label, valor, onChange, unidad, placeholder, id }: InputClinicoProps) {
  const generatedId = useId()
  const inputId = id ?? generatedId

  return (
    <div className="flex flex-col gap-1">
      <label
        htmlFor={inputId}
        className="text-[13px] font-medium"
        style={{ color: 'var(--color-text-secondary)' }}
      >
        {label}
      </label>
      <div
        className="flex items-center gap-2 px-3 rounded-xl border transition-colors"
        style={{
          background:   'var(--color-bg)',
          borderColor:  'var(--color-border)',
          minHeight:    '44px',
        }}
      >
        <input
          id={inputId}
          type="number"
          inputMode="decimal"
          value={valor}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder ?? '—'}
          className="flex-1 bg-transparent text-[15px] outline-none min-w-0"
          style={{ color: 'var(--color-text-primary)' }}
          aria-label={`${label} en ${unidad}`}
        />
        <span
          className="text-[13px] flex-shrink-0"
          style={{ color: 'var(--color-text-tertiary)' }}
        >
          {unidad}
        </span>
      </div>
    </div>
  )
}

/** Toggle de sexo biológico — patrón canónico NUTRIA */
function ToggleSexo({
  valor,
  onChange,
}: {
  valor: Sexo
  onChange: (s: Sexo) => void
}) {
  return (
    <div className="flex flex-col gap-1">
      <span
        className="text-[13px] font-medium"
        style={{ color: 'var(--color-text-secondary)' }}
      >
        Sexo biológico
      </span>
      <div
        className="inline-flex rounded-xl p-1"
        style={{ background: 'var(--color-bg)' }}
        role="group"
        aria-label="Sexo biológico"
      >
        {(['masculino', 'femenino'] as const).map((opcion) => (
          <button
            key={opcion}
            type="button"
            onClick={() => onChange(opcion)}
            aria-pressed={valor === opcion}
            className="flex-1 px-4 rounded-lg text-[13px] font-semibold transition-all duration-150 capitalize"
            style={{
              minHeight: '36px',
              background: valor === opcion ? 'var(--color-surface)' : 'transparent',
              color:      valor === opcion ? 'var(--color-primary)' : 'var(--color-text-secondary)',
              boxShadow:  valor === opcion ? 'var(--shadow)' : 'none',
            }}
          >
            {opcion === 'masculino' ? 'Masculino' : 'Femenino'}
          </button>
        ))}
      </div>
    </div>
  )
}

/** Toggle Sí/No — patrón botones */
function ToggleSiNo({
  label,
  valor,
  onChange,
}: {
  label: string
  valor: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span
        className="text-[13px] font-medium leading-tight flex-1"
        style={{ color: 'var(--color-text-secondary)' }}
      >
        {label}
      </span>
      <div
        className="inline-flex rounded-xl p-1 flex-shrink-0"
        style={{ background: 'var(--color-bg)' }}
        role="group"
        aria-label={label}
      >
        {([true, false] as const).map((opcion) => (
          <button
            key={String(opcion)}
            type="button"
            onClick={() => onChange(opcion)}
            aria-pressed={valor === opcion}
            className="px-4 rounded-lg text-[13px] font-semibold transition-all duration-150"
            style={{
              minHeight: '36px',
              minWidth:  '52px',
              background: valor === opcion ? 'var(--color-surface)' : 'transparent',
              color:      valor === opcion ? 'var(--color-primary)' : 'var(--color-text-secondary)',
              boxShadow:  valor === opcion ? 'var(--shadow)' : 'none',
            }}
          >
            {opcion ? 'Sí' : 'No'}
          </button>
        ))}
      </div>
    </div>
  )
}

/** Tarjeta de resultado numérico principal */
function ResultadoNumericoGrande({
  valor,
  sufijo,
  etiqueta,
  color,
  descripcion,
}: {
  valor: number
  sufijo: string
  etiqueta: string
  color: ColorSemáforo
  descripcion?: string
}) {
  return (
    <div
      className="rounded-2xl p-5 flex flex-col gap-2"
      style={{
        background:  COLORES[color].bg,
        border:      `1px solid ${COLORES[color].borde}`,
      }}
    >
      <div className="flex items-end gap-1.5">
        <span
          className="text-[44px] font-bold leading-none tabular-nums"
          style={{ color: COLORES[color].texto }}
        >
          {valor}
        </span>
        <span
          className="text-[17px] font-semibold pb-1"
          style={{ color: COLORES[color].texto }}
        >
          {sufijo}
        </span>
      </div>
      <Badge texto={etiqueta} color={color} />
      {descripcion && (
        <p
          className="text-[12px] leading-relaxed mt-1"
          style={{ color: COLORES[color].texto }}
        >
          {descripcion}
        </p>
      )}
    </div>
  )
}

/** Chip de resultado compacto (para valores secundarios) */
function ResultadoChip({
  label,
  valor,
  unidad,
  etiqueta,
  color,
}: {
  label: string
  valor: number | string
  unidad: string
  etiqueta: string
  color: ColorSemáforo
}) {
  return (
    <div
      className="flex flex-col gap-1.5 p-4 rounded-2xl"
      style={{ background: 'var(--color-bg)' }}
    >
      <span
        className="text-[11px] font-semibold uppercase tracking-wide"
        style={{ color: 'var(--color-text-tertiary)' }}
      >
        {label}
      </span>
      <div className="flex items-baseline gap-1">
        <span
          className="text-[22px] font-bold tabular-nums"
          style={{ color: 'var(--color-text-primary)' }}
        >
          {valor}
        </span>
        <span
          className="text-[13px]"
          style={{ color: 'var(--color-text-tertiary)' }}
        >
          {unidad}
        </span>
      </div>
      <Badge texto={etiqueta} color={color} />
    </div>
  )
}

/** Fuente bibliográfica inline */
function FuenteBib({ texto }: { texto: string }) {
  return (
    <p
      className="text-[10px] leading-relaxed mt-3"
      style={{ color: 'var(--color-text-tertiary)' }}
    >
      Fuente: {texto}
    </p>
  )
}

/** Sección colapsable genérica */
function SecciónColapsable({
  titulo,
  icono,
  defaultAbierta = false,
  children,
}: {
  titulo: string
  icono?: React.ReactNode
  defaultAbierta?: boolean
  children: React.ReactNode
}) {
  const [abierta, setAbierta] = useState(defaultAbierta)
  const headerId = useId()

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
        type="button"
        onClick={() => setAbierta((a) => !a)}
        aria-expanded={abierta}
        aria-controls={headerId}
        className="w-full flex items-center justify-between px-5 py-4 text-left transition-colors hover:opacity-80"
        style={{ minHeight: '56px' }}
      >
        <div className="flex items-center gap-3">
          {icono && (
            <span style={{ color: 'var(--color-primary)' }}>{icono}</span>
          )}
          <span
            className="text-[15px] font-semibold"
            style={{ color: 'var(--color-text-primary)' }}
          >
            {titulo}
          </span>
        </div>
        <span style={{ color: 'var(--color-text-tertiary)' }}>
          {abierta ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </span>
      </button>

      {abierta && (
        <div
          id={headerId}
          className="px-5 pb-5 flex flex-col gap-4"
        >
          <div
            className="border-t"
            style={{ borderColor: 'var(--color-border)' }}
          />
          {children}
        </div>
      )}
    </section>
  )
}

// ===========================================================================
// SECCIÓN 1 — FRAMINGHAM
// ===========================================================================

function SecciónFramingham() {
  const [sexo, setSexo]             = useState<Sexo>('masculino')
  const [edad, setEdad]             = useState('')
  const [ct, setCT]                 = useState('')
  const [hdl, setHDL]               = useState('')
  const [ps, setPS]                 = useState('')
  const [fumador, setFumador]       = useState(false)
  const [tto, setTto]               = useState(false)

  const resultado = useMemo(() => {
    const e  = parseFloat(edad)
    const c  = parseFloat(ct)
    const h  = parseFloat(hdl)
    const p  = parseFloat(ps)
    if (
      !Number.isFinite(e) || e < 30 || e > 74 ||
      !Number.isFinite(c) || c <= 0 ||
      !Number.isFinite(h) || h <= 0 ||
      !Number.isFinite(p) || p <= 0
    ) return null

    try {
      return calcularFramingham({
        sexo,
        edad_anios:                       e,
        colesterol_total_mg_dL:           c,
        hdl_mg_dL:                         h,
        presion_sistolica_mmHg:           p,
        fumador_activo:                   fumador,
        bajo_tratamiento_antihipertensivo: tto,
      })
    } catch {
      return null
    }
  }, [sexo, edad, ct, hdl, ps, fumador, tto])

  return (
    <div className="flex flex-col gap-4">
      <ToggleSexo valor={sexo} onChange={setSexo} />

      <div className="grid grid-cols-2 gap-3">
        <InputClinico label="Edad" valor={edad} onChange={setEdad} unidad="años" placeholder="55" />
        <InputClinico label="Col. total" valor={ct} onChange={setCT} unidad="mg/dL" placeholder="200" />
        <InputClinico label="HDL" valor={hdl} onChange={setHDL} unidad="mg/dL" placeholder="50" />
        <InputClinico label="P. sistólica" valor={ps} onChange={setPS} unidad="mmHg" placeholder="130" />
      </div>

      <div className="flex flex-col gap-3">
        <ToggleSiNo label="Fumador activo" valor={fumador} onChange={setFumador} />
        <ToggleSiNo label="Bajo tratamiento antihipertensivo" valor={tto} onChange={setTto} />
      </div>

      {resultado ? (
        <div className="flex flex-col gap-3 mt-1">
          <ResultadoNumericoGrande
            valor={resultado.riesgo_10_anios_pct}
            sufijo="%"
            etiqueta={resultado.etiqueta}
            color={colorFramingham(resultado.categoria)}
            descripcion={resultado.interpretacion_clinica}
          />
          <div
            className="flex items-center justify-between px-4 py-2.5 rounded-xl"
            style={{ background: 'var(--color-bg)' }}
          >
            <span
              className="text-[13px]"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              Puntos Framingham
            </span>
            <span
              className="text-[15px] font-bold tabular-nums"
              style={{ color: 'var(--color-text-primary)' }}
            >
              {resultado.puntos_obtenidos > 0
                ? `+${resultado.puntos_obtenidos}`
                : resultado.puntos_obtenidos}
            </span>
          </div>
        </div>
      ) : (
        <div
          className="rounded-2xl p-5 text-center"
          style={{ background: 'var(--color-bg)' }}
        >
          <p
            className="text-[13px]"
            style={{ color: 'var(--color-text-tertiary)' }}
          >
            Ingresa todos los valores para calcular el riesgo a 10 años
          </p>
        </div>
      )}

      <FuenteBib texto="Wilson PWF et al. Prediction of Coronary Heart Disease Using Risk Factor Categories. Circulation. 1998;97(18):1837-1847." />
    </div>
  )
}

// ===========================================================================
// SECCIÓN 2 — ÍNDICES DE LÍPIDOS
// ===========================================================================

function SecciónLípidos() {
  const [ct, setCT]   = useState('')
  const [hdl, setHDL] = useState('')

  const ctNum  = parseFloat(ct)
  const hdlNum = parseFloat(hdl)
  const valido = Number.isFinite(ctNum) && ctNum > 0 && Number.isFinite(hdlNum) && hdlNum > 0

  const ia = useMemo(() => {
    if (!valido) return null
    try { return calcularÍndiceAterogénico({ colesterol_total_mg_dL: ctNum, hdl_mg_dL: hdlNum }) }
    catch { return null }
  }, [ctNum, hdlNum, valido])

  const noHDL = useMemo(() => {
    if (!valido) return null
    try { return calcularNoHDL({ colesterol_total_mg_dL: ctNum, hdl_mg_dL: hdlNum }) }
    catch { return null }
  }, [ctNum, hdlNum, valido])

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3">
        <InputClinico label="Col. total" valor={ct} onChange={setCT} unidad="mg/dL" placeholder="200" />
        <InputClinico label="HDL"        valor={hdl} onChange={setHDL} unidad="mg/dL" placeholder="50" />
      </div>

      {ia && noHDL ? (
        <div className="grid grid-cols-2 gap-3">
          <ResultadoChip
            label="Índice Aterogénico"
            valor={ia.ia.toFixed(2)}
            unidad="CT/HDL"
            etiqueta={ia.etiqueta}
            color={colorIA(ia.clasificacion)}
          />
          <ResultadoChip
            label="No-HDL"
            valor={noHDL.no_hdl_mg_dL}
            unidad="mg/dL"
            etiqueta={noHDL.etiqueta}
            color={colorNoHDL(noHDL.clasificacion)}
          />
        </div>
      ) : (
        <div
          className="rounded-xl p-4 text-center"
          style={{ background: 'var(--color-bg)' }}
        >
          <p className="text-[13px]" style={{ color: 'var(--color-text-tertiary)' }}>
            Ingresa colesterol total y HDL
          </p>
        </div>
      )}

      {ia && noHDL && (
        <div
          className="rounded-xl p-3.5"
          style={{ background: 'var(--color-bg)' }}
        >
          <p className="text-[12px] leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
            <span className="font-semibold">Interpretación combinada: </span>
            {ia.clasificacion === 'optimo' && noHDL.clasificacion === 'optimo'
              ? 'Perfil lipídico favorable. Continuar con hábitos saludables.'
              : ia.clasificacion === 'muy_alto' || noHDL.clasificacion === 'muy_alto'
              ? 'Riesgo aterogénico elevado. Evaluar intervención farmacológica y cambios de estilo de vida intensivos.'
              : 'Perfil lipídico con factores de riesgo. Reforzar intervención nutricional y actividad física.'}
          </p>
        </div>
      )}

      <FuenteBib texto="Castelli WP et al. Circulation. 1983;67(4):730-734. | NCEP ATP-III. JAMA. 2001;285(19):2486-2497." />
    </div>
  )
}

// ===========================================================================
// SECCIÓN 3 — DENSIDAD CALÓRICA DEL MENÚ
// ===========================================================================

function SecciónDensidadCalórica() {
  const [alimentos, setAlimentos] = useState<AlimentoItem[]>([
    { id: crypto.randomUUID(), nombre: '', kcal: '', gramos: '' },
  ])

  const agregarAlimento = useCallback(() => {
    if (alimentos.length >= 10) return
    setAlimentos((prev) => [
      ...prev,
      { id: crypto.randomUUID(), nombre: '', kcal: '', gramos: '' },
    ])
  }, [alimentos.length])

  const eliminarAlimento = useCallback((id: string) => {
    setAlimentos((prev) => prev.filter((a) => a.id !== id))
  }, [])

  const actualizarAlimento = useCallback(
    (id: string, campo: keyof Omit<AlimentoItem, 'id'>, valor: string) => {
      setAlimentos((prev) =>
        prev.map((a) => (a.id === id ? { ...a, [campo]: valor } : a))
      )
    },
    []
  )

  // Calcular DC individuales
  const resultados = useMemo(() => {
    return alimentos.map((a) => {
      const kcal   = parseFloat(a.kcal)
      const gramos = parseFloat(a.gramos)
      if (!Number.isFinite(kcal) || kcal < 0 || !Number.isFinite(gramos) || gramos <= 0) {
        return null
      }
      try {
        return calcularDensidadCalórica({ nombre: a.nombre || '—', kcal, gramos })
      } catch {
        return null
      }
    })
  }, [alimentos])

  // Promedio del menú
  const promedioMenu = useMemo(() => {
    const validos = alimentos
      .map((a, i) => ({ a, r: resultados[i] }))
      .filter((x) => x.r !== null)
      .map((x) => ({
        nombre: x.a.nombre || '—',
        kcal:   parseFloat(x.a.kcal),
        gramos: parseFloat(x.a.gramos),
      }))

    if (validos.length === 0) return null
    try {
      return calcularDensidadMenuCompleto(validos)
    } catch {
      return null
    }
  }, [alimentos, resultados])

  const alimentosConResultado = alimentos.some(
    (_, i) => resultados[i] !== null
  )

  return (
    <div className="flex flex-col gap-4">
      {/* Lista de alimentos */}
      <div className="flex flex-col gap-3">
        {alimentos.map((a, idx) => {
          const res = resultados[idx]

          return (
            <div
              key={a.id}
              className="rounded-2xl p-4 flex flex-col gap-3"
              style={{ background: 'var(--color-bg)' }}
            >
              {/* Fila 1: nombre + eliminar */}
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={a.nombre}
                  onChange={(e) => actualizarAlimento(a.id, 'nombre', e.target.value)}
                  placeholder={`Alimento ${idx + 1}`}
                  className="flex-1 bg-transparent text-[13px] font-medium outline-none min-w-0"
                  style={{ color: 'var(--color-text-primary)' }}
                  aria-label={`Nombre del alimento ${idx + 1}`}
                />
                {alimentos.length > 1 && (
                  <button
                    type="button"
                    onClick={() => eliminarAlimento(a.id)}
                    aria-label={`Eliminar alimento ${idx + 1}`}
                    className="flex items-center justify-center rounded-lg transition-colors"
                    style={{
                      minWidth: '32px',
                      minHeight: '32px',
                      color: 'var(--color-danger)',
                    }}
                  >
                    <Trash2 size={15} />
                  </button>
                )}
              </div>

              {/* Fila 2: kcal + gramos + badge resultado */}
              <div className="flex items-end gap-2">
                <div className="flex-1">
                  <InputClinico
                    label="kcal"
                    valor={a.kcal}
                    onChange={(v) => actualizarAlimento(a.id, 'kcal', v)}
                    unidad="kcal"
                    placeholder="100"
                  />
                </div>
                <div className="flex-1">
                  <InputClinico
                    label="Peso"
                    valor={a.gramos}
                    onChange={(v) => actualizarAlimento(a.id, 'gramos', v)}
                    unidad="g"
                    placeholder="100"
                  />
                </div>
                {res && (
                  <div className="pb-1 flex-shrink-0">
                    <Badge texto={`${res.dc_kcal_g} kcal/g`} color={colorDC(res.clasificacion)} />
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Botón agregar */}
      {alimentos.length < 10 && (
        <button
          type="button"
          onClick={agregarAlimento}
          className="flex items-center justify-center gap-2 rounded-2xl py-3 transition-opacity hover:opacity-80 active:opacity-60"
          style={{
            border:    `1.5px dashed var(--color-border)`,
            color:     'var(--color-primary)',
            minHeight: '44px',
          }}
          aria-label="Agregar alimento"
        >
          <Plus size={16} />
          <span className="text-[13px] font-semibold">Agregar alimento</span>
        </button>
      )}

      {/* Resultado promedio del menú */}
      {promedioMenu && alimentosConResultado && (
        <div className="flex flex-col gap-2 mt-1">
          <div
            className="flex items-center justify-between px-4 py-3 rounded-2xl"
            style={{
              background: COLORES[colorDC(promedioMenu.clasificacion_promedio)].bg,
              border:     `1px solid ${COLORES[colorDC(promedioMenu.clasificacion_promedio)].borde}`,
            }}
          >
            <div>
              <p
                className="text-[11px] font-semibold uppercase tracking-wide"
                style={{ color: 'var(--color-text-tertiary)' }}
              >
                Densidad promedio del menú
              </p>
              <p
                className="text-[22px] font-bold tabular-nums mt-0.5"
                style={{ color: COLORES[colorDC(promedioMenu.clasificacion_promedio)].texto }}
              >
                {promedioMenu.dc_promedio_kcal_g} kcal/g
              </p>
            </div>
            <Badge
              texto={promedioMenu.etiqueta_promedio}
              color={colorDC(promedioMenu.clasificacion_promedio)}
            />
          </div>

          <div
            className="flex items-start gap-2 px-4 py-3 rounded-xl"
            style={{ background: 'var(--color-bg)' }}
          >
            <AlertCircle size={14} className="flex-shrink-0 mt-0.5" style={{ color: 'var(--color-warning)' }} />
            <p className="text-[12px] leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
              {promedioMenu.recomendacion}
            </p>
          </div>
        </div>
      )}

      <FuenteBib texto="Drewnowski A, Specter SE. Am J Clin Nutr. 2004;79(1):6-16. | Rolls BJ. Physiol Behav. 2009;97(5):609-615." />
    </div>
  )
}

// ===========================================================================
// SECCIÓN 4 — ÍNDICE DE CONICIDAD
// ===========================================================================

function SecciónÍndiceConicidad() {
  const [sexo, setSexo]         = useState<Sexo>('masculino')
  const [cintura, setCintura]   = useState('')
  const [peso, setPeso]         = useState('')
  const [talla, setTalla]       = useState('')

  const resultado = useMemo(() => {
    const c = parseFloat(cintura)
    const p = parseFloat(peso)
    const t = parseFloat(talla)
    if (!Number.isFinite(c) || !Number.isFinite(p) || !Number.isFinite(t) || c <= 0 || p <= 0 || t <= 0) {
      return null
    }
    try {
      return calcularÍndiceConicidad({ cintura_cm: c, peso_kg: p, talla_cm: t, sexo })
    } catch {
      return null
    }
  }, [cintura, peso, talla, sexo])

  return (
    <div className="flex flex-col gap-4">
      <ToggleSexo valor={sexo} onChange={setSexo} />

      <div className="grid grid-cols-3 gap-3">
        <InputClinico label="Cintura" valor={cintura} onChange={setCintura} unidad="cm" placeholder="90" />
        <InputClinico label="Peso"    valor={peso}    onChange={setPeso}    unidad="kg" placeholder="80" />
        <InputClinico label="Talla"   valor={talla}   onChange={setTalla}   unidad="cm" placeholder="175" />
      </div>

      {resultado ? (
        <div className="flex flex-col gap-2 mt-1">
          <ResultadoNumericoGrande
            valor={resultado.ic}
            sufijo=""
            etiqueta={resultado.etiqueta}
            color={colorIC(resultado.clasificacion)}
          />
          <div
            className="flex items-center justify-between px-4 py-2.5 rounded-xl"
            style={{ background: 'var(--color-bg)' }}
          >
            <span className="text-[13px]" style={{ color: 'var(--color-text-secondary)' }}>
              Punto de corte ({sexo === 'masculino' ? 'hombre' : 'mujer'})
            </span>
            <span className="text-[15px] font-bold tabular-nums" style={{ color: 'var(--color-text-primary)' }}>
              {resultado.punto_corte_sexo}
            </span>
          </div>
          <div
            className="flex items-start gap-2 px-4 py-3 rounded-xl"
            style={{ background: 'var(--color-bg)' }}
          >
            <AlertCircle size={14} className="flex-shrink-0 mt-0.5" style={{ color: 'var(--color-text-tertiary)' }} />
            <p className="text-[12px] leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
              Nota clínica: El Índice de Conicidad complementa al ICC (cintura/cadera) para evaluar adiposidad central. Un IC elevado refleja redistribución de grasa hacia el abdomen con morfología cónica asociada a mayor riesgo metabólico.
            </p>
          </div>
        </div>
      ) : (
        <div
          className="rounded-2xl p-5 text-center"
          style={{ background: 'var(--color-bg)' }}
        >
          <p className="text-[13px]" style={{ color: 'var(--color-text-tertiary)' }}>
            Ingresa cintura, peso y talla para calcular el índice
          </p>
        </div>
      )}

      <FuenteBib texto="Valdez R. J Clin Epidemiol. 1991;44(9):955-956. | Pitanga FJ, Lessa I. Rev Bras Epidemiol. 2005;8(4):360-367." />
    </div>
  )
}

// ===========================================================================
// COMPONENTE PRINCIPAL
// ===========================================================================

export default function ObesidadCardiovascular() {
  return (
    <div className="max-w-2xl mx-auto px-4 pt-6 pb-24 md:pb-10 md:px-6 md:pt-8">

      {/* ── Encabezado ── */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: '#FDEAEA', color: '#FF3B30' }}
          >
            <Heart size={20} />
          </div>
          <h1 className="text-[22px] font-semibold" style={{ color: 'var(--color-text-primary)' }}>
            Obesidad y Riesgo Cardiovascular
          </h1>
        </div>
        <p
          className="text-[13px] leading-relaxed ml-[52px]"
          style={{ color: 'var(--color-text-secondary)' }}
        >
          Evaluación de riesgo cardiovascular Framingham, índices lipídicos, densidad calórica e índice de conicidad.
        </p>
      </div>

      {/* ── Secciones ── */}
      <div className="flex flex-col gap-4">

        {/* Framingham — abierta por defecto */}
        <SecciónColapsable
          titulo="Riesgo Cardiovascular Framingham"
          icono={<Heart size={18} />}
          defaultAbierta
        >
          <SecciónFramingham />
        </SecciónColapsable>

        {/* Índices de lípidos */}
        <SecciónColapsable titulo="Índices de Lípidos">
          <SecciónLípidos />
        </SecciónColapsable>

        {/* Densidad calórica */}
        <SecciónColapsable titulo="Densidad Calórica del Menú">
          <SecciónDensidadCalórica />
        </SecciónColapsable>

        {/* Índice de conicidad */}
        <SecciónColapsable titulo="Índice de Conicidad">
          <SecciónÍndiceConicidad />
        </SecciónColapsable>

      </div>
    </div>
  )
}