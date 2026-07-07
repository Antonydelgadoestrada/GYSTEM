import React, { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { supabase } from '@/config/supabase'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Building,
  Phone,
  MapPin,
  Save,
  Clock,
  User,
  AlertTriangle,
  CheckCircle,
  Database,
  X
} from 'lucide-react'

export interface GymSettings {
  id: string
  name: string
  phone: string | null
  address: string | null
  currency: string
  payment_methods: string[]
  quick_sale_customer_id: string | null
  quick_sale_membership_id: string | null
}

// Schemas Zod
const settingsSchema = z.object({
  name: z.string().min(3, 'El nombre del gimnasio debe tener al menos 3 caracteres'),
  phone: z.string().optional().or(z.literal('')),
  address: z.string().optional().or(z.literal('')),
  currency: z.string().min(1, 'Debe seleccionar una moneda del sistema'),
  quick_sale_customer_id: z.string().nullable().optional().or(z.literal('')),
  quick_sale_membership_id: z.string().nullable().optional().or(z.literal('')),
})

type SettingsFormInputs = z.infer<typeof settingsSchema>

interface AuditLog {
  id: string
  action: string
  entity_name: string
  created_at: string
  details: any
  users: {
    full_name: string
  } | null
}

export const SettingsPage: React.FC = () => {
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const queryClient = useQueryClient()

  // Estado local para métodos de pago
  const [paymentMethods, setPaymentMethods] = useState<string[]>([])
  const [newMethod, setNewMethod] = useState('')

  // 1. Query para cargar configuración del Gym
  const { data: gymSettings, isLoading } = useQuery<GymSettings>({
    queryKey: ['gymSettings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('gym_settings')
        .select('*')
        .maybeSingle()

      if (error) throw error
      return data || {
        id: '',
        name: 'Mi Gimnasio',
        phone: '',
        address: '',
        currency: 'PEN',
        payment_methods: ['Efectivo', 'Tarjeta', 'Transferencia', 'Yape', 'Plin', 'Mixto'],
        quick_sale_customer_id: null,
        quick_sale_membership_id: null
      } as GymSettings
    },
  })

  // Query para cargar clientes activos en settings
  const { data: customers } = useQuery({
    queryKey: ['activeCustomersForSettings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('customers')
        .select('id, full_name, dni')
        .eq('status', 'active')
        .order('full_name', { ascending: true })
      if (error) throw error
      return data || []
    }
  })

  // Query para cargar membresías activas en settings
  const { data: memberships } = useQuery({
    queryKey: ['activeMembershipsForSettings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('memberships')
        .select('id, name, price, duration_days')
        .eq('is_active', true)
        .order('name', { ascending: true })
      if (error) throw error
      return data || []
    }
  })

  const [isCreatingGeneric, setIsCreatingGeneric] = useState(false)

  const handleCreateGenericCustomer = async () => {
    try {
      setIsCreatingGeneric(true)
      const { data: existing } = await supabase
        .from('customers')
        .select('id')
        .ilike('full_name', 'Cliente Genérico')
        .maybeSingle()

      if (existing) {
        setValue('quick_sale_customer_id', existing.id)
        setSuccessMsg('Ya existe un cliente con el nombre "Cliente Genérico". Seleccionado automáticamente.')
        setTimeout(() => setSuccessMsg(null), 3000)
        return
      }

      const pin = Math.floor(100000 + Math.random() * 900000).toString()

      const { data: newCustomer, error } = await supabase
        .from('customers')
        .insert({
          full_name: 'Cliente Genérico',
          dni: '99999999',
          status: 'active',
          access_code: pin,
          notes: 'Creado automáticamente como cliente genérico para Venta Rápida.'
        })
        .select()
        .single()

      if (error) throw error

      queryClient.invalidateQueries({ queryKey: ['activeCustomersForSettings'] })
      queryClient.invalidateQueries({ queryKey: ['customers'] })
      
      setValue('quick_sale_customer_id', newCustomer.id)
      setSuccessMsg('¡Cliente Genérico creado y seleccionado con éxito!')
      setTimeout(() => setSuccessMsg(null), 3000)
    } catch (err: any) {
      setErrorMsg('Error al crear el cliente genérico: ' + err.message)
      setTimeout(() => setErrorMsg(null), 4000)
    } finally {
      setIsCreatingGeneric(false)
    }
  }

  // 2. Query para cargar Bitácora de Auditoría
  const { data: auditLogs, isLoading: isLogsLoading } = useQuery<AuditLog[]>({
    queryKey: ['auditLogs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('audit_logs')
        .select(`
          id,
          action,
          entity_name,
          created_at,
          details,
          users (full_name)
        `)
        .order('created_at', { ascending: false })
        .limit(10)

      if (error) throw error
      return (data || []) as unknown as AuditLog[]
    },
  })

  // Form setup
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<SettingsFormInputs>({
    resolver: zodResolver(settingsSchema),
  })

  // Pre-llenar formulario al cargar datos
  useEffect(() => {
    if (gymSettings) {
      setValue('name', gymSettings.name)
      setValue('phone', gymSettings.phone || '')
      setValue('address', gymSettings.address || '')
      setValue('currency', gymSettings.currency || 'PEN')
      setValue('quick_sale_customer_id', gymSettings.quick_sale_customer_id || '')
      setValue('quick_sale_membership_id', gymSettings.quick_sale_membership_id || '')
      setPaymentMethods(gymSettings.payment_methods || ['Efectivo', 'Tarjeta', 'Transferencia', 'Yape', 'Plin', 'Mixto'])
    }
  }, [gymSettings, setValue])

  // Métodos de pago CRUD local
  const handleAddMethod = () => {
    const trimmed = newMethod.trim()
    if (!trimmed) return
    if (paymentMethods.includes(trimmed)) {
      setErrorMsg('Este método de pago ya existe.')
      setTimeout(() => setErrorMsg(null), 4000)
      return
    }
    setPaymentMethods([...paymentMethods, trimmed])
    setNewMethod('')
  }

  const handleRemoveMethod = (methodToRemove: string) => {
    if (paymentMethods.length <= 1) {
      setErrorMsg('Debe tener al menos un método de pago en el sistema.')
      setTimeout(() => setErrorMsg(null), 4000)
      return
    }
    setPaymentMethods(paymentMethods.filter((m) => m !== methodToRemove))
  }

  // Mutación para actualizar settings
  const settingsMutation = useMutation({
    mutationFn: async (data: SettingsFormInputs & { payment_methods: string[] }) => {
      const payload = {
        name: data.name,
        phone: data.phone || null,
        address: data.address || null,
        currency: data.currency,
        payment_methods: data.payment_methods,
        quick_sale_customer_id: data.quick_sale_customer_id || null,
        quick_sale_membership_id: data.quick_sale_membership_id || null,
      }

      if (gymSettings?.id) {
        const { error } = await supabase
          .from('gym_settings')
          .update(payload)
          .eq('id', gymSettings.id)
        if (error) throw error
      } else {
        const { error } = await supabase
          .from('gym_settings')
          .insert(payload)
        if (error) throw error
      }
    },
    onSuccess: () => {
      setSuccessMsg('Configuraciones actualizadas correctamente.')
      queryClient.invalidateQueries({ queryKey: ['gymSettings'] })
      setTimeout(() => setSuccessMsg(null), 3000)
    },
    onError: (err: any) => {
      setErrorMsg(err.message || 'Error al actualizar configuraciones.')
      setTimeout(() => setErrorMsg(null), 4000)
    },
  })

  const onSubmit = (data: SettingsFormInputs) => {
    settingsMutation.mutate({ ...data, payment_methods: paymentMethods })
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-foreground">
        <div className="flex flex-col items-center space-y-4">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
          <p className="text-sm text-muted-foreground animate-pulse">Cargando parámetros globales...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col space-y-1 border-b border-border/40 pb-5">
        <h1 className="text-3xl font-bold tracking-tight">Configuración del Gimnasio</h1>
        <p className="text-muted-foreground text-sm">
          Ajusta los detalles visuales de contacto de tu negocio, administra la moneda, configura los métodos de pago y revisa la bitácora de auditoría.
        </p>
      </div>

      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm flex items-center space-x-2">
          <CheckCircle className="h-5 w-5 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm flex items-start space-x-2">
          <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
          <span>{errorMsg}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Formulario de Ajustes (2/3) */}
        <div className="lg:col-span-2 bg-card border border-border/60 rounded-2xl p-6 shadow-sm">
          <h2 className="text-lg font-bold tracking-tight mb-4 flex items-center space-x-2">
            <Building className="h-5 w-5 text-primary" />
            <span>Perfil y Finanzas</span>
          </h2>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Nombre Comercial del Gimnasio
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground pointer-events-none">
                  <Building className="h-4 w-4" />
                </span>
                <input
                  type="text"
                  className="w-full bg-secondary/40 border border-border/80 rounded-xl py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:border-primary transition-all"
                  placeholder="Ej: Power Box CrossFit"
                  {...register('name')}
                />
              </div>
              {errors.name && (
                <p className="text-xs text-destructive mt-1 font-medium">{errors.name.message}</p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Teléfono de Contacto
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground pointer-events-none">
                    <Phone className="h-4 w-4" />
                  </span>
                  <input
                    type="text"
                    className="w-full bg-secondary/40 border border-border/80 rounded-xl py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:border-primary transition-all"
                    placeholder="+51 987 654 321"
                    {...register('phone')}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Dirección Física
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground pointer-events-none">
                    <MapPin className="h-4 w-4" />
                  </span>
                  <input
                    type="text"
                    className="w-full bg-secondary/40 border border-border/80 rounded-xl py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:border-primary transition-all"
                    placeholder="Ej: Av. Primavera 123, Surco"
                    {...register('address')}
                  />
                </div>
              </div>
            </div>

            {/* Configuración de Moneda */}
            <div className="space-y-1.5 border-t border-border/40 pt-4 mt-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Moneda del Sistema
              </label>
              <select
                className="w-full bg-secondary/40 border border-border/80 rounded-xl py-2.5 px-4 text-sm focus:outline-none focus:border-primary transition-all"
                {...register('currency')}
              >
                <option value="PEN">Soles (S/.)</option>
                <option value="USD">Dólares ($)</option>
              </select>
            </div>

            {/* Configuración de Métodos de Pago */}
            <div className="space-y-2 border-t border-border/40 pt-4 mt-4">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Métodos de Pago Habilitados
              </label>
              
              <div className="flex space-x-2">
                <input
                  type="text"
                  className="flex-1 bg-secondary/40 border border-border/80 rounded-xl py-2 px-3 text-sm focus:outline-none focus:border-primary transition-all"
                  placeholder="Ej: Yape, Plin, Efectivo, Tarjeta, Mixto..."
                  value={newMethod}
                  onChange={(e) => setNewMethod(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      handleAddMethod()
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={handleAddMethod}
                  className="px-4 py-2 bg-primary/10 border border-primary/20 hover:bg-primary/20 text-primary rounded-xl text-sm font-semibold transition-all shrink-0"
                >
                  Añadir
                </button>
              </div>

              <div className="flex flex-wrap gap-2 mt-2">
                {paymentMethods.map((method) => (
                  <span
                    key={method}
                    className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-secondary border border-border rounded-xl text-xs font-semibold text-foreground"
                  >
                    <span>{method}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveMethod(method)}
                      className="p-0.5 hover:bg-destructive/10 text-muted-foreground hover:text-destructive rounded transition-all"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </span>
                ))}
              </div>
            </div>

            {/* Configuración de Venta Rápida */}
            <div className="space-y-4 border-t border-border/40 pt-4 mt-4">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-primary flex items-center space-x-1.5">
                  <span>⚡ Configuración de Venta Rápida</span>
                </h3>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Establece un cliente genérico y un plan por defecto para registrar transacciones de forma instantánea.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Selector de Cliente Genérico */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex justify-between items-center">
                    <span>Cliente Genérico</span>
                    <button
                      type="button"
                      disabled={isCreatingGeneric}
                      onClick={handleCreateGenericCustomer}
                      className="text-[10px] text-primary hover:underline font-bold transition-all disabled:opacity-50 shrink-0"
                    >
                      {isCreatingGeneric ? 'Creando...' : '+ Auto-crear genérico'}
                    </button>
                  </label>
                  <select
                    className="w-full bg-secondary/40 border border-border/80 rounded-xl py-2.5 px-4 text-sm focus:outline-none focus:border-primary transition-all text-foreground"
                    {...register('quick_sale_customer_id')}
                  >
                    <option value="">-- Seleccionar Cliente Genérico --</option>
                    {customers?.map((cust: any) => (
                      <option key={cust.id} value={cust.id}>
                        {cust.full_name} {cust.dni ? `(DNI: ${cust.dni})` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Selector de Membresía Rápida */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Membresía por Defecto
                  </label>
                  <select
                    className="w-full bg-secondary/40 border border-border/80 rounded-xl py-2.5 px-4 text-sm focus:outline-none focus:border-primary transition-all text-foreground"
                    {...register('quick_sale_membership_id')}
                  >
                    <option value="">-- Seleccionar Membresía Rápida --</option>
                    {memberships?.map((memb: any) => (
                      <option key={memb.id} value={memb.id}>
                        {memb.name} ({memb.price} - {memb.duration_days} {memb.duration_days === 1 ? 'día' : 'días'})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end pt-4 border-t border-border/40">
              <button
                type="submit"
                disabled={settingsMutation.isPending}
                className="px-4 py-2.5 rounded-xl text-sm font-semibold bg-primary hover:bg-primary/95 text-primary-foreground transition-all flex items-center space-x-1.5 shadow-lg shadow-primary/20"
              >
                {settingsMutation.isPending ? (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent"></div>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    <span>Guardar Cambios</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Panel de Auditoría y Bitácora (1/3) */}
        <div className="lg:col-span-1 bg-card border border-border/60 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
          <div className="space-y-4">
            <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center space-x-2">
              <Database className="h-4 w-4 text-violet-400" />
              <span>Bitácora de Auditoría (Logs)</span>
            </h2>

            <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1">
              {isLogsLoading ? (
                <p className="text-xs text-muted-foreground text-center py-10">Cargando bitácora...</p>
              ) : auditLogs?.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-10">No se registran cambios de auditoría aún.</p>
              ) : (
                auditLogs?.map((log) => (
                  <div key={log.id} className="p-3 bg-secondary/25 border border-border/50 rounded-xl space-y-1.5 text-[10px] leading-relaxed">
                    <div className="flex justify-between items-center font-bold">
                      <span className={`px-1.5 py-0.5 rounded text-[8px] border ${
                        log.action === 'INSERT'
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                          : log.action === 'UPDATE'
                          ? 'bg-violet-500/10 text-violet-400 border-violet-500/20'
                          : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                      }`}>
                        {log.action}
                      </span>
                      <span className="text-muted-foreground flex items-center">
                        <Clock className="h-3 w-3 mr-1" />
                        {new Date(log.created_at).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-foreground">
                      Modificado en la tabla <span className="font-semibold text-primary">{log.entity_name}</span>
                    </p>
                    <div className="flex items-center space-x-1.5 text-muted-foreground font-semibold">
                      <User className="h-3.5 w-3.5 text-muted-foreground/80" />
                      <span>Por: {log.users?.full_name || 'Sistema (Registro)'}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
