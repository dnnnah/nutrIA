/**
 * SemaforoAdecuacion.tsx
 * Componente React — Semáforo de adecuación nutricional
 *
 * Renderiza el % de adecuación de cada nutriente (consumido vs prescrito)
 * con indicador visual verde/amarillo/rojo, barra de progreso y
 * detalle expandible (Progressive Disclosure — Apple HIG).
 *
 * Dependencias externas: ninguna (solo React + Tailwind + tokens CSS del proyecto)
 * Hook consumido: useAdequacy (ya implementado en src/hooks/useAdequacy.ts)
 *
 * Bibliografía de rangos de adecuación:
 * @source Gibson RS. Principles of Nutritional Assessment. 2nd ed. Oxford University Press. 2005.
 * @source Bourges H, Casanueva E, Rosado JL. Recomendaciones de Ingestión de Nutrimentos
 *         para la Población Mexicana. Médica Panamericana. 2005.
 */

import { useState } from 'react';
import type { AdecuacionDiaria, SemaforoColor, NutrienteRowData } from '@/types/adequacy.types';

// ---------------------------------------------------------------------------
// Tipos internos del componente
// ---------------------------------------------------------------------------


interface SemaforoAdecuacionProps {
  /** Resultado del hook useAdequacy — puede ser undefined mientras carga */
  adecuacion: AdecuacionDiaria | null;
  /** Nombre del paciente para accesibilidad */
  nombre_paciente?: string;
  /** Callback opcional al tocar un nutriente (para analytics o flujo externo) */
  onNutrientePress?: (nutriente_id: string) => void;
}

// ---------------------------------------------------------------------------
// Constantes de semáforo
// @source Gibson RS. Principles of Nutritional Assessment. 2nd ed. 2005.
// ---------------------------------------------------------------------------

const SEMAFORO_RANGOS = {
  verde_min: 95,
  verde_max: 105,
  amarillo_min_bajo: 90,
  amarillo_max_alto: 110,
} as const;

// ---------------------------------------------------------------------------
// Helpers puros (sin efectos secundarios)
// ---------------------------------------------------------------------------

/**
 * Calcula el porcentaje de adecuación.
 * @source Gibson RS. Principles of Nutritional Assessment. 2005. p. 9.
 */
const calcularPorcentaje = (consumido: number, prescrito: number): number => {
  if (prescrito === 0) return 0;
  return Math.round((consumido / prescrito) * 100);
};

const determinarColor = (pct: number): SemaforoColor => {
  if (pct >= SEMAFORO_RANGOS.verde_min && pct <= SEMAFORO_RANGOS.verde_max) return 'verde';
  if (
    (pct >= SEMAFORO_RANGOS.amarillo_min_bajo && pct < SEMAFORO_RANGOS.verde_min) ||
    (pct > SEMAFORO_RANGOS.verde_max && pct <= SEMAFORO_RANGOS.amarillo_max_alto)
  )
    return 'amarillo';
  return 'rojo';
};

const textoEstado = (pct: number, color: SemaforoColor): string => {
  if (color === 'verde') return 'Adecuación óptima (95–105%)';
  if (color === 'amarillo')
    return pct < SEMAFORO_RANGOS.verde_min
      ? 'Ligeramente por debajo del prescrito (90–94%)'
      : 'Ligeramente por encima del prescrito (106–110%)';
  return pct < SEMAFORO_RANGOS.amarillo_min_bajo
    ? 'Déficit crítico — requiere ajuste del plan'
    : 'Exceso crítico — requiere ajuste del plan';
};

/** Ancla el ancho de la barra al 130% para no desbordar el contenedor */
const anclarAnchoBarra = (pct: number): number => Math.min(pct, 130);

// ---------------------------------------------------------------------------
// Sub-componente: indicador de color
// ---------------------------------------------------------------------------

const Dot = ({ color }: { color: SemaforoColor }) => {
  const bgMap: Record<SemaforoColor, string> = {
    verde: 'bg-[#34C759]',
    amarillo: 'bg-[#FF9500]',
    rojo: 'bg-[#FF3B30]',
  };
  return (
    <span
      aria-hidden="true"
      className={`inline-block w-2 h-2 rounded-full flex-shrink-0 ${bgMap[color]}`}
    />
  );
};

// ---------------------------------------------------------------------------
// Sub-componente: badge de porcentaje
// ---------------------------------------------------------------------------

const PctBadge = ({ pct, color }: { pct: number; color: SemaforoColor }) => {
  const styleMap: Record<SemaforoColor, string> = {
    verde: 'bg-[#E8F8EC] text-[#1B7A34]',
    amarillo: 'bg-[#FFF3E0] text-[#B45309]',
    rojo: 'bg-[#FDEAEA] text-[#B91C1C]',
  };
  return (
    <span
      className={`text-[11px] font-medium px-2 py-[2px] rounded-full min-w-[42px] text-center ${styleMap[color]}`}
    >
      {pct}%
    </span>
  );
};

