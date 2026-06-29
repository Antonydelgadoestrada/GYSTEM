import { ReniecService } from '../server/services/ReniecService'

export default async function handler(req: any, res: any) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')

  if (req.method === 'OPTIONS') {
    res.statusCode = 200
    res.end()
    return
  }

  // En Vercel, req.query contiene los parámetros dinámicos de la ruta
  const { dni } = req.query
  const dniStr = String(dni || '').trim()

  if (!dniStr || dniStr.length !== 8 || !/^\d{8}$/.test(dniStr)) {
    res.statusCode = 400
    res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify({
      success: false,
      message: 'DNI no válido. Debe contener exactamente 8 números.'
    }))
    return
  }

  try {
    const data = await ReniecService.buscarPorDNI(dniStr)
    res.statusCode = 200
    res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify({
      success: true,
      data
    }))
  } catch (error: any) {
    res.statusCode = 500
    if (error.message === 'DNI_NOT_FOUND') {
      res.statusCode = 404
    }
    
    res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify({
      success: false,
      message: error.message === 'DNI_NOT_FOUND' ? 'DNI no encontrado.' : 'No fue posible consultar RENIEC.',
      error: error.message || String(error)
    }))
  }
}
