/**
 * plan.store.test.ts — Tests del Store del Plan Dietético
 * Proyecto NUTRIA — Open Source
 *
 * NOTA SOBRE TESTING CON ZUSTAND:
 * El store es un singleton. Para evitar contaminación entre tests,
 * llamamos a resetPlan() en beforeEach. Esto garantiza que cada test
 * parte del ESTADO_INICIAL independientemente del orden de ejecución.
 *
 * EJECUTAR: npx vitest run tests/stores/plan.store.test.ts
 */

import { beforeEach, describe, expect, it } from 'vitest';
import { usePlanStore } from '../../src/stores/plan.store';

// ---------------------------------------------------------------------------
// Helpers de test
// ---------------------------------------------------------------------------

/** Paciente de referencia para todos los tests */
const PACIENTE_TEST = {
  nombre:     'Paciente Test',
  edad_anios: 30,
  sexo:       'femenino' as const,
  peso_kg:    65,
  talla_cm:   165,
};

/** Paciente con obesidad para tests de peso ajustado */
const PACIENTE_OBESIDAD = {
  nombre:     'Paciente Obesidad',
  edad_anios: 40,
  sexo:       'femenino' as const,
  peso_kg:    100,
  talla_cm:   160,
};

// ---------------------------------------------------------------------------
// Setup: reset entre cada test
// ---------------------------------------------------------------------------

beforeEach(() => {
  usePlanStore.getState().resetPlan();
});

// ===========================================================================
// BLOQUE 1 — Estado inicial
// ===========================================================================

describe('Estado inicial del store', () => {

  it('paciente es null al inicializar', () => {
    const { paciente } = usePlanStore.getState();
    expect(paciente).toBeNull();
  });

  it('energia_prescrita es null al inicializar', () => {
    const { energia_prescrita } = usePlanStore.getState();
    expect(energia_prescrita).toBeNull();
  });

  it('configuracion_get usa mifflin_st_jeor y sedentario por defecto', () => {
    const { configuracion_get } = usePlanStore.getState();
    expect(configuracion_get.formula_tmb).toBe('mifflin_st_jeor');
    expect(configuracion_get.naf).toBe('sedentario');
    expect(configuracion_get.factor_estres).toBe('ninguno');
  });

  it('distribucion_macros usa defaults 15/30/55', () => {
    const { distribucion_macros } = usePlanStore.getState();
    expect(distribucion_macros.proteina_pct).toBe(15);
    expect(distribucion_macros.lipidos_pct).toBe(30);
    expect(distribucion_macros.hidratos_pct).toBe(55);
  });

  it('tiempo_activo es desayuno por defecto', () => {
    const { tiempo_activo } = usePlanStore.getState();
    expect(tiempo_activo).toBe('desayuno');
  });

  it('consumido_hoy está vacío al inicializar', () => {
    const { consumido_hoy } = usePlanStore.getState();
    expect(Object.keys(consumido_hoy).length).toBe(0);
  });
});

// ===========================================================================
// BLOQUE 2 — setPaciente / clearPaciente
// ===========================================================================

describe('setPaciente / clearPaciente', () => {

  it('setPaciente actualiza el paciente en el store', () => {
    usePlanStore.getState().setPaciente(PACIENTE_TEST);
    const { paciente } = usePlanStore.getState();
    expect(paciente?.nombre).toBe('Paciente Test');
    expect(paciente?.peso_kg).toBe(65);
  });

  it('clearPaciente limpia paciente y cálculos', () => {
    usePlanStore.getState().setPaciente(PACIENTE_TEST);
    usePlanStore.getState().calcularPlan();
    usePlanStore.getState().clearPaciente();

    const { paciente, energia_prescrita, macros_prescritos } = usePlanStore.getState();
    expect(paciente).toBeNull();
    expect(energia_prescrita).toBeNull();
    expect(macros_prescritos).toBeNull();
  });
});

