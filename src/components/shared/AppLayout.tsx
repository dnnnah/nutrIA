/**
 * AppLayout.tsx — Layout principal de NUTRIA
 *
 * Estructura:
 *   Desktop (≥768px): Sidebar izquierdo fijo (220px) + contenido principal
 *   Mobile (<768px):  Header con hamburger + Tab bar inferior + Drawer lateral
 *
 * Tokens CSS respetados del sistema Apple HIG de NUTRIA.
 * Touch targets ≥ 44×44px (WCAG 2.1 AA).
 */

import { useState, useCallback } from 'react'
import { Outlet, NavLink, useLocation } from 'react-router-dom'
import {
  Home,
  Calculator,
  Ruler,
  FlaskConical,
  Zap,
  LayoutGrid,
  CheckCircle,
  BookOpen,
  Settings,
  Menu,
  X,
  Activity,
  ChevronRight,
  Heart,
  Droplet,
  Droplets,
  HeartPulse,
  Baby,
} from 'lucide-react'

// ─── Tipos ───────────────────────────────────────────────────────────────────

interface NavItem {
  label: string
  ruta: string
  icono: React.ReactNode
}

interface NavGroup {
  titulo: string
  items: NavItem[]
}

// ─── Navegación canónica ──────────────────────────────────────────────────────

const GRUPOS_NAV: NavGroup[] = [
  {
    titulo: 'General',
    items: [
      { label: 'Inicio',     ruta: '/',          icono: <Home size={16} /> },
      { label: 'Recientes',  ruta: '/recientes', icono: <Activity size={16} /> },
    ],
  },
  {
    titulo: 'Evaluación',
    items: [
      { label: 'GET / TMB',       ruta: '/calculadora',             icono: <Calculator   size={16} /> },
      { label: 'Antropometría',   ruta: '/antropometria',           icono: <Ruler        size={16} /> },
      { label: 'Laboratorios',    ruta: '/laboratorios',            icono: <FlaskConical size={16} /> },
      { label: 'Diabetes / SM',   ruta: '/diabetes',                icono: <HeartPulse   size={16} /> },
      { label: 'Nutrición Renal', ruta: '/renal',                   icono: <Droplets     size={16} /> },
      { label: 'Obesidad / CV',   ruta: '/obesidad-cardiovascular', icono: <Heart        size={16} /> },
      { label: 'Hidratación',     ruta: '/hidratacion',             icono: <Droplet      size={16} /> },
      { label: 'Embarazo / Lactancia ',     ruta: '/embarazo',             icono: <Baby      size={16} /> },
      { label: 'METs',            ruta: '/mets',                    icono: <Zap          size={16} /> },
    ],
  },
  {
    titulo: 'Planificación',
    items: [
      { label: 'Planeador SMAE', ruta: '/planeador',  icono: <LayoutGrid  size={16} /> },
      { label: 'Adecuación',     ruta: '/adecuacion', icono: <CheckCircle size={16} /> },
    ],
  },
]

const NAV_FOOTER: NavItem[] = [
  { label: 'Referencias', ruta: '/referencias', icono: <BookOpen size={16} /> },
  { label: 'Ajustes',     ruta: '/ajustes',     icono: <Settings size={16} /> },
]

// Tab bar para mobile — máximo 4 tabs
const TABS_MOBILE: NavItem[] = [
  { label: 'Inicio',      ruta: '/',            icono: <Home       size={20} /> },
  { label: 'Calcular',    ruta: '/calculadora', icono: <Calculator size={20} /> },
  { label: 'Planes',      ruta: '/planeador',   icono: <LayoutGrid size={20} /> },
  { label: 'Referencias', ruta: '/referencias', icono: <BookOpen   size={20} /> },
]

// ─── Sub-componentes ──────────────────────────────────────────────────────────

