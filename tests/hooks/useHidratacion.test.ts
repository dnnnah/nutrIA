/**
 * useHidratacion.test.ts — Tests Unitarios del Motor de Hidratación
 * Proyecto NUTRIA — Open Source
 *
 * CASOS DOCUMENTADOS: Todos los valores de referencia están calculados
 * manualmente a partir de las fórmulas publicadas. Los resultados son
 * reproducibles y verificables contra las fuentes bibliográficas.
 *
 * EJECUTAR: npx vitest run tests/hooks/useHidratacion.test.ts
 *
 * @source Holliday MA, Segar WE. Pediatrics. 1957;19(5):823-832.
 * @source Sawka MN et al. ACSM Position Stand. Med Sci Sports Exerc. 2007;39(2):377-390.
 * @source Chernoff R. J Am Diet Assoc. 1994;94(8):878-882.
 * @source DuBois EF. Arch Intern Med. 1921;27(2):259. (fiebre)
 * @source IOM. Dietary Reference Intakes for Water. 2005.
 */

import { describe, it, expect } from 'vitest';
import {
  calcularHidratación_PorPeso,
  calcularHidratación_PorGET,
  calcularHidratación_PorEdad,
  calcularTasaSudoración,
  calcularAjusteClínico,
  getMultiplicadorPorEdad,
} from '../../src/hooks/useHidratacion';

// ===========================================================================
// BLOQUE 1 — Hidratación por Peso
// ===========================================================================

describe('Hidratación por Peso', () => {

  /**
   * CASO 1: Adulto estándar (< 65 años)
   * Cálculo: 35 ml/kg × 70 kg = 2450 ml
   *
   * @source Holliday MA, Segar WE. Pediatrics. 1957.
   */
  it('adulto 70kg → 35×70 = 2450 ml', () => {
    const r = calcularHidratación_PorPeso({ peso_kg: 70, adulto_mayor: false });
    expect(r.volumen_ml).toBe(2450);
    expect(r.volumen_litros).toBeCloseTo(2.45, 2);
    expect(r.vasos_240ml).toBe(Math.round(2450 / 240)); // 10 vasos
    expect(r.multiplicador_ml_kg).toBe(35);
    expect(r.método).toBe('por_peso');
  });

  /**
   * CASO 2: Adulto mayor (multiplicador reducido)
   * Cálculo: 30 ml/kg × 70 kg = 2100 ml
   *
   * @source Popkin BM, D'Anci KE, Rosenberg IH. Nutr Rev. 2010;68(8):439-458.
   */
  it('adulto mayor 70kg → 30×70 = 2100 ml', () => {
    const r = calcularHidratación_PorPeso({ peso_kg: 70, adulto_mayor: true });
    expect(r.volumen_ml).toBe(2100);
    expect(r.volumen_litros).toBeCloseTo(2.10, 2);
    expect(r.multiplicador_ml_kg).toBe(30);
  });

  /**
   * CASO 3: Peso mínimo (1 kg — neonato / límite de validación)
   */
  it('adulto 1kg (mínimo fisiológico) → no lanza error', () => {
    expect(() =>
      calcularHidratación_PorPeso({ peso_kg: 1, adulto_mayor: false })
    ).not.toThrow();
  });

  it('lanza RangeError si peso ≤ 0', () => {
    expect(() =>
      calcularHidratación_PorPeso({ peso_kg: 0, adulto_mayor: false })
    ).toThrow(RangeError);
  });

  it('lanza RangeError si peso negativo', () => {
    expect(() =>
      calcularHidratación_PorPeso({ peso_kg: -5, adulto_mayor: false })
    ).toThrow(RangeError);
  });

  it('lanza RangeError si peso fuera de rango fisiológico (> 400 kg)', () => {
    expect(() =>
      calcularHidratación_PorPeso({ peso_kg: 401, adulto_mayor: false })
    ).toThrow(RangeError);
  });

});

// ===========================================================================
// BLOQUE 2 — Hidratación por GET
// ===========================================================================

