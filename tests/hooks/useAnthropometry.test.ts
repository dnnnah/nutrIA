/**
 * useAnthropometry.test.ts — Tests Unitarios del Motor de Antropometría
 * Proyecto NUTRIA — Open Source
 *
 * Todos los valores de referencia están calculados manualmente
 * a partir de las fórmulas bibliográficas originales.
 *
 * EJECUTAR: npx vitest run tests/hooks/useAnthropometry.test.ts
 */

import { describe, it, expect } from 'vitest';
import {
  calcularIMC,
  calcularICC,
  calcularICE,
  calcularDensidadCorporal_JP3_Hombre,
  calcularDensidadCorporal_JP3_Mujer,
  calcularPorcentajeGrasa_Siri,
  calcularComposicion_JP3_Hombre,
  calcularComposicion_JP3_Mujer,
  calcularComposicion_Faulkner,
  calcularAMB,
} from '../../src/hooks/useAnthropometry';

// ===========================================================================
// BLOQUE 1 — IMC
// ===========================================================================

describe('calcularIMC — Clasificación OMS 2000', () => {

  /**
   * CASO 1: Peso normal
   * IMC = 65 / (1.65²) = 65 / 2.7225 = 23.9
   */
  it('65kg / 165cm → IMC 23.9 — normal', () => {
    const r = calcularIMC({ peso_kg: 65, talla_cm: 165 });
    expect(r.imc).toBeCloseTo(23.9, 1);
    expect(r.clasificacion).toBe('normal');
  });

  /**
   * CASO 2: Sobrepeso
   * IMC = 80 / (1.70²) = 80 / 2.89 = 27.7
   */
  it('80kg / 170cm → IMC 27.7 — sobrepeso', () => {
    const r = calcularIMC({ peso_kg: 80, talla_cm: 170 });
    expect(r.imc).toBeCloseTo(27.7, 1);
    expect(r.clasificacion).toBe('sobrepeso');
  });

  /**
   * CASO 3: Obesidad grado II
   * IMC = 110 / (1.68²) = 110 / 2.8224 = 38.97 ≈ 39.0
   */
  it('110kg / 168cm → IMC ≈ 39.0 — obesidad_ii', () => {
    const r = calcularIMC({ peso_kg: 110, talla_cm: 168 });
    expect(r.imc).toBeCloseTo(39.0, 0);
    expect(r.clasificacion).toBe('obesidad_ii');
  });

  /**
   * CASO 4: Bajo peso severo
   * IMC = 40 / (1.62²) = 40 / 2.6244 = 15.24
   */
  it('40kg / 162cm → IMC ≈ 15.2 — bajo_peso_severo', () => {
    const r = calcularIMC({ peso_kg: 40, talla_cm: 162 });
    expect(r.imc).toBeCloseTo(15.2, 0);
    expect(r.clasificacion).toBe('bajo_peso_severo');
  });

  /**
   * CASO 5: Límite exacto normal/sobrepeso (25.0)
   * IMC = 72.25 / (1.70²) = 72.25 / 2.89 = 25.0
   */
  it('72.25kg / 170cm → IMC 25.0 — sobrepeso (límite)', () => {
    const r = calcularIMC({ peso_kg: 72.25, talla_cm: 170 });
    expect(r.imc).toBeCloseTo(25.0, 1);
    expect(r.clasificacion).toBe('sobrepeso');
  });

  it('resultado es inmutable', () => {
    const r = calcularIMC({ peso_kg: 70, talla_cm: 170 });
    expect(() => {
      // @ts-expect-error — probando inmutabilidad
      r.imc = 99;
    }).toThrow();
  });

  it('lanza RangeError con peso imposible', () => {
    expect(() => calcularIMC({ peso_kg: 0, talla_cm: 170 })).toThrow(RangeError);
  });

  it('incluye fuente bibliográfica', () => {
    const r = calcularIMC({ peso_kg: 70, talla_cm: 170 });
    expect(r.fuente_bibliografica).toContain('WHO');
  });
});

// ===========================================================================
// BLOQUE 2 — ICC
// ===========================================================================