// ---------------------------------------------------------------------------
// Sub-componente: fila de nutriente con expansión
// ---------------------------------------------------------------------------

interface NutrienteRowProps {
  data: NutrienteRowData;
  onPress?: (id: string) => void;
}

const NutrienteRow = ({ data, onPress }: NutrienteRowProps) => {
  const [expandido, setExpandido] = useState(false);

  const pct = calcularPorcentaje(data.consumido, data.prescrito);
  const color = determinarColor(pct);
  const anchoBarra = anclarAnchoBarra(pct);
  const diferencia = data.consumido - data.prescrito;

  const barraColorMap: Record<SemaforoColor, string> = {
    verde: 'bg-[#34C759]',
    amarillo: 'bg-[#FF9500]',
    rojo: 'bg-[#FF3B30]',
  };

  const handleToggle = () => {
    setExpandido((prev) => !prev);
    onPress?.(data.id);
  };

  return (
    <div
      role="button"
      tabIndex={0}
      aria-expanded={expandido}
      aria-label={`${data.label}: ${pct}% de adecuación. ${textoEstado(pct, color)}`}
      onClick={handleToggle}
      onKeyDown={(e) => e.key === 'Enter' || e.key === ' ' ? handleToggle() : undefined}
      className={`
        rounded-[10px] border px-[14px] py-3 mb-2 cursor-pointer select-none
        transition-all duration-150 outline-none
        focus-visible:ring-2 focus-visible:ring-[#007AFF]
        ${expandido
          ? 'border-[color:var(--color-border-secondary)] bg-[color:var(--color-background-secondary)]'
          : 'border-[color:var(--color-border-tertiary)] bg-white dark:bg-[color:var(--color-background-primary)]'
        }
      `}
    >
      {/* Fila superior */}
      <div className="flex items-center gap-[10px]">
        <Dot color={color} />

        <span className="text-[13px] font-medium text-[color:var(--color-text-primary)] flex-1 leading-none">
          {data.label}
        </span>

        {/* Valores consumido / prescrito */}
        <span className="flex items-baseline gap-[3px]">
          <span className="text-[13px] font-medium font-mono text-[color:var(--color-text-primary)]">
            {data.consumido}
          </span>
          <span className="text-[11px] text-[color:var(--color-text-tertiary)]">/</span>
          <span className="text-[11px] font-mono text-[color:var(--color-text-secondary)]">
            {data.prescrito} {data.unidad}
          </span>
        </span>

        <PctBadge pct={pct} color={color} />

        {/* Chevron */}
        <span
          aria-hidden="true"
          className={`text-[13px] text-[color:var(--color-text-tertiary)] transition-transform duration-200 ${
            expandido ? 'rotate-180' : ''
          }`}
        >
          ⌄
        </span>
      </div>

      {/* Barra de progreso */}
      <div className="mt-2 relative h-[4px] bg-[color:var(--color-border-tertiary)] rounded-full overflow-hidden">
        {/* Zona verde (95%–105%) destacada */}
        <div
          aria-hidden="true"
          className="absolute top-0 h-full bg-[#34C759]/15 pointer-events-none"
          style={{ left: '73%', width: '8%' }}
        />
        <div
          className={`h-full rounded-full transition-[width] duration-300 ease-out ${barraColorMap[color]}`}
          style={{ width: `${anchoBarra}%` }}
        />
      </div>

      {/* Panel de detalle — Progressive Disclosure */}
      {expandido && (
        <div className="mt-[10px] pt-[10px] border-t border-[color:var(--color-border-tertiary)]">
          {/* 3 mini-cards */}
          <div className="grid grid-cols-3 gap-2 mb-2">
            <MiniCard
              label="Consumido"
              value={`${data.consumido}`}
              unidad={data.unidad}
            />
            <MiniCard
              label="Prescrito"
              value={`${data.prescrito}`}
              unidad={data.unidad}
            />
            <MiniCard
              label="Diferencia"
              value={`${diferencia >= 0 ? '+' : ''}${diferencia}`}
              unidad={data.unidad}
              color={Math.abs(diferencia) === 0 ? 'verde' : diferencia > 0 ? 'amarillo' : 'rojo'}
            />
          </div>

          {/* Nota clínica */}
          <p className="text-[12px] text-[color:var(--color-text-secondary)] leading-relaxed">
            <span className="font-medium text-[color:var(--color-text-primary)]">
              {textoEstado(pct, color)}.
            </span>{' '}
            {data.nota_clinica}
          </p>
        </div>
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------
// Sub-componente: mini card para el panel de detalle
// ---------------------------------------------------------------------------

interface MiniCardProps {
  label: string;
  value: string;
  unidad: string;
  color?: SemaforoColor;
}

const MiniCard = ({ label, value, unidad, color }: MiniCardProps) => {
  const colorMap: Partial<Record<SemaforoColor, string>> = {
    verde: 'text-[#1B7A34]',
    amarillo: 'text-[#B45309]',
    rojo: 'text-[#B91C1C]',
  };
  return (
    <div className="bg-[color:var(--color-background-primary)] border border-[color:var(--color-border-tertiary)] rounded-lg px-[10px] py-2">
      <div className="text-[10px] uppercase tracking-widest text-[color:var(--color-text-secondary)] mb-[2px]">
        {label}
      </div>
      <div
        className={`text-[14px] font-medium font-mono ${
          color ? colorMap[color] : 'text-[color:var(--color-text-primary)]'
        }`}
      >
        {value}{' '}
        <span className="text-[11px] font-normal text-[color:var(--color-text-secondary)]">
          {unidad}
        </span>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Sub-componente: chips resumen
// ---------------------------------------------------------------------------

const ResumenChips = ({ adecuacion_items }: { adecuacion_items: NutrienteRowData[] }) => {
  const counts = adecuacion_items.reduce(
    (acc, d) => {
      const color = determinarColor(calcularPorcentaje(d.consumido, d.prescrito));
      acc[color]++;
      return acc;
    },
    { verde: 0, amarillo: 0, rojo: 0 } as Record<SemaforoColor, number>
  );

  return (
    <div className="flex gap-[6px]" aria-label="Resumen de adecuación">
      {counts.verde > 0 && (
        <span className="text-[11px] font-medium px-2 py-[3px] rounded-full bg-[#E8F8EC] text-[#1B7A34]">
          {counts.verde} ✓
        </span>
      )}
      {counts.amarillo > 0 && (
        <span className="text-[11px] font-medium px-2 py-[3px] rounded-full bg-[#FFF3E0] text-[#B45309]">
          {counts.amarillo} ⚠
        </span>
      )}
      {counts.rojo > 0 && (
        <span className="text-[11px] font-medium px-2 py-[3px] rounded-full bg-[#FDEAEA] text-[#B91C1C]">
          {counts.rojo} ✗
        </span>
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------
// Función adaptadora: AdecuacionDiaria → NutrienteRowData[]
// Convierte el tipo del hook al tipo interno del componente.
// Si el tipo AdecuacionDiaria cambia, actualizar solo aquí.
// ---------------------------------------------------------------------------

const adaptarAdecuacion = (adecuacion: AdecuacionDiaria): NutrienteRowData[] => {
  // TODO: mapear los campos reales de AdecuacionDiaria cuando estén finalizados.
  // Por ahora se asume que AdecuacionDiaria contiene al menos:
  // { nutrientes: Array<{ id, label, unidad, consumido, prescrito, nota_clinica, grupo }> }
  // Ajustar este mapeo a la estructura real del tipo.
  return (adecuacion as unknown as { nutrientes: NutrienteRowData[] }).nutrientes ?? [];
};

// ---------------------------------------------------------------------------
// Componente principal
// ---------------------------------------------------------------------------

export const SemaforoAdecuacion = ({
  adecuacion,
  nombre_paciente,
  onNutrientePress,
}: SemaforoAdecuacionProps) => {

  if (!adecuacion) {
    return (
      <div
        aria-label="Cargando semáforo de adecuación"
        className="flex items-center justify-center py-8"
      >
        <span className="text-[13px] text-[color:var(--color-text-secondary)]">
          Calculando adecuación…
        </span>
      </div>
    );
  }

  const todos_nutrientes = adaptarAdecuacion(adecuacion);
  const macros = todos_nutrientes.filter((d) => d.grupo === 'macro');
  const micros = todos_nutrientes.filter((d) => d.grupo === 'micro');

  return (
    <section
      aria-label={`Semáforo de adecuación nutricional${nombre_paciente ? ` — ${nombre_paciente}` : ''}`}
      className="w-full"
    >
      {/* Encabezado */}
      <div className="flex items-start justify-between mb-5">
        <div>
          <h3 className="text-[15px] font-semibold text-[color:var(--color-text-primary)] tracking-[-0.01em]">
            Adecuación del plan
          </h3>
          <p className="text-[12px] text-[color:var(--color-text-secondary)] mt-[2px]">
            Día completo · 5 tiempos de comida
          </p>
        </div>
        <ResumenChips adecuacion_items={todos_nutrientes} />
      </div>

      {/* Macronutrientes */}
      {macros.length > 0 && (
        <>
          <p className="text-[10px] font-medium text-[color:var(--color-text-secondary)] uppercase tracking-[0.08em] mb-2">
            Macronutrientes
          </p>
          {macros.map((d) => (
            <NutrienteRow key={d.id} data={d} onPress={onNutrientePress} />
          ))}
        </>
      )}

      {/* Micronutrientes */}
      {micros.length > 0 && (
        <>
          <p className="text-[10px] font-medium text-[color:var(--color-text-secondary)] uppercase tracking-[0.08em] mb-2 mt-4">
            Micronutrientes clave
          </p>
          {micros.map((d) => (
            <NutrienteRow key={d.id} data={d} onPress={onNutrientePress} />
          ))}
        </>
      )}
    </section>
  );
};

export default SemaforoAdecuacion;