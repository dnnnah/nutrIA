/**
 * useEmbarazo.test.ts — Tests Unitarios del Motor de Embarazo y Lactancia
 * Proyecto NUTRIA — Open Source
 *
 * Todos los valores de referencia están calculados manualmente a partir de las
 * fórmulas y tablas bibliográficas originales. Son reproducibles y verificables.
 *
 * EJECUTAR: npx vitest run tests/hooks/useEmbarazo.test.ts
 *
 * @source IOM. DRI for Energy. 2002/2005.
 * @source IOM. Weight Gain During Pregnancy. 2009.
 * @source IOM. DRI for Vitamins and Minerals. 2001-2011.
 * @source ACOG Practice Bulletin No. 230. 2021.
 */

import { describe, it, expect } from 'vitest';
import {
  calcularAdicionCalorica,
  calcularGananciaPeso,
  calcularIDRAjustada,
  calcularRecomendacionesNauseas,
} from '../../src/hooks/useEmbarazo';

// ===========================================================================
// BLOQUE 1 — calcularAdicionCalorica
// ===========================================================================

describe('calcularAdicionCalorica — Adición calórica por trimestre y lactancia', () => {

  /**
   * CASO 1: Primer trimestre — sin adición calórica
   * get_total = 1800 + 0 = 1800 kcal
   * @source IOM. DRI for Energy. 2002. Table 5-14.
   */
  it('T1: no agrega calorías — get_total = get_base', () => {
    const r = calcularAdicionCalorica({ get_base_kcal: 1800, trimestre: 'primero' });
    expect(r.adicion_kcal).toBe(0);
    expect(r.get_total_kcal).toBe(1800);
    expect(r.get_base_kcal).toBe(1800);
  });

  /**
   * CASO 2: Segundo trimestre — +340 kcal
   * get_total = 1800 + 340 = 2140 kcal
   */
  it('T2: agrega 340 kcal → get_total = 2140', () => {
    const r = calcularAdicionCalorica({ get_base_kcal: 1800, trimestre: 'segundo' });
    expect(r.adicion_kcal).toBe(340);
    expect(r.get_total_kcal).toBe(2140);
  });

  /**
   * CASO 3: Tercer trimestre — +450 kcal
   * get_total = 2000 + 450 = 2450 kcal
   */
  it('T3: agrega 450 kcal → get_total = 2450', () => {
    const r = calcularAdicionCalorica({ get_base_kcal: 2000, trimestre: 'tercero' });
    expect(r.adicion_kcal).toBe(450);
    expect(r.get_total_kcal).toBe(2450);
  });

  /**
   * CASO 4: Lactancia exclusiva — +500 kcal
   * get_total = 1750 + 500 = 2250 kcal
   * @source IOM. DRI for Energy. 2005. p.363.
   */
  it('Lactancia exclusiva: agrega 500 kcal → get_total = 2250', () => {
    const r = calcularAdicionCalorica({
      get_base_kcal: 1750,
      estado_lactancia: 'exclusiva',
    });
    expect(r.adicion_kcal).toBe(500);
    expect(r.get_total_kcal).toBe(2250);
  });

  /**
   * CASO 5: Lactancia parcial — +330 kcal
   * get_total = 1750 + 330 = 2080 kcal
   */
  it('Lactancia parcial: agrega 330 kcal → get_total = 2080', () => {
    const r = calcularAdicionCalorica({
      get_base_kcal: 1750,
      estado_lactancia: 'parcial',
    });
    expect(r.adicion_kcal).toBe(330);
    expect(r.get_total_kcal).toBe(2080);
  });

  /**
   * CASO 6: Sin lactancia — adición = 0
   */
  it('No lactando: adicion_kcal = 0, get_total = get_base', () => {
    const r = calcularAdicionCalorica({
      get_base_kcal: 1700,
      estado_lactancia: 'no_lactando',
    });
    expect(r.adicion_kcal).toBe(0);
    expect(r.get_total_kcal).toBe(1700);
  });

  /**
   * CASO 7: Trimestre tiene prioridad sobre estado_lactancia
   */
  it('Trimestre tiene prioridad sobre estado_lactancia cuando ambos están presentes', () => {
    const r = calcularAdicionCalorica({
      get_base_kcal: 1800,
      trimestre: 'segundo',
      estado_lactancia: 'exclusiva', // debe ignorarse
    });
    expect(r.adicion_kcal).toBe(340); // trimestre gana
  });

  /**
   * CASO 8: Validación — GET base fuera de rango fisiológico
   */
  it('lanza RangeError si get_base_kcal < 500', () => {
    expect(() =>
      calcularAdicionCalorica({ get_base_kcal: 300, trimestre: 'segundo' }),
    ).toThrow(RangeError);
  });

  it('lanza RangeError si get_base_kcal > 6000', () => {
    expect(() =>
      calcularAdicionCalorica({ get_base_kcal: 8000, trimestre: 'primero' }),
    ).toThrow(RangeError);
  });

  /**
   * CASO 9: El resultado es inmutable (Object.freeze)
   */
  it('el objeto resultado es inmutable', () => {
    const r = calcularAdicionCalorica({ get_base_kcal: 1800, trimestre: 'segundo' });
    expect(Object.isFrozen(r)).toBe(true);
  });

  /**
   * CASO 10: Contiene fuente bibliográfica no vacía
   */
  it('fuente_bibliografica no está vacía', () => {
    const r = calcularAdicionCalorica({ get_base_kcal: 1800, trimestre: 'segundo' });
    expect(r.fuente_bibliografica.length).toBeGreaterThan(10);
  });
});

