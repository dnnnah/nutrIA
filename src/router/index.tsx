/**
 * router/index.tsx — Configuración de React Router para NUTRIA
 *
 * Estructura de rutas:
 *   / (AppLayout)
 *   ├── ""                        → Dashboard
 *   ├── recientes                 → Recientes
 *   ├── calculadora               → Calculator
 *   ├── antropometria             → Anthropometry
 *   ├── laboratorios              → Biochemistry
 *   ├── mets                      → Mets
 *   ├── obesidad-cardiovascular   → ObesidadCardiovascular  ← NUEVO
 *   ├── planeador                 → Planner
 *   ├── adecuacion                → Adequacy
 *   ├── referencias               → References
 *   └── ajustes                   → Settings
 *
 * Decisión: createBrowserRouter (v6 Data API) — preparado para loaders
 * en Fase 2 cuando se integre Supabase y rutas necesiten datos prefetched.
 */

import { createBrowserRouter } from 'react-router-dom'

import AppLayout              from '../components/shared/AppLayout'
import Dashboard              from '../pages/Dashboard'
import Calculator             from '../pages/Calculator'
import Anthropometry          from '../pages/Anthropometry'
import Biochemistry           from '../pages/Biochemistry'
import Diabetes               from '../pages/Diabetes'
import Renal                  from '../pages/Renal'
import ObesidadCardiovascular from '../pages/ObesidadCardiovascular'
import Mets                   from '../pages/Mets'
import Planner                from '../pages/Planner'
import Adequacy               from '../pages/Adequacy'
import References             from '../pages/References'
import Settings               from '../pages/Settings'
import Recientes              from '../pages/Recientes'

const router = createBrowserRouter([
  {
    path: '/',
    element: <AppLayout />,
    children: [
      { index: true,                              element: <Dashboard /> },
      { path: 'recientes',                        element: <Recientes /> },
      { path: 'calculadora',                      element: <Calculator /> },
      { path: 'antropometria',                    element: <Anthropometry /> },
      { path: 'laboratorios',                     element: <Biochemistry /> },
      { path: 'diabetes',                         element: <Diabetes /> },
      { path: 'renal',                            element: <Renal /> },
      { path: 'obesidad-cardiovascular',          element: <ObesidadCardiovascular /> },
      { path: 'mets',                             element: <Mets /> },
      { path: 'planeador',                        element: <Planner /> },
      { path: 'adecuacion',                       element: <Adequacy /> },
      { path: 'referencias',                      element: <References /> },
      { path: 'ajustes',                          element: <Settings /> },
    ],
  },
])

export default router