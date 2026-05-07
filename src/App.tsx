/**
 * App.tsx — Punto de entrada de la aplicación NUTRIA
 *
 * Responsabilidades:
 *   1. Renderizar el RouterProvider con la configuración de rutas
 *   2. Aquí irán en Fase 2: ThemeProvider, QueryClientProvider, etc.
 *
 * No contiene lógica de negocio ni UI directa — solo wrappers globales.
 */

import { RouterProvider } from 'react-router-dom'
import router from './router'

export default function App() {
  return <RouterProvider router={router} />
}