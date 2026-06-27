import React, { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import type { StaffUser } from '../hooks/useUsers'
import { User, Mail, Lock, Shield, Save, X, Loader2 } from 'lucide-react'

const AVAILABLE_PERMISSIONS = [
  { id: 'dashboard', label: 'Dashboard', desc: 'Panel de control principal e ingresos mensuales' },
  { id: 'clientes', label: 'Clientes', desc: 'Manejo de atletas, bitácora y fichas individuales' },
  { id: 'membresias', label: 'Membresías', desc: 'Crear, editar y dar de baja planes y tarifas' },
  { id: 'pagos', label: 'Pagos / Caja', desc: 'Cobrar membresías y administrar caja chica (Ventas)' },
  { id: 'gastos', label: 'Gastos', desc: 'Registro de egresos operativos' },
  { id: 'personal', label: 'Personal (Staff)', desc: 'Administración de personal y permisos granulares' },
  { id: 'reportes', label: 'Reportes', desc: 'Estadísticas, flujos e informes financieros' },
  { id: 'configuracion', label: 'Configuración', desc: 'Ajustar datos globales y pasarelas de pago' },
]

const userFormSchema = (isEdit: boolean) => z.object({
  full_name: z.string().min(3, 'El nombre completo debe tener al menos 3 caracteres'),
  email: z.string().email('Por favor ingresa un correo electrónico válido'),
  role: z.enum(['admin', 'recepcion', 'entrenador']),
  password: isEdit
    ? z.string().optional().or(z.literal(''))
    : z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
  permissions: z.array(z.string()).min(1, 'Debes seleccionar al menos un permiso de acceso'),
})

type UserFormValues = z.infer<ReturnType<typeof userFormSchema>>

interface UserFormProps {
  initialData?: StaffUser
  onSubmit: (data: any) => void
  onCancel: () => void
  isSubmitting: boolean
}

export const UserForm: React.FC<UserFormProps> = ({
  initialData,
  onSubmit,
  onCancel,
  isSubmitting,
}) => {
  const isEdit = !!initialData

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<UserFormValues>({
    resolver: zodResolver(userFormSchema(isEdit)),
    defaultValues: initialData
      ? {
          full_name: initialData.full_name,
          email: initialData.email,
          role: initialData.role,
          password: '',
          permissions: initialData.permissions || [],
        }
      : {
          full_name: '',
          email: '',
          role: 'recepcion',
          password: '',
          permissions: ['dashboard', 'clientes'],
        },
  })

  const watchedRole = watch('role')
  const watchedPermissions = watch('permissions') || []

  // Auto-marcar todos los permisos si el rol seleccionado es Administrador
  useEffect(() => {
    if (watchedRole === 'admin') {
      const allPermIds = AVAILABLE_PERMISSIONS.map(p => p.id)
      // Solo actualizar si no están todos seleccionados para evitar bucles
      if (watchedPermissions.length !== allPermIds.length) {
        setValue('permissions', allPermIds)
      }
    }
  }, [watchedRole])

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 max-h-[80vh] overflow-y-auto pr-2">
      {/* Nombre Completo */}
      <div className="space-y-1.5">
        <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Nombre Completo
        </label>
        <div className="relative">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground pointer-events-none">
            <User className="h-4 w-4" />
          </span>
          <input
            type="text"
            className="w-full bg-secondary/40 border border-border/80 rounded-xl py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:border-primary transition-all placeholder:text-muted-foreground/60"
            placeholder="Ej: Laura Gómez"
            {...register('full_name')}
            disabled={isSubmitting}
          />
        </div>
        {errors.full_name && (
          <p className="text-xs text-destructive mt-1 font-medium">{errors.full_name.message}</p>
        )}
      </div>

      {/* Correo Electrónico */}
      <div className="space-y-1.5">
        <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Correo Electrónico
        </label>
        <div className="relative">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground pointer-events-none">
            <Mail className="h-4 w-4" />
          </span>
          <input
            type="email"
            className="w-full bg-secondary/40 border border-border/80 rounded-xl py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:border-primary transition-all placeholder:text-muted-foreground/60 disabled:opacity-50 disabled:cursor-not-allowed"
            placeholder="correo@ejemplo.com"
            {...register('email')}
            disabled={isSubmitting || isEdit}
          />
        </div>
        {errors.email && (
          <p className="text-xs text-destructive mt-1 font-medium">{errors.email.message}</p>
        )}
      </div>

      {/* Contraseña (Solo en creación) */}
      {!isEdit && (
        <div className="space-y-1.5">
          <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Contraseña
          </label>
          <div className="relative">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground pointer-events-none">
              <Lock className="h-4 w-4" />
            </span>
            <input
              type="password"
              className="w-full bg-secondary/40 border border-border/80 rounded-xl py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:border-primary transition-all placeholder:text-muted-foreground/60"
              placeholder="Mínimo 6 caracteres"
              {...register('password')}
              disabled={isSubmitting}
            />
          </div>
          {errors.password && (
            <p className="text-xs text-destructive mt-1 font-medium">{errors.password.message}</p>
          )}
        </div>
      )}

      {/* Rol */}
      <div className="space-y-1.5">
        <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Rol de Usuario (Base)
        </label>
        <div className="relative">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground pointer-events-none">
            <Shield className="h-4 w-4" />
          </span>
          <select
            className="w-full bg-secondary/40 border border-border/80 rounded-xl py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:border-primary transition-all appearance-none cursor-pointer"
            {...register('role')}
            disabled={isSubmitting}
          >
            <option value="recepcion">Recepción</option>
            <option value="entrenador">Entrenador</option>
            <option value="admin">Administrador</option>
          </select>
        </div>
        {errors.role && (
          <p className="text-xs text-destructive mt-1 font-medium">{errors.role.message}</p>
        )}
      </div>

      {/* Permisos Granulares (Casillas) */}
      <div className="space-y-2 pt-2">
        <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
          Permisos de Acceso Módulo por Módulo
        </label>
        <p className="text-[10px] text-muted-foreground/80 leading-normal mb-2">
          Marca los accesos permitidos. Si el rol es Administrador, se marcarán todos por defecto.
        </p>

        <div className="grid gap-2 grid-cols-1 sm:grid-cols-2">
          {AVAILABLE_PERMISSIONS.map((perm) => {
            const isChecked = watchedPermissions.includes(perm.id)
            return (
              <label
                key={perm.id}
                className={`flex items-start space-x-3 p-3 rounded-xl border transition-all cursor-pointer select-none ${
                  isChecked
                    ? 'border-primary/40 bg-primary/5 text-foreground'
                    : 'border-border/40 hover:bg-secondary/20 text-muted-foreground'
                }`}
              >
                <input
                  type="checkbox"
                  value={perm.id}
                  disabled={isSubmitting || watchedRole === 'admin'}
                  className="mt-0.5 rounded bg-background border-border text-primary focus:ring-primary h-4 w-4 cursor-pointer disabled:opacity-50"
                  checked={isChecked}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setValue('permissions', [...watchedPermissions, perm.id])
                    } else {
                      setValue('permissions', watchedPermissions.filter(p => p !== perm.id))
                    }
                  }}
                />
                <div className="space-y-0.5 min-w-0">
                  <span className={`text-xs font-semibold block ${isChecked ? 'text-primary' : 'text-foreground'}`}>
                    {perm.label}
                  </span>
                  <p className="text-[9px] text-muted-foreground/80 leading-tight">
                    {perm.desc}
                  </p>
                </div>
              </label>
            )
          })}
        </div>
        {errors.permissions && (
          <p className="text-xs text-destructive mt-1 font-medium">{errors.permissions.message}</p>
        )}
      </div>

      {/* Botones de acción */}
      <div className="flex items-center justify-end space-x-3 pt-4 border-t border-border/40 shrink-0">
        <button
          type="button"
          onClick={onCancel}
          disabled={isSubmitting}
          className="px-4 py-2 border border-border rounded-xl text-sm font-semibold hover:bg-secondary/40 text-muted-foreground hover:text-foreground transition-all flex items-center space-x-1.5 active:scale-95"
        >
          <X className="h-4 w-4" />
          <span>Cancelar</span>
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="px-4 py-2 bg-primary text-primary-foreground font-semibold rounded-xl text-sm hover:bg-primary/90 transition-all flex items-center space-x-1.5 active:scale-95 shadow-md shadow-primary/20"
        >
          {isSubmitting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          <span>Guardar Cambios</span>
        </button>
      </div>
    </form>
  )
}