describe('calcularICC — OMS 2008', () => {

  /**
   * CASO 6: Hombre con riesgo cardiovascular
   * ICC = 102 / 98 = 1.041 > 0.95 → riesgo_alto
   */
  it('hombre cintura 102cm / cadera 98cm → ICC 1.041 — riesgo_alto', () => {
    const r = calcularICC({ cintura_cm: 102, cadera_cm: 98, sexo: 'masculino' });
    expect(r.icc).toBeCloseTo(1.041, 2);
    expect(r.riesgo).toBe('riesgo_alto');
    expect(r.punto_corte_sexo).toBe(0.95);
  });

  /**
   * CASO 7: Mujer sin riesgo
   * ICC = 78 / 96 = 0.8125 ≤ 0.85 → sin_riesgo
   */
  it('mujer cintura 78cm / cadera 96cm → ICC 0.813 — sin_riesgo', () => {
    const r = calcularICC({ cintura_cm: 78, cadera_cm: 96, sexo: 'femenino' });
    expect(r.icc).toBeCloseTo(0.813, 2);
    expect(r.riesgo).toBe('sin_riesgo');
    expect(r.punto_corte_sexo).toBe(0.85);
  });

  /**
   * CASO 8: Mujer en límite exacto (0.85 → no es > 0.85)
   * ICC = 85 / 100 = 0.850 → sin_riesgo (punto de corte no inclusivo)
   */
  it('mujer cintura 85cm / cadera 100cm → ICC 0.850 — sin_riesgo (límite exacto)', () => {
    const r = calcularICC({ cintura_cm: 85, cadera_cm: 100, sexo: 'femenino' });
    expect(r.icc).toBeCloseTo(0.850, 3);
    expect(r.riesgo).toBe('sin_riesgo');
  });

  it('lanza RangeError si cintura fuera de rango', () => {
    expect(() =>
      calcularICC({ cintura_cm: 30, cadera_cm: 90, sexo: 'femenino' })
    ).toThrow(RangeError);
  });
});

// ===========================================================================
// BLOQUE 3 — ICE
// ===========================================================================

describe('calcularICE — Ashwell et al. 2012', () => {

  /**
   * CASO 9: Riesgo moderado
   * ICE = 90 / 170 = 0.529 → riesgo_moderado (0.50-0.59)
   */
  it('cintura 90cm / talla 170cm → ICE 0.529 — riesgo_moderado', () => {
    const r = calcularICE({ cintura_cm: 90, talla_cm: 170 });
    expect(r.ice).toBeCloseTo(0.529, 2);
    expect(r.riesgo).toBe('riesgo_moderado');
  });

  /**
   * CASO 10: Sin riesgo (ICE < 0.40)
   * ICE = 60 / 175 = 0.343
   */
  it('cintura 60cm / talla 175cm → ICE 0.343 — sin_riesgo', () => {
    const r = calcularICE({ cintura_cm: 60, talla_cm: 175 });
    expect(r.ice).toBeCloseTo(0.343, 2);
    expect(r.riesgo).toBe('sin_riesgo');
  });

  /**
   * CASO 11: Riesgo alto (ICE ≥ 0.60)
   * ICE = 108 / 165 = 0.655
   */
  it('cintura 108cm / talla 165cm → ICE 0.655 — riesgo_alto', () => {
    const r = calcularICE({ cintura_cm: 108, talla_cm: 165 });
    expect(r.ice).toBeCloseTo(0.655, 2);
    expect(r.riesgo).toBe('riesgo_alto');
  });
});

// ===========================================================================
// BLOQUE 4 — Jackson-Pollock 3 pliegues (Densidad Corporal)
// ===========================================================================