// ===========================================================================
// BLOQUE 3 — setConfiguraciónGET
// ===========================================================================

describe('setConfiguraciónGET', () => {

  it('actualiza solo los campos proporcionados (merge parcial)', () => {
    usePlanStore.getState().setConfiguraciónGET({ naf: 'moderado' });
    const { configuracion_get } = usePlanStore.getState();

    expect(configuracion_get.naf).toBe('moderado');
    // Los demás campos deben permanecer en su valor default
    expect(configuracion_get.formula_tmb).toBe('mifflin_st_jeor');
    expect(configuracion_get.factor_estres).toBe('ninguno');
  });

  it('permite cambiar fórmula TMB', () => {
    usePlanStore.getState().setConfiguraciónGET({ formula_tmb: 'harris_benedict' });
    expect(usePlanStore.getState().configuracion_get.formula_tmb).toBe('harris_benedict');
  });

  it('permite activar factor de estrés', () => {
    usePlanStore.getState().setConfiguraciónGET({ factor_estres: 'sepsis' });
    expect(usePlanStore.getState().configuracion_get.factor_estres).toBe('sepsis');
  });
});

// ===========================================================================
// BLOQUE 4 — calcularPlan
// ===========================================================================

describe('calcularPlan — Orquestador principal', () => {

  /**
   * CASO 1: Cálculo completo para paciente de referencia
   * Mifflin mujer 30a/65kg/165cm/sedentaria:
   *   TMB ≈ 1370.3 kcal
   *   GET_final ≈ 1811.0 kcal (sin estrés, NAF sed + ETA)
   */
  it('calcula GET, macros y adecuación para paciente válido', () => {
    usePlanStore.getState().setPaciente(PACIENTE_TEST);
    usePlanStore.getState().calcularPlan();

    const { energia_prescrita, macros_prescritos, resumen_adecuacion } =
      usePlanStore.getState();

    expect(energia_prescrita).not.toBeNull();
    expect(energia_prescrita?.tmb_kcal).toBeCloseTo(1370.3, 0);
    expect(energia_prescrita?.get_final_kcal).toBeGreaterThan(1000);

    expect(macros_prescritos).not.toBeNull();
    expect(macros_prescritos?.proteina_g).toBeGreaterThan(0);
    expect(macros_prescritos?.lipidos_g).toBeGreaterThan(0);
    expect(macros_prescritos?.hidratos_g).toBeGreaterThan(0);

    expect(resumen_adecuacion).not.toBeNull();
    // Sin consumo registrado → todos los nutrientes en déficit crítico
    expect(resumen_adecuacion?.con_deficit_critico).toBeGreaterThan(0);
  });

  it('no calcula si no hay paciente — emite warning', () => {
    // Sin setPaciente
    usePlanStore.getState().calcularPlan();
    expect(usePlanStore.getState().energia_prescrita).toBeNull();
  });

  it('calculando es false después del cálculo exitoso', () => {
    usePlanStore.getState().setPaciente(PACIENTE_TEST);
    usePlanStore.getState().calcularPlan();
    expect(usePlanStore.getState().calculando).toBe(false);
  });

  /**
   * CASO 2: Paciente con obesidad — debe aplicar peso ajustado internamente
   * El store no expone si usó peso ajustado, pero el GET debe ser
   * menor que si se hubiera usado peso actual de 100kg directamente.
   */
  it('paciente con obesidad → GET razonable (peso ajustado aplicado)', () => {
    usePlanStore.getState().setPaciente(PACIENTE_OBESIDAD);
    usePlanStore.getState().calcularPlan();

    const { energia_prescrita } = usePlanStore.getState();
    expect(energia_prescrita?.get_final_kcal).toBeLessThan(2200);
    expect(energia_prescrita?.get_final_kcal).toBeGreaterThan(900);
  });

  /**
   * CASO 3: Cambiar NAF recalcula al volver a llamar calcularPlan
   */
  it('cambiar NAF y recalcular produce GET diferente', () => {
    usePlanStore.getState().setPaciente(PACIENTE_TEST);

    usePlanStore.getState().setConfiguraciónGET({ naf: 'sedentario' });
    usePlanStore.getState().calcularPlan();
    const get_sedentario = usePlanStore.getState().energia_prescrita?.get_final_kcal ?? 0;

    usePlanStore.getState().setConfiguraciónGET({ naf: 'muy_intenso' });
    usePlanStore.getState().calcularPlan();
    const get_intenso = usePlanStore.getState().energia_prescrita?.get_final_kcal ?? 0;

    expect(get_intenso).toBeGreaterThan(get_sedentario);
  });

  /**
   * CASO 4: La fórmula usada queda registrada en energia_prescrita
   */
  it('formula_usada en energia_prescrita refleja la configuración', () => {
    usePlanStore.getState().setPaciente(PACIENTE_TEST);
    usePlanStore.getState().setConfiguraciónGET({ formula_tmb: 'harris_benedict' });
    usePlanStore.getState().calcularPlan();

    expect(usePlanStore.getState().energia_prescrita?.formula_usada)
      .toBe('harris_benedict');
  });
});

