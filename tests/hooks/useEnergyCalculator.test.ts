/**
 * useEnergyCalculator.test.ts — Tests Unitarios del Motor Energético
 * Proyecto NUTRIA — Open Source
 *
 * CASOS DOCUMENTADOS: Todos los valores de referencia están calculados
 * manualmente a partir de las fórmulas publicadas. Los resultados son
 * reproducibles y verificables contra las fuentes bibliográficas.
 *
 * EJECUTAR:  npx vitest run tests/hooks/useEnergyCalculator.test.ts
 */

import { describe, it, expect } from 'vitest';
import {
  calcularTMB_Mifflin,
  calcularTMB_HarrisBenedict,
  calcularTMB_Valencia,
  calcularTMB_KatchMcArdle,
  calcularTMB_Cunningham,
  calcularTMB_Schofield,
  calcularPesoIdeal_Hamwi,
  calcularPesoAjustado,
  getFactorNAF,
  calcularFactorEstrés,
  calcularGET,
} from '../../src/hooks/useEnergyCalculator';

// ===========================================================================
// BLOQUE 1 — Mifflin-St Jeor
// ===========================================================================

describe('calcularTMB_Mifflin — Mifflin-St Jeor (1990)', () => {

  /**
   * CASO 1: Mujer adulta de referencia
   * Cálculo: (10×65) + (6.25×165) − (5×30) − 161
   *        = 650 + 1031.25 − 150 − 161
   *        = 1370.25 kcal
   */
  it('mujer 30a / 65kg / 165cm → TMB ≈ 1370.3 kcal', () => {
    const resultado = calcularTMB_Mifflin({
      peso_kg:    65,
      talla_cm:   165,
      edad_anios: 30,
      sexo:       'femenino',
    });
    expect(resultado.tmb_kcal).toBeCloseTo(1370.3, 0);
    expect(resultado.formula_usada).toBe('mifflin_st_jeor');
  });

  /**
   * CASO 2: Hombre adulto de referencia
   * Cálculo: (10×80) + (6.25×178) − (5×25) + 5
   *        = 800 + 1112.5 − 125 + 5
   *        = 1792.5 kcal
   */
  it('hombre 25a / 80kg / 178cm → TMB ≈ 1792.5 kcal', () => {
    const resultado = calcularTMB_Mifflin({
      peso_kg:    80,
      talla_cm:   178,
      edad_anios: 25,
      sexo:       'masculino',
    });
    expect(resultado.tmb_kcal).toBeCloseTo(1792.5, 0);
  });

  /**
   * CASO 3: Adulto mayor — validar que la fórmula no colapsa en edad extrema
   * Cálculo: (10×60) + (6.25×160) − (5×70) − 161
   *        = 600 + 1000 − 350 − 161 = 1089 kcal
   */
  it('mujer 70a / 60kg / 160cm → TMB ≈ 1089.0 kcal', () => {
    const resultado = calcularTMB_Mifflin({
      peso_kg:    60,
      talla_cm:   160,
      edad_anios: 70,
      sexo:       'femenino',
    });
    expect(resultado.tmb_kcal).toBeCloseTo(1089.0, 0);
  });

  it('lanza RangeError si peso_kg está fuera de rango fisiológico', () => {
    expect(() =>
      calcularTMB_Mifflin({ peso_kg: 5, talla_cm: 170, edad_anios: 30, sexo: 'masculino' })
    ).toThrow(RangeError);
  });

  it('lanza RangeError si edad es menor a 18 años (no pediátrico)', () => {
    expect(() =>
      calcularTMB_Mifflin({ peso_kg: 50, talla_cm: 160, edad_anios: 10, sexo: 'femenino' })
    ).toThrow(RangeError);
  });

  it('incluye cita bibliográfica en el resultado', () => {
    const resultado = calcularTMB_Mifflin({
      peso_kg: 70, talla_cm: 170, edad_anios: 35, sexo: 'masculino',
    });
    expect(resultado.fuente_bibliografica).toContain('Mifflin');
    expect(resultado.fuente_bibliografica).toContain('1990');
  });
});

// ===========================================================================
// BLOQUE 2 — Harris-Benedict (Roza & Shizgal 1984)
// ===========================================================================

