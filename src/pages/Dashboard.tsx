/**
 * Dashboard.tsx — Pantalla de inicio de NUTRIA
 *
 * Secciones:
 *   1. Hero Card azul — acceso rápido a GET/TMB
 *   2. Grid de herramientas — Evaluación y Planificación
 *   3. Lista de recientes (3 items placeholder)
 *
 * Mobile-first (390px base → md:768px → xl:1280px)
 * Tokens CSS del proyecto Apple HIG.
 */

import { Link } from 'react-router-dom'
import {
  Calculator,
  Ruler,
  FlaskConical,
  Zap,
  LayoutGrid,
  CheckCircle,
  BookOpen,
  ChevronRight,
  Clock,

  TrendingUp,
  ArrowRight,
} from 'lucide-react'

// ─── Tipos locales ────────────────────────────────────────────────────────────

interface HerramientaCard {
  label: string
  descripcion: string
  ruta: string
  icono: React.ReactNode
  color_bg: string
  color_icono: string
}

interface ItemReciente {
  nombre_paciente: string
  accion: string
  hace_tiempo: string
  inicial: string
}

// ─── Datos de configuración ───────────────────────────────────────────────────

const HERRAMIENTAS_EVALUACION: HerramientaCard[] = [
  {
    label: 'GET / TMB',
    descripcion: 'Gasto energético total',
    ruta: '/calculadora',
    icono: <Calculator size={20} />,
    color_bg: 'bg-blue-50',
    color_icono: 'text-blue-600',
  },
  {
    label: 'Antropometría',
    descripcion: 'IMC, pliegues, composición',
    ruta: '/antropometria',
    icono: <Ruler size={20} />,
    color_bg: 'bg-purple-50',
    color_icono: 'text-purple-600',
  },
  {
    label: 'Laboratorios',
    descripcion: 'Glucosa, lípidos, bioquímica',
    ruta: '/laboratorios',
    icono: <FlaskConical size={20} />,
    color_bg: 'bg-emerald-50',
    color_icono: 'text-emerald-600',
  },
  {
    label: 'METs',
    descripcion: 'Gasto por actividad física',
    ruta: '/mets',
    icono: <Zap size={20} />,
    color_bg: 'bg-amber-50',
    color_icono: 'text-amber-600',
  },
]

const HERRAMIENTAS_PLANIFICACION: HerramientaCard[] = [
  {
    label: 'Planeador SMAE',
    descripcion: 'Distribución de equivalentes',
    ruta: '/planeador',
    icono: <LayoutGrid size={20} />,
    color_bg: 'bg-teal-50',
    color_icono: 'text-teal-600',
  },
  {
    label: 'Adecuación',
    descripcion: 'Semáforo de cumplimiento',
    ruta: '/adecuacion',
    icono: <CheckCircle size={20} />,
    color_bg: 'bg-green-50',
    color_icono: 'text-green-600',
  },
]

const RECIENTES_PLACEHOLDER: ItemReciente[] = [
  {
    nombre_paciente: 'María G.',
    accion: 'Plan SMAE actualizado',
    hace_tiempo: 'Hace 20 min',
    inicial: 'M',
  },
  {
    nombre_paciente: 'Juan R.',
    accion: 'GET calculado — 2340 kcal',
    hace_tiempo: 'Hace 1 hora',
    inicial: 'C',
  },
  {
    nombre_paciente: 'Laura V.',
    accion: 'Laboratorios registrados',
    hace_tiempo: 'Ayer',
    inicial: 'L',
  },
]

// ─── Sub-componentes ──────────────────────────────────────────────────────────

function CardHerramienta({ herramienta }: { herramienta: HerramientaCard }) {
  return (
    <Link
      to={herramienta.ruta}
      className="flex items-start gap-3 p-4 rounded-xl bg-white border border-[color:var(--color-border)] hover:border-blue-200 hover:shadow-sm transition-all duration-150 group min-h-[44px]"
    >
      <div
        className={`flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center ${herramienta.color_bg} ${herramienta.color_icono} transition-transform duration-150 group-hover:scale-105`}
      >
        {herramienta.icono}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-[color:var(--color-text-primary)] leading-tight">
          {herramienta.label}
        </p>
        <p className="text-xs text-[color:var(--color-text-tertiary)] mt-0.5 leading-tight">
          {herramienta.descripcion}
        </p>
      </div>
      <ChevronRight
        size={14}
        className="flex-shrink-0 mt-1 text-[color:var(--color-text-tertiary)] opacity-0 group-hover:opacity-100 transition-opacity"
      />
    </Link>
  )
}

