/**
 * useAdequacy.test.ts — Tests Unitarios del Motor de Adecuación
 * Proyecto NUTRIA — Open Source
 *
 * EJECUTAR: npx vitest run tests/hooks/useAdequacy.test.ts
 */

import { describe, it, expect } from 'vitest';
import {
  calcularAdecuación,
  getColorSemáforo,
  evaluarPlan,
  generarResumen,
} from '../../src/hooks/useAdequacy';

// ===========================================================================
// BLOQUE 1 — calcularAdecuación (1 nutriente)
// ===========================================================================

describe('calcularAdecuación — Semáforo por nutriente', () => {

  // --- ZONA VERDE (optimo) ---

  /**
   * CASO 1: 100% exacto → optimo
   * 2000/2000 × 100 = 100%
   */
  it('consumido=prescrito → 100% — optimo — verde', () => {
    const r = calcularAdecuación({ prescrito: 2000, consumido: 2000 });
    expect(r.porcentaje).toBe(100);
    expect(r.estado).toBe('optimo');
    expect(r.color).toBe('verde');
    expect(r.diferencia).toBe(0);
  });

  /**
   * CASO 2: Límite inferior verde (95%)
   * 1900/2000 × 100 = 95%
   */
  it('1900/2000 → 95% — optimo (límite inferior)', () => {
    const r = calcularAdecuación({ prescrito: 2000, consumido: 1900 });
    expect(r.porcentaje).toBe(95);
    expect(r.estado).toBe('optimo');
    expect(r.color).toBe('verde');
  });

  /**
   * CASO 3: Límite superior verde (105%)
   * 2100/2000 × 100 = 105%
   */
  it('2100/2000 → 105% — optimo (límite superior)', () => {
    const r = calcularAdecuación({ prescrito: 2000, consumido: 2100 });
    expect(r.porcentaje).toBe(105);
    expect(r.estado).toBe('optimo');
    expect(r.color).toBe('verde');
  });

  // --- ZONA AMARILLA (leve) ---

  /**
   * CASO 4: Déficit leve (92.5%)
   * 1850/2000 × 100 = 92.5%
   */
  it('1850/2000 → 92.5% — deficit_leve — amarillo', () => {
    const r = calcularAdecuación({ prescrito: 2000, consumido: 1850 });
    expect(r.porcentaje).toBe(92.5);
    expect(r.estado).toBe('deficit_leve');
    expect(r.color).toBe('amarillo');
    expect(r.diferencia).toBe(-150);
  });

  /**
   * CASO 5: Límite inferior amarillo déficit (90%)
   * 1800/2000 × 100 = 90%
   */
  it('1800/2000 → 90% — deficit_leve (límite inferior)', () => {
    const r = calcularAdecuación({ prescrito: 2000, consumido: 1800 });
    expect(r.porcentaje).toBe(90);
    expect(r.estado).toBe('deficit_leve');
    expect(r.color).toBe('amarillo');
  });

  /**
   * CASO 6: Límite superior amarillo déficit (94%)
   * 1880/2000 × 100 = 94%
   */
  it('1880/2000 → 94% — deficit_leve (límite superior)', () => {
    const r = calcularAdecuación({ prescrito: 2000, consumido: 1880 });
    expect(r.porcentaje).toBe(94);
    expect(r.estado).toBe('deficit_leve');
  });

  /**
   * CASO 7: Exceso leve (108%)
   * 2160/2000 × 100 = 108%
   */
  it('2160/2000 → 108% — exceso_leve — amarillo', () => {
    const r = calcularAdecuación({ prescrito: 2000, consumido: 2160 });
    expect(r.porcentaje).toBe(108);
    expect(r.estado).toBe('exceso_leve');
    expect(r.color).toBe('amarillo');
    expect(r.diferencia).toBe(160);
  });

  /**
   * CASO 8: Límite superior amarillo exceso (110%)
   * 2200/2000 × 100 = 110%
   */
  it('2200/2000 → 110% — exceso_leve (límite superior)', () => {
    const r = calcularAdecuación({ prescrito: 2000, consumido: 2200 });
    expect(r.porcentaje).toBe(110);
    expect(r.estado).toBe('exceso_leve');
    expect(r.color).toBe('amarillo');
  });

  // --- ZONA ROJA (critico) ---

  /**
   * CASO 9: Déficit crítico (85%)
   * 1700/2000 × 100 = 85%
   */
  it('1700/2000 → 85% — deficit_critico — rojo', () => {
    const r = calcularAdecuación({ prescrito: 2000, consumido: 1700 });
    expect(r.porcentaje).toBe(85);
    expect(r.estado).toBe('deficit_critico');
    expect(r.color).toBe('rojo');
  });

  /**
   * CASO 10: Límite rojo déficit (89.9%)
   * 1798/2000 × 100 = 89.9%
   */
  it('1798/2000 → 89.9% — deficit_critico (justo bajo el límite)', () => {
    const r = calcularAdecuación({ prescrito: 2000, consumido: 1798 });
    expect(r.porcentaje).toBe(89.9);
    expect(r.estado).toBe('deficit_critico');
    expect(r.color).toBe('rojo');
  });

  /**
   * CASO 11: Exceso crítico (115%)
   * 2300/2000 × 100 = 115%
   */
  it('2300/2000 → 115% — exceso_critico — rojo', () => {
    const r = calcularAdecuación({ prescrito: 2000, consumido: 2300 });
    expect(r.porcentaje).toBe(115);
    expect(r.estado).toBe('exceso_critico');
    expect(r.color).toBe('rojo');
  });

  /**
   * CASO 12: Consumido = 0 → 0% → deficit_critico
   * Paciente que no consumió nada (ayuno total)
   */
  it('consumido=0 → 0% — deficit_critico — rojo', () => {
    const r = calcularAdecuación({ prescrito: 2000, consumido: 0 });
    expect(r.porcentaje).toBe(0);
    expect(r.estado).toBe('deficit_critico');
    expect(r.color).toBe('rojo');
  });

  // --- EDGE CASES ---

  it('lanza RangeError si prescrito = 0', () => {
    expect(() =>
      calcularAdecuación({ prescrito: 0, consumido: 100 })
    ).toThrow(RangeError);
  });

  it('lanza RangeError si prescrito es negativo', () => {
    expect(() =>
      calcularAdecuación({ prescrito: -100, consumido: 50 })
    ).toThrow(RangeError);
  });

  it('lanza TypeError si consumido es NaN', () => {
    expect(() =>
      calcularAdecuación({ prescrito: 2000, consumido: NaN })
    ).toThrow(TypeError);
  });

  it('resultado es inmutable', () => {
    const r = calcularAdecuación({ prescrito: 2000, consumido: 2000 });
    expect(() => {
      // @ts-expect-error — probando inmutabilidad
      r.porcentaje = 0;
    }).toThrow();
  });

  it('expone prescrito, consumido y diferencia correctamente', () => {
    const r = calcularAdecuación({ prescrito: 1800, consumido: 1600 });
    expect(r.prescrito).toBe(1800);
    expect(r.consumido).toBe(1600);
    expect(r.diferencia).toBe(-200);
  });
});

