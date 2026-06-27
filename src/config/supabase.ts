import { createClient } from '@supabase/supabase-js'

// Variables de entorno para conectar con Supabase. 
// Se proveen fallbacks para evitar caídas catastróficas si no se configuran al iniciar.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://your-supabase-project.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.placeholder-key'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
