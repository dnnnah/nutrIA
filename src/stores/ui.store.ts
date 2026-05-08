/**
 * ui.store.ts — Store de estado UI transversal
 * Proyecto NUTRIA — Open Source
 *
 * Almacena estado compartido entre páginas que no pertenece
 * a ningún dominio clínico específico.
 *
 * Caso de uso principal en v1:
 *   Calculator → guarda get_calculado → Planner lo lee al montar.
 *
 * @module ui.store
 */

import { create } from 'zustand';

// ===========================================================================
// TIPOS
// ===========================================================================

interface UIState {
  /** GET calculado en Calculator — null si aún no se ha calculado */
  get_calculado: number | null;
  /** Fórmula usada en el último cálculo (para mostrar en Planner) */
  formula_get_usada: string | null;
}

interface UIActions {
  /** Guarda el GET calculado para pasarlo al Planner */
  setGetCalculado: (kcal: number, formula: string) => void;
  /** Limpia el GET guardado */
  clearGetCalculado: () => void;
}

// ===========================================================================
// STORE
// ===========================================================================

const ESTADO_INICIAL: UIState = {
  get_calculado:     null,
  formula_get_usada: null,
};

export const useUIStore = create<UIState & UIActions>((set) => ({
  ...ESTADO_INICIAL,

  setGetCalculado: (kcal: number, formula: string) => {
    set({ get_calculado: kcal, formula_get_usada: formula });
  },

  clearGetCalculado: () => {
    set({ get_calculado: null, formula_get_usada: null });
  },
}));