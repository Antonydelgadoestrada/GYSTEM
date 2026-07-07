import React, { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/config/supabase'
import { useGymSettings } from '@/features/settings/hooks/useGymSettings'
import { useCreateSubscriptionAndPayment } from '../hooks/usePayments'
import { formatMoney } from '@/utils/currency'
import { X, Save, AlertTriangle, Zap } from 'lucide-react'

interface QuickSaleModalProps {
  onClose: () => void
}

export const QuickSaleModal: React.FC<QuickSaleModalProps> = ({ onClose }) => {
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const { data: settings } = useGymSettings()
  const createSaleMutation = useCreateSubscriptionAndPayment()

  // Estado local para método de pago y notas
  const [paymentMethod, setPaymentMethod] = useState('')
  const [notes, setNotes] = useState('')

  // 1. Cargar datos del Cliente Genérico
  const { data: customer, isLoading: isLoadingCustomer } = useQuery({
    queryKey: ['quickSaleCustomer', settings?.quick_sale_customer_id],
    queryFn: async () => {
      if (!settings?.quick_sale_customer_id) return null
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('id', settings.quick_sale_customer_id)
        .single()
      if (error) throw error
      return data
    },
    enabled: !!settings?.quick_sale_customer_id,
  })

  // 2. Cargar datos de la Membresía por Defecto
  const { data: membership, isLoading: isLoadingMembership } = useQuery({
    queryKey: ['quickSaleMembership', settings?.quick_sale_membership_id],
    queryFn: async () => {
      if (!settings?.quick_sale_membership_id) return null
      const { data, error } = await supabase
        .from('memberships')
        .select('*')
        .eq('id', settings.quick_sale_membership_id)
        .single()
      if (error) throw error
      return data
    },
    enabled: !!settings?.quick_sale_membership_id,
  })

  // Seleccionar primer método de pago cuando carguen los ajustes
  useEffect(() => {
    if (settings?.payment_methods && settings.payment_methods.length > 0) {
      setPaymentMethod(settings.payment_methods[0])
    }
  }, [settings])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!settings?.quick_sale_customer_id || !settings?.quick_sale_membership_id) {
      setErrorMsg('Falta configurar los parámetros de venta rápida en ajustes.')
      return
    }
    if (!customer || !membership) {
      setErrorMsg('No se pudieron cargar los registros de venta rápida.')
      return
    }

    try {
      setErrorMsg(null)
      const now = new Date()
      const startDate = now.toISOString().split('T')[0]
      
      const end = new Date()
      end.setDate(end.getDate() + membership.duration_days)
      const endDate = end.toISOString().split('T')[0]

      await createSaleMutation.mutateAsync({
        customer_id: customer.id,
        membership_id: membership.id,
        start_date: startDate,
        end_date: endDate,
        status: 'active',
        amount: membership.price,
        payment_method: paymentMethod,
        payment_date: startDate,
        notes: notes.trim() || 'Venta rápida registrada.',
      })

      onClose()
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al procesar la venta rápida.')
    }
  }

  const isLoading = isLoadingCustomer || isLoadingMembership

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-background/80 backdrop-blur-sm" onClick={onClose}></div>
      <div className="bg-card border border-border/60 rounded-2xl w-full max-w-md p-6 shadow-2xl z-10 animate-in zoom-in-95 duration-150 relative">
        {/* Cabecera */}
        <div className="flex items-center justify-between border-b border-border/40 pb-3 mb-4">
          <h2 className="text-lg font-bold tracking-tight flex items-center space-x-2">
            <Zap className="h-5 w-5 text-amber-400 fill-amber-400/10" />
            <span>Confirmar Venta Rápida</span>
          </h2>
          <button onClick={onClose} className="p-1 rounded-lg border border-border text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>

        {errorMsg && (
          <div className="mb-4 p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs flex items-start space-x-2">
            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-10 space-y-3">
            <div className="h-8 w-8 animate-spin rounded-full border-3 border-primary border-t-transparent"></div>
            <p className="text-xs text-muted-foreground animate-pulse">Cargando parámetros de venta rápida...</p>
          </div>
        ) : !settings?.quick_sale_customer_id || !settings?.quick_sale_membership_id ? (
          <div className="py-6 text-center space-y-4">
            <AlertTriangle className="h-10 w-10 text-amber-400 mx-auto" />
            <h3 className="text-sm font-semibold">Parámetros no configurados</h3>
            <p className="text-xs text-muted-foreground max-w-xs mx-auto">
              Debes configurar primero el Cliente Genérico y la Membresía por Defecto en la pestaña de Configuración.
            </p>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-secondary border border-border hover:bg-secondary/80 rounded-xl text-xs font-semibold"
            >
              Cerrar
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Resumen de la venta */}
            <div className="bg-secondary/30 border border-border/40 rounded-xl p-4 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground font-medium">Cliente Genérico:</span>
                <span className="font-bold text-foreground">{customer?.full_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground font-medium">Plan / Membresía:</span>
                <span className="font-bold text-foreground">{membership?.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground font-medium">Duración del Pase:</span>
                <span className="font-bold text-foreground">{membership?.duration_days} {membership?.duration_days === 1 ? 'día' : 'días'}</span>
              </div>
              <div className="flex justify-between border-t border-border/40 pt-2 mt-2 text-sm">
                <span className="text-foreground font-bold">Total a Cobrar:</span>
                <span className="font-black text-emerald-400">{formatMoney(membership?.price || 0, settings)}</span>
              </div>
            </div>

            {/* Método de Pago */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Método de Pago
              </label>
              <select
                className="w-full bg-secondary/40 border border-border/80 rounded-xl py-2.5 px-4 text-sm focus:outline-none focus:border-primary transition-all text-foreground font-semibold"
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
              >
                {settings?.payment_methods.map((method) => (
                  <option key={method} value={method}>{method}</option>
                ))}
              </select>
            </div>

            {/* Notas opcionales */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Notas (Opcional)
              </label>
              <input
                type="text"
                className="w-full bg-secondary/40 border border-border/80 rounded-xl py-2.5 px-4 text-sm focus:outline-none focus:border-primary transition-all text-foreground"
                placeholder="Detalle adicional sobre la venta..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>

            {/* Acciones */}
            <div className="flex items-center justify-end space-x-3 pt-3 border-t border-border/40">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-semibold border border-border hover:bg-secondary/40 transition-all"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={createSaleMutation.isPending}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-primary hover:bg-primary/95 text-primary-foreground transition-all flex items-center space-x-1.5 shadow-lg shadow-primary/20"
              >
                {createSaleMutation.isPending ? (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent"></div>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    <span>Registrar Cobro</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