describe('calcularTMB_HarrisBenedict — Roza & Shizgal (1984)', () => {

  /**
   * CASO 4: Paciente hospitalizado masculino
   * Cálculo: 88.362 + (13.397×75) + (4.799×175) − (5.677×45)
   *        = 88.362 + 1004.775 + 839.825 − 255.465
   *        = 1677.5 kcal
   */
  it('hombre 45a / 75kg / 175cm → TMB ≈ 1677.5 kcal', () => {
    const resultado = calcularTMB_HarrisBenedict({
      peso_kg:    75,
      talla_cm:   175,
      edad_anios: 45,
      sexo:       'masculino',
    });
    expect(resultado.tmb_kcal).toBeCloseTo(1677.5, 0);
    expect(resultado.formula_usada).toBe('harris_benedict');
  });

  /**
   * CASO 5: Mujer hospitalizada
   * Cálculo: 447.593 + (9.247×58) + (3.098×155) − (4.330×52)
   *        = 447.593 + 536.326 + 480.19 − 225.16
   *        = 1238.9 kcal
   */
  it('mujer 52a / 58kg / 155cm → TMB ≈ 1238.9 kcal', () => {
    const resultado = calcularTMB_HarrisBenedict({
      peso_kg:    58,
      talla_cm:   155,
      edad_anios: 52,
      sexo:       'femenino',
    });
    expect(resultado.tmb_kcal).toBeCloseTo(1238.9, 0);
  });
});

// ===========================================================================
// BLOQUE 3 — Valencia (Población Mexicana — INNSZ)
// ===========================================================================

describe('calcularTMB_Valencia — INNSZ / Población Mexicana (1994)', () => {

  /**
   * CASO 6: Adulto mexicano 40 años
   * Cálculo (hombre): (13.08×72) + 693 = 941.76 + 693 = 1634.76 kcal
   */
  it('hombre 40a / 72kg → TMB ≈ 1634.8 kcal', () => {
    const resultado = calcularTMB_Valencia({
      peso_kg:    72,
      talla_cm:   170, // talla_cm presente en params pero no usada en esta fórmula
      edad_anios: 40,
      sexo:       'masculino',
    });
    expect(resultado.tmb_kcal).toBeCloseTo(1634.8, 0);
    expect(resultado.formula_usada).toBe('valencia');
  });

  /**
   * CASO 7: Adulta mexicana 35 años
   * Cálculo (mujer): (10.92×60) + 679 = 655.2 + 679 = 1334.2 kcal
   */
  it('mujer 35a / 60kg → TMB ≈ 1334.2 kcal', () => {
    const resultado = calcularTMB_Valencia({
      peso_kg:    60,
      talla_cm:   160,
      edad_anios: 35,
      sexo:       'femenino',
    });
    expect(resultado.tmb_kcal).toBeCloseTo(1334.2, 0);
  });

  it('lanza RangeError si edad < 30 (fuera de validación del estudio)', () => {
    expect(() =>
      calcularTMB_Valencia({ peso_kg: 65, talla_cm: 165, edad_anios: 25, sexo: 'femenino' })
    ).toThrow(RangeError);
  });

  it('lanza RangeError si edad > 60 (fuera de validación del estudio)', () => {
    expect(() =>
      calcularTMB_Valencia({ peso_kg: 65, talla_cm: 165, edad_anios: 65, sexo: 'masculino' })
    ).toThrow(RangeError);
  });
});

// ===========================================================================
// BLOQUE 4 — Katch-McArdle y Cunningham (masa magra)
// ===========================================================================

describe('calcularTMB_KatchMcArdle — Atletas con masa magra (McArdle 2015)', () => {

  /**
   * CASO 8: Atleta con 70 kg masa magra
   * Cálculo: 370 + (21.6 × 70) = 370 + 1512 = 1882 kcal
   */
  it('masa_magra 70kg → TMB = 1882.0 kcal', () => {
    const resultado = calcularTMB_KatchMcArdle({
      peso_kg:      90,
      masa_magra_kg: 70,
      talla_cm:     182,
      edad_anios:   28,
      sexo:         'masculino',
    });
    expect(resultado.tmb_kcal).toBeCloseTo(1882.0, 0);
    expect(resultado.formula_usada).toBe('katch_mcardle');
  });

  it('lanza RangeError si masa_magra >= peso_kg (imposible fisiológicamente)', () => {
    expect(() =>
      calcularTMB_KatchMcArdle({
        peso_kg: 70, masa_magra_kg: 70, talla_cm: 175, edad_anios: 30, sexo: 'masculino',
      })
    ).toThrow(RangeError);
  });
});

