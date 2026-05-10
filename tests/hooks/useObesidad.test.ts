/**
 * useObesidad.test.ts — Tests Unitarios del Motor de Obesidad y Riesgo CV
 * Proyecto NUTRIA — Open Source
 *
 * Todos los valores de referencia están calculados manualmente
 * a partir de las fórmulas bibliográficas originales.
 *
 * EJECUTAR: npx vitest run tests/hooks/useObesidad.test.ts
 *
 * @source Wilson PWF et al. Circulation. 1998;97(18):1837-1847.  (Framingham)
 * @source Valdez R. J Clin Epidemiol. 1991;44(9):955-956.        (Índ. Conicidad)
 * @source Castelli WP et al. Circulation. 1983;67(4):730-734.    (Índ. Aterogénico)
 * @source NCEP ATP-III. JAMA. 2001;285(19):2486-2497.            (No-HDL)
 * @source Drewnowski A, Specter SE. Am J Clin Nutr. 2004;79(1):6-16. (DC)
 */

import { describe, it, expect } from 'vitest';
import {
  calcularDensidadCalórica,
  calcularDensidadMenuCompleto,
  calcularÍndiceAterogénico,
  calcularNoHDL,
  calcularÍndiceConicidad,
  calcularFramingham,
} from '../../src/hooks/useObesidad';

// ===========================================================================
// BLOQUE 1 — DENSIDAD CALÓRICA
// ===========================================================================

describe('calcularDensidadCalórica — Drewnowski 2004', () => {

  /**
   * Aceite de oliva: 900 kcal / 100 g = 9.0 kcal/g → alta (> 4.0)
   */
  it('aceite de oliva: 900 kcal / 100 g → DC = 9.0 → alta', () => {
    const r = calcularDensidadCalórica({ nombre: 'Aceite de oliva', kcal: 900, gramos: 100 });
    expect(r.dc_kcal_g).toBeCloseTo(9.0, 2);
    expect(r.clasificacion).toBe('alta');
    expect(r.etiqueta).toBe('Alta');
  });

  /**
   * Manzana: 52 kcal / 100 g = 0.52 kcal/g → muy baja (< 0.6)
   */
  it('manzana: 52 kcal / 100 g → DC = 0.52 → muy_baja', () => {
    const r = calcularDensidadCalórica({ nombre: 'Manzana', kcal: 52, gramos: 100 });
    expect(r.dc_kcal_g).toBeCloseTo(0.52, 2);
    expect(r.clasificacion).toBe('muy_baja');
    expect(r.etiqueta).toBe('Muy baja');
  });

  /**
   * Pechuga de pollo: 165 kcal / 100 g = 1.65 kcal/g → media (1.5–4.0)
   */
  it('pechuga de pollo: 165 kcal / 100 g → DC = 1.65 → media', () => {
    const r = calcularDensidadCalórica({ nombre: 'Pechuga pollo', kcal: 165, gramos: 100 });
    expect(r.dc_kcal_g).toBeCloseTo(1.65, 2);
    expect(r.clasificacion).toBe('media');
    expect(r.etiqueta).toBe('Media');
  });

  /**
   * Pan blanco: 265 kcal / 100 g = 2.65 kcal/g → media (1.5–4.0)
   */
  it('pan blanco: 265 kcal / 100 g → DC = 2.65 → media', () => {
    const r = calcularDensidadCalórica({ nombre: 'Pan blanco', kcal: 265, gramos: 100 });
    expect(r.dc_kcal_g).toBeCloseTo(2.65, 2);
    expect(r.clasificacion).toBe('media');
    expect(r.etiqueta).toBe('Media');
  });

  /**
   * Espinaca cruda: 23 kcal / 100 g = 0.23 kcal/g → muy baja
   */
  it('espinaca: 23 kcal / 100 g → DC = 0.23 → muy_baja', () => {
    const r = calcularDensidadCalórica({ nombre: 'Espinaca', kcal: 23, gramos: 100 });
    expect(r.dc_kcal_g).toBeCloseTo(0.23, 2);
    expect(r.clasificacion).toBe('muy_baja');
  });

  /**
   * Frijoles cocidos: 90 kcal / 100 g = 0.90 kcal/g → baja (0.6–1.5)
   */
  it('frijoles cocidos: 90 kcal / 100 g → DC = 0.90 → baja', () => {
    const r = calcularDensidadCalórica({ nombre: 'Frijoles cocidos', kcal: 90, gramos: 100 });
    expect(r.dc_kcal_g).toBeCloseTo(0.90, 2);
    expect(r.clasificacion).toBe('baja');
    expect(r.etiqueta).toBe('Baja');
  });

  /**
   * Frontera exacta baja–media: 1.5 kcal/g → baja (límite superior incluido)
   */
  it('frontera 1.5 kcal/g → baja (límite superior inclusivo)', () => {
    const r = calcularDensidadCalórica({ nombre: 'Límite', kcal: 150, gramos: 100 });
    expect(r.dc_kcal_g).toBeCloseTo(1.5, 1);
    expect(r.clasificacion).toBe('baja');
  });

  /**
   * Verifica que gramos = 0 lanza error
   */
  it('gramos = 0 → lanza RangeError', () => {
    expect(() => calcularDensidadCalórica({ nombre: 'Error', kcal: 100, gramos: 0 }))
      .toThrow(RangeError);
  });
});