function ItemRecienteRow({ item }: { item: ItemReciente }) {
  // Colores del avatar por inicial — determinista
  const colores = ['bg-blue-100 text-blue-700', 'bg-purple-100 text-purple-700', 'bg-teal-100 text-teal-700']
  const idx = item.inicial.charCodeAt(0) % colores.length

  return (
    <li className="flex items-center gap-3 py-3 px-1">
      {/* Avatar */}
      <div
        className={`flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold ${colores[idx]}`}
      >
        {item.inicial}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-[color:var(--color-text-primary)] leading-tight">
          {item.nombre_paciente}
        </p>
        <p className="text-xs text-[color:var(--color-text-secondary)] mt-0.5 truncate">
          {item.accion}
        </p>
      </div>

      {/* Tiempo */}
      <span className="flex-shrink-0 text-xs text-[color:var(--color-text-tertiary)] whitespace-nowrap">
        {item.hace_tiempo}
      </span>
    </li>
  )
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function Dashboard() {
  return (
    <div className="max-w-2xl mx-auto px-4 pt-6 pb-4 md:px-6 md:pt-8 xl:max-w-3xl">

      {/* ── Saludo ── */}
      <div className="mb-6">
        <h1 className="text-[22px] font-semibold text-[color:var(--color-text-primary)] leading-tight">
          Bienvenida a NUTRIA
        </h1>
        <p className="text-sm text-[color:var(--color-text-secondary)] mt-1">
          Tu herramienta clínica de prescripción dietética
        </p>
      </div>

      {/* ── Hero Card GET/TMB ── */}
      <Link
        to="/calculadora"
        className="block mb-6 rounded-2xl overflow-hidden relative group"
        style={{ background: 'var(--color-primary)' }}
      >
        {/* Círculos decorativos de fondo */}
        <div
          className="absolute -top-8 -right-8 w-40 h-40 rounded-full opacity-20"
          style={{ background: 'rgba(255,255,255,0.3)' }}
        />
        <div
          className="absolute -bottom-4 -right-4 w-24 h-24 rounded-full opacity-10"
          style={{ background: 'rgba(255,255,255,0.4)' }}
        />

        <div className="relative p-5">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
                  <TrendingUp size={16} className="text-white" />
                </div>
                <span className="text-xs font-semibold text-white/80 uppercase tracking-wider">
                  Herramienta principal
                </span>
              </div>
              <h2 className="text-xl font-bold text-white leading-tight mb-1">
                Calculadora GET / TMB
              </h2>
              <p className="text-sm text-white/75 leading-relaxed">
                Mifflin-St Jeor · Harris-Benedict · Valencia MX
              </p>
            </div>

            <div className="flex-shrink-0 mt-1">
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center group-hover:bg-white/30 transition-colors">
                <ArrowRight size={18} className="text-white" />
              </div>
            </div>
          </div>

          {/* Mini-stats */}
          <div className="flex gap-3 mt-4">
            {['5 fórmulas', 'NAF incluido', 'ETA automático'].map((tag) => (
              <span
                key={tag}
                className="text-[11px] font-medium text-white/80 bg-white/15 px-2.5 py-1 rounded-full"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      </Link>

      {/* ── Grid Evaluación ── */}
      <section className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-[13px] font-semibold text-[color:var(--color-text-secondary)] uppercase tracking-wider">
            Evaluación
          </h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {HERRAMIENTAS_EVALUACION.map((h) => (
            <CardHerramienta key={h.ruta} herramienta={h} />
          ))}
        </div>
      </section>

      {/* ── Grid Planificación ── */}
      <section className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-[13px] font-semibold text-[color:var(--color-text-secondary)] uppercase tracking-wider">
            Planificación
          </h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {HERRAMIENTAS_PLANIFICACION.map((h) => (
            <CardHerramienta key={h.ruta} herramienta={h} />
          ))}
        </div>
      </section>

      {/* ── Acceso a Referencias ── */}
      <Link
        to="/referencias"
        className="flex items-center gap-3 p-4 mb-6 rounded-xl border border-dashed border-[color:var(--color-border)] hover:border-blue-300 hover:bg-blue-50/50 transition-all duration-150 group"
      >
        <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500 group-hover:bg-blue-100 group-hover:text-blue-600 transition-colors">
          <BookOpen size={18} />
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium text-[color:var(--color-text-primary)]">
            Referencias clínicas
          </p>
          <p className="text-xs text-[color:var(--color-text-tertiary)]">
            IDR · Rangos laboratorio · METs · Medidas caseras
          </p>
        </div>
        <ChevronRight size={14} className="text-[color:var(--color-text-tertiary)] group-hover:text-blue-500 transition-colors" />
      </Link>

      {/* ── Recientes ── */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-[13px] font-semibold text-[color:var(--color-text-secondary)] uppercase tracking-wider flex items-center gap-1.5">
            <Clock size={12} />
            Recientes
          </h2>
          <Link
            to="/recientes"
            className="text-xs font-medium text-[color:var(--color-primary)] hover:opacity-70 transition-opacity"
          >
            Ver todo
          </Link>
        </div>

        <div className="bg-white rounded-xl border border-[color:var(--color-border)] divide-y divide-[color:var(--color-border)] px-3">
          {RECIENTES_PLACEHOLDER.map((item, idx) => (
            <ItemRecienteRow key={idx} item={item} />
          ))}
        </div>

        <p className="text-center text-[11px] text-[color:var(--color-text-tertiary)] mt-3">
          Datos de ejemplo — los registros reales aparecerán aquí
        </p>
      </section>

      {/* Espacio extra para tab bar mobile */}
      <div className="h-4" />
    </div>
  )
}