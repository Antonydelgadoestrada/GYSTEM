import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/config/supabase'

export interface Membership {
  id: string
  name: string
  price: number
  duration_days: number
  is_active: boolean
  created_at: string
}

export type CreateMembershipInput = Omit<Membership, 'id' | 'created_at'>
export type UpdateMembershipInput = Partial<CreateMembershipInput> & { id: string }

// 1. Hook para obtener el catálogo de membresías
export const useMemberships = (showInactive = true) => {
  return useQuery<Membership[]>({
    queryKey: ['memberships', showInactive],
    queryFn: async () => {
      let query = supabase
        .from('memberships')
        .select('*')
        .order('created_at', { ascending: false })

      if (!showInactive) {
        query = query.eq('is_active', true)
      }

      const { data, error } = await query
      if (error) throw error
      return data || []
    },
  })
}

// 2. Hook para crear una membresía
export const useCreateMembership = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (newMembership: CreateMembershipInput) => {
      const { data, error } = await supabase
        .from('memberships')
        .insert(newMembership)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['memberships'] })
    },
  })
}

// 3. Hook para actualizar una membresía
export const useUpdateMembership = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ...updates }: UpdateMembershipInput) => {
      const { data, error } = await supabase
        .from('memberships')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['memberships'] })
    },
  })
}

// 4. Hook para alternar el estado activo/inactivo (Soft delete)
export const useToggleMembershipStatus = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { data, error } = await supabase
        .from('memberships')
        .update({ is_active })
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['memberships'] })
    },
  })
}

// 5. Hook para eliminar físicamente una membresía (sólo si no tiene registros asociados)
export const useDeleteMembership = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('memberships')
        .delete()
        .eq('id', id)

      if (error) {
        if (error.code === '23503') {
          throw new Error('No se puede eliminar esta membresía porque hay clientes que la tienen asignada. Te recomendamos desactivarla en su lugar.')
        }
        throw error
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['memberships'] })
    },
  })
}
