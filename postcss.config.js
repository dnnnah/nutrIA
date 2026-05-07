/**
 * PostCSS Configuration — Proyecto NUTRIA
 *
 * Pipeline CSS requerido por Tailwind CSS v3 + Vite 5.
 *
 * ¿Por qué estos dos plugins solamente?
 *   - tailwindcss:  genera las clases utility a partir de tailwind.config.ts
 *   - autoprefixer: agrega prefijos de vendor (-webkit-, -moz-) automáticamente
 *                   para garantizar compatibilidad con Chrome/Safari iOS (usuarios móvil)
 *
 * NO se agrega cssnano aquí — Vite ya minifica el CSS en modo producción
 * usando esbuild, evitando doble procesamiento.
 *
 * @see https://tailwindcss.com/docs/using-with-preprocessors
 */
export default {
  plugins: {
    tailwindcss:  {},
    autoprefixer: {},
  },
}