// ===========================================================================
// BLOQUE 2 — ÍNDICE ATEROGÉNICO
// ===========================================================================

describe('calcularÍndiceAterogénico — Castelli 1983', () => {

  /**
   * CT = 200, HDL = 50 → IA = 200/50 = 4.0 → normal (3.5–5.0)
   */
  it('CT=200, HDL=50 → IA=4.0 → normal', () => {
    const r = calcularÍndiceAterogénico({ colesterol_total_mg_dL: 200, hdl_mg_dL: 50 });
    expect(r.ia).toBeCloseTo(4.0, 2);
    expect(r.clasificacion).toBe('normal');
    expect(r.etiqueta).toBe('Normal');
  });

  /**
   * CT = 240, HDL = 35 → IA = 240/35 = 6.857... ≈ 6.86 → muy_alto (> 6.0)
   */
  it('CT=240, HDL=35 → IA≈6.86 → muy_alto', () => {
    const r = calcularÍndiceAterogénico({ colesterol_total_mg_dL: 240, hdl_mg_dL: 35 });
    expect(r.ia).toBeCloseTo(6.86, 1);
    expect(r.clasificacion).toBe('muy_alto');
    expect(r.etiqueta).toBe('Muy alto');
  });

  /**
   * CT = 180, HDL = 60 → IA = 180/60 = 3.0 → óptimo (< 3.5)
   */
  it('CT=180, HDL=60 → IA=3.0 → optimo', () => {
    const r = calcularÍndiceAterogénico({ colesterol_total_mg_dL: 180, hdl_mg_dL: 60 });
    expect(r.ia).toBeCloseTo(3.0, 2);
    expect(r.clasificacion).toBe('optimo');
    expect(r.etiqueta).toBe('Óptimo');
  });

  /**
   * CT = 270, HDL = 50 → IA = 270/50 = 5.4 → alto (5.0–6.0)
   */
  it('CT=270, HDL=50 → IA=5.4 → alto', () => {
    const r = calcularÍndiceAterogénico({ colesterol_total_mg_dL: 270, hdl_mg_dL: 50 });
    expect(r.ia).toBeCloseTo(5.4, 1);
    expect(r.clasificacion).toBe('alto');
  });

  /**
   * Frontera exacta normal–alto: IA = 5.0 → normal (límite superior incluido)
   */
  it('IA = 5.0 exacto → normal (límite superior inclusivo)', () => {
    const r = calcularÍndiceAterogénico({ colesterol_total_mg_dL: 250, hdl_mg_dL: 50 });
    expect(r.ia).toBeCloseTo(5.0, 1);
    expect(r.clasificacion).toBe('normal');
  });
});

// ===========================================================================
// BLOQUE 3 — NO-HDL
// ===========================================================================

