import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/config/supabase'

export interface Expense {
  id: string
  description: string
  amount: number
  category: string
  expense_date: string
  receipt_url: string | null
  created_at: string
}

export type CreateExpenseInput = Omit<Expense, 'id' | 'created_at'>

// 1. Hook para obtener todos los gastos operativos
export const useExpenses = () => {
  return useQuery<Expense[]>({
    queryKey: ['expenses'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('expenses')
        .select('*')
        .order('expense_date', { ascending: false })

      if (error) throw error
      return data || []
    },
  })
}

// 2. Hook para registrar un gasto operativo
export const useCreateExpense = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (newExpense: CreateExpenseInput) => {
      const { data, error } = await supabase
        .from('expenses')
        .insert(newExpense)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] })
    },
  })
}

// 3. Hook para eliminar un registro de gasto
export const useDeleteExpense = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('expenses')
        .delete()
        .eq('id', id)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] })
    },
  })
}
