/**
 * @file src/db/plans.db.ts
 * @description Capa de acceso a datos para las tablas `consultas` y `planes`.
 *   Agrupa ambas entidades porque su ciclo de vida está estrechamente
 *   ligado: una consulta siempre tiene al menos un plan.
 *
 * @design
 *   - Una consulta puede tener múltiples planes (ej: plan inicial +
 *     plan ajustado tras resultado de laboratorio).
 *   - Al eliminar una consulta, sus planes asociados también se eliminan
 *     (cascada manual usando una transacción Dexie).
 *   - Los planes contienen la distribución SMAE completa serializada
 *     como JSON dentro de IndexedDB — no se normalizan porque la app
 *     es offline-first y esa granularidad no se necesita en las queries.
 *
 * @source Dexie.js Transactions — https://dexie.org/docs/Dexie/Dexie.transaction()
 */

import { db, ahora, type Consulta, type Plan } from './schema';

// ─────────────────────────────────────────────
// TIPOS DE ENTRADA
// ─────────────────────────────────────────────

type NuevaConsulta = Omit<Consulta, 'id' | 'created_at' | 'updated_at'>;
type NuevoPlan = Omit<Plan, 'id' | 'created_at' | 'updated_at'>;
type ActualizacionPlan = Partial<Omit<Plan, 'id' | 'id_consulta' | 'created_at' | 'updated_at'>>;

// ─────────────────────────────────────────────
// OPERACIONES — CONSULTAS
// ─────────────────────────────────────────────

/**
 * Crea una nueva consulta vinculada a un paciente.
 *
 * @param data — Datos de la consulta sin metadatos de persistencia.
 * @returns La consulta creada con id y timestamps.
 * @throws Error si el paciente no existe o si la escritura falla.
 *
 * @example
 *   const consulta = await crearConsulta({
 *     id_paciente: 42,
 *     fecha: '2026-05-07',
 *     peso_actual_kg: 68.5,
 *     talla_cm: 165,
 *     motivo: 'Control mensual',
 *   });
 */
export async function crearConsulta(data: NuevaConsulta): Promise<Consulta> {
  const timestamp = ahora();

  const nuevaConsulta: Consulta = {
    ...data,
    created_at: timestamp,
    updated_at: timestamp,
  };

  try {
    const id = await db.consultas.add(nuevaConsulta);
    return { ...nuevaConsulta, id };
  } catch (error) {
    throw new Error(
      `[plans.db] Error al crear consulta para paciente id=${data.id_paciente}: ${String(error)}`
    );
  }
}

/**
 * Lista todas las consultas de un paciente, ordenadas de más reciente a más antigua.
 *
 * @param id_paciente — Id del paciente.
 * @returns Array de consultas (vacío si no tiene ninguna).
 * @throws Error si la lectura falla.
 *
 * @design
 *   Se usa `.reverse()` para mostrar primero la más reciente,
 *   que es el caso de uso habitual (ver historial del paciente).
 */
export async function obtenerConsultasDePaciente(id_paciente: number): Promise<Consulta[]> {
  try {
    return await db.consultas
      .where('id_paciente')
      .equals(id_paciente)
      .reverse()
      .sortBy('fecha');
  } catch (error) {
    throw new Error(
      `[plans.db] Error al obtener consultas del paciente id=${id_paciente}: ${String(error)}`
    );
  }
}

/**
 * Elimina una consulta y todos sus planes asociados en una sola transacción.
 * Si cualquier operación falla, Dexie hace rollback completo.
 *
 * @param id_consulta — Id de la consulta a eliminar.
 * @throws Error si alguna operación de la transacción falla.
 *
 * @design
 *   La transacción es crítica aquí: sin ella, podría quedar una consulta
 *   sin planes o planes huérfanos si el proceso se interrumpe a mitad.
 */
export async function eliminarConsultaConPlanes(id_consulta: number): Promise<void> {
  try {
    await db.transaction('rw', db.consultas, db.planes, async () => {
      // Eliminar todos los planes de esta consulta primero
      await db.planes
        .where('id_consulta')
        .equals(id_consulta)
        .delete();

      // Luego eliminar la consulta
      await db.consultas.delete(id_consulta);
    });
  } catch (error) {
    throw new Error(
      `[plans.db] Error al eliminar consulta id=${id_consulta} con sus planes: ${String(error)}`
    );
  }
}

/**
 * Elimina todas las consultas (y sus planes) de un paciente.
 * Usar antes de `eliminarPaciente()` para evitar registros huérfanos.
 *
 * @param id_paciente — Id del paciente.
 * @throws Error si la transacción falla.
 *
 * @example
 *   // Flujo correcto de eliminación de paciente:
 *   await eliminarConsultasDePaciente(id);
 *   await eliminarPaciente(id);          // patients.db.ts
 */
