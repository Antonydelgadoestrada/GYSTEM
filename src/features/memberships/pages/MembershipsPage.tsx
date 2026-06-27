import React, { useState } from 'react'
import {
  useMemberships,
  useCreateMembership,
  useUpdateMembership,
  useToggleMembershipStatus,
  useDeleteMembership,
  type Membership
} from '../hooks/useMemberships'
import { MembershipForm } from '../components/MembershipForm'
import { useGymSettings } from '@/features/settings/hooks/useGymSettings'
import { formatMoney } from '@/utils/currency'
import {
  Award,
  Plus,
  Search,
  CheckCircle2,
  XCircle,
  Edit2,
  Trash2,
  Eye,
  EyeOff,
  TrendingUp,
  Clock,
  AlertTriangle
} from 'lucide-react'

export const MembershipsPage: React.FC = () => {
  const [search, setSearch] = useState('')
  const [showInactive, setShowInactive] = useState(true)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [editingMembership, setEditingMembership] = useState<Membership | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const { data: settings } = useGymSettings()

  // Hooks de TanStack Query
  const { data: memberships, isLoading, isError, error } = useMemberships(showInactive)
  const createMutation = useCreateMembership()
  const updateMutation = useUpdateMembership()
  const toggleMutation = useToggleMembershipStatus()
  const deleteMutation = useDeleteMembership()

  const handleCreate = async (data: any) => {
    try {
      setErrorMessage(null)
      await createMutation.mutateAsync(data)
      setIsCreateModalOpen(false)
    } catch (err: any) {
      setErrorMessage(err.message || 'Error al crear la membresía.')
    }
  }

  const handleUpdate = async (data: any) => {
    if (!editingMembership) return
    try {
      setErrorMessage(null)
      await updateMutation.mutateAsync({ id: editingMembership.id, ...data })
      setEditingMembership(null)
    } catch (err: any) {
      setErrorMessage(err.message || 'Error al actualizar la membresía.')
    }
  }

  const handleToggleStatus = async (membership: Membership) => {
    try {
      setErrorMessage(null)
      await toggleMutation.mutateAsync({ id: membership.id, is_active: !membership.is_active })
    } catch (err: any) {
      setErrorMessage(err.message || 'Error al cambiar el estado de la membresía.')
    }
  }

  const handleDelete = async (id: string) => {
    if (!window.confirm('¿Estás seguro de que deseas eliminar permanentemente esta membresía?')) return
    try {
      setErrorMessage(null)
      await deleteMutation.mutateAsync(id)
    } catch (err: any) {
      setErrorMessage(err.message || 'Error al eliminar la membresía.')
    }
  }

  // Filtrar membresías por búsqueda local
  const filteredMemberships = memberships?.filter((membership) =>
    membership.name.toLowerCase().includes(search.toLowerCase())
  ) || []

  // Calcular métricas
  const totalPlans = memberships?.length || 0
  const activePlans = memberships?.filter((m) => m.is_active).length || 0
  const inactivePlans = totalPlans - activePlans

  return (
    <div className="space-y-6">
      {/* Cabecera */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">Catálogo de Membresías</h1>
          <p className="text-muted-foreground text-sm">
            Administra los planes de entrenamiento, precios y plazos de duración de tu gimnasio.
          </p>
        </div>
        <button
          onClick={() => {
            setErrorMessage(null)
            setIsCreateModalOpen(true)
          }}
          className="bg-primary hover:bg-primary/95 text-primary-foreground font-semibold px-4 py-2.5 rounded-xl text-sm flex items-center justify-center space-x-2 transition-all active:scale-[0.98] shadow-lg shadow-primary/20 shrink-0 self-start md:self-auto"
        >
          <Plus className="h-4 w-4" />
          <span>Crear Membresía</span>
        </button>
      </div>

      {/* Alerta de Error Global */}
      {errorMessage && (
        <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm flex items-start space-x-2">
          <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* KPI Stats Widgets */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
        <div className="p-6 bg-card border border-border/60 rounded-2xl shadow-sm flex items-center space-x-4">
          <div className="p-3 bg-primary/10 text-primary rounded-xl">
            <Award className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total de Planes</p>
            <h3 className="text-2xl font-bold mt-1">{totalPlans}</h3>
          </div>
        </div>
        <div className="p-6 bg-card border border-border/60 rounded-2xl shadow-sm flex items-center space-x-4">
          <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-xl">
            <TrendingUp className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Planes Activos</p>
            <h3 className="text-2xl font-bold mt-1 text-emerald-400">{activePlans}</h3>
          </div>
        </div>
        <div className="p-6 bg-card border border-border/60 rounded-2xl shadow-sm flex items-center space-x-4">
          <div className="p-3 bg-secondary/80 text-muted-foreground rounded-xl">
            <EyeOff className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Planes Inactivos</p>
            <h3 className="text-2xl font-bold mt-1">{inactivePlans}</h3>
          </div>
        </div>
      </div>

      {/* Controles de Búsqueda y Filtro */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-card border border-border/60 p-4 rounded-2xl">
        <div className="relative w-full sm:max-w-xs">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground">
            <Search className="h-4 w-4" />
          </span>
          <input
            type="text"
            className="w-full bg-secondary/30 border border-border/80 rounded-xl py-2 pl-9 pr-4 text-sm focus:outline-none focus:border-primary transition-all placeholder:text-muted-foreground/60"
            placeholder="Buscar membresía..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="flex items-center space-x-3 self-end sm:self-auto">
          <button
            onClick={() => setShowInactive(!showInactive)}
            className={`flex items-center space-x-2 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all ${
              showInactive
                ? 'bg-primary/10 border-primary/20 text-primary'
                : 'bg-secondary/40 border-border text-muted-foreground'
            }`}
          >
            {showInactive ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
            <span>Mostrar Inactivos</span>
          </button>
        </div>
      </div>

      {/* Listado de Membresías */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 space-y-4">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
          <p className="text-sm text-muted-foreground">Cargando membresías...</p>
        </div>
      ) : isError ? (
        <div className="text-center py-20 p-6 bg-destructive/5 border border-destructive/10 rounded-2xl">
          <AlertTriangle className="h-10 w-10 text-destructive mx-auto mb-3" />
          <h3 className="text-lg font-semibold">Error al cargar datos</h3>
          <p className="text-sm text-muted-foreground mt-1">{(error as any)?.message}</p>
        </div>
      ) : filteredMemberships.length === 0 ? (
        <div className="text-center py-20 p-6 bg-card border border-border/60 rounded-2xl">
          <Award className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-60" />
          <h3 className="text-lg font-semibold">No se encontraron membresías</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Intenta cambiar los filtros de búsqueda o crea una membresía nueva.
          </p>
        </div>
      ) : (
        <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {filteredMemberships.map((membership) => (
            <div
              key={membership.id}
              className={`bg-card border rounded-2xl p-6 flex flex-col justify-between transition-all hover:shadow-lg ${
                membership.is_active
                  ? 'border-border/60'
                  : 'border-destructive/10 bg-secondary/10 opacity-70'
              }`}
            >
              <div className="space-y-4">
                {/* Header Card */}
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <h3 className="font-bold text-lg leading-tight tracking-tight">{membership.name}</h3>
                    <div className="flex items-center space-x-1.5 text-xs text-muted-foreground font-semibold">
                      <Clock className="h-3.5 w-3.5" />
                      <span>{membership.duration_days} días</span>
                    </div>
                  </div>
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                      membership.is_active
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                        : 'bg-destructive/10 text-destructive border-destructive/20'
                    }`}
                  >
                    {membership.is_active ? 'Activo' : 'Inactivo'}
                  </span>
                </div>

                {/* Price Display */}
                <div className="py-2">
                  <span className="text-3xl font-extrabold tracking-tight">{formatMoney(membership.price, settings)}</span>
                  <span className="text-xs text-muted-foreground font-medium ml-1">
                    {settings?.currency === 'USD' ? 'USD' : 'PEN'}
                  </span>
                </div>
              </div>

              {/* Card Actions */}
              <div className="mt-6 pt-4 border-t border-border/40 flex items-center justify-between gap-2">
                <button
                  onClick={() => handleToggleStatus(membership)}
                  className={`flex-1 flex items-center justify-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-all ${
                    membership.is_active
                      ? 'bg-secondary/40 border-border text-muted-foreground hover:text-foreground'
                      : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/15'
                  }`}
                  title={membership.is_active ? 'Desactivar plan' : 'Activar plan'}
                >
                  {membership.is_active ? (
                    <>
                      <XCircle className="h-3.5 w-3.5" />
                      <span>Desactivar</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      <span>Activar</span>
                    </>
                  )}
                </button>

                <button
                  onClick={() => setEditingMembership(membership)}
                  className="flex items-center justify-center p-2 rounded-xl border border-border bg-secondary/20 hover:bg-secondary/40 text-muted-foreground hover:text-foreground transition-all"
                  title="Editar plan"
                >
                  <Edit2 className="h-3.5 w-3.5" />
                </button>

                <button
                  onClick={() => handleDelete(membership.id)}
                  className="flex items-center justify-center p-2 rounded-xl border border-transparent hover:border-destructive/20 bg-destructive/10 hover:bg-destructive/15 text-destructive transition-all"
                  title="Eliminar plan"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ==========================================
          5. MODALES (DIALOGS DE CREAR / EDITAR)
          ========================================== */}

      {/* Modal de Crear */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-background/80 backdrop-blur-sm" onClick={() => setIsCreateModalOpen(false)}></div>
          <div className="bg-card border border-border/60 rounded-2xl w-full max-w-lg p-6 shadow-2xl z-10 animate-in zoom-in-95 duration-150">
            <h2 className="text-xl font-bold tracking-tight mb-4">Nueva Membresía</h2>
            <MembershipForm
              onSubmit={handleCreate}
              onCancel={() => setIsCreateModalOpen(false)}
              isSubmitting={createMutation.isPending}
            />
          </div>
        </div>
      )}

      {/* Modal de Editar */}
      {editingMembership && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-background/80 backdrop-blur-sm" onClick={() => setEditingMembership(null)}></div>
          <div className="bg-card border border-border/60 rounded-2xl w-full max-w-lg p-6 shadow-2xl z-10 animate-in zoom-in-95 duration-150">
            <h2 className="text-xl font-bold tracking-tight mb-4">Editar Membresía</h2>
            <MembershipForm
              initialData={editingMembership}
              onSubmit={handleUpdate}
              onCancel={() => setEditingMembership(null)}
              isSubmitting={updateMutation.isPending}
            />
          </div>
        </div>
      )}
    </div>
  )
}
