/**
 * Settings.tsx — Ajustes de la Aplicación NUTRIA
 *
 * Secciones:
 *   1. Preferencias de cálculo  → persiste en localStorage key:'nutria_settings'
 *   2. Sobre NUTRIA             → versión, stack, licencia
 *   3. Datos locales            → info + limpiar con confirmación inline
 *   4. Fuentes bibliográficas   → lista APA de todas las referencias
 *
 * Reglas:
 *   - Sin modales — confirmaciones inline
 *   - Sin dropdowns — toggles / cards seleccionables
 *   - TypeScript strict — cero any
 *   - Touch targets ≥ 44×44px
 */

import { useState, useEffect } from 'react'
import {
  Settings as SettingsIcon,
  Cpu,
  Info,
  HardDrive,
  BookMarked,
  ChevronRight,
  Check,
  AlertTriangle,
  ExternalLink,
} from 'lucide-react'

import { db } from '../db/schema'

// ─── Tipos ────────────────────────────────────────────────────────────────────

type FormulaDefault = 'mifflin' | 'harris_benedict' | 'valencia' | 'katch' | 'cunningham' | 'schofield'
type NafDefault = 'sedentario' | 'ligero' | 'moderado' | 'intenso' | 'muy_intenso'
type Unidades = 'metrico' | 'imperial'

interface NutriaSettings {
  formula_tmb: FormulaDefault
  naf_default: NafDefault
  unidades: Unidades
}

const SETTINGS_KEY = 'nutria_settings'

const SETTINGS_DEFAULT: NutriaSettings = {
  formula_tmb: 'mifflin',
  naf_default: 'moderado',
  unidades: 'metrico',
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function leerSettings(): NutriaSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY)
    if (!raw) return SETTINGS_DEFAULT
    return { ...SETTINGS_DEFAULT, ...(JSON.parse(raw) as Partial<NutriaSettings>) }
  } catch {
    return SETTINGS_DEFAULT
  }
}

function guardarSettings(s: NutriaSettings): void {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(s))
}

// ─── Datos de configuración ───────────────────────────────────────────────────

const FORMULAS_OPTIONS: { value: FormulaDefault; label: string; descripcion: string }[] = [
  { value: 'mifflin',         label: 'Mifflin-St Jeor',    descripcion: 'Estándar actual — población general' },
  { value: 'harris_benedict', label: 'Harris-Benedict',    descripcion: 'Revisada Roza & Shizgal — hospitalaria' },
  { value: 'valencia',        label: 'Valencia',           descripcion: 'Validada en población mexicana (INNSZ)' },
  { value: 'katch',           label: 'Katch-McArdle',      descripcion: 'Atletas — requiere masa magra' },
  { value: 'cunningham',      label: 'Cunningham',         descripcion: 'Alta masa muscular' },
  { value: 'schofield',       label: 'Schofield (OMS)',    descripcion: 'Pediatría y adolescentes' },
]

const NAF_OPTIONS: { value: NafDefault; label: string; factor: number }[] = [
  { value: 'sedentario',   label: 'Sedentario',   factor: 1.20 },
  { value: 'ligero',       label: 'Ligero',        factor: 1.375 },
  { value: 'moderado',     label: 'Moderado',      factor: 1.55 },
  { value: 'intenso',      label: 'Intenso',       factor: 1.725 },
  { value: 'muy_intenso',  label: 'Muy intenso',   factor: 1.90 },
]

const UNIDADES_OPTIONS: { value: Unidades; label: string; descripcion: string }[] = [
  { value: 'metrico',  label: 'Métrico',  descripcion: 'kg, cm, kcal' },
  { value: 'imperial', label: 'Imperial', descripcion: 'lb, ft, kcal (placeholder)' },
]