// ===========================================================================
// BLOQUE 2 — calcularGananciaPeso
// ===========================================================================

describe('calcularGananciaPeso — Ganancia de peso gestacional IOM 2009', () => {

  /**
   * CASO 1: IMC normal (22.0), semana 20
   * Clasificación: normal → ganancia T1 = 1.6 kg
   * Tasa media T2/T3 = (0.42 + 0.59) / 2 = 0.505 kg/semana
   * Semanas T2 hasta semana 20 = 20 - 13 = 7 semanas
   * Ganancia acumulada = 1.6 + 7 × 0.505 = 1.6 + 3.535 = 5.135 ≈ 5.1 kg
   *
   * @source IOM. Weight Gain During Pregnancy. 2009. Table 1.
   */
  it('IMC normal 22.0 — semana 20 → ganancia acumulada ≈ 5.1 kg', () => {
    const r = calcularGananciaPeso({ imc_pregestacional: 22.0, semana_gestacion: 20 });
    expect(r.clasificacion_imc).toBe('normal');
    expect(r.ganancia_actual_recomendada_kg).toBeCloseTo(5.1, 0);
    expect(r.ganancia_total_min_kg).toBe(11.5);
    expect(r.ganancia_total_max_kg).toBe(16.0);
  });

  /**
   * CASO 2: IMC bajo peso (17.0), semana 36
   * Tasa media = (0.51 + 0.59) / 2 = 0.55 kg/semana
   * Semanas pos-T1 = 36 - 13 = 23
   * Ganancia = 2.0 + 23 × 0.55 = 2.0 + 12.65 = 14.65 ≈ 14.7 kg
   */
  it('Bajo peso (IMC 17.0) — semana 36 → ganancia acumulada ≈ 14.7 kg', () => {
    const r = calcularGananciaPeso({ imc_pregestacional: 17.0, semana_gestacion: 36 });
    expect(r.clasificacion_imc).toBe('bajo_peso');
    expect(r.ganancia_actual_recomendada_kg).toBeCloseTo(14.7, 0);
    expect(r.ganancia_total_min_kg).toBe(12.5);
    expect(r.ganancia_total_max_kg).toBe(18.0);
  });

  /**
   * CASO 3: IMC sobrepeso (27.5), semana 10 (dentro de T1)
   * Ganancia T1 estimada = 0.9 kg
   * Interpolación lineal semana 10 de 13: (0.9 / 13) × 10 = 0.692 ≈ 0.7 kg
   */
  it('Sobrepeso (IMC 27.5) — semana 10 (T1) → ganancia ≈ 0.7 kg', () => {
    const r = calcularGananciaPeso({ imc_pregestacional: 27.5, semana_gestacion: 10 });
    expect(r.clasificacion_imc).toBe('sobrepeso');
    expect(r.ganancia_actual_recomendada_kg).toBeCloseTo(0.7, 0);
  });

  /**
   * CASO 4: Obesidad (IMC 33.0)
   * Rango total: 5.0 – 9.0 kg
   */
  it('Obesidad (IMC 33.0) → rango total 5.0–9.0 kg', () => {
    const r = calcularGananciaPeso({ imc_pregestacional: 33.0, semana_gestacion: 20 });
    expect(r.clasificacion_imc).toBe('obesidad');
    expect(r.ganancia_total_min_kg).toBe(5.0);
    expect(r.ganancia_total_max_kg).toBe(9.0);
  });

  /**
   * CASO 5: Punto de corte exacto IMC 25.0 → sobrepeso
   */
  it('IMC = 25.0 exacto → clasificado como sobrepeso', () => {
    const r = calcularGananciaPeso({ imc_pregestacional: 25.0, semana_gestacion: 15 });
    expect(r.clasificacion_imc).toBe('sobrepeso');
  });

  /**
   * CASO 6: Punto de corte exacto IMC 30.0 → obesidad
   */
  it('IMC = 30.0 exacto → clasificado como obesidad', () => {
    const r = calcularGananciaPeso({ imc_pregestacional: 30.0, semana_gestacion: 15 });
    expect(r.clasificacion_imc).toBe('obesidad');
  });

  it('lanza RangeError si semana_gestacion > 40', () => {
    expect(() =>
      calcularGananciaPeso({ imc_pregestacional: 22, semana_gestacion: 41 }),
    ).toThrow(RangeError);
  });

  it('lanza RangeError si imc_pregestacional < 10', () => {
    expect(() =>
      calcularGananciaPeso({ imc_pregestacional: 5, semana_gestacion: 20 }),
    ).toThrow(RangeError);
  });
});

