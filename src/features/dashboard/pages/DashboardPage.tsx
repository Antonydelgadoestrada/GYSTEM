import React from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/config/supabase'
import { useNavigate } from 'react-router-dom'
import { useGymSettings } from '@/features/settings/hooks/useGymSettings'
import { formatMoney } from '@/utils/currency'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts'
import {
  DollarSign,
  TrendingDown,
  TrendingUp,
  Users,
  Activity,
  PlusCircle,
  MessageSquare,
  ArrowRight,
  ShieldAlert
} from 'lucide-react'

// Definición de Interfaces Locales
interface DashboardKPIs {
  monthlyIncome: number
  monthlyExpenses: number
  utility: number
  activeCustomersCount: number
  newCustomersCount: number
  expiredCustomersCount: number
}

interface RenewalAlert {
  id: string
  fullName: string
  phone: string | null
  membershipName: string
  endDate: string
}

interface RecentPayment {
  id: string
  customerName: string
  membershipName: string
  amount: number
  date: string
}

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate()
  const { data: settings } = useGymSettings()

  // 1. Fetch de todos los datos en paralelo para el Dashboard
  const { data: metrics, isLoading } = useQuery<{
    kpis: DashboardKPIs
    chartData: any[]
    renewals: RenewalAlert[]
    recentPayments: RecentPayment[]
  }>({
    queryKey: ['dashboardData'],
    queryFn: async () => {
      const now = new Date()
      const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
      const nextWeekDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 7).toISOString().split('T')[0]
      const todayStr = now.toISOString().split('T')[0]

      // A) Obtener pagos del mes
      const { data: payments } = await supabase
        .from('payments')
        .select('amount, payment_date, status, customer_memberships(memberships(name), customers(full_name))')
        .eq('status', 'paid')

      // B) Obtener gastos del mes
      const { data: expenses } = await supabase
        .from('expenses')
        .select('amount, expense_date')

      // C) Obtener conteos de clientes
      const { data: customers } = await supabase
        .from('customers')
        .select('id, status, created_at')

      // D) Obtener membresías próximas a vencer (próximos 7 días)
      const { data: upcomingCM } = await supabase
        .from('customer_memberships')
        .select('id, end_date, status, customers(full_name, phone), memberships(name, duration_days)')
        .eq('status', 'active')
        .lte('end_date', nextWeekDate)
        .gte('end_date', todayStr)
        .order('end_date', { ascending: true })

      // E) Obtener últimos pagos registrados (límite 5)
      const { data: recentP } = await supabase
        .from('payments')
        .select(`
          id,
          amount,
          payment_date,
          customer_memberships (
            customers (full_name),
            memberships (name)
          )
        `)
        .eq('status', 'paid')
        .order('created_at', { ascending: false })
        .limit(5)

      // CALCULOS DE KPIs
      const monthlyIncome = payments
        ?.filter(p => p.payment_date >= firstDayOfMonth)
        .reduce((sum, p) => sum + Number(p.amount), 0) || 0

      const monthlyExpenses = expenses
        ?.filter(e => e.expense_date >= firstDayOfMonth)
        .reduce((sum, e) => sum + Number(e.amount), 0) || 0

      const activeCustomersCount = customers?.filter(c => c.status === 'active').length || 0
      const expiredCustomersCount = customers?.filter(c => c.status === 'inactive').length || 0
      
      const newCustomersCount = customers?.filter(c => {
        const created = new Date(c.created_at)
        return created.getFullYear() === now.getFullYear() && created.getMonth() === now.getMonth()
      }).length || 0

      const kpis = {
        monthlyIncome,
        monthlyExpenses,
        utility: monthlyIncome - monthlyExpenses,
        activeCustomersCount,
        newCustomersCount,
        expiredCustomersCount
      }

      // AGRUPAR DATOS PARA EL GRÁFICO (Últimos 6 meses)
      const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
      const chartMap: Record<string, { name: string; Ingresos: number; Gastos: number }> = {}

      // Inicializar últimos 6 meses en el gráfico
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
        chartMap[key] = {
          name: `${months[d.getMonth()]} ${String(d.getFullYear()).slice(-2)}`,
          Ingresos: 0,
          Gastos: 0
        }
      }

      payments?.forEach((p) => {
        const key = p.payment_date.slice(0, 7)
        if (chartMap[key]) {
          chartMap[key].Ingresos += Number(p.amount)
        }
      })

      expenses?.forEach((e) => {
        const key = e.expense_date.slice(0, 7)
        if (chartMap[key]) {
          chartMap[key].Gastos += Number(e.amount)
        }
      })

      const chartData = Object.values(chartMap)

      // MAPEADO DE ALERTAS DE VENCIMIENTO (Excluyendo pases diarios/de 1 día)
      const renewals = (upcomingCM || [])
        .filter((cm: any) => cm.memberships && cm.memberships.duration_days > 1)
        .map((cm: any) => ({
          id: cm.id,
          fullName: cm.customers?.full_name || 'Desconocido',
          phone: cm.customers?.phone || null,
          membershipName: cm.memberships?.name || 'Plan',
          endDate: cm.end_date
        }))

      // MAPEADO DE PAGOS RECIENTES
      const recentPayments = (recentP || []).map((rp: any) => ({
        id: rp.id,
        customerName: rp.customer_memberships?.customers?.full_name || 'Desconocido',
        membershipName: rp.customer_memberships?.memberships?.name || 'Membresía',
        amount: rp.amount,
        date: rp.payment_date
      }))

      return {
        kpis,
        chartData,
        renewals,
        recentPayments
      }
    }
  })

  // WhatsApp reminder template
  const sendWhatsAppReminder = (customer: RenewalAlert) => {
    if (!customer.phone) return
    const cleanPhone = customer.phone.replace(/[^\d+]/g, '')
    const formattedDate = new Date(customer.endDate).toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'long',
    })
    const message = `Hola ${customer.fullName}, te saludamos de tu gimnasio 🏋️. Te recordamos que tu pase (${customer.membershipName}) vence pronto, el ${formattedDate}. ¡Asegura tu cupo renovando a tiempo! 💪`
    const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`
    window.open(url, '_blank')
  }

  const kpisList = [
    {
      title: 'Ingresos Mensuales',
      value: formatMoney(metrics?.kpis.monthlyIncome || 0, settings),
      subtext: 'Recaudado este mes',
      icon: TrendingUp,
      color: 'text-emerald-400 bg-emerald-500/10'
    },
    {
      title: 'Gastos Mensuales',
      value: formatMoney(metrics?.kpis.monthlyExpenses || 0, settings),
      subtext: 'Egresos operativos del mes',
      icon: TrendingDown,
      color: 'text-rose-400 bg-rose-500/10'
    },
    {
      title: 'Utilidad Neta',
      value: formatMoney(metrics?.kpis.utility || 0, settings),
      subtext: 'Balance final del mes',
      icon: DollarSign,
      color: (metrics?.kpis.utility || 0) >= 0 ? 'text-primary bg-primary/10' : 'text-rose-400 bg-rose-500/10'
    },
    {
      title: 'Miembros Activos',
      value: String(metrics?.kpis.activeCustomersCount || 0),
      subtext: `${metrics?.kpis.newCustomersCount || 0} nuevos este mes`,
      icon: Users,
      color: 'text-sky-400 bg-sky-500/10'
    }
  ]

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-foreground">
        <div className="flex flex-col items-center space-y-4">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
          <p className="text-sm text-muted-foreground animate-pulse">Analizando métricas del gimnasio...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Saludo y Acciones Rápidas */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 border-b border-border/40 pb-5">
        <div className="space-y-1">
          <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-violet-400 to-indigo-500 bg-clip-text text-transparent">
            Panel de Control GYMFLOW
          </h1>
          <p className="text-muted-foreground text-sm">
            Control de caja en tiempo real, vencimientos y reportes consolidados.
          </p>
        </div>

        {/* Accesos Rápidos */}
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => navigate('/clientes')}
            className="flex items-center space-x-1.5 px-3 py-2 text-xs font-semibold bg-secondary/50 hover:bg-secondary border border-border rounded-xl transition-all"
          >
            <PlusCircle className="h-3.5 w-3.5" />
            <span>Nuevo Cliente</span>
          </button>
          <button
            onClick={() => navigate('/pagos')}
            className="flex items-center space-x-1.5 px-3 py-2 text-xs font-semibold bg-secondary/50 hover:bg-secondary border border-border rounded-xl transition-all"
          >
            <DollarSign className="h-3.5 w-3.5" />
            <span>Cobrar Membresía</span>
          </button>
          <button
            onClick={() => navigate('/gastos')}
            className="flex items-center space-x-1.5 px-3 py-2 text-xs font-semibold bg-secondary/50 hover:bg-secondary border border-border rounded-xl transition-all"
          >
            <TrendingDown className="h-3.5 w-3.5" />
            <span>Registrar Gasto</span>
          </button>
        </div>
      </div>

      {/* Grid de KPIs */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        {kpisList.map((kpi, idx) => {
          const Icon = kpi.icon
          return (
            <div key={idx} className="p-6 bg-card border border-border/60 rounded-2xl shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{kpi.title}</span>
                <div className={`p-2 rounded-lg ${kpi.color}`}>
                  <Icon className="h-4 w-4" />
                </div>
              </div>
              <div>
                <h3 className="text-2xl font-black tracking-tight">{kpi.value}</h3>
                <p className="text-[10px] text-muted-foreground mt-1">{kpi.subtext}</p>
              </div>
            </div>
          )
        })}
      </div>

      {/* Gráfico y Alertas */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Gráfico de Balance (2/3 de ancho) */}
        <div className="lg:col-span-2 bg-card border border-border/60 rounded-2xl p-6 shadow-sm space-y-4">
          <h3 className="font-bold text-sm uppercase tracking-wider text-muted-foreground flex items-center space-x-2">
            <Activity className="h-4 w-4 text-primary" />
            <span>Histórico de Flujo de Caja</span>
          </h3>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={metrics?.chartData || []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorIngresos" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#aa3bff" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#aa3bff" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorGastos" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#2e303a" />
                <XAxis dataKey="name" stroke="#9ca3af" fontSize={11} tickLine={false} />
                <YAxis stroke="#9ca3af" fontSize={11} tickLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1f2028', borderColor: '#2e303a', borderRadius: '12px' }}
                  labelStyle={{ fontWeight: 'bold', color: '#f3f4f6' }}
                />
                <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: '12px' }} />
                <Area name="Ingresos" type="monotone" dataKey="Ingresos" stroke="#aa3bff" strokeWidth={2} fillOpacity={1} fill="url(#colorIngresos)" />
                <Area name="Gastos" type="monotone" dataKey="Gastos" stroke="#f43f5e" strokeWidth={2} fillOpacity={1} fill="url(#colorGastos)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Alertas de Vencimiento de Membresías (1/3 de ancho) */}
        <div className="lg:col-span-1 bg-card border border-border/60 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
          <div className="space-y-4">
            <h3 className="font-bold text-sm uppercase tracking-wider text-muted-foreground flex items-center space-x-2">
              <ShieldAlert className="h-4 w-4 text-rose-400" />
              <span>Vencimientos Próximos (7 Días)</span>
            </h3>

            <div className="space-y-3 max-h-[220px] overflow-y-auto pr-1.5">
              {metrics?.renewals.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-10">No se registran membresías por vencer en los próximos días.</p>
              ) : (
                metrics?.renewals.map((customer) => (
                  <div key={customer.id} className="p-3 bg-secondary/25 border border-border/50 rounded-xl flex items-center justify-between gap-3 text-xs">
                    <div className="min-w-0">
                      <h4 className="font-bold text-foreground truncate">{customer.fullName}</h4>
                      <p className="text-[10px] text-muted-foreground font-semibold truncate mt-0.5">{customer.membershipName}</p>
                      <span className="text-[9px] text-rose-400 font-bold">Vence: {new Date(customer.endDate).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', timeZone: 'UTC' })}</span>
                    </div>
                    {customer.phone && (
                      <button
                        onClick={() => sendWhatsAppReminder(customer)}
                        className="p-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 shrink-0 transition-all active:scale-95"
                        title="Enviar recordatorio por WhatsApp"
                      >
                        <MessageSquare className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          <button
            onClick={() => navigate('/clientes')}
            className="w-full mt-4 flex items-center justify-center space-x-1.5 px-4 py-2.5 rounded-xl text-xs font-semibold bg-secondary/40 hover:bg-secondary border border-border text-muted-foreground hover:text-foreground transition-all"
          >
            <span>Ver todos los clientes</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Últimas Transacciones Registradas */}
      <div className="bg-card border border-border/60 rounded-2xl p-6 shadow-sm space-y-4">
        <h3 className="font-bold text-sm uppercase tracking-wider text-muted-foreground flex items-center space-x-2">
          <Activity className="h-4 w-4 text-primary" />
          <span>Últimos Cobros en Caja</span>
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-border/60 bg-secondary/15 text-muted-foreground font-bold uppercase tracking-wider">
                <th className="p-3">Fecha</th>
                <th className="p-3">Cliente</th>
                <th className="p-3">Plan de Membresía</th>
                <th className="p-3 text-right">Monto</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40 text-sm">
              {metrics?.recentPayments.length === 0 ? (
                <tr>
                  <td colSpan={4} className="text-center py-6 text-xs text-muted-foreground">
                    No se registran transacciones consolidadas.
                  </td>
                </tr>
              ) : (
                metrics?.recentPayments.map((rp) => (
                  <tr key={rp.id} className="hover:bg-secondary/5 transition-all text-xs">
                    <td className="p-3 font-semibold text-muted-foreground">
                      {new Date(rp.date).toLocaleDateString('es-ES', { timeZone: 'UTC' })}
                    </td>
                    <td className="p-3 font-bold text-foreground">{rp.customerName}</td>
                    <td className="p-3 font-medium">{rp.membershipName}</td>
                    <td className="p-3 text-right font-black text-emerald-400">
                      {formatMoney(rp.amount, settings)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