describe('calcularNoHDL — ATP-III / NCEP 2001', () => {

  /**
   * CT = 200, HDL = 50 → No-HDL = 200 − 50 = 150 → límite (130–159)
   */
  it('CT=200, HDL=50 → No-HDL=150 → limite', () => {
    const r = calcularNoHDL({ colesterol_total_mg_dL: 200, hdl_mg_dL: 50 });
    expect(r.no_hdl_mg_dL).toBeCloseTo(150, 0);
    expect(r.clasificacion).toBe('limite');
    expect(r.etiqueta).toBe('Límite');
  });

  /**
   * CT = 180, HDL = 60 → No-HDL = 180 − 60 = 120 → óptimo (< 130)
   */
  it('CT=180, HDL=60 → No-HDL=120 → optimo', () => {
    const r = calcularNoHDL({ colesterol_total_mg_dL: 180, hdl_mg_dL: 60 });
    expect(r.no_hdl_mg_dL).toBeCloseTo(120, 0);
    expect(r.clasificacion).toBe('optimo');
    expect(r.etiqueta).toBe('Óptimo');
  });

  /**
   * CT = 250, HDL = 40 → No-HDL = 250 − 40 = 210 → muy_alto (≥ 190)
   */
  it('CT=250, HDL=40 → No-HDL=210 → muy_alto', () => {
    const r = calcularNoHDL({ colesterol_total_mg_dL: 250, hdl_mg_dL: 40 });
    expect(r.no_hdl_mg_dL).toBeCloseTo(210, 0);
    expect(r.clasificacion).toBe('muy_alto');
    expect(r.etiqueta).toBe('Muy alto');
  });

  /**
   * CT = 220, HDL = 45 → No-HDL = 175 → alto (160–189)
   */
  it('CT=220, HDL=45 → No-HDL=175 → alto', () => {
    const r = calcularNoHDL({ colesterol_total_mg_dL: 220, hdl_mg_dL: 45 });
    expect(r.no_hdl_mg_dL).toBeCloseTo(175, 0);
    expect(r.clasificacion).toBe('alto');
  });

  /**
   * Frontera exacta: No-HDL = 130 → límite
   */
  it('No-HDL = 130 exacto → limite', () => {
    const r = calcularNoHDL({ colesterol_total_mg_dL: 190, hdl_mg_dL: 60 });
    expect(r.no_hdl_mg_dL).toBeCloseTo(130, 0);
    expect(r.clasificacion).toBe('limite');
  });
});

// ===========================================================================
// BLOQUE 4 — ÍNDICE DE CONICIDAD
// ===========================================================================

describe('calcularÍndiceConicidad — Valdez 1991', () => {

  /**
   * Hombre: cintura=90cm, peso=80kg, talla=175cm
   *
   * Cálculo manual:
   *   talla_m = 1.75
   *   denominador = 0.109 × √(80 / 1.75)
   *              = 0.109 × √45.714...
   *              = 0.109 × 6.7612...
   *              = 0.73697...
   *
   *   IC = 0.90 / 0.73697 = 1.2213... ≈ 1.221
   *
   *   Punto de corte hombre: 1.25 → IC < 1.25 → normal
   */
  it('hombre: cintura=90cm, peso=80kg, talla=175cm → IC≈1.221 → normal', () => {
    const r = calcularÍndiceConicidad({
      cintura_cm: 90,
      peso_kg:    80,
      talla_cm:   175,
      sexo:       'masculino',
    });
    expect(r.ic).toBeCloseTo(1.221, 2);
    expect(r.clasificacion).toBe('normal');
    expect(r.punto_corte_sexo).toBe(1.25);
  });

  /**
   * Hombre con obesidad central: cintura=110cm, peso=100kg, talla=170cm
   *
   * Cálculo manual:
   *   talla_m = 1.70
   *   denominador = 0.109 × √(100 / 1.70)
   *              = 0.109 × √58.824
   *              = 0.109 × 7.6699
   *              = 0.83602
   *
   *   IC = 1.10 / 0.83602 = 1.3158... ≈ 1.316
   *
   *   Punto de corte hombre: 1.25 → IC > 1.25 → riesgo
   */
  it('hombre obeso: cintura=110cm, peso=100kg, talla=170cm → IC≈1.316 → riesgo', () => {
    const r = calcularÍndiceConicidad({
      cintura_cm: 110,
      peso_kg:    100,
      talla_cm:   170,
      sexo:       'masculino',
    });
    expect(r.ic).toBeCloseTo(1.316, 2);
    expect(r.clasificacion).toBe('riesgo');
    expect(r.etiqueta).toBe('Riesgo metabólico elevado');
  });

  /**
   * Mujer: cintura=75cm, peso=60kg, talla=160cm
   *
   * Cálculo manual:
   *   talla_m = 1.60
   *   denominador = 0.109 × √(60 / 1.60)
   *              = 0.109 × √37.5
   *              = 0.109 × 6.1237
   *              = 0.66748
   *
   *   IC = 0.75 / 0.66748 = 1.1237... ≈ 1.124
   *
   *   Punto de corte mujer: 1.18 → IC < 1.18 → normal
   */
  it('mujer: cintura=75cm, peso=60kg, talla=160cm → IC≈1.124 → normal', () => {
    const r = calcularÍndiceConicidad({
      cintura_cm: 75,
      peso_kg:    60,
      talla_cm:   160,
      sexo:       'femenino',
    });
    expect(r.ic).toBeCloseTo(1.124, 2);
    expect(r.clasificacion).toBe('normal');
    expect(r.punto_corte_sexo).toBe(1.18);
  });

  /**
   * Mujer con riesgo: cintura=95cm, peso=75kg, talla=158cm
   *
   * Cálculo manual:
   *   talla_m = 1.58
   *   denominador = 0.109 × √(75 / 1.58)
   *              = 0.109 × √47.468...
   *              = 0.109 × 6.8895
   *              = 0.75096
   *
   *   IC = 0.95 / 0.75096 = 1.2650... ≈ 1.265
   *
   *   Punto de corte mujer: 1.18 → IC > 1.18 → riesgo
   */
  it('mujer con riesgo: cintura=95cm, peso=75kg, talla=158cm → IC>1.18 → riesgo', () => {
    const r = calcularÍndiceConicidad({
      cintura_cm: 95,
      peso_kg:    75,
      talla_cm:   158,
      sexo:       'femenino',
    });
    expect(r.ic).toBeGreaterThan(1.18);
    expect(r.clasificacion).toBe('riesgo');
  });
});