// ===========================================================================
// BLOQUE 3 — calcularIDRAjustada
// ===========================================================================

describe('calcularIDRAjustada — IDR ajustadas embarazo/lactancia (IOM 2001-2011)', () => {

  /**
   * CASO 1: Embarazo segundo trimestre
   * Hierro: 27 mg | Folato: 600 mcg DFE | Calcio: 1000 mg | Vit D: 15 mcg
   * Yodo: 220 mcg | DHA: 200 mg | Proteína adicional: 25 g (T2/T3)
   *
   * @source IOM DRI Iron 2001 p.351 | Folate 1998 p.196 | Calcium 2011 p.1 | Iodine 2001 p.258
   */
  it('Embarazo T2/T3 — todos los valores críticos correctos', () => {
    const r = calcularIDRAjustada({
      es_lactancia: false,
      semana_gestacion: 20,
    });
    expect(r.hierro_mg).toBe(27);
    expect(r.folato_mcg_dfe).toBe(600);
    expect(r.calcio_mg).toBe(1000);
    expect(r.vitamina_d_mcg).toBe(15);
    expect(r.yodo_mcg).toBe(220);
    expect(r.omega3_dha_mg).toBe(200);
    expect(r.proteina_adicional_g).toBe(25);
  });

  /**
   * CASO 2: Embarazo primer trimestre — proteína adicional solo +1 g/día
   * @source IOM. DRI for Macronutrients. 2005. p.664.
   */
  it('Embarazo T1 (semana 8) → proteína adicional = 1 g', () => {
    const r = calcularIDRAjustada({
      es_lactancia: false,
      semana_gestacion: 8,
    });
    expect(r.proteina_adicional_g).toBe(1);
    expect(r.hierro_mg).toBe(27); // hierro no cambia por trimestre
  });

  /**
   * CASO 3: Lactancia exclusiva
   * Hierro: 9 mg | Folato: 500 mcg DFE | Yodo: 290 mcg | Proteína: 25 g
   */
  it('Lactancia exclusiva — hierro reducido y yodo aumentado', () => {
    const r = calcularIDRAjustada({
      es_lactancia: true,
      estado_lactancia: 'exclusiva',
    });
    expect(r.hierro_mg).toBe(9);
    expect(r.folato_mcg_dfe).toBe(500);
    expect(r.yodo_mcg).toBe(290);
    expect(r.proteina_adicional_g).toBe(25);
  });

  /**
   * CASO 4: Lactancia parcial — proteína adicional = 11 g/día
   * @source IOM. DRI for Macronutrients. 2005. p.664.
   */
  it('Lactancia parcial → proteína adicional = 11 g', () => {
    const r = calcularIDRAjustada({
      es_lactancia: true,
      estado_lactancia: 'parcial',
    });
    expect(r.proteina_adicional_g).toBe(11);
  });

  /**
   * CASO 5: Resultado inmutable
   */
  it('el objeto resultado es inmutable', () => {
    const r = calcularIDRAjustada({ es_lactancia: false, semana_gestacion: 20 });
    expect(Object.isFrozen(r)).toBe(true);
  });

  it('fuente_bibliografica no está vacía', () => {
    const r = calcularIDRAjustada({ es_lactancia: false });
    expect(r.fuente_bibliografica.length).toBeGreaterThan(10);
  });
});

