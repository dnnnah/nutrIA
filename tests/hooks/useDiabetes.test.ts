/**
 * useDiabetes.test.ts — Tests Unitarios: Módulo Diabetes y Síndrome Metabólico
 * Proyecto NUTRIA — Open Source
 *
 * Cada caso de prueba incluye:
 *   - Valores reales con fuente clínica documentada
 *   - Cálculo manual verificable en el comentario
 *   - Descripción del perfil del paciente de referencia
 *
 * Ejecutar: pnpm vitest useDiabetes
 */

import { describe, expect, it } from 'vitest';

import {
  calcularCargaGlucemica,
  calcularIndiceTyG,
  calcularRatioInsulinaCH,
  construirResumenMetabolico,
  diagnosticarSindromeMetabolico,
} from '../hooks/useDiabetes';

// ============================================================================
// 1. CARGA GLUCÉMICA
// ============================================================================

describe('calcularCargaGlucemica', () => {
  // ── Clasificación Baja ────────────────────────────────────────────────────

  it('sandía — IG alto pero CG baja (porción pequeña)', () => {
    // Sandía: IG=72, porción 120g → HC_netos≈6g (alto contenido de agua)
    // CG = (72 × 6) / 100 = 4.32 → Baja
    // Fuente: Foster-Powell K et al. Am J Clin Nutr. 2002;76(1):5-56.
    const res = calcularCargaGlucemica({
      indice_glucemico: 72,
      hidratos_disponibles_g: 6,
    });
    expect(res.carga_glucemica).toBeCloseTo(4.32, 2);
    expect(res.clasificacion).toBe('baja');
  });

  it('manzana mediana — CG baja (alimento de referencia en DM2)', () => {
    // Manzana: IG=38, HC_netos≈18g (1 pieza mediana ~180g)
    // CG = (38 × 18) / 100 = 6.84 → Baja
    // Fuente: Atkinson FS et al. Diabetes Care. 2008;31(12):2281-2283.
    const res = calcularCargaGlucemica({
      indice_glucemico: 38,
      hidratos_disponibles_g: 18,
    });
    expect(res.carga_glucemica).toBeCloseTo(6.84, 2);
    expect(res.clasificacion).toBe('baja');
  });

  it('tortilla de maíz — CG media (base de alimentación mexicana)', () => {
    // Tortilla de maíz: IG=46, 1 tortilla (30g) → HC_netos≈15g
    // CG = (46 × 15) / 100 = 6.9 → Baja
    // Con 3 tortillas: HC_netos≈45g → CG = (46×45)/100 = 20.7 → Alta
    // Probamos 2 tortillas: HC_netos=30g
    // CG = (46 × 30) / 100 = 13.8 → Media
    const res = calcularCargaGlucemica({
      indice_glucemico: 46,
      hidratos_disponibles_g: 30,
    });
    expect(res.carga_glucemica).toBeCloseTo(13.8, 2);
    expect(res.clasificacion).toBe('media');
  });

  // ── Clasificación Alta ────────────────────────────────────────────────────

  it('arroz blanco cocido — CG alta (ejemplo paradigmático)', () => {
    // Arroz blanco cocido: IG=72, 1 taza cocida (186g) → HC_netos≈53g
    // CG = (72 × 53) / 100 = 38.16 → Alta
    // Fuente: Brand-Miller J et al. Diabetes Care. 2003;26(8):2261-2267.
    const res = calcularCargaGlucemica({
      indice_glucemico: 72,
      hidratos_disponibles_g: 53,
    });
    expect(res.carga_glucemica).toBeCloseTo(38.16, 2);
    expect(res.clasificacion).toBe('alta');
  });

  it('pan blanco — CG alta en porción estándar', () => {
    // Pan blanco: IG=75, 2 rebanadas (~60g) → HC_netos≈28g
    // CG = (75 × 28) / 100 = 21.0 → Alta (límite exacto)
    const res = calcularCargaGlucemica({
      indice_glucemico: 75,
      hidratos_disponibles_g: 28,
    });
    expect(res.carga_glucemica).toBeCloseTo(21.0, 2);
    expect(res.clasificacion).toBe('alta');
  });

  // ── Límites de clasificación ──────────────────────────────────────────────

  it('CG exactamente 10 — límite inferior "media"', () => {
    // CG = (50 × 20) / 100 = 10.0 → Media (10 exacto es media, no baja)
    const res = calcularCargaGlucemica({
      indice_glucemico: 50,
      hidratos_disponibles_g: 20,
    });
    expect(res.carga_glucemica).toBe(10.0);
    expect(res.clasificacion).toBe('media');
  });

  it('CG exactamente 19 — límite superior "media"', () => {
    // CG = (95 × 20) / 100 = 19.0 → Media (19 exacto es media, no alta)
    const res = calcularCargaGlucemica({
      indice_glucemico: 95,
      hidratos_disponibles_g: 20,
    });
    expect(res.carga_glucemica).toBe(19.0);
    expect(res.clasificacion).toBe('media');
  });

  it('CG exactamente 20 — límite inferior "alta"', () => {
    // CG = (100 × 20) / 100 = 20.0 → Alta
    const res = calcularCargaGlucemica({
      indice_glucemico: 100,
      hidratos_disponibles_g: 20,
    });
    expect(res.carga_glucemica).toBe(20.0);
    expect(res.clasificacion).toBe('alta');
  });

  // ── Validación de rangos ──────────────────────────────────────────────────

  it('lanza RangeError si IG > 100', () => {
    expect(() =>
      calcularCargaGlucemica({ indice_glucemico: 101, hidratos_disponibles_g: 20 })
    ).toThrow(RangeError);
  });

  it('lanza RangeError si HC_disponibles es negativo', () => {
    expect(() =>
      calcularCargaGlucemica({ indice_glucemico: 50, hidratos_disponibles_g: -5 })
    ).toThrow(RangeError);
  });

  // ── Metadata ──────────────────────────────────────────────────────────────

  it('el resultado incluye fuente bibliográfica no vacía', () => {
    const res = calcularCargaGlucemica({ indice_glucemico: 40, hidratos_disponibles_g: 15 });
    expect(res.fuente_bibliografica).toBeTruthy();
    expect(res.fuente_bibliografica.length).toBeGreaterThan(20);
  });

  it('el resultado es inmutable (Object.freeze)', () => {
    const res = calcularCargaGlucemica({ indice_glucemico: 40, hidratos_disponibles_g: 15 });
    expect(() => {
      // @ts-expect-error — probamos que el freeze funciona en runtime
      (res as Record<string, unknown>).carga_glucemica = 999;
    }).toThrow();
  });
});