/** Ítem individual del sidebar con estilo activo */
function SidebarItem({ item, onClick }: { item: NavItem; onClick?: () => void }) {
  return (
    <NavLink
      to={item.ruta}
      end={item.ruta === '/'}
      onClick={onClick}
      className={({ isActive }) =>
        [
          'flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium',
          'transition-all duration-150 min-h-[44px] group',
          isActive
            ? 'bg-[color:var(--color-primary)] text-white shadow-sm'
            : 'text-[color:var(--color-text-secondary)] hover:bg-[color:var(--color-bg)] hover:text-[color:var(--color-text-primary)]',
        ].join(' ')
      }
    >
      {({ isActive }) => (
        <>
          <span
            className={[
              'transition-colors',
              isActive
                ? 'text-white'
                : 'text-[color:var(--color-text-tertiary)] group-hover:text-[color:var(--color-primary)]',
            ].join(' ')}
          >
            {item.icono}
          </span>
          <span className="flex-1 leading-tight">{item.label}</span>
          {isActive && <ChevronRight size={12} className="opacity-60" />}
        </>
      )}
    </NavLink>
  )
}

/** Contenido del sidebar — reutilizable en desktop y drawer mobile */
function SidebarContent({ onNavClick }: { onNavClick?: () => void }) {
  return (
    <div className="flex flex-col h-full">
      {/* Logo / nombre de app */}
      <div className="px-4 pt-6 pb-5 border-b border-[color:var(--color-border)]">
        <div className="flex items-center gap-2.5">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-sm font-bold shadow-sm"
            style={{ background: 'var(--color-primary)' }}
          >
            N
          </div>
          <div>
            <p className="text-sm font-semibold text-[color:var(--color-text-primary)] leading-tight">
              NUTRIA
            </p>
            <p className="text-[11px] text-[color:var(--color-text-tertiary)] leading-tight font-medium tracking-wide uppercase">
              Clínica Dietética
            </p>
          </div>
        </div>
      </div>

      {/* Grupos de navegación */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
        {GRUPOS_NAV.map((grupo) => (
          <div key={grupo.titulo}>
            <p className="px-3 mb-1.5 text-[10px] font-semibold tracking-widest uppercase text-[color:var(--color-text-tertiary)]">
              {grupo.titulo}
            </p>
            <ul className="space-y-0.5">
              {grupo.items.map((item) => (
                <li key={item.ruta}>
                  <SidebarItem item={item} onClick={onNavClick} />
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>

      {/* Footer del sidebar */}
      <div className="px-3 py-4 border-t border-[color:var(--color-border)] space-y-0.5">
        {NAV_FOOTER.map((item) => (
          <SidebarItem key={item.ruta} item={item} onClick={onNavClick} />
        ))}
      </div>
    </div>
  )
}

/** Tab bar inferior para mobile */
function MobileTabBar() {
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 md:hidden"
      style={{
        background:          'rgba(255,255,255,0.92)',
        backdropFilter:      'blur(20px)',
        WebkitBackdropFilter:'blur(20px)',
        borderTop:           '1px solid var(--color-border)',
        paddingBottom:       'env(safe-area-inset-bottom)',
      }}
    >
      <ul className="flex">
        {TABS_MOBILE.map((tab) => (
          <li key={tab.ruta} className="flex-1">
            <NavLink
              to={tab.ruta}
              end={tab.ruta === '/'}
              className={({ isActive }) =>
                [
                  'flex flex-col items-center justify-center gap-1 py-2 min-h-[56px]',
                  'text-[10px] font-semibold tracking-wide transition-colors duration-150',
                  isActive
                    ? 'text-[color:var(--color-primary)]'
                    : 'text-[color:var(--color-text-tertiary)]',
                ].join(' ')
              }
            >
              {({ isActive }) => (
                <>
                  <span
                    className={[
                      'flex items-center justify-center w-8 h-8 rounded-lg transition-all duration-150',
                      isActive ? 'bg-blue-50' : '',
                    ].join(' ')}
                  >
                    {tab.icono}
                  </span>
                  {tab.label}
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function AppLayout() {
  const [drawerAbierto, setDrawerAbierto] = useState(false)
  const location = useLocation()

  const cerrarDrawer = useCallback(() => setDrawerAbierto(false), [])
  const abrirDrawer  = useCallback(() => setDrawerAbierto(true), [])

  // Título de la ruta actual para el header mobile
  const tituloActual = (() => {
    const todas = [...GRUPOS_NAV.flatMap((g) => g.items), ...NAV_FOOTER]
    const match = todas.find((item) =>
      item.ruta === '/'
        ? location.pathname === '/'
        : location.pathname.startsWith(item.ruta)
    )
    return match?.label ?? 'NUTRIA'
  })()

  return (
    <div
      className="flex h-screen overflow-hidden"
      style={{ background: 'var(--color-bg)', fontFamily: 'var(--font-family)' }}
    >
      {/* ── Sidebar Desktop (≥ md) ── */}
      <aside
        className="hidden md:flex md:flex-col md:flex-shrink-0"
        style={{
          width:       '220px',
          background:  'var(--color-surface)',
          borderRight: '1px solid var(--color-border)',
        }}
      >
        <SidebarContent />
      </aside>

      {/* ── Drawer Mobile (< md) ── */}
      {/* Backdrop */}
      <div
        className={[
          'fixed inset-0 z-50 md:hidden transition-opacity duration-200',
          drawerAbierto ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none',
        ].join(' ')}
        style={{ background: 'rgba(0,0,0,0.40)' }}
        onClick={cerrarDrawer}
        aria-hidden="true"
      />

      {/* Drawer panel */}
      <aside
        className={[
          'fixed top-0 left-0 bottom-0 z-50 md:hidden flex flex-col',
          'transition-transform duration-200 ease-out',
          drawerAbierto ? 'translate-x-0' : '-translate-x-full',
        ].join(' ')}
        style={{
          width:       '260px',
          background:  'var(--color-surface)',
          borderRight: '1px solid var(--color-border)',
        }}
        aria-label="Menú de navegación"
      >
        {/* Botón cerrar drawer */}
        <button
          onClick={cerrarDrawer}
          className="absolute top-4 right-3 p-2.5 rounded-lg text-[color:var(--color-text-secondary)] hover:bg-[color:var(--color-bg)] transition-colors"
          aria-label="Cerrar menú"
          style={{ minWidth: '44px', minHeight: '44px' }}
        >
          <X size={18} />
        </button>

        <SidebarContent onNavClick={cerrarDrawer} />
      </aside>

      {/* ── Área de contenido ── */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        {/* Header mobile */}
        <header
          className="flex md:hidden items-center px-4 h-14 flex-shrink-0"
          style={{
            background:          'rgba(255,255,255,0.92)',
            backdropFilter:      'blur(20px)',
            WebkitBackdropFilter:'blur(20px)',
            borderBottom:        '1px solid var(--color-border)',
          }}
        >
          <button
            onClick={abrirDrawer}
            className="p-2.5 -ml-2 rounded-lg text-[color:var(--color-text-secondary)] hover:bg-[color:var(--color-bg)] transition-colors"
            aria-label="Abrir menú"
            style={{ minWidth: '44px', minHeight: '44px' }}
          >
            <Menu size={20} />
          </button>
          <h1 className="ml-2 text-base font-semibold text-[color:var(--color-text-primary)]">
            {tituloActual}
          </h1>
        </header>

        {/* Contenido de la ruta activa */}
        <main
          className="flex-1 overflow-y-auto"
          style={{ paddingBottom: 'calc(56px + env(safe-area-inset-bottom))' }}
          id="main-content"
        >
          <div className="md:pb-0">
            <Outlet />
          </div>
        </main>
      </div>

      {/* Tab bar mobile */}
      <MobileTabBar />
    </div>
  )
}