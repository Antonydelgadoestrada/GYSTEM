import React from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/features/auth/context/AuthContext'
import type { UserRole } from '@/features/auth/context/AuthContext'

import { DashboardSkeleton } from '@/components/DashboardSkeleton'

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
    return <DashboardSkeleton />
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
