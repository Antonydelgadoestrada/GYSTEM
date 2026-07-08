import React, { createContext, useContext, useEffect, useState } from 'react'
import type { User, Session } from '@supabase/supabase-js'
import { supabase } from '@/config/supabase'

export type UserRole = 'admin' | 'recepcion' | 'entrenador'

interface AuthContextType {
  user: User | null
  session: Session | null
  role: UserRole | null
  permissions: string[]
  isLoading: boolean
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [role, setRole] = useState<UserRole | null>(null)
  const [permissions, setPermissions] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Usar ref para rastrear el ID del usuario resuelto y evitar carreras/llamadas duplicadas
  const lastResolvedUserIdRef = React.useRef<string | null | undefined>(undefined)

  const resolveAndSetRole = async (currentUser: User) => {
    // 1. Consultar public.users como la fuente de verdad (evita datos desincronizados del JWT)
    try {
      console.log('AuthContext: Buscando rol y permisos en BD para', currentUser.id)
      const { data, error } = await supabase
        .from('users')
        .select('role, permissions')
        .eq('id', currentUser.id)
        .single()

      if (!error && data) {
        console.log('AuthContext: Datos obtenidos de la BD:', data)
        setRole(data.role as UserRole)
        setPermissions(data.permissions || [])
        return
      }

      if (error && error.code === 'PGRST116') {
        // Auto-curación si el perfil no está creado en la base de datos
        console.log('AuthContext: Creando perfil por defecto en la BD como admin...')
        const defaultName = currentUser.user_metadata?.full_name || 'Administrador'
        const defaultPerms = ['dashboard', 'clientes', 'membresias', 'pagos', 'gastos', 'personal', 'reportes', 'configuracion']
        const { error: insertError } = await supabase
          .from('users')
          .insert({
            id: currentUser.id,
            email: currentUser.email!,
            role: 'admin',
            full_name: defaultName,
            permissions: defaultPerms,
          })

        if (!insertError) {
          console.log('AuthContext: Perfil creado exitosamente.')
          setRole('admin')
          setPermissions(defaultPerms)
          return
        } else {
          console.error('AuthContext: Error al auto-crear perfil en BD:', insertError)
        }
      }
    } catch (err) {
      console.error('AuthContext: Excepción al obtener rol de la BD:', err)
    }

    // 2. Fallback al metadato del JWT si falla la BD
    const jwtRole = currentUser.user_metadata?.role as UserRole
    if (jwtRole) {
      setRole(jwtRole)
      // Asignar permisos por defecto aproximados según rol si falla la BD
      if (jwtRole === 'admin') {
        setPermissions(['dashboard', 'clientes', 'membresias', 'pagos', 'gastos', 'personal', 'reportes', 'configuracion'])
      } else if (jwtRole === 'recepcion') {
        setPermissions(['dashboard', 'clientes', 'membresias', 'pagos', 'gastos'])
      } else {
        setPermissions(['clientes'])
      }
    } else {
      setRole('admin')
      setPermissions(['dashboard', 'clientes', 'membresias', 'pagos', 'gastos', 'personal', 'reportes', 'configuracion'])
    }
  }

  const handleAuthStateChange = async (newSession: Session | null) => {
    const currentUser = newSession?.user ?? null
    
    // Si el usuario es el mismo que ya resolvimos (o estamos resolviendo), no hacemos nada
    if (lastResolvedUserIdRef.current !== undefined && currentUser?.id === lastResolvedUserIdRef.current) {
      setSession(newSession)
      setUser(currentUser)
      return
    }

    console.log('AuthContext: Procesando cambio de sesión para usuario:', currentUser?.id || 'ninguno')
    lastResolvedUserIdRef.current = currentUser?.id ?? null
    setSession(newSession)
    setUser(currentUser)

    setIsLoading(true)
    try {
      if (currentUser) {
        await resolveAndSetRole(currentUser)
      } else {
        setRole(null)
        setPermissions([])
      }
    } catch (err) {
      console.error('AuthContext: Error al procesar rol:', err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    let isMounted = true

    const initializeAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (isMounted) {
          await handleAuthStateChange(session)
        }
      } catch (err) {
        console.error('AuthContext: Error al inicializar sesión:', err)
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('AuthContext: onAuthStateChange disparado con evento:', event)
      if (isMounted) {
        await handleAuthStateChange(session)
      }
    })

    initializeAuth()

    return () => {
      isMounted = false
      subscription.unsubscribe()
    }
  }, [])

  const signOut = async () => {
    setIsLoading(true)
    try {
      await supabase.auth.signOut()
      lastResolvedUserIdRef.current = null
      setUser(null)
      setSession(null)
      setRole(null)
      setPermissions([])
    } catch (err) {
      console.error('AuthContext: Error al cerrar sesión:', err)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        role,
        permissions,
        isLoading,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth debe ser utilizado dentro de un AuthProvider')
  }
  return context
}
