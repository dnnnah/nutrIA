/**
 * useBiochemistry.test.ts — Tests Unitarios del Motor de Bioquímica Clínica
 * Proyecto NUTRIA — Open Source
 *
 * EJECUTAR: npx vitest run tests/hooks/useBiochemistry.test.ts
 */

import { describe, it, expect } from 'vitest';
import {
  calcularHOMA_IR,
  calcularCKDEPI,
  calcularBalanceNitrogenado,
  evaluarSemáforo,
  clasificarAlbuminuria,
} from '../../src/hooks/useBiochemistry';

// ===========================================================================
// BLOQUE 1 — HOMA-IR
// ===========================================================================

describe('calcularHOMA_IR — Matthews et al. 1985', () => {

  /**
   * CASO 1: Paciente sin resistencia
   * HOMA = (90 × 8) / 405 = 720 / 405 = 1.78 → normal
   */
  it('glucosa=90 / insulina=8 → HOMA 1.78 — normal', () => {
    const r = calcularHOMA_IR({
      glucosa_ayuno_mg_dL:   90,
      insulina_ayuno_uIU_mL: 8,
    });
    expect(r.homa_ir).toBeCloseTo(1.78, 2);
    expect(r.clasificacion).toBe('normal');
  });

  /**
   * CASO 2: Resistencia leve (prediabetes)
   * HOMA = (105 × 12) / 405 = 1260 / 405 = 3.11 → resistencia_leve
   */
  it('glucosa=105 / insulina=12 → HOMA 3.11 — resistencia_leve', () => {
    const r = calcularHOMA_IR({
      glucosa_ayuno_mg_dL:   105,
      insulina_ayuno_uIU_mL: 12,
    });
    expect(r.homa_ir).toBeCloseTo(3.11, 2);
    expect(r.clasificacion).toBe('resistencia_leve');
  });

  /**
   * CASO 3: Resistencia significativa (DM2 establecida)
   * HOMA = (118 × 18) / 405 = 2124 / 405 = 5.24 → resistencia_sig
   */
  it('glucosa=118 / insulina=18 → HOMA 5.24 — resistencia_sig', () => {
    const r = calcularHOMA_IR({
      glucosa_ayuno_mg_dL:   118,
      insulina_ayuno_uIU_mL: 18,
    });
    expect(r.homa_ir).toBeCloseTo(5.24, 2);
    expect(r.clasificacion).toBe('resistencia_sig');
  });

  /**
   * CASO 4: Límite exacto resistencia_leve / resistencia_sig (3.5)
   * HOMA = (105 × 13.5) / 405 = 1417.5 / 405 = 3.50
   */
  it('HOMA = 3.50 exacto → resistencia_leve (límite incluido)', () => {
    const r = calcularHOMA_IR({
      glucosa_ayuno_mg_dL:   105,
      insulina_ayuno_uIU_mL: 13.5,
    });
    expect(r.homa_ir).toBeCloseTo(3.50, 2);
    expect(r.clasificacion).toBe('resistencia_leve');
  });

  it('expone los valores de entrada en el resultado', () => {
    const r = calcularHOMA_IR({ glucosa_ayuno_mg_dL: 90, insulina_ayuno_uIU_mL: 8 });
    expect(r.glucosa_mg_dL).toBe(90);
    expect(r.insulina_uIU_mL).toBe(8);
  });

  it('lanza RangeError si glucosa fuera de rango fisiológico', () => {
    expect(() =>
      calcularHOMA_IR({ glucosa_ayuno_mg_dL: 30, insulina_ayuno_uIU_mL: 8 })
    ).toThrow(RangeError);
  });

  it('resultado es inmutable', () => {
    const r = calcularHOMA_IR({ glucosa_ayuno_mg_dL: 90, insulina_ayuno_uIU_mL: 8 });
    expect(() => {
      // @ts-expect-error — probando inmutabilidad
      r.homa_ir = 0;
    }).toThrow();
  });

  it('incluye cita bibliográfica', () => {
    const r = calcularHOMA_IR({ glucosa_ayuno_mg_dL: 90, insulina_ayuno_uIU_mL: 8 });
    expect(r.fuente_bibliografica).toContain('Matthews');
    expect(r.fuente_bibliografica).toContain('1985');
  });
});