const FUENTES_APA: string[] = [
  'Mifflin MD, St Jeor ST, Hill LA, et al. (1990). A new predictive equation for resting energy expenditure in healthy individuals. Am J Clin Nutr, 51(2):241-247.',
  'Roza AM, Shizgal HM. (1984). The Harris Benedict equation reevaluated: resting energy requirements and the body cell mass. Am J Clin Nutr, 40(1):168-182.',
  'Valencia ME, et al. Tasa metabólica basal en población mexicana. Instituto Nacional de Ciencias Médicas y Nutrición Salvador Zubirán (INNSZ). México.',
  'McArdle WD, Katch FI, Katch VL. (2015). Exercise Physiology: Nutrition, Energy, and Human Performance. 8th ed. Lippincott Williams & Wilkins.',
  'Cunningham JJ. (1980). A reanalysis of the factors influencing basal metabolic rate in normal adults. Am J Clin Nutr, 33(11):2372-2374.',
  'Schofield WN. (1985). Predicting basal metabolic rate, new standards and review of previous work. Human Nutrition: Clinical Nutrition, 39C(Suppl 1):5-41.',
  'Jackson AS, Pollock ML. (1978). Generalized equations for predicting body density of men. Br J Nutr, 40(3):497-504.',
  'Siri WE. (1956). The gross composition of the body. Advances in Biological and Medical Physics, 4:239-280.',
  'Faulkner JA. (1968). Physiology of swimming and diving. En: Falls H (ed). Exercise Physiology. Academic Press.',
  'Frisancho AR. (1981). New norms of upper limb fat and muscle areas for assessment of nutritional status. Am J Clin Nutr, 34(11):2540-2545.',
  'Hamwi GJ. (1964). Therapy: Changing dietary concepts. En: Danowski TS (ed). Diabetes Mellitus: Diagnosis and Treatment. American Diabetes Association, 73-78.',
  'Matthews DR, Hosker JP, Rudenski AS, et al. (1985). Homeostasis model assessment: insulin resistance and β-cell function from fasting plasma glucose and insulin concentrations in man. Diabetologia, 28(7):412-419.',
  'Inker LA, Eneanya ND, Coresh J, et al. (2021). New Creatinine- and Cystatin C-Based Equations to Estimate GFR without Race. NEJM, 385:1737-1749.',
  'Ainsworth BE, Haskell WL, Herrmann SD, et al. (2011). Compendium of Physical Activities: a second update of codes and MET values. Med Sci Sports Exerc, 43(8):1575-1581.',
  'World Health Organization. (1985). Energy and Protein Requirements. Technical Report Series 724. WHO, Geneva.',
  'Institute of Medicine. (2005). Dietary Reference Intakes for Energy, Carbohydrate, Fiber, Fat, Fatty Acids, Cholesterol, Protein, and Amino Acids. National Academies Press.',
  'American Society for Parenteral and Enteral Nutrition (ASPEN). (2016). Clinical Guidelines for the Use of Parenteral and Enteral Nutrition in Adult and Pediatric Patients.',
  'American Diabetes Association. (2024). Standards of Medical Care in Diabetes. Diabetes Care, 47(Suppl 1).',
  'Kasper DL, et al. (2022). Harrison\'s Principles of Internal Medicine. 21st ed. McGraw-Hill.',
  'Pérez Lizaur AB, Palacios González B, Castro Becerra AL. (2014). SMAE 5ª edición: Sistema Mexicano de Alimentos Equivalentes. Fomento de Nutrición y Salud A.C.',
]

const STACK_INFO = [
  { label: 'Frontend',     valor: 'React 18 + TypeScript 5 (strict)' },
  { label: 'Build',        valor: 'Vite 5' },
  { label: 'Estilos',      valor: 'Tailwind CSS 3 + shadcn/ui' },
  { label: 'Estado',       valor: 'Zustand 4' },
  { label: 'Base de datos',valor: 'Dexie.js (IndexedDB)' },
  { label: 'PWA',          valor: 'Workbox + vite-plugin-pwa' },
]

// ─── Sub-componentes ──────────────────────────────────────────────────────────

/** Encabezado de sección */
function SeccionHeader({
  icono,
  titulo,
  descripcion,
}: {
  icono: React.ReactNode
  titulo: string
  descripcion?: string
}) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <div
        className="w-9 h-9 rounded-xl flex items-center justify-center text-[color:var(--color-primary)] flex-shrink-0"
        style={{ background: '#EBF5FF' }}
      >
        {icono}
      </div>
      <div>
        <h2 className="text-base font-semibold text-[color:var(--color-text-primary)]">{titulo}</h2>
        {descripcion && (
          <p className="text-xs text-[color:var(--color-text-tertiary)]">{descripcion}</p>
        )}
      </div>
    </div>
  )
}