describe('calcularDensidadCorporal_JP3_Hombre — Jackson & Pollock 1978', () => {

  /**
   * CASO 12: Hombre deportista 25 años
   * Pliegues: pecho=10, abdominal=20, muslo=15 → Σ3=45mm
   * DC = 1.10938 − (0.0008267×45) + (0.0000016×45²) − (0.0002574×25)
   *    = 1.10938 − 0.037202 + 0.003240 − 0.006435
   *    = 1.068983
   */
  it('hombre 25a / Σ3=45mm → DC ≈ 1.0690', () => {
    const dc = calcularDensidadCorporal_JP3_Hombre({
      pecho_mm:     10,
      abdominal_mm: 20,
      muslo_mm:     15,
      edad_anios:   25,
    });
    expect(dc).toBeCloseTo(1.069, 3);
  });

  /**
   * CASO 13: Hombre con más adiposidad 40 años
   * Pliegues: pecho=25, abdominal=35, muslo=30 → Σ3=90mm
   * DC = 1.10938 − (0.0008267×90) + (0.0000016×8100) − (0.0002574×40)
   *    = 1.10938 − 0.074403 + 0.012960 − 0.010296
   *    = 1.037641
   */
  it('hombre 40a / Σ3=90mm → DC ≈ 1.0376', () => {
    const dc = calcularDensidadCorporal_JP3_Hombre({
      pecho_mm:     25,
      abdominal_mm: 35,
      muslo_mm:     30,
      edad_anios:   40,
    });
    expect(dc).toBeCloseTo(1.038, 3);
  });

  it('lanza RangeError si edad > 61', () => {
    expect(() =>
      calcularDensidadCorporal_JP3_Hombre({
        pecho_mm: 15, abdominal_mm: 20, muslo_mm: 15, edad_anios: 65,
      })
    ).toThrow(RangeError);
  });
});

describe('calcularDensidadCorporal_JP3_Mujer — Jackson, Pollock & Ward 1980', () => {

  /**
   * CASO 14: Mujer activa 30 años
   * Pliegues: triceps=15, suprailiaco=12, muslo=18 → Σ3=45mm
   * DC = 1.099492 − (0.0009929×45) + (0.0000023×2025) − (0.0001392×30)
   *    = 1.099492 − 0.044681 + 0.004658 − 0.004176
   *    = 1.055293
   */
  it('mujer 30a / Σ3=45mm → DC ≈ 1.0553', () => {
    const dc = calcularDensidadCorporal_JP3_Mujer({
      triceps_mm:     15,
      suprailiaco_mm: 12,
      muslo_mm:       18,
      edad_anios:     30,
    });
    expect(dc).toBeCloseTo(1.055, 3);
  });

  it('lanza RangeError si edad > 55', () => {
    expect(() =>
      calcularDensidadCorporal_JP3_Mujer({
        triceps_mm: 15, suprailiaco_mm: 12, muslo_mm: 18, edad_anios: 60,
      })
    ).toThrow(RangeError);
  });
});

// ===========================================================================
// BLOQUE 5 — Fórmula de Siri
// ===========================================================================

describe('calcularPorcentajeGrasa_Siri — Siri 1961', () => {

  /**
   * CASO 15: Densidad 1.065 g/mL
   * %G = ((4.95 / 1.065) − 4.50) × 100
   *    = (4.6479... − 4.50) × 100
   *    = 14.8%
   */
  it('DC 1.065 → %Grasa ≈ 14.8%', () => {
    expect(calcularPorcentajeGrasa_Siri(1.065)).toBeCloseTo(14.8, 0);
  });

  /**
   * CASO 16: Densidad 1.040 g/mL (mayor adiposidad)
   * %G = ((4.95 / 1.040) − 4.50) × 100
   *    = (4.7596 − 4.50) × 100
   *    = 25.96 ≈ 26.0%
   */
  it('DC 1.040 → %Grasa ≈ 26.0%', () => {
    expect(calcularPorcentajeGrasa_Siri(1.040)).toBeCloseTo(26.0, 0);
  });

  it('lanza RangeError si densidad fuera de rango fisiológico', () => {
    expect(() => calcularPorcentajeGrasa_Siri(0.80)).toThrow(RangeError);
    expect(() => calcularPorcentajeGrasa_Siri(1.20)).toThrow(RangeError);
  });
});

// ===========================================================================
// BLOQUE 6 — Composición Corporal Integrada (JP3 + Siri)
// ===========================================================================

