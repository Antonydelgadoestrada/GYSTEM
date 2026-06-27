import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/config/supabase'
import { createClient } from '@supabase/supabase-js'

export interface StaffUser {
  id: string
  email: string
  role: 'admin' | 'recepcion' | 'entrenador'
  full_name: string
  permissions: string[]
  created_at: string
  updated_at: string
}

export interface CreateStaffUserInput {
  email: string
  password?: string
  full_name: string
  role: 'admin' | 'recepcion' | 'entrenador'
  permissions: string[]
}

// Cliente de Supabase temporal sin persistencia de sesión.
// Esto permite que el administrador registre otros usuarios (personal)
// sin que su propia sesión de administrador se cierre o se vea afectada.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

const tempSupabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false
  }
})

// 1. Hook para obtener todos los usuarios del staff
export const useUsers = () => {
  return useQuery<StaffUser[]>({
    queryKey: ['staffUsers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('full_name', { ascending: true })

      if (error) throw error
      return data as StaffUser[]
    },
  })
}

// 2. Hook para registrar un nuevo miembro del staff
export const useCreateUser = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ email, password, full_name, role, permissions }: CreateStaffUserInput) => {
      if (!password) {
        throw new Error('La contraseña es requerida para nuevos usuarios.')
      }

      // 1. Registrar en Supabase Auth usando el cliente temporal
      const { data, error } = await tempSupabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            role,
            full_name,
          },
        },
      })

      if (error) throw error
      if (!data.user) throw new Error('No se pudo crear el usuario en Auth.')

      // 2. Actualizar permisos específicos en la tabla users
      // (el trigger en la base de datos ya insertó la fila, así que hacemos un update)
      const { error: updateError } = await supabase
        .from('users')
        .update({ permissions })
        .eq('id', data.user.id)

      if (updateError) throw updateError
      return data.user
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staffUsers'] })
    },
  })
}

// 3. Hook para actualizar un miembro del staff
export const useUpdateUser = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, full_name, role, permissions }: { id: string; full_name: string; role: 'admin' | 'recepcion' | 'entrenador'; permissions: string[] }) => {
      const { data, error } = await supabase
        .from('users')
        .update({ full_name, role, permissions })
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return data as StaffUser
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staffUsers'] })
    },
  })
}

// 4. Hook para eliminar un miembro del staff
export const useDeleteUser = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      // Nota: Elimina el perfil público de la tabla users.
      // El usuario de Supabase Auth persistirá, pero al no tener un perfil asociado
      // en public.users, no podrá adquirir un rol y no tendrá acceso al sistema.
      const { error } = await supabase
        .from('users')
        .delete()
        .eq('id', id)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staffUsers'] })
    },
  })
}