export async function eliminarConsultasDePaciente(id_paciente: number): Promise<void> {
  try {
    await db.transaction('rw', db.consultas, db.planes, async () => {
      // Obtener todos los ids de consulta del paciente
      const consultas = await db.consultas
        .where('id_paciente')
        .equals(id_paciente)
        .toArray();

      const ids_consulta = consultas
        .map((c) => c.id)
        .filter((id): id is number => id !== undefined);

      if (ids_consulta.length > 0) {
        // Eliminar todos los planes de esas consultas
        await db.planes
          .where('id_consulta')
          .anyOf(ids_consulta)
          .delete();

        // Eliminar las consultas
        await db.consultas
          .where('id_paciente')
          .equals(id_paciente)
          .delete();
      }
    });
  } catch (error) {
    throw new Error(
      `[plans.db] Error al eliminar consultas del paciente id=${id_paciente}: ${String(error)}`
    );
  }
}

// ─────────────────────────────────────────────
// OPERACIONES — PLANES
// ─────────────────────────────────────────────

/**
 * Crea un nuevo plan alimenticio vinculado a una consulta.
 *
 * @param data — Datos del plan sin metadatos de persistencia.
 * @returns El plan creado con id y timestamps.
 * @throws Error si la escritura falla.
 *
 * @example
 *   const plan = await crearPlan({
 *     id_consulta: 7,
 *     fecha: '2026-05-07',
 *     formula_tmb: 'mifflin_st_jeor',
 *     tmb_kcal: 1395,
 *     naf_usado: 1.375,
 *     get_calculado_kcal: 2112,
 *     distribucion_macros: { proteina_pct: 20, lipidos_pct: 30, hidratos_pct: 50 },
 *     equivalentes_dia: { verduras: 4, frutas: 3, ... },
 *   });
 */
export async function crearPlan(data: NuevoPlan): Promise<Plan> {
  const timestamp = ahora();

  const nuevoPlan: Plan = {
    ...data,
    created_at: timestamp,
    updated_at: timestamp,
  };

  try {
    const id = await db.planes.add(nuevoPlan);
    return { ...nuevoPlan, id };
  } catch (error) {
    throw new Error(
      `[plans.db] Error al crear plan para consulta id=${data.id_consulta}: ${String(error)}`
    );
  }
}

/**
 * Lista todos los planes de una consulta, ordenados por fecha ascendente.
 * El primero es el plan original; los siguientes son ajustes posteriores.
 *
 * @param id_consulta — Id de la consulta.
 * @returns Array de planes (vacío si no tiene ninguno).
 * @throws Error si la lectura falla.
 */
export async function obtenerPlanesDeConsulta(id_consulta: number): Promise<Plan[]> {
  try {
    return await db.planes
      .where('id_consulta')
      .equals(id_consulta)
      .sortBy('fecha');
  } catch (error) {
    throw new Error(
      `[plans.db] Error al obtener planes de la consulta id=${id_consulta}: ${String(error)}`
    );
  }
}

/**
 * Obtiene el plan más reciente de una consulta.
 * Atajo para el caso de uso más común: mostrar el plan vigente.
 *
 * @param id_consulta — Id de la consulta.
 * @returns El plan más reciente o `undefined` si no hay ninguno.
 * @throws Error si la lectura falla.
 */
export async function obtenerUltimoPlanDeConsulta(
  id_consulta: number
): Promise<Plan | undefined> {
  try {
    const planes = await obtenerPlanesDeConsulta(id_consulta);
    return planes[planes.length - 1]; // El último es el más reciente (sort ascendente por fecha)
  } catch (error) {
    throw new Error(
      `[plans.db] Error al obtener el último plan de la consulta id=${id_consulta}: ${String(error)}`
    );
  }
}

/**
 * Actualiza campos específicos de un plan.
 * No permite cambiar `id_consulta` — los planes no cambian de dueño.
 *
 * @param id   — Id del plan a actualizar.
 * @param data — Campos a modificar.
 * @throws Error si el plan no existe o si la escritura falla.
 *
 * @example
 *   // Ajustar el GET después de un cambio de NAF
 *   await actualizarPlan(15, {
 *     naf_usado: 1.55,
 *     get_calculado_kcal: 2419,
 *     notas: 'Paciente aumentó actividad — ajuste de NAF a moderado',
 *   });
 */
export async function actualizarPlan(
  id: number,
  data: ActualizacionPlan
): Promise<void> {
  try {
    const modificados = await db.planes.update(id, {
      ...data,
      updated_at: ahora(),
    });

    if (modificados === 0) {
      throw new Error(`Plan id=${id} no encontrado`);
    }
  } catch (error) {
    throw new Error(
      `[plans.db] Error al actualizar plan id=${id}: ${String(error)}`
    );
  }
}

/**
 * Elimina un plan por su id.
 * No afecta a la consulta ni a otros planes de la misma consulta.
 *
 * @param id — Id del plan a eliminar.
 * @throws Error si la eliminación falla.
 *
 * @warning Irreversible en Fase 1 (sin Supabase backup).
 *   Considerar soft-delete (campo `deleted_at`) en Fase 2.
 */
export async function eliminarPlan(id: number): Promise<void> {
  try {
    await db.planes.delete(id);
  } catch (error) {
    throw new Error(
      `[plans.db] Error al eliminar plan id=${id}: ${String(error)}`
    );
  }
}