describe('calcularComposicion_JP3_Hombre — Integración', () => {

  /**
   * CASO 17: Atleta 25a / 80kg / Σ3=45mm
   * DC ≈ 1.0690 → %G ≈ 13.1% → MG=10.5kg, MM=69.5kg
   */
  it('hombre 25a / 80kg / Σ3=45mm → %Grasa ≈ 13.1%, MM ≈ 69.5kg', () => {
    const r = calcularComposicion_JP3_Hombre(
      { pecho_mm: 10, abdominal_mm: 20, muslo_mm: 15, edad_anios: 25 },
      80
    );
    expect(r.porcentaje_grasa).toBeCloseTo(13.1, 0);
    expect(r.masa_magra_kg).toBeCloseTo(69.5, 0);
    expect(r.masa_grasa_kg).toBeCloseTo(10.9, 0);
    expect(r.formula_pliegues).toBe('jackson_pollock_3h');
    expect(r.formula_grasa).toBe('siri');
    expect(r.suma_pliegues_mm).toBe(45);
  });
});

describe('calcularComposicion_JP3_Mujer — Integración', () => {

  /**
   * CASO 18: Mujer 30a / 60kg / Σ3=45mm
   * DC ≈ 1.0553 → %G ≈ 19.1% → MG=11.5kg, MM=48.5kg
   */
  it('mujer 30a / 60kg / Σ3=45mm → %Grasa ≈ 19.1%, MM ≈ 48.5kg', () => {
    const r = calcularComposicion_JP3_Mujer(
      { triceps_mm: 15, suprailiaco_mm: 12, muslo_mm: 18, edad_anios: 30 },
      60
    );
    expect(r.porcentaje_grasa).toBeCloseTo(19.1, 0);
    expect(r.masa_magra_kg).toBeCloseTo(48.5, 0);
    expect(r.formula_pliegues).toBe('jackson_pollock_3m');
    expect(r.suma_pliegues_mm).toBe(45);
  });

  it('resultado es inmutable', () => {
    const r = calcularComposicion_JP3_Mujer(
      { triceps_mm: 15, suprailiaco_mm: 12, muslo_mm: 18, edad_anios: 30 },
      60
    );
    expect(() => {
      // @ts-expect-error — probando inmutabilidad
      r.porcentaje_grasa = 0;
    }).toThrow();
  });
});

// ===========================================================================
// BLOQUE 7 — Faulkner 4 pliegues
// ===========================================================================

describe('calcularComposicion_Faulkner — Faulkner 1968 (Deportistas)', () => {

  /**
   * CASO 19: Nadador 22a / 75kg
   * Pliegues: triceps=8, subescapular=10, suprailiaco=9, abdominal=12 → Σ4=39mm
   * %G = (39 × 0.153) + 5.783 = 5.967 + 5.783 = 11.75 ≈ 11.8%
   * MG = 0.118 × 75 = 8.85 ≈ 8.9kg
   * MM = 75 − 8.9 = 66.1kg
   */
  it('Σ4=39mm / 75kg → %Grasa ≈ 11.8%, MM ≈ 66.2kg', () => {
    const r = calcularComposicion_Faulkner(
      {
        triceps_mm:      8,
        subescapular_mm: 10,
        suprailiaco_mm:  9,
        abdominal_mm:    12,
      },
      75
    );
    expect(r.porcentaje_grasa).toBeCloseTo(11.8, 0);
    expect(r.masa_magra_kg).toBeCloseTo(66.2, 0);
    expect(r.suma_pliegues_mm).toBe(39);
    expect(r.formula_pliegues).toBe('faulkner_4');
  });

  /**
   * CASO 20: Ciclista con mayor adiposidad
   * Pliegues: triceps=14, subescapular=16, suprailiaco=18, abdominal=20 → Σ4=68mm
   * %G = (68 × 0.153) + 5.783 = 10.404 + 5.783 = 16.19 ≈ 16.2%
   */
  it('Σ4=68mm → %Grasa ≈ 16.2%', () => {
    const r = calcularComposicion_Faulkner(
      {
        triceps_mm:      14,
        subescapular_mm: 16,
        suprailiaco_mm:  18,
        abdominal_mm:    20,
      },
      70
    );
    expect(r.porcentaje_grasa).toBeCloseTo(16.2, 0);
  });

  it('lanza RangeError con pliegue fuera de rango', () => {
    expect(() =>
      calcularComposicion_Faulkner(
        { triceps_mm: 0, subescapular_mm: 10, suprailiaco_mm: 10, abdominal_mm: 10 },
        70
      )
    ).toThrow(RangeError);
  });
});

