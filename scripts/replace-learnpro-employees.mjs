import { mkdir, writeFile } from 'node:fs/promises'
import { loadEnv } from 'vite'
import { neon } from '@neondatabase/serverless'

if (!process.argv.includes('--confirm=LEARNPRO-2026')) {
  console.error('Operación cancelada: falta la confirmación explícita.')
  process.exit(1)
}

const env = loadEnv('development', process.cwd(), 'VITE_')
if (!env.VITE_DATABASE_URL) {
  console.error('No se encontró VITE_DATABASE_URL.')
  process.exit(1)
}

const sql = neon(env.VITE_DATABASE_URL)

// El respaldo no contiene la cadena de conexión ni modifica empresa/parámetros.
const [employees, roles, details, revisions, sources] = await Promise.all([
  sql.query('SELECT * FROM empleados ORDER BY apellidos, nombres', []),
  sql.query('SELECT * FROM roles_pago ORDER BY periodo, empleado_id', []),
  sql.query('SELECT * FROM roles_pago_detalle ORDER BY rol_id, orden', []),
  sql.query('SELECT * FROM roles_revisiones ORDER BY rol_id, version', []),
  sql.query('SELECT * FROM roles_fuentes ORDER BY rol_id, fuente_id', []),
])

await mkdir('backups', { recursive: true })
const stamp = new Date().toISOString().replaceAll(':', '-').replaceAll('.', '-')
const backupPath = `backups/nomina-antes-de-learnpro-${stamp}.json`
await writeFile(backupPath, JSON.stringify({ employees, roles, details, revisions, sources }, null, 2))

const scales = [
  ['a1000000-0000-4000-8000-000000000001', 'A1', 'Gerencia general', 1800],
  ['a2000000-0000-4000-8000-000000000002', 'A2', 'Jefaturas', 1400],
  ['a3000000-0000-4000-8000-000000000003', 'A3', 'Departamento de sistemas', 959],
  ['b1000000-0000-4000-8000-000000000001', 'B1', 'Coordinación académica', 1100],
  ['b2000000-0000-4000-8000-000000000002', 'B2', 'Administración y contabilidad', 900],
]

const employeesToInsert = [
  ['10000000-0000-4000-8000-000000000001', '1800000018', 'Paul Alejandro', 'Velasteguí Sánchez', 'Gerente general', 'Gerencia', '2024-01-15', 1800, 'A1'],
  ['10000000-0000-4000-8000-000000000002', '1800000026', 'Andrea Carolina', 'Salazar López', 'Contadora', 'Contabilidad', '2026-02-02', 900, 'B2'],
  ['10000000-0000-4000-8000-000000000003', '1800000034', 'Luis Alexander', 'Quishpe López', 'Jefe de tecnología', 'Tecnología', '2024-02-01', 1400, 'A2'],
  ['10000000-0000-4000-8000-000000000004', '1800000042', 'David Sebastián', 'Giler Núñez', 'Jefe comercial y marca', 'Comercial y marca', '2024-03-01', 1400, 'A2'],
  ['10000000-0000-4000-8000-000000000005', '1800000059', 'María José', 'Paredes Torres', 'Coordinadora académica', 'Académico', '2026-01-05', 1100, 'B1'],
  ['10000000-0000-4000-8000-000000000006', '1800000067', 'Carlos Andrés', 'Andrade Ruiz', 'Desarrollador web', 'Tecnología', '2026-03-02', 959, 'A3'],
]

const scalePayload = scales.map(([id, codigo, descripcion, sueldo]) => ({ id, codigo, descripcion, sueldo }))
const employeePayload = employeesToInsert.map(([id, cedula, nombres, apellidos, cargo, departamento, fecha_ingreso, sueldo_base, escala_codigo]) => ({
  id, cedula, nombres, apellidos, cargo, departamento, fecha_ingreso, sueldo_base, escala_codigo,
}))

