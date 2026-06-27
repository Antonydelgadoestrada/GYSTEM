import React from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import type { CreateMembershipInput, Membership } from '../hooks/useMemberships'
import { Award, DollarSign, Calendar, Save, X } from 'lucide-react'

const membershipSchema = z.object({
  name: z.string().min(3, 'El nombre de la membresía debe tener al menos 3 caracteres'),
  price: z.number().min(0, 'El precio no puede ser negativo'),
  duration_days: z.number().int('Debe ser un número entero').min(1, 'La duración debe ser al menos de 1 día'),
  is_active: z.boolean(),
})

type MembershipFormValues = z.infer<typeof membershipSchema>

interface MembershipFormProps {
  initialData?: Membership
  onSubmit: (data: CreateMembershipInput) => void
  onCancel: () => void
  isSubmitting: boolean
}

export const MembershipForm: React.FC<MembershipFormProps> = ({
  initialData,
  onSubmit,
  onCancel,
  isSubmitting,
}) => {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<MembershipFormValues>({
    resolver: zodResolver(membershipSchema),
    defaultValues: initialData
      ? {
          name: initialData.name,
          price: initialData.price,
          duration_days: initialData.duration_days,
          is_active: initialData.is_active,
        }
      : {
          name: '',
          price: 0,
          duration_days: 30,
          is_active: true,
        },
  })

  const handleFormSubmit = (data: MembershipFormValues) => {
    onSubmit(data)
  }

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
      {/* 1. Nombre de Membresía */}
      <div className="space-y-1.5">
        <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Nombre del Plan
        </label>
        <div className="relative">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground pointer-events-none">
            <Award className="h-4 w-4" />
          </span>
          <input
            type="text"
            className="w-full bg-secondary/40 border border-border/80 rounded-xl py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all placeholder:text-muted-foreground/60"
            placeholder="Ej: Pase Mensual VIP"
            {...register('name')}
          />
        </div>
        {errors.name && (
          <p className="text-xs text-destructive mt-1 font-medium">{errors.name.message}</p>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* 2. Precio */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Precio ($ USD)
          </label>
          <div className="relative">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground pointer-events-none">
              <DollarSign className="h-4 w-4" />
            </span>
            <input
              type="number"
              step="0.01"
              className="w-full bg-secondary/40 border border-border/80 rounded-xl py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all placeholder:text-muted-foreground/60"
              placeholder="0.00"
              {...register('price', { valueAsNumber: true })}
            />
          </div>
          {errors.price && (
            <p className="text-xs text-destructive mt-1 font-medium">{errors.price.message}</p>
          )}
        </div>

        {/* 3. Duración en Días */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Duración (Días)
          </label>
          <div className="relative">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground pointer-events-none">
              <Calendar className="h-4 w-4" />
            </span>
            <input
              type="number"
              className="w-full bg-secondary/40 border border-border/80 rounded-xl py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all placeholder:text-muted-foreground/60"
              placeholder="30"
              {...register('duration_days', { valueAsNumber: true })}
            />
          </div>
          {errors.duration_days && (
            <p className="text-xs text-destructive mt-1 font-medium">{errors.duration_days.message}</p>
          )}
        </div>
      </div>

      {/* 4. Estado Activo (solo si se está editando) */}
      {initialData && (
        <div className="flex items-center space-x-3 p-3 bg-secondary/20 rounded-xl border border-border/40">
          <input
            type="checkbox"
            id="is_active"
            className="h-4 w-4 rounded border-border text-primary focus:ring-primary bg-secondary/50"
            {...register('is_active')}
          />
          <label htmlFor="is_active" className="text-sm font-medium text-foreground cursor-pointer">
            Membresía Activa (disponible para asignaciones)
          </label>
        </div>
      )}

      {/* Acciones */}
      <div className="flex items-center justify-end space-x-3 pt-4 border-t border-border/40">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 rounded-xl text-sm font-semibold border border-border hover:bg-secondary/40 transition-all flex items-center space-x-1.5"
        >
          <X className="h-4 w-4" />
          <span>Cancelar</span>
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="px-4 py-2 rounded-xl text-sm font-semibold bg-primary hover:bg-primary/95 text-primary-foreground transition-all flex items-center space-x-1.5 shadow-lg shadow-primary/20"
        >
          {isSubmitting ? (
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent"></div>
          ) : (
            <>
              <Save className="h-4 w-4" />
              <span>Guardar</span>
            </>
          )}
        </button>
      </div>
    </form>
  )
}