describe('calcularTMB_Cunningham — Alta masa muscular (Cunningham 1980)', () => {

  /**
   * CASO 9: Culturista / deportista fuerza
   * Cálculo: 500 + (22 × 75) = 500 + 1650 = 2150 kcal
   */
  it('masa_magra 75kg → TMB = 2150.0 kcal', () => {
    const resultado = calcularTMB_Cunningham({
      peso_kg:       92,
      masa_magra_kg: 75,
      talla_cm:      180,
      edad_anios:    26,
      sexo:          'masculino',
    });
    expect(resultado.tmb_kcal).toBeCloseTo(2150.0, 0);
    expect(resultado.formula_usada).toBe('cunningham');
  });
});

// ===========================================================================
// BLOQUE 5 — Schofield (OMS — Pediatría)
// ===========================================================================

describe('calcularTMB_Schofield — OMS/WHO 1985 (Pediatría + adultos)', () => {

  /**
   * CASO 10: Niño de 8 años
   * Coeficiente masculino 3-9: a=22.7, b=495
   * Cálculo: (22.7 × 27) + 495 = 612.9 + 495 = 1107.9 kcal
   */
  it('niño 8a / 27kg → TMB ≈ 1107.9 kcal', () => {
    const resultado = calcularTMB_Schofield({
      peso_kg:    27,
      talla_cm:   128,
      edad_anios: 8,
      sexo:       'masculino',
    });
    expect(resultado.tmb_kcal).toBeCloseTo(1107.9, 0);
    expect(resultado.formula_usada).toBe('schofield');
  });

  /**
   * CASO 11: Niña adolescente 14 años
   * Coeficiente femenino 10-17: a=12.2, b=746
   * Cálculo: (12.2 × 52) + 746 = 634.4 + 746 = 1380.4 kcal
   */
  it('niña 14a / 52kg → TMB ≈ 1380.4 kcal', () => {
    const resultado = calcularTMB_Schofield({
      peso_kg:    52,
      talla_cm:   158,
      edad_anios: 14,
      sexo:       'femenino',
    });
    expect(resultado.tmb_kcal).toBeCloseTo(1380.4, 0);
  });

  /**
   * CASO 12: Adulto mayor 65 años (masculino)
   * Coeficiente masculino ≥60: a=13.5, b=487
   * Cálculo: (13.5 × 68) + 487 = 918 + 487 = 1405 kcal
   */
  it('hombre 65a / 68kg → TMB = 1405.0 kcal', () => {
    const resultado = calcularTMB_Schofield({
      peso_kg:    68,
      talla_cm:   168,
      edad_anios: 65,
      sexo:       'masculino',
    });
    expect(resultado.tmb_kcal).toBeCloseTo(1405.0, 0);
  });
});

// ===========================================================================
// BLOQUE 6 — Peso Ajustado
// ===========================================================================

describe('calcularPesoIdeal_Hamwi + calcularPesoAjustado', () => {

  /**
   * CASO 13: Hombre 175cm
   * Hamwi: 48 + 2.7 × ((175-150) / 2.5) = 48 + 2.7 × 10 = 48 + 27 = 75 kg
   */
  it('calcularPesoIdeal_Hamwi: hombre 175cm → 75.0 kg', () => {
    expect(calcularPesoIdeal_Hamwi(175, 'masculino')).toBeCloseTo(75.0, 0);
  });

  /**
   * CASO 14: Mujer 160cm
   * Hamwi: 45 + 2.2 × ((160-150) / 2.5) = 45 + 2.2 × 4 = 45 + 8.8 = 53.8 kg
   */
  it('calcularPesoIdeal_Hamwi: mujer 160cm → 53.8 kg', () => {
    expect(calcularPesoIdeal_Hamwi(160, 'femenino')).toBeCloseTo(53.8, 0);
  });

  /**
   * CASO 15: Peso ajustado para paciente obeso
   * Paciente: 100kg actual, 75kg ideal
   * Ajustado: ((100 - 75) × 0.25) + 75 = 6.25 + 75 = 81.25 kg
   */
  it('calcularPesoAjustado: 100kg actual / 75kg ideal → 81.25 kg', () => {
    expect(calcularPesoAjustado(100, 75)).toBeCloseTo(81.25, 1);
  });

  it('calcularPesoAjustado: devuelve peso actual si no hay exceso', () => {
    expect(calcularPesoAjustado(70, 75)).toBe(70); // peso actual < ideal → sin ajuste
  });
});

// ===========================================================================
// BLOQUE 7 — Factor de Estrés Metabólico
// ===========================================================================