// ===========================================================================
// BLOQUE 5 — FRAMINGHAM
// ===========================================================================

describe('calcularFramingham — Wilson 1998', () => {

  /**
   * Hombre 55 años, CT=240, HDL=45, PS=130, no fumador, sin tratamiento
   *
   * Puntos según Wilson 1998 (Tabla hombres):
   *   Edad 55–59:      +4
   *   CT 240–279:      +2
   *   HDL 45–49:        0
   *   PS 130–139 (sin): +1
   *   Tabaco (no):       0
   *   TOTAL:           +7 → 14 % → intermedio
   */
  it('hombre 55 años, CT=240, HDL=45, PS=130, no fumador, sin tto → 14% → intermedio', () => {
    const r = calcularFramingham({
      sexo:                            'masculino',
      edad_anios:                       55,
      colesterol_total_mg_dL:           240,
      hdl_mg_dL:                         45,
      presion_sistolica_mmHg:           130,
      fumador_activo:                   false,
      bajo_tratamiento_antihipertensivo: false,
    });
    expect(r.puntos_obtenidos).toBe(7);
    expect(r.riesgo_10_anios_pct).toBe(14);
    expect(r.categoria).toBe('intermedio');
  });

  /**
   * Mujer 65 años, CT=280, HDL=35, PS=140, fumadora, con tratamiento
   *
   * Puntos según Wilson 1998 (Tabla mujeres):
   *   Edad 65–69:       +8
   *   CT ≥ 280:         +3
   *   HDL 35–44:        +2
   *   PS 140–159 (con): +5
   *   Tabaco (sí):      +2
   *   TOTAL:           +20 → riesgo muy alto (> max tabla → 30 % clampado)
   */
  it('mujer 65 años, CT=280, HDL=35, PS=140, fumadora, con tto → alto', () => {
    const r = calcularFramingham({
      sexo:                            'femenino',
      edad_anios:                       65,
      colesterol_total_mg_dL:           280,
      hdl_mg_dL:                         35,
      presion_sistolica_mmHg:           140,
      fumador_activo:                   true,
      bajo_tratamiento_antihipertensivo: true,
    });
    expect(r.categoria).toBe('alto');
    expect(r.riesgo_10_anios_pct).toBeGreaterThanOrEqual(20);
  });

  /**
   * Hombre joven 35 años, CT=180, HDL=60, PS=110, no fumador, sin tto
   *
   * Puntos según Wilson 1998:
   *   Edad 35–39:        0
   *   CT 160–199:        0
   *   HDL ≥ 60:         −2
   *   PS < 120 (sin):    0
   *   Tabaco (no):       0
   *   TOTAL:            −2 → 2 % → bajo
   */
  it('hombre 35 años, CT=180, HDL=60, PS=110, no fumador → 2% → bajo', () => {
    const r = calcularFramingham({
      sexo:                            'masculino',
      edad_anios:                       35,
      colesterol_total_mg_dL:           180,
      hdl_mg_dL:                         60,
      presion_sistolica_mmHg:           110,
      fumador_activo:                   false,
      bajo_tratamiento_antihipertensivo: false,
    });
    expect(r.puntos_obtenidos).toBe(-2);
    expect(r.riesgo_10_anios_pct).toBe(2);
    expect(r.categoria).toBe('bajo');
  });

  /**
   * Hombre 50 años con factores: CT=220, HDL=38, PS=150, fumador, con tto
   *
   * Puntos:
   *   Edad 50–54:        +3
   *   CT 200–239:        +1
   *   HDL 35–44:         +1
   *   PS 140–159 (con):  +3
   *   Tabaco (sí):       +2
   *   TOTAL:            +10 → 27 % → alto
   */
  it('hombre 50 años con múltiples factores → alto', () => {
    const r = calcularFramingham({
      sexo:                            'masculino',
      edad_anios:                       50,
      colesterol_total_mg_dL:           220,
      hdl_mg_dL:                         38,
      presion_sistolica_mmHg:           150,
      fumador_activo:                   true,
      bajo_tratamiento_antihipertensivo: true,
    });
    expect(r.puntos_obtenidos).toBe(10);
    expect(r.riesgo_10_anios_pct).toBe(27);
    expect(r.categoria).toBe('alto');
  });

  /**
   * Mujer 45 años, CT=200, HDL=50, PS=115, no fumadora, sin tto
   *
   * Puntos mujeres:
   *   Edad 45–49:        +3
   *   CT 160–199:         0
   *   HDL 50–59:          0
   *   PS < 120 (sin):    -3
   *   Tabaco (no):        0
   *   TOTAL:              0 → 2 % → bajo
   */
  it('mujer 45 años, CT=200, HDL=50, PS=115, no fumadora → bajo', () => {
    const r = calcularFramingham({
      sexo:                            'femenino',
      edad_anios:                       45,
      colesterol_total_mg_dL:           200,
      hdl_mg_dL:                         50,
      presion_sistolica_mmHg:           115,
      fumador_activo:                   false,
      bajo_tratamiento_antihipertensivo: false,
    });
    expect(r.categoria).toBe('bajo');
  });

  /**
   * Validaciones: edad fuera de rango → RangeError
   */
  it('edad < 30 → lanza RangeError', () => {
    expect(() => calcularFramingham({
      sexo:                            'masculino',
      edad_anios:                       25,
      colesterol_total_mg_dL:           200,
      hdl_mg_dL:                         50,
      presion_sistolica_mmHg:           120,
      fumador_activo:                   false,
      bajo_tratamiento_antihipertensivo: false,
    })).toThrow(RangeError);
  });

  it('edad > 74 → lanza RangeError', () => {
    expect(() => calcularFramingham({
      sexo:                            'femenino',
      edad_anios:                       80,
      colesterol_total_mg_dL:           200,
      hdl_mg_dL:                         50,
      presion_sistolica_mmHg:           120,
      fumador_activo:                   false,
      bajo_tratamiento_antihipertensivo: false,
    })).toThrow(RangeError);
  });
});