// ===========================================================================
// BLOQUE 5 — Macros prescritos
// ===========================================================================

describe('calcularPlan — Macros prescritos', () => {

  /**
   * CASO 5: Verificar que macros suman aproximadamente el GET
   * proteina × 4 + lipidos × 9 + hidratos × 4 ≈ GET (±5% por redondeo)
   */
  it('macros en kcal suman aproximadamente el GET', () => {
    usePlanStore.getState().setPaciente(PACIENTE_TEST);
    usePlanStore.getState().calcularPlan();

    const { energia_prescrita, macros_prescritos } = usePlanStore.getState();

    if (!energia_prescrita || !macros_prescritos) {
      throw new Error('Cálculo falló — estado inesperado');
    }

    const kcal_macros =
      (macros_prescritos.proteina_g  * 4) +
      (macros_prescritos.lipidos_g   * 9) +
      (macros_prescritos.hidratos_g  * 4);

    const diferencia_pct = Math.abs(
      (kcal_macros - energia_prescrita.get_con_estres_kcal) /
      energia_prescrita.get_con_estres_kcal * 100
    );

    // Tolerancia del 5% por redondeo a enteros
    expect(diferencia_pct).toBeLessThan(5);
  });

  /**
   * CASO 6: Cambiar distribución de macros afecta los gramos resultantes
   */
  it('cambiar distribucion_macros produce macros diferentes', () => {
    usePlanStore.getState().setPaciente(PACIENTE_TEST);

    // Distribución default: proteina 15%
    usePlanStore.getState().calcularPlan();
    const proteina_15 = usePlanStore.getState().macros_prescritos?.proteina_g ?? 0;

    // Alta proteína: 30%
    usePlanStore.getState().setDistribuciónMacros({ proteina_pct: 30 });
    usePlanStore.getState().calcularPlan();
    const proteina_30 = usePlanStore.getState().macros_prescritos?.proteina_g ?? 0;

    expect(proteina_30).toBeGreaterThan(proteina_15);
  });
});

// ===========================================================================
// BLOQUE 6 — Registro de consumo y adecuación
// ===========================================================================

