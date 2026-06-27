import { supabase } from '@/config/supabase'

export interface DniLookupResult {
  source: 'local' | 'reniec' | 'simulated'
  success: boolean
  full_name?: string
  isMinor: boolean
  message?: string
  customer?: any
}

/**
 * Consulta un DNI en la base de datos local y, si no existe,
 * realiza una simulación de consulta externa (Reniec).
 * En el caso de menores de edad (DNI que inician con 6 o 7), se indica que no se pudo
 * obtener el nombre automáticamente, habilitando la edición manual.
 */
export const lookupDni = async (dni: string): Promise<DniLookupResult> => {
  if (!dni || dni.length !== 8 || !/^\d+$/.test(dni)) {
    return {
      source: 'simulated',
      success: false,
      isMinor: false,
      message: 'El DNI debe tener exactamente 8 dígitos numéricos.',
    }
  }

  try {
    // 1. Buscar localmente si ya existe el cliente con este DNI
    const { data: localCustomer, error } = await supabase
      .from('customers')
      .select('*')
      .eq('dni', dni)
      .maybeSingle()

    if (error) {
      console.error('Error buscando DNI localmente:', error)
    }

    if (localCustomer) {
      return {
        source: 'local',
        success: true,
        full_name: localCustomer.full_name,
        isMinor: false,
        customer: localCustomer,
      }
    }

    // 2. Si no existe localmente, simulamos la consulta a RENIEC.
    // En Perú, los menores de edad y jóvenes recientes suelen tener DNIs que empiezan con 7 o 6.
    // Si inicia con 7 o 6, simulamos que es menor de edad y no se puede obtener su nombre (seguridad).
    const isMinor = dni.startsWith('7') || dni.startsWith('6')

    if (isMinor) {
      return {
        source: 'reniec',
        success: false,
        isMinor: true,
        message: 'El DNI corresponde a un menor de edad. Los datos no están disponibles públicamente. Por favor, registre manualmente los datos.',
      }
    }

    // 3. Intenta realizar consulta real a una API pública (Reniec gratuita alternativa) si estuviese disponible
    try {
      const res = await fetch(`https://api.apis.net.pe/v1/dni?numero=${dni}`)
      if (res.ok) {
        const apiData = await res.json()
        if (apiData && apiData.nombres) {
          const fullName = `${apiData.nombres} ${apiData.apellidoPaterno} ${apiData.apellidoMaterno}`.trim()
          return {
            source: 'reniec',
            success: true,
            full_name: fullName,
            isMinor: false,
          }
        }
      }
    } catch (e) {
      // Ignorar error de red/fetch de la API externa y proceder a simulación profesional
    }

    // 4. Simulación profesional para adultos (DNI no inicia con 6 o 7)
    // Usamos nombres simulados deterministas para que sea realista
    const nombres = ['Carlos Alberto', 'María Teresa', 'Luis Miguel', 'Sofía Inés', 'Jorge Luis', 'Ana Patricia', 'Roberto Carlos', 'Diana Beatriz']
    const apellidosPat = ['Mendoza', 'Guerrero', 'Rojas', 'Castro', 'Díaz', 'Torres', 'Flores', 'Vargas']
    const apellidosMat = ['Pérez', 'Silva', 'Cárdenas', 'Gómez', 'Morales', 'Jiménez', 'Quispe', 'Reyes']

    const seed = parseInt(dni.slice(-3)) || 0
    const nameVal = nombres[seed % nombres.length]
    const patVal = apellidosPat[(seed + 2) % apellidosPat.length]
    const matVal = apellidosMat[(seed + 5) % apellidosMat.length]

    return {
      source: 'simulated',
      success: true,
      full_name: `${nameVal} ${patVal} ${matVal}`,
      isMinor: false,
    }
  } catch (err: any) {
    return {
      source: 'simulated',
      success: false,
      isMinor: false,
      message: err.message || 'Error al consultar el DNI.',
    }
  }
}
