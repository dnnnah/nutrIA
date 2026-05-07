import type { Config } from 'tailwindcss'
import { fontFamily } from 'tailwindcss/defaultTheme'

/**
 * Tailwind CSS Configuration — Proyecto NUTRIA
 *
 * Tokens de diseño basados en Apple Human Interface Guidelines (HIG)
 * Sistema de color clínico: semáforo de adecuación + paleta primaria
 *
 * @see NUTRIA_INSTRUCCIONES_GLOBALES.md § 10 — Filosofía UX/UI
 */
const config: Config = {
  // ─── Content Paths ──────────────────────────────────────────────────────────
  // Tailwind escanea estos archivos para purgar clases no usadas en producción.
  // shadcn/ui genera componentes en src/components/ui/ — incluido explícitamente.
  content: [
    './index.html',
    './src/**/*.{ts,tsx}',
  ],

  // ─── Dark Mode ───────────────────────────────────────────────────────────────
  // 'class' — controlado manualmente vía clase en <html>.
  // Permite al nutriólogo elegir modo oscuro en consulta nocturna.
  darkMode: 'class',

  theme: {
    // ── Breakpoints personalizados ───────────────────────────────────────────
    // El diseño NUTRIA tiene 3 contextos de uso:
    //   mobile  → 390px  (iPhone 14, PWA instalada en consultorio)
    //   tablet  → 768px  (iPad, registro de pacientes)
    //   desktop → 1280px (Laptop/PC del nutriólogo)
    //
    // NOTA: shadcn/ui usa los breakpoints de Tailwind internamente.
    // No se cambian los nombres canónicos (sm/md/lg) para mantener
    // compatibilidad total con shadcn primitivos.
    screens: {
      // Breakpoint base mobile-first (no se declara — es el default <640px)
      sm:  '390px',   // iPhone SE / iPhone 14 — touch target mínimo 44px
      md:  '768px',   // iPad mini / tablets Android
      lg:  '1024px',  // iPad Pro / laptops pequeñas
      xl:  '1280px',  // Laptop consultorio (pantalla principal)
      '2xl': '1536px', // Monitores externos
    },

    extend: {
      // ── Tipografía — IBM Plex ───────────────────────────────────────────────
      // IBM Plex Sans: texto UI, labels, datos clínicos
      // IBM Plex Mono: valores numéricos, resultados de fórmulas
      //
      // Fallback: -apple-system garantiza SF Pro en dispositivos Apple
      // (NUTRIA sigue Apple HIG; la mayoría de usuarios usa iPhone/Mac)
      fontFamily: {
        sans:  ['IBM Plex Sans',  '-apple-system', 'BlinkMacSystemFont', ...fontFamily.sans],
        mono:  ['IBM Plex Mono',  'ui-monospace',  'SFMono-Regular',     ...fontFamily.mono],
        serif: ['IBM Plex Serif', ...fontFamily.serif],
      },

      // ── Escala tipográfica — NUTRIA HIG ────────────────────────────────────
      // Alineada con la escala definida en instrucciones globales § 10
      fontSize: {
        'micro':  ['0.6875rem', { lineHeight: '1rem',    letterSpacing: '0.02em'  }],  // 11px — etiquetas
        'caption':['0.8125rem', { lineHeight: '1.125rem', letterSpacing: '0.01em'  }],  // 13px — captions
        'body2':  ['0.9375rem', { lineHeight: '1.375rem' }],                             // 15px — cuerpo secundario
        'body':   ['1.0625rem', { lineHeight: '1.5rem'   }],                             // 17px — cuerpo principal
        'title3': ['1.25rem',   { lineHeight: '1.75rem',  fontWeight: '600'        }],  // 20px — título sección
        'title2': ['1.375rem',  { lineHeight: '1.875rem', fontWeight: '600'        }],  // 22px — título sección grande
        'title1': ['1.75rem',   { lineHeight: '2.25rem',  fontWeight: '700'        }],  // 28px — título grande
      },

      // ── Sistema de Color — Semáforo Clínico + Paleta HIG ───────────────────
      // Fuente: NUTRIA_INSTRUCCIONES_GLOBALES.md § 10 — Sistema Visual
      //
      // El semáforo de adecuación tiene 3 estados:
      //   success (verde)  → 95%–105% de adecuación → plan correcto
      //   warning (ámbar)  → 90%–94% / 106%–110%   → revisar
      //   danger  (rojo)   → <90% / >110%           → ajustar urgente
      colors: {
        // Backgrounds del sistema (Apple systemGray scale)
        background: {
          DEFAULT:  '#F2F2F7', // systemGray6 — fondo de app
          surface:  '#FFFFFF', // tarjetas, modales
          elevated: '#F9F9F9', // capas elevadas
        },

        // Primario — Azul Apple (#007AFF)
        primary: {
          DEFAULT:     '#007AFF',
          foreground:  '#FFFFFF',
          50:          '#EBF4FF',
          100:         '#C3DFFE',
          200:         '#90C2FD',
          300:         '#5DA5FC',
          400:         '#2A88FB',
          500:         '#007AFF', // base
          600:         '#005FCC',
          700:         '#004499',
          800:         '#002A66',
          900:         '#000F33',
        },

        // Semáforo — Success (Verde #34C759)
        success: {
          DEFAULT:    '#34C759',
          foreground: '#FFFFFF',
          light:      '#E9FBF0',
          muted:      '#A8E6B8',
        },

        // Semáforo — Warning (Ámbar #FF9500)
        warning: {
          DEFAULT:    '#FF9500',
          foreground: '#FFFFFF',
          light:      '#FFF4E0',
          muted:      '#FFCD85',
        },

        // Semáforo — Danger (Rojo #FF3B30)
        danger: {
          DEFAULT:    '#FF3B30',
          foreground: '#FFFFFF',
          light:      '#FFF0EF',
          muted:      '#FFA09B',
        },

        // Escalas de gris (Apple system grays)
        gray: {
          50:  '#F9F9F9',
          100: '#F2F2F7', // systemGray6
          200: '#E5E5EA', // systemGray5
          300: '#D1D1D6', // systemGray4
          400: '#C7C7CC', // systemGray3
          500: '#AEAEB2', // systemGray2
          600: '#8E8E93', // systemGray
          700: '#636366',
          800: '#48484A',
          900: '#3A3A3C',
          950: '#1C1C1E', // label color (dark mode background)
        },

        // Colores semánticos para datos clínicos de laboratorio
        // (reutilizan el semáforo pero con nombres de dominio)
        lab: {
          normal:  '#34C759', // valor dentro de rango
          border:  '#FF9500', // valor en zona limítrofe
          abnormal:'#FF3B30', // valor fuera de rango
          unknown: '#AEAEB2', // sin dato / no evaluado
        },
      },

      // ── Border Radius ────────────────────────────────────────────────────────
      // Sistema visual Apple HIG — radios redondeados para UI clínica amigable
      borderRadius: {
        'xs':  '4px',
        'sm':  '8px',
        DEFAULT: '12px',   // tarjetas principales
        'md':  '12px',
        'lg':  '16px',
        'xl':  '20px',
        '2xl': '24px',
        'pill':'9999px',   // chips de estado / badges
      },

      // ── Sombras ──────────────────────────────────────────────────────────────
      // Elevación Apple HIG: mínima, funcional, sin ornamentación
      boxShadow: {
        'card':    '0 1px 3px rgba(0, 0, 0, 0.12)',
        'card-md': '0 4px 12px rgba(0, 0, 0, 0.10)',
        'card-lg': '0 8px 24px rgba(0, 0, 0, 0.12)',
        'inner':   'inset 0 1px 2px rgba(0, 0, 0, 0.08)',
      },

      // ── Espaciado adicional ──────────────────────────────────────────────────
      // Touch targets: mínimo 44px (Apple HIG)
      spacing: {
        'touch': '44px',   // touch target mínimo — nunca usar menos en botones
        '18':    '4.5rem',
        '22':    '5.5rem',
        '88':    '22rem',
        '112':   '28rem',
        '128':   '32rem',
      },

      // ── Animaciones ─────────────────────────────────────────────────────────
      // Respeta prefers-reduced-motion automáticamente vía Tailwind
      keyframes: {
        'fade-in': {
          from: { opacity: '0', transform: 'translateY(4px)' },
          to:   { opacity: '1', transform: 'translateY(0)'   },
        },
        'slide-up': {
          from: { opacity: '0', transform: 'translateY(16px)' },
          to:   { opacity: '1', transform: 'translateY(0)'    },
        },
        'pulse-soft': {
          '0%, 100%': { opacity: '1'   },
          '50%':      { opacity: '0.6' },
        },
      },
      animation: {
        'fade-in':    'fade-in 200ms ease-out',
        'slide-up':   'slide-up 300ms ease-out',
        'pulse-soft': 'pulse-soft 2s ease-in-out infinite',
      },
    },
  },

  // ─── Plugins ─────────────────────────────────────────────────────────────────
  // shadcn/ui requiere tailwindcss-animate para sus componentes (Dialog, Sheet, etc.)
  // Se instala con: npm install tailwindcss-animate
  plugins: [
    require('tailwindcss-animate'),
  ],
}

export default config