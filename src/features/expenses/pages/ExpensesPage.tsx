import React, { useState } from 'react'
import { useExpenses, useCreateExpense, useDeleteExpense } from '../hooks/useExpenses'
import { ExpenseForm } from '../components/ExpenseForm'
import { useGymSettings } from '@/features/settings/hooks/useGymSettings'
import { formatMoney } from '@/utils/currency'
import {
  TrendingDown,
  Plus,
  AlertTriangle,
  FileSpreadsheet,
  Trash2,
  ExternalLink,
  Tag,
  Search
} from 'lucide-react'

export const ExpensesPage: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const { data: settings } = useGymSettings()

  // Filtros de búsqueda
  const [search, setSearch] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')

  // Queries & Mutations
  const { data: expenses, isLoading, isError, error } = useExpenses()
  const createMutation = useCreateExpense()
  const deleteMutation = useDeleteExpense()

  const handleCreate = async (data: any) => {
    try {
      setErrorMsg(null)
      await createMutation.mutateAsync(data)
      setIsModalOpen(false)
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al registrar el gasto.')
    }
  }

  const handleDelete = async (id: string) => {
    if (!window.confirm('¿Estás seguro de que deseas eliminar este registro de gasto?')) return
    try {
      setErrorMsg(null)
      await deleteMutation.mutateAsync(id)
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al eliminar el gasto.')
    }
  }

  const expenseList = expenses || []

  // Filtrar egresos
  const filteredExpenses = expenseList.filter((e) => {
    const description = e.description?.toLowerCase() || ''
    const category = e.category?.toLowerCase() || ''
    const amountStr = String(e.amount)
    const term = search.toLowerCase()

    const matchesSearch = description.includes(term) || category.includes(term) || amountStr.includes(term)

    let matchesDate = true
    if (startDate) {
      matchesDate = matchesDate && e.expense_date >= startDate
    }
    if (endDate) {
      matchesDate = matchesDate && e.expense_date <= endDate
    }

    let matchesCategory = true
    if (categoryFilter !== 'all') {
      matchesCategory = e.category === categoryFilter
    }

    return matchesSearch && matchesDate && matchesCategory
  })

  // Cálculos Financieros basados en egresos filtrados
  const totalExpenses = filteredExpenses.reduce((sum, e) => sum + Number(e.amount), 0)

  // Agrupado por Categorías basado en egresos filtrados
  const categoriesBreakdown = filteredExpenses.reduce((acc: Record<string, number>, e) => {
    acc[e.category] = (acc[e.category] || 0) + Number(e.amount)
    return acc
  }, {})

  const categoryColors: Record<string, string> = {
    Renta: 'bg-violet-500/10 text-violet-400 border-violet-500/20',
    Servicios: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    Nómina: 'bg-sky-500/10 text-sky-400 border-sky-500/20',
    Mantenimiento: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    Marketing: 'bg-pink-500/10 text-pink-400 border-pink-500/20',
    Otros: 'bg-muted/10 text-muted-foreground border-muted/20',
  }

  return (
    <div className="space-y-6">
      {/* Cabecera */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">Gastos Operativos</h1>
          <p className="text-muted-foreground text-sm">
            Registra y categoriza egresos de caja para consolidar el estado de flujo financiero.
          </p>
        </div>
        <button
          onClick={() => {
            setErrorMsg(null)
            setIsModalOpen(true)
          }}
          className="bg-primary hover:bg-primary/95 text-primary-foreground font-semibold px-4 py-2.5 rounded-xl text-sm flex items-center justify-center space-x-2 transition-all active:scale-[0.98] shadow-lg shadow-primary/20 shrink-0 self-start md:self-auto"
        >
          <Plus className="h-4 w-4" />
          <span>Registrar Gasto</span>
        </button>
      </div>

      {errorMsg && (
        <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm flex items-start space-x-2">
          <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* KPI Principal */}
      <div className="grid gap-4 grid-cols-1 lg:grid-cols-3">
        <div className="lg:col-span-1 p-6 bg-card border border-border/60 rounded-2xl shadow-sm flex items-center space-x-4">
          <div className="p-3 bg-destructive/10 text-destructive rounded-xl">
            <TrendingDown className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Egresos Totales</p>
            <h3 className="text-2xl font-extrabold mt-1 text-destructive">{formatMoney(totalExpenses, settings)}</h3>
          </div>
        </div>

        {/* Resumen por Categoría */}
        <div className="lg:col-span-2 p-6 bg-card border border-border/60 rounded-2xl shadow-sm space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Distribución de Egresos</h3>
          <div className="flex flex-wrap gap-2.5">
            {Object.entries(categoriesBreakdown).length === 0 ? (
              <p className="text-xs text-muted-foreground">No se registran gastos para desglosar.</p>
            ) : (
              Object.entries(categoriesBreakdown).map(([cat, amount]) => (
                <div
                  key={cat}
                  className={`inline-flex items-center space-x-2 px-3 py-1.5 rounded-full text-xs font-semibold border ${
                    categoryColors[cat] || categoryColors.Otros
                  }`}
                >
                  <Tag className="h-3 w-3" />
                  <span>{cat}:</span>
                  <span className="font-extrabold">{formatMoney(amount, settings)}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Buscador y Filtros */}
      <div className="bg-card border border-border/60 p-4 rounded-2xl space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Filtros de Búsqueda</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3.5">
          {/* Descripción / Categoría */}
          <div className="col-span-1 sm:col-span-2 space-y-1">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Buscar</span>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground">
                <Search className="h-4 w-4" />
              </span>
              <input
                type="text"
                className="w-full bg-secondary/30 border border-border/80 rounded-xl py-2 pl-9 pr-4 text-sm focus:outline-none focus:border-primary transition-all placeholder:text-muted-foreground/60"
                placeholder="Buscar por descripción..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          {/* Categoría select */}
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Categoría</span>
            <select
              className="w-full bg-secondary/30 border border-border/80 rounded-xl py-2 px-3 text-sm focus:outline-none focus:border-primary transition-all text-muted-foreground"
              title="Categoría"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
            >
              <option value="all">Todas las Categorías</option>
              <option value="Renta">Alquiler / Renta</option>
              <option value="Servicios">Servicios Básicos</option>
              <option value="Nómina">Nómina / Sueldos</option>
              <option value="Mantenimiento">Mantenimiento / Aseo</option>
              <option value="Marketing">Marketing / Publicidad</option>
              <option value="Otros">Otros Egresos</option>
            </select>
          </div>

          {/* Fecha Inicio */}
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Fecha Desde</span>
            <input
              type="date"
              className="w-full bg-secondary/30 border border-border/80 rounded-xl py-2 px-3 text-sm focus:outline-none focus:border-primary transition-all text-muted-foreground"
              title="Fecha Inicio"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>

          {/* Fecha Fin */}
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Fecha Hasta</span>
            <div className="flex space-x-2">
              <input
                type="date"
                className="w-full bg-secondary/30 border border-border/80 rounded-xl py-2 px-3 text-sm focus:outline-none focus:border-primary transition-all text-muted-foreground"
                title="Fecha Fin"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
              {(search || startDate || endDate || categoryFilter !== 'all') && (
                <button
                  type="button"
                  onClick={() => {
                    setSearch('')
                    setStartDate('')
                    setEndDate('')
                    setCategoryFilter('all')
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
      </div>

      {/* Listado de Gastos */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 space-y-4">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
          <p className="text-sm text-muted-foreground">Cargando libro de egresos...</p>
        </div>
      ) : isError ? (
        <div className="text-center py-20 p-6 bg-destructive/5 border border-destructive/10 rounded-2xl">
          <AlertTriangle className="h-10 w-10 text-destructive mx-auto mb-3" />
          <h3 className="text-lg font-semibold">Error al cargar datos</h3>
          <p className="text-sm text-muted-foreground mt-1">{(error as any)?.message}</p>
        </div>
      ) : expenseList.length === 0 ? (
        <div className="text-center py-20 p-6 bg-card border border-border/60 rounded-2xl">
          <FileSpreadsheet className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-60" />
          <h3 className="text-lg font-semibold">No se registran gastos</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Tu libro de gastos está limpio. Haz clic en "Registrar Gasto" para añadir tu primer egreso.
          </p>
        </div>
      ) : filteredExpenses.length === 0 ? (
        <div className="text-center py-20 p-6 bg-card border border-border/60 rounded-2xl">
          <FileSpreadsheet className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-60" />
          <h3 className="text-lg font-semibold">No se encontraron gastos</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Ningún gasto coincide con los parámetros de búsqueda o filtros seleccionados.
          </p>
        </div>
      ) : (
        <div className="bg-card border border-border/60 rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border/60 bg-secondary/20 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  <th className="p-4">Fecha</th>
                  <th className="p-4">Descripción</th>
                  <th className="p-4">Categoría</th>
                  <th className="p-4">Monto</th>
                  <th className="p-4">Comprobante</th>
                  <th className="p-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40 text-sm">
                {filteredExpenses.map((expense) => {
                  const catClass = categoryColors[expense.category] || categoryColors.Otros
                  return (
                    <tr key={expense.id} className="hover:bg-secondary/10 transition-all">
                      <td className="p-4 font-semibold text-xs text-muted-foreground">
                        {new Date(expense.expense_date).toLocaleDateString('es-ES', { timeZone: 'UTC' })}
                      </td>
                      <td className="p-4 font-bold text-foreground">
                        {expense.description}
                      </td>
                      <td className="p-4">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${catClass}`}>
                          {expense.category}
                        </span>
                      </td>
                      <td className="p-4 font-extrabold text-destructive">
                        {formatMoney(expense.amount, settings)}
                      </td>
                      <td className="p-4">
                        {expense.receipt_url ? (
                          <a
                            href={expense.receipt_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center space-x-1 text-xs text-primary hover:text-primary/95 font-semibold hover:underline"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                            <span>Ver Boleta</span>
                          </a>
                        ) : (
                          <span className="text-xs text-muted-foreground">Sin boleta</span>
                        )}
                      </td>
                      <td className="p-4 text-right">
                        <button
                          onClick={() => handleDelete(expense.id)}
                          className="inline-flex items-center justify-center p-2 rounded-xl border border-transparent hover:border-destructive/20 bg-destructive/10 hover:bg-destructive/15 text-destructive cursor-pointer transition-all"
                          title="Eliminar registro"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal de Registro de Gasto */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-background/80 backdrop-blur-sm" onClick={() => setIsModalOpen(false)}></div>
          <div className="bg-card border border-border/60 rounded-2xl w-full max-w-lg p-6 shadow-2xl z-10 animate-in zoom-in-95 duration-150">
            <h2 className="text-xl font-bold tracking-tight mb-4">Registrar Gasto Operativo</h2>
            <ExpenseForm
              onSubmit={handleCreate}
              onCancel={() => setIsModalOpen(false)}
              isSubmitting={createMutation.isPending}
            />
          </div>
        </div>
      )}
    </div>
  )
}
