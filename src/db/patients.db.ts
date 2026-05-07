/**
 * @file src/db/patients.db.ts
 * @description Capa de acceso a datos para la tabla `pacientes`.
 *   Provee CRUD completo con manejo de timestamps automático.
 *   No contiene lógica de UI ni de negocio clínico.
 *
 * @design
 *   - Cada función es async/await con try/catch explícito.
 *   - `created_at` se asigna solo en creación; `updated_at` en cada write.
 *   - Los errores se re-lanzan tipados para que la capa superior
 *     (hook o store) decida cómo manejarlos (toast, retry, etc.).
 *
 * @source Dexie.js Table API — https://dexie.org/docs/Table/Table
 */

import { db, ahora, type Paciente } from './schema';

// ─────────────────────────────────────────────
// TIPOS DE ENTRADA
// ─────────────────────────────────────────────

/**
 * Datos requeridos para crear un paciente.
 * Se omiten id, created_at y updated_at — los gestiona esta capa.
 */
type NuevoPaciente = Omit<Paciente, 'id' | 'created_at' | 'updated_at'>;

/**
 * Datos permitidos para actualizar un paciente.
 * No se puede cambiar id ni created_at; updated_at es automático.
 */
type ActualizacionPaciente = Partial<Omit<Paciente, 'id' | 'created_at' | 'updated_at'>>;

// ─────────────────────────────────────────────
// OPERACIONES CRUD
// ─────────────────────────────────────────────

/**
 * Crea un nuevo paciente en IndexedDB.
 *
 * @param data — Campos del paciente sin metadatos de persistencia.
 * @returns El paciente completo con id y timestamps asignados.
 * @throws Error si la escritura falla (disco lleno, esquema inválido, etc.)
 *
 * @example
 *   const paciente = await crearPaciente({
 *     nombre: 'María',
 *     apellido_paterno: 'García',
 *     fecha_nacimiento: '1990-03-15',
 *     sexo: 'femenino',
 *   });
 */
export async function crearPaciente(data: NuevoPaciente): Promise<Paciente> {
  const timestamp = ahora();

  const nuevoPaciente: Paciente = {
    ...data,
    created_at: timestamp,
    updated_at: timestamp,
  };

  try {
    // Dexie retorna el id autoincremental asignado
    const id = await db.pacientes.add(nuevoPaciente);
    return { ...nuevoPaciente, id };
  } catch (error) {
    throw new Error(
      `[patients.db] Error al crear paciente: ${String(error)}`
    );
  }
}

/**
 * Recupera un paciente por su id.
 *
 * @param id — Clave primaria del paciente.
 * @returns El paciente si existe, `undefined` si no se encontró.
 * @throws Error si la lectura falla por razón técnica (IndexedDB corrupto, etc.)
 *
 * @example
 *   const paciente = await obtenerPaciente(42);
 *   if (!paciente) { // Manejar no-encontrado }
 */
export async function obtenerPaciente(id: number): Promise<Paciente | undefined> {
  try {
    return await db.pacientes.get(id);
  } catch (error) {
    throw new Error(
      `[patients.db] Error al obtener paciente id=${id}: ${String(error)}`
    );
  }
}

/**
 * Lista todos los pacientes ordenados por nombre ascendente.
 *
 * @returns Array de pacientes (vacío si no hay ninguno).
 * @throws Error si la lectura falla.
 *
 * @design
 *   Se usa `.orderBy('nombre')` en lugar de `.toArray()` para
 *   aprovechar el índice y evitar ordenamiento en memoria.
 *   En producción con >500 pacientes, agregar paginación.
 */
export async function listarPacientes(): Promise<Paciente[]> {
  try {
    return await db.pacientes.orderBy('nombre').toArray();
  } catch (error) {
    throw new Error(
      `[patients.db] Error al listar pacientes: ${String(error)}`
    );
  }
}

/**
 * Actualiza campos específicos de un paciente.
 * Actualiza `updated_at` automáticamente.
 *
 * @param id   — Id del paciente a actualizar.
 * @param data — Campos a modificar (solo los que cambian).
 * @throws Error si el paciente no existe o si la escritura falla.
 *
 * @example
 *   await actualizarPaciente(42, { telefono: '55-1234-5678' });
 */
export async function actualizarPaciente(
  id: number,
  data: ActualizacionPaciente
): Promise<void> {
  try {
    const modificados = await db.pacientes.update(id, {
      ...data,
      updated_at: ahora(),
    });

    // Dexie retorna 0 si no encontró el registro
    if (modificados === 0) {
      throw new Error(`Paciente id=${id} no encontrado`);
    }
  } catch (error) {
    throw new Error(
      `[patients.db] Error al actualizar paciente id=${id}: ${String(error)}`
    );
  }
}

/**
 * Elimina un paciente por su id.
 *
 * @param id — Id del paciente a eliminar.
 * @throws Error si la eliminación falla.
 *
 * @design
 *   IMPORTANTE: Esta función NO elimina las consultas ni planes
 *   asociados al paciente (no hay ON DELETE CASCADE en IndexedDB).
 *   La lógica de eliminación en cascada debe implementarse en el
 *   hook o store que llame a esta función. Ejemplo:
 *
 *   await eliminarConsultasDePaciente(id);  // plans.db.ts
 *   await eliminarPaciente(id);
 *
 * @warning Esta operación es irreversible en Fase 1 (sin Supabase).
 */
export async function eliminarPaciente(id: number): Promise<void> {
  try {
    await db.pacientes.delete(id);
  } catch (error) {
    throw new Error(
      `[patients.db] Error al eliminar paciente id=${id}: ${String(error)}`
    );
  }
}

/**
 * Busca pacientes cuyo nombre comience con la cadena dada.
 * Útil para el campo de búsqueda del listado de pacientes.
 *
 * @param query — Texto de búsqueda (insensible a mayúsculas).
 * @returns Pacientes cuyo nombre empieza con `query`.
 *
 * @design
 *   Dexie `.startsWith()` usa el índice de `nombre` eficientemente.
 *   Limitación: solo busca por prefijo, no substring completo.
 *   Si se necesita búsqueda fuzzy en el futuro, considerar
 *   un índice compuesto o Fuse.js sobre el array ya cargado.
 *
 * @example
 *   const resultados = await buscarPacientes('Mar'); // María, Marcos...
 */
export async function buscarPacientes(query: string): Promise<Paciente[]> {
  try {
    const queryNormalizado = query.trim().toLowerCase();

    if (queryNormalizado === '') {
      return listarPacientes();
    }

    // Capitalizar para que coincida con la forma en que se guarda el nombre
    const queryCapitalizado =
      queryNormalizado.charAt(0).toUpperCase() + queryNormalizado.slice(1);

    return await db.pacientes
      .where('nombre')
      .startsWith(queryCapitalizado)
      .toArray();
  } catch (error) {
    throw new Error(
      `[patients.db] Error al buscar pacientes con query="${query}": ${String(error)}`
    );
  }
}