// ===========================================================================
// BLOQUE 2 — CKD-EPI 2021
// ===========================================================================

describe('calcularCKDEPI — Inker et al. NEJM 2021', () => {

  /**
   * CASO 5: Mujer con función renal normal
   * Cr=0.8 > κ=0.7 → exp = -1.200
   * TFG = 142 × (0.8/0.7)^−1.200 × (0.9938)^35 × 1.012 ≈ 98.5 → G1
   */
  it('mujer 35a / Cr=0.8 → TFG ≈ 98.5 — G1', () => {
    const r = calcularCKDEPI({
      creatinina_serica_mg_dL: 0.8,
      edad_anios:              35,
      sexo:                    'femenino',
    });
    expect(r.tfg_mL_min_1_73m2).toBeCloseTo(98.5, 0);
    expect(r.estadio_erc).toBe('G1');
  });

  /**
   * CASO 6: Hombre con ERC G3a
   * Cr=1.4 > κ=0.9 → exp = -1.200
   * TFG ≈ 59.4 → G3a (límite G2 es ≥60; 59.4 cae en G3a)
   */
  it('hombre 55a / Cr=1.4 → TFG ≈ 59.4 — G3a', () => {
    const r = calcularCKDEPI({
      creatinina_serica_mg_dL: 1.4,
      edad_anios:              55,
      sexo:                    'masculino',
    });
    expect(r.tfg_mL_min_1_73m2).toBeCloseTo(59.4, 0);
    expect(r.estadio_erc).toBe('G3a');
  });

  /**
   * CASO 7: Hombre con ERC G3b
   * Cr=1.8, TFG ≈ 42.6 → G3b
   */
  it('hombre 60a / Cr=1.8 → TFG ≈ 42.6 — G3b', () => {
    const r = calcularCKDEPI({
      creatinina_serica_mg_dL: 1.8,
      edad_anios:              60,
      sexo:                    'masculino',
    });
    expect(r.tfg_mL_min_1_73m2).toBeCloseTo(42.6, 0);
    expect(r.estadio_erc).toBe('G3b');
  });

  /**
   * CASO 8: Mujer con ERC G5 (falla renal)
   * Cr=3.5, TFG ≈ 13.5 → G5
   */
  it('mujer 70a / Cr=3.5 → TFG ≈ 13.5 — G5', () => {
    const r = calcularCKDEPI({
      creatinina_serica_mg_dL: 3.5,
      edad_anios:              70,
      sexo:                    'femenino',
    });
    expect(r.tfg_mL_min_1_73m2).toBeCloseTo(13.5, 0);
    expect(r.estadio_erc).toBe('G5');
  });

  /**
   * CASO 9: Hombre con Cr dentro de kappa (rama izquierda de la ecuación)
   * Cr=0.7 ≤ κ=0.9 → exp = alpha = -0.302
   */
  it('hombre 40a / Cr=0.7 → usa rama Cr ≤ κ — TFG > 90, G1', () => {
    const r = calcularCKDEPI({
      creatinina_serica_mg_dL: 0.7,
      edad_anios:              40,
      sexo:                    'masculino',
    });
    expect(r.tfg_mL_min_1_73m2).toBeGreaterThan(90);
    expect(r.estadio_erc).toBe('G1');
  });

  it('lanza RangeError si creatinina fuera de rango', () => {
    expect(() =>
      calcularCKDEPI({ creatinina_serica_mg_dL: 25, edad_anios: 50, sexo: 'masculino' })
    ).toThrow(RangeError);
  });

  it('resultado es inmutable', () => {
    const r = calcularCKDEPI({
      creatinina_serica_mg_dL: 1.0, edad_anios: 45, sexo: 'masculino',
    });
    expect(() => {
      // @ts-expect-error — probando inmutabilidad
      r.tfg_mL_min_1_73m2 = 999;
    }).toThrow();
  });

  it('incluye cita bibliográfica NEJM 2021', () => {
    const r = calcularCKDEPI({
      creatinina_serica_mg_dL: 1.0, edad_anios: 45, sexo: 'masculino',
    });
    expect(r.fuente_bibliografica).toContain('Inker');
    expect(r.fuente_bibliografica).toContain('2021');
  });
});