// ===========================================================================
// BLOQUE 4 — calcularRecomendacionesNauseas
// ===========================================================================

describe('calcularRecomendacionesNauseas — Manejo dietético NVE (ACOG 2021)', () => {

  /**
   * CASO 1: Náuseas leves — 5 comidas, sin derivación
   */
  it('Intensidad leve → 5 tiempos de comida, sin derivación', () => {
    const r = calcularRecomendacionesNauseas({ semana_gestacion: 8, intensidad: 'leve' });
    expect(r.fraccionamiento_comidas).toBe(5);
    expect(r.requiere_derivacion).toBe(false);
    expect(r.recomendaciones.length).toBeGreaterThan(0);
    expect(r.alimentos_recomendados.length).toBeGreaterThan(0);
    expect(r.alimentos_evitar.length).toBeGreaterThan(0);
  });

  /**
   * CASO 2: Náuseas moderadas — 6 comidas, menciona jengibre/B6
   */
  it('Intensidad moderada → 6 tiempos de comida', () => {
    const r = calcularRecomendacionesNauseas({ semana_gestacion: 10, intensidad: 'moderada' });
    expect(r.fraccionamiento_comidas).toBe(6);
    expect(r.requiere_derivacion).toBe(false);
    // Las recomendaciones moderadas incluyen más elementos que las leves
    const tiene_jengibre = r.recomendaciones.some((rec) =>
      rec.toLowerCase().includes('jengibre'),
    );
    expect(tiene_jengibre).toBe(true);
  });

  /**
   * CASO 3: Náuseas severas — 8 comidas, requiere derivación
   */
  it('Intensidad severa → 8 tiempos de comida + derivación requerida', () => {
    const r = calcularRecomendacionesNauseas({ semana_gestacion: 9, intensidad: 'severa' });
    expect(r.fraccionamiento_comidas).toBe(8);
    expect(r.requiere_derivacion).toBe(true);
  });

  /**
   * CASO 4: Arrays de recomendaciones son inmutables (frozen)
   */
  it('las listas internas son inmutables', () => {
    const r = calcularRecomendacionesNauseas({ semana_gestacion: 8, intensidad: 'leve' });
    expect(Object.isFrozen(r.recomendaciones)).toBe(true);
    expect(Object.isFrozen(r.alimentos_recomendados)).toBe(true);
    expect(Object.isFrozen(r.alimentos_evitar)).toBe(true);
  });

  /**
   * CASO 5: Validación de semana fuera de rango
   */
  it('lanza RangeError si semana_gestacion = 0', () => {
    expect(() =>
      calcularRecomendacionesNauseas({ semana_gestacion: 0, intensidad: 'leve' }),
    ).toThrow(RangeError);
  });

  it('lanza RangeError si semana_gestacion > 40', () => {
    expect(() =>
      calcularRecomendacionesNauseas({ semana_gestacion: 41, intensidad: 'moderada' }),
    ).toThrow(RangeError);
  });

  /**
   * CASO 6: Galletas saladas presentes en alimentos recomendados (todos los niveles)
   */
  it('Galletas saladas están en alimentos_recomendados para todos los niveles', () => {
    (['leve', 'moderada', 'severa'] as const).forEach((intensidad) => {
      const r = calcularRecomendacionesNauseas({ semana_gestacion: 8, intensidad });
      const tiene_galletas = r.alimentos_recomendados.some((a) =>
        a.toLowerCase().includes('galleta'),
      );
      expect(tiene_galletas).toBe(true);
    });
  });

  /**
   * CASO 7: Alimentos grasosos aparecen en la lista de evitar
   */
  it('alimentos grasosos están en alimentos_evitar', () => {
    const r = calcularRecomendacionesNauseas({ semana_gestacion: 8, intensidad: 'leve' });
    const tiene_grasas = r.alimentos_evitar.some((a) =>
      a.toLowerCase().includes('grasoso') || a.toLowerCase().includes('frito'),
    );
    expect(tiene_grasas).toBe(true);
  });
});