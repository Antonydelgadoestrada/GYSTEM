import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/config/supabase'

export interface Customer {
  id: string
  dni: string | null
  full_name: string
  email: string | null
  phone: string | null
  birth_date: string | null
  photo_url: string | null
  access_code: string | null
  status: 'active' | 'inactive'
  notes: string | null
  created_at: string
  customer_memberships?: Array<{
    status: 'active' | 'pending' | 'expired' | 'cancelled'
  }>
}

export interface CustomerDetails extends Customer {
  customer_memberships: Array<{
    id: string
    customer_id: string
    membership_id: string
    start_date: string
    end_date: string
    status: 'active' | 'pending' | 'expired' | 'cancelled'
    created_at: string
    memberships: {
      name: string
      price: number
      duration_days: number
    }
    payments: Array<{
      id: string
      amount: number
      payment_method: string
      payment_date: string
      notes: string | null
      status: 'paid' | 'cancelled'
    }>
  }>
}

export type CreateCustomerInput = Omit<Customer, 'id' | 'created_at'>
export type UpdateCustomerInput = Partial<CreateCustomerInput> & { id: string }

// 1. Hook para obtener todos los clientes
export const useCustomers = (search = '', statusFilter: 'all' | 'active' | 'inactive' = 'all') => {
  return useQuery<Customer[]>({
    queryKey: ['customers', search, statusFilter],
    queryFn: async () => {
      let query = supabase
        .from('customers')
        .select(`
          *,
          customer_memberships (
            status
          )
        `)
        .order('full_name', { ascending: true })

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter)
      }

      if (search) {
        // Búsqueda simple por nombre, correo, teléfono, código de acceso o DNI
        query = query.or(
          `full_name.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%,access_code.ilike.%${search}%,dni.ilike.%${search}%`
        )
      }

      const { data, error } = await query
      if (error) throw error
      return data || []
    },
  })
}

// 2. Hook para obtener el detalle de un cliente con sus membresías y pagos asociados
export const useCustomerDetails = (id: string | undefined) => {
  return useQuery<CustomerDetails | null>({
    queryKey: ['customer', id],
    queryFn: async () => {
      if (!id) return null

      // Consulta relacional anidada: Cliente -> Suscripciones -> Planes y Pagos
      const { data, error } = await supabase
        .from('customers')
        .select(`
          *,
          customer_memberships (
            *,
            memberships (
              name,
              price,
              duration_days
            ),
            payments (
              *
            )
          )
        `)
        .eq('id', id)
        .single()

      if (error) throw error
      
      // Ordenar las membresías del cliente: las más recientes primero
      if (data && data.customer_memberships) {
        data.customer_memberships.sort(
          (a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        )
      }

      return data as unknown as CustomerDetails
    },
    enabled: !!id,
  })
}

// 3. Hook para crear un cliente
export const useCreateCustomer = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (newCustomer: CreateCustomerInput) => {
      const { data, error } = await supabase
        .from('customers')
        .insert(newCustomer)
        .select()
        .single()

      if (error) {
        if (error.code === '23505' && error.message.includes('access_code')) {
          throw new Error('El código de acceso físico ya está asignado a otro cliente.')
        }
        throw error
      }
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] })
    },
  })
}

// 4. Hook para actualizar un cliente
export const useUpdateCustomer = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ...updates }: UpdateCustomerInput) => {
      const { data, error } = await supabase
        .from('customers')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

      if (error) {
        if (error.code === '23505' && error.message.includes('access_code')) {
          throw new Error('El código de acceso físico ya está asignado a otro cliente.')
        }
        throw error
      }
      return data
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['customers'] })
      queryClient.invalidateQueries({ queryKey: ['customer', variables.id] })
    },
  })
}

// 5. Hook para eliminar un cliente
export const useDeleteCustomer = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('customers')
        .delete()
        .eq('id', id)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] })
    },
  })
}
