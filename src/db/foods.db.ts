/**
 * @file src/db/foods.db.ts
 * @description Capa de acceso a datos para la tabla `alimentos`.
 *   Maneja los alimentos PERSONALIZADOS creados por el nutriólogo.
 *
 * @design
 *   Este módulo NO gestiona el catálogo estático del SMAE (smae.json),
 *   que se carga como JSON en memoria en el módulo `useSMAEPlanner`.
 *   Solo persiste los alimentos que el nutriólogo añade manualmente.
 *
 *   Flujo de búsqueda en la app (recomendado):
 *     1. Buscar en smae.json (catálogo estático — prioritario).
 *     2. Si no se encuentra, buscar en `alimentos` (personalizados).
 *     3. El nutriólogo puede crear un alimento personalizado si no
 *        existe en ninguno de los dos.
 *
 * @source Dexie.js Collection — https://dexie.org/docs/Collection/Collection
 */

import { db, ahora, type AlimentoPersonalizado } from './schema';
import type { GrupoSMAE } from '../types/food.types';

// ─────────────────────────────────────────────
// TIPOS DE ENTRADA
// ─────────────────────────────────────────────

type NuevoAlimento = Omit<AlimentoPersonalizado, 'id' | 'created_at' | 'updated_at'>;

// ─────────────────────────────────────────────
// OPERACIONES CRUD
// ─────────────────────────────────────────────

/**
 * Crea un alimento personalizado en IndexedDB.
 *
 * @param data — Datos del alimento sin metadatos de persistencia.
 * @returns El alimento creado con id y timestamps.
 * @throws Error si ya existe un alimento con el mismo nombre
 *   o si la escritura falla.
 *
 * @example
 *   const alimento = await crearAlimento({
 *     nombre: 'Tlayuda oaxaqueña',
 *     grupo_smae: 'cereales_sin_grasa',
 *     porcion_estandar_g: 100,
 *     medida_casera: '1 pieza mediana',
 *     energia_kcal: 180,
 *     proteina_g: 5,
 *     lipidos_g: 2,
 *     hidratos_g: 36,
 *     fibra_g: 2.5,
 *     sodio_mg: 120,
 *     fuente_datos: 'INNSZ',
 *   });
 */
export async function crearAlimento(data: NuevoAlimento): Promise<AlimentoPersonalizado> {
  const timestamp = ahora();

  const nuevoAlimento: AlimentoPersonalizado = {
    ...data,
    created_at: timestamp,
    updated_at: timestamp,
  };

  try {
    const id = await db.alimentos.add(nuevoAlimento);
    return { ...nuevoAlimento, id };
  } catch (error) {
    throw new Error(
      `[foods.db] Error al crear alimento "${data.nombre}": ${String(error)}`
    );
  }
}

/**
 * Busca alimentos personalizados por nombre.
 * La búsqueda es por prefijo (usa el índice de `nombre`).
 *
 * @param query — Texto de búsqueda (mínimo 1 carácter).
 * @returns Alimentos cuyo nombre empieza con `query`, máximo 20 resultados.
 * @throws Error si la lectura falla.
 *
 * @design
 *   La limitación a 20 resultados es deliberada para mantener la UI
 *   ágil. Si el nutriólogo no encuentra lo que busca en los primeros
 *   20, debe ser más específico en el query.
 *
 *   Limitación conocida: no es búsqueda substring ni fuzzy.
 *   En Fase 2, considerar indexación en Supabase con `ilike` o Fuse.js.
 *
 * @example
 *   const resultados = await buscarAlimentos('Tort');
 *   // → ['Tortilla de maíz azul', 'Tortilla de nopal', ...]
 */
