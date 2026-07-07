import React, { useEffect, useState, useRef } from 'react'
import { Link, useNavigate, useLocation, Outlet } from 'react-router-dom'
import { useAuth } from '@/features/auth/context/AuthContext'
import { supabase } from '@/config/supabase'
import { useUpcomingRenewals } from '@/features/dashboard/hooks/useUpcomingRenewals'
import { QuickSaleModal } from '@/features/payments/components/QuickSaleModal'
import { useGymSettings } from '@/features/settings/hooks/useGymSettings'
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
  Activity,
  Bell,
  Zap,
  MessageSquare,
  CalendarDays
} from 'lucide-react'

export const DashboardLayout: React.FC = () => {
  const { user, role, permissions, signOut } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [gymName, setGymName] = useState<string>('Mi Gimnasio')
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  // Estados y Hooks para Venta Rápida y Notificaciones
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false)
  const [isQuickSaleOpen, setIsQuickSaleOpen] = useState(false)
  const { data: settings } = useGymSettings()
  const { data: renewals, refetch: refetchRenewals } = useUpcomingRenewals()
  const notificationsRef = useRef<HTMLDivElement>(null)

  // Cerrar notificaciones al hacer clic fuera del panel
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notificationsRef.current && !notificationsRef.current.contains(event.target as Node)) {
        setIsNotificationsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Enviar mensaje de WhatsApp
  const sendWhatsAppReminder = (fullName: string, phone: string | null, membershipName: string, endDateStr: string) => {
    if (!phone) return
    const cleanPhone = phone.replace(/[^\d+]/g, '')
    const formattedDate = new Date(endDateStr).toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'long',
    })
    const message = `Hola ${fullName}, te saludamos de ${gymName} 🏋️. Te recordamos que tu pase (${membershipName}) vence pronto, el ${formattedDate}. ¡Te esperamos para seguir entrenando fuerte! 💪`
    const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`
    window.open(url, '_blank')
  }

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
        <header className="h-16 border-b border-border bg-card/50 backdrop-blur-md px-6 flex items-center justify-between shrink-0">
          {/* Mobile menu trigger */}
          <button
            onClick={() => setIsMobileMenuOpen(true)}
            className="md:hidden p-2 rounded-xl border border-border hover:bg-secondary/40 text-muted-foreground hover:text-foreground"
          >
            <Menu className="h-5 w-5" />
          </button>

          <div className="md:flex-1 hidden md:block"></div>

          {/* User Status Bar, Quick Sale & Notifications */}
          <div className="flex items-center space-x-3">
            {/* Botón de Venta Rápida */}
            <button
              onClick={() => {
                if (!settings?.quick_sale_customer_id || !settings?.quick_sale_membership_id) {
                  if (confirm('Falta configurar los parámetros de venta rápida. ¿Deseas ir a Configuración ahora?')) {
                    navigate('/configuracion')
                  }
                  return
                }
                setIsQuickSaleOpen(true)
              }}
              className="flex items-center space-x-1.5 px-3 py-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/20 hover:border-amber-500/35 rounded-xl text-xs font-bold transition-all active:scale-[0.97]"
              title="Registrar Venta Rápida"
            >
              <Zap className="h-3.5 w-3.5 fill-amber-400/10 text-amber-400" />
              <span className="hidden sm:inline">Venta Rápida</span>
            </button>

            {/* Campana de Notificaciones */}
            <div className="relative" ref={notificationsRef}>
              <button
                onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
                className="relative p-2 text-muted-foreground hover:text-foreground hover:bg-secondary/40 rounded-xl border border-border/80 transition-all flex items-center justify-center"
                title="Alertas de Vencimientos"
              >
                <Bell className="h-4 w-4" />
                {renewals && renewals.length > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[8px] font-black text-destructive-foreground animate-pulse">
                    {renewals.length}
                  </span>
                )}
              </button>

              {/* Panel Flotante de Notificaciones */}
              {isNotificationsOpen && (
                <div className="absolute right-0 mt-2 w-80 max-w-[calc(100vw-2rem)] bg-card border border-border/80 rounded-2xl shadow-2xl z-50 overflow-hidden divide-y divide-border/40 animate-in slide-in-from-top-2 duration-150">
                  <div className="p-4 bg-secondary/15 flex justify-between items-center">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center space-x-1.5">
                      <Bell className="h-3.5 w-3.5 text-primary" />
                      <span>Vencimientos (Próx. 7 días)</span>
                    </h3>
                    {renewals && renewals.length > 0 && (
                      <span className="px-2 py-0.5 rounded-full bg-destructive/10 border border-destructive/20 text-[9px] font-extrabold text-destructive">
                        {renewals.length} alertas
                      </span>
                    )}
                  </div>

                  <div className="max-h-[300px] overflow-y-auto divide-y divide-border/45">
                    {renewals && renewals.length > 0 ? (
                      renewals.map((r) => {
                        const now = new Date()
                        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
                        const end = new Date(r.end_date)
                        const diffTime = end.getTime() - today.getTime()
                        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

                        let diffText = ''
                        if (diffDays === 0) diffText = 'Vence hoy'
                        else if (diffDays === 1) diffText = 'Vence mañana'
                        else if (diffDays > 1) diffText = `Vence en ${diffDays} días`
                        else diffText = `Venció hace ${Math.abs(diffDays)} días`

                        return (
                          <div key={r.id} className="p-3 hover:bg-secondary/20 transition-all flex items-start justify-between gap-2.5">
                            <div className="min-w-0 flex-1 cursor-pointer" onClick={() => {
                              setIsNotificationsOpen(false)
                              navigate(`/clientes/${r.customers?.id}`)
                            }}>
                              <p className="text-xs font-bold text-foreground truncate">{r.customers?.full_name}</p>
                              <p className="text-[10px] text-muted-foreground font-semibold truncate">{r.memberships?.name}</p>
                              <div className="flex items-center space-x-1 mt-1 text-[9px] font-bold text-rose-400">
                                <CalendarDays className="h-3 w-3 shrink-0" />
                                <span>{new Date(r.end_date).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })} ({diffText})</span>
                              </div>
                            </div>

                            {r.customers?.phone && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  sendWhatsAppReminder(r.customers!.full_name, r.customers!.phone, r.memberships!.name, r.end_date)
                                }}
                                className="p-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 hover:border-emerald-500/30 transition-all shrink-0 active:scale-95"
                                title="Enviar recordatorio WhatsApp"
                              >
                                <MessageSquare className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </div>
                        )
                      })
                    ) : (
                      <div className="p-8 text-center text-xs text-muted-foreground">
                        <Bell className="h-6 w-6 text-muted-foreground/45 mx-auto mb-2" />
                        <p>No hay alertas de vencimiento en los próximos 7 días.</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center space-x-3 pl-1">
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
          </div>
        </header>

        {/* Content Outlet with smooth scrolling */}
        <main className="flex-1 overflow-y-auto bg-background/50 p-6 relative">
          <Outlet />
        </main>
      </div>

      {/* Modal de Venta Rápida */}
      {isQuickSaleOpen && (
        <QuickSaleModal
          onClose={() => {
            setIsQuickSaleOpen(false)
            refetchRenewals()
          }}
        />
      )}
    </div>
  )
}
