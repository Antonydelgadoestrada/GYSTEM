import React, { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '@/config/supabase'
import { UserPlus, Mail, Lock, Building, User, AlertTriangle } from 'lucide-react'

const registerSchema = z.object({
  gymName: z.string().min(3, 'El nombre del gimnasio debe tener al menos 3 caracteres'),
  fullName: z.string().min(3, 'El nombre completo debe tener al menos 3 caracteres'),
  email: z.string().email('Por favor ingresa un correo electrónico válido'),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
})

type RegisterFormInputs = z.infer<typeof registerSchema>

export const RegisterPage: React.FC = () => {
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [registeredEmail, setRegisteredEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormInputs>({
    resolver: zodResolver(registerSchema),
  })

  const onSubmit = async (data: RegisterFormInputs) => {
    setError(null)
    setLoading(true)

    try {
      // 1. Registrar al usuario administrador en Supabase Auth con los claims metadata
      const { error: signUpError } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: {
            role: 'admin',
            full_name: data.fullName,
          },
        },
      })

      if (signUpError) throw signUpError

      // 2. Intentar actualizar el nombre del gimnasio en la configuración global
      const { data: settings } = await supabase
        .from('gym_settings')
        .select('id')
        .maybeSingle()

      if (settings) {
        await supabase
          .from('gym_settings')
          .update({ name: data.gymName })
          .eq('id', settings.id)
      } else {
        await supabase
          .from('gym_settings')
          .insert({ name: data.gymName })
      }

      setRegisteredEmail(data.email)
      setSuccess(true)
    } catch (err: any) {
      setError(err.message || 'Ocurrió un error al registrar el administrador.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background text-foreground p-6 relative overflow-hidden">
      {/* Fondo Decorativo */}
      <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-primary/20 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>

      <div className="max-w-md w-full space-y-8 z-10">
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-extrabold tracking-tight bg-gradient-to-r from-violet-400 to-indigo-500 bg-clip-text text-transparent">
            GYMFLOW
          </h1>
          <p className="text-muted-foreground text-sm">
            SaaS de Gestión Inteligente para Gimnasios
          </p>
        </div>

        <div className="bg-card border border-border/60 rounded-2xl p-8 shadow-2xl backdrop-blur-md">
          {success ? (
            <div className="text-center space-y-5 py-4">
              <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 mb-2 animate-bounce">
                <Mail className="h-8 w-8" />
              </div>
              <h2 className="text-2xl font-bold tracking-tight text-foreground">¡Verifica tu correo!</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Hemos enviado un correo de confirmación a <span className="font-semibold text-primary">{registeredEmail}</span>.
              </p>
              <div className="text-xs text-muted-foreground leading-relaxed bg-secondary/30 p-4 rounded-xl border border-border/40 text-left space-y-1.5">
                <p className="font-semibold text-foreground text-center mb-1">Pasos a seguir:</p>
                <p>1. Ve a tu bandeja de entrada y abre el correo de GYMFLOW.</p>
                <p>2. Haz clic en el botón de confirmación para activar tu cuenta.</p>
                <p>3. Regresa aquí e inicia sesión con tus credenciales.</p>
                <p className="text-[10px] text-muted-foreground/80 mt-2 text-center">(No olvides revisar tu carpeta de spam si no lo encuentras)</p>
              </div>
              <button
                onClick={() => navigate('/login')}
                className="w-full mt-6 bg-primary hover:bg-primary/95 text-primary-foreground font-semibold py-2.5 rounded-xl text-sm flex items-center justify-center space-x-2 transition-all active:scale-[0.98] shadow-lg shadow-primary/20 cursor-pointer"
              >
                <span>Ir al Inicio de Sesión</span>
              </button>
            </div>
          ) : (
            <>
              <div className="space-y-2 mb-6">
                <h2 className="text-2xl font-bold tracking-tight text-foreground">Crear tu Cuenta</h2>
                <p className="text-sm text-muted-foreground">
                  Registra tu gimnasio y tu usuario de administrador.
                </p>
              </div>

              {error && (
                <div className="mb-6 p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm flex items-start space-x-2">
                  <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Nombre del Gimnasio
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground pointer-events-none">
                      <Building className="h-4 w-4" />
                    </span>
                    <input
                      type="text"
                      className="w-full bg-secondary/50 border border-border/80 rounded-xl py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all placeholder:text-muted-foreground/60"
                      placeholder="Ej: Power Box CrossFit"
                      {...register('gymName')}
                    />
                  </div>
                  {errors.gymName && (
                    <p className="text-xs text-destructive mt-1 font-medium">{errors.gymName.message}</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Tu Nombre Completo
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground pointer-events-none">
                      <User className="h-4 w-4" />
                    </span>
                    <input
                      type="text"
                      className="w-full bg-secondary/50 border border-border/80 rounded-xl py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all placeholder:text-muted-foreground/60"
                      placeholder="Ej: Juan Pérez"
                      {...register('fullName')}
                    />
                  </div>
                  {errors.fullName && (
                    <p className="text-xs text-destructive mt-1 font-medium">{errors.fullName.message}</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Correo Electrónico
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground pointer-events-none">
                      <Mail className="h-4 w-4" />
                    </span>
                    <input
                      type="email"
                      className="w-full bg-secondary/50 border border-border/80 rounded-xl py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all placeholder:text-muted-foreground/60"
                      placeholder="ejemplo@gimnasio.com"
                      {...register('email')}
                    />
                  </div>
                  {errors.email && (
                    <p className="text-xs text-destructive mt-1 font-medium">{errors.email.message}</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Contraseña
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground pointer-events-none">
                      <Lock className="h-4 w-4" />
                    </span>
                    <input
                      type="password"
                      className="w-full bg-secondary/50 border border-border/80 rounded-xl py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all placeholder:text-muted-foreground/60"
                      placeholder="Mínimo 6 caracteres"
                      {...register('password')}
                    />
                  </div>
                  {errors.password && (
                    <p className="text-xs text-destructive mt-1 font-medium">{errors.password.message}</p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full mt-6 bg-primary hover:bg-primary/95 text-primary-foreground font-semibold py-2.5 rounded-xl text-sm flex items-center justify-center space-x-2 transition-all active:scale-[0.98] shadow-lg shadow-primary/20 disabled:opacity-50 disabled:pointer-events-none"
                >
                  {loading ? (
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent"></div>
                  ) : (
                    <>
                      <UserPlus className="h-4 w-4" />
                      <span>Registrar Gimnasio</span>
                    </>
                  )}
                </button>
              </form>

              <div className="mt-8 pt-6 border-t border-border/40 text-center">
                <p className="text-sm text-muted-foreground">
                  ¿Ya tienes una cuenta registrada?{' '}
                  <Link
                    to="/login"
                    className="font-semibold text-primary hover:text-primary/95 hover:underline transition-all"
                  >
                    Inicia sesión
                  </Link>
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
