/**
 * Adequacy.tsx — Evaluación de 24 horas
 * Proyecto NUTRIA — Open Source
 *
 * Herramienta independiente: compara cualquier registro de consumo
 * contra una prescripción dietética mediante inputs manuales.
 *
 * Inputs (dos columnas — Prescrito / Consumido):
 *   Energía, Proteína, Lípidos, HC, Fibra  [obligatorios]
 *   Hierro, Calcio, Folato                  [opcionales]
 *
 * @source Gibson RS. Principles of Nutritional Assessment. 2nd ed. 2005.
 */

import { useState, useMemo } from 'react'
import { ClipboardList } from 'lucide-react'
import SemaforoAdecuacion from '../components/shared/SemaforoAdecuacion'
import type { AdecuacionDiaria, NutrienteRowData } from '../types/adequacy.types'

// ─── Tipos con claves exactas (evita undefined en acceso dinámico) ─────────────

interface ValoresForm {
  energia_prescrito:  string
  energia_consumido:  string
  proteina_prescrito: string
  proteina_consumido: string
  lipidos_prescrito:  string
  lipidos_consumido:  string
  hc_prescrito:       string
  hc_consumido:       string
  fibra_prescrito:    string
  fibra_consumido:    string
  hierro_prescrito:   string
  hierro_consumido:   string
  calcio_prescrito:   string
  calcio_consumido:   string
  folato_prescrito:   string
  folato_consumido:   string
}

const ESTADO_INICIAL: ValoresForm = {
  energia_prescrito:  '', energia_consumido:  '',
  proteina_prescrito: '', proteina_consumido: '',
  lipidos_prescrito:  '', lipidos_consumido:  '',
  hc_prescrito:       '', hc_consumido:       '',
  fibra_prescrito:    '', fibra_consumido:    '',
  hierro_prescrito:   '', hierro_consumido:   '',
  calcio_prescrito:   '', calcio_consumido:   '',
  folato_prescrito:   '', folato_consumido:   '',
}

// ─── Definición de campos — liga id → claves del form ─────────────────────────

interface CampoConfig {
  label:        string
  unidad:       string
  placeholder:  string
  obligatorio:  boolean
  grupo:        'macro' | 'micro'
  nota_clinica: string
  keyP:         keyof ValoresForm   // clave prescrito
  keyC:         keyof ValoresForm   // clave consumido
}

const CAMPOS: CampoConfig[] = [
  { label: 'Energía',            unidad: 'kcal', placeholder: '2000', obligatorio: true,  grupo: 'macro', keyP: 'energia_prescrito',  keyC: 'energia_consumido',  nota_clinica: 'El balance energético es el determinante primario del peso corporal.' },
  { label: 'Proteína',           unidad: 'g',    placeholder: '60',   obligatorio: true,  grupo: 'macro', keyP: 'proteina_prescrito', keyC: 'proteina_consumido', nota_clinica: 'La ingesta proteica adecuada preserva la masa muscular y apoya la función inmune.' },
  { label: 'Lípidos',            unidad: 'g',    placeholder: '65',   obligatorio: true,  grupo: 'macro', keyP: 'lipidos_prescrito',  keyC: 'lipidos_consumido',  nota_clinica: 'Esenciales para la absorción de vitaminas liposolubles y síntesis hormonal.' },
  { label: 'Hidratos de carbono',unidad: 'g',    placeholder: '250',  obligatorio: true,  grupo: 'macro', keyP: 'hc_prescrito',       keyC: 'hc_consumido',       nota_clinica: 'Principal fuente energética del sistema nervioso central.' },
  { label: 'Fibra',              unidad: 'g',    placeholder: '25',   obligatorio: true,  grupo: 'macro', keyP: 'fibra_prescrito',    keyC: 'fibra_consumido',    nota_clinica: 'Modula la glucemia postprandial y apoya la microbiota intestinal.' },
  { label: 'Hierro',             unidad: 'mg',   placeholder: '18',   obligatorio: false, grupo: 'micro', keyP: 'hierro_prescrito',   keyC: 'hierro_consumido',   nota_clinica: 'Déficit frecuente en mujeres en edad reproductiva. Evaluar con ferritina sérica.' },
  { label: 'Calcio',             unidad: 'mg',   placeholder: '1000', obligatorio: false, grupo: 'micro', keyP: 'calcio_prescrito',   keyC: 'calcio_consumido',   nota_clinica: 'Crítico para la salud ósea. Absorción mejorada con vitamina D adecuada.' },
  { label: 'Folato',             unidad: 'mcg',  placeholder: '400',  obligatorio: false, grupo: 'micro', keyP: 'folato_prescrito',   keyC: 'folato_consumido',   nota_clinica: 'Esencial en embarazo. Déficit asociado a defectos del tubo neural.' },
]

