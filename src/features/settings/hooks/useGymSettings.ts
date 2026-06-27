import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/config/supabase'

export interface GymSettings {
  id: string
  name: string
  phone: string | null
  address: string | null
  logo_url: string | null
  currency: string
  payment_methods: string[]
}

export type UpdateGymSettingsInput = Partial<Omit<GymSettings, 'id'>> & { id: string }

// 1. Hook para obtener la configuración del gimnasio
export const useGymSettings = () => {
  return useQuery<GymSettings>({
    queryKey: ['gymSettings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('gym_settings')
        .select('*')
        .maybeSingle()

      if (error) throw error
      
      // Fallback si por algún motivo la fila no está insertada
      if (!data) {
        return {
          id: '',
          name: 'Mi Gimnasio',
          phone: '',
          address: '',
          logo_url: '',
          currency: 'PEN',
          payment_methods: ['Efectivo', 'Tarjeta', 'Transferencia', 'Yape', 'Plin', 'Mixto']
        }
      }

      return data as GymSettings
    },
  })
}

// 2. Hook para actualizar la configuración
export const useUpdateGymSettings = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ...updates }: UpdateGymSettingsInput) => {
      const { data, error } = await supabase
        .from('gym_settings')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return data as GymSettings
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gymSettings'] })
    },
  })
}
