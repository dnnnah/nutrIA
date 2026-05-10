/**
 * useRenal.test.ts — Tests unitarios del módulo de Nutrición Renal
 * Proyecto NUTRIA — Open Source
 *
 * Cada caso de prueba documenta:
 *   - El valor real esperado con su cálculo manual paso a paso.
 *   - La fuente bibliográfica que avala el valor de corte o fórmula.
 *
 * Runner: Vitest (import.meta.env disponible, no jest globals)
 */

import { describe, it, expect } from 'vitest';
import {
  calcularAjusteProteina,
  calcularFosforoProteina,
  calcularRemojo,
  calcularLiquidosRenal,
  calcularPRAL,
} from '../../src/hooks/useRenal';

// ===========================================================================
// 1. AJUSTE DE PROTEÍNAS POR ESTADIO ERC
// ===========================================================================

describe('calcularAjusteProteina — KDOQI 2020', () => {

  /**
   * CASO 1: Paciente adulto, ERC G3b, sin diálisis.
   *   TFG = 38 → estadio G3b → 0.6 g/kg/día
   *   Peso = 70 kg
   *   Gramos totales = 0.6 × 70 = 42.0 g/día
   *   Proteína actual = 55 g → alerta = true (supera límite)
   *
   * @source KDOQI 2020, Guideline 3.1.1: "We suggest lowering protein intake
   *   to 0.6-0.8 g/kg/day in adults with CKD G3-G5 not on dialysis."
   */
  it('G3b sin diálisis — prescripción 0.6 g/kg y alerta activa', () => {
    const r = calcularAjusteProteina({
      peso_kg:            70,
      tfg_ml_min:         38,
      en_dialisis:        false,
      proteina_actual_g:  55,
    });

    expect(r.estadio_erc).toBe('G3b');
    expect(r.gramos_por_kg).toBe(0.6);
    expect(r.gramos_totales).toBeCloseTo(42.0, 1);
    expect(r.alerta).toBe(true);
  });

  /**
   * CASO 2: Paciente en hemodiálisis, estadio G5D.
   *   TFG = 8 → estadio G5 → 1.2 g/kg/día (con diálisis)
   *   Peso = 60 kg
   *   Gramos totales = 1.2 × 60 = 72.0 g/día
   *   Proteína actual = 68 g → alerta = false (dentro del límite)
   *
   * @source KDOQI 2020, Guideline 5.1: "We recommend a protein intake of
   *   ≥ 1.2 g/kg/day for adults on maintenance hemodialysis."
   */
  it('G5 con hemodiálisis — prescripción 1.2 g/kg, sin alerta', () => {
    const r = calcularAjusteProteina({
      peso_kg:            60,
      tfg_ml_min:         8,
      en_dialisis:        true,
      proteina_actual_g:  68,
    });

    expect(r.estadio_erc).toBe('G5');
    expect(r.gramos_por_kg).toBe(1.2);
    expect(r.gramos_totales).toBeCloseTo(72.0, 1);
    expect(r.alerta).toBe(false);
  });

  /**
   * CASO 3: ERC G1 (función renal normal con marcadores de daño).
   *   TFG = 95 → estadio G1 → 0.8 g/kg/día sin diálisis
   *   Peso = 80 kg
   *   Gramos totales = 0.8 × 80 = 64.0 g/día
   *   Sin proteína actual → alerta = false por defecto
   */
  it('G1 sin diálisis y sin proteína actual — alerta false por defecto', () => {
    const r = calcularAjusteProteina({
      peso_kg:     80,
      tfg_ml_min:  95,
      en_dialisis: false,
    });

    expect(r.estadio_erc).toBe('G1');
    expect(r.gramos_por_kg).toBe(0.8);
    expect(r.gramos_totales).toBeCloseTo(64.0, 1);
    expect(r.alerta).toBe(false);
  });

  /**
   * CASO 4: Límite de TFG entre G3a y G3b.
   *   TFG = 45 → debería caer en G3a (≥ 45), no en G3b (< 45)
   *   Prescripción G3a sin diálisis = 0.8 g/kg/día
   */
  it('TFG exacta en límite 45 → G3a (no G3b)', () => {
    const r = calcularAjusteProteina({
      peso_kg:     65,
      tfg_ml_min:  45,
      en_dialisis: false,
    });

    expect(r.estadio_erc).toBe('G3a');
    expect(r.gramos_por_kg).toBe(0.8);
  });

  /**
   * CASO 5: TFG fuera de rango fisiológico → error controlado.
   */
  it('TFG = -1 lanza RangeError', () => {
    expect(() =>
      calcularAjusteProteina({ peso_kg: 70, tfg_ml_min: -1, en_dialisis: false })
    ).toThrow(RangeError);
  });
});