describe('Hidratación por GET', () => {

  /**
   * CASO 1: GET estándar adulto moderado
   * Cálculo: 1 ml × 2000 kcal = 2000 ml
   *
   * @source IOM. Dietary Reference Intakes for Water. National Academies Press. 2005.
   */
  it('GET 2000 kcal → 2000 ml', () => {
    const r = calcularHidratación_PorGET({ get_kcal: 2000 });
    expect(r.volumen_ml).toBe(2000);
    expect(r.volumen_litros).toBeCloseTo(2.00, 2);
    expect(r.método).toBe('por_get');
    expect(r.multiplicador_ml_kg).toBeNull();
  });

  /**
   * CASO 2: GET bajo (adulto mayor sedentario)
   * Cálculo: 1 ml × 1500 kcal = 1500 ml
   */
  it('GET 1500 kcal → 1500 ml', () => {
    const r = calcularHidratación_PorGET({ get_kcal: 1500 });
    expect(r.volumen_ml).toBe(1500);
    expect(r.volumen_litros).toBeCloseTo(1.50, 2);
  });

  /**
   * CASO 3: GET alto (deportista intenso)
   * Cálculo: 1 ml × 3500 kcal = 3500 ml
   */
  it('GET 3500 kcal → 3500 ml', () => {
    const r = calcularHidratación_PorGET({ get_kcal: 3500 });
    expect(r.volumen_ml).toBe(3500);
  });

  it('lanza RangeError si GET ≤ 0', () => {
    expect(() =>
      calcularHidratación_PorGET({ get_kcal: 0 })
    ).toThrow(RangeError);
  });

  it('lanza RangeError si GET negativo', () => {
    expect(() =>
      calcularHidratación_PorGET({ get_kcal: -100 })
    ).toThrow(RangeError);
  });

});

// ===========================================================================
// BLOQUE 3 — Hidratación por Edad
// ===========================================================================

describe('Hidratación por Edad', () => {

  /**
   * CASO 1: Adulto joven (< 30 años)
   * Factor: 40 ml/kg
   * Cálculo: 40 × 70 = 2800 ml
   *
   * @source IOM. Dietary Reference Intakes for Water. 2005.
   */
  it('25 años, 70kg → 40×70 = 2800 ml', () => {
    const r = calcularHidratación_PorEdad({ peso_kg: 70, edad_anios: 25 });
    expect(r.volumen_ml).toBe(2800);
    expect(r.multiplicador_ml_kg).toBe(40);
    expect(r.método).toBe('por_edad');
  });

  /**
   * CASO 2: Adulto de mediana edad (31–55 años)
   * Factor: 35 ml/kg
   * Cálculo: 35 × 70 = 2450 ml
   */
  it('45 años, 70kg → 35×70 = 2450 ml', () => {
    const r = calcularHidratación_PorEdad({ peso_kg: 70, edad_anios: 45 });
    expect(r.volumen_ml).toBe(2450);
    expect(r.multiplicador_ml_kg).toBe(35);
  });

  /**
   * CASO 3: Adulto mayor joven (56–65 años)
   * Factor: 30 ml/kg
   * Cálculo: 30 × 70 = 2100 ml
   *
   * @source Chernoff R. J Am Diet Assoc. 1994;94(8):878-882.
   */
  it('65 años, 70kg → 30×70 = 2100 ml', () => {
    const r = calcularHidratación_PorEdad({ peso_kg: 70, edad_anios: 65 });
    expect(r.volumen_ml).toBe(2100);
    expect(r.multiplicador_ml_kg).toBe(30);
  });

  /**
   * CASO 4: Adulto mayor (> 65 años)
   * Factor: 25 ml/kg (mayor riesgo de deshidratación por menor sensación de sed)
   * Cálculo: 25 × 70 = 1750 ml
   *
   * @source Chernoff R. J Am Diet Assoc. 1994;94(8):878-882.
   */
  it('80 años, 70kg → 25×70 = 1750 ml', () => {
    const r = calcularHidratación_PorEdad({ peso_kg: 70, edad_anios: 80 });
    expect(r.volumen_ml).toBe(1750);
    expect(r.multiplicador_ml_kg).toBe(25);
  });

  /**
   * CASO 5: Límite exacto de rango (30 años → debe usar factor 40, no 35)
   * Cálculo: 40 × 60 = 2400 ml
   */
  it('30 años (límite), 60kg → 40×60 = 2400 ml', () => {
    const r = calcularHidratación_PorEdad({ peso_kg: 60, edad_anios: 30 });
    expect(r.volumen_ml).toBe(2400);
    expect(r.multiplicador_ml_kg).toBe(40);
  });

  /**
   * CASO 6: Límite exacto de rango (31 años → debe usar factor 35)
   * Cálculo: 35 × 60 = 2100 ml
   */
  it('31 años (límite), 60kg → 35×60 = 2100 ml', () => {
    const r = calcularHidratación_PorEdad({ peso_kg: 60, edad_anios: 31 });
    expect(r.volumen_ml).toBe(2100);
    expect(r.multiplicador_ml_kg).toBe(35);
  });

  it('lanza RangeError si edad < 0', () => {
    expect(() =>
      calcularHidratación_PorEdad({ peso_kg: 70, edad_anios: -1 })
    ).toThrow(RangeError);
  });

  it('lanza RangeError si peso ≤ 0', () => {
    expect(() =>
      calcularHidratación_PorEdad({ peso_kg: 0, edad_anios: 30 })
    ).toThrow(RangeError);
  });

});

