import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import path from 'path'
import { ReniecController } from './controllers/ReniecController'

// Cargar variables de entorno del root .env
dotenv.config({ path: path.resolve(process.cwd(), '.env') })

const app = express()
const PORT = process.env.PORT || 3001

// Middleware
app.use(cors())
app.use(express.json())

// Healthcheck endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok', service: 'Reniec-Service' })
})

// Endpoint solicitado
app.get('/api/reniec/:dni', ReniecController.getDni)

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`====================================================`)
  console.log(`🚀 SERVIDOR DE CONSULTA RENIEC CORRIENDO EN PORT ${PORT}`)
  console.log(`👉 Endpoint: http://localhost:${PORT}/api/reniec/:dni`)
  console.log(`====================================================`)
})
