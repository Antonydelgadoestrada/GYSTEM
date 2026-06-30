import https from 'https'

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

  // Token de VerificaPE activo y funcional
  const token = 'vp_live_db356e6abde04574b0387d48bdef03a5'
  const url = `https://api.verificape.com/v2/dni/${dniStr}`
  
  const options = {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json'
    }
  }

  const queryDni = (): Promise<any> => {
    return new Promise((resolve, reject) => {
      https.get(url, options, (apiRes) => {
        let data = ''
        apiRes.on('data', (chunk) => {
          data += chunk
        })
        apiRes.on('end', () => {
          if (apiRes.statusCode && apiRes.statusCode >= 200 && apiRes.statusCode < 300) {
            try {
              resolve(JSON.parse(data))
            } catch (e) {
              reject(new Error('JSON_PARSE_ERROR'))
            }
          } else {
            reject(new Error(`API_STATUS_${apiRes.statusCode}`))
          }
        })
      }).on('error', (err) => {
        reject(err)
      })
    })
  }

  try {
    const result = await queryDni()
    
    if (!result || !result.success || !result.data) {
      res.statusCode = 404
      res.setHeader('Content-Type', 'application/json')
      res.end(JSON.stringify({ success: false, message: 'DNI no encontrado.' }))
      return
    }

    const apiData = result.data
    const nombres = (apiData.names || apiData.nombres || '').toUpperCase().trim()
    const apellidoPaterno = (apiData.paternalSurname || apiData.apellidoPaterno || apiData.apellido_paterno || '').toUpperCase().trim()
    const apellidoMaterno = (apiData.maternalSurname || apiData.apellidoMaterno || apiData.apellido_materno || '').toUpperCase().trim()
    const nombreCompleto = (apiData.fullName || apiData.nombreCompleto || `${nombres} ${apellidoPaterno} ${apellidoMaterno}`).toUpperCase().replace(/\s+/g, ' ').trim()

    res.statusCode = 200
    res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify({
      success: true,
      data: {
        dni: dniStr,
        nombres,
        apellidoPaterno,
        apellidoMaterno,
        nombreCompleto
      }
    }))

  } catch (error: any) {
    res.statusCode = 500
    if (error.message.includes('404')) {
      res.statusCode = 404
    }
    res.setHeader('Content-Type', 'application/json')
    res.end(JSON.stringify({
      success: false,
      message: 'No fue posible consultar RENIEC.',
      error: error.message || String(error)
    }))
  }
}
