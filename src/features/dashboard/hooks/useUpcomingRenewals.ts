import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/config/supabase'

export interface UpcomingRenewal {
  id: string
  end_date: string
  status: string
  customers: {
    id: string
    full_name: string
    phone: string | null
  } | null
  memberships: {
    name: string
    duration_days: number
  } | null
}

export const useUpcomingRenewals = () => {
  return useQuery<UpcomingRenewal[]>({
    queryKey: ['upcomingRenewals'],
    queryFn: async () => {
      const now = new Date()
      const todayStr = now.toISOString().split('T')[0]
      const nextWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 7)
      const nextWeekStr = nextWeek.toISOString().split('T')[0]

      const { data, error } = await supabase
        .from('customer_memberships')
        .select(`
          id,
          end_date,
          status,
          customers (
            id,
            full_name,
            phone
          ),
          memberships (
            name,
            duration_days
          )
        `)
        .eq('status', 'active')
        .lte('end_date', nextWeekStr)
        .gte('end_date', todayStr)
        .order('end_date', { ascending: true })

      if (error) throw error

      // Filtrar pases de 1 día (sesión diaria)
      return (data || []).filter(
        (cm: any) => cm.memberships && cm.memberships.duration_days > 1
      ) as unknown as UpcomingRenewal[]
    },
    refetchInterval: 1000 * 60 * 5, // Refrescar automáticamente cada 5 minutos
  })
}
