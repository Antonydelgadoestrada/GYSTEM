import { Request, Response } from 'express'
import { ReniecService, ReniecData } from '../services/ReniecService'

interface CacheEntry {
  data: ReniecData
  expiresAt: number
}

export class ReniecController {
  // Caché en memoria para evitar consultas duplicadas consecutivas (Duración: 5 minutos)
  private static cache = new Map<string, CacheEntry>()
  private static CACHE_TTL = 5 * 60 * 1000 // 5 minutos en milisegundos

  /**
   * Endpoint GET /api/reniec/:dni
   */
  public static async getDni(req: Request, res: Response): Promise<void> {
    const dni = String(req.params.dni || '').trim()

    // 1. VALIDACIONES
    // • Debe tener exactamente 8 dígitos.
    // • Solo números.
    // • No permitir letras.
    // • No permitir espacios.
    // • No permitir caracteres especiales.
    if (!dni || dni.length !== 8 || !/^\d{8}$/.test(dni)) {
      console.warn(`[ReniecController] DNI inválido recibido: "${dni}"`)
      res.status(400).json({
        success: false,
        message: 'DNI no válido. Debe contener exactamente 8 números sin espacios ni letras.'
      })
      return
    }

    // 2. VERIFICAR CACHÉ EN MEMORIA
    const cachedEntry = ReniecController.cache.get(dni)
    const now = Date.now()

    if (cachedEntry && cachedEntry.expiresAt > now) {
      console.log(`[ReniecController] DNI ${dni} servido desde caché en memoria.`)
      res.status(200).json({
        success: true,
        data: cachedEntry.data
      })
      return
    }

    try {
      // 3. LLAMAR AL SERVICIO DE CONSULTA
      const data = await ReniecService.buscarPorDNI(dni)

      // Guardar en caché
      ReniecController.cache.set(dni, {
        data,
        expiresAt: now + ReniecController.CACHE_TTL
      })

      console.log(`[ReniecController] Consulta exitosa para DNI ${dni}. Registrado en caché.`)
      
      res.status(200).json({
        success: true,
        data
      })

    } catch (error: any) {
      // 4. MANEJO DE ERRORES NORMALIZADOS
      if (error.message === 'DNI_NOT_FOUND') {
        console.warn(`[ReniecController] DNI ${dni} no encontrado en VerificaPE.`)
        res.status(404).json({
          success: false,
          message: 'DNI no encontrado.'
        })
        return
      }

      if (error.message === 'VERIFICAPE_UNAUTHORIZED') {
        console.error('[ReniecController] Error de autenticación con la API de VerificaPE.')
        res.status(500).json({
          success: false,
          message: 'No fue posible consultar RENIEC.'
        })
        return
      }

      if (error.message === 'VERIFICAPE_TIMEOUT') {
        console.error(`[ReniecController] Timeout en la consulta de DNI ${dni}.`)
        res.status(504).json({
          success: false,
          message: 'No fue posible consultar RENIEC.'
        })
        return
      }

      console.error(`[ReniecController] Error interno procesando DNI ${dni}:`, error)
      res.status(500).json({
        success: false,
        message: 'No fue posible consultar RENIEC.',
        error: error.message || String(error),
        stack: error.stack
      })
    }
  }
}
