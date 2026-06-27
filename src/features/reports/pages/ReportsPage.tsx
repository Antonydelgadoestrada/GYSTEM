import React from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/config/supabase'
import { useGymSettings } from '@/features/settings/hooks/useGymSettings'
import { formatMoney } from '@/utils/currency'
import {
  FileText,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Printer,
  ShieldCheck,
  Building,
  Calendar,
  AlertTriangle
} from 'lucide-react'

interface ReportsSummary {
  income: number
  expenses: number
  balance: number
  cashIncome: number
  cardIncome: number
  transferIncome: number
  expensesByCategory: Record<string, number>
}

export const ReportsPage: React.FC = () => {
  const { data: settings } = useGymSettings()

  // Query para cargar estadísticas consolidadas históricas
  const { data: report, isLoading, isError, error } = useQuery<ReportsSummary>({
    queryKey: ['financialReport'],
    queryFn: async () => {
      // 1. Obtener pagos
      const { data: payments, error: pError } = await supabase
        .from('payments')
        .select('amount, payment_method, status')
        .eq('status', 'paid')

      if (pError) throw pError

      // 2. Obtener gastos
      const { data: expenses, error: eError } = await supabase
        .from('expenses')
        .select('amount, category')

      if (eError) throw eError

      // Cálculos consolidadores
      const income = payments?.reduce((sum, p) => sum + Number(p.amount), 0) || 0
      const expSum = expenses?.reduce((sum, e) => sum + Number(e.amount), 0) || 0

      const cashIncome = payments
        ?.filter((p) => {
          const m = p.payment_method.toLowerCase()
          return m.includes('efectivo') || m === 'cash'
        })
        .reduce((sum, p) => sum + Number(p.amount), 0) || 0

      const cardIncome = payments
        ?.filter((p) => {
          const m = p.payment_method.toLowerCase()
          return m.includes('tarjeta') || m === 'card'
        })
        .reduce((sum, p) => sum + Number(p.amount), 0) || 0

      const transferIncome = income - cashIncome - cardIncome

      const expensesByCategory = (expenses || []).reduce((acc: Record<string, number>, e) => {
        acc[e.category] = (acc[e.category] || 0) + Number(e.amount)
        return acc
      }, {})

      return {
        income,
        expenses: expSum,
        balance: income - expSum,
        cashIncome,
        cardIncome,
        transferIncome,
        expensesByCategory,
      }
    },
  })

  const handlePrint = () => {
    window.print()
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-foreground">
        <div className="flex flex-col items-center space-y-4">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
          <p className="text-sm text-muted-foreground animate-pulse">Generando balance contable...</p>
        </div>
      </div>
    )
  }

  if (isError || !report) {
    return (
      <div className="text-center py-20 p-6 bg-card border border-border/60 rounded-2xl max-w-xl mx-auto space-y-4">
        <AlertTriangle className="h-12 w-12 text-destructive mx-auto" />
        <h3 className="text-lg font-semibold">Error al cargar balance contable</h3>
        <p className="text-sm text-muted-foreground">{(error as any)?.message}</p>
      </div>
    )
  }

  const profitMargin = report.income > 0 ? (report.balance / report.income) * 100 : 0

  return (
    <div className="space-y-6">
      {/* Cabecera (Se oculta en impresión) */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border/40 pb-5 print:hidden">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">Reportes y Balance</h1>
          <p className="text-muted-foreground text-sm">
            Audita el rendimiento contable consolidado, los ingresos de caja y los egresos de tu gimnasio.
          </p>
        </div>
        <button
          onClick={handlePrint}
          className="bg-primary hover:bg-primary/95 text-primary-foreground font-semibold px-4 py-2.5 rounded-xl text-sm flex items-center justify-center space-x-2 transition-all active:scale-[0.98] shadow-lg shadow-primary/20 shrink-0 self-start sm:self-auto"
        >
          <Printer className="h-4 w-4" />
          <span>Exportar Reporte (PDF)</span>
        </button>
      </div>

      {/* ==========================================
          LAYOUT DE IMPRESIÓN (PRINT VIEW ONLY)
          ========================================== */}
      <div className="hidden print:block space-y-6 bg-white text-black p-4">
        <div className="flex justify-between items-center border-b-2 border-black pb-4">
          <div>
            <h1 className="text-2xl font-black uppercase">GYMFLOW - Reporte Contable</h1>
            <p className="text-xs text-gray-600 flex items-center space-x-2 mt-1">
              <Calendar className="h-3 w-3 mr-1" />
              <span>Fecha de Emisión: {new Date().toLocaleDateString('es-ES')}</span>
            </p>
          </div>
          <Building className="h-10 w-10 text-gray-800" />
        </div>
        
        <div className="p-4 bg-gray-100 rounded-lg border border-gray-300">
          <h2 className="font-bold text-sm uppercase text-gray-700">Estado de Flujo</h2>
          <div className="grid grid-cols-3 gap-4 mt-3 text-center">
            <div>
              <p className="text-xs text-gray-500 font-semibold uppercase">Total Ingresos</p>
              <h3 className="text-lg font-black text-emerald-600">{formatMoney(report.income, settings)}</h3>
            </div>
            <div>
              <p className="text-xs text-gray-500 font-semibold uppercase">Total Gastos</p>
              <h3 className="text-lg font-black text-rose-600">{formatMoney(report.expenses, settings)}</h3>
            </div>
            <div>
              <p className="text-xs text-gray-500 font-semibold uppercase">Balance Neto</p>
              <h3 className="text-lg font-black text-indigo-600">{formatMoney(report.balance, settings)}</h3>
            </div>
          </div>
        </div>
      </div>

      {/* ==========================================
          VISTA DEL APP (SCREEN VIEW ONLY)
          ========================================== */}
      
      {/* Widgets Financieros Consolidados */}
      <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
        <div className="p-6 bg-card border border-border/60 rounded-2xl shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total Ingresos</span>
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
              <TrendingUp className="h-4 w-4" />
            </div>
          </div>
          <div>
            <h3 className="text-3xl font-extrabold tracking-tight text-emerald-400">{formatMoney(report.income, settings)}</h3>
            <p className="text-[10px] text-muted-foreground mt-1">Facturación total consolidada</p>
          </div>
        </div>

        <div className="p-6 bg-card border border-border/60 rounded-2xl shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total Egresos</span>
            <div className="p-2 rounded-lg bg-rose-500/10 text-rose-400">
              <TrendingDown className="h-4 w-4" />
            </div>
          </div>
          <div>
            <h3 className="text-3xl font-extrabold tracking-tight text-rose-400">{formatMoney(report.expenses, settings)}</h3>
            <p className="text-[10px] text-muted-foreground mt-1">Suma total de gastos operativos</p>
          </div>
        </div>

        <div className="p-6 bg-card border border-border/60 rounded-2xl shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Balance Comercial</span>
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <DollarSign className="h-4 w-4" />
            </div>
          </div>
          <div>
            <h3 className="text-3xl font-extrabold tracking-tight text-primary">{formatMoney(report.balance, settings)}</h3>
            <p className="text-[10px] text-muted-foreground mt-1">Margen neto de utilidad: {profitMargin.toFixed(1)}%</p>
          </div>
        </div>
      </div>

      {/* Grid del desglose de caja e ingresos */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Desglose de Métodos de Pago */}
        <div className="bg-card border border-border/60 rounded-2xl p-6 shadow-sm space-y-4">
          <h3 className="font-bold text-sm uppercase tracking-wider text-muted-foreground flex items-center space-x-2">
            <FileText className="h-4 w-4 text-primary" />
            <span>Detalle de Ingresos (Caja)</span>
          </h3>

          <div className="space-y-3.5 pt-2">
            <div className="flex items-center justify-between p-3.5 bg-secondary/15 rounded-xl border border-border/40">
              <span className="text-sm font-semibold">Caja Física (Efectivo)</span>
              <span className="font-black text-emerald-400">{formatMoney(report.cashIncome, settings)}</span>
            </div>
            <div className="flex items-center justify-between p-3.5 bg-secondary/15 rounded-xl border border-border/40">
              <span className="text-sm font-semibold">Terminal POS (Tarjeta)</span>
              <span className="font-black text-indigo-400">{formatMoney(report.cardIncome, settings)}</span>
            </div>
            <div className="flex items-center justify-between p-3.5 bg-secondary/15 rounded-xl border border-border/40">
              <span className="text-sm font-semibold">Cuentas Bancarias y Digitales</span>
              <span className="font-black text-sky-400">{formatMoney(report.transferIncome, settings)}</span>
            </div>
          </div>
        </div>

        {/* Desglose de Gastos por Categoría */}
        <div className="bg-card border border-border/60 rounded-2xl p-6 shadow-sm space-y-4">
          <h3 className="font-bold text-sm uppercase tracking-wider text-muted-foreground flex items-center space-x-2">
            <TrendingDown className="h-4 w-4 text-rose-400" />
            <span>Desglose de Gastos Operativos</span>
          </h3>

          <div className="space-y-3 max-h-[220px] overflow-y-auto pr-1">
            {Object.entries(report.expensesByCategory).length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-10">No se registran gastos operativos para desglosar.</p>
            ) : (
              Object.entries(report.expensesByCategory).map(([cat, val]) => (
                <div key={cat} className="flex justify-between items-center p-3 bg-secondary/20 rounded-xl border border-border/40 text-xs">
                  <span className="font-bold">{cat}</span>
                  <span className="font-black text-rose-400">{formatMoney(val, settings)}</span>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

      {/* Certificación Auditora del Cierre */}
      <div className="p-4 bg-primary/5 border border-primary/10 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center space-x-3 text-sm font-medium">
          <ShieldCheck className="h-5 w-5 text-primary shrink-0" />
          <span className="text-xs text-muted-foreground leading-relaxed">
            Reporte generado en base a los registros contables consolidados y auditados en el motor inmutable de base de datos.
          </span>
        </div>
      </div>
    </div>
  )
}