export async function buscarAlimentos(query: string): Promise<AlimentoPersonalizado[]> {
  try {
    const queryNormalizado = query.trim();

    if (queryNormalizado === '') {
      // Query vacío → retornar los 20 más recientes (uso: "ver todos")
      return await db.alimentos
        .orderBy('created_at')
        .reverse()
        .limit(20)
        .toArray();
    }

    // Capitalizar para búsqueda consistente con el formato de almacenamiento
    const queryCapitalizado =
      queryNormalizado.charAt(0).toUpperCase() + queryNormalizado.slice(1);

    return await db.alimentos
      .where('nombre')
      .startsWith(queryCapitalizado)
      .limit(20)
      .toArray();
  } catch (error) {
    throw new Error(
      `[foods.db] Error al buscar alimentos con query="${query}": ${String(error)}`
    );
  }
}

/**
 * Lista todos los alimentos personalizados de un grupo SMAE específico.
 * Útil para el planificador: al asignar un equivalente de "verduras",
 * mostrar solo alimentos del grupo verduras.
 *
 * @param grupo_smae — Identificador del grupo SMAE.
 * @returns Alimentos del grupo, ordenados por nombre.
 * @throws Error si la lectura falla.
 *
 * @example
 *   const verduras = await listarPorGrupo('verduras');
 *   // → Alimentos personalizados del grupo verduras, A-Z
 */
export async function listarPorGrupo(grupo_smae: GrupoSMAE): Promise<AlimentoPersonalizado[]> {
  try {
    return await db.alimentos
      .where('grupo_smae')
      .equals(grupo_smae)
      .sortBy('nombre');
  } catch (error) {
    throw new Error(
      `[foods.db] Error al listar alimentos del grupo "${grupo_smae}": ${String(error)}`
    );
  }
}

/**
 * Recupera un alimento personalizado por su id.
 *
 * @param id — Clave primaria del alimento.
 * @returns El alimento o `undefined` si no existe.
 * @throws Error si la lectura falla.
 */
export async function obtenerAlimento(id: number): Promise<AlimentoPersonalizado | undefined> {
  try {
    return await db.alimentos.get(id);
  } catch (error) {
    throw new Error(
      `[foods.db] Error al obtener alimento id=${id}: ${String(error)}`
    );
  }
}

/**
 * Actualiza campos de un alimento personalizado.
 *
 * @param id   — Id del alimento.
 * @param data — Campos a actualizar.
 * @throws Error si el alimento no existe o si la escritura falla.
 *
 * @example
 *   // Corregir el valor energético después de verificar en el SMAE
 *   await actualizarAlimento(5, { energia_kcal: 195, fuente_datos: 'SMAE_2023' });
 */
export async function actualizarAlimento(
  id: number,
  data: Partial<NuevoAlimento>
): Promise<void> {
  try {
    const modificados = await db.alimentos.update(id, {
      ...data,
      updated_at: ahora(),
    });

    if (modificados === 0) {
      throw new Error(`Alimento personalizado id=${id} no encontrado`);
    }
  } catch (error) {
    throw new Error(
      `[foods.db] Error al actualizar alimento id=${id}: ${String(error)}`
    );
  }
}

/**
 * Elimina un alimento personalizado por su id.
 *
 * @param id — Id del alimento a eliminar.
 * @throws Error si la eliminación falla.
 *
 * @design
 *   No verifica si el alimento está en uso en algún plan.
 *   Esa validación debe hacerse en el hook/store que llame a esta función.
 *   En Fase 2, considerar marcar como inactivo en lugar de eliminar.
 */
export async function eliminarAlimento(id: number): Promise<void> {
  try {
    await db.alimentos.delete(id);
  } catch (error) {
    throw new Error(
      `[foods.db] Error al eliminar alimento id=${id}: ${String(error)}`
    );
  }
}

/**
 * Retorna el total de alimentos personalizados registrados.
 * Útil para mostrar estadísticas en el dashboard.
 *
 * @returns Número de alimentos personalizados.
 * @throws Error si la lectura falla.
 */
export async function contarAlimentos(): Promise<number> {
  try {
    return await db.alimentos.count();
  } catch (error) {
    throw new Error(
      `[foods.db] Error al contar alimentos: ${String(error)}`
    );
  }
}