// ===========================================================================
// BLOQUE 6 — MENÚ COMPLETO (integración)
// ===========================================================================

describe('calcularDensidadMenuCompleto — integración', () => {

  /**
   * Menú de 3 alimentos:
   *   Manzana:   52 kcal, 100g
   *   Pechuga:  165 kcal, 100g
   *   Aceite:   900 kcal, 100g
   *
   *   DC_total = (52 + 165 + 900) / (100 + 100 + 100)
   *            = 1117 / 300 = 3.723... kcal/g → media
   */
  it('menú 3 alimentos → DC promedio ≈ 3.72 → media', () => {
    const r = calcularDensidadMenuCompleto([
      { nombre: 'Manzana',  kcal:  52, gramos: 100 },
      { nombre: 'Pechuga',  kcal: 165, gramos: 100 },
      { nombre: 'Aceite',   kcal: 900, gramos: 100 },
    ]);
    expect(r.dc_promedio_kcal_g).toBeCloseTo(3.72, 1);
    expect(r.clasificacion_promedio).toBe('media');
    expect(r.alimentos).toHaveLength(3);
  });

  /**
   * Lista vacía → Error
   */
  it('lista vacía → lanza Error', () => {
    expect(() => calcularDensidadMenuCompleto([])).toThrow(Error);
  });
});