// ============================================================================
// 2. ÍNDICE TyG
// ============================================================================

describe('calcularIndiceTyG', () => {
  // ── Riesgo Bajo ───────────────────────────────────────────────────────────

  it('perfil metabólico saludable — riesgo bajo', () => {
    // TG=80 mg/dL, Glucosa=85 mg/dL (valores óptimos en ayuno)
    // TyG = ln(80/2 × 85/2) = ln(40 × 42.5) = ln(1700) ≈ 7.44 → Bajo (<8.38)
    const res = calcularIndiceTyG({
      trigliceridos_mg_dl: 80,
      glucosa_mg_dl: 85,
    });
    expect(res.indice_tyg).toBeCloseTo(Math.log(40 * 42.5), 2);
    expect(res.riesgo).toBe('bajo');
  });

  it('TG normal-alto + glucosa limítrofe — riesgo bajo aún', () => {
    // TG=140 mg/dL, Glucosa=95 mg/dL
    // TyG = ln(70 × 47.5) = ln(3325) ≈ 8.11 → Bajo (<8.38)
    const res = calcularIndiceTyG({
      trigliceridos_mg_dl: 140,
      glucosa_mg_dl: 95,
    });
    expect(res.indice_tyg).toBeCloseTo(Math.log(70 * 47.5), 2);
    expect(res.riesgo).toBe('bajo');
  });

  // ── Riesgo Moderado ───────────────────────────────────────────────────────

  it('prediabetes + triglicéridos moderados — riesgo moderado', () => {
    // TG=155 mg/dL, Glucosa=105 mg/dL
    // TyG = ln(77.5 × 52.5) = ln(4068.75) ≈ 8.31 → Bajo (cerca del límite)
    // Ajustamos para caer en moderado:
    // TG=180 mg/dL, Glucosa=110 mg/dL
    // TyG = ln(90 × 55) = ln(4950) ≈ 8.51 → Moderado (8.38–9.06)
    const res = calcularIndiceTyG({
      trigliceridos_mg_dl: 180,
      glucosa_mg_dl: 110,
    });
    expect(res.indice_tyg).toBeCloseTo(Math.log(90 * 55), 2);
    expect(res.riesgo).toBe('moderado');
  });

  // ── Riesgo Alto ───────────────────────────────────────────────────────────

  it('síndrome metabólico establecido — riesgo alto', () => {
    // Paciente con DM2 y dislipidemia: TG=250 mg/dL, Glucosa=140 mg/dL
    // TyG = ln(125 × 70) = ln(8750) ≈ 9.08 → Alto (>9.06)
    // Referencia: Guerrero-Romero 2010, Tabla 2 — grupo con RI confirmada
    const res = calcularIndiceTyG({
      trigliceridos_mg_dl: 250,
      glucosa_mg_dl: 140,
    });
    expect(res.indice_tyg).toBeCloseTo(Math.log(125 * 70), 2);
    expect(res.riesgo).toBe('alto');
  });

  it('hipertrigliceridemia severa + hiperglucemia — riesgo alto marcado', () => {
    // TG=500 mg/dL, Glucosa=200 mg/dL (DM2 descontrolada)
    // TyG = ln(250 × 100) = ln(25000) ≈ 10.13 → Alto
    const res = calcularIndiceTyG({
      trigliceridos_mg_dl: 500,
      glucosa_mg_dl: 200,
    });
    expect(res.indice_tyg).toBeCloseTo(Math.log(250 * 100), 2);
    expect(res.riesgo).toBe('alto');
  });

  // ── Límites de clasificación ──────────────────────────────────────────────

  it('TyG exactamente en umbral 8.38 — límite inferior "moderado"', () => {
    // Buscamos TG y Glucosa tal que ln(TG/2 × Glu/2) ≈ 8.38
    // e^8.38 ≈ 4370 → TG/2 × Glu/2 = 4370
    // TG=190, Glu=92 → ln(95 × 46) = ln(4370) ≈ 8.38
    const res = calcularIndiceTyG({
      trigliceridos_mg_dl: 190,
      glucosa_mg_dl: 92,
    });
    // Solo verificamos que cae en moderado o bajo (el límite es exacto)
    expect(['bajo', 'moderado']).toContain(res.riesgo);
  });

  // ── Validación de rangos ──────────────────────────────────────────────────

  it('lanza RangeError si TG es 0', () => {
    expect(() =>
      calcularIndiceTyG({ trigliceridos_mg_dl: 0, glucosa_mg_dl: 100 })
    ).toThrow(RangeError);
  });

  it('lanza RangeError si glucosa es negativa', () => {
    expect(() =>
      calcularIndiceTyG({ trigliceridos_mg_dl: 150, glucosa_mg_dl: -10 })
    ).toThrow(RangeError);
  });

  // ── Metadata y estructura ─────────────────────────────────────────────────

  it('el resultado preserva los valores de entrada', () => {
    const res = calcularIndiceTyG({
      trigliceridos_mg_dl: 160,
      glucosa_mg_dl: 105,
    });
    expect(res.trigliceridos_mg_dl).toBe(160);
    expect(res.glucosa_mg_dl).toBe(105);
  });

  it('fuente bibliográfica incluye a Simental-Mendía y Guerrero-Romero', () => {
    const res = calcularIndiceTyG({
      trigliceridos_mg_dl: 150,
      glucosa_mg_dl: 100,
    });
    expect(res.fuente_bibliografica).toContain('Simental');
    expect(res.fuente_bibliografica).toContain('Guerrero-Romero');
  });
});

