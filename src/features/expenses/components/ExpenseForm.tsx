import React, { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import type { CreateExpenseInput } from '../hooks/useExpenses'
import { supabase } from '@/config/supabase'
import { FileText, DollarSign, Calendar, Tag, Paperclip, AlertCircle, X, Save } from 'lucide-react'

const expenseSchema = z.object({
  description: z.string().min(3, 'La descripción debe tener al menos 3 caracteres'),
  amount: z.number().min(0.01, 'El monto del gasto debe ser mayor a 0'),
  category: z.string().min(1, 'Debe seleccionar una categoría'),
  expense_date: z.string().min(1, 'Debe ingresar la fecha del gasto'),
  receipt_url: z.string().optional().or(z.literal('')),
})

type ExpenseFormValues = z.infer<typeof expenseSchema>

interface ExpenseFormProps {
  onSubmit: (data: CreateExpenseInput) => void
  onCancel: () => void
  isSubmitting: boolean
}

export const ExpenseForm: React.FC<ExpenseFormProps> = ({
  onSubmit,
  onCancel,
  isSubmitting,
}) => {
  const [uploading, setUploading] = useState(false)
  const [receiptName, setReceiptName] = useState<string | null>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<ExpenseFormValues>({
    resolver: zodResolver(expenseSchema),
    defaultValues: {
      description: '',
      amount: 0,
      category: 'Servicios',
      expense_date: new Date().toISOString().split('T')[0],
      receipt_url: '',
    },
  })

  // Manejar subida de comprobantes a Supabase Storage
  const handleReceiptUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    setUploadError(null)
    setReceiptName(file.name)

    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`
      const filePath = `receipts/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('receipts')
        .upload(filePath, file)

      if (uploadError) {
        if (uploadError.message.includes('Bucket not found')) {
          throw new Error('Cubo no encontrado. Recuerda crear un Bucket público llamado "receipts" en tu consola de Supabase.')
        }
        throw uploadError
      }

      const { data } = supabase.storage.from('receipts').getPublicUrl(filePath)
      setValue('receipt_url', data.publicUrl)
    } catch (err: any) {
      console.error(err)
      setUploadError(err.message || 'Error al subir el archivo comprobante.')
      setReceiptName(null)
    } finally {
      setUploading(false)
    }
  }

  const handleFormSubmit = (data: ExpenseFormValues) => {
    const sanitizedData: CreateExpenseInput = {
      description: data.description,
      amount: data.amount,
      category: data.category,
      expense_date: data.expense_date,
      receipt_url: data.receipt_url || null,
    }
    onSubmit(sanitizedData)
  }

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
      {/* 1. Descripción */}
      <div className="space-y-1.5">
        <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Descripción del Gasto
        </label>
        <div className="relative">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground pointer-events-none">
            <FileText className="h-4 w-4" />
          </span>
          <input
            type="text"
            className="w-full bg-secondary/40 border border-border/80 rounded-xl py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all placeholder:text-muted-foreground/60"
            placeholder="Ej: Pago de Luz Eléctrica Mayo"
            {...register('description')}
          />
        </div>
        {errors.description && (
          <p className="text-xs text-destructive mt-1 font-medium">{errors.description.message}</p>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* 2. Monto */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Monto de Egreso ($)
          </label>
          <div className="relative">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground pointer-events-none">
              <DollarSign className="h-4 w-4" />
            </span>
            <input
              type="number"
              step="0.01"
              className="w-full bg-secondary/40 border border-border/80 rounded-xl py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all placeholder:text-muted-foreground/60"
              placeholder="0.00"
              {...register('amount', { valueAsNumber: true })}
            />
          </div>
          {errors.amount && (
            <p className="text-xs text-destructive mt-1 font-medium">{errors.amount.message}</p>
          )}
        </div>

        {/* 3. Categoría */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Categoría
          </label>
          <div className="relative">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground pointer-events-none">
              <Tag className="h-4 w-4" />
            </span>
            <select
              className="w-full bg-secondary/40 border border-border/80 rounded-xl py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:border-primary transition-all"
              {...register('category')}
            >
              <option value="Renta">Alquiler / Renta</option>
              <option value="Servicios">Servicios Básicos (Agua, Luz, Internet)</option>
              <option value="Nómina">Nómina / Sueldos Staff</option>
              <option value="Mantenimiento">Mantenimiento de Máquinas / Aseo</option>
              <option value="Marketing">Marketing / Publicidad</option>
              <option value="Otros">Otros Egresos</option>
            </select>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* 4. Fecha del Gasto */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Fecha
          </label>
          <div className="relative">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground pointer-events-none">
              <Calendar className="h-4 w-4" />
            </span>
            <input
              type="date"
              className="w-full bg-secondary/40 border border-border/80 rounded-xl py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:border-primary transition-all"
              {...register('expense_date')}
            />
          </div>
        </div>

        {/* 5. Comprobante Digital */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Adjuntar Comprobante (Boleta / Factura)
          </label>
          <div className="relative">
            <label className="w-full bg-secondary/45 border border-border/80 hover:bg-secondary/60 rounded-xl py-2.5 px-4 text-sm flex items-center justify-between cursor-pointer transition-all">
              <span className="truncate max-w-[180px] text-muted-foreground">
                {receiptName || 'Subir PDF o Imagen'}
              </span>
              <Paperclip className="h-4 w-4 text-muted-foreground" />
              <input type="file" accept="image/*,application/pdf" className="hidden" onChange={handleReceiptUpload} />
            </label>
          </div>
        </div>
      </div>

      {uploading && <p className="text-[10px] text-primary animate-pulse font-semibold text-right">Subiendo archivo...</p>}
      {uploadError && (
        <div className="p-2 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-[10px] text-center flex items-center space-x-1 justify-center">
          <AlertCircle className="h-3 w-3 shrink-0" />
          <span>{uploadError}</span>
        </div>
      )}

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