// ===========================================================================
// BLOQUE 4 — Tasa de Sudoración
// ===========================================================================

describe('Tasa de Sudoración', () => {

  /**
   * CASO 1: Caso real documentado
   *
   * Datos:
   *   Peso_pre = 70 kg, Peso_post = 69 kg, Líquido_bebido = 500 ml, Orina = 0 ml, Tiempo = 60 min
   *
   * Cálculo:
   *   Cambio de peso = (70 − 69) × 1000 = 1000 ml
   *   Pérdida neta   = 1000 + 500 − 0   = 1500 ml
   *   Tasa           = 1500 / 60         = 25 ml/min = 1500 ml/h
   *   Reposición     = 1500 × 1.5        = 2250 ml (ACSM 150%)
   *   Botellas 600ml = 2250 / 600        = 3.75 ≈ 3.8 botellas
   *
   * @source Sawka MN et al. ACSM Position Stand. Med Sci Sports Exerc. 2007.
   */
  it('caso real: pre=70kg, post=69kg, bebió=500ml, orina=0, tiempo=60min', () => {
    const r = calcularTasaSudoración({
      peso_pre_kg:         70,
      peso_post_kg:        69,
      líquido_ingerido_ml: 500,
      orina_ml:            0,
      duración_min:        60,
    });

    expect(r.pérdida_neta_ml).toBe(1500);
    expect(r.tasa_ml_por_min).toBeCloseTo(25.0, 1);
    expect(r.tasa_ml_por_hora).toBe(1500);
    expect(r.reposición_recomendada_ml).toBe(2250);
    expect(r.botellas_600ml).toBeCloseTo(3.8, 1);
  });

  /**
   * CASO 2: Sin pérdida de peso pero con sudoración (líquido compensó)
   *
   * Datos: Peso_pre = 70, Peso_post = 70, Líquido = 800 ml, Orina = 200 ml, Tiempo = 45 min
   * Cambio de peso = 0 ml
   * Pérdida neta   = 0 + 800 − 200 = 600 ml
   * Tasa           = 600 / 45 ≈ 13.3 ml/min
   * Reposición     = 600 × 1.5 = 900 ml
   */
  it('sin cambio de peso pero con ingesta y orina → pérdida por líquidos', () => {
    const r = calcularTasaSudoración({
      peso_pre_kg:         70,
      peso_post_kg:        70,
      líquido_ingerido_ml: 800,
      orina_ml:            200,
      duración_min:        45,
    });

    expect(r.pérdida_neta_ml).toBe(600);
    expect(r.tasa_ml_por_min).toBeCloseTo(13.3, 1);
    expect(r.reposición_recomendada_ml).toBe(900);
  });

  /**
   * CASO 3: Sesión corta de alta intensidad
   *
   * Datos: pre=80, post=78.5, líquido=300, orina=0, tiempo=30 min
   * Cambio de peso = 1500 ml
   * Pérdida neta   = 1500 + 300 − 0 = 1800 ml
   * Tasa           = 1800 / 30 = 60 ml/min = 3600 ml/h
   * Reposición     = 1800 × 1.5 = 2700 ml
   */
  it('alta intensidad 30 min: pre=80, post=78.5, líquido=300 → tasa 60ml/min', () => {
    const r = calcularTasaSudoración({
      peso_pre_kg:         80,
      peso_post_kg:        78.5,
      líquido_ingerido_ml: 300,
      orina_ml:            0,
      duración_min:        30,
    });

    expect(r.pérdida_neta_ml).toBe(1800);
    expect(r.tasa_ml_por_min).toBeCloseTo(60.0, 1);
    expect(r.tasa_ml_por_hora).toBe(3600);
    expect(r.reposición_recomendada_ml).toBe(2700);
  });

  it('lanza RangeError si tiempo ≤ 0', () => {
    expect(() =>
      calcularTasaSudoración({
        peso_pre_kg: 70, peso_post_kg: 69,
        líquido_ingerido_ml: 0, orina_ml: 0, duración_min: 0,
      })
    ).toThrow(RangeError);
  });

  it('lanza RangeError si tiempo negativo', () => {
    expect(() =>
      calcularTasaSudoración({
        peso_pre_kg: 70, peso_post_kg: 69,
        líquido_ingerido_ml: 0, orina_ml: 0, duración_min: -10,
      })
    ).toThrow(RangeError);
  });

  /**
   * peso_post > peso_pre + 2 kg → error fisiológico
   * (imposible ganar >2 kg de masa durante ejercicio)
   */
  it('lanza RangeError si peso_post > peso_pre + 2 kg (margen de seguridad)', () => {
    expect(() =>
      calcularTasaSudoración({
        peso_pre_kg: 70, peso_post_kg: 73,
        líquido_ingerido_ml: 0, orina_ml: 0, duración_min: 60,
      })
    ).toThrow(RangeError);
  });

  it('lanza RangeError si líquido_ingerido_ml negativo', () => {
    expect(() =>
      calcularTasaSudoración({
        peso_pre_kg: 70, peso_post_kg: 69,
        líquido_ingerido_ml: -100, orina_ml: 0, duración_min: 60,
      })
    ).toThrow(RangeError);
  });

});