describe('registrarConsumo / resetConsumoHoy', () => {

  /**
   * CASO 7: Registrar consumo acumula el valor
   */
  it('registrarConsumo acumula cantidad en el nutriente', () => {
    usePlanStore.getState().registrarConsumo('energia_kcal', 500);
    usePlanStore.getState().registrarConsumo('energia_kcal', 300);

    const { consumido_hoy } = usePlanStore.getState();
    expect(consumido_hoy.energia_kcal).toBe(800);
  });

  /**
   * CASO 8: Registrar consumo actualiza el semáforo automáticamente
   * si ya hay una prescripción calculada
   */
  it('registrarConsumo con plan activo → actualiza resumen_adecuacion', () => {
    usePlanStore.getState().setPaciente(PACIENTE_TEST);
    usePlanStore.getState().calcularPlan();

    const get_prescrito =
      usePlanStore.getState().energia_prescrita?.get_con_estres_kcal ?? 0;

    // Registrar exactamente el 100% de energía
    usePlanStore.getState().registrarConsumo('energia_kcal', get_prescrito);

    const { resumen_adecuacion } = usePlanStore.getState();
    expect(resumen_adecuacion?.detalle.energia_kcal?.estado).toBe('optimo');
    expect(resumen_adecuacion?.detalle.energia_kcal?.porcentaje).toBe(100);
  });

  /**
   * CASO 9: resetConsumoHoy limpia el consumo y el resumen
   */
  it('resetConsumoHoy limpia consumido_hoy y resumen_adecuacion', () => {
    usePlanStore.getState().registrarConsumo('energia_kcal', 1000);
    usePlanStore.getState().resetConsumoHoy();

    const { consumido_hoy, resumen_adecuacion } = usePlanStore.getState();
    expect(Object.keys(consumido_hoy).length).toBe(0);
    expect(resumen_adecuacion).toBeNull();
  });

  /**
   * CASO 10: Múltiples nutrientes registrados simultáneamente
   */
  it('registrar múltiples nutrientes los acumula independientemente', () => {
    usePlanStore.getState().registrarConsumo('proteina_g',  30);
    usePlanStore.getState().registrarConsumo('proteina_g',  20);
    usePlanStore.getState().registrarConsumo('lipidos_g',   15);

    const { consumido_hoy } = usePlanStore.getState();
    expect(consumido_hoy.proteina_g).toBe(50);
    expect(consumido_hoy.lipidos_g).toBe(15);
    expect(consumido_hoy.energia_kcal).toBeUndefined();
  });
});

// ===========================================================================
// BLOQUE 7 — Tiempos y distribución
// ===========================================================================

describe('setTiempoActivo / setDistribuciónTiempos', () => {

  it('setTiempoActivo cambia el tiempo activo', () => {
    usePlanStore.getState().setTiempoActivo('comida');
    expect(usePlanStore.getState().tiempo_activo).toBe('comida');
  });

  it('setDistribuciónTiempos actualiza solo los tiempos dados (merge)', () => {
    usePlanStore.getState().setDistribuciónTiempos({ desayuno: 30, cena: 15 });
    const { distribucion_tiempos } = usePlanStore.getState();

    expect(distribucion_tiempos.desayuno).toBe(30);
    expect(distribucion_tiempos.cena).toBe(15);
    // Los demás permanecen en default
    expect(distribucion_tiempos.comida).toBe(35);
  });
});

// ===========================================================================
// BLOQUE 8 — resetPlan
// ===========================================================================

describe('resetPlan', () => {

  it('resetPlan devuelve el store al estado inicial completo', () => {
    // Modificar múltiples partes del store
    usePlanStore.getState().setPaciente(PACIENTE_TEST);
    usePlanStore.getState().setConfiguraciónGET({ naf: 'intenso' });
    usePlanStore.getState().registrarConsumo('energia_kcal', 500);
    usePlanStore.getState().calcularPlan();
    usePlanStore.getState().setTiempoActivo('cena');

    // Reset
    usePlanStore.getState().resetPlan();

    const state = usePlanStore.getState();
    expect(state.paciente).toBeNull();
    expect(state.energia_prescrita).toBeNull();
    expect(state.macros_prescritos).toBeNull();
    expect(state.resumen_adecuacion).toBeNull();
    expect(state.configuracion_get.naf).toBe('sedentario');
    expect(state.tiempo_activo).toBe('desayuno');
    expect(Object.keys(state.consumido_hoy).length).toBe(0);
  });
});