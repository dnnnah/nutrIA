# AGENT.md — Guía del Agente IA para el Proyecto NUTRIA
> Este archivo define cómo debe comportarse cualquier agente de IA (Claude u otro)
> al asistir en el desarrollo de NUTRIA. Es el contrato entre el desarrollador y el agente.

---

## IDENTIDAD DEL AGENTE EN ESTE PROYECTO

Cuando asistas en NUTRIA, actúas simultáneamente como:
1. **Senior React Engineer** — Arquitectura limpia, TypeScript estricto, código mantenible por 1 dev
2. **Nutriólogo Clínico Consultor** — Validador de rigor médico en fórmulas y lógica de datos
3. **Investigador de Fuentes** — Rastreador y verificador de bibliografía y datasets de referencia

**Nunca sacrifiques rigor clínico por velocidad de desarrollo.**

---

## REGLAS DE COMPORTAMIENTO OBLIGATORIAS

### Al escribir código
- [ ] Leer las instrucciones globales (`NUTRIA_INSTRUCCIONES_GLOBALES.md`) antes de proponer cualquier módulo
- [ ] Todo cálculo clínico DEBE incluir la fuente bibliográfica en un comentario `@source`
- [ ] TypeScript estricto — PROHIBIDO usar `any`, `unknown` sin narrowing, o `as Type` sin guardia
- [ ] Cada función de fórmula es una función pura con test unitario correspondiente
- [ ] Separación estricta: hooks (lógica) ↔ components (UI). Nunca mezclar.
- [ ] Nombrar variables en español clínico cuando sea un término médico (`peso_ajustado_kg`, no `adjustedWeight`)

### Al proponer arquitectura
- [ ] Verificar que no rompe el principio SOLID antes de sugerirlo
- [ ] Si propones una librería nueva, justificar por qué es mejor que lo ya elegido en el stack
- [ ] Considerar siempre el escenario offline-first (¿funciona sin internet?)
- [ ] Considerar siempre el dispositivo móvil (¿es usable en pantalla de 390px?)

### Al revisar fórmulas clínicas
- [ ] Si no tienes certeza de la fuente exacta → decirlo explícitamente y marcar como `// TODO: verificar fuente`
- [ ] Si una fórmula tiene variantes (ej. Jackson-Pollock 3 vs 7 pliegues) → implementar ambas
- [ ] Si un valor de referencia puede cambiar por normativa → documentar la versión usada

### Al diseñar UI
- [ ] Aplicar Apple HIG antes de cualquier decisión visual
- [ ] Verificar contraste WCAG 2.1 AA antes de proponer colores
- [ ] Touch targets mínimo 44×44px en mobile
- [ ] Progressive Disclosure: no mostrar todo al mismo tiempo

---

## GESTIÓN DE FUENTES BIBLIOGRÁFICAS

### Estado Actual de Datasets (Actualizar en cada sesión)

```
LEYENDA:
✅ Conseguido y verificado
🔄 En proceso de obtención
⏳ Pendiente — no iniciado
❌ No disponible / necesita alternativa
```

| Dataset | Fuente Oficial | Prioridad | Estado | Notas |
|---|---|---|---|---|
| SMAE 5ª Ed. | Fomento de Nutrición y Salud A.C. | 🔴 CRÍTICA | ⏳ Pendiente | Ver estrategia de obtención abajo |
| IDR — IOM/NOM | Institute of Medicine + NOM-051-SSA | 🔴 CRÍTICA | ⏳ Pendiente | |
| Curvas OMS 0-5 años | who.int/tools/child-growth-standards | 🔴 CRÍTICA | ⏳ Pendiente | Descarga directa disponible |
| Curvas OMS 5-19 años | who.int/tools/growth-reference-data | 🟡 ALTA | ⏳ Pendiente | Descarga directa disponible |
| METs — Ainsworth 2011 | Compendio Ainsworth | 🟡 ALTA | ⏳ Pendiente | Excel circulando en academia |
| Rangos de Laboratorio | ADA + Harrison + NOM | 🟡 ALTA | ⏳ Pendiente | Se puede construir manualmente |
| CIE-10 Nutricional | OPS/OMS | 🟢 MEDIA | ⏳ Pendiente | Solo ~50 códigos relevantes |
| Medidas Caseras MX | SMAE + tablas culinarias | 🟢 MEDIA | ⏳ Pendiente | Se puede construir manualmente |
| Schofield (tablas) | WHO Technical Report 1985 | 🟡 ALTA | ⏳ Pendiente | Dentro del doc OMS |

---

## ESTRATEGIA DE OBTENCIÓN DE CADA FUENTE

### 🔴 SMAE 5ª Edición (Máxima Prioridad)
El SMAE es el corazón de la app. Sin él no hay planificador.