// ===========================================================================
// BLOQUE 8 — AMB + CMB
// ===========================================================================

describe('calcularAMB — Frisancho 1981', () => {

  /**
   * CASO 21: Hombre adulto con masa muscular adecuada
   * CB=32cm, PT=12mm=1.2cm
   * CMB = 32 − (π × 1.2) = 32 − 3.7699 = 28.23 cm
   * AMB = (28.23²) / (4π) = 797.33 / 12.566 = 63.45 cm²
   * Referencia hombre: 54.0 cm² → adecuación = 117% → adecuada
   */
  it('hombre CB=32cm / PT=12mm → AMB ≈ 63.4cm² — adecuada', () => {
    const r = calcularAMB({
      circunferencia_brazo_cm: 32,
      pliegue_triceps_mm:      12,
      sexo:                    'masculino',
      edad_anios:              35,
    });
    expect(r.amb_cm2).toBeCloseTo(63.4, 0);
    expect(r.clasificacion).toBe('adecuada');
  });

  /**
   * CASO 22: Mujer con depleción leve
   * CB=23cm, PT=14mm=1.4cm
   * CMB = 23 − (π × 1.4) = 23 − 4.398 = 18.602 cm
   * AMB = (18.602²) / (4π) = 346.03 / 12.566 = 27.54 cm²
   * Referencia mujer: 30.5 cm² → adecuación = 90.3% → adecuada (límite)
   */
  it('mujer CB=23cm / PT=14mm → AMB ≈ 27.5cm² — adecuada (límite)', () => {
    const r = calcularAMB({
      circunferencia_brazo_cm: 23,
      pliegue_triceps_mm:      14,
      sexo:                    'femenino',
      edad_anios:              45,
    });
    expect(r.amb_cm2).toBeCloseTo(27.5, 0);
    expect(r.clasificacion).toBe('adecuada');
  });

  /**
   * CASO 23: Paciente con depleción severa
   * CB=19cm, PT=10mm=1.0cm
   * CMB = 19 − (π × 1.0) = 19 − 3.1416 = 15.858 cm
   * AMB = (15.858²) / (4π) = 251.48 / 12.566 = 20.01 cm²
   * Referencia mujer: 30.5 cm² → adecuación = 65.6% → deplecion_severa
   */
  it('mujer desnutrida CB=19cm / PT=10mm → AMB ≈ 20.0cm² — deplecion_severa', () => {
    const r = calcularAMB({
      circunferencia_brazo_cm: 19,
      pliegue_triceps_mm:      10,
      sexo:                    'femenino',
      edad_anios:              55,
    });
    expect(r.amb_cm2).toBeCloseTo(20.0, 0);
    expect(r.clasificacion).toBe('deplecion_severa');
  });

  it('expone CMB correctamente', () => {
    const r = calcularAMB({
      circunferencia_brazo_cm: 32,
      pliegue_triceps_mm:      12,
      sexo:                    'masculino',
      edad_anios:              35,
    });
    // CMB = 32 − (π × 1.2) ≈ 28.23 cm
    expect(r.cmb_cm).toBeCloseTo(28.23, 1);
  });

  it('resultado es inmutable', () => {
    const r = calcularAMB({
      circunferencia_brazo_cm: 30,
      pliegue_triceps_mm:      15,
      sexo:                    'masculino',
      edad_anios:              40,
    });
    expect(() => {
      // @ts-expect-error — probando inmutabilidad
      r.amb_cm2 = 0;
    }).toThrow();
  });

  it('lanza RangeError si circunferencia fuera de rango', () => {
    expect(() =>
      calcularAMB({
        circunferencia_brazo_cm: 5,
        pliegue_triceps_mm: 10,
        sexo: 'masculino',
        edad_anios: 30,
      })
    ).toThrow(RangeError);
  });

  it('incluye fuente bibliográfica', () => {
    const r = calcularAMB({
      circunferencia_brazo_cm: 30,
      pliegue_triceps_mm: 12,
      sexo: 'femenino',
      edad_anios: 35,
    });
    expect(r.fuente_bibliografica).toContain('Frisancho');
  });
});