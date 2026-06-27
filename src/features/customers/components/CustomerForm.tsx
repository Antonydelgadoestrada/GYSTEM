import React, { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import type { CreateCustomerInput, Customer } from '../hooks/useCustomers'
import { supabase } from '@/config/supabase'
import { BusquedaDNI } from './BusquedaDNI'
import { User, Mail, Phone, Calendar, Key, FileText, Camera, AlertCircle, X, Save, RefreshCw } from 'lucide-react'

const customerSchema = z.object({
  dni: z.string().max(20).optional().or(z.literal('')),
  full_name: z.string().min(3, 'El nombre completo debe tener al menos 3 caracteres'),
  email: z.string().email('Por favor ingresa un correo electrónico válido').optional().or(z.literal('')),
  phone: z.string().optional(),
  birth_date: z.string().optional().or(z.literal('')),
  access_code: z.string().optional().or(z.literal('')),
  status: z.enum(['active', 'inactive']),
  notes: z.string().optional(),
  photo_url: z.string().optional(),
})

type CustomerFormValues = z.infer<typeof customerSchema>

interface CustomerFormProps {
  initialData?: Customer
  onSubmit: (data: CreateCustomerInput) => void
  onCancel: () => void
  isSubmitting: boolean
}

export const CustomerForm: React.FC<CustomerFormProps> = ({
  initialData,
  onSubmit,
  onCancel,
  isSubmitting,
}) => {
  const [uploading, setUploading] = useState(false)
  const [photoPreview, setPhotoPreview] = useState<string | null>(initialData?.photo_url || null)
  const [uploadError, setUploadError] = useState<string | null>(null)

  // Estados de consulta DNI
  const [isMinor, setIsMinor] = useState(initialData?.notes?.includes('Menor de edad') || false)

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<CustomerFormValues>({
    resolver: zodResolver(customerSchema),
    defaultValues: initialData
      ? {
          dni: initialData.dni || '',
          full_name: initialData.full_name,
          email: initialData.email || '',
          phone: initialData.phone || '',
          birth_date: initialData.birth_date || '',
          access_code: initialData.access_code || '',
          status: initialData.status,
          notes: initialData.notes || '',
          photo_url: initialData.photo_url || '',
        }
      : {
          dni: '',
          full_name: '',
          email: '',
          phone: '',
          birth_date: '',
          access_code: Math.floor(100000 + Math.random() * 900000).toString(),
          status: 'active',
          notes: '',
          photo_url: '',
        },
  })

  // Manejar subida de foto a Supabase Storage
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    setUploadError(null)

    try {
      // Crear vista previa local inmediata
      const localUrl = URL.createObjectURL(file)
      setPhotoPreview(localUrl)

      // Subir archivo
      const fileExt = file.name.split('.').pop()
      const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`
      const filePath = `customer-photos/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('customer-photos')
        .upload(filePath, file)

      if (uploadError) {
        if (uploadError.message.includes('Bucket not found')) {
          throw new Error('Cubo no encontrado. Recuerda crear un Bucket público llamado "customer-photos" en el almacenamiento de tu consola de Supabase.')
        }
        throw uploadError
      }

      // Obtener URL pública
      const { data } = supabase.storage.from('customer-photos').getPublicUrl(filePath)
      setValue('photo_url', data.publicUrl)
    } catch (err: any) {
      console.error(err)
      setUploadError(err.message || 'Error al subir la fotografía.')
    } finally {
      setUploading(false)
    }
  }

  const handleFormSubmit = (data: CustomerFormValues) => {
    // Sanitizar campos vacíos para no guardar cadenas vacías en lugar de nulos
    const sanitizedData: CreateCustomerInput = {
      dni: data.dni || null,
      full_name: data.full_name,
      email: data.email || null,
      phone: data.phone || null,
      birth_date: data.birth_date || null,
      access_code: data.access_code || null,
      status: data.status,
      notes: isMinor && !data.notes?.includes('Menor de edad')
        ? `Menor de edad. ${data.notes || ''}`.trim()
        : data.notes || null,
      photo_url: data.photo_url || null,
    }
    onSubmit(sanitizedData)
  }

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4 max-h-[80vh] overflow-y-auto pr-2">
      {/* Subida de Fotografía */}
      <div className="flex flex-col items-center space-y-2 pb-4 border-b border-border/40">
        <div className="relative h-24 w-24 rounded-full border-2 border-dashed border-border flex items-center justify-center bg-secondary/20 overflow-hidden group">
          {photoPreview ? (
            <img src={photoPreview} alt="Preview" className="h-full w-full object-cover" />
          ) : (
            <User className="h-10 w-10 text-muted-foreground" />
          )}

          {/* Overlay Hover */}
          <label className="absolute inset-0 bg-background/80 flex flex-col items-center justify-center text-[10px] text-muted-foreground opacity-0 group-hover:opacity-100 cursor-pointer transition-all">
            <Camera className="h-5 w-5 mb-0.5" />
            <span>Subir Foto</span>
            <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
          </label>
        </div>

        {uploading && <p className="text-[10px] text-primary animate-pulse font-semibold">Subiendo imagen...</p>}
        {uploadError && (
          <div className="p-2 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-[10px] max-w-xs text-center flex items-center space-x-1">
            <AlertCircle className="h-3 w-3 shrink-0" />
            <span>{uploadError}</span>
          </div>
        )}
      </div>

      {/* Buscador de DNI & Menor de edad checkbox */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
        <div className="md:col-span-2">
          <BusquedaDNI
            initialDni={watch('dni')}
            onSuccess={(data) => {
              setValue('dni', data.dni)
              setValue('full_name', data.nombreCompleto)
              setIsMinor(false)
            }}
            onMinorDetected={() => {
              setIsMinor(true)
              setValue('full_name', '')
            }}
            onChange={(val) => {
              setValue('dni', val)
            }}
          />
        </div>

        <div className="space-y-1.5 md:col-span-1 h-[70px] flex items-end pb-3">
          <label className="flex items-center space-x-1.5 text-xs text-muted-foreground font-semibold cursor-pointer select-none">
            <input
              type="checkbox"
              className="rounded bg-background border-border text-primary focus:ring-primary h-3.5 w-3.5 cursor-pointer"
              checked={isMinor}
              onChange={(e) => {
                setIsMinor(e.target.checked)
                if (e.target.checked) {
                  setValue('full_name', '')
                }
              }}
            />
            <span>Menor de Edad</span>
          </label>
        </div>
      </div>

      {/* Nombre Completo */}
      <div className="space-y-1.5">
        <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Nombre Completo
        </label>
        <div className="relative">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground pointer-events-none">
            <User className="h-4 w-4" />
          </span>
          <input
            type="text"
            className="w-full bg-secondary/40 border border-border/80 rounded-xl py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all placeholder:text-muted-foreground/60"
            placeholder="Ej: Juan Antonio Pérez"
            {...register('full_name')}
          />
        </div>
        {errors.full_name && (
          <p className="text-xs text-destructive mt-1 font-medium">{errors.full_name.message}</p>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Correo Electrónico */}
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
              className="w-full bg-secondary/40 border border-border/80 rounded-xl py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all placeholder:text-muted-foreground/60"
              placeholder="ejemplo@correo.com"
              {...register('email')}
            />
          </div>
          {errors.email && (
            <p className="text-xs text-destructive mt-1 font-medium">{errors.email.message}</p>
          )}
        </div>

        {/* Teléfono */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Teléfono de Contacto
          </label>
          <div className="relative">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground pointer-events-none">
              <Phone className="h-4 w-4" />
            </span>
            <input
              type="text"
              className="w-full bg-secondary/40 border border-border/80 rounded-xl py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all placeholder:text-muted-foreground/60"
              placeholder="+51 987 654 321"
              {...register('phone')}
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Fecha de Nacimiento */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Fecha de Nacimiento
          </label>
          <div className="relative">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground pointer-events-none">
              <Calendar className="h-4 w-4" />
            </span>
            <input
              type="date"
              className="w-full bg-secondary/40 border border-border/80 rounded-xl py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
              {...register('birth_date')}
            />
          </div>
        </div>

        {/* Código de Acceso Físico */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            PIN / Código de Acceso (Generado)
          </label>
          <div className="flex space-x-2">
            <div className="relative flex-1">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground pointer-events-none">
                <Key className="h-4 w-4" />
              </span>
              <input
                type="text"
                className="w-full bg-secondary/30 border border-border/80 rounded-xl py-2.5 pl-10 pr-4 text-sm focus:outline-none transition-all text-muted-foreground"
                placeholder="PIN"
                readOnly
                {...register('access_code')}
              />
            </div>
            <button
              type="button"
              onClick={() => setValue('access_code', Math.floor(100000 + Math.random() * 900000).toString())}
              className="px-4 py-2 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 hover:border-primary/30 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-all active:scale-[0.98] cursor-pointer"
              title="Generar PIN aleatorio de 6 dígitos"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span>Generar</span>
            </button>
          </div>
          {errors.access_code && (
            <p className="text-xs text-destructive mt-1 font-medium">{errors.access_code.message}</p>
          )}
        </div>
      </div>

      {/* Estado y Notas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-1.5 md:col-span-1">
          <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Estado
          </label>
          <select
            className="w-full bg-secondary/40 border border-border/80 rounded-xl py-2.5 px-3 text-sm focus:outline-none focus:border-primary transition-all"
            {...register('status')}
          >
            <option value="active">Activo</option>
            <option value="inactive">Inactivo</option>
          </select>
        </div>

        <div className="space-y-1.5 md:col-span-2">
          <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Observaciones Médicas / Notas
          </label>
          <div className="relative">
            <span className="absolute top-3 left-3 text-muted-foreground pointer-events-none">
              <FileText className="h-4 w-4" />
            </span>
            <textarea
              className="w-full bg-secondary/40 border border-border/80 rounded-xl py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:border-primary transition-all placeholder:text-muted-foreground/60 min-h-[42px] max-h-[120px]"
              placeholder="Lesiones, alergias, objetivos de entrenamiento..."
              {...register('notes')}
            />
          </div>
        </div>
      </div>

      {/* Acciones */}
      <div className="flex items-center justify-end space-x-3 pt-4 border-t border-border/40">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 rounded-xl text-sm font-semibold border border-border hover:bg-secondary/40 transition-all flex items-center space-x-1.5"
        >
          <X className="h-4 w-4" />
          <span>Cancelar</span>
        </button>
        <button
          type="submit"
          disabled={isSubmitting || uploading}
          className="px-4 py-2 rounded-xl text-sm font-semibold bg-primary hover:bg-primary/95 text-primary-foreground transition-all flex items-center space-x-1.5 shadow-lg shadow-primary/20"
        >
          {isSubmitting ? (
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent"></div>
          ) : (
            <>
              <Save className="h-4 w-4" />
              <span>Guardar</span>
            </>
          )}
        </button>
      </div>
    </form>
  )
}
