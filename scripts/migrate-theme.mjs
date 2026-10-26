import { readFile } from 'node:fs/promises'
import { loadEnv } from 'vite'
import { neon } from '@neondatabase/serverless'
const env = loadEnv('development', process.cwd(), 'VITE_')
try {
  if (!env.VITE_DATABASE_URL) throw new Error('CONFIG_REQUIRED')
  const sql = neon(env.VITE_DATABASE_URL)
  await sql.query(await readFile(new URL('../migrations/002_colores_empresa.sql', import.meta.url), 'utf8'), [], { fetchOptions: { signal: AbortSignal.timeout(15000) } })
  console.log('Columnas de colores disponibles. Datos existentes conservados.')
} catch (error) {
  const code = String(error.code || '')
  console.error(code === '42501' ? 'Faltan permisos. Ejecuta migrations/002_colores_empresa.sql con el propietario en Neon.' : 'No se pudo aplicar la migración. Comprueba la conexión y los permisos; también puedes ejecutar migrations/002_colores_empresa.sql en Neon.')
  process.exitCode = 1
}
