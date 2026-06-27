import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useCustomerDetails } from '../hooks/useCustomers'
import { useGymSettings } from '@/features/settings/hooks/useGymSettings'
import { formatMoney } from '@/utils/currency'
import { supabase } from '@/config/supabase'
import {
  User,
  Phone,
  Mail,
  Calendar,
  Key,
  FileText,
  ChevronLeft,
  Award,
  MessageSquare,
  AlertTriangle,
  History,
  HelpCircle,
  Plus,
  RefreshCw
} from 'lucide-react'
import { AssignMembershipModal } from '@/features/payments/components/AssignMembershipModal'

export const CustomerDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [gymName, setGymName] = useState('Mi Gimnasio')
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false)
  
  // Obtener configuración del gimnasio (moneda, etc)
  const { data: settings } = useGymSettings()

  // Obtener detalles del cliente
  const { data: customer, isLoading, isError, error } = useCustomerDetails(id)

  // Cargar nombre del Gimnasio para los mensajes de WhatsApp
  useEffect(() => {
    supabase
      .from('gym_settings')
      .select('name')
      .maybeSingle()
      .then(({ data }) => {
        if (data) setGymName(data.name)
      })
  }, [])

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-foreground">
        <div className="flex flex-col items-center space-y-4">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
          <p className="text-sm text-muted-foreground">Cargando expediente del cliente...</p>
        </div>
      </div>
    )
  }

  if (isError || !customer) {
    return (
      <div className="text-center py-20 p-6 bg-card border border-border/60 rounded-2xl max-w-xl mx-auto space-y-4">
        <AlertTriangle className="h-12 w-12 text-destructive mx-auto" />
        <h3 className="text-lg font-semibold">Error al ubicar al cliente</h3>
        <p className="text-sm text-muted-foreground">{(error as any)?.message || 'El cliente solicitado no existe.'}</p>
        <button
          onClick={() => navigate('/clientes')}
          className="px-4 py-2 bg-secondary text-foreground rounded-xl border border-border hover:bg-secondary/80 text-sm font-semibold transition-all"
        >
          Regresar al listado
        </button>
      </div>
    )
  }

  // Filtrar membresías activas o vencidas
  const activeMembership = customer.customer_memberships?.find((m) => m.status === 'active')

  // Calcular total pagado históricamente por el cliente
  const totalPaid = customer.customer_memberships?.reduce((sumCM, cm) => {
    return sumCM + (cm.payments?.filter(p => p.status === 'paid').reduce((sumP, p) => sumP + Number(p.amount), 0) || 0)
  }, 0) || 0

  // Generar link de WhatsApp para cobro o recordatorio
  const sendWhatsAppReminder = (membershipName: string, endDateStr: string) => {
    if (!customer.phone) return

    // Limpiar teléfono
    const cleanPhone = customer.phone.replace(/[^\d+]/g, '')
    const formattedDate = new Date(endDateStr).toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })

    const message = `Hola ${customer.full_name}, te escribimos de ${gymName} 🏋️. Te recordamos que tu membresía (${membershipName}) vence el ${formattedDate}. ¡Te esperamos para seguir entrenando fuerte! 💪`
    const encodedMessage = encodeURIComponent(message)
    
    window.open(`https://wa.me/${cleanPhone}?text=${encodedMessage}`, '_blank')
  }

  const translateMembershipStatus = (status: string) => {
    switch (status) {
      case 'active':
        return { label: 'Activo', class: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' }
      case 'pending':
        return { label: 'Pendiente', class: 'bg-amber-500/10 text-amber-400 border-amber-500/20' }
      case 'expired':
        return { label: 'Vencido', class: 'bg-destructive/10 text-destructive border-destructive/20' }
      case 'cancelled':
        return { label: 'Cancelado', class: 'bg-muted/10 text-muted-foreground border-muted/20' }
      default:
        return { label: status, class: 'bg-muted/10 text-muted-foreground border-muted/20' }
    }
  }

  const translatePaymentMethod = (method: string) => {
    const m = method.toLowerCase()
    if (m.includes('efectivo') || m === 'cash') return 'Efectivo'
    if (m.includes('tarjeta') || m === 'card') return 'Tarjeta'
    if (m.includes('yape')) return 'Yape'
    if (m.includes('plin')) return 'Plin'
    if (m.includes('transferencia') || m === 'transfer') return 'Transferencia'
    return method
  }

  return (
    <div className="space-y-6">
      {/* Botón de regreso */}
      <button
        onClick={() => navigate('/clientes')}
        className="flex items-center space-x-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-all"
      >
        <ChevronLeft className="h-4 w-4" />
        <span>Volver a Clientes</span>
      </button>

      {/* Grid Principal */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* 1. Tarjeta de Ficha de Perfil (Izquierda) */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-card border border-border/60 rounded-2xl p-6 shadow-sm text-center">
            {/* Foto Perfil */}
            <div className="h-28 w-28 rounded-full border border-border bg-secondary/40 overflow-hidden mx-auto mb-4 flex items-center justify-center text-muted-foreground">
              {customer.photo_url ? (
                <img src={customer.photo_url} alt={customer.full_name} className="h-full w-full object-cover" />
              ) : (
                <User className="h-12 w-12" />
              )}
            </div>

            <h2 className="text-xl font-bold tracking-tight">{customer.full_name}</h2>
            <span
              className={`inline-flex items-center px-2 py-0.5 mt-2 rounded-full text-xs font-semibold border ${
                customer.status === 'active'
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                  : 'bg-muted/10 text-muted-foreground border-muted/20'
              }`}
            >
              {customer.status === 'active' ? 'Atleta Activo' : 'Inactivo'}
            </span>

            {/* Info de contacto */}
            <div className="mt-6 space-y-3 text-sm text-muted-foreground font-medium text-left border-t border-border/40 pt-6">
              {customer.phone && (
                <div className="flex items-center space-x-3">
                  <Phone className="h-4 w-4 shrink-0 text-primary" />
                  <span className="truncate">{customer.phone}</span>
                </div>
              )}
              {customer.email && (
                <div className="flex items-center space-x-3">
                  <Mail className="h-4 w-4 shrink-0 text-primary" />
                  <span className="truncate">{customer.email}</span>
                </div>
              )}
              {customer.birth_date && (
                <div className="flex items-center space-x-3">
                  <Calendar className="h-4 w-4 shrink-0 text-primary" />
                  <span>
                    Nacimiento: {new Date(customer.birth_date).toLocaleDateString('es-ES', { timeZone: 'UTC' })}
                  </span>
                </div>
              )}
              {customer.access_code && (
                <div className="flex items-center space-x-3 text-violet-400">
                  <Key className="h-4 w-4 shrink-0" />
                  <span className="font-semibold bg-violet-500/10 px-2 py-0.5 rounded border border-violet-500/20">PIN: {customer.access_code}</span>
                </div>
              )}
            </div>

            {/* Acciones de WhatsApp */}
            {customer.phone && activeMembership && (
              <div className="mt-6 pt-4 border-t border-border/40">
                <button
                  onClick={() => sendWhatsAppReminder(activeMembership.memberships.name, activeMembership.end_date)}
                  className="w-full bg-emerald-500/10 hover:bg-emerald-500/15 border border-emerald-500/20 text-emerald-400 font-semibold py-2.5 rounded-xl text-xs flex items-center justify-center space-x-2 transition-all active:scale-[0.98]"
                >
                  <MessageSquare className="h-4 w-4" />
                  <span>Enviar Recordatorio WhatsApp</span>
                </button>
              </div>
            )}
          </div>

          {/* Tarjeta de Observaciones Médicas */}
          <div className="bg-card border border-border/60 rounded-2xl p-6 shadow-sm space-y-4">
            <h3 className="font-bold text-sm uppercase tracking-wider text-muted-foreground flex items-center space-x-2">
              <FileText className="h-4 w-4 text-primary" />
              <span>Observaciones / Notas</span>
            </h3>
            <p className="text-sm text-muted-foreground whitespace-pre-line leading-relaxed">
              {customer.notes || 'Sin anotaciones médicas u observaciones registradas.'}
            </p>
          </div>
        </div>

        {/* 2. Sección de Membresías y Pagos (Centro / Derecha) */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Membresía Activa */}
          <div className="bg-card border border-border/60 rounded-2xl p-6 shadow-sm space-y-4">
            <h3 className="font-bold text-lg tracking-tight flex items-center space-x-2">
              <Award className="h-5 w-5 text-primary" />
              <span>Membresía Activa</span>
            </h3>

            {activeMembership ? (
              <div className="p-5 rounded-2xl bg-primary/5 border border-primary/10 flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                <div className="space-y-1">
                  <h4 className="font-extrabold text-lg text-primary">{activeMembership.memberships.name}</h4>
                  <p className="text-xs text-muted-foreground font-semibold">
                    Vigencia: {new Date(activeMembership.start_date).toLocaleDateString('es-ES', { timeZone: 'UTC' })} al {new Date(activeMembership.end_date).toLocaleDateString('es-ES', { timeZone: 'UTC' })}
                  </p>
                </div>
                <div className="flex items-center space-x-4">
                  <div className="text-right">
                    <span className="text-sm text-muted-foreground font-medium">Costo Total</span>
                    <h5 className="text-xl font-bold">{formatMoney(activeMembership.memberships.price, settings)}</h5>
                  </div>
                  <div className="flex flex-col items-end space-y-2">
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      Vigente
                    </span>
                    <button
                      onClick={() => setIsAssignModalOpen(true)}
                      className="bg-primary hover:bg-primary/95 text-primary-foreground font-semibold px-3 py-1.5 rounded-xl text-[11px] flex items-center justify-center space-x-1 transition-all active:scale-[0.98] shadow-md shadow-primary/15 cursor-pointer"
                    >
                      <RefreshCw className="h-3 w-3 animate-hover-spin" />
                      <span>Renovar</span>
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-6 text-center border border-dashed border-border rounded-2xl space-y-4">
                <HelpCircle className="h-8 w-8 text-muted-foreground mx-auto opacity-60" />
                <div className="space-y-1">
                  <h4 className="font-semibold text-sm text-foreground">Sin membresía vigente</h4>
                  <p className="text-xs text-muted-foreground max-w-xs mx-auto">
                    El cliente no cuenta con ningún pase de entrenamiento activo en este momento.
                  </p>
                </div>
                <button
                  onClick={() => setIsAssignModalOpen(true)}
                  className="bg-primary hover:bg-primary/95 text-primary-foreground font-semibold px-4 py-2 rounded-xl text-xs inline-flex items-center justify-center space-x-1.5 transition-all active:scale-[0.98] shadow-lg shadow-primary/20 cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Asignar Membresía</span>
                </button>
              </div>
            )}
          </div>

          {/* Historial Financiero y Pagos */}
          <div className="bg-card border border-border/60 rounded-2xl p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-border/40 pb-3">
              <h3 className="font-bold text-lg tracking-tight flex items-center space-x-2">
                <History className="h-5 w-5 text-primary" />
                <span>Historial de Pagos</span>
              </h3>
              <div className="text-right">
                <span className="text-xs text-muted-foreground uppercase font-semibold">Inversión Total</span>
                <p className="font-extrabold text-sm text-primary">{formatMoney(totalPaid, settings)}</p>
              </div>
            </div>

            {/* Listado de Pagos de las Membresías */}
            <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2">
              {(() => {
                const payments = customer.customer_memberships?.flatMap(cm => 
                  cm.payments?.map(payment => ({
                    ...payment,
                    membershipName: cm.memberships.name
                  })) || []
                ) || []

                if (customer.customer_memberships?.length === 0) {
                  return <p className="text-sm text-muted-foreground text-center py-6">No se registran transacciones de pago.</p>
                }

                if (payments.length === 0) {
                  return <p className="text-sm text-muted-foreground text-center py-6">No se registran pagos consolidados aún.</p>
                }

                return payments.map(payment => (
                  <div key={payment.id} className="flex justify-between items-center p-3.5 bg-secondary/20 rounded-xl border border-border/40">
                    <div className="space-y-1 bg-transparent">
                      <h4 className="text-sm font-bold truncate max-w-[200px] sm:max-w-xs">{payment.membershipName}</h4>
                      <p className="text-[10px] text-muted-foreground font-semibold flex items-center space-x-1.5">
                        <span>{translatePaymentMethod(payment.payment_method)}</span>
                        <span>•</span>
                        <span>{new Date(payment.payment_date).toLocaleDateString('es-ES', { timeZone: 'UTC' })}</span>
                      </p>
                      {payment.notes && (
                        <p className="text-[11px] text-muted-foreground mt-1 italic font-normal max-w-[200px] sm:max-w-xs break-words">
                          Nota: {payment.notes}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center space-x-3 bg-transparent">
                      <span className="font-bold text-sm">{formatMoney(payment.amount, settings)}</span>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-semibold border ${
                        payment.status === 'paid'
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                          : 'bg-destructive/10 text-destructive border-destructive/20'
                      }`}>
                        {payment.status === 'paid' ? 'Pagado' : 'Anulado'}
                      </span>
                    </div>
                  </div>
                ))
              })()}
            </div>
          </div>

          {/* Historial de Membresías (Detalle Completo) */}
          <div className="bg-card border border-border/60 rounded-2xl p-6 shadow-sm space-y-4">
            <h3 className="font-bold text-lg tracking-tight flex items-center space-x-2">
              <Award className="h-5 w-5 text-primary" />
              <span>Historial de Planes Adquiridos</span>
            </h3>

            <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2">
              {customer.customer_memberships?.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">El cliente no ha adquirido ninguna membresía.</p>
              ) : (
                customer.customer_memberships.map((cm) => {
                  const badge = translateMembershipStatus(cm.status)
                  return (
                    <div key={cm.id} className="p-4 bg-secondary/15 rounded-xl border border-border/40 flex justify-between items-center gap-4">
                      <div className="space-y-1">
                        <h4 className="font-bold text-sm">{cm.memberships.name}</h4>
                        <p className="text-[10px] text-muted-foreground font-semibold">
                          Del {new Date(cm.start_date).toLocaleDateString('es-ES', { timeZone: 'UTC' })} al {new Date(cm.end_date).toLocaleDateString('es-ES', { timeZone: 'UTC' })}
                        </p>
                      </div>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${badge.class}`}>
                        {badge.label}
                      </span>
                    </div>
                  )
                })
              )}
            </div>
          </div>

        </div>
      </div>

      {isAssignModalOpen && (
        <AssignMembershipModal
          onClose={() => setIsAssignModalOpen(false)}
          preselectedCustomerId={customer.id}
        />
      )}
    </div>
  )
}
