/**
 * References.tsx — Biblioteca de Referencia Clínica
 *
 * Secciones (tabs horizontales):
 *   1. Rangos de Laboratorio   → lab_references.json
 *   2. IDR por grupo etario    → idr.json
 *   3. Medidas caseras MX      → measures.json
 *   4. Factores NAF y Estrés   → naf_constants.json
 *   5. Fórmulas clínicas       → datos estáticos con cita APA
 *
 * Reglas:
 *   - Tabs horizontales (sin sidebar)
 *   - Sin dropdowns — cards o toggles
 *   - useMemo para filtrados locales
 *   - Touch targets ≥ 44×44px
 *   - TypeScript strict — cero any
 */

import { useState, useMemo } from 'react'
import { Search, FlaskConical, Apple, UtensilsCrossed, Zap, BookOpen } from 'lucide-react'

import labData from '../data/lab_references.json'
import idrData from '../data/idr.json'
import measuresData from '../data/measures.json'
import nafData from '../data/naf_constants.json'

// ─── Tipos internos ────────────────────────────────────────────────────────────

type TabId = 'laboratorio' | 'idr' | 'medidas' | 'naf' | 'formulas'

interface Tab {
  id: TabId
  label: string
  icono: React.ReactNode
}

interface RangoItem {
  parametro: string
  categoria: string
  valor: string
  unidad: string
  fuente: string
}

interface MedidaItem {
  medida: string
  categoria: string
  peso_g: number
  referencia: string
}

interface FormulaItem {
  nombre: string
  ecuacion: string
  uso: string
  fuente: string
}

// ─── Constantes ───────────────────────────────────────────────────────────────

const TABS: Tab[] = [
  { id: 'laboratorio', label: 'Laboratorio',  icono: <FlaskConical size={14} /> },
  { id: 'idr',         label: 'IDR',          icono: <Apple size={14} /> },
  { id: 'medidas',     label: 'Medidas',      icono: <UtensilsCrossed size={14} /> },
  { id: 'naf',         label: 'NAF / Estrés', icono: <Zap size={14} /> },
  { id: 'formulas',    label: 'Fórmulas',     icono: <BookOpen size={14} /> },
]

