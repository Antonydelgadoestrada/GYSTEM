import React from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/features/auth/context/AuthContext'
import type { UserRole } from '@/features/auth/context/AuthContext'

interface ProtectedRouteProps {
  children: React.ReactNode
  allowedRoles?: UserRole[]
  requiredPermission?: string
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  allowedRoles,
  requiredPermission
}) => {
  const { user, role, permissions, isLoading } = useAuth()
  const location = useLocation()

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-foreground">
        <div className="flex flex-col items-center space-y-4">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
          <p className="text-sm text-muted-foreground animate-pulse">Cargando sistema...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    // Redirige al login pero guarda la ubicación de procedencia
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  // 1. Validar por rol si se especifican roles permitidos
  if (allowedRoles && role && !allowedRoles.includes(role)) {
    return <Navigate to="/" replace />
  }

  // 2. Validar por permiso granular si se especifica permiso requerido
  if (requiredPermission && (!permissions || !permissions.includes(requiredPermission))) {
    return <Navigate to="/" replace />
  }

  return <>{children}</>
}