describe('calcularFactorEstrés — ASPEN 2016 + DuBois', () => {

  it('"ninguno" → factor = 0', () => {
    expect(calcularFactorEstrés('ninguno')).toBe(0);
  });

  it('"sepsis" → factor = 0.40 (media del rango 0.20-0.60)', () => {
    expect(calcularFactorEstrés('sepsis')).toBeCloseTo(0.40, 2);
  });

  /**
   * CASO FIEBRE:
   * Temperatura 39°C → (39-37) × 0.13 = 0.26 (26% sobre la TMB)
   */
  it('"fiebre" 39°C → factor = 0.26', () => {
    expect(calcularFactorEstrés('fiebre', 39)).toBeCloseTo(0.26, 2);
  });

  it('"fiebre" 37°C (sin fiebre real) → factor = 0', () => {
    expect(calcularFactorEstrés('fiebre', 37)).toBe(0);
  });

  it('"fiebre" sin temperatura lanza RangeError si temp extrema', () => {
    expect(() => calcularFactorEstrés('fiebre', 44)).toThrow(RangeError);
  });

  it('"traumatismo_craneal" → factor fijo = 0.50', () => {
    expect(calcularFactorEstrés('traumatismo_craneal')).toBe(0.50);
  });
});

// ===========================================================================
// BLOQUE 8 — calcularGET (orquestador completo)
// ===========================================================================

