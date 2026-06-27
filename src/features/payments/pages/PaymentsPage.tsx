import React, { useState } from 'react'
import { usePayments, useCancelPayment } from '../hooks/usePayments'
import { useAuth } from '@/features/auth/context/AuthContext'
import { AssignMembershipModal } from '../components/AssignMembershipModal'
import { useGymSettings } from '@/features/settings/hooks/useGymSettings'
import { formatMoney } from '@/utils/currency'
import {
  DollarSign,
  Plus,
  Search,
  AlertTriangle,
  FileSpreadsheet,
  XCircle,
  CreditCard,
  Wallet,
  TrendingUp,
  FileCheck
} from 'lucide-react'

export const PaymentsPage: React.FC = () => {
  const { role } = useAuth()
  const { data: settings } = useGymSettings()
  
  // Filtros de búsqueda
  const [search, setSearch] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  // Query y Mutation
  const { data: payments, isLoading, isError, error } = usePayments()
  const cancelMutation = useCancelPayment()

  const handleCancelPayment = async (paymentId: string) => {
    if (role !== 'admin') {
      alert('Acceso Denegado: Solo el Administrador (Dueño) del gimnasio puede anular transacciones.')
      return
    }

    if (!window.confirm('¿Estás seguro de que deseas ANULAR este pago? Esta acción registrará una auditoría inmutable en la bitácora y afectará el balance diario.')) return

    try {
      setErrorMsg(null)
      await cancelMutation.mutateAsync(paymentId)
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al intentar anular la transacción.')
    }
  }

  // Filtrar cobros
  const filteredPayments = payments?.filter((p) => {
    const customerName = p.customer_memberships?.customers?.full_name?.toLowerCase() || ''
    const planName = p.customer_memberships?.memberships?.name?.toLowerCase() || ''
    const paymentMethodName = p.payment_method?.toLowerCase() || ''
    const term = search.toLowerCase()
    
    const matchesSearch = customerName.includes(term) || planName.includes(term) || paymentMethodName.includes(term)
    
    let matchesDate = true
    if (startDate) {
      matchesDate = matchesDate && p.payment_date >= startDate
    }
    if (endDate) {
      matchesDate = matchesDate && p.payment_date <= endDate
    }
    
    return matchesSearch && matchesDate
  }) || []

  // Cálculos Financieros basados en cobros FILTRADOS (excluyendo transacciones anuladas)
  const activePayments = filteredPayments.filter((p) => p.status === 'paid')
  
  const totalRevenue = activePayments.reduce((sum, p) => sum + Number(p.amount), 0)
  
  const cashTotal = activePayments
    .filter((p) => p.payment_method.toLowerCase().includes('efectivo') || p.payment_method === 'cash')
    .reduce((sum, p) => sum + Number(p.amount), 0)

  const cardTotal = activePayments
    .filter((p) => p.payment_method.toLowerCase().includes('tarjeta') || p.payment_method === 'card')
    .reduce((sum, p) => sum + Number(p.amount), 0)

  const digitalAndOtherTotal = activePayments
    .filter((p) => {
      const m = p.payment_method.toLowerCase()
      return !m.includes('efectivo') && m !== 'cash' && !m.includes('tarjeta') && m !== 'card'
    })
    .reduce((sum, p) => sum + Number(p.amount), 0)

  const translatePaymentMethod = (method: string) => {
    const m = method.toLowerCase()
    if (m.includes('efectivo') || m === 'cash') {
      return { label: method, icon: Wallet, bg: 'bg-emerald-500/10 text-emerald-400' }
    }
    if (m.includes('tarjeta') || m === 'card') {
      return { label: method, icon: CreditCard, bg: 'bg-indigo-500/10 text-indigo-400' }
    }
    if (m.includes('yape') || m.includes('plin')) {
      return { label: method, icon: DollarSign, bg: 'bg-purple-500/10 text-purple-400' }
    }
    if (m.includes('transferencia') || m === 'transfer') {
      return { label: method, icon: FileCheck, bg: 'bg-sky-500/10 text-sky-400' }
    }
    return { label: method, icon: DollarSign, bg: 'bg-muted/10 text-muted-foreground' }
  }

  return (
    <div className="space-y-6">
      {/* Cabecera */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">Caja e Ingresos</h1>
          <p className="text-muted-foreground text-sm">
            Controla el flujo de caja diario, registra ventas de membresías y gestiona cobros.
          </p>
        </div>
        <button
          onClick={() => {
            setErrorMsg(null)
            setIsAssignModalOpen(true)
          }}
          className="bg-primary hover:bg-primary/95 text-primary-foreground font-semibold px-4 py-2.5 rounded-xl text-sm flex items-center justify-center space-x-2 transition-all active:scale-[0.98] shadow-lg shadow-primary/20 shrink-0 self-start md:self-auto"
        >
          <Plus className="h-4 w-4" />
          <span>Registrar Venta (Cobro)</span>
        </button>
      </div>

      {/* Alerta de Error */}
      {errorMsg && (
        <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm flex items-start space-x-2">
          <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* KPI Cards de Caja */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <div className="p-5 bg-card border border-border/60 rounded-2xl shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Caja General</span>
            <TrendingUp className="h-4 w-4 text-primary" />
          </div>
          <h3 className="text-2xl font-extrabold tracking-tight">{formatMoney(totalRevenue, settings)}</h3>
          <p className="text-[10px] text-muted-foreground">Suma de cobros del período filtrado</p>
        </div>

        <div className="p-5 bg-card border border-border/60 rounded-2xl shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Efectivo</span>
            <Wallet className="h-4 w-4 text-emerald-400" />
          </div>
          <h3 className="text-2xl font-extrabold tracking-tight text-emerald-400">{formatMoney(cashTotal, settings)}</h3>
          <p className="text-[10px] text-muted-foreground">Recaudado en efectivo físico</p>
        </div>

        <div className="p-5 bg-card border border-border/60 rounded-2xl shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Tarjeta</span>
            <CreditCard className="h-4 w-4 text-indigo-400" />
          </div>
          <h3 className="text-2xl font-extrabold tracking-tight text-indigo-400">{formatMoney(cardTotal, settings)}</h3>
          <p className="text-[10px] text-muted-foreground">Procesado vía terminal POS</p>
        </div>

        <div className="p-5 bg-card border border-border/60 rounded-2xl shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Otros / Digitales</span>
            <FileCheck className="h-4 w-4 text-sky-400" />
          </div>
          <h3 className="text-2xl font-extrabold tracking-tight text-sky-400">{formatMoney(digitalAndOtherTotal, settings)}</h3>
          <p className="text-[10px] text-muted-foreground">Yape, Plin, Transferencias y Mixto</p>
        </div>
      </div>

      {/* Buscador y Filtros */}
      <div className="bg-card border border-border/60 p-4 rounded-2xl space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Filtros de Búsqueda</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          {/* Nombre / Plan */}
          <div className="relative col-span-1 md:col-span-2">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground">
              <Search className="h-4 w-4" />
            </span>
            <input
              type="text"
              className="w-full bg-secondary/30 border border-border/80 rounded-xl py-2 pl-9 pr-4 text-sm focus:outline-none focus:border-primary transition-all placeholder:text-muted-foreground/60"
              placeholder="Buscar por atleta, plan o método de pago..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {/* Fecha Inicio */}
          <div className="relative">
            <input
              type="date"
              className="w-full bg-secondary/30 border border-border/80 rounded-xl py-2 px-3 text-sm focus:outline-none focus:border-primary transition-all text-muted-foreground"
              title="Fecha Inicio"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>

          {/* Fecha Fin */}
          <div className="relative flex space-x-2">
            <input
              type="date"
              className="w-full bg-secondary/30 border border-border/80 rounded-xl py-2 px-3 text-sm focus:outline-none focus:border-primary transition-all text-muted-foreground"
              title="Fecha Fin"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
            {(search || startDate || endDate) && (
              <button
                type="button"
                onClick={() => {
                  setSearch('')
                  setStartDate('')
                  setEndDate('')
                }}
                className="px-2 bg-secondary/50 hover:bg-secondary/80 border border-border rounded-xl text-muted-foreground hover:text-foreground transition-all text-xs font-semibold shrink-0"
                title="Limpiar Filtros"
              >
                Limpiar
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Tabla de cobros */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 space-y-4">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
          <p className="text-sm text-muted-foreground">Cargando libro de caja...</p>
        </div>
      ) : isError ? (
        <div className="text-center py-20 p-6 bg-destructive/5 border border-destructive/10 rounded-2xl">
          <AlertTriangle className="h-10 w-10 text-destructive mx-auto mb-3" />
          <h3 className="text-lg font-semibold">Error al cargar datos</h3>
          <p className="text-sm text-muted-foreground mt-1">{(error as any)?.message}</p>
        </div>
      ) : filteredPayments.length === 0 ? (
        <div className="text-center py-20 p-6 bg-card border border-border/60 rounded-2xl">
          <FileSpreadsheet className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-60" />
          <h3 className="text-lg font-semibold">No se registran cobros</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Ningún cobro coincide con los parámetros de búsqueda o rango de fechas.
          </p>
        </div>
      ) : (
        <div className="bg-card border border-border/60 rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border/60 bg-secondary/20 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  <th className="p-4">Fecha</th>
                  <th className="p-4">Cliente</th>
                  <th className="p-4">Membresía / Plan</th>
                  <th className="p-4">Medio de Pago</th>
                  <th className="p-4">Monto</th>
                  <th className="p-4">Estatus</th>
                  <th className="p-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40 text-sm">
                {filteredPayments.map((payment) => {
                  const method = translatePaymentMethod(payment.payment_method)
                  const MethodIcon = method.icon
                  const client = payment.customer_memberships?.customers
                  const plan = payment.customer_memberships?.memberships

                  return (
                    <tr
                      key={payment.id}
                      className={`hover:bg-secondary/10 transition-all ${
                        payment.status === 'cancelled' ? 'opacity-55 line-through bg-destructive/5' : ''
                      }`}
                    >
                      <td className="p-4 font-semibold text-xs text-muted-foreground">
                        {new Date(payment.payment_date).toLocaleDateString('es-ES', { timeZone: 'UTC' })}
                      </td>
                      <td className="p-4 font-bold text-foreground">
                        {client?.full_name || 'Desconocido'}
                      </td>
                      <td className="p-4 font-semibold">
                        {plan?.name || 'Membresía Eliminada'}
                      </td>
                      <td className="p-4">
                        <div className="flex flex-col">
                          <span className={`inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-semibold self-start ${method.bg}`}>
                            <MethodIcon className="h-3.5 w-3.5" />
                            <span>{method.label}</span>
                          </span>
                          {payment.notes && (
                            <span className="text-[11px] text-muted-foreground mt-1 italic font-normal max-w-xs break-words">
                              Nota: {payment.notes}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="p-4 font-extrabold text-foreground">
                        {formatMoney(payment.amount, settings)}
                      </td>
                      <td className="p-4">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                            payment.status === 'paid'
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                              : 'bg-destructive/10 text-destructive border-destructive/20'
                          }`}
                        >
                          {payment.status === 'paid' ? 'Cobrado' : 'Anulado'}
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        {payment.status === 'paid' && (
                          <button
                            onClick={() => handleCancelPayment(payment.id)}
                            disabled={role !== 'admin'}
                            className={`inline-flex items-center justify-center p-2 rounded-xl border transition-all ${
                              role === 'admin'
                                ? 'border-transparent hover:border-destructive/20 bg-destructive/10 hover:bg-destructive/15 text-destructive cursor-pointer'
                                : 'border-border bg-secondary/20 text-muted-foreground opacity-50 cursor-not-allowed'
                            }`}
                            title={role === 'admin' ? 'Anular pago' : 'Solo administradores pueden anular'}
                          >
                            <XCircle className="h-4 w-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal de Registro de Venta */}
      {isAssignModalOpen && (
        <AssignMembershipModal onClose={() => setIsAssignModalOpen(false)} />
      )}
    </div>
  )
}
