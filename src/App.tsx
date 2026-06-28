import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from '@/features/auth/context/AuthContext'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { LoginPage } from '@/features/auth/pages/LoginPage'
import { RegisterPage } from '@/features/auth/pages/RegisterPage'
import { DashboardLayout } from '@/layouts/DashboardLayout'
import { DashboardPage } from '@/features/dashboard/pages/DashboardPage'
import { CustomersPage } from '@/features/customers/pages/CustomersPage'
import { CustomerDetailsPage } from '@/features/customers/pages/CustomerDetailsPage'
import { MembershipsPage } from '@/features/memberships/pages/MembershipsPage'
import { PaymentsPage } from '@/features/payments/pages/PaymentsPage'
import { ExpensesPage } from '@/features/expenses/pages/ExpensesPage'
import { ReportsPage } from '@/features/reports/pages/ReportsPage'
import { SettingsPage } from '@/features/settings/pages/SettingsPage'
import { UsersPage } from '@/features/users/pages/UsersPage'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 1000 * 60 * 2, // Mantener los datos "frescos" por 2 minutos para evitar recargas constantes al cambiar de pantalla
      gcTime: 1000 * 60 * 10,   // Mantener en el recolector de basura por 10 minutos
    },
  },
})

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router>
          <Routes>
            {/* Rutas Públicas de Autenticación y Registro */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />

            {/* Panel del Gimnasio (Protegido por Rol Global) */}
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <DashboardLayout />
                </ProtectedRoute>
              }
            >
              {/* Dashboard Index - Accesible por permiso dashboard */}
              <Route
                index
                element={
                  <ProtectedRoute requiredPermission="dashboard">
                    <DashboardPage />
                  </ProtectedRoute>
                }
              />

              {/* Clientes - Accesible por permiso clientes */}
              <Route
                path="clientes"
                element={
                  <ProtectedRoute requiredPermission="clientes">
                    <CustomersPage />
                  </ProtectedRoute>
                }
              />

              <Route
                path="clientes/:id"
                element={
                  <ProtectedRoute requiredPermission="clientes">
                    <CustomerDetailsPage />
                  </ProtectedRoute>
                }
              />

              {/* Membresías (Planes) - Accesible por permiso membresias */}
              <Route
                path="membresias"
                element={
                  <ProtectedRoute requiredPermission="membresias">
                    <MembershipsPage />
                  </ProtectedRoute>
                }
              />

              {/* Pagos / Caja - Accesible por permiso pagos */}
              <Route
                path="pagos"
                element={
                  <ProtectedRoute requiredPermission="pagos">
                    <PaymentsPage />
                  </ProtectedRoute>
                }
              />

              {/* Gastos - Accesible por permiso gastos */}
              <Route
                path="gastos"
                element={
                  <ProtectedRoute requiredPermission="gastos">
                    <ExpensesPage />
                  </ProtectedRoute>
                }
              />

              {/* Reportes y KPIs - Accesible por permiso reportes */}
              <Route
                path="reportes"
                element={
                  <ProtectedRoute requiredPermission="reportes">
                    <ReportsPage />
                  </ProtectedRoute>
                }
              />

              {/* Configuración - Accesible por permiso configuracion */}
              <Route
                path="configuracion"
                element={
                  <ProtectedRoute requiredPermission="configuracion">
                    <SettingsPage />
                  </ProtectedRoute>
                }
              />

              {/* Personal - Accesible por permiso personal */}
              <Route
                path="personal"
                element={
                  <ProtectedRoute requiredPermission="personal">
                    <UsersPage />
                  </ProtectedRoute>
                }
              />
            </Route>

            {/* Redirección ante rutas inexistentes */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Router>
      </AuthProvider>
    </QueryClientProvider>
  )
}

export default App
