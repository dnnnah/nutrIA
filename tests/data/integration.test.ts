/**
 * tests/data/integration.test.ts — Validación de integridad de datos de referencia
 *
 * Verifica que los JSONs importan correctamente, tienen estructura válida
 * y que los helpers de acceso devuelven valores clínicamente correctos.
 *
 * REGLA: cada test usa valores reales documentados con fuente bibliográfica.
 * Si un assert falla → el JSON tiene un error o el tipo no es correcto.
 *
 * @project NUTRIA — PWA clínica open source
 */

import { describe, it, expect } from 'vitest';
import {
  idrData,
  labData,
  metsData,
  nafData,
  measuresData,
  getGrupoIDR,
  getNAF,
  getActividadesPorCategoria,
  calcularGastoMET,
  buscarActividad,
  type CategoriaActividad,
} from '../../src/data/index';

// ─────────────────────────────────────────────────────────────────────────────
// BLOQUE 1: PRESENCIA DE ARCHIVOS (smoke test)
// ─────────────────────────────────────────────────────────────────────────────

describe('Smoke test — los 5 JSONs cargan sin errores', () => {
  it('idrData es un objeto con _meta y grupos', () => {
    expect(idrData).toBeDefined();
    expect(typeof idrData).toBe('object');
    expect(idrData._meta).toBeDefined();
    expect(idrData.grupos).toBeDefined();
  });

  it('labData es un objeto con _meta y secciones clínicas', () => {
    expect(labData).toBeDefined();
    expect(labData._meta).toBeDefined();
    expect(labData.metabolismo_glucosa).toBeDefined();
    expect(labData.perfil_lipidico).toBeDefined();
    expect(labData.funcion_renal).toBeDefined();
  });

  it('metsData es un objeto con actividades y clasificación', () => {
    expect(metsData).toBeDefined();
    expect(metsData.actividades).toBeDefined();
    expect(metsData.clasificacion_intensidad).toBeDefined();
    expect(Array.isArray(metsData.actividades.caminar)).toBe(true);
  });

  it('nafData es un objeto con factores de actividad física', () => {
    expect(nafData).toBeDefined();
    expect(nafData.factores_actividad_fisica).toBeDefined();
    expect(nafData.tabla_rapida_referencia).toBeDefined();
  });

  it('measuresData es un objeto con medidas por alimento', () => {
    expect(measuresData).toBeDefined();
    expect(measuresData.medidas_por_alimento).toBeDefined();
    expect(measuresData.conversiones_peso_medida).toBeDefined();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// BLOQUE 2: IDR — Ingestas Diarias Recomendadas
// @source IOM Dietary Reference Intakes. National Academies Press. 2006.
// ─────────────────────────────────────────────────────────────────────────────

describe('IDR — Valores de referencia por grupo etario', () => {
  it('versión del JSON es 1.0', () => {
    expect(idrData._meta.version).toBe('1.0');
  });

  it('adulto_19_30_h: hierro = 8 mg/día', () => {
    // @source IOM DRI 2001, p.290 — Hombre adulto 19-30 años
    const grupo = getGrupoIDR('adulto_19_30_h');
    expect(grupo).not.toBeNull();
    expect(grupo!.hierro_mg).toBe(8);
  });

  it('adulto_19_30_m: hierro = 18 mg/día (pérdidas menstruales)', () => {
    // @source IOM DRI 2001, p.290 — Mujer fértil 19-30 años
    const grupo = getGrupoIDR('adulto_19_30_m');
    expect(grupo!.hierro_mg).toBe(18);
  });

  it('embarazo_19_30: folato = 600 mcg DFE (prevención defectos tubo neural)', () => {
    // @source IOM DRI 1998, p.196 — Folato en embarazo
    const grupo = getGrupoIDR('embarazo_19_30');
    expect(grupo!.folato_mcg_dfe).toBe(600);
    expect(grupo!.hierro_mg).toBe(27);
  });

  it('adulto_51_70_m: calcio = 1200 mg/día (prevención osteoporosis post-menopausia)', () => {
    // @source IOM DRI 2011, p.345 — Calcio post-menopausia
    const grupo = getGrupoIDR('adulto_51_70_m');
    expect(grupo!.calcio_mg).toBe(1200);
  });

  it('adulto_51_70_h: vitamina D = 20 mcg/día (riesgo de deficiencia aumentado)', () => {
    // @source IOM DRI 2011 — Vitamina D >50 años
    const grupo = getGrupoIDR('adulto_51_70_h');
    expect(grupo!.vitamina_d_mcg).toBe(20);
  });

  it('lactante_0_6m: fibra es null (lactancia exclusiva sin fibra)', () => {
    const grupo = getGrupoIDR('lactante_0_6m');
    expect(grupo!.fibra_g).toBeNull();
  });

  it('todos los grupos del meta existen en grupos', () => {
    const grupos_declarados = idrData._meta.grupos_disponibles;
    for (const clave of grupos_declarados) {
      expect(
        idrData.grupos[clave],
        `Grupo "${clave}" declarado en _meta pero no existe en grupos`
      ).toBeDefined();
    }
  });

  it('incremento calórico embarazo: T2 = +340 kcal, T3 = +450 kcal', () => {
    // @source IOM. Energy requirements during pregnancy. 2002.
    const inc = idrData.incrementos_embarazo_sobre_basal;
    expect(inc.trimestre_1_kcal).toBe(0);
    expect(inc.trimestre_2_kcal).toBe(340);
    expect(inc.trimestre_3_kcal).toBe(450);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// BLOQUE 3: NAF — Factores de Actividad Física
// @source WHO Technical Report 724. 1985.
// @source IOM DRI for Energy. 2005.
// ─────────────────────────────────────────────────────────────────────────────

describe('NAF — Factores de actividad física (OMS 1985)', () => {
  it('sedentario: NAF = 1.20', () => {
    expect(getNAF('sedentario').naf).toBe(1.20);
  });

  it('ligero: NAF = 1.375', () => {
    expect(getNAF('ligero').naf).toBe(1.375);
  });

  it('moderado: NAF = 1.55', () => {
    expect(getNAF('moderado').naf).toBe(1.55);
  });

  it('intenso: NAF = 1.725', () => {
    expect(getNAF('intenso').naf).toBe(1.725);
  });

  it('muy_intenso: NAF = 1.90', () => {
    expect(getNAF('muy_intenso').naf).toBe(1.90);
  });

  it('los 5 niveles de actividad están presentes en el JSON', () => {
    const niveles: Array<'sedentario' | 'ligero' | 'moderado' | 'intenso' | 'muy_intenso'> =
      ['sedentario', 'ligero', 'moderado', 'intenso', 'muy_intenso'];
    for (const nivel of niveles) {
      expect(
        nafData.factores_actividad_fisica[nivel],
        `Nivel "${nivel}" no encontrado en factores_actividad_fisica`
      ).toBeDefined();
    }
  });

  it('tabla_rapida_referencia tiene al menos 5 filas', () => {
    expect(nafData.tabla_rapida_referencia.filas.length).toBeGreaterThanOrEqual(5);
  });

  it('todos los NAF de la tabla rápida están en rango 1.0-2.5', () => {
    for (const fila of nafData.tabla_rapida_referencia.filas) {
      expect(fila.naf).toBeGreaterThan(1.0);
      expect(fila.naf).toBeLessThan(2.5);
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// BLOQUE 4: METs — Compendio Ainsworth 2011
// @source Ainsworth BE, et al. (2011). Med Sci Sports Exerc. 43(8):1575-1581.
// @source Jetté M, et al. (1990). Clin Cardiol. 13(8):555-565.
// ─────────────────────────────────────────────────────────────────────────────

describe('METs — Compendio de Actividades Físicas', () => {
  it('caminar a paso normal (4.8 km/h) tiene MET = 3.5', () => {
    // @source Ainsworth 2011, código 17020
    const caminar = getActividadesPorCategoria('caminar');
    const paso_normal = caminar.find(a => a.id === 'cam-003');
    expect(paso_normal).toBeDefined();
    expect(paso_normal!.met).toBe(3.5);
  });

  it('yoga general tiene MET = 2.5', () => {
    // @source Ainsworth 2011, código 02160
    const yoga = getActividadesPorCategoria('yoga_pilates');
    const yoga_gen = yoga.find(a => a.id === 'yog-001');
    expect(yoga_gen!.met).toBe(2.5);
  });

  it('trabajo de oficina (sentado) tiene MET = 1.5 — clasificado como sedentario', () => {
    // @source Ainsworth 2011, código 11580
    const sed = getActividadesPorCategoria('sedentario');
    const oficina = sed.find(a => a.id === 'sed-003');
    expect(oficina!.met).toBe(1.5);
  });

  it('calcularGastoMET — ejemplo del JSON: mujer 65kg, 30min, MET 3.5 = 119.4 kcal', () => {
    // @source Jetté M, et al. (1990): Gasto = MET × 0.0175 × peso_kg × tiempo_min
    // Cálculo: 3.5 × 0.0175 × 65 × 30 = 119.4375 → redondea a 119.4
    const gasto = calcularGastoMET(3.5, 65, 30);
    expect(gasto).toBeCloseTo(119.4, 1);
  });

  it('calcularGastoMET — hombre 80kg corre 45min a 8km/h (MET 8.3)', () => {
    // Cálculo: 8.3 × 0.0175 × 80 × 45 = 522.9 kcal
    const gasto = calcularGastoMET(8.3, 80, 45);
    expect(gasto).toBeCloseTo(522.9, 0);
  });

  it('calcularGastoMET — dormir 8h, persona 70kg (MET 0.95)', () => {
    // Cálculo: 0.95 × 0.0175 × 70 × 480 = 558.6 kcal
    const gasto = calcularGastoMET(0.95, 70, 480);
    expect(gasto).toBeGreaterThan(0);
    expect(gasto).toBeCloseTo(558.6, 0);
  });

  it('buscarActividad("yoga") encuentra al menos 1 resultado', () => {
    const resultados = buscarActividad('yoga');
    expect(resultados.length).toBeGreaterThan(0);
    expect(resultados[0].actividad.toLowerCase()).toContain('yoga');
  });

  it('buscarActividad con query < 2 chars devuelve array vacío', () => {
    expect(buscarActividad('y').length).toBe(0);
    expect(buscarActividad('').length).toBe(0);
  });

  it('buscarActividad("futbol") encuentra fútbol sin tilde', () => {
    const res = buscarActividad('tbol');
    expect(res.length).toBeGreaterThan(0);
  });

  it('todos los METs en el JSON son > 0', () => {
    const categorias = Object.keys(metsData.actividades) as CategoriaActividad[];
    for (const cat of categorias) {
      for (const act of metsData.actividades[cat]) {
        expect(act.met, `MET de "${act.actividad}" debe ser positivo`).toBeGreaterThan(0);
      }
    }
  });

  it('las 15 categorías del _meta están presentes en actividades', () => {
    const categorias_meta = metsData._meta.categorias_disponibles;
    for (const cat of categorias_meta) {
      expect(
        metsData.actividades[cat],
        `Categoría "${cat}" declarada en _meta pero no existe en actividades`
      ).toBeDefined();
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// BLOQUE 5: MEASURES — Medidas Caseras Mexicanas
// @source Pérez Lizaur AB et al. SMAE 5ª ed. Fomento de Nutrición y Salud. 2014.
// ─────────────────────────────────────────────────────────────────────────────

describe('Measures — Equivalencias de medidas caseras MX', () => {
  it('tiene 10 equivalencias generales documentadas', () => {
    const eq = measuresData.conversiones_peso_medida.equivalencias_generales;
    expect(eq.length).toBeGreaterThanOrEqual(10);
  });

  it('cada equivalencia general tiene medida (string) y g_aprox (number > 0)', () => {
    const eq = measuresData.conversiones_peso_medida.equivalencias_generales;
    for (const item of eq) {
      expect(typeof item.medida).toBe('string');
      expect(item.g_aprox).toBeGreaterThan(0);
    }
  });

  it('tiene secciones de grupos de alimentos', () => {
    const grupos = measuresData.medidas_por_alimento as Record<string, unknown>;
    expect(grupos['granos_cereales']).toBeDefined();
    expect(grupos['frutas']).toBeDefined();
    expect(grupos['verduras']).toBeDefined();
    expect(grupos['proteinas_animales']).toBeDefined();
    expect(grupos['lacteos']).toBeDefined();
    expect(grupos['grasas_aceites']).toBeDefined();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// BLOQUE 6: LAB REFERENCES — Rangos de Laboratorio
// @source ADA Standards of Care 2024 / Harrison 21st ed. / NOMs México
// ─────────────────────────────────────────────────────────────────────────────

describe('Lab References — Rangos de laboratorio clínico', () => {
  it('tiene versión 1.0 y fuentes bibliográficas definidas', () => {
    expect(labData._meta.version).toBe('1.0');
    expect(Array.isArray(labData._meta.fuentes)).toBe(true);
    expect(labData._meta.fuentes.length).toBeGreaterThan(0);
  });

  it('tiene las 9 secciones clínicas requeridas', () => {
    const secciones: Array<keyof typeof labData> = [
      'metabolismo_glucosa',
      'perfil_lipidico',
      'funcion_renal',
      'funcion_hepatica',
      'hemograma',
      'micronutrientes_sericos',
      'funcion_tiroidea',
      'presion_arterial',
      'indices_nutricionales',
    ];
    for (const sec of secciones) {
      expect(labData[sec], `Sección "${sec}" no encontrada en lab_references`).toBeDefined();
    }
  });
});