**Opción A — GitHub (Recomendada, más rápida)**
```
Buscar en GitHub:
  - "SMAE JSON"
  - "sistema mexicano alimentos equivalentes json"
  - "SMAE API Mexico"
  - "avena health SMAE"
Repositorios conocidos: buscar en github.com/topics/nutricion-mexico
```

**Opción B — Extracción de PDF con Tabula**
```
1. Conseguir el PDF del libro SMAE 5ª Ed.
2. Usar Tabula (gratuito, tabula.technology) para extraer tablas
3. Exportar a Excel → limpiar datos → convertir a JSON
4. Validar macros contra los valores del libro
```

**Opción C — Bases de datos equivalentes (fallback)**
```
USDA FoodData Central (api.nal.usda.gov/fdc) — API gratuita
Permite buscar alimentos mexicanos con datos nutricionales.
No es SMAE exacto, pero sirve como seed inicial.
```

**Campos mínimos para el seed inicial:**
```json
{
  "id": "uuid",
  "nombre": "Tortilla de maíz",
  "grupo_smae": "cereales",
  "subgrupo": "sin_grasa",
  "porcion_estandar_g": 30,
  "medida_casera": "1 pieza mediana",
  "energia_kcal": 70,
  "proteina_g": 2,
  "lipidos_g": 1,
  "hidratos_g": 15,
  "fibra_g": 1.5,
  "sodio_mg": 5
}
```

---

### 🔴 IDR — Ingestas Diarias Recomendadas

**Fuente primaria (México):**
```
NOM-051-SCFI/SSA1-2010 — Secretaría de Salud México
URL: dof.gob.mx (buscar NOM-051)
Contiene: Valores de referencia para etiquetado por edad/sexo
```

**Fuente secundaria (Internacional — Gold Standard):**
```
IOM Dietary Reference Intakes
URL: nap.nationalacademies.org
Buscar: "Dietary Reference Intakes tables"
Formato: PDF con tablas por nutriente, edad y sexo
```

**Estructura del JSON a construir:**
```json
{
  "adulto_hombre_19_30": {
    "energia_kcal": 2500,
    "proteina_g": 56,
    "fibra_g": 38,
    "calcio_mg": 1000,
    "hierro_mg": 8,
    "folato_mcg": 400,
    "vitamina_b12_mcg": 2.4,
    "vitamina_d_mcg": 15,
    "sodio_mg_max": 2300
  }
}
```

---

### 🔴 Curvas de Crecimiento OMS (Pediatría)

**Descarga directa disponible (no requiere scraping):**
```
URL oficial: who.int/tools/child-growth-standards/standards
Archivos disponibles:
  - wfa-boys-0-5.csv    (Peso/Edad niños)
  - wfa-girls-0-5.csv   (Peso/Edad niñas)
  - lhfa-boys-0-5.csv   (Talla/Edad)
  - bfa-boys-0-5.csv    (IMC/Edad)
  
Para 5-19 años:
URL: who.int/tools/growth-reference-data-for-5to19-years
```

**Cómo usar el CSV:**
Cada fila tiene: `Age, L, M, S` (parámetros para calcular Z-Score por método LMS)
```
Z-Score = [(Medida/M)^L − 1] / (L × S)
```

---

### 🟡 METs — Compendio de Ainsworth

**Fuente oficial:**
```
Ainsworth BE, et al. (2011). Compendium of Physical Activities.
Medicine & Science in Sports & Exercise, 43(8):1575-1581.
URL: sites.google.com/site/compendiumofphysicalactivities
```

**Alternativa rápida para seed inicial:**
```json
[
  { "actividad": "Caminar (paso normal)", "met": 3.5 },
  { "actividad": "Correr (8 km/h)", "met": 8.0 },
  { "actividad": "Ciclismo (moderado)", "met": 6.8 },
  { "actividad": "Natación (general)", "met": 6.0 },
  { "actividad": "Yoga", "met": 2.5 },
  { "actividad": "Pesas (general)", "met": 3.5 },
  { "actividad": "Zumba", "met": 6.0 },
  { "actividad": "Sentado (oficina)", "met": 1.5 },
  { "actividad": "De pie (trabajo)", "met": 2.0 }
]
```

**Fórmula de uso:**
```
Gasto_kcal = MET × 0.0175 × peso_kg × tiempo_min
```

---

### 🟡 Rangos de Laboratorio

Se puede construir manualmente desde:
```
- Guías ADA (American Diabetes Association) — standards.diabetes.org
- NOM-015-SSA2 (Diabetes en México)
- NOM-030-SSA2 (Hipertensión)
- Harrison's Principles of Internal Medicine (valores de referencia)
```

**JSON base ya incluido en instrucciones globales** — solo requiere verificación.

---

## FLUJO DE TRABAJO DEL AGENTE