// ===========================================================================
// BLOQUE 5 — Ajuste por Factores Clínicos
// ===========================================================================

describe('Ajuste por Factores Clínicos', () => {

  const SIN_FACTORES = {
    fiebre: false,
    temperatura_celsius: null,
    vómito: false,
    diarrea: false,
    actividad_intensa: false,
    clima_caluroso: false,
  };

  /**
   * CASO 1: Fiebre de 39 °C sobre base de 2000 ml
   * Incremento fiebre = (39 − 37) × 150 = 2 × 150 = 300 ml
   * Total = 2000 + 300 = 2300 ml
   *
   * @source DuBois EF. Arch Intern Med. 1921;27(2):259.
   */
  it('fiebre 39°C: base=2000ml → +300ml (2°C × 150)', () => {
    const r = calcularAjusteClínico(2000, {
      ...SIN_FACTORES,
      fiebre: true,
      temperatura_celsius: 39,
    });

    expect(r.incremento_total_ml).toBe(300);
    expect(r.volumen_ajustado_ml).toBe(2300);
    expect(r.desglose).toHaveLength(1);
    expect(r.desglose[0]?.factor).toBe('Fiebre');
    expect(r.desglose[0]?.incremento_ml).toBe(300);
  });

  /**
   * CASO 2: Fiebre de 38 °C sobre base de 2000 ml
   * Incremento = (38 − 37) × 150 = 1 × 150 = 150 ml
   * Total = 2000 + 150 = 2150 ml
   */
  it('fiebre 38°C: base=2000ml → +150ml (1°C × 150)', () => {
    const r = calcularAjusteClínico(2000, {
      ...SIN_FACTORES,
      fiebre: true,
      temperatura_celsius: 38,
    });

    expect(r.incremento_total_ml).toBe(150);
    expect(r.volumen_ajustado_ml).toBe(2150);
  });

  /**
   * CASO 3: Vómito + diarrea combinados
   * Incremento = 500 + 500 = 1000 ml
   * Total = 2000 + 1000 = 3000 ml
   *
   * @source ESPEN Guidelines on Clinical Nutrition. Clin Nutr. 2017.
   */
  it('vómito + diarrea: base=2000ml → +1000ml', () => {
    const r = calcularAjusteClínico(2000, {
      ...SIN_FACTORES,
      vómito: true,
      diarrea: true,
    });

    expect(r.incremento_total_ml).toBe(1000);
    expect(r.volumen_ajustado_ml).toBe(3000);
    expect(r.desglose).toHaveLength(2);
  });

  /**
   * CASO 4: Sin factores — volumen sin cambio
   */
  it('sin factores: volumen sin cambio', () => {
    const r = calcularAjusteClínico(2000, SIN_FACTORES);

    expect(r.incremento_total_ml).toBe(0);
    expect(r.volumen_ajustado_ml).toBe(2000);
    expect(r.desglose).toHaveLength(0);
  });

  /**
   * CASO 5: Todos los factores activos + fiebre de 38 °C
   *
   * Incrementos:
   *   Fiebre (38°C):        (38−37) × 150 = 150 ml
   *   Vómito:               500 ml
   *   Diarrea:              500 ml
   *   Actividad intensa:    500 ml
   *   Clima caluroso:       500 ml
   *   Total:                150 + 500 + 500 + 500 + 500 = 2150 ml
   *
   * Base: 2000 ml → Ajustado: 4150 ml
   */
  it('todos los factores activos + fiebre 38°C: base=2000 → +2150 = 4150 ml', () => {
    const r = calcularAjusteClínico(2000, {
      fiebre: true,
      temperatura_celsius: 38,
      vómito: true,
      diarrea: true,
      actividad_intensa: true,
      clima_caluroso: true,
    });

    expect(r.incremento_total_ml).toBe(2150);
    expect(r.volumen_ajustado_ml).toBe(4150);
    expect(r.volumen_ajustado_litros).toBeCloseTo(4.15, 2);
    expect(r.desglose).toHaveLength(5);
  });

  it('lanza RangeError si volumen_base_ml ≤ 0', () => {
    expect(() =>
      calcularAjusteClínico(0, SIN_FACTORES)
    ).toThrow(RangeError);
  });

  it('lanza RangeError si fiebre=true pero temperatura_celsius es null', () => {
    expect(() =>
      calcularAjusteClínico(2000, { ...SIN_FACTORES, fiebre: true, temperatura_celsius: null })
    ).toThrow(RangeError);
  });

  it('lanza RangeError si fiebre=true pero temperatura_celsius < 37', () => {
    expect(() =>
      calcularAjusteClínico(2000, { ...SIN_FACTORES, fiebre: true, temperatura_celsius: 36.5 })
    ).toThrow(RangeError);
  });

});

// ===========================================================================
// BLOQUE 6 — getMultiplicadorPorEdad (helper UI)
// ===========================================================================

describe('getMultiplicadorPorEdad', () => {

  it('25 años → 40 ml/kg', () => {
    const r = getMultiplicadorPorEdad(25);
    expect(r.ml_por_kg).toBe(40);
  });

  it('50 años → 35 ml/kg', () => {
    const r = getMultiplicadorPorEdad(50);
    expect(r.ml_por_kg).toBe(35);
  });

  it('60 años → 30 ml/kg', () => {
    const r = getMultiplicadorPorEdad(60);
    expect(r.ml_por_kg).toBe(30);
  });

  it('75 años → 25 ml/kg', () => {
    const r = getMultiplicadorPorEdad(75);
    expect(r.ml_por_kg).toBe(25);
  });

  it('lanza RangeError para edad negativa', () => {
    expect(() => getMultiplicadorPorEdad(-1)).toThrow(RangeError);
  });

  it('lanza RangeError para edad > 120', () => {
    expect(() => getMultiplicadorPorEdad(121)).toThrow(RangeError);
  });

});