// ===========================================================================
// 2. RATIO FÓSFORO / PROTEÍNA
// ===========================================================================

describe('calcularFosforoProteina — Sullivan 2007 / Noori 2010', () => {

  /**
   * CASO 1: Clara de huevo cocida (referencia de fuente óptima)
   *   Fósforo ≈ 15 mg / 100g | Proteína ≈ 11 g / 100g
   *   Ratio = 15 / 11 ≈ 1.4 mg/g → clasificación: óptimo (< 12)
   *
   * @source Foerster EL. USDA FDC Food Data Central. 2023.
   */
  it('clara de huevo — ratio ≈ 1.4 mg/g → óptimo', () => {
    const r = calcularFosforoProteina({ fosforo_mg: 15, proteina_g: 11 });

    expect(r.ratio_mg_por_g).toBeCloseTo(1.4, 1);
    expect(r.clasificacion).toBe('optimo');
  });

  /**
   * CASO 2: Queso Cheddar (fuente límite / alta)
   *   Fósforo ≈ 512 mg / 100g | Proteína ≈ 25 g / 100g
   *   Ratio = 512 / 25 = 20.5 mg/g → clasificación: alto (> 16)
   */
  it('queso cheddar — ratio ≈ 20.5 mg/g → alto', () => {
    const r = calcularFosforoProteina({ fosforo_mg: 512, proteina_g: 25 });

    expect(r.ratio_mg_por_g).toBeCloseTo(20.5, 1);
    expect(r.clasificacion).toBe('alto');
  });

  /**
   * CASO 3: Pechuga de pollo (caso límite)
   *   Fósforo ≈ 210 mg / 100g | Proteína ≈ 31 g / 100g
   *   Ratio = 210 / 31 ≈ 6.8 mg/g → clasificación: óptimo
   */
  it('pechuga de pollo — ratio ≈ 6.8 mg/g → óptimo', () => {
    const r = calcularFosforoProteina({ fosforo_mg: 210, proteina_g: 31 });

    expect(r.ratio_mg_por_g).toBeCloseTo(6.8, 1);
    expect(r.clasificacion).toBe('optimo');
  });

  /**
   * CASO 4: Alimento en zona límite exacta
   *   Ratio = 12.0 → debería ser 'límite', no 'óptimo'
   */
  it('ratio exacto = 12.0 → límite', () => {
    const r = calcularFosforoProteina({ fosforo_mg: 120, proteina_g: 10 });

    expect(r.ratio_mg_por_g).toBeCloseTo(12.0, 1);
    expect(r.clasificacion).toBe('limite');
  });

  /**
   * CASO 5: Error — proteína cero lanza RangeError (división por cero protegida)
   */
  it('proteina_g = 0 → RangeError', () => {
    expect(() =>
      calcularFosforoProteina({ fosforo_mg: 100, proteina_g: 0 })
    ).toThrow(RangeError);
  });
});

// ===========================================================================
// 3. TÉCNICA DE REMOJO
// ===========================================================================