// Una sola sentencia PostgreSQL: o se aplican todos los borrados e inserts, o ninguno.
const [result] = await sql.query(`
  WITH
  escalas_entrada AS (
    SELECT * FROM jsonb_to_recordset($1::jsonb) AS x(
      id uuid, codigo varchar(30), descripcion varchar(180), sueldo numeric(12,2)
    )
  ),
  empleados_entrada AS (
    SELECT * FROM jsonb_to_recordset($2::jsonb) AS x(
      id uuid, cedula varchar(10), nombres varchar(120), apellidos varchar(120),
      cargo varchar(120), departamento varchar(120), fecha_ingreso date,
      sueldo_base numeric(12,2), escala_codigo varchar(30)
    )
  ),
  fuentes_borradas AS (
    DELETE FROM roles_fuentes RETURNING 1
  ),
  revisiones_borradas AS (
    DELETE FROM roles_revisiones
    WHERE (SELECT count(*) FROM fuentes_borradas) >= 0 RETURNING 1
  ),
  detalles_borrados AS (
    DELETE FROM roles_pago_detalle
    WHERE (SELECT count(*) FROM revisiones_borradas) >= 0 RETURNING 1
  ),
  roles_borrados AS (
    DELETE FROM roles_pago
    WHERE (SELECT count(*) FROM detalles_borrados) >= 0 RETURNING 1
  ),
  empleados_borrados AS (
    DELETE FROM empleados
    WHERE (SELECT count(*) FROM roles_borrados) >= 0 RETURNING 1
  ),
  escalas_guardadas AS (
    INSERT INTO escalas_salariales(id,codigo,descripcion,sueldo,regimen,activo)
    SELECT e.id,e.codigo,e.descripcion,e.sueldo,'codigo_trabajo',true
    FROM escalas_entrada e
    WHERE (SELECT count(*) FROM empleados_borrados) >= 0
    ON CONFLICT(regimen,codigo) DO UPDATE SET
      descripcion=EXCLUDED.descripcion,sueldo=EXCLUDED.sueldo,activo=true
    RETURNING id,codigo,sueldo
  ),
  empleados_guardados AS (
    INSERT INTO empleados(
      id,empresa_id,cedula,nombres,apellidos,cargo,departamento,fecha_ingreso,
      sueldo_base,estado,recibe_fondos_reserva,decimo_tercero_modalidad,
      decimo_cuarto_modalidad,region,modalidades,escala_id,escala_codigo
    )
    SELECT e.id,1,e.cedula,e.nombres,e.apellidos,e.cargo,e.departamento,e.fecha_ingreso,
      e.sueldo_base,'activo',true,'mensualizar','mensualizar','sierra','[]'::jsonb,
      s.id,e.escala_codigo
    FROM empleados_entrada e
    JOIN escalas_guardadas s ON s.codigo=e.escala_codigo
      AND s.sueldo=e.sueldo_base
    RETURNING id
  ),
  verificacion AS (
    SELECT count(*)::integer AS cantidad FROM empleados_guardados
  )
  SELECT CASE WHEN cantidad=6 THEN cantidad ELSE 1/(cantidad-cantidad) END AS empleados_insertados,
    (SELECT count(*)::integer FROM empleados_borrados) AS empleados_borrados,
    (SELECT count(*)::integer FROM roles_borrados) AS roles_borrados
  FROM verificacion
`, [JSON.stringify(scalePayload), JSON.stringify(employeePayload)])

if (result.empleados_insertados !== 6) throw new Error('No se insertaron los seis empleados esperados.')

const [verification] = await sql.query(`
  SELECT count(*)::integer AS empleados,
    count(*) FILTER (WHERE estado='activo')::integer AS activos,
    count(*) FILTER (WHERE escala_id IS NOT NULL)::integer AS con_escala
  FROM empleados
`, [])

if (verification.empleados !== 6 || verification.activos !== 6 || verification.con_escala !== 6) {
  throw new Error('La verificación final no coincide con los seis empleados esperados.')
}

console.log(`Respaldo local: ${backupPath}`)
console.log('Carga completada: 6 empleados activos, todos con escala salarial; 0 roles anteriores.')