// ─── Helper ────────────────────────────────────────────────────────────────────

const parsePositivo = (s: string): number | null => {
  const n = parseFloat(s)
  return Number.isFinite(n) && n > 0 ? n : null
}

// ─── Sub-componente: par de inputs prescrito / consumido ───────────────────────

interface InputDualProps {
  campo:       CampoConfig
  prescrito:   string
  consumido:   string
  onPrescrito: (v: string) => void
  onConsumido: (v: string) => void
}

function InputDual({ campo, prescrito, consumido, onPrescrito, onConsumido }: InputDualProps) {
  const idBase = campo.keyP.replace('_prescrito', '')
  return (
    <div className="bg-white rounded-2xl border border-[#E5E5EA] px-4 py-3 shadow-sm">
      <div className="flex items-center gap-2 mb-3">
        <p className="text-[14px] font-semibold text-[#1C1C1E] flex-1">{campo.label}</p>
        {!campo.obligatorio && (
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#F2F2F7] text-[#8E8E93] uppercase tracking-wider">
            Opcional
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        {/* Prescrito */}
        <div className="flex flex-col gap-1">
          <label htmlFor={`${idBase}-p`} className="text-[11px] font-semibold uppercase tracking-widest text-[#8E8E93]">
            Prescrito
          </label>
          <div className="flex items-center rounded-xl border border-[#E5E5EA] bg-[#F9F9FB] overflow-hidden" style={{ minHeight: '44px' }}>
            <input
              id={`${idBase}-p`}
              type="number"
              inputMode="decimal"
              value={prescrito}
              onChange={(e) => onPrescrito(e.target.value)}
              placeholder={campo.placeholder}
              className="flex-1 px-3 py-2.5 text-[15px] font-mono text-[#1C1C1E] bg-transparent outline-none placeholder:text-[#C7C7CC]"
              style={{ minWidth: 0 }}
              aria-label={`${campo.label} prescrito en ${campo.unidad}`}
            />
            <span className="pr-3 text-[13px] text-[#8E8E93] font-medium flex-shrink-0">{campo.unidad}</span>
          </div>
        </div>

        {/* Consumido */}
        <div className="flex flex-col gap-1">
          <label htmlFor={`${idBase}-c`} className="text-[11px] font-semibold uppercase tracking-widest text-[#007AFF]">
            Consumido
          </label>
          <div className="flex items-center rounded-xl border border-[#007AFF]/30 bg-[#EFF6FF] overflow-hidden" style={{ minHeight: '44px' }}>
            <input
              id={`${idBase}-c`}
              type="number"
              inputMode="decimal"
              value={consumido}
              onChange={(e) => onConsumido(e.target.value)}
              placeholder={campo.placeholder}
              className="flex-1 px-3 py-2.5 text-[15px] font-mono text-[#1C1C1E] bg-transparent outline-none placeholder:text-[#C7C7CC]"
              style={{ minWidth: 0 }}
              aria-label={`${campo.label} consumido en ${campo.unidad}`}
            />
            <span className="pr-3 text-[13px] text-[#8E8E93] font-medium flex-shrink-0">{campo.unidad}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Componente principal ──────────────────────────────────────────────────────

export default function Adequacy() {
  const [form, setForm] = useState<ValoresForm>(ESTADO_INICIAL)

  const set = (key: keyof ValoresForm) => (v: string) =>
    setForm((prev) => ({ ...prev, [key]: v }))

  const hayAlgunDato = (Object.values(form) as string[]).some((v) => v !== '')

  // Construir AdecuacionDiaria — sin acceso dinámico por string template
  const adecuacion = useMemo<AdecuacionDiaria | null>(() => {
    const nutrientes: NutrienteRowData[] = []

    for (const campo of CAMPOS) {
      const p = parsePositivo(form[campo.keyP])
      const c = parsePositivo(form[campo.keyC])
      if (p !== null && c !== null) {
        nutrientes.push({
          id:           campo.keyP.replace('_prescrito', ''),
          label:        campo.label,
          unidad:       campo.unidad,
          grupo:        campo.grupo,
          prescrito:    p,
          consumido:    c,
          nota_clinica: campo.nota_clinica,
        })
      }
    }

    return nutrientes.length > 0 ? { nutrientes } : null
  }, [form])

  return (
    <div className="max-w-2xl mx-auto px-4 pt-6 pb-8 md:px-6 md:pt-8">

      {/* Encabezado */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: '#EDFAF2' }} aria-hidden="true">
            <ClipboardList size={20} color="#34C759" />
          </div>
          <h1 className="text-[22px] font-semibold text-[#1C1C1E]">Evaluación de 24 horas</h1>
        </div>
        <p className="text-[13px] text-[#8E8E93] ml-[52px] leading-relaxed">
          Compara cualquier registro de consumo contra una prescripción
        </p>
      </div>

      {/* Leyenda de columnas */}
      <div className="grid grid-cols-2 gap-3 mb-4 px-1">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-[#F2F2F7] border border-[#E5E5EA]" />
          <span className="text-[12px] font-semibold text-[#8E8E93] uppercase tracking-wider">Prescrito</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-[#007AFF]/30 border border-[#007AFF]/30" />
          <span className="text-[12px] font-semibold text-[#007AFF] uppercase tracking-wider">Consumido</span>
        </div>
      </div>

      {/* Macros */}
      <div className="space-y-3 mb-2">
        <p className="text-[11px] font-semibold text-[#8E8E93] uppercase tracking-wider px-1">Macronutrientes</p>
        {CAMPOS.filter((c) => c.obligatorio).map((campo) => (
          <InputDual
            key={campo.keyP}
            campo={campo}
            prescrito={form[campo.keyP]}
            consumido={form[campo.keyC]}
            onPrescrito={set(campo.keyP)}
            onConsumido={set(campo.keyC)}
          />
        ))}
      </div>

      {/* Micros */}
      <div className="space-y-3 mb-6 mt-4">
        <p className="text-[11px] font-semibold text-[#8E8E93] uppercase tracking-wider px-1">Micronutrientes — Opcional</p>
        {CAMPOS.filter((c) => !c.obligatorio).map((campo) => (
          <InputDual
            key={campo.keyP}
            campo={campo}
            prescrito={form[campo.keyP]}
            consumido={form[campo.keyC]}
            onPrescrito={set(campo.keyP)}
            onConsumido={set(campo.keyC)}
          />
        ))}
      </div>

      {/* Resultado o estado vacío */}
      {adecuacion ? (
        <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', boxShadow: 'var(--shadow)' }}>
          <div className="p-5">
            <SemaforoAdecuacion adecuacion={adecuacion} />
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border-2 border-dashed border-[#E5E5EA] flex flex-col items-center justify-center py-12 px-6 text-center" style={{ background: 'var(--color-surface)' }}>
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-3" style={{ background: '#EDFAF2' }} aria-hidden="true">
            <ClipboardList size={24} color="#34C759" />
          </div>
          <p className="text-[15px] font-semibold text-[#1C1C1E] mb-1">
            Ingresa los valores prescritos y consumidos para ver la evaluación
          </p>
          <p className="text-[13px] text-[#8E8E93] max-w-[280px] leading-relaxed">
            Se necesita al menos un nutriente con ambos valores (prescrito + consumido) para calcular la adecuación.
          </p>
        </div>
      )}

      {/* Limpiar */}
      {hayAlgunDato && (
        <button
          type="button"
          onClick={() => setForm(ESTADO_INICIAL)}
          className="mt-4 w-full py-3 rounded-xl text-[13px] font-medium text-[#FF3B30] bg-[#F2F2F7] transition-all active:scale-[0.98]"
          style={{ minHeight: '44px' }}
        >
          Limpiar formulario
        </button>
      )}
    </div>
  )
}