import React, { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { useCustomers, useCreateCustomer } from '@/features/customers/hooks/useCustomers'
import { useMemberships } from '@/features/memberships/hooks/useMemberships'
import { useCreateSubscriptionAndPayment, type CreateSubscriptionAndPaymentInput } from '../hooks/usePayments'
import { useGymSettings } from '@/features/settings/hooks/useGymSettings'
import { formatMoney } from '@/utils/currency'
import { BusquedaDNI } from '@/features/customers/components/BusquedaDNI'
import { supabase } from '@/config/supabase'
import { Award, User, DollarSign, Calendar, CreditCard, X, Save, AlertTriangle, Search, Plus, RefreshCw } from 'lucide-react'

const assignSchema = z.object({
  customer_id: z.string().min(1, 'Debe seleccionar un cliente'),
  membership_id: z.string().min(1, 'Debe seleccionar un plan'),
  start_date: z.string().min(1, 'Debe ingresar la fecha de inicio'),
  end_date: z.string().min(1, 'Debe ingresar la fecha de vencimiento'),
  amount: z.number().min(0, 'El monto cobrado no puede ser negativo'),
  payment_method: z.string().min(1, 'Debe seleccionar un método de pago'),
  payment_date: z.string().min(1, 'Debe ingresar la fecha de cobro'),
  notes: z.string().optional().nullable(),
})

type AssignFormValues = z.infer<typeof assignSchema>

interface AssignMembershipModalProps {
  preselectedCustomerId?: string
  onClose: () => void
}

export const AssignMembershipModal: React.FC<AssignMembershipModalProps> = ({
  preselectedCustomerId,
  onClose,
}) => {
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  
  // Settings & Queries
  const { data: settings } = useGymSettings()
  const { data: customers } = useCustomers('', 'active')
  const { data: memberships } = useMemberships(false) // Solo planes activos
  const assignMutation = useCreateSubscriptionAndPayment()
  const createCustomerMutation = useCreateCustomer()

  // Selected customer state for combobox
  const [selectedCustomer, setSelectedCustomer] = useState<any | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [showDropdown, setShowDropdown] = useState(false)

  // Quick create client state
  const [isCreatingCustomer, setIsCreatingCustomer] = useState(false)
  const [quickDni, setQuickDni] = useState('')
  const [quickName, setQuickName] = useState('')
  const [quickPhone, setQuickPhone] = useState('')
  const [quickAccessCode, setQuickAccessCode] = useState('')
  const [isMinor, setIsMinor] = useState(false)
  const [showNameInput, setShowNameInput] = useState(false)
  const [quickError, setQuickError] = useState<string | null>(null)

  // Payment methods
  const paymentMethods = settings?.payment_methods || ['Efectivo', 'Tarjeta', 'Transferencia', 'Yape', 'Plin', 'Mixto']

  // Form setup
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<AssignFormValues>({
    resolver: zodResolver(assignSchema),
    defaultValues: {
      customer_id: preselectedCustomerId || '',
      membership_id: '',
      start_date: new Date().toISOString().split('T')[0],
      end_date: '',
      amount: 0,
      payment_method: 'Efectivo',
      payment_date: new Date().toISOString().split('T')[0],
      notes: '',
    },
  })

  // Watch selected values
  const selectedMembershipId = watch('membership_id')
  const startDateValue = watch('start_date')
  const selectedPaymentMethod = watch('payment_method')

  // Set initial selected customer if preselectedCustomerId is provided
  useEffect(() => {
    if (preselectedCustomerId && customers) {
      const found = customers.find(c => c.id === preselectedCustomerId)
      if (found) {
        setSelectedCustomer(found)
        setValue('customer_id', found.id)
      }
    }
  }, [preselectedCustomerId, customers, setValue])

  // Handle setting default payment method once settings load
  useEffect(() => {
    if (settings?.payment_methods && settings.payment_methods.length > 0) {
      setValue('payment_method', settings.payment_methods[0])
    }
  }, [settings, setValue])

  // Monitorear cambios en plan y fecha de inicio para calcular fecha de vencimiento y costo
  useEffect(() => {
    if (!selectedMembershipId || !memberships) return

    const plan = memberships.find((m) => m.id === selectedMembershipId)
    if (!plan) return

    // 1. Pre-llenar el costo del plan como monto sugerido
    setValue('amount', plan.price)

    // 2. Calcular fecha de vencimiento automáticamente
    if (startDateValue) {
      const start = new Date(startDateValue)
      start.setDate(start.getDate() + plan.duration_days)
      const calculatedEnd = start.toISOString().split('T')[0]
      setValue('end_date', calculatedEnd)
    }
  }, [selectedMembershipId, startDateValue, memberships, setValue])

  const handleQuickCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!quickName.trim()) {
      setQuickError('El nombre completo es obligatorio.')
      return
    }
    try {
      setQuickError(null)
      
      const dniVal = quickDni.trim()
      const nameVal = quickName.trim()

      if (dniVal) {
        const { data: dniData } = await supabase
          .from('customers')
          .select('id, full_name')
          .eq('dni', dniVal)
          .maybeSingle()

        if (dniData) {
          setQuickError(`El DNI ${dniVal} ya existe y pertenece al cliente: ${dniData.full_name}`)
          return
        }
      }

      if (nameVal) {
        const { data: nameData } = await supabase
          .from('customers')
          .select('id, full_name')
          .ilike('full_name', nameVal)
          .limit(1)

        if (nameData && nameData.length > 0) {
          setQuickError(`El cliente con nombre "${nameVal}" ya existe en el sistema (registrado como: ${nameData[0].full_name}).`)
          return
        }
      }

      const newCust = await createCustomerMutation.mutateAsync({
        dni: quickDni.trim() || null,
        full_name: quickName.trim(),
        phone: quickPhone.trim() || null,
        access_code: quickAccessCode.trim() || null,
        email: null,
        birth_date: null,
        photo_url: null,
        status: 'active',
        notes: isMinor ? 'Menor de edad registrado.' : 'Creado desde el registro de venta rápida.',
      })
      
      // Seleccionar al nuevo cliente en el form
      setValue('customer_id', newCust.id)
      setSelectedCustomer(newCust)
      setSearchQuery(newCust.full_name)
      setShowDropdown(false)
      setIsCreatingCustomer(false)
      
      // Limpiar campos
      setQuickDni('')
      setQuickName('')
      setQuickPhone('')
      setQuickAccessCode('')
      setIsMinor(false)
      setShowNameInput(false)
    } catch (err: any) {
      setQuickError(err.message || 'Error al crear el cliente.')
    }
  }

  const onSubmit = async (data: AssignFormValues) => {
    try {
      setErrorMsg(null)
      // Validar que la fecha de inicio sea menor o igual a la de vencimiento
      if (new Date(data.start_date) > new Date(data.end_date)) {
        throw new Error('La fecha de inicio no puede ser posterior a la fecha de vencimiento.')
      }

      const mutationInput: CreateSubscriptionAndPaymentInput = {
        customer_id: data.customer_id,
        membership_id: data.membership_id,
        start_date: data.start_date,
        end_date: data.end_date,
        status: 'active',
        amount: data.amount,
        payment_method: data.payment_method,
        payment_date: data.payment_date,
        notes: data.notes || null,
      }

      await assignMutation.mutateAsync(mutationInput)
      onClose()
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al procesar la suscripción y el cobro.')
    }
  }

  const filteredCustomers = customers?.filter(c =>
    c.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (c.phone && c.phone.includes(searchQuery)) ||
    (c.dni && c.dni.includes(searchQuery)) ||
    (c.access_code && c.access_code.toLowerCase().includes(searchQuery.toLowerCase()))
  ) || []

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-background/80 backdrop-blur-sm" onClick={onClose}></div>
      <div className="bg-card border border-border/60 rounded-2xl w-full max-w-lg p-6 shadow-2xl z-10 animate-in zoom-in-95 duration-150 relative">
        
        {/* Cabecera del modal */}
        <div className="flex items-center justify-between border-b border-border/40 pb-3 mb-4">
          <h2 className="text-xl font-bold tracking-tight">Registrar Venta / Asignar Plan</h2>
          <button onClick={onClose} className="p-1 rounded-lg border border-border text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>

        {errorMsg && (
          <div className="mb-4 p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm flex items-start space-x-2">
            <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* 1. Selección de Cliente */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Cliente
            </label>
            
            {selectedCustomer ? (
              <div className="flex items-center justify-between bg-primary/5 border border-primary/20 rounded-xl p-3">
                <div className="flex items-center space-x-3">
                  <div className="bg-primary/10 p-2 rounded-lg">
                    <User className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">{selectedCustomer.full_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {selectedCustomer.dni ? `DNI: ${selectedCustomer.dni} | ` : ''}
                      {selectedCustomer.phone ? `Telf: ${selectedCustomer.phone}` : 'Sin teléfono'} 
                      {selectedCustomer.access_code ? ` | Cód: ${selectedCustomer.access_code}` : ''}
                    </p>
                  </div>
                </div>
                {!preselectedCustomerId && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedCustomer(null)
                      setValue('customer_id', '')
                      setSearchQuery('')
                    }}
                    className="p-1 hover:bg-secondary rounded-lg text-muted-foreground hover:text-foreground transition-all"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            ) : isCreatingCustomer ? (
              // Formulario de creación rápida
              <div className="bg-secondary/20 border border-border/60 rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between border-b border-border/40 pb-2 mb-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-primary">Rápido: Nuevo Cliente</h4>
                  <button
                    type="button"
                    onClick={() => {
                      setIsCreatingCustomer(false)
                      setQuickError(null)
                      setQuickDni('')
                      setQuickName('')
                      setQuickPhone('')
                      setQuickAccessCode('')
                      setIsMinor(false)
                      setShowNameInput(false)
                    }}
                    className="text-xs text-muted-foreground hover:text-foreground underline"
                  >
                    Cancelar
                  </button>
                </div>
                
                {quickError && (
                  <p className="text-xs text-destructive bg-destructive/10 p-2 rounded-lg border border-destructive/20">{quickError}</p>
                )}

                <div className="grid grid-cols-1 gap-2">
                  {/* Buscador de DNI */}
                  <BusquedaDNI
                    onSuccess={(data) => {
                      setQuickDni(data.dni)
                      setQuickName(data.nombreCompleto)
                      setIsMinor(false)
                      setShowNameInput(true)
                    }}
                    onChange={(val) => {
                      setQuickDni(val)
                    }}
                    initialDni={quickDni}
                  />

                  {/* Checkbox Menor de edad */}
                  <div className="flex items-center space-x-1.5 text-xs text-muted-foreground font-semibold py-1">
                    <label className="flex items-center space-x-1.5 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        className="rounded bg-background border-border text-primary focus:ring-primary h-3.5 w-3.5 cursor-pointer"
                        checked={isMinor}
                        onChange={(e) => {
                          setIsMinor(e.target.checked)
                          if (e.target.checked) {
                            setShowNameInput(true)
                          } else if (quickDni.length !== 8) {
                            setShowNameInput(false)
                          }
                        }}
                      />
                      <span>Menor de Edad (Ingreso manual)</span>
                    </label>
                  </div>

                  {/* Nombre y otros datos */}
                  {showNameInput && (
                    <>
                      <div>
                        <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Nombre Completo *</label>
                        <input
                          type="text"
                          className="w-full bg-background border border-border/85 rounded-lg py-1.5 px-3 text-sm focus:outline-none focus:border-primary transition-all mt-0.5"
                          placeholder="Nombre y Apellidos"
                          value={quickName}
                          onChange={(e) => setQuickName(e.target.value)}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Teléfono</label>
                          <input
                            type="text"
                            className="w-full bg-background border border-border/85 rounded-lg py-1.5 px-3 text-sm focus:outline-none focus:border-primary transition-all mt-0.5"
                            placeholder="987654321"
                            value={quickPhone}
                            onChange={(e) => setQuickPhone(e.target.value)}
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">PIN / Código (Generado)</label>
                          <div className="flex space-x-1.5 mt-0.5">
                            <input
                              type="text"
                              className="flex-1 bg-background/50 border border-border/80 rounded-lg py-1.5 px-3 text-sm focus:outline-none transition-all text-muted-foreground"
                              value={quickAccessCode}
                              readOnly
                            />
                            <button
                              type="button"
                              onClick={() => setQuickAccessCode(Math.floor(100000 + Math.random() * 900000).toString())}
                              className="px-2.5 py-1.5 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/15 hover:border-primary/25 rounded-lg text-xs font-bold flex items-center space-x-1 transition-all active:scale-[0.98] cursor-pointer"
                              title="Regenerar PIN aleatorio"
                            >
                              <RefreshCw className="h-3 w-3" />
                              <span>Generar</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </div>

                {showNameInput && (
                  <button
                    type="button"
                    disabled={createCustomerMutation.isPending}
                    onClick={handleQuickCreate}
                    className="w-full bg-primary hover:bg-primary/95 text-primary-foreground text-xs py-2 px-3 rounded-lg font-semibold flex items-center justify-center space-x-1.5 transition-all mt-2"
                  >
                    {createCustomerMutation.isPending ? (
                      <div className="h-3 w-3 animate-spin rounded-full border border-primary-foreground border-t-transparent"></div>
                    ) : (
                      <span>Crear y Seleccionar</span>
                    )}
                  </button>
                )}
              </div>
            ) : (
              // Buscador interactivo
              <div className="relative space-y-2">
                <div className="flex space-x-2">
                  <div className="relative flex-1">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground pointer-events-none">
                      <Search className="h-4 w-4" />
                    </span>
                    <input
                      type="text"
                      className="w-full bg-secondary/40 border border-border/80 rounded-xl py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:border-primary transition-all"
                      placeholder="Busca por nombre, telf o DNI..."
                      value={searchQuery}
                      onChange={(e) => {
                        setSearchQuery(e.target.value)
                        setShowDropdown(true)
                      }}
                      onFocus={() => setShowDropdown(true)}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setIsCreatingCustomer(true)
                      setQuickAccessCode(Math.floor(100000 + Math.random() * 900000).toString())
                      
                      const q = searchQuery.trim()
                      if (/^\d+$/.test(q)) {
                        setQuickDni(q)
                      } else if (q.length > 0) {
                        setQuickName(q)
                        setShowNameInput(true)
                      }
                    }}
                    className="px-3 py-2 bg-primary/10 border border-primary/20 text-primary hover:bg-primary/25 rounded-xl text-sm font-semibold flex items-center space-x-1 transition-all cursor-pointer"
                  >
                    <Plus className="h-4 w-4" />
                    <span>Nuevo</span>
                  </button>
                </div>

                {showDropdown && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setShowDropdown(false)}></div>
                    <div className="absolute z-20 left-0 right-0 mt-1 max-h-48 overflow-y-auto bg-card border border-border rounded-xl shadow-2xl divide-y divide-border/40">
                      {filteredCustomers.length > 0 ? (
                        filteredCustomers.map((c) => (
                          <button
                            key={c.id}
                            type="button"
                            className="w-full text-left px-4 py-2.5 text-sm hover:bg-secondary/40 flex justify-between items-center transition-all"
                            onClick={() => {
                              setSelectedCustomer(c)
                              setValue('customer_id', c.id)
                              setShowDropdown(false)
                            }}
                          >
                            <div className="flex flex-col text-left">
                              <span className="font-semibold">{c.full_name}</span>
                              {c.dni && <span className="text-[10px] text-muted-foreground">DNI: {c.dni}</span>}
                            </div>
                            <span className="text-xs text-muted-foreground bg-secondary/80 px-2 py-0.5 rounded-full">
                              {c.phone || 'Sin tel'}
                            </span>
                          </button>
                        ))
                      ) : (
                        <div className="px-4 py-3 text-sm text-muted-foreground text-center space-y-2">
                          <p>No se encontraron atletas.</p>
                          {searchQuery.trim().length > 0 && (
                            <button
                              type="button"
                              onClick={() => {
                                setIsCreatingCustomer(true)
                                setQuickAccessCode(Math.floor(100000 + Math.random() * 900000).toString())
                                setShowDropdown(false)
                                
                                const q = searchQuery.trim()
                                if (/^\d+$/.test(q)) {
                                  setQuickDni(q)
                                } else {
                                  setQuickName(q)
                                  setShowNameInput(true)
                                }
                              }}
                              className="w-full bg-primary/10 border border-primary/20 hover:bg-primary/20 text-primary text-xs py-1.5 px-3 rounded-lg font-bold transition-all active:scale-[0.98] cursor-pointer"
                            >
                              Registrar a "{searchQuery.trim()}"
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            )}
            {errors.customer_id && (
              <p className="text-xs text-destructive mt-1 font-medium">{errors.customer_id.message}</p>
            )}
          </div>

          {/* 2. Selección de Plan (Membresía) */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Plan / Membresía
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground pointer-events-none">
                <Award className="h-4 w-4" />
              </span>
              <select
                className="w-full bg-secondary/40 border border-border/80 rounded-xl py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:border-primary transition-all"
                {...register('membership_id')}
              >
                <option value="">-- Seleccionar Plan --</option>
                {memberships?.map((membership) => (
                  <option key={membership.id} value={membership.id}>
                    {membership.name} ({formatMoney(membership.price, settings)} - {membership.duration_days} {membership.duration_days === 1 ? 'día' : 'días'})
                  </option>
                ))}
              </select>
            </div>
            {errors.membership_id && (
              <p className="text-xs text-destructive mt-1 font-medium">{errors.membership_id.message}</p>
            )}
          </div>

          {/* 3. Fechas de Inicio y Vencimiento */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Fecha Inicio
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground pointer-events-none">
                  <Calendar className="h-4 w-4" />
                </span>
                <input
                  type="date"
                  className="w-full bg-secondary/40 border border-border/80 rounded-xl py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:border-primary transition-all"
                  {...register('start_date')}
                />
              </div>
              {errors.start_date && (
                <p className="text-xs text-destructive mt-1 font-medium">{errors.start_date.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Vence el
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground pointer-events-none">
                  <Calendar className="h-4 w-4" />
                </span>
                <input
                  type="date"
                  className="w-full bg-secondary/40 border border-border/80 rounded-xl py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:border-primary transition-all"
                  {...register('end_date')}
                />
              </div>
              {errors.end_date && (
                <p className="text-xs text-destructive mt-1 font-medium">{errors.end_date.message}</p>
              )}
            </div>
          </div>

          <div className="border-t border-border/40 my-4 pt-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">Detalles de Caja</h3>
            
            <div className="grid grid-cols-2 gap-4">
              {/* 4. Monto Cobrado */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Monto Recibido ({settings?.currency === 'USD' ? '$' : 'S/.'})
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground pointer-events-none">
                    <DollarSign className="h-4 w-4" />
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    className="w-full bg-secondary/40 border border-border/80 rounded-xl py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:border-primary transition-all"
                    placeholder="0.00"
                    {...register('amount', { valueAsNumber: true })}
                  />
                </div>
                {errors.amount && (
                  <p className="text-xs text-destructive mt-1 font-medium">{errors.amount.message}</p>
                )}
              </div>

              {/* 5. Método de Pago */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Método de Pago
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground pointer-events-none">
                    <CreditCard className="h-4 w-4" />
                  </span>
                  <select
                    className="w-full bg-secondary/40 border border-border/80 rounded-xl py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:border-primary transition-all"
                    {...register('payment_method')}
                  >
                    {paymentMethods.map((method) => (
                      <option key={method} value={method}>{method}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* 6. Nota de pago (detallar pago mixto u otros detalles) */}
            <div className="space-y-1.5 mt-3">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Notas / Desglose de Pago {selectedPaymentMethod === 'Mixto' && '(Requerido para mixto)'}
              </label>
              <input
                type="text"
                placeholder={selectedPaymentMethod === 'Mixto' ? 'Ej. S/.3.00 en Efectivo y S/.2.00 con Yape' : 'Detalles adicionales sobre el cobro (opcional)'}
                className="w-full bg-secondary/40 border border-border/80 rounded-xl py-2.5 px-4 text-sm focus:outline-none focus:border-primary transition-all"
                {...register('notes')}
              />
            </div>
          </div>

          {/* Acciones */}
          <div className="flex items-center justify-end space-x-3 pt-4 border-t border-border/40">
            <button
              type="button"
              onClick={onClose}
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
                  <span>Procesar Venta</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