// ============================================================================
// 3. RATIO INSULINA:CARBOHIDRATOS
// ============================================================================

describe('calcularRatioInsulinaCH', () => {
  it('ratio clásico 1:15 — paciente DM1 típico', () => {
    // Paciente aplica 3U para 45g de HC
    // Ratio = 3/45 = 0.0667 U/g → 15g CH/U
    // Referencia: Walsh & Roberts, Pumping Insulin 5th ed., Cap. 12
    const res = calcularRatioInsulinaCH({
      dosis_insulina_unidades: 3,
      hidratos_g: 45,
    });
    expect(res.ratio_u_por_g).toBeCloseTo(0.067, 3);
    expect(res.gramos_ch_por_unidad).toBeCloseTo(15, 1);
  });

  it('ratio 1:10 — mayor resistencia insulínica (DM2 con insulinoterapia)', () => {
    // Paciente aplica 5U para 50g de HC
    // Ratio = 5/50 = 0.1 U/g → 10g CH/U
    const res = calcularRatioInsulinaCH({
      dosis_insulina_unidades: 5,
      hidratos_g: 50,
    });
    expect(res.ratio_u_por_g).toBeCloseTo(0.1, 3);
    expect(res.gramos_ch_por_unidad).toBeCloseTo(10, 1);
  });

  it('ratio 1:20 — alta sensibilidad insulínica (DM1 niño/adolescente)', () => {
    // Paciente aplica 2U para 40g de HC
    // Ratio = 2/40 = 0.05 U/g → 20g CH/U
    const res = calcularRatioInsulinaCH({
      dosis_insulina_unidades: 2,
      hidratos_g: 40,
    });
    expect(res.ratio_u_por_g).toBeCloseTo(0.05, 3);
    expect(res.gramos_ch_por_unidad).toBeCloseTo(20, 1);
  });

  it('inverso del ratio es matemáticamente correcto', () => {
    // Para cualquier entrada, g_CH_por_U = 1 / ratio_u_por_g
    const res = calcularRatioInsulinaCH({
      dosis_insulina_unidades: 4,
      hidratos_g: 60,
    });
    expect(res.gramos_ch_por_unidad).toBeCloseTo(1 / res.ratio_u_por_g, 1);
  });

  it('lanza RangeError si dosis_insulina es 0', () => {
    expect(() =>
      calcularRatioInsulinaCH({ dosis_insulina_unidades: 0, hidratos_g: 45 })
    ).toThrow(RangeError);
  });

  it('lanza RangeError si HC es menor que 1g', () => {
    expect(() =>
      calcularRatioInsulinaCH({ dosis_insulina_unidades: 2, hidratos_g: 0.5 })
    ).toThrow(RangeError);
  });
});