describe('calcularRemojo — Bethke 2008 / Burrowes 2006', () => {

  /**
   * CASO 1: Remojo simple de papa (100g cruda ≈ 420 mg K)
   *   Reducción remojo simple = 30%
   *   Potasio resultante = 420 × (1 − 0.30) = 294.0 mg
   *
   * @source Bethke PC & Jansky SH. J Food Sci. 2008;73(5):H80-H85.
   */
  it('papa — remojo simple → 294 mg K (reducción 30%)', () => {
    const r = calcularRemojo({ potasio_original_mg: 420, tecnica: 'remojo_simple' });

    expect(r.potasio_resultante_mg).toBeCloseTo(294.0, 1);
    expect(r.reduccion_porcentaje).toBe(30);
  });

  /**
   * CASO 2: Zanahoria con doble cocción (100g cruda ≈ 320 mg K)
   *   Reducción doble cocción = 50%
   *   Potasio resultante = 320 × 0.50 = 160.0 mg
   */
  it('zanahoria — doble cocción → 160 mg K (reducción 50%)', () => {
    const r = calcularRemojo({ potasio_original_mg: 320, tecnica: 'doble_coccion' });

    expect(r.potasio_resultante_mg).toBeCloseTo(160.0, 1);
    expect(r.reduccion_porcentaje).toBe(50);
  });

  /**
   * CASO 3: Frijol negro con remojo + doble cocción (100g crudo ≈ 1480 mg K)
   *   Reducción remojo + doble cocción = 70%
   *   Potasio resultante = 1480 × 0.30 = 444.0 mg
   *
   * @source Burrowes JD & Ramer NJ. J Ren Nutr. 2006;16(4):304-311.
   */
  it('frijol negro — remojo + doble cocción → 444 mg K (reducción 70%)', () => {
    const r = calcularRemojo({
      potasio_original_mg: 1480,
      tecnica:             'remojo_doble_coccion',
    });

    expect(r.potasio_resultante_mg).toBeCloseTo(444.0, 1);
    expect(r.reduccion_porcentaje).toBe(70);
  });
});

// ===========================================================================
// 4. BALANCE DE LÍQUIDOS RENAL
// ===========================================================================

describe('calcularLiquidosRenal — Kopple & Massry 2013', () => {

  /**
   * CASO 1: Paciente oligúrico con agua endógena incluida.
   *   Diuresis 24h = 600 mL
   *   + Pérdidas insensibles = 500 mL
   *   + Agua endógena = 300 mL
   *   Total permitido = 1400 mL/día
   */
  it('diuresis 600 mL + agua endógena → permitido 1400 mL', () => {
    const r = calcularLiquidosRenal({
      diuresis_ml_24h:       600,
      incluir_agua_endogena: true,
    });

    expect(r.volumen_permitido_ml).toBe(1400);
    expect(r.agua_endogena_ml).toBe(300);
  });

  /**
   * CASO 2: Anuria (diuresis = 0) sin agua endógena.
   *   Total permitido = 0 + 500 = 500 mL/día
   *   Escenario clásico en hemodiálisis entre sesiones.
   */
  it('anuria sin agua endógena → permitido 500 mL', () => {
    const r = calcularLiquidosRenal({
      diuresis_ml_24h:       0,
      incluir_agua_endogena: false,
    });

    expect(r.volumen_permitido_ml).toBe(500);
    expect(r.agua_endogena_ml).toBe(0);
  });

  /**
   * CASO 3: Paciente con función renal parcial, sin agua endógena.
   *   Diuresis 24h = 1200 mL
   *   + Pérdidas insensibles = 500 mL
   *   Total = 1700 mL/día
   */
  it('diuresis 1200 mL sin agua endógena → permitido 1700 mL', () => {
    const r = calcularLiquidosRenal({
      diuresis_ml_24h:       1200,
      incluir_agua_endogena: false,
    });

    expect(r.volumen_permitido_ml).toBe(1700);
  });
});

// ===========================================================================
// 5. PRAL SCORE
// ===========================================================================