const FORMULAS_CLINICAS: FormulaItem[] = [
  {
    nombre: 'Mifflin-St Jeor',
    ecuacion: 'H: TMB = (10×kg) + (6.25×cm) − (5×edad) + 5\nM: TMB = (10×kg) + (6.25×cm) − (5×edad) − 161',
    uso: 'Tasa metabólica basal — población general (estándar actual)',
    fuente: 'Mifflin MD, St Jeor ST, et al. (1990). Am J Clin Nutr, 51(2):241-247.',
  },
  {
    nombre: 'Harris-Benedict (Roza & Shizgal)',
    ecuacion: 'H: TMB = 88.362 + (13.397×kg) + (4.799×cm) − (5.677×edad)\nM: TMB = 447.593 + (9.247×kg) + (3.098×cm) − (4.330×edad)',
    uso: 'TMB revisada — entorno hospitalario',
    fuente: 'Roza AM, Shizgal HM. (1984). Am J Clin Nutr, 40(1):168-182.',
  },
  {
    nombre: 'Valencia (Población Mexicana)',
    ecuacion: 'H (30-60 a): TMB = (13.08×kg) + 693\nM (30-60 a): TMB = (10.92×kg) + 679',
    uso: 'TMB validada en mexicanos — preferente en México',
    fuente: 'Valencia ME et al. Instituto Nacional de Ciencias Médicas y Nutrición Salvador Zubirán (INNSZ).',
  },
  {
    nombre: 'Katch-McArdle',
    ecuacion: 'TMB = 370 + (21.6 × masa_magra_kg)',
    uso: 'TMB en atletas — requiere conocer masa libre de grasa',
    fuente: 'McArdle WD, Katch FI, Katch VL. Exercise Physiology. 8th ed. Lippincott Williams & Wilkins. 2015.',
  },
  {
    nombre: 'Cunningham',
    ecuacion: 'TMB = 500 + (22 × masa_magra_kg)',
    uso: 'TMB en individuos con alta masa muscular',
    fuente: 'Cunningham JJ. (1980). Am J Clin Nutr, 33(11):2372-2374.',
  },
  {
    nombre: 'Schofield (OMS)',
    ecuacion: 'Varía por rango de edad y sexo (tablas OMS 1985)\nEj. H 18-30: TMB = (15.057×kg) + 692.2',
    uso: 'TMB en pediatría y adolescentes',
    fuente: 'Schofield WN. (1985). Human Nutrition: Clinical Nutrition, 39C(Suppl 1):5-41.',
  },
  {
    nombre: 'Jackson-Pollock 3 pliegues',
    ecuacion: 'H (Pecho+Abd+Muslo): DC = 1.10938 − (0.0008267×Σ3) + (0.0000016×Σ3²) − (0.0002574×edad)\nM (Tríc+SupIl+Muslo): DC = 1.099492 − (0.0009929×Σ3) + (0.0000023×Σ3²) − (0.0001392×edad)',
    uso: 'Densidad corporal por pliegues cutáneos',
    fuente: 'Jackson AS, Pollock ML. (1978). Br J Nutr, 40(3):497-504.',
  },
  {
    nombre: 'Siri — % Grasa',
    ecuacion: '%Grasa = ((4.95 / DC) − 4.50) × 100',
    uso: 'Porcentaje de grasa corporal desde densidad corporal (DC)',
    fuente: 'Siri WE. (1956). Advances in Biological and Medical Physics, 4:239-280.',
  },
  {
    nombre: 'Faulkner — 4 pliegues',
    ecuacion: '%Grasa = (Σ4_pliegues × 0.153) + 5.783\nPliegues: Tríceps + Subescapular + Suprailiaco + Abdominal',
    uso: '% grasa en deportistas',
    fuente: 'Faulkner JA. (1968). Physiology of swimming and diving. En: Falls H (ed). Exercise Physiology. Academic Press.',
  },
  {
    nombre: 'Área Muscular del Brazo (AMB)',
    ecuacion: 'AMB = [Circ_brazo_cm − (π × Pliegue_tríceps_cm)]² / (4π)',
    uso: 'Evaluación de reserva proteica / desnutrición',
    fuente: 'Frisancho AR. (1981). Am J Clin Nutr, 34(11):2540-2545.',
  },
  {
    nombre: 'HOMA-IR',
    ecuacion: 'HOMA-IR = (Glucosa_mg/dL × Insulina_μUI/mL) / 405\n< 2.5 Normal | 2.5-3.5 Resistencia leve | > 3.5 Significativa',
    uso: 'Resistencia a la insulina',
    fuente: 'Matthews DR, Hosker JP, et al. (1985). Diabetologia, 28(7):412-419.',
  },
  {
    nombre: 'CKD-EPI 2021',
    ecuacion: 'TFG estimada varía por sexo y creatinina sérica (tabla CKD-EPI 2021)\nEstadios: G1≥90 | G2:60-89 | G3a:45-59 | G3b:30-44 | G4:15-29 | G5<15',
    uso: 'Filtrado glomerular — estadificación de ERC',
    fuente: 'Inker LA, Eneanya ND, et al. (2021). NEJM, 385:1737-1749.',
  },
  {
    nombre: 'Balance Nitrogenado',
    ecuacion: 'BN = (Proteína_g / 6.25) − (NUU_g + 4)\nNUU = Nitrógeno ureico urinario en orina de 24h\n> 0 = Anabolismo | < 0 = Catabolismo',
    uso: 'Estado anabólico/catabólico en nutrición clínica',
    fuente: 'Bistrian BR. (1990). Nutritional assessment. ASPEN Clinical Guidelines.',
  },
]

// ─── Helpers para extraer rangos de laboratorio ───────────────────────────────

