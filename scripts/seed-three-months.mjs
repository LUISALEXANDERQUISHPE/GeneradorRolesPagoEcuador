import { loadEnv } from 'vite'
import { neon } from '@neondatabase/serverless'
import { calculateMonthly, defaultInputs } from '../src/services/nominaService.js'

const periods = ['2026-07', '2026-08', '2026-09']
const env = loadEnv('development', process.cwd(), 'VITE_')
if (!env.VITE_DATABASE_URL) throw new Error('No se encontró VITE_DATABASE_URL.')

const sql = neon(env.VITE_DATABASE_URL)
const [settings] = await sql.query(`
  SELECT to_jsonb(e) AS empresa, to_jsonb(p) AS parametros
  FROM empresa e JOIN parametros p ON p.empresa_id=e.id
  WHERE e.id=1 AND p.id=1
`, [])
if (!settings) throw new Error('No se encontró la configuración de nómina.')

const employeeRows = await sql.query(`
  SELECT to_jsonb(e) AS empleado
  FROM empleados e
  WHERE estado='activo'
  ORDER BY apellidos,nombres
`, [])
const employees = employeeRows.map(row => row.empleado)
if (employees.length !== 6) throw new Error('Se esperaban exactamente seis empleados activos.')

const [existing] = await sql.query(`
  SELECT count(*)::integer AS cantidad
  FROM roles_pago
  WHERE tipo='mensual' AND to_char(periodo,'YYYY-MM')=ANY($1::text[])
`, [periods])
if (existing.cantidad) throw new Error('Ya existen roles en uno o más de los tres meses. No se duplicó ningún registro.')

const roles = periods.flatMap(period => employees.map(employee => {
  const input = defaultInputs(employee, period, settings.parametros)
  input.observaciones = 'Rol histórico generado para inicializar el registro de nómina.'
  return calculateMonthly(employee, settings.empresa, settings.parametros, period, input)
}))

// Una sola sentencia: si un rol falla, los 18 se revierten.
const [saved] = await sql.query(`
  WITH guardados AS (
    SELECT guardar_rol(value,0) AS id
    FROM jsonb_array_elements($1::jsonb)
  )
  SELECT count(*)::integer AS cantidad FROM guardados
`, [JSON.stringify(roles)])
if (saved.cantidad !== 18) throw new Error('No se guardaron los 18 roles esperados.')

const summary = await sql.query(`
  SELECT to_char(periodo,'YYYY-MM') AS periodo,
    count(*)::integer AS roles,
    round(sum(total_ingresos),2) AS ingresos,
    round(sum(total_egresos),2) AS egresos,
    round(sum(neto_recibir),2) AS neto
  FROM roles_pago
  WHERE tipo='mensual' AND to_char(periodo,'YYYY-MM')=ANY($1::text[])
  GROUP BY periodo ORDER BY periodo
`, [periods])

console.log(JSON.stringify(summary, null, 2))
