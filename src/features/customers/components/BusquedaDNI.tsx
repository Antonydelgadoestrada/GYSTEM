import React, { useState, useEffect, useRef } from 'react'
import { Search, Loader2, CheckCircle2, AlertCircle } from 'lucide-react'

export interface ReniecResult {
  dni: string
  nombres: string
  apellidoPaterno: string
  apellidoMaterno: string
  nombreCompleto: string
}

interface BusquedaDNIProps {
  onSuccess: (data: ReniecResult) => void
  onMinorDetected?: () => void
  onSearchingChange?: (searching: boolean) => void
  onChange?: (dni: string) => void
  initialDni?: string
  className?: string
}

// Caché local en memoria del lado del cliente (DNI -> Resultados)
const localDniCache = new Map<string, ReniecResult>()

export const BusquedaDNI: React.FC<BusquedaDNIProps> = ({
  onSuccess,
  onMinorDetected,
  onSearchingChange,
  onChange,
  initialDni = '',
  className = '',
}) => {
  const [dni, setDni] = useState(initialDni)
  const [loading, setLoading] = useState(false)
  const [statusMsg, setStatusMsg] = useState<string | null>(null)
  const [isError, setIsError] = useState(false)
  
  // Referencia para almacenar el AbortController activo y poder cancelar peticiones anteriores
  const abortControllerRef = useRef<AbortController | null>(null)
  // Referencia para el temporizador del debounce
  const debounceTimeoutRef = useRef<number | null>(null)

  useEffect(() => {
    setDni(initialDni)
  }, [initialDni])

  // Limpiar temporizadores y peticiones al desmontar el componente
  useEffect(() => {
    return () => {
      if (debounceTimeoutRef.current) clearTimeout(debounceTimeoutRef.current)
      if (abortControllerRef.current) abortControllerRef.current.abort()
    }
  }, [])

  const validateDniFormat = (value: string): boolean => {
    return value.length === 8 && /^\d{8}$/.test(value)
  }

  const ejecutarBusqueda = async (dniParaBuscar: string, force = false) => {
    // 1. Cancelar cualquier petición HTTP previa que esté en curso
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      console.log(`[BusquedaDNI] Cancelando consulta previa para DNI.`)
    }

    if (!validateDniFormat(dniParaBuscar)) {
      if (force) {
        setIsError(true)
        setStatusMsg('El DNI debe tener exactamente 8 dígitos numéricos.')
      }
      return
    }

    // 2. Verificar caché en memoria del cliente para evitar consultas duplicadas
    if (localDniCache.has(dniParaBuscar)) {
      const cachedData = localDniCache.get(dniParaBuscar)!
      console.log(`[BusquedaDNI] DNI ${dniParaBuscar} encontrado en caché local del cliente.`)
      setIsError(false)
      setStatusMsg('Datos encontrados correctamente (Caché).')
      onSuccess(cachedData)
      return
    }

    // 3. Iniciar estado de consulta
    setLoading(true)
    setIsError(false)
    setStatusMsg('Consultando RENIEC...')
    if (onSearchingChange) onSearchingChange(true)

    // Crear un nuevo AbortController para esta petición
    const controller = new AbortController()
    abortControllerRef.current = controller

    try {
      // Para mayor robustez en producción, usamos la URL relativa /api/reniec/:dni
      // y dejamos que el proxy de Vite o Nginx lo redirija al backend express en puerto 3001
      const response = await fetch(`/api/reniec/${dniParaBuscar}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
        signal: controller.signal,
      })

      const result = await response.json()

      if (response.ok && result.success) {
        const data: ReniecResult = result.data
        
        // Almacenar en caché local
        localDniCache.set(dniParaBuscar, data)
        
        setIsError(false)
        setStatusMsg('Datos encontrados correctamente.')
        onSuccess(data)
      } else {
        setIsError(true)
        // Detectar si el DNI es de menor de edad (usualmente controlado por lógica de negocio o backend)
        const isMinor = dniParaBuscar.startsWith('6') || dniParaBuscar.startsWith('7')
        
        if (isMinor) {
          setStatusMsg('El DNI corresponde a un menor de edad. Ingreso manual habilitado.')
          if (onMinorDetected) onMinorDetected()
        } else {
          setStatusMsg(result.message || 'No se pudo consultar el DNI.')
        }
      }
    } catch (err: any) {
      if (err.name === 'AbortError') {
        // La petición fue cancelada intencionalmente, no mostrar error
        return
      }
      console.error('[BusquedaDNI] Error en fetch:', err)
      setIsError(true)
      setStatusMsg('No se pudo consultar el DNI.')
    } finally {
      // Limpiar referencia si es la misma petición
      if (abortControllerRef.current === controller) {
        abortControllerRef.current = null
      }
      setLoading(false)
      if (onSearchingChange) onSearchingChange(false)
    }
  }

  // Manejar el cambio en el input
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Solo permitir números
    const cleanValue = e.target.value.replace(/\D/g, '').slice(0, 8)
    setDni(cleanValue)
    if (onChange) {
      onChange(cleanValue)
    }

    // Resetear mensajes de estado al cambiar DNI
    setStatusMsg(null)
    setIsError(false)

    // Cancelar debounce anterior
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current)
    }
  }

  // Corregir debounce a 500ms
  useEffect(() => {
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current)
    }
    if (dni.length === 8) {
      debounceTimeoutRef.current = setTimeout(() => {
        ejecutarBusqueda(dni)
      }, 500) // Debounce de 500 ms
    }
  }, [dni])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      // Ejecutar inmediatamente al presionar Enter
      if (debounceTimeoutRef.current) clearTimeout(debounceTimeoutRef.current)
      ejecutarBusqueda(dni, true)
    }
  }

  const handleSearchClick = (e: React.MouseEvent) => {
    e.preventDefault()
    // Ejecutar inmediatamente al presionar el botón Buscar
    if (debounceTimeoutRef.current) clearTimeout(debounceTimeoutRef.current)
    ejecutarBusqueda(dni, true)
  }

  return (
    <div className={`space-y-2 ${className}`}>
      <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Número de DNI (Atleta)
      </label>
      
      <div className="flex space-x-2">
        <div className="relative flex-1">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground pointer-events-none font-bold text-xs">
            DNI
          </span>
          <input
            type="text"
            maxLength={8}
            className="w-full bg-secondary/40 border border-border/80 rounded-xl py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:border-primary transition-all placeholder:text-muted-foreground/60"
            placeholder="Ingresa DNI (8 dígitos)"
            value={dni}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            disabled={loading}
          />
          {loading && (
            <div className="absolute right-3 top-3">
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
            </div>
          )}
        </div>
        
        <button
          type="button"
          onClick={handleSearchClick}
          disabled={loading || dni.length !== 8}
          className="px-4 py-2.5 bg-primary/10 border border-primary/20 hover:bg-primary/20 disabled:bg-secondary/40 disabled:border-border/60 disabled:text-muted-foreground text-primary rounded-xl text-sm font-semibold flex items-center space-x-1.5 transition-all shrink-0 active:scale-95"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Search className="h-4 w-4" />
          )}
          <span>Buscar</span>
        </button>
      </div>

      {statusMsg && (
        <div className={`text-[10px] px-3 py-1.5 rounded-lg border font-semibold flex items-center space-x-1.5 ${
          isError
            ? 'bg-destructive/10 border-destructive/20 text-destructive'
            : statusMsg === 'Consultando RENIEC...'
            ? 'bg-secondary/40 border-border text-muted-foreground animate-pulse'
            : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
        }`}>
          {isError ? (
            <AlertCircle className="h-3 w-3 shrink-0" />
          ) : statusMsg === 'Consultando RENIEC...' ? (
            <Loader2 className="h-3 w-3 animate-spin shrink-0 text-muted-foreground" />
          ) : (
            <CheckCircle2 className="h-3 w-3 shrink-0" />
          )}
          <span>{statusMsg}</span>
        </div>
      )}
    </div>
  )
}