type LabJson = typeof labData
type LabJsonKey = keyof Omit<LabJson, '_meta'>

function extraerRangos(): RangoItem[] {
  const rangos: RangoItem[] = []

  const categorias: { key: LabJsonKey; label: string }[] = [
    { key: 'metabolismo_glucosa',   label: 'Glucemia' },
    { key: 'perfil_lipidico',       label: 'Lípidos' },
    { key: 'funcion_renal',         label: 'Función Renal' },
    { key: 'funcion_hepatica',      label: 'Función Hepática' },
    { key: 'hemograma',             label: 'Hemograma' },
    { key: 'micronutrientes_sericos', label: 'Micronutrientes' },
    { key: 'funcion_tiroidea',      label: 'Tiroides' },
    { key: 'presion_arterial',      label: 'Presión Arterial' },
    { key: 'indices_nutricionales', label: 'Índices Nutricionales' },
  ]

  for (const { key, label } of categorias) {
    const seccion = labData[key] as Record<string, unknown>
    if (!seccion) continue

    for (const [param, datos] of Object.entries(seccion)) {
      if (param.startsWith('_') || typeof datos !== 'object' || datos === null) continue
      const d = datos as Record<string, unknown>

      // Determinar valor de referencia más relevante
      let valor = ''
      if (d['normal'] !== undefined) {
        const n = d['normal'] as Record<string, number | null>
        if (n.min !== null && n.max !== null) valor = `${n.min} – ${n.max}`
        else if (n.min !== null) valor = `≥ ${n.min}`
        else if (n.max !== null) valor = `< ${n.max}`
      } else if (d['optimo'] !== undefined) {
        const o = d['optimo'] as Record<string, number | null>
        if (o.min !== null && o.max !== null) valor = `${o.min} – ${o.max}`
        else if (o.max !== null) valor = `< ${o.max}`
      } else if (d['referencia'] !== undefined) {
        const r = d['referencia']
        if (typeof r === 'string') valor = r
      } else if (d['hombre'] !== undefined) {
        const h = d['hombre'] as Record<string, number>
        valor = `H: ${h.min}–${h.max}`
      }

      if (!valor) continue

      // Fuente
      const fuente =
        typeof (seccion as Record<string, unknown>)['_fuente'] === 'string'
          ? (seccion as Record<string, unknown>)['_fuente'] as string
          : 'Ver metadatos'

      rangos.push({
        parametro: param.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase()),
        categoria: label,
        valor,
        unidad: (d['unidad'] as string | undefined) ?? '',
        fuente,
      })
    }
  }

  return rangos
}

// ─── Helper para medidas caseras ─────────────────────────────────────────────

function extraerMedidas(): MedidaItem[] {
  const items: MedidaItem[] = []

  const medidas = measuresData as Record<string, unknown>

  for (const [categoria, grupo] of Object.entries(medidas)) {
    if (categoria === '_meta' || typeof grupo !== 'object' || grupo === null) continue

    for (const [medida, datos] of Object.entries(grupo as Record<string, unknown>)) {
      if (medida === 'equivalencias' || medida.startsWith('_')) continue
      if (typeof datos !== 'object' || datos === null) continue
      const d = datos as Record<string, unknown>

      const pesoVal = d['peso_neto_g'] ?? d['peso_escurrido_g'] ?? d['peso_promedio_g']
      if (typeof pesoVal !== 'number') continue

      items.push({
        medida: medida.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase()),
        categoria: categoria.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase()),
        peso_g: pesoVal,
        referencia: (d['descripcion'] as string | undefined) ?? categoria,
      })
    }
  }

  return items
}

// ─── Sub-componentes ──────────────────────────────────────────────────────────