/** Tarjeta de sección */
function SeccionCard({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="rounded-2xl p-5 mb-6"
      style={{
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        boxShadow: 'var(--shadow)',
      }}
    >
      {children}
    </div>
  )
}

/** Card seleccionable genérica */
function CardOpcion({
  seleccionada,
  onClick,
  children,
}: {
  seleccionada: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      style={{ minHeight: '44px' }}
      className={[
        'w-full text-left px-4 py-3 rounded-xl transition-all flex items-center justify-between gap-3',
        seleccionada
          ? 'bg-blue-50 border-2 border-[color:var(--color-primary)]'
          : 'border border-[color:var(--color-border)] hover:border-[color:var(--color-primary)] hover:bg-[color:var(--color-bg)]',
      ].join(' ')}
    >
      {children}
      {seleccionada && (
        <Check size={16} className="text-[color:var(--color-primary)] flex-shrink-0" aria-hidden />
      )}
    </button>
  )
}

/** Indicador de guardado */
function ChipGuardado({ visible }: { visible: boolean }) {
  return (
    <div
      className={[
        'flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition-all duration-300',
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-1',
      ].join(' ')}
      style={{ background: '#EDFAED', color: 'var(--color-success)' }}
      aria-live="polite"
    >
      <Check size={12} />
      Guardado
    </div>
  )
}

// ─── Sección 1 — Preferencias de Cálculo ─────────────────────────────────────

