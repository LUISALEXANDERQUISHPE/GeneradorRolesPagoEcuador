import { readFile } from 'node:fs/promises'
import { loadEnv } from 'vite'
import { neon } from '@neondatabase/serverless'
try {
 const env=loadEnv('development',process.cwd(),'VITE_')
 const sql=neon(env.VITE_DATABASE_URL)
 const source=await readFile(new URL('../migrations/003_modulos_nomina.sql',import.meta.url),'utf8')
 await sql.transaction(source.split('-- @statement').map(text=>sql.query(text,[])))
 console.log('Módulos de nómina instalados. Se conservaron los registros existentes.')
} catch(e) { console.error('No se pudo migrar. Código:', /^[A-Z0-9]{5}$/.test(e.code || '')?e.code:'CONEXION'); process.exitCode=1 }
