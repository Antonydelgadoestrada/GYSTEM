import React, { useEffect, useState } from 'react'
import { Link, useNavigate, useLocation, Outlet } from 'react-router-dom'
import { useAuth } from '@/features/auth/context/AuthContext'
import { supabase } from '@/config/supabase'
import {
  LayoutDashboard,
  Users,
  Award,
  DollarSign,
  TrendingDown,
  BarChart3,
  Settings,
  LogOut,
  Menu,
  X,
  User as UserIcon,
  Activity
} from 'lucide-react'

export const DashboardLayout: React.FC = () => {
  const { user, role, permissions, signOut } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [gymName, setGymName] = useState<string>('Mi Gimnasio')
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  // Cargar nombre del Gimnasio
  useEffect(() => {
    const fetchGymName = async () => {
      try {
        const { data, error } = await supabase
          .from('gym_settings')
          .select('name')
          .maybeSingle()

        if (error) throw error
        if (data) {
          setGymName(data.name)
        }
      } catch (err) {
        console.error('Error al cargar nombre del gimnasio:', err)
      }
    }

    if (user) {
      fetchGymName()
    }
  }, [user])

  const menuItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard, permission: 'dashboard' },
    { name: 'Clientes', path: '/clientes', icon: Users, permission: 'clientes' },
    { name: 'Membresías', path: '/membresias', icon: Award, permission: 'membresias' },
    { name: 'Pagos / Caja', path: '/pagos', icon: DollarSign, permission: 'pagos' },
    { name: 'Gastos', path: '/gastos', icon: TrendingDown, permission: 'gastos' },
    { name: 'Personal', path: '/personal', icon: UserIcon, permission: 'personal' },
    { name: 'Reportes', path: '/reportes', icon: BarChart3, permission: 'reportes' },
    { name: 'Configuración', path: '/configuracion', icon: Settings, permission: 'configuracion' },
  ]

  // Filtrar items según permisos granulares del usuario logueado
  const filteredMenuItems = menuItems.filter(
    (item) => !item.permission || (permissions && permissions.includes(item.permission))
  )

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  // Traducción y badges de roles
  const roleBadges: Record<string, { label: string; class: string }> = {
    admin: { label: 'Admin', class: 'bg-violet-500/10 text-violet-400 border-violet-500/20' },
    recepcion: { label: 'Recepción', class: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
    entrenador: { label: 'Entrenador', class: 'bg-sky-500/10 text-sky-400 border-sky-500/20' },
  }

  const currentBadge = role ? roleBadges[role] : { label: 'Invitado', class: 'bg-muted/10 text-muted-foreground border-muted/20' }

  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden">
      {/* 1. SIDEBAR DESKTOP */}
      <aside className="hidden md:flex flex-col w-64 bg-card border-r border-border shrink-0">
        {/* Brand Header */}
        <div className="h-16 px-6 border-b border-border flex items-center space-x-3">
          <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground shadow-md shadow-primary/25">
            <Activity className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h2 className="font-bold text-sm tracking-tight truncate">{gymName}</h2>
            <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">GymFlow SaaS</span>
          </div>
        </div>

        {/* Navigation Menu */}
        <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
          {filteredMenuItems.map((item) => {
            const isActive = location.pathname === item.path
            const Icon = item.icon
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center space-x-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all group ${
                  isActive
                    ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/10'
                    : 'text-muted-foreground hover:text-foreground hover:bg-secondary/40'
                }`}
              >
                <Icon className={`h-4 w-4 shrink-0 transition-transform group-hover:scale-105`} />
                <span>{item.name}</span>
              </Link>
            )
          })}
        </nav>

        {/* User Card & Logout */}
        <div className="p-4 border-t border-border bg-secondary/10">
          <div className="flex items-center space-x-3 p-2 rounded-xl mb-2">
            <div className="h-9 w-9 rounded-full bg-secondary border border-border flex items-center justify-center text-muted-foreground shrink-0">
              <UserIcon className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <h4 className="text-sm font-semibold truncate">
                {user?.user_metadata?.full_name || user?.email}
              </h4>
              <span className={`inline-flex items-center px-2 py-0.5 mt-1 rounded-full text-[10px] font-semibold border ${currentBadge.class}`}>
                {currentBadge.label}
              </span>
            </div>
          </div>

          <button
            onClick={handleSignOut}
            className="w-full flex items-center justify-center space-x-2 px-4 py-2.5 rounded-xl text-sm font-medium text-destructive hover:bg-destructive/10 border border-transparent hover:border-destructive/20 transition-all active:scale-[0.98]"
          >
            <LogOut className="h-4 w-4" />
            <span>Cerrar Sesión</span>
          </button>
        </div>
      </aside>

      {/* 2. MOBILE MENU DRAWER OVERLAY */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          {/* Overlay background */}
          <div
            className="fixed inset-0 bg-background/80 backdrop-blur-sm"
            onClick={() => setIsMobileMenuOpen(false)}
          ></div>

          {/* Drawer Panel */}
          <aside className="relative flex flex-col w-72 max-w-xs bg-card border-r border-border h-full shadow-2xl animate-in slide-in-from-left duration-200">
            <div className="h-16 px-6 border-b border-border flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground shadow-md">
                  <Activity className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <h2 className="font-bold text-sm tracking-tight truncate">{gymName}</h2>
                  <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">GymFlow</span>
                </div>
              </div>
              <button
                onClick={() => setIsMobileMenuOpen(false)}
                className="p-1 rounded-lg border border-border text-muted-foreground hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
              {filteredMenuItems.map((item) => {
                const isActive = location.pathname === item.path
                const Icon = item.icon
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`flex items-center space-x-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                      isActive
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:text-foreground hover:bg-secondary/40'
                    }`}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <span>{item.name}</span>
                  </Link>
                )
              })}
            </nav>

            <div className="p-4 border-t border-border bg-secondary/10">
              <div className="flex items-center space-x-3 p-2 rounded-xl mb-3">
                <div className="h-9 w-9 rounded-full bg-secondary border border-border flex items-center justify-center text-muted-foreground shrink-0">
                  <UserIcon className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="text-sm font-semibold truncate">
                    {user?.user_metadata?.full_name || user?.email}
                  </h4>
                  <span className={`inline-flex items-center px-2 py-0.5 mt-1 rounded-full text-[10px] font-semibold border ${currentBadge.class}`}>
                    {currentBadge.label}
                  </span>
                </div>
              </div>
              <button
                onClick={handleSignOut}
                className="w-full flex items-center justify-center space-x-2 px-4 py-2.5 rounded-xl text-sm font-medium text-destructive hover:bg-destructive/10 border border-transparent hover:border-destructive/20 transition-all"
              >
                <LogOut className="h-4 w-4" />
                <span>Cerrar Sesión</span>
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* 3. MAIN WORKSPACE */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header (Top bar) */}
        <header className="h-16 border-b border-border bg-card/50 backdrop-blur-md px-6 flex items-center justify-between shrink-0 md:justify-end">
          {/* Mobile menu trigger */}
          <button
            onClick={() => setIsMobileMenuOpen(true)}
            className="md:hidden p-2 rounded-xl border border-border hover:bg-secondary/40 text-muted-foreground hover:text-foreground"
          >
            <Menu className="h-5 w-5" />
          </button>

          {/* User Status Bar */}
          <div className="flex items-center space-x-4">
            <div className="hidden md:flex flex-col text-right">
              <span className="text-sm font-semibold">
                {user?.user_metadata?.full_name || user?.email}
              </span>
              <span className="text-[10px] text-muted-foreground capitalize">
                Rol: {currentBadge.label}
              </span>
            </div>
            <div className="h-9 w-9 rounded-full bg-secondary border border-border flex items-center justify-center text-muted-foreground">
              <UserIcon className="h-4 w-4" />
            </div>
          </div>
        </header>

        {/* Content Outlet with smooth scrolling */}
        <main className="flex-1 overflow-y-auto bg-background/50 p-6 relative">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