// ===========================================================================
// BLOQUE 3 — Balance Nitrogenado
// ===========================================================================

describe('calcularBalanceNitrogenado — Bistrian 1977 / ASPEN 2016', () => {

  /**
   * CASO 10: Anabolismo — paciente en recuperación bien nutrido
   * N_ing = 120/6.25 = 19.2g
   * N_perd = 10 + 4 = 14g
   * BN = 19.2 − 14 = +5.2 → anabolismo
   */
  it('proteina=120g / NUU=10g → BN=+5.20 — anabolismo', () => {
    const r = calcularBalanceNitrogenado({
      proteina_consumida_g: 120,
      nuu_g:                10,
    });
    expect(r.bn_g_dia).toBeCloseTo(5.20, 2);
    expect(r.estado).toBe('anabolismo');
    expect(r.nitrogeno_ingerido).toBeCloseTo(19.2, 1);
    expect(r.nitrogeno_perdido).toBeCloseTo(14.0, 1);
  });

  /**
   * CASO 11: Catabolismo severo — paciente crítico con sepsis
   * N_ing = 60/6.25 = 9.6g
   * N_perd = 15 + 4 = 19g
   * BN = 9.6 − 19 = −9.4 → catabolismo
   */
  it('proteina=60g / NUU=15g → BN=−9.40 — catabolismo', () => {
    const r = calcularBalanceNitrogenado({
      proteina_consumida_g: 60,
      nuu_g:                15,
    });
    expect(r.bn_g_dia).toBeCloseTo(-9.40, 2);
    expect(r.estado).toBe('catabolismo');
  });

  /**
   * CASO 12: Equilibrio nitrogenado exacto
   * N_ing = 87.5/6.25 = 14.0g
   * N_perd = 10 + 4 = 14g
   * BN = 0.0 → equilibrio
   */
  it('proteina=87.5g / NUU=10g → BN=0.00 — equilibrio', () => {
    const r = calcularBalanceNitrogenado({
      proteina_consumida_g: 87.5,
      nuu_g:                10,
    });
    expect(r.bn_g_dia).toBeCloseTo(0.0, 2);
    expect(r.estado).toBe('equilibrio');
  });

  /**
   * CASO 13: Límite equilibrio/anabolismo (BN = +1.0)
   * N_ing = (10+4+1)*6.25 = 93.75g → BN exactamente +1.0
   */
  it('BN = +1.0 exacto → límite equilibrio/anabolismo → equilibrio', () => {
    const r = calcularBalanceNitrogenado({
      proteina_consumida_g: 93.75, // (14+1)*6.25
      nuu_g:                10,
    });
    expect(r.bn_g_dia).toBeCloseTo(1.0, 2);
    expect(r.estado).toBe('equilibrio');
  });

  it('lanza RangeError si proteina > 500g', () => {
    expect(() =>
      calcularBalanceNitrogenado({ proteina_consumida_g: 600, nuu_g: 10 })
    ).toThrow(RangeError);
  });

  it('resultado es inmutable', () => {
    const r = calcularBalanceNitrogenado({ proteina_consumida_g: 100, nuu_g: 10 });
    expect(() => {
      // @ts-expect-error
      r.bn_g_dia = 0;
    }).toThrow();
  });
});

// ===========================================================================
// BLOQUE 4 — Semáforo de Laboratorio
// ===========================================================================