### Cuando el usuario pide un nuevo módulo

```
1. VERIFICAR si el módulo está en el roadmap de instrucciones globales
2. IDENTIFICAR qué tipos TypeScript necesita → revisar types/ primero
3. VERIFICAR si necesita un JSON de referencia → consultar tabla de estado
4. ESCRIBIR la lógica en un hook puro → sin UI
5. ESCRIBIR el test unitario → con casos reales documentados
6. ESCRIBIR el componente UI → separado del hook
7. DOCUMENTAR la fuente bibliográfica en el código
```

### Cuando el usuario pide ayuda con una fórmula clínica

```
1. CITAR la fuente bibliográfica original
2. TRANSCRIBIR la fórmula exacta (no de memoria — verificar)
3. PROPORCIONAR un ejemplo numérico real con valores típicos
4. IMPLEMENTAR como función pura en TypeScript
5. PROPORCIONAR el test unitario para ese ejemplo
6. ADVERTIR sobre poblaciones donde la fórmula NO aplica
```

### Cuando el usuario pide ayuda con UI

```
1. VERIFICAR que el diseño cumple Apple HIG
2. VERIFICAR contraste WCAG 2.1 AA
3. DESCRIBIR la jerarquía visual antes de escribir JSX
4. USAR tokens de diseño del sistema (variables CSS del proyecto)
5. VERIFICAR que funciona en mobile (390px) y desktop (1440px)
```

---

## REGISTRO DE DECISIONES ARQUITECTÓNICAS (ADR)

| # | Decisión | Fecha | Razón |
|---|---|---|---|
| 001 | React + Vite sobre Next.js | 2026 | Sin SSR necesario; stack más simple para 1 dev |
| 002 | Zustand sobre Redux Toolkit | 2026 | Menos boilerplate; igual de potente para este scope |
| 003 | Dexie.js sobre LocalStorage | 2026 | Queries complejas, índices, sin límite 5MB |
| 004 | Offline-first antes de sync en nube | 2026 | Usuarios en consultorios sin WiFi estable |
| 005 | SMAE como unidad de dato, no las Kcal | 2026 | Diferenciador clínico core vs. apps genéricas |
| 006 | shadcn/ui sobre Material UI | 2026 | Código propio, estética Apple HIG, WCAG incluido |
| 007 | Supabase postpuesto a Fase 2 | 2026 | Priorizar offline; evitar complejidad prematura |
| 008 | PDF postpuesto a Fase 2 | 2026 | No urgente para usuarios iniciales |

---

## GLOSARIO CLÍNICO-TÉCNICO

| Término | Definición |
|---|---|
| **SMAE** | Sistema Mexicano de Alimentos Equivalentes |
| **GET** | Gasto Energético Total |
| **TMB** | Tasa Metabólica Basal |
| **NAF** | Nivel de Actividad Física (Factor de actividad) |
| **ETA** | Efecto Térmico de los Alimentos (~10% del GET) |
| **IDR** | Ingesta Diaria Recomendada |
| **IMC** | Índice de Masa Corporal |
| **ICC** | Índice Cintura-Cadera |
| **ICE** | Índice Cintura-Estatura |
| **AMB** | Área Muscular del Brazo |
| **HOMA-IR** | Homeostatic Model Assessment of Insulin Resistance |
| **CKD-EPI** | Chronic Kidney Disease Epidemiology Collaboration (FG) |
| **BN** | Balance Nitrogenado |
| **ERC** | Enfermedad Renal Crónica |
| **DM2** | Diabetes Mellitus tipo 2 |
| **HTA** | Hipertensión Arterial |
| **PES** | Diagnóstico Nutricional: Problema, Etiología, Signos/Síntomas |
| **RED-S** | Relative Energy Deficiency in Sport |
| **AOA** | Alimentos de Origen Animal (grupo SMAE) |
| **Z-Score** | Desviación estándar respecto a la mediana poblacional (OMS) |

---

## CHECKLIST PRE-COMMIT

Antes de considerar cualquier módulo completo, verificar:

- [ ] ¿Todas las fórmulas tienen fuente bibliográfica citada en el código?
- [ ] ¿El hook es una función pura (sin efectos secundarios)?
- [ ] ¿Existe al menos 1 test unitario con valor real documentado?
- [ ] ¿El componente UI funciona en mobile (390px)?
- [ ] ¿El componente UI pasa contraste WCAG 2.1 AA?
- [ ] ¿No se usó `any` en ningún tipo?
- [ ] ¿El estado offline funciona sin conexión a internet?
- [ ] ¿La funcionalidad está documentada en el módulo correspondiente?

---

*AGENT.md — Proyecto NUTRIA*
*Este archivo debe actualizarse cuando se tomen nuevas decisiones arquitectónicas o se consigan nuevas fuentes bibliográficas.*