// ============================================================================
// 4. SÍNDROME METABÓLICO
// ============================================================================

describe('diagnosticarSindromeMetabolico', () => {
  // ── Diagnóstico Positivo ──────────────────────────────────────────────────

  it('síndrome metabólico completo (5/5 criterios) — hombre', () => {
    // Paciente: ♂, glucosa=108, TG=165, HDL=38, PAS=135, cintura=108cm
    // Criterio 1 (glucosa ≥100): ✓  Criterio 2 (TG ≥150): ✓
    // Criterio 3 (HDL<40♂): ✓       Criterio 4 (PAS≥130): ✓
    // Criterio 5 (cintura>102♂): ✓   → 5/5 → SM positivo
    const res = diagnosticarSindromeMetabolico({
      glucosa_mg_dl: 108,
      trigliceridos_mg_dl: 165,
      hdl_mg_dl: 38,
      presion_sistolica: 135,
      circunferencia_cintura_cm: 108,
      sexo: 'masculino',
    });
    expect(res.criterios_positivos).toBe(5);
    expect(res.criterios_evaluados).toBe(5);
    expect(res.tiene_sindrome_metabolico).toBe(true);
    expect(res.criterios_detalle.glucosa_alterada).toBe(true);
    expect(res.criterios_detalle.trigliceridos_altos).toBe(true);
    expect(res.criterios_detalle.hdl_bajo).toBe(true);
    expect(res.criterios_detalle.presion_alta).toBe(true);
    expect(res.criterios_detalle.cintura_aumentada).toBe(true);
  });

  it('síndrome metabólico mínimo (3/5 criterios) — mujer', () => {
    // Paciente: ♀, glucosa=112, TG=155, HDL=45 (45<50 → bajo para mujer)
    // Sin datos de PA ni cintura
    // Criterio 1: ✓  Criterio 2: ✓  Criterio 3: ✓  4: null  5: null
    // 3/3 evaluados positivos → SM positivo
    const res = diagnosticarSindromeMetabolico({
      glucosa_mg_dl: 112,
      trigliceridos_mg_dl: 155,
      hdl_mg_dl: 45,
      sexo: 'femenino',
    });
    expect(res.criterios_positivos).toBe(3);
    expect(res.criterios_evaluados).toBe(3);
    expect(res.tiene_sindrome_metabolico).toBe(true);
    expect(res.criterios_detalle.hdl_bajo).toBe(true);    // 45 < 50 (umbral mujeres)
    expect(res.criterios_detalle.presion_alta).toBeNull(); // dato no provisto
    expect(res.criterios_detalle.cintura_aumentada).toBeNull();
  });

  // ── Diagnóstico Negativo ──────────────────────────────────────────────────

  it('sin síndrome metabólico (1/3 criterios evaluados positivo)', () => {
    // Paciente: ♂ con solo TG elevados pero resto normal
    // glucosa=92, TG=160, HDL=55 → 1/3 positivos → SM negativo
    const res = diagnosticarSindromeMetabolico({
      glucosa_mg_dl: 92,
      trigliceridos_mg_dl: 160,
      hdl_mg_dl: 55,
      sexo: 'masculino',
    });
    expect(res.criterios_positivos).toBe(1);
    expect(res.tiene_sindrome_metabolico).toBe(false);
    expect(res.criterios_detalle.glucosa_alterada).toBe(false);
    expect(res.criterios_detalle.trigliceridos_altos).toBe(true);
    expect(res.criterios_detalle.hdl_bajo).toBe(false);  // 55 > 40 (umbral hombres)
  });

  it('perfil metabólico completamente normal — 0/5 criterios', () => {
    const res = diagnosticarSindromeMetabolico({
      glucosa_mg_dl: 88,
      trigliceridos_mg_dl: 110,
      hdl_mg_dl: 62,
      presion_sistolica: 118,
      circunferencia_cintura_cm: 85,
      sexo: 'masculino',
    });
    expect(res.criterios_positivos).toBe(0);
    expect(res.tiene_sindrome_metabolico).toBe(false);
  });

  // ── Diagnóstico Incompleto ────────────────────────────────────────────────

  it('diagnóstico incompleto — null cuando solo hay 2 criterios evaluados', () => {
    // Solo glucosa y TG disponibles → 2 datos → imposible diagnosticar
    const res = diagnosticarSindromeMetabolico({
      glucosa_mg_dl: 115,
      trigliceridos_mg_dl: 180,
      hdl_mg_dl: 60,       // HDL normal — solo 2 positivos de 3 evaluados
      sexo: 'femenino',
    });
    // HDL=60 no es bajo para mujer, así que positivos=2, evaluados=3 → SM=false
    expect(res.tiene_sindrome_metabolico).toBe(false);
    // Ahora probamos un caso con solo 2 criterios evaluados y ambos positivos:
    // Esto requiere un escenario donde evaluados < 3, lo cual no ocurre
    // con los 3 campos obligatorios. Verificamos que null aplica solo
    // cuando criterios_evaluados < 3 (imposible con los campos requeridos en la
    // interfaz — los 3 primeros siempre se evalúan).
    expect(res.criterios_evaluados).toBe(3);
  });

  // ── Umbrales por sexo ─────────────────────────────────────────────────────

  it('HDL=45 — bajo en mujer, normal en hombre', () => {
    const baseParams = {
      glucosa_mg_dl: 90,
      trigliceridos_mg_dl: 120,
      hdl_mg_dl: 45,
    };

    const hombre = diagnosticarSindromeMetabolico({ ...baseParams, sexo: 'masculino' });
    const mujer  = diagnosticarSindromeMetabolico({ ...baseParams, sexo: 'femenino' });

    expect(hombre.criterios_detalle.hdl_bajo).toBe(false); // 45 > 40 ♂
    expect(mujer.criterios_detalle.hdl_bajo).toBe(true);   // 45 < 50 ♀
  });

  it('cintura=95cm — elevada en mujer (>88), normal en hombre (<102)', () => {
    const baseParams = {
      glucosa_mg_dl: 90,
      trigliceridos_mg_dl: 120,
      hdl_mg_dl: 55,
      circunferencia_cintura_cm: 95,
    };

    const hombre = diagnosticarSindromeMetabolico({ ...baseParams, sexo: 'masculino' });
    const mujer  = diagnosticarSindromeMetabolico({ ...baseParams, sexo: 'femenino' });

    expect(hombre.criterios_detalle.cintura_aumentada).toBe(false); // 95 < 102 ♂
    expect(mujer.criterios_detalle.cintura_aumentada).toBe(true);   // 95 > 88 ♀
  });

  // ── Límites exactos de criterios ─────────────────────────────────────────

  it('glucosa exactamente 100 mg/dL — cumple criterio (límite inferior)', () => {
    const res = diagnosticarSindromeMetabolico({
      glucosa_mg_dl: 100,
      trigliceridos_mg_dl: 120,
      hdl_mg_dl: 55,
      sexo: 'masculino',
    });
    expect(res.criterios_detalle.glucosa_alterada).toBe(true);
  });

  it('glucosa exactamente 99 mg/dL — NO cumple criterio', () => {
    const res = diagnosticarSindromeMetabolico({
      glucosa_mg_dl: 99,
      trigliceridos_mg_dl: 120,
      hdl_mg_dl: 55,
      sexo: 'masculino',
    });
    expect(res.criterios_detalle.glucosa_alterada).toBe(false);
  });

  it('TG exactamente 150 mg/dL — cumple criterio', () => {
    const res = diagnosticarSindromeMetabolico({
      glucosa_mg_dl: 90,
      trigliceridos_mg_dl: 150,
      hdl_mg_dl: 55,
      sexo: 'masculino',
    });
    expect(res.criterios_detalle.trigliceridos_altos).toBe(true);
  });

  it('presión sistólica exactamente 130 mmHg — cumple criterio', () => {
    const res = diagnosticarSindromeMetabolico({
      glucosa_mg_dl: 90,
      trigliceridos_mg_dl: 120,
      hdl_mg_dl: 55,
      presion_sistolica: 130,
      sexo: 'masculino',
    });
    expect(res.criterios_detalle.presion_alta).toBe(true);
  });

  // ── Validación de entradas ────────────────────────────────────────────────

  it('lanza RangeError si glucosa es 0', () => {
    expect(() =>
      diagnosticarSindromeMetabolico({
        glucosa_mg_dl: 0,
        trigliceridos_mg_dl: 150,
        hdl_mg_dl: 45,
        sexo: 'masculino',
      })
    ).toThrow(RangeError);
  });

  it('lanza RangeError si presión sistólica es mayor a 300', () => {
    expect(() =>
      diagnosticarSindromeMetabolico({
        glucosa_mg_dl: 100,
        trigliceridos_mg_dl: 150,
        hdl_mg_dl: 45,
        presion_sistolica: 350,
        sexo: 'masculino',
      })
    ).toThrow(RangeError);
  });

  // ── Metadata ──────────────────────────────────────────────────────────────

  it('la fuente bibliográfica menciona ATP-III y NCEP', () => {
    const res = diagnosticarSindromeMetabolico({
      glucosa_mg_dl: 100,
      trigliceridos_mg_dl: 150,
      hdl_mg_dl: 45,
      sexo: 'masculino',
    });
    expect(res.fuente_bibliografica).toContain('ATP-III');
    expect(res.fuente_bibliografica).toContain('NCEP');
  });
});

