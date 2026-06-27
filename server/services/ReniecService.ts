import dotenv from 'dotenv'
import path from 'path'

// Cargar variables de entorno del archivo .env del root
dotenv.config({ path: path.resolve(process.cwd(), '.env') })

export interface ReniecData {
  dni: string
  nombres: string
  apellidoPaterno: string
  apellidoMaterno: string
  nombreCompleto: string
}

export class ReniecService {
  private static API_URL = 'https://api.verificape.com/v2/dni'

  /**
   * Consulta el DNI en la API de VerificaPE
   * @param dni Número de DNI (8 dígitos)
   */
  public static async buscarPorDNI(dni: string): Promise<ReniecData> {
    const token = process.env.VERIFICAPE_API_TOKEN
    
    if (!token) {
      console.error('[ReniecService] Error: VERIFICAPE_API_TOKEN no está configurado en las variables de entorno.')
      throw new Error('VERIFICAPE_UNAUTHORIZED')
    }

    // Configurar Timeout de 6 segundos usando AbortController
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 6000)

    try {
      console.log(`[ReniecService] Consultando DNI ${dni} en VerificaPE...`)
      
      const response = await fetch(`${this.API_URL}/${dni}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
        },
        signal: controller.signal
      })

      clearTimeout(timeoutId)

      if (response.status === 401 || response.status === 403) {
        console.error(`[ReniecService] Error de autenticación con VerificaPE (Status: ${response.status})`)
        throw new Error('VERIFICAPE_UNAUTHORIZED')
      }

      if (response.status === 404) {
        throw new Error('DNI_NOT_FOUND')
      }

      if (!response.ok) {
        console.error(`[ReniecService] Error en respuesta de VerificaPE (Status: ${response.status})`)
        throw new Error('VERIFICAPE_SERVER_ERROR')
      }

      const data = await response.json()
      
      // Validar si la respuesta contiene los campos esperados (API v2 devuelve success: true y los datos en el objeto data)
      if (!data || !data.success || !data.data) {
        throw new Error('DNI_NOT_FOUND')
      }

      const apiData = data.data

      // Mapear respuesta al formato estándar requerido
      const nombres = (apiData.names || apiData.nombres || '').toUpperCase().trim()
      const apellidoPaterno = (apiData.paternalSurname || apiData.apellidoPaterno || apiData.apellido_paterno || '').toUpperCase().trim()
      const apellidoMaterno = (apiData.maternalSurname || apiData.apellidoMaterno || apiData.apellido_materno || '').toUpperCase().trim()
      const nombreCompleto = (apiData.fullName || apiData.nombreCompleto || `${nombres} ${apellidoPaterno} ${apellidoMaterno}`).toUpperCase().replace(/\s+/g, ' ').trim()

      return {
        dni,
        nombres,
        apellidoPaterno,
        apellidoMaterno,
        nombreCompleto
      }

    } catch (error: any) {
      clearTimeout(timeoutId)
      
      if (error.name === 'AbortError') {
        console.error(`[ReniecService] Timeout al consultar VerificaPE para el DNI ${dni}`)
        throw new Error('VERIFICAPE_TIMEOUT')
      }

      // Propagar errores conocidos
      if (
        error.message === 'VERIFICAPE_UNAUTHORIZED' ||
        error.message === 'DNI_NOT_FOUND' ||
        error.message === 'VERIFICAPE_SERVER_ERROR'
      ) {
        throw error
      }

      console.error(`[ReniecService] Error inesperado consultando DNI ${dni}:`, error)
      throw new Error('VERIFICAPE_SERVER_ERROR')
    }
  }
}
