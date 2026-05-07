/**
 * @file src/db/schema.ts
 * @description Esquema central de IndexedDB usando Dexie.js.
 *   Define la clase NutriaDB, todas las interfaces de tabla,
 *   y exporta el singleton `db` que usan los demás módulos.
 *
 * @design
 *   - Un solo archivo de schema evita divergencias entre módulos.
 *   - Todos los registros llevan `created_at` y `updated_at` (ISO 8601)
 *     para facilitar la sincronización con Supabase en Fase 2.
 *   - Los IDs son `number` (autoincrement de Dexie) — en Fase 2 se
 *     añadirá `supabase_id?: string` como campo opcional para el UUID remoto.
 *
 * @source Dexie.js docs — https://dexie.org/docs/Dexie/Dexie.version()
 * @source Decisión ADR-003: Dexie.js sobre LocalStorage (ver AGENT.md)
 */

import Dexie, { type Table } from 'dexie';
import type { PatientFull } from '../types/patient.types';
import type { GrupoSMAE, FuenteDatos } from '../types/food.types';
import type { FormulasTMB } from '../types/energy.types';
import type { DistribuciónMacros, DistribuciónTiempos } from '../types/plan.types';

// ─────────────────────────────────────────────
// 1. INTERFACES DE TABLA
// Estas son las entidades que viven en IndexedDB.
// No deben confundirse con los tipos del dominio clínico
// (PatientFull, PlanAlimenticio) — aunque se nutren de ellos.
// ─────────────────────────────────────────────

/**
 * Paciente almacenado en IndexedDB.
 *
 * NO extiende PatientFull directamente porque PatientFull.id es `string`
 * (UUID del dominio clínico) mientras que Dexie necesita `id?: number`
 * (autoincrement). Se usa composición: los datos clínicos viven en `datos`.
 *
 * En Fase 2 (Supabase), `supabase_id` mapea al UUID remoto de PatientFull.
 */
export interface Paciente {
  /** Clave primaria autoincremental de Dexie */
  id?: number;
  /** Datos clínicos completos del paciente */
  datos: Omit<PatientFull, 'id'>;
  /**
   * UUID del registro en Supabase (Fase 2).
   * Corresponde al PatientFull.id del dominio clínico.
   */
  supabase_id?: string;
  /** ISO 8601 — momento de creación local */
  created_at: string;
  /** ISO 8601 — momento de última modificación local */
  updated_at: string;
}

/**
 * Consulta clínica: visita del paciente al nutriólogo.
 * Una consulta contiene uno o más planes alimenticios.
 */
export interface Consulta {
  id?: number;
  /** FK → pacientes.id */
  id_paciente: number;
  /**
   * Fecha de la consulta — ISO date (YYYY-MM-DD).
   * Se separa de `created_at` para que el nutriólogo
   * pueda registrar consultas con fecha retroactiva.
   */
  fecha: string;
  motivo?: string;
  peso_actual_kg?: number;
  talla_cm?: number;
  notas_clinicas?: string;
  supabase_id?: string;
  created_at: string;
  updated_at: string;
}

/**
 * Plan alimenticio: resultado del cálculo de GET + distribución SMAE.
 * Pertenece a una consulta.
 */
export interface Plan {
  id?: number;
  /** FK → consultas.id */
  id_consulta: number;
  fecha: string;
  formula_tmb: FormulasTMB;
  tmb_kcal: number;
  naf_usado: number;
  get_calculado_kcal: number;
  /** Distribución porcentual de macronutrientes */
  distribucion_macros: DistribuciónMacros;
  /** Distribución porcentual por tiempo de comida */
  distribucion_tiempos: DistribuciónTiempos;
  notas?: string;
  supabase_id?: string;
  created_at: string;
  updated_at: string;
}

/**
 * Alimento personalizado creado por el nutriólogo.
 * Complementa el catálogo estático del SMAE (smae.json).
 * Los alimentos del catálogo estático NO se guardan aquí.
 */
export interface AlimentoPersonalizado {
  id?: number;
  nombre: string;
  /** Nombres alternativos para mejorar la búsqueda */
  nombre_alternativo?: string[];
  grupo_smae: GrupoSMAE;
  subgrupo?: string;
  porcion_estandar_g: number;
  medida_casera: string;
  energia_kcal: number;
  proteina_g: number;
  lipidos_g: number;
  hidratos_g: number;
  fibra_g: number;
  sodio_mg: number;
  fuente_datos: FuenteDatos;
  /** Notas del nutriólogo sobre este alimento */
  notas?: string;
  supabase_id?: string;
  created_at: string;
  updated_at: string;
}

// ─────────────────────────────────────────────
// 2. CLASE NutriaDB
// ─────────────────────────────────────────────

/**
 * Base de datos local de NUTRIA.
 *
 * Uso de versiones en Dexie:
 *   - v1: Esquema inicial (Fase 1 offline).
 *   - v2 (Fase 2): Añadir índice `supabase_id` cuando se active sync.
 *   - Nunca borrar versiones anteriores para no perder datos del usuario.
 */
class NutriaDB extends Dexie {
  pacientes!: Table<Paciente, number>;
  consultas!: Table<Consulta, number>;
  planes!: Table<Plan, number>;
  alimentos!: Table<AlimentoPersonalizado, number>;

  constructor() {
    super('NutriaDB');

    this.version(1).stores({
      /**
       * Índices de pacientes:
       *   ++id           → autoincrement PK
       *   nombre         → búsqueda por nombre
       *   sexo           → filtros estadísticos
       *   created_at     → ordenar por fecha de registro
       *
       * Nota: Los campos NO indexados (email, antecedentes, etc.)
       * se almacenan igualmente — Dexie guarda el objeto completo.
       * Solo se indexa lo que se usa en queries.
       */
      pacientes: '++id, nombre, sexo, created_at',

      /**
       * Índices de consultas:
       *   ++id           → autoincrement PK
       *   id_paciente    → listar consultas de un paciente (FK query)
       *   fecha          → ordenar cronológicamente
       */
      consultas: '++id, id_paciente, fecha',

      /**
       * Índices de planes:
       *   ++id           → autoincrement PK
       *   id_consulta    → listar planes de una consulta (FK query)
       *   fecha          → ordenar por vigencia
       *   formula_tmb    → filtrar por fórmula usada (analítica futura)
       */
      planes: '++id, id_consulta, fecha, formula_tmb',

      /**
       * Índices de alimentos personalizados:
       *   ++id           → autoincrement PK
       *   nombre         → búsqueda full-text parcial (via .startsWith)
       *   grupo_smae     → filtrar por grupo SMAE
       */
      alimentos: '++id, nombre, grupo_smae',
    });
  }
}

// ─────────────────────────────────────────────
// 3. SINGLETON
// ─────────────────────────────────────────────

/**
 * Instancia única de la base de datos.
 * Importar `db` en lugar de instanciar NutriaDB directamente.
 *
 * @example
 *   import { db } from '../db/schema';
 *   const paciente = await db.pacientes.get(1);
 */
export const db = new NutriaDB();

// ─────────────────────────────────────────────
// 4. HELPER DE TIMESTAMPS
// ─────────────────────────────────────────────

/**
 * Retorna el timestamp ISO 8601 actual.
 * Centralizado aquí para que todos los módulos usen el mismo formato.
 *
 * @example "2026-05-07T14:32:00.000Z"
 */
export const ahora = (): string => new Date().toISOString();