/** Chip de color según nivel de laboratorio */
function ChipNivel({ nivel }: { nivel: 'normal' | 'limite' | 'alto' }) {
  const config = {
    normal:  { bg: 'bg-green-50',  text: 'text-green-700',  label: 'Normal' },
    limite:  { bg: 'bg-amber-50',  text: 'text-amber-700',  label: 'Límite' },
    alto:    { bg: 'bg-red-50',    text: 'text-red-700',    label: 'Alto' },
  }[nivel]

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${config.bg} ${config.text}`}>
      {config.label}
    </span>
  )
}

/** Buscador local reutilizable */
function Buscador({
  valor,
  onChange,
  placeholder,
}: {
  valor: string
  onChange: (v: string) => void
  placeholder: string
}) {
  return (
    <div className="relative mb-4">
      <Search
        size={16}
        className="absolute left-3 top-1/2 -translate-y-1/2 text-[color:var(--color-text-tertiary)]"
        aria-hidden
      />
      <input
        type="search"
        value={valor}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm outline-none transition-shadow"
        style={{
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          color: 'var(--color-text-primary)',
          minHeight: '44px',
        }}
      />
    </div>
  )
}

/** Fila de tabla genérica */
function FilaTabla({ celdas }: { celdas: React.ReactNode[] }) {
  return (
    <tr className="border-t border-[color:var(--color-border)] hover:bg-[color:var(--color-bg)] transition-colors">
      {celdas.map((celda, i) => (
        <td key={i} className="px-3 py-3 text-sm text-[color:var(--color-text-primary)] align-top">
          {celda}
        </td>
      ))}
    </tr>
  )
}

/** Encabezados de tabla */
function EncabezadoTabla({ cols }: { cols: string[] }) {
  return (
    <thead>
      <tr>
        {cols.map((col) => (
          <th
            key={col}
            className="px-3 py-2 text-left text-[11px] font-semibold tracking-wide uppercase text-[color:var(--color-text-tertiary)]"
          >
            {col}
          </th>
        ))}
      </tr>
    </thead>
  )
}

/** Contenedor de tarjeta con tabla */
function TarjetaTabla({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="rounded-2xl overflow-hidden overflow-x-auto"
      style={{
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        boxShadow: 'var(--shadow)',
      }}
    >
      <table className="w-full min-w-[500px]">{children}</table>
    </div>
  )
}

// ─── Sección 1 — Rangos de Laboratorio ────────────────────────────────────────

const RANGOS_LAB = extraerRangos()

function SeccionLaboratorio() {
  const [busqueda, setBusqueda] = useState('')
  const [categoriaActiva, setCategoriaActiva] = useState<string>('Todas')

  const categorias = useMemo(() => {
    const set = new Set(RANGOS_LAB.map((r) => r.categoria))
    return ['Todas', ...Array.from(set)]
  }, [])

  const filtrados = useMemo(() => {
    return RANGOS_LAB.filter((r) => {
      const matchCat = categoriaActiva === 'Todas' || r.categoria === categoriaActiva
      const matchBusq = busqueda === '' || r.parametro.toLowerCase().includes(busqueda.toLowerCase())
      return matchCat && matchBusq
    })
  }, [busqueda, categoriaActiva])

  return (
    <div>
      <p className="text-sm text-[color:var(--color-text-secondary)] mb-4 leading-relaxed">
        Rangos de referencia para adultos en ayuno (8-12h). Fuente: ADA 2024 + Harrison 21ª ed.
      </p>

      <Buscador valor={busqueda} onChange={setBusqueda} placeholder="Buscar parámetro..." />

      {/* Filtro por categoría — scroll horizontal */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-4 no-scrollbar">
        {categorias.map((cat) => (
          <button
            key={cat}
            onClick={() => setCategoriaActiva(cat)}
            style={{ minHeight: '36px', whiteSpace: 'nowrap' }}
            className={[
              'px-3 py-1.5 rounded-full text-xs font-semibold transition-all flex-shrink-0',
              categoriaActiva === cat
                ? 'bg-[color:var(--color-primary)] text-white shadow-sm'
                : 'bg-[color:var(--color-surface)] text-[color:var(--color-text-secondary)] border border-[color:var(--color-border)]',
            ].join(' ')}
          >
            {cat}
          </button>
        ))}
      </div>

      <TarjetaTabla>
        <EncabezadoTabla cols={['Parámetro', 'Categoría', 'Valor normal', 'Nivel', 'Fuente']} />
        <tbody>
          {filtrados.length === 0 ? (
            <tr>
              <td colSpan={5} className="px-3 py-8 text-center text-sm text-[color:var(--color-text-tertiary)]">
                Sin resultados para "{busqueda}"
              </td>
            </tr>
          ) : (
            filtrados.map((r, i) => (
              <FilaTabla
                key={i}
                celdas={[
                  <span className="font-medium">{r.parametro}</span>,
                  <span className="text-xs text-[color:var(--color-text-secondary)]">{r.categoria}</span>,
                  <code className="text-xs bg-[color:var(--color-bg)] px-1.5 py-0.5 rounded font-mono">
                    {r.valor}
                  </code>,
                  <ChipNivel nivel="normal" />,
                  <span className="text-[11px] text-[color:var(--color-text-tertiary)] leading-tight">{r.fuente}</span>,
                ]}
              />
            ))
          )}
        </tbody>
      </TarjetaTabla>

      <p className="mt-3 text-[11px] text-[color:var(--color-text-tertiary)] leading-relaxed">
        ⚠️ Rangos de referencia orientativos. Varían por laboratorio, método analítico y altitud. Interpretar siempre en contexto clínico.
      </p>
    </div>
  )
}

// ─── Sección 2 — IDR ──────────────────────────────────────────────────────────

type IdrGrupos = typeof idrData['grupos']
type GrupoKey = keyof IdrGrupos

const GRUPOS_IDR: { key: GrupoKey; etiqueta: string }[] = [
  { key: 'adulto_19_30_h',       etiqueta: 'Adulto H 19-30' },
  { key: 'adulto_19_30_m',       etiqueta: 'Adulto M 19-30' },
  { key: 'adulto_31_50_h',       etiqueta: 'Adulto H 31-50' },
  { key: 'adulto_31_50_m',       etiqueta: 'Adulto M 31-50' },
  { key: 'adulto_51_70_h',       etiqueta: 'Adulto H 51-70' },
  { key: 'adulto_51_70_m',       etiqueta: 'Adulto M 51-70' },
  { key: 'adulto_mayor_71_h',    etiqueta: 'Mayor H ≥71' },
  { key: 'adulto_mayor_71_m',    etiqueta: 'Mayor M ≥71' },
  { key: 'adolescente_14_18_h',  etiqueta: 'Adolesc. H 14-18' },
  { key: 'adolescente_14_18_m',  etiqueta: 'Adolesc. M 14-18' },
  { key: 'nino_9_13_h',          etiqueta: 'Niño H 9-13' },
  { key: 'nino_9_13_m',          etiqueta: 'Niño M 9-13' },
  { key: 'nino_4_8',             etiqueta: 'Niño 4-8' },
  { key: 'nino_1_3',             etiqueta: 'Niño 1-3' },
  { key: 'embarazo_19_30',       etiqueta: 'Embarazo 19-30' },
  { key: 'embarazo_31_50',       etiqueta: 'Embarazo 31-50' },
  { key: 'lactancia_19_30',      etiqueta: 'Lactancia 19-30' },
  { key: 'lactancia_31_50',      etiqueta: 'Lactancia 31-50' },
]

function SeccionIDR() {
  const [grupoSeleccionado, setGrupoSeleccionado] = useState<GrupoKey>('adulto_19_30_m')

  const datosGrupo = useMemo(
    () => idrData.grupos[grupoSeleccionado] as Record<string, unknown>,
    [grupoSeleccionado],
  )

  const unidades = idrData._meta.unidades as Record<string, string>

  const filas = useMemo(() => {
    return Object.entries(datosGrupo)
      .filter(([key]) => key !== 'descripcion')
      .map(([nutriente, valor]) => ({
        nutriente: nutriente.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase()),
        valor: String(valor),
        unidad: unidades[nutriente] ?? '',
      }))
  }, [datosGrupo, unidades])

  return (
    <div>
      <p className="text-sm text-[color:var(--color-text-secondary)] mb-4 leading-relaxed">
        Ingestas Diarias Recomendadas (IDR) por grupo etario. Fuente: IOM 2006 + NOM-051-SSA.
      </p>

      {/* Cards seleccionables — scroll horizontal */}
      <div className="flex gap-2 overflow-x-auto pb-3 mb-5 no-scrollbar">
        {GRUPOS_IDR.map((g) => (
          <button
            key={g.key}
            onClick={() => setGrupoSeleccionado(g.key)}
            aria-pressed={grupoSeleccionado === g.key}
            style={{ minHeight: '44px', whiteSpace: 'nowrap' }}
            className={[
              'flex-shrink-0 px-3 py-2 rounded-xl text-xs font-semibold transition-all',
              grupoSeleccionado === g.key
                ? 'bg-[color:var(--color-primary)] text-white shadow-sm'
                : 'bg-[color:var(--color-surface)] text-[color:var(--color-text-secondary)] border border-[color:var(--color-border)] hover:border-[color:var(--color-primary)]',
            ].join(' ')}
          >
            {g.etiqueta}
          </button>
        ))}
      </div>

      {/* Descripción del grupo */}
      {typeof datosGrupo['descripcion'] === 'string' && (
        <p className="text-sm font-medium text-[color:var(--color-text-primary)] mb-3">
          {datosGrupo['descripcion'] as string}
        </p>
      )}

      <TarjetaTabla>
        <EncabezadoTabla cols={['Nutriente', 'Cantidad', 'Unidad / Fuente IOM']} />
        <tbody>
          {filas.map((fila, i) => (
            <FilaTabla
              key={i}
              celdas={[
                <span className="font-medium">{fila.nutriente}</span>,
                <code className="text-xs bg-[color:var(--color-bg)] px-1.5 py-0.5 rounded font-mono font-semibold">
                  {fila.valor}
                </code>,
                <span className="text-xs text-[color:var(--color-text-secondary)]">{fila.unidad}</span>,
              ]}
            />
          ))}
        </tbody>
      </TarjetaTabla>
    </div>
  )
}

// ─── Sección 3 — Medidas Caseras ─────────────────────────────────────────────

const MEDIDAS_ITEMS = extraerMedidas()

function SeccionMedidas() {
  const [busqueda, setBusqueda] = useState('')

  const filtradas = useMemo(() => {
    if (!busqueda) return MEDIDAS_ITEMS
    const q = busqueda.toLowerCase()
    return MEDIDAS_ITEMS.filter(
      (m) => m.medida.toLowerCase().includes(q) || m.categoria.toLowerCase().includes(q),
    )
  }, [busqueda])

  return (
    <div>
      <p className="text-sm text-[color:var(--color-text-secondary)] mb-4 leading-relaxed">
        Equivalencias en gramos de medidas caseras mexicanas. Fuente: SMAE 5ª ed. + UNAM.
      </p>

      <Buscador valor={busqueda} onChange={setBusqueda} placeholder="Buscar medida..." />

      <TarjetaTabla>
        <EncabezadoTabla cols={['Medida', 'Categoría', 'Peso (g)', 'Descripción']} />
        <tbody>
          {filtradas.length === 0 ? (
            <tr>
              <td colSpan={4} className="px-3 py-8 text-center text-sm text-[color:var(--color-text-tertiary)]">
                Sin resultados para "{busqueda}"
              </td>
            </tr>
          ) : (
            filtradas.map((m, i) => (
              <FilaTabla
                key={i}
                celdas={[
                  <span className="font-medium">{m.medida}</span>,
                  <span className="text-xs text-[color:var(--color-text-secondary)]">{m.categoria}</span>,
                  <code className="text-xs bg-[color:var(--color-bg)] px-1.5 py-0.5 rounded font-mono font-semibold">
                    {m.peso_g} g
                  </code>,
                  <span className="text-xs text-[color:var(--color-text-tertiary)] leading-tight">{m.referencia}</span>,
                ]}
              />
            ))
          )}
        </tbody>
      </TarjetaTabla>

      <p className="mt-3 text-[11px] text-[color:var(--color-text-tertiary)]">
        ⚠️ Las medidas caseras son aproximaciones. Pesar con báscula en uso clínico. Taza de referencia = 240 mL.
      </p>
    </div>
  )
}

// ─── Sección 4 — NAF y Estrés ────────────────────────────────────────────────

type NafFactores = typeof nafData['factores_actividad_fisica']

function SeccionNAF() {
  const factoresNAF = nafData.factores_actividad_fisica as NafFactores
  const factoresEstres = nafData.factores_estres_metabolico as unknown as Record<string, Record<string, unknown>>

  return (
    <div className="space-y-6">
      {/* NAF */}
      <div>
        <h3 className="text-base font-semibold text-[color:var(--color-text-primary)] mb-1">
          Factores de Nivel de Actividad Física (NAF)
        </h3>
        <p className="text-xs text-[color:var(--color-text-secondary)] mb-3">
          GET = TMB × NAF + ETA (ETA = GET × 0.10). Fuente: OMS 1985 + IOM 2005.
        </p>
        <TarjetaTabla>
          <EncabezadoTabla cols={['Nivel', 'NAF', 'Rango', 'Descripción', 'Ejemplo clínico']} />
          <tbody>
            {Object.entries(factoresNAF).map(([nivel, datos]) => (
              <FilaTabla
                key={nivel}
                celdas={[
                  <span className="font-semibold capitalize">{nivel.replace('_', ' ')}</span>,
                  <code className="text-sm font-mono font-bold text-[color:var(--color-primary)]">
                    {datos.naf}
                  </code>,
                  <span className="text-xs text-[color:var(--color-text-secondary)]">{datos.rango_tipico}</span>,
                  <span className="text-xs leading-tight">{datos.descripcion}</span>,
                  <span className="text-xs text-[color:var(--color-text-tertiary)] leading-tight">{datos.ejemplo_paciente}</span>,
                ]}
              />
            ))}
          </tbody>
        </TarjetaTabla>
      </div>

      {/* Estrés metabólico */}
      <div>
        <h3 className="text-base font-semibold text-[color:var(--color-text-primary)] mb-1">
          Factores de Estrés Metabólico
        </h3>
        <p className="text-xs text-[color:var(--color-text-secondary)] mb-3">
          GET_estresado = (TMB × NAF) + (TMB × factor_estrés). Fuente: ASPEN 2016 + ACCP Guidelines.
        </p>
        <TarjetaTabla>
          <EncabezadoTabla cols={['Condición', 'Factor', 'Descripción', 'Duración']} />
          <tbody>
            {Object.entries(factoresEstres)
              .filter(([k]) => !k.startsWith('_'))
              .map(([condicion, datos]) => {
                const factor =
                  datos['factor'] !== undefined
                    ? String(datos['factor'])
                    : `${datos['factor_min']} – ${datos['factor_max']}`
                return (
                  <FilaTabla
                    key={condicion}
                    celdas={[
                      <span className="font-medium capitalize">{condicion.replace(/_/g, ' ')}</span>,
                      <code className="text-xs font-mono font-bold text-[color:var(--color-danger)]">{factor}</code>,
                      <span className="text-xs leading-tight">{String(datos['descripcion'] ?? '')}</span>,
                      <span className="text-xs text-[color:var(--color-text-tertiary)]">{String(datos['duracion_efecto'] ?? '')}</span>,
                    ]}
                  />
                )
              })}
          </tbody>
        </TarjetaTabla>
      </div>
    </div>
  )
}

// ─── Sección 5 — Fórmulas Clínicas ───────────────────────────────────────────

function SeccionFormulas() {
  const [busqueda, setBusqueda] = useState('')

  const filtradas = useMemo(() => {
    if (!busqueda) return FORMULAS_CLINICAS
    const q = busqueda.toLowerCase()
    return FORMULAS_CLINICAS.filter(
      (f) => f.nombre.toLowerCase().includes(q) || f.uso.toLowerCase().includes(q),
    )
  }, [busqueda])

  return (
    <div>
      <p className="text-sm text-[color:var(--color-text-secondary)] mb-4 leading-relaxed">
        Todas las fórmulas implementadas en NUTRIA con su fuente bibliográfica APA.
      </p>

      <Buscador valor={busqueda} onChange={setBusqueda} placeholder="Buscar fórmula..." />

      <div className="space-y-3">
        {filtradas.length === 0 ? (
          <div className="text-center py-8 text-sm text-[color:var(--color-text-tertiary)]">
            Sin resultados para "{busqueda}"
          </div>
        ) : (
          filtradas.map((f, i) => (
            <div
              key={i}
              className="rounded-2xl p-4"
              style={{
                background: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                boxShadow: 'var(--shadow)',
              }}
            >
              <div className="flex items-start justify-between gap-3 mb-2">
                <h3 className="text-sm font-semibold text-[color:var(--color-text-primary)]">{f.nombre}</h3>
                <span
                  className="text-[10px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0"
                  style={{ background: 'var(--color-bg)', color: 'var(--color-text-tertiary)' }}
                >
                  {f.uso.split(' ')[0]}
                </span>
              </div>
              <pre
                className="text-xs font-mono leading-relaxed mb-3 p-3 rounded-xl whitespace-pre-wrap"
                style={{ background: 'var(--color-bg)', color: 'var(--color-text-primary)' }}
              >
                {f.ecuacion}
              </pre>
              <p className="text-xs text-[color:var(--color-text-secondary)] mb-1">{f.uso}</p>
              <p className="text-[11px] text-[color:var(--color-text-tertiary)] italic">{f.fuente}</p>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function References() {
  const [tabActiva, setTabActiva] = useState<TabId>('laboratorio')

  return (
    <div className="max-w-5xl mx-auto px-4 pt-6 pb-8 md:px-6 md:pt-8">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center text-white"
            style={{ background: 'var(--color-primary)' }}
          >
            <BookOpen size={20} />
          </div>
          <div>
            <h1 className="text-[22px] font-semibold text-[color:var(--color-text-primary)]">
              Referencias Clínicas
            </h1>
            <p className="text-xs text-[color:var(--color-text-tertiary)]">
              Consulta rápida offline — laboratorio, IDR, medidas y fórmulas
            </p>
          </div>
        </div>
      </div>

      {/* Tabs horizontales */}
      <div
        className="flex gap-1 overflow-x-auto pb-1 mb-6 no-scrollbar"
        role="tablist"
        aria-label="Secciones de referencia"
      >
        {TABS.map((tab) => (
          <button
            key={tab.id}
            role="tab"
            aria-selected={tabActiva === tab.id}
            onClick={() => setTabActiva(tab.id)}
            style={{ minHeight: '44px', whiteSpace: 'nowrap' }}
            className={[
              'flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold transition-all flex-shrink-0',
              tabActiva === tab.id
                ? 'bg-[color:var(--color-primary)] text-white shadow-sm'
                : 'bg-[color:var(--color-surface)] text-[color:var(--color-text-secondary)] border border-[color:var(--color-border)] hover:border-[color:var(--color-primary)]',
            ].join(' ')}
          >
            {tab.icono}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Contenido de la tab activa */}
      <div role="tabpanel">
        {tabActiva === 'laboratorio' && <SeccionLaboratorio />}
        {tabActiva === 'idr'         && <SeccionIDR />}
        {tabActiva === 'medidas'     && <SeccionMedidas />}
        {tabActiva === 'naf'         && <SeccionNAF />}
        {tabActiva === 'formulas'    && <SeccionFormulas />}
      </div>
    </div>
  )
}