describe('calcularPRAL — Remer & Manz 1995', () => {

  /**
   * CASO 1: Manzana (referencia clásica de alimento alcalinizante)
   *   Por 100g: proteína 0.3g | fósforo 11mg | potasio 107mg | calcio 6mg | magnesio 5mg
   *
   *   PRAL = (0.49×0.3) + (0.037×11) − (0.021×107) − (0.026×6) − (0.026×5)
   *        = 0.147 + 0.407 − 2.247 − 0.156 − 0.130
   *        = −1.979 mEq/día → alcalinizante
   *
   * @source Remer T & Manz F. J Am Diet Assoc. 1995;95(7):791-797.
   *   (Tabla 1 — valores de referencia publicados por los autores)
   */
  it('manzana 100g → PRAL ≈ −1.98 mEq → alcalinizante', () => {
    const r = calcularPRAL({
      proteina_g:  0.3,
      fosforo_mg:  11,
      potasio_mg:  107,
      calcio_mg:   6,
      magnesio_mg: 5,
    });

    expect(r.pral_meq_dia).toBeCloseTo(-1.98, 1);
    expect(r.clasificacion).toBe('alcalinizante');
  });

  /**
   * CASO 2: Queso parmesano (referencia de alimento altamente acidificante)
   *   Por 100g: proteína 35.8g | fósforo 694mg | potasio 92mg | calcio 1184mg | magnesio 44mg
   *
   *   PRAL = (0.49×35.8) + (0.037×694) − (0.021×92) − (0.026×1184) − (0.026×44)
   *        = 17.542 + 25.678 − 1.932 − 30.784 − 1.144
   *        = 9.36 mEq/día → acidificante
   */
  it('queso parmesano 100g → PRAL ≈ 9.36 mEq → acidificante', () => {
    const r = calcularPRAL({
      proteina_g:  35.8,
      fosforo_mg:  694,
      potasio_mg:  92,
      calcio_mg:   1184,
      magnesio_mg: 44,
    });

    expect(r.pral_meq_dia).toBeCloseTo(9.36, 0);
    expect(r.clasificacion).toBe('acidificante');
  });

  /**
   * CASO 3: Alimento sintético con PRAL = 0 (zona neutra)
   *   Diseñado para que el resultado sea exactamente 0.
   *   proteína 2g, fósforo 0mg, potasio 46.7mg, calcio 0mg, magnesio 0mg
   *   PRAL = (0.49×2) + 0 − (0.021×46.7) − 0 − 0 = 0.98 − 0.98 = 0.00 → neutro
   */
  it('PRAL calculado ~ 0 → clasificación neutro', () => {
    const r = calcularPRAL({
      proteina_g:  2,
      fosforo_mg:  0,
      potasio_mg:  46.67, // 0.021 × 46.67 ≈ 0.98 = 0.49×2
      calcio_mg:   0,
      magnesio_mg: 0,
    });

    expect(Math.abs(r.pral_meq_dia)).toBeLessThanOrEqual(0.05);
    expect(r.clasificacion).toBe('neutro');
  });

  /**
   * CASO 4: Validación de clasificación en el límite exacto PRAL = 1.0
   *   Resultado > 1 → acidificante | resultado ≤ 1 → neutro
   */
  it('PRAL = 1.0 → clasificación neutro (borde incluido)', () => {
    // proteína = 2.041g, resto 0 → PRAL = 0.49 × 2.041 ≈ 1.0
    const r = calcularPRAL({
      proteina_g:  2.041,
      fosforo_mg:  0,
      potasio_mg:  0,
      calcio_mg:   0,
      magnesio_mg: 0,
    });

    expect(r.pral_meq_dia).toBeCloseTo(1.0, 1);
    expect(r.clasificacion).toBe('neutro');
  });

  /**
   * CASO 5: Valores fuera de rango → RangeError
   */
  it('potasio_mg negativo → RangeError', () => {
    expect(() =>
      calcularPRAL({
        proteina_g:  10,
        fosforo_mg:  100,
        potasio_mg:  -1,
        calcio_mg:   50,
        magnesio_mg: 20,
      })
    ).toThrow(RangeError);
  });
});