// ===========================================================================
// BLOQUE 2 — getColorSemáforo
// ===========================================================================

describe('getColorSemáforo — Mapeo estado → color UI', () => {

  it('optimo → verde', () =>
    expect(getColorSemáforo('optimo')).toBe('verde'));

  it('deficit_leve → amarillo', () =>
    expect(getColorSemáforo('deficit_leve')).toBe('amarillo'));

  it('exceso_leve → amarillo', () =>
    expect(getColorSemáforo('exceso_leve')).toBe('amarillo'));

  it('deficit_critico → rojo', () =>
    expect(getColorSemáforo('deficit_critico')).toBe('rojo'));

  it('exceso_critico → rojo', () =>
    expect(getColorSemáforo('exceso_critico')).toBe('rojo'));
});

// ===========================================================================
// BLOQUE 3 — evaluarPlan
// ===========================================================================

describe('evaluarPlan — Evaluación de plan completo', () => {

  /**
   * CASO 13: Plan con 3 nutrientes, todos en verde
   */
  it('plan con 3 nutrientes todos óptimos → 3 verdes', () => {
    const r = evaluarPlan({
      prescrito: { energia_kcal: 2000, proteina_g: 60, fibra_g: 25 },
      consumido:  { energia_kcal: 2000, proteina_g: 60, fibra_g: 25 },
    });

    expect(r.energia_kcal?.estado).toBe('optimo');
    expect(r.proteina_g?.estado).toBe('optimo');
    expect(r.fibra_g?.estado).toBe('optimo');
  });

  /**
   * CASO 14: Plan mixto — energía óptima, proteína déficit crítico, sodio exceso
   */
  it('plan mixto → estados correctos por nutriente', () => {
    const r = evaluarPlan({
      prescrito: {
        energia_kcal: 2000,
        proteina_g:   60,
        sodio_mg:     2300,
      },
      consumido: {
        energia_kcal: 1980,   // 99% → optimo
        proteina_g:   40,     // 66.7% → deficit_critico
        sodio_mg:     2760,   // 120% → exceso_critico
      },
    });

    expect(r.energia_kcal?.estado).toBe('optimo');
    expect(r.proteina_g?.estado).toBe('deficit_critico');
    expect(r.sodio_mg?.estado).toBe('exceso_critico');
  });

  /**
   * CASO 15: Nutriente consumido no registrado → se trata como 0
   */
  it('nutriente prescrito pero no consumido → 0% → deficit_critico', () => {
    const r = evaluarPlan({
      prescrito: { calcio_mg: 1000 },
      consumido:  {},  // calcio no registrado
    });

    expect(r.calcio_mg?.porcentaje).toBe(0);
    expect(r.calcio_mg?.estado).toBe('deficit_critico');
  });

  /**
   * CASO 16: Nutriente prescrito = 0 → omitido del resultado
   */
  it('nutriente con prescrito=0 → omitido del resultado', () => {
    const r = evaluarPlan({
      prescrito: { energia_kcal: 2000, proteina_g: 0 },
      consumido:  { energia_kcal: 1900, proteina_g: 50 },
    });

    expect(r.energia_kcal).toBeDefined();
    expect(r.proteina_g).toBeUndefined(); // prescrito=0 → omitido
  });

  /**
   * CASO 17: Plan vacío → resultado vacío
   */
  it('plan vacío → resultado vacío sin errores', () => {
    const r = evaluarPlan({ prescrito: {}, consumido: {} });
    expect(Object.keys(r).length).toBe(0);
  });
});