function SeccionPreferencias({
  settings,
  onUpdate,
  guardado,
}: {
  settings: NutriaSettings
  onUpdate: (s: NutriaSettings) => void
  guardado: boolean
}) {
  return (
    <SeccionCard>
      <div className="flex items-start justify-between mb-4">
        <SeccionHeader
          icono={<Cpu size={18} />}
          titulo="Preferencias de Cálculo"
          descripcion="Fórmulas y parámetros por defecto al abrir la calculadora"
        />
        <ChipGuardado visible={guardado} />
      </div>

      {/* Fórmula TMB */}
      <div className="mb-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-[color:var(--color-text-tertiary)] mb-2">
          Fórmula TMB por defecto
        </p>
        <div className="space-y-2">
          {FORMULAS_OPTIONS.map((opt) => (
            <CardOpcion
              key={opt.value}
              seleccionada={settings.formula_tmb === opt.value}
              onClick={() => onUpdate({ ...settings, formula_tmb: opt.value })}
            >
              <div>
                <p className="text-sm font-semibold text-[color:var(--color-text-primary)]">{opt.label}</p>
                <p className="text-xs text-[color:var(--color-text-secondary)] mt-0.5">{opt.descripcion}</p>
              </div>
            </CardOpcion>
          ))}
        </div>
      </div>

      {/* NAF por defecto */}
      <div className="mb-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-[color:var(--color-text-tertiary)] mb-2">
          NAF por defecto
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {NAF_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => onUpdate({ ...settings, naf_default: opt.value })}
              style={{ minHeight: '56px' }}
              className={[
                'flex flex-col items-center justify-center px-3 py-2 rounded-xl transition-all text-center',
                settings.naf_default === opt.value
                  ? 'bg-blue-50 border-2 border-[color:var(--color-primary)]'
                  : 'border border-[color:var(--color-border)] hover:border-[color:var(--color-primary)] hover:bg-[color:var(--color-bg)]',
              ].join(' ')}
            >
              <span
                className={[
                  'text-base font-bold font-mono',
                  settings.naf_default === opt.value
                    ? 'text-[color:var(--color-primary)]'
                    : 'text-[color:var(--color-text-primary)]',
                ].join(' ')}
              >
                {opt.factor}
              </span>
              <span className="text-[11px] text-[color:var(--color-text-secondary)] mt-0.5">{opt.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Unidades */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-[color:var(--color-text-tertiary)] mb-2">
          Sistema de Unidades
        </p>
        <div className="grid grid-cols-2 gap-2">
          {UNIDADES_OPTIONS.map((opt) => (
            <CardOpcion
              key={opt.value}
              seleccionada={settings.unidades === opt.value}
              onClick={() => onUpdate({ ...settings, unidades: opt.value })}
            >
              <div>
                <p className="text-sm font-semibold text-[color:var(--color-text-primary)]">{opt.label}</p>
                <p className="text-xs text-[color:var(--color-text-secondary)]">{opt.descripcion}</p>
              </div>
            </CardOpcion>
          ))}
        </div>
        {settings.unidades === 'imperial' && (
          <p className="mt-2 text-[11px] text-[color:var(--color-text-tertiary)]">
            ⚠️ Soporte imperial es placeholder — la conversión se implementa en Fase 2.
          </p>
        )}
      </div>
    </SeccionCard>
  )
}

// ─── Sección 2 — Sobre NUTRIA ─────────────────────────────────────────────────

function SeccionSobre() {
  return (
    <SeccionCard>
      <SeccionHeader
        icono={<Info size={18} />}
        titulo="Sobre NUTRIA"
        descripcion="Herramientas clínicas open source para estudiantes de nutrición"
      />

      {/* Badge de versión */}
      <div className="flex items-center gap-3 mb-5">
        <div
          className="w-12 h-12 rounded-2xl flex items-center justify-center text-white text-lg font-bold shadow-sm flex-shrink-0"
          style={{ background: 'var(--color-primary)' }}
        >
          N
        </div>
        <div>
          <p className="font-semibold text-[color:var(--color-text-primary)]">NUTRIA</p>
          <div className="flex items-center gap-2 mt-0.5">
            <span
              className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
              style={{ background: 'var(--color-bg)', color: 'var(--color-text-tertiary)' }}
            >
              v0.1.0
            </span>
            <span
              className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
              style={{ background: '#EDFAED', color: 'var(--color-success)' }}
            >
              MIT License
            </span>
          </div>
        </div>
      </div>

      {/* Stack */}
      <div className="mb-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-[color:var(--color-text-tertiary)] mb-2">
          Stack tecnológico
        </p>
        <div className="space-y-1.5">
          {STACK_INFO.map(({ label, valor }) => (
            <div key={label} className="flex items-center justify-between py-1">
              <span className="text-sm text-[color:var(--color-text-secondary)]">{label}</span>
              <span className="text-xs font-mono text-[color:var(--color-text-primary)] bg-[color:var(--color-bg)] px-2 py-0.5 rounded">
                {valor}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* GitHub link */}
      <a
        href="https://github.com/dnnnah/nutria"
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center justify-between px-4 py-3 rounded-xl transition-colors group"
        style={{
          border: '1px solid var(--color-border)',
          minHeight: '44px',
        }}
      >
        <div className="flex items-center gap-2.5">
          <ExternalLink size={16} className="text-[color:var(--color-text-secondary)]" />
          <span className="text-sm text-[color:var(--color-text-primary)]">
            github.com/dnnnah/nutria
          </span>
        </div>
        <ChevronRight size={14} className="text-[color:var(--color-text-tertiary)] group-hover:text-[color:var(--color-primary)] transition-colors" />
      </a>
    </SeccionCard>
  )
}

// ─── Sección 3 — Datos Locales ────────────────────────────────────────────────

function SeccionDatos() {
  const [confirmando, setConfirmando] = useState(false)
  const [limpiando, setLimpiando] = useState(false)

  const limpiarDatos = async () => {
    setLimpiando(true)
    try {
      await db.delete()
      localStorage.removeItem(SETTINGS_KEY)
      window.location.reload()
    } catch (err) {
      console.error('Error al limpiar datos:', err)
      setLimpiando(false)
      setConfirmando(false)
    }
  }

  return (
    <SeccionCard>
      <SeccionHeader
        icono={<HardDrive size={18} />}
        titulo="Datos Locales"
        descripcion="IndexedDB en este dispositivo — sin sincronización en la nube (Fase 2)"
      />

      {/* Info card */}
      <div
        className="flex items-center gap-3 p-3 rounded-xl mb-4"
        style={{ background: 'var(--color-bg)' }}
      >
        <HardDrive size={18} className="text-[color:var(--color-text-tertiary)] flex-shrink-0" />
        <div>
          <p className="text-sm text-[color:var(--color-text-primary)] font-medium">
            Almacenamiento local
          </p>
          <p className="text-xs text-[color:var(--color-text-secondary)] mt-0.5">
            Tus datos se almacenan localmente en este dispositivo mediante IndexedDB. No se envía información a ningún servidor.
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between py-2 mb-4">
        <span className="text-sm text-[color:var(--color-text-secondary)]">Tamaño estimado</span>
        <span
          className="text-xs font-mono font-semibold px-2 py-0.5 rounded"
          style={{ background: 'var(--color-bg)', color: 'var(--color-text-primary)' }}
        >
          &lt; 1 MB
        </span>
      </div>

      {/* Confirmación inline — sin modal */}
      {!confirmando ? (
        <button
          onClick={() => setConfirmando(true)}
          style={{ minHeight: '44px' }}
          className="w-full px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors border border-[color:var(--color-danger)] text-[color:var(--color-danger)] hover:bg-red-50"
        >
          Limpiar datos locales
        </button>
      ) : (
        <div
          className="rounded-xl p-4"
          style={{ background: '#FFF5F5', border: '1px solid #FFD5D5' }}
        >
          <div className="flex items-start gap-2.5 mb-4">
            <AlertTriangle size={18} className="text-[color:var(--color-danger)] flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-[color:var(--color-text-primary)] mb-1">
                ¿Eliminar todos los datos?
              </p>
              <p className="text-xs text-[color:var(--color-text-secondary)] leading-relaxed">
                Se eliminarán todos los pacientes, planes y configuraciones guardadas en este dispositivo. Esta acción no se puede deshacer.
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setConfirmando(false)}
              disabled={limpiando}
              style={{ minHeight: '44px' }}
              className="flex-1 px-4 py-2 rounded-xl text-sm font-semibold border border-[color:var(--color-border)] text-[color:var(--color-text-secondary)] hover:bg-white transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              onClick={limpiarDatos}
              disabled={limpiando}
              className="flex-1 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-colors disabled:opacity-70"
              style={{ background: 'var(--color-danger)', minHeight: '44px' }}
            >
              {limpiando ? 'Limpiando...' : 'Sí, eliminar todo'}
            </button>
          </div>
        </div>
      )}
    </SeccionCard>
  )
}

// ─── Sección 4 — Fuentes Bibliográficas ──────────────────────────────────────

function SeccionFuentes() {
  return (
    <SeccionCard>
      <SeccionHeader
        icono={<BookMarked size={18} />}
        titulo="Fuentes Bibliográficas"
        descripcion="Referencias APA de todas las fórmulas implementadas en NUTRIA"
      />

      <ol className="space-y-3">
        {FUENTES_APA.map((fuente, i) => (
          <li key={i} className="flex gap-3">
            <span
              className="text-[11px] font-bold text-[color:var(--color-primary)] mt-0.5 flex-shrink-0 w-5 text-right"
            >
              {i + 1}.
            </span>
            <p className="text-xs text-[color:var(--color-text-secondary)] leading-relaxed">{fuente}</p>
          </li>
        ))}
      </ol>
    </SeccionCard>
  )
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function Settings() {
  const [settings, setSettings] = useState<NutriaSettings>(leerSettings)
  const [guardadoVisible, setGuardadoVisible] = useState(false)

  // Guardar en localStorage al cambiar settings
  useEffect(() => {
    guardarSettings(settings)
    setGuardadoVisible(true)
    const timer = setTimeout(() => setGuardadoVisible(false), 2000)
    return () => clearTimeout(timer)
  }, [settings])

  return (
    <div className="max-w-2xl mx-auto px-4 pt-6 pb-8 md:px-6 md:pt-8">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center text-white"
            style={{ background: 'var(--color-primary)' }}
          >
            <SettingsIcon size={20} />
          </div>
          <h1 className="text-[22px] font-semibold text-[color:var(--color-text-primary)]">
            Ajustes
          </h1>
        </div>
        <p className="text-sm text-[color:var(--color-text-secondary)] ml-[52px]">
          Preferencias de fórmulas, datos locales y referencias del proyecto.
        </p>
      </div>

      <SeccionPreferencias
        settings={settings}
        onUpdate={setSettings}
        guardado={guardadoVisible}
      />
      <SeccionSobre />
      <SeccionDatos />
      <SeccionFuentes />
    </div>
  )
}