describe('calcularGET — Casos Clínicos Integrales', () => {

  /**
   * CASO CLÍNICO A: Mujer 30a, sin obesidad, actividad moderada
   * TMB Mifflin: (10×65) + (6.25×165) − (5×30) − 161 = 1370.25 kcal
   * NAF moderado: × 1.55 → 2123.9 kcal
   * ETA 10%: + 212.4 → GET = 2336.3 kcal
   */
  it('[CASO A] Mujer 30a/65kg/165cm — NAF moderado → GET ≈ 2336 kcal', () => {
    const resultado = calcularGET({
      peso_kg:    65,
      talla_cm:   165,
      edad_anios: 30,
      sexo:       'femenino',
      naf:        'moderado',
      formula_tmb:'mifflin_st_jeor',
    });

    expect(resultado.tmb_kcal).toBeCloseTo(1370.3, 0);
    expect(resultado.naf_valor).toBe(1.55);
    expect(resultado.get_final_kcal).toBeCloseTo(2336.3, 0);
    expect(resultado.peso_ajustado).toBe(false);
    expect(resultado.factor_estres_aplicado).toBe('ninguno');
    expect(resultado.factor_estres_valor).toBe(0);
    expect(resultado.get_con_estres_kcal).toBe(resultado.get_final_kcal);
  });

  /**
   * CASO CLÍNICO B: Paciente con obesidad (IMC > 30) — debe aplicar peso ajustado
   * Mujer 40a / 100kg / 160cm → IMC = 39.1 (obesidad II)
   * Peso ideal Hamwi: 45 + 2.2×((160-150)/2.5) = 45 + 8.8 = 53.8 kg
   * Peso ajustado: ((100-53.8)×0.25) + 53.8 = 11.55 + 53.8 = 65.35 kg
   * TMB Mifflin con 65.35kg: (10×65.35) + (6.25×160) − (5×40) − 161 = 1191.75 kcal
   */
  it('[CASO B] Mujer 40a/100kg/160cm — obesidad → usa peso ajustado', () => {
    const resultado = calcularGET({
      peso_kg:    100,
      talla_cm:   160,
      edad_anios: 40,
      sexo:       'femenino',
      naf:        'sedentario',
      formula_tmb:'mifflin_st_jeor',
    });

    expect(resultado.peso_ajustado).toBe(true);
    expect(resultado.peso_utilizado_kg).toBeCloseTo(65.35, 0);
    // TMB debe ser menor que si se usara peso actual
    expect(resultado.tmb_kcal).toBeLessThan(1650);
  });

  /**
   * CASO CLÍNICO C: Atleta masculino — Katch-McArdle + NAF intenso
   * TMB Katch: 370 + (21.6 × 72) = 1925.2 kcal
   * NAF intenso: × 1.725 → 3320.97 kcal
   * ETA: + 332.1 → GET = 3653.1 kcal
   */
  it('[CASO C] Atleta hombre / masa_magra 72kg / NAF intenso → GET ≈ 3653 kcal', () => {
    const resultado = calcularGET({
      peso_kg:       90,
      masa_magra_kg: 72,
      talla_cm:      182,
      edad_anios:    27,
      sexo:          'masculino',
      naf:           'intenso',
      formula_tmb:   'katch_mcardle',
    });

    expect(resultado.tmb_kcal).toBeCloseTo(1925.2, 0);
    expect(resultado.get_final_kcal).toBeCloseTo(3653.0, 0);
    expect(resultado.formula_tmb).toBe('katch_mcardle');
  });

  /**
   * CASO CLÍNICO D: Paciente con sepsis — factor estrés aplicado
   * TMB Mifflin hombre 50a/70kg/170cm: (10×70) + (6.25×170) − (5×50) + 5 = 1517.5 kcal
   * GET_final (sedentario, ETA incl.): 1517.5 × 1.20 × 1.10 = 2003.1 kcal
   * Estrés sepsis (0.40): + (1517.5 × 0.40) = + 607.0
   * GET_con_estres ≈ 2610.1 kcal
   */
  it('[CASO D] Hombre 50a/70kg/170cm — sepsis → GET con estrés ≈ 2601 kcal', () => {
    const resultado = calcularGET({
      peso_kg:       70,
      talla_cm:      170,
      edad_anios:    50,
      sexo:          'masculino',
      naf:           'sedentario',
      formula_tmb:   'mifflin_st_jeor',
      factor_estres: 'sepsis',
    });

    expect(resultado.tmb_kcal).toBeCloseTo(1517.5, 0);
    expect(resultado.factor_estres_aplicado).toBe('sepsis');
    expect(resultado.factor_estres_valor).toBe(0.40);
    expect(resultado.get_con_estres_kcal).toBeGreaterThan(resultado.get_final_kcal);
    expect(resultado.get_con_estres_kcal).toBeCloseTo(2610.1, 0);
  });

  /**
   * CASO CLÍNICO E: Niño 6 años — Schofield (solo fórmula pediátrica)
   * Coeficiente Schofield masculino 3-9: a=22.7, b=495
   * TMB: (22.7×20) + 495 = 454 + 495 = 949 kcal
   * GET ligero × 1.375 + ETA: 949 × 1.375 × 1.10 = 1434.4 kcal
   */
  it('[CASO E] Niño 6a/20kg — Schofield + NAF ligero → GET ≈ 1434 kcal', () => {
    const resultado = calcularGET({
      peso_kg:    20,
      talla_cm:   116,
      edad_anios: 6,
      sexo:       'masculino',
      naf:        'ligero',
      formula_tmb:'schofield',
    });

    expect(resultado.tmb_kcal).toBeCloseTo(949.0, 0);
    expect(resultado.get_final_kcal).toBeCloseTo(1435.4, 0);
    expect(resultado.formula_tmb).toBe('schofield');
  });

  /**
   * CASO CLÍNICO F: Resultado inmutable — no debe poder mutar
   */
  it('el objeto ResultadoGET es inmutable (Object.freeze)', () => {
    const resultado = calcularGET({
      peso_kg: 70, talla_cm: 170, edad_anios: 35, sexo: 'masculino',
      naf: 'moderado', formula_tmb: 'mifflin_st_jeor',
    });

    expect(() => {
      // @ts-expect-error — probando inmutabilidad intencionalmente
      resultado.tmb_kcal = 9999;
    }).toThrow();
  });

  /**
   * CASO CLÍNICO G: Error si fórmula con masa magra no recibe masa_magra_kg
   */
  it('lanza Error si katch_mcardle no recibe masa_magra_kg', () => {
    expect(() =>
      calcularGET({
        peso_kg: 80, talla_cm: 175, edad_anios: 30, sexo: 'masculino',
        naf: 'moderado', formula_tmb: 'katch_mcardle',
        // masa_magra_kg ausente intencionalmente
      })
    ).toThrow('[NUTRIA] calcularGET: masa_magra_kg es requerida');
  });
});

// ===========================================================================
// BLOQUE 9 — getFactorNAF
// ===========================================================================

describe('getFactorNAF — Constantes OMS/IOM', () => {
  it('sedentario → 1.20', () => expect(getFactorNAF('sedentario')).toBe(1.20));
  it('ligero → 1.375',    () => expect(getFactorNAF('ligero')).toBe(1.375));
  it('moderado → 1.55',   () => expect(getFactorNAF('moderado')).toBe(1.55));
  it('intenso → 1.725',   () => expect(getFactorNAF('intenso')).toBe(1.725));
  it('muy_intenso → 1.90',() => expect(getFactorNAF('muy_intenso')).toBe(1.90));
});