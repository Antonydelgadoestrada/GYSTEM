import React, { useState } from 'react'
import {
  useUsers,
  useCreateUser,
  useUpdateUser,
  useDeleteUser
} from '../hooks/useUsers'
import type { StaffUser } from '../hooks/useUsers'
import { UserForm } from '../components/UserForm'
import { useAuth } from '@/features/auth/context/AuthContext'
import {
  UserPlus,
  Mail,
  Calendar,
  Edit2,
  Trash2,
  AlertTriangle,
  Users,
  CheckCircle,
  Loader2
} from 'lucide-react'

export const UsersPage: React.FC = () => {
  const { user: authUser } = useAuth()
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<StaffUser | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  // Hooks de datos
  const { data: users, isLoading, isError, error } = useUsers()
  const createMutation = useCreateUser()
  const updateMutation = useUpdateUser()
  const deleteMutation = useDeleteUser()

  const handleCreate = async (data: any) => {
    try {
      setErrorMessage(null)
      setSuccessMessage(null)
      await createMutation.mutateAsync(data)
      setSuccessMessage(`Usuario ${data.full_name} registrado exitosamente.`)
      setIsCreateModalOpen(false)
      setTimeout(() => setSuccessMessage(null), 4000)
    } catch (err: any) {
      setErrorMessage(err.message || 'Error al registrar al usuario.')
    }
  }

  const handleUpdate = async (data: any) => {
    if (!editingUser) return
    try {
      setErrorMessage(null)
      setSuccessMessage(null)
      await updateMutation.mutateAsync({ id: editingUser.id, ...data })
      setSuccessMessage(`Usuario ${data.full_name} actualizado correctamente.`)
      setEditingUser(null)
      setTimeout(() => setSuccessMessage(null), 4000)
    } catch (err: any) {
      setErrorMessage(err.message || 'Error al actualizar al usuario.')
    }
  }

  const handleDelete = async (userToDelete: StaffUser) => {
    if (userToDelete.id === authUser?.id) {
      alert('No puedes eliminar tu propio usuario mientras tienes la sesión activa.')
      return
    }

    if (!window.confirm(`¿Estás seguro de que deseas revocar el acceso de ${userToDelete.full_name}? Ya no podrá iniciar sesión.`)) {
      return
    }

    try {
      setErrorMessage(null)
      setSuccessMessage(null)
      await deleteMutation.mutateAsync(userToDelete.id)
      setSuccessMessage(`Acceso de ${userToDelete.full_name} revocado correctamente.`)
      setTimeout(() => setSuccessMessage(null), 4000)
    } catch (err: any) {
      setErrorMessage(err.message || 'Error al eliminar al usuario.')
    }
  }

  const permLabels: Record<string, string> = {
    dashboard: 'Dashboard',
    clientes: 'Clientes',
    membresias: 'Membresías',
    pagos: 'Caja/Ventas',
    gastos: 'Gastos',
    personal: 'Personal',
    reportes: 'Reportes',
    configuracion: 'Ajustes',
  }

  const roleStyles: Record<string, { label: string; class: string; iconClass: string }> = {
    admin: {
      label: 'Administrador',
      class: 'bg-violet-500/10 text-violet-400 border-violet-500/20',
      iconClass: 'text-violet-400 bg-violet-500/10',
    },
    recepcion: {
      label: 'Recepción',
      class: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
      iconClass: 'text-emerald-400 bg-emerald-500/10',
    },
    entrenador: {
      label: 'Entrenador',
      class: 'bg-sky-500/10 text-sky-400 border-sky-500/20',
      iconClass: 'text-sky-400 bg-sky-500/10',
    },
  }

  const userList = users || []

  return (
    <div className="space-y-6">
      {/* Cabecera */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">Gestión de Personal</h1>
          <p className="text-muted-foreground text-sm">
            Administra los roles y el personal de tu gimnasio. Crea cuentas para tu recepcionista, entrenadores y administradores.
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
          <span>Registrar Personal</span>
        </button>
      </div>

      {/* Alertas */}
      {errorMessage && (
        <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm flex items-start space-x-2">
          <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
          <span>{errorMessage}</span>
        </div>
      )}

      {successMessage && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm flex items-start space-x-2">
          <CheckCircle className="h-5 w-5 shrink-0 mt-0.5" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Listado */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 space-y-4">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Cargando personal...</p>
        </div>
      ) : isError ? (
        <div className="text-center py-20 p-6 bg-destructive/5 border border-destructive/10 rounded-2xl">
          <AlertTriangle className="h-10 w-10 text-destructive mx-auto mb-3" />
          <h3 className="text-lg font-semibold">Error al cargar personal</h3>
          <p className="text-sm text-muted-foreground mt-1">{(error as any)?.message}</p>
        </div>
      ) : userList.length === 0 ? (
        <div className="text-center py-20 p-6 bg-card border border-border/60 rounded-2xl">
          <Users className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-60" />
          <h3 className="text-lg font-semibold">No hay personal registrado</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Comienza agregando un nuevo recepcionista o entrenador.
          </p>
        </div>
      ) : (
        <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {userList.map((staff) => {
            const roleInfo = roleStyles[staff.role] || {
              label: staff.role,
              class: 'bg-muted/10 text-muted-foreground border-muted/20',
              iconClass: 'text-muted-foreground bg-muted/10',
            }
            const isSelf = staff.id === authUser?.id

            return (
              <div
                key={staff.id}
                className="bg-card border border-border/60 rounded-2xl p-5 flex flex-col justify-between transition-all hover:shadow-lg"
              >
                <div className="space-y-4">
                  {/* Cabecera tarjeta */}
                  <div className="flex items-center space-x-3">
                    <div className={`h-11 w-11 rounded-xl shrink-0 flex items-center justify-center font-bold text-lg ${roleInfo.iconClass}`}>
                      {staff.full_name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center space-x-1.5">
                        <h3 className="font-bold text-sm truncate leading-tight">
                          {staff.full_name}
                        </h3>
                        {isSelf && (
                          <span className="text-[9px] bg-primary/20 text-primary-foreground border border-primary/30 px-1.5 py-0.5 rounded-full font-semibold">
                            Tú
                          </span>
                        )}
                      </div>
                      <span className={`inline-flex items-center px-2 py-0.5 mt-1 rounded-full text-[9px] font-semibold border ${roleInfo.class}`}>
                        {roleInfo.label}
                      </span>
                    </div>
                  </div>

                  {/* Detalles */}
                  <div className="space-y-2 text-xs text-muted-foreground font-medium border-t border-border/40 pt-3">
                    <div className="flex items-center space-x-2">
                      <Mail className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate">{staff.email}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Calendar className="h-3.5 w-3.5 shrink-0" />
                      <span>Registrado: {new Date(staff.created_at).toLocaleDateString()}</span>
                    </div>

                    {/* Permisos Granulares */}
                    <div className="pt-2.5 border-t border-border/40">
                      <span className="text-[9px] uppercase font-bold text-muted-foreground tracking-wider block mb-1.5">
                        Permisos de Acceso:
                      </span>
                      {staff.permissions && staff.permissions.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {staff.permissions.map((perm) => (
                            <span
                              key={perm}
                              className="text-[8px] px-1.5 py-0.5 rounded bg-secondary border border-border/60 text-foreground font-semibold uppercase"
                            >
                              {permLabels[perm] || perm}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-[9px] text-destructive font-semibold">
                          Sin accesos (Acceso Denegado)
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Acciones */}
                <div className="mt-5 pt-4 border-t border-border/40 flex items-center justify-end space-x-2">
                  <button
                    onClick={() => setEditingUser(staff)}
                    className="flex items-center justify-center p-2 rounded-xl border border-border bg-secondary/20 hover:bg-secondary/40 text-muted-foreground hover:text-foreground transition-all active:scale-95"
                    title="Editar perfil"
                  >
                    <Edit2 className="h-3.5 w-3.5" />
                  </button>

                  <button
                    onClick={() => handleDelete(staff)}
                    disabled={isSelf}
                    className="flex items-center justify-center p-2 rounded-xl border border-transparent hover:border-destructive/20 bg-destructive/10 hover:bg-destructive/15 text-destructive disabled:opacity-40 disabled:hover:bg-destructive/10 disabled:hover:border-transparent transition-all active:scale-95"
                    title={isSelf ? 'No puedes eliminar tu propio usuario' : 'Revocar acceso'}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modales */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-background/80 backdrop-blur-sm" onClick={() => setIsCreateModalOpen(false)}></div>
          <div className="bg-card border border-border/60 rounded-2xl w-full max-w-md p-6 shadow-2xl z-10 animate-in zoom-in-95 duration-150">
            <h2 className="text-xl font-bold tracking-tight mb-4">Registrar Nuevo Personal</h2>
            <UserForm
              onSubmit={handleCreate}
              onCancel={() => setIsCreateModalOpen(false)}
              isSubmitting={createMutation.isPending}
            />
          </div>
        </div>
      )}

      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-background/80 backdrop-blur-sm" onClick={() => setEditingUser(null)}></div>
          <div className="bg-card border border-border/60 rounded-2xl w-full max-w-md p-6 shadow-2xl z-10 animate-in zoom-in-95 duration-150">
            <h2 className="text-xl font-bold tracking-tight mb-4">Editar Datos de Personal</h2>
            <UserForm
              initialData={editingUser}
              onSubmit={handleUpdate}
              onCancel={() => setEditingUser(null)}
              isSubmitting={updateMutation.isPending}
            />
          </div>
        </div>
      )}
    </div>
  )
}
