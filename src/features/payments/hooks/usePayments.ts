import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/config/supabase'

export interface Payment {
  id: string
  customer_membership_id: string
  amount: number
  payment_method: string
  payment_date: string
  receipt_url: string | null
  notes: string | null
  status: 'paid' | 'cancelled'
  created_at: string
  customer_memberships: {
    customers: {
      id: string
      full_name: string
    }
    memberships: {
      name: string
    }
  }
}

export interface CreateSubscriptionAndPaymentInput {
  customer_id: string
  membership_id: string
  start_date: string
  end_date: string
  status: 'active' | 'pending'
  amount: number
  payment_method: string
  payment_date: string
  notes?: string | null
}

// 1. Hook para obtener el historial de pagos global (Caja)
export const usePayments = () => {
  return useQuery<Payment[]>({
    queryKey: ['payments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payments')
        .select(`
          *,
          customer_memberships (
            customer_id,
            membership_id,
            customers (id, full_name),
            memberships (name)
          )
        `)
        .order('created_at', { ascending: false })

      if (error) throw error
      return (data || []) as unknown as Payment[]
    },
  })
}

// 2. Hook para registrar una suscripción y su pago inicial de forma atómica
export const useCreateSubscriptionAndPayment = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: CreateSubscriptionAndPaymentInput) => {
      // A) Insertar la suscripción del cliente
      const { data: subscription, error: subError } = await supabase
        .from('customer_memberships')
        .insert({
          customer_id: input.customer_id,
          membership_id: input.membership_id,
          start_date: input.start_date,
          end_date: input.end_date,
          status: input.status,
        })
        .select()
        .single()

      if (subError) throw subError

      // B) Registrar el pago asociado a la suscripción
      if (input.amount > 0) {
        const { error: payError } = await supabase
          .from('payments')
          .insert({
            customer_membership_id: subscription.id,
            amount: input.amount,
            payment_method: input.payment_method,
            payment_date: input.payment_date,
            notes: input.notes || null,
            status: 'paid',
          })

        if (payError) {
          // Rollback de la membresía si falla el cobro
          await supabase.from('customer_memberships').delete().eq('id', subscription.id)
          throw payError
        }
      }

      // C) Actualizar el estado del cliente a "active"
      await supabase
        .from('customers')
        .update({ status: 'active' })
        .eq('id', input.customer_id)

      return subscription
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['payments'] })
      queryClient.invalidateQueries({ queryKey: ['customers'] })
      queryClient.invalidateQueries({ queryKey: ['customer', variables.customer_id] })
    },
  })
}

// 3. Hook para anular un pago (Requiere confirmación y audita la acción)
export const useCancelPayment = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (paymentId: string) => {
      const { data: updatedPayment, error } = await supabase
        .from('payments')
        .update({ status: 'cancelled' })
        .eq('id', paymentId)
        .select()
        .single()

      if (error) throw error
      return updatedPayment
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments'] })
      queryClient.invalidateQueries({ queryKey: ['customers'] })
    },
  })
}