// ===========================================================================
// BLOQUE 4 — generarResumen
// ===========================================================================

describe('generarResumen — Resumen ejecutivo del plan', () => {

  /**
   * CASO 18: Plan perfecto — todos en verde
   * 4 nutrientes, todos al 100%
   */
  it('plan 100% adherencia → 4 óptimos, porcentaje_optimo=100%', () => {
    const r = generarResumen({
      prescrito: {
        energia_kcal: 2000,
        proteina_g:   60,
        fibra_g:      25,
        calcio_mg:    1000,
      },
      consumido: {
        energia_kcal: 2000,
        proteina_g:   60,
        fibra_g:      25,
        calcio_mg:    1000,
      },
    });

    expect(r.total_nutrientes).toBe(4);
    expect(r.optimos).toBe(4);
    expect(r.con_deficit_critico).toBe(0);
    expect(r.porcentaje_optimo).toBe(100);
  });

  /**
   * CASO 19: Plan con adherencia mixta
   * energía: optimo | proteína: deficit_leve | hierro: deficit_critico | sodio: exceso_critico
   * 4 nutrientes → 1 verde, 1 amarillo, 2 rojos
   */
  it('plan mixto → conteos correctos por color', () => {
    const r = generarResumen({
      prescrito: {
        energia_kcal: 2000,
        proteina_g:   60,
        hierro_mg:    18,
        sodio_mg:     2300,
      },
      consumido: {
        energia_kcal: 2000,   // 100% → optimo
        proteina_g:   54,     // 90%  → deficit_leve
        hierro_mg:    10,     // 55.6% → deficit_critico
        sodio_mg:     2990,   // 130% → exceso_critico
      },
    });

    expect(r.total_nutrientes).toBe(4);
    expect(r.optimos).toBe(1);
    expect(r.con_deficit_leve).toBe(1);
    expect(r.con_deficit_critico).toBe(1);
    expect(r.con_exceso_critico).toBe(1);
    expect(r.porcentaje_optimo).toBe(25);
  });

  /**
   * CASO 20: porcentaje_optimo se calcula sobre el total correctamente
   * 3 nutrientes, 2 óptimos → 66.7%
   */
  it('2 de 3 nutrientes óptimos → porcentaje_optimo = 66.7%', () => {
    const r = generarResumen({
      prescrito: { energia_kcal: 2000, proteina_g: 60, fibra_g: 25 },
      consumido:  { energia_kcal: 2000, proteina_g: 60, fibra_g: 10 },
      // fibra: 10/25 = 40% → deficit_critico
    });

    expect(r.optimos).toBe(2);
    expect(r.con_deficit_critico).toBe(1);
    expect(r.porcentaje_optimo).toBeCloseTo(66.7, 1);
  });

  /**
   * CASO 21: El resumen incluye el detalle por nutriente
   */
  it('detalle contiene ResultadoAdecuación por nutriente', () => {
    const r = generarResumen({
      prescrito: { energia_kcal: 2000 },
      consumido:  { energia_kcal: 1900 },
    });

    expect(r.detalle.energia_kcal).toBeDefined();
    expect(r.detalle.energia_kcal?.porcentaje).toBe(95);
    expect(r.detalle.energia_kcal?.estado).toBe('optimo');
  });

  it('resumen es inmutable', () => {
    const r = generarResumen({
      prescrito: { energia_kcal: 2000 },
      consumido:  { energia_kcal: 2000 },
    });
    expect(() => {
      // @ts-expect-error — probando inmutabilidad
      r.optimos = 99;
    }).toThrow();
  });

  /**
   * CASO 22: Plan vacío → porcentaje_optimo = 0, sin errores
   */
  it('plan vacío → total=0, porcentaje_optimo=0, sin errores', () => {
    const r = generarResumen({ prescrito: {}, consumido: {} });
    expect(r.total_nutrientes).toBe(0);
    expect(r.porcentaje_optimo).toBe(0);
  });
});