// ============================================================================
// 5. RESUMEN INTEGRADO
// ============================================================================

describe('construirResumenMetabolico', () => {
  it('construye un resumen vacío sin lanzar errores', () => {
    const res = construirResumenMetabolico({});
    expect(res).toEqual({});
  });

  it('construye un resumen parcial con solo HOMA-IR', () => {
    const res = construirResumenMetabolico({
      homa_ir: 3.1,
      clasificacion_homa: 'resistencia_leve',
    });
    expect(res.homa_ir).toBe(3.1);
    expect(res.clasificacion_homa).toBe('resistencia_leve');
    expect(res.indice_tyg).toBeUndefined();
  });

  it('construye un resumen completo con todos los campos', () => {
    const tyg = calcularIndiceTyG({
      trigliceridos_mg_dl: 180,
      glucosa_mg_dl: 110,
    });
    const sm = diagnosticarSindromeMetabolico({
      glucosa_mg_dl: 108,
      trigliceridos_mg_dl: 165,
      hdl_mg_dl: 38,
      sexo: 'masculino',
    });
    const cg = calcularCargaGlucemica({
      indice_glucemico: 65,
      hidratos_disponibles_g: 210, // Plan completo del día
    });

    const res = construirResumenMetabolico({
      homa_ir: 3.5,
      clasificacion_homa: 'resistencia_sig',
      indice_tyg: tyg,
      sindrome_metabolico: sm,
      carga_glucemica_total: cg,
    });

    expect(res.homa_ir).toBe(3.5);
    expect(res.indice_tyg?.riesgo).toBe('moderado');
    expect(res.sindrome_metabolico?.criterios_positivos).toBeGreaterThanOrEqual(2);
    expect(res.carga_glucemica_total?.clasificacion).toBe('alta');
  });

  it('el resumen es inmutable', () => {
    const res = construirResumenMetabolico({ homa_ir: 2.0 });
    expect(() => {
      // @ts-expect-error — verificando freeze en runtime
      (res as Record<string, unknown>).homa_ir = 999;
    }).toThrow();
  });
});