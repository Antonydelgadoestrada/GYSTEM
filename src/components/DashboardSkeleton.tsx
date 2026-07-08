import React from 'react'
import {
  LayoutDashboard,
  Users,
  Award,
  DollarSign,
  TrendingDown,
  BarChart3,
  Settings,
  User as UserIcon,
  Activity,
  Bell,
  Zap,
} from 'lucide-react'

export const DashboardSkeleton: React.FC = () => {
  const menuItems = [
    { name: 'Dashboard', icon: LayoutDashboard },
    { name: 'Clientes', icon: Users },
    { name: 'Membresías', icon: Award },
    { name: 'Pagos / Caja', icon: DollarSign },
    { name: 'Gastos', icon: TrendingDown },
    { name: 'Personal', icon: UserIcon },
    { name: 'Reportes', icon: BarChart3 },
    { name: 'Configuración', icon: Settings },
  ]

  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden">
      {/* 1. SIDEBAR DESKTOP SKELETON */}
      <aside className="hidden md:flex flex-col w-64 bg-card border-r border-border shrink-0">
        {/* Brand Header */}
        <div className="h-16 px-6 border-b border-border flex items-center space-x-3">
          <div className="h-8 w-8 rounded-lg bg-primary/20 animate-pulse flex items-center justify-center text-primary/40">
            <Activity className="h-5 w-5" />
          </div>
          <div className="space-y-1.5 flex-1">
            <div className="h-3.5 w-24 bg-muted animate-pulse rounded-md"></div>
            <div className="h-2 w-16 bg-muted/65 animate-pulse rounded-sm"></div>
          </div>
        </div>

        {/* Navigation Menu */}
        <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
          {menuItems.map((item, index) => {
            const Icon = item.icon
            const isFirst = index === 0
            return (
              <div
                key={index}
                className={`flex items-center space-x-3 px-4 py-2.5 rounded-xl transition-all ${
                  isFirst
                    ? 'bg-primary/10 text-primary/50'
                    : 'text-muted-foreground/40'
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <div className={`h-3 w-20 animate-pulse rounded-md ${
                  isFirst ? 'bg-primary/25' : 'bg-muted'
                }`}></div>
              </div>
            )
          })}
        </nav>

        {/* User Card & Logout */}
        <div className="p-4 border-t border-border bg-secondary/5">
          <div className="flex items-center space-x-3 p-2 rounded-xl mb-2">
            <div className="h-9 w-9 rounded-full bg-secondary border border-border/80 flex items-center justify-center text-muted-foreground/30 shrink-0">
              <UserIcon className="h-4 w-4" />
            </div>
            <div className="space-y-1.5 flex-1">
              <div className="h-3.5 w-24 bg-muted animate-pulse rounded-md"></div>
              <div className="h-3.5 w-12 bg-muted/60 animate-pulse rounded-full"></div>
            </div>
          </div>

          <div className="h-10 w-full bg-muted/30 border border-border rounded-xl flex items-center justify-center space-x-2 text-muted-foreground/30">
            <div className="h-3 w-24 bg-muted/50 animate-pulse rounded-md"></div>
          </div>
        </div>
      </aside>

      {/* 2. MAIN WORKSPACE SKELETON */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header (Top bar) */}
        <header className="h-16 border-b border-border bg-card/50 backdrop-blur-md px-6 flex items-center justify-between shrink-0">
          <div className="md:flex-1"></div>

          {/* User Status Bar, Quick Sale & Notifications */}
          <div className="flex items-center space-x-3">
            {/* Quick Sale Button Placeholder */}
            <div className="flex items-center space-x-1.5 px-3 py-2 bg-amber-500/5 text-amber-500/25 border border-amber-500/10 rounded-xl">
              <Zap className="h-3.5 w-3.5 fill-amber-500/5 text-amber-500/20" />
              <div className="h-3 w-16 bg-amber-500/10 animate-pulse rounded-md hidden sm:block"></div>
            </div>

            {/* Notification Bell Placeholder */}
            <div className="p-2 text-muted-foreground/35 border border-border/80 rounded-xl flex items-center justify-center">
              <Bell className="h-4 w-4" />
            </div>

            {/* Profile Avatar Placeholder */}
            <div className="flex items-center space-x-3 pl-1">
              <div className="hidden md:flex flex-col items-end space-y-1">
                <div className="h-3.5 w-24 bg-muted animate-pulse rounded-md"></div>
                <div className="h-2 w-16 bg-muted/60 animate-pulse rounded-sm"></div>
              </div>
              <div className="h-9 w-9 rounded-full bg-secondary border border-border/80 flex items-center justify-center text-muted-foreground/30">
                <UserIcon className="h-4 w-4" />
              </div>
            </div>
          </div>
        </header>

        {/* Content Outlet with smooth scrolling */}
        <main className="flex-1 overflow-y-auto bg-background/50 p-6 space-y-6">
          {/* Dashboard Title Skeleton */}
          <div className="space-y-2">
            <div className="h-6 w-48 bg-muted animate-pulse rounded-lg"></div>
            <div className="h-3 w-64 bg-muted/60 animate-pulse rounded-md"></div>
          </div>

          {/* KPI Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map((kpiIndex) => (
              <div key={kpiIndex} className="bg-card border border-border/85 rounded-2xl p-5 relative overflow-hidden space-y-3">
                <div className="flex items-center justify-between">
                  <div className="h-3 w-28 bg-muted animate-pulse rounded-md"></div>
                  <div className="h-7 w-7 rounded-lg bg-muted/40 animate-pulse"></div>
                </div>
                <div className="space-y-1">
                  <div className="h-8 w-24 bg-muted animate-pulse rounded-lg"></div>
                  <div className="h-3 w-32 bg-muted/50 animate-pulse rounded-md"></div>
                </div>
              </div>
            ))}
          </div>

          {/* Graphical Section and Lists */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Chart Card Skeleton */}
            <div className="bg-card border border-border/85 rounded-2xl p-5 lg:col-span-2 space-y-4">
              <div className="flex items-center justify-between">
                <div className="h-4.5 w-36 bg-muted animate-pulse rounded-md"></div>
                <div className="flex space-x-2">
                  <div className="h-6 w-16 bg-muted/60 animate-pulse rounded-lg"></div>
                  <div className="h-6 w-16 bg-muted/60 animate-pulse rounded-lg"></div>
                </div>
              </div>
              <div className="h-64 w-full bg-muted/20 animate-pulse rounded-xl flex items-end p-4 space-x-3">
                {/* Simulated Chart Bars/Waves */}
                {[...Array(6)].map((_, i) => (
                  <div
                    key={i}
                    className="flex-1 bg-muted/40 rounded-t-lg transition-all animate-pulse"
                    style={{
                      height: `${[40, 70, 55, 90, 60, 85][i]}%`,
                      animationDelay: `${i * 150}ms`,
                    }}
                  ></div>
                ))}
              </div>
            </div>

            {/* List Card Skeleton (Renewals/Payments) */}
            <div className="bg-card border border-border/85 rounded-2xl p-5 space-y-4 flex flex-col justify-between">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="h-4.5 w-40 bg-muted animate-pulse rounded-md"></div>
                  <div className="h-5 w-12 bg-muted/50 animate-pulse rounded-full"></div>
                </div>
                <div className="space-y-3.5 divide-y divide-border/40">
                  {[1, 2, 3, 4].map((itemIndex) => (
                    <div key={itemIndex} className="pt-3.5 first:pt-0 flex items-start justify-between gap-3">
                      <div className="space-y-1.5 flex-1">
                        <div className="h-3 w-28 bg-muted animate-pulse rounded-md"></div>
                        <div className="h-2 w-16 bg-muted/60 animate-pulse rounded-sm"></div>
                        <div className="h-2 w-24 bg-muted/40 animate-pulse rounded-sm"></div>
                      </div>
                      <div className="h-7 w-7 rounded-lg bg-muted/40 animate-pulse shrink-0"></div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
