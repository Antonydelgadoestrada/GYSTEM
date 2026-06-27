import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  useCustomers,
  useCreateCustomer,
  useUpdateCustomer,
  useDeleteCustomer
} from '../hooks/useCustomers'
import type { Customer } from '../hooks/useCustomers'
import { CustomerForm } from '../components/CustomerForm'
import {
  UserPlus,
  Search,
  User,
  Phone,
  Mail,
  Key,
  Edit2,
  Trash2,
  ExternalLink,
  AlertTriangle,
  Users,
  Crown
} from 'lucide-react'

export const CustomersPage: React.FC = () => {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all')
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const navigate = useNavigate()

  // Queries y Mutaciones
  const { data: customers, isLoading, isError, error } = useCustomers(search, statusFilter)
  const createMutation = useCreateCustomer()
  const updateMutation = useUpdateCustomer()
  const deleteMutation = useDeleteCustomer()

  const handleCreate = async (data: any) => {
    try {
      setErrorMessage(null)
      await createMutation.mutateAsync(data)
      setIsCreateModalOpen(false)
    } catch (err: any) {
      setErrorMessage(err.message || 'Error al registrar el cliente.')
    }
  }

  const handleUpdate = async (data: any) => {
    if (!editingCustomer) return
    try {
      setErrorMessage(null)
      await updateMutation.mutateAsync({ id: editingCustomer.id, ...data })
      setEditingCustomer(null)
    } catch (err: any) {
      setErrorMessage(err.message || 'Error al actualizar el cliente.')
    }
  }

  const handleDelete = async (id: string) => {
    if (!window.confirm('¿Estás seguro de que deseas eliminar a este cliente? Se borrará todo su historial financiero.')) return
    try {
      setErrorMessage(null)
      await deleteMutation.mutateAsync(id)
    } catch (err: any) {
      setErrorMessage(err.message || 'Error al eliminar el cliente.')
    }
  }

  const customerList = customers || []

  // Métricas
  const totalCount = customerList.length
  const activeCount = customerList.filter((c) => c.status === 'active').length
  const inactiveCount = totalCount - activeCount

  return (
    <div className="space-y-6">
      {/* Cabecera */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">Administración de Clientes</h1>
          <p className="text-muted-foreground text-sm">
            Registra nuevos miembros, consulta su estatus y revisa sus historiales financieros de pago.
          </p>
        </div>
        <button
          onClick={() => {
            setErrorMessage(null)
            setIsCreateModalOpen(true)
          }}
          className="bg-primary hover:bg-primary/95 text-primary-foreground font-semibold px-4 py-2.5 rounded-xl text-sm flex items-center justify-center space-x-2 transition-all active:scale-[0.98] shadow-lg shadow-primary/20 shrink-0 self-start md:self-auto"
        >
          <UserPlus className="h-4 w-4" />
          <span>Registrar Cliente</span>
        </button>
      </div>

      {/* Alerta de Error */}
      {errorMessage && (
        <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm flex items-start space-x-2">
          <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* KPI Stats widgets */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
        <div className="p-6 bg-card border border-border/60 rounded-2xl shadow-sm flex items-center space-x-4">
          <div className="p-3 bg-primary/10 text-primary rounded-xl">
            <Users className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total de Clientes</p>
            <h3 className="text-2xl font-bold mt-1">{totalCount}</h3>
          </div>
        </div>
        <div className="p-6 bg-card border border-border/60 rounded-2xl shadow-sm flex items-center space-x-4">
          <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-xl">
            <User className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Clientes Activos</p>
            <h3 className="text-2xl font-bold mt-1 text-emerald-400">{activeCount}</h3>
          </div>
        </div>
        <div className="p-6 bg-card border border-border/60 rounded-2xl shadow-sm flex items-center space-x-4">
          <div className="p-3 bg-secondary/80 text-muted-foreground rounded-xl">
            <User className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Clientes Inactivos</p>
            <h3 className="text-2xl font-bold mt-1">{inactiveCount}</h3>
          </div>
        </div>
      </div>

      {/* Buscador y pestañas de filtrado */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-card border border-border/60 p-4 rounded-2xl">
        <div className="relative w-full sm:max-w-xs">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground">
            <Search className="h-4 w-4" />
          </span>
          <input
            type="text"
            className="w-full bg-secondary/30 border border-border/80 rounded-xl py-2 pl-9 pr-4 text-sm focus:outline-none focus:border-primary transition-all placeholder:text-muted-foreground/60"
            placeholder="Buscar por nombre, correo, PIN..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Status Filter Tabs */}
        <div className="flex space-x-1 bg-secondary/40 p-1 rounded-xl border border-border/50">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              statusFilter === 'all' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Todos
          </button>
          <button
            onClick={() => setStatusFilter('active')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              statusFilter === 'active' ? 'bg-background text-emerald-400 shadow-sm' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Activos
          </button>
          <button
            onClick={() => setStatusFilter('inactive')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              statusFilter === 'inactive' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Inactivos
          </button>
        </div>
      </div>

      {/* Listado de Clientes */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 space-y-4">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
          <p className="text-sm text-muted-foreground">Cargando clientes...</p>
        </div>
      ) : isError ? (
        <div className="text-center py-20 p-6 bg-destructive/5 border border-destructive/10 rounded-2xl">
          <AlertTriangle className="h-10 w-10 text-destructive mx-auto mb-3" />
          <h3 className="text-lg font-semibold">Error al cargar datos</h3>
          <p className="text-sm text-muted-foreground mt-1">{(error as any)?.message}</p>
        </div>
      ) : customerList.length === 0 ? (
        <div className="text-center py-20 p-6 bg-card border border-border/60 rounded-2xl">
          <Users className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-60" />
          <h3 className="text-lg font-semibold">No se encontraron clientes</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Prueba a buscar con otra palabra clave o agrega un nuevo cliente.
          </p>
        </div>
      ) : (
        <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {customerList.map((customer) => {
            const hasActiveMembership = customer.customer_memberships?.some(
              (cm) => cm.status === 'active'
            )
            return (
              <div
                key={customer.id}
                className={`bg-card border rounded-2xl p-5 flex flex-col justify-between transition-all hover:shadow-lg ${
                  customer.status === 'active' ? 'border-border/60' : 'border-destructive/10 bg-secondary/5 opacity-75'
                }`}
              >
                <div className="space-y-4">
                  {/* Avatar y Estado */}
                  <div className="flex items-center space-x-3">
                    <div className="h-12 w-12 rounded-full border border-border bg-secondary/40 overflow-hidden shrink-0 flex items-center justify-center text-muted-foreground">
                      {customer.photo_url ? (
                        <img src={customer.photo_url} alt={customer.full_name} className="h-full w-full object-cover" />
                      ) : (
                        <User className="h-5 w-5" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center space-x-1.5 min-w-0">
                        <h3
                          className={`font-bold text-sm truncate leading-tight transition-all cursor-pointer ${
                            hasActiveMembership
                              ? 'text-amber-400 hover:text-amber-300 drop-shadow-[0_0_8px_rgba(245,158,11,0.25)]'
                              : 'text-foreground hover:text-primary'
                          }`}
                          onClick={() => navigate(`/clientes/${customer.id}`)}
                        >
                          {customer.full_name}
                        </h3>
                        {hasActiveMembership && (
                          <Crown className="h-3.5 w-3.5 text-amber-400 shrink-0 fill-amber-400/20" title="Membresía Activa" />
                        )}
                      </div>
                      <span
                        className={`inline-flex items-center px-2 py-0.5 mt-1 rounded-full text-[9px] font-semibold border ${
                          customer.status === 'active'
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                            : 'bg-muted/10 text-muted-foreground border-muted/20'
                        }`}
                      >
                        {customer.status === 'active' ? 'Activo' : 'Inactivo'}
                      </span>
                    </div>
                  </div>

                {/* Detalles de contacto */}
                <div className="space-y-1.5 text-xs text-muted-foreground font-medium">
                  {customer.phone && (
                    <div className="flex items-center space-x-2">
                      <Phone className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate">{customer.phone}</span>
                    </div>
                  )}
                  {customer.email && (
                    <div className="flex items-center space-x-2">
                      <Mail className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate">{customer.email}</span>
                    </div>
                  )}
                  {customer.access_code && (
                    <div className="flex items-center space-x-2 text-violet-400">
                      <Key className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate font-semibold bg-violet-500/10 px-1.5 py-0.5 rounded border border-violet-500/20">PIN: {customer.access_code}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Botones de acción */}
              <div className="mt-5 pt-4 border-t border-border/40 flex items-center justify-between gap-2">
                <button
                  onClick={() => navigate(`/clientes/${customer.id}`)}
                  className="flex-1 flex items-center justify-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-semibold border border-border bg-secondary/10 hover:bg-secondary/30 text-muted-foreground hover:text-foreground transition-all"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  <span>Ver Ficha</span>
                </button>

                <button
                  onClick={() => setEditingCustomer(customer)}
                  className="flex items-center justify-center p-2 rounded-xl border border-border bg-secondary/20 hover:bg-secondary/40 text-muted-foreground hover:text-foreground transition-all"
                  title="Editar perfil"
                >
                  <Edit2 className="h-3.5 w-3.5" />
                </button>

                <button
                  onClick={() => handleDelete(customer.id)}
                  className="flex items-center justify-center p-2 rounded-xl border border-transparent hover:border-destructive/20 bg-destructive/10 hover:bg-destructive/15 text-destructive transition-all"
                  title="Eliminar perfil"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          )
          })}
        </div>
      )}

      {/* ==========================================
          5. MODALES DE AGREGAR / EDITAR CLIENTE
          ========================================== */}

      {/* Modal de Crear */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-background/80 backdrop-blur-sm" onClick={() => setIsCreateModalOpen(false)}></div>
          <div className="bg-card border border-border/60 rounded-2xl w-full max-w-xl p-6 shadow-2xl z-10 animate-in zoom-in-95 duration-150">
            <h2 className="text-xl font-bold tracking-tight mb-4">Registrar Nuevo Cliente</h2>
            <CustomerForm
              onSubmit={handleCreate}
              onCancel={() => setIsCreateModalOpen(false)}
              isSubmitting={createMutation.isPending}
            />
          </div>
        </div>
      )}

      {/* Modal de Editar */}
      {editingCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-background/80 backdrop-blur-sm" onClick={() => setEditingCustomer(null)}></div>
          <div className="bg-card border border-border/60 rounded-2xl w-full max-w-xl p-6 shadow-2xl z-10 animate-in zoom-in-95 duration-150">
            <h2 className="text-xl font-bold tracking-tight mb-4">Editar Perfil del Cliente</h2>
            <CustomerForm
              initialData={editingCustomer}
              onSubmit={handleUpdate}
              onCancel={() => setEditingCustomer(null)}
              isSubmitting={updateMutation.isPending}
            />
          </div>
        </div>
      )}
    </div>
  )
}