describe('evaluarSemáforo — Clasificador universal de laboratorio', () => {

  /**
   * CASO 14: Glucosa normal
   * Rango normal [70, 99] → 85 → normal
   */
  it('glucosa=85 / rango[70,99] → normal', () => {
    const r = evaluarSemáforo({
      valor:        85,
      rango_normal: { min: 70, max: 99 },
    });
    expect(r.estado).toBe('normal');
    expect(r.valor).toBe(85);
  });

  /**
   * CASO 15: LDL alto
   * Rango normal [null, 99] → LDL=165 → alto
   */
  it('LDL=165 / rango[null,99] → alto', () => {
    const r = evaluarSemáforo({
      valor:        165,
      rango_normal: { min: null, max: 99 },
    });
    expect(r.estado).toBe('alto');
  });

  /**
   * CASO 16: Hemoglobina baja
   * Rango normal [12, 15.5] → Hb=10.5 → bajo
   */
  it('hemoglobina=10.5 / rango[12,15.5] → bajo', () => {
    const r = evaluarSemáforo({
      valor:        10.5,
      rango_normal: { min: 12, max: 15.5 },
    });
    expect(r.estado).toBe('bajo');
  });

  /**
   * CASO 17: Potasio en rango crítico bajo (hipocalemia severa)
   * Normal [3.5, 5.0] — Crítico bajo < 2.5
   * Valor = 2.1 → critico_bajo
   */
  it('potasio=2.1 / crítico<2.5 → critico_bajo', () => {
    const r = evaluarSemáforo({
      valor:          2.1,
      rango_normal:   { min: 3.5, max: 5.0 },
      rango_critico:  { min: 2.5, max: null },
    });
    expect(r.estado).toBe('critico_bajo');
  });

  /**
   * CASO 18: Potasio en rango crítico alto (hipercalemia severa)
   * Normal [3.5, 5.0] — Crítico alto > 6.5
   * Valor = 6.8 → critico_alto
   */
  it('potasio=6.8 / crítico>6.5 → critico_alto', () => {
    const r = evaluarSemáforo({
      valor:          6.8,
      rango_normal:   { min: 3.5, max: 5.0 },
      rango_critico:  { min: 2.5, max: 6.5 },
    });
    expect(r.estado).toBe('critico_alto');
  });

  /**
   * CASO 19: Valor en rango alto pero NO crítico
   * Potasio=5.8 → alto (no crítico porque 5.8 < 6.5)
   */
  it('potasio=5.8 / alto pero no crítico → alto', () => {
    const r = evaluarSemáforo({
      valor:          5.8,
      rango_normal:   { min: 3.5, max: 5.0 },
      rango_critico:  { min: 2.5, max: 6.5 },
    });
    expect(r.estado).toBe('alto');
  });

  /**
   * CASO 20: TFG baja — rango con límite inferior definido
   * Normal [60, null] → TFG=45 < 60 → bajo
   */
  it('TFG=45 / rango[60,null] → bajo', () => {
    const r = evaluarSemáforo({
      valor:        45,
      rango_normal: { min: 60, max: null },
    });
    expect(r.estado).toBe('bajo');
  });

  it('lanza TypeError si valor es NaN', () => {
    expect(() =>
      evaluarSemáforo({ valor: NaN, rango_normal: { min: 0, max: 100 } })
    ).toThrow(TypeError);
  });

  it('resultado es inmutable', () => {
    const r = evaluarSemáforo({ valor: 85, rango_normal: { min: 70, max: 99 } });
    expect(() => {
      // @ts-expect-error
      r.estado = 'alto';
    }).toThrow();
  });
});

// ===========================================================================
// BLOQUE 5 — Albuminuria KDIGO 2024
// ===========================================================================

describe('clasificarAlbuminuria — KDIGO 2024', () => {

  it('ratio=15 → A1 (normal)', () => {
    expect(clasificarAlbuminuria(15)).toBe('A1');
  });

  it('ratio=29.9 → A1 (límite superior A1)', () => {
    expect(clasificarAlbuminuria(29.9)).toBe('A1');
  });

  it('ratio=30 → A2 (microalbuminuria)', () => {
    expect(clasificarAlbuminuria(30)).toBe('A2');
  });

  it('ratio=150 → A2', () => {
    expect(clasificarAlbuminuria(150)).toBe('A2');
  });

  it('ratio=300 → A2 (límite superior A2)', () => {
    expect(clasificarAlbuminuria(300)).toBe('A2');
  });

  it('ratio=301 → A3 (macroalbuminuria)', () => {
    expect(clasificarAlbuminuria(301)).toBe('A3');
  });

  it('lanza RangeError si ratio < 0', () => {
    expect(() => clasificarAlbuminuria(-1)).toThrow(RangeError);
  });
});