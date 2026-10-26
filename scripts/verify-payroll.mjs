import { loadEnv } from 'vite'
import { neon } from '@neondatabase/serverless'
import { calculateMonthly, calculateBenefit, benefitCoverage, defaultInputs } from '../src/services/nominaService.js'
const env=loadEnv('development',process.cwd(),'VITE_')
const sql=neon(env.VITE_DATABASE_URL)
const e={id:crypto.randomUUID(),cedula:'9900000001',nombres:'PRUEBA TRANSACCIONAL',apellidos:'REVERSIBLE',cargo:'Prueba',departamento:'Prueba',fecha_ingreso:'2025-01-01',sueldo_base:1000,recibe_fondos_reserva:true,decimo_tercero_modalidad:'acumular',decimo_cuarto_modalidad:'acumular',region:'sierra',modalidades:[]}
const c={nombre:'Prueba sin persistencia'}
const p={sbu:500,aporte_personal_pct:9.45,aporte_patronal_pct:11.15,fondos_reserva_pct:8.33,recargo_suplementarias_pct:50,recargo_extraordinarias_pct:100,dias_base_mes:30,horas_jornada:8}
const monthly=calculateMonthly(e,c,p,'2025-01',defaultInputs(e,'2025-01',p))
const sources=[{...monthly,estado:'emitido',version:1}]
const coverage=benefitCoverage(e,'decimo_tercero',2025,sources)
const annual=calculateBenefit(e,c,p,'decimo_tercero',2025,sources,{historicos:coverage.missing.map(periodo=>({periodo,base:1000,pagado:0,respaldo:'Prueba revertida'}))})
const seed=()=>sql.query(`INSERT INTO empleados(id,cedula,nombres,apellidos,cargo,departamento,fecha_ingreso,sueldo_base,region) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)`,[e.id,e.cedula,e.nombres,e.apellidos,e.cargo,e.departamento,e.fecha_ingreso,e.sueldo_base,e.region])
const save=(role,version=0)=>sql.query('SELECT guardar_rol($1::jsonb,$2::int)',[JSON.stringify(role),version])
const cancel=(id,version)=>sql.query('SELECT anular_rol($1::uuid,$2::int,$3)',[id,version,'Prueba revertida'])
const sentinel=()=>sql.query('SELECT $1::integer',['ROLLBACK_NOMINA_PRUEBA'])
async function check(name,queries,expected='22P02'){
 try { await sql.transaction(queries); throw new Error('FALTA_ROLLBACK') }
 catch(error) {
  if(error.code!==expected || expected==='22P02'&&!String(error.message).includes('ROLLBACK_NOMINA_PRUEBA')) {
   console.error('FALLÓ:',name,'Código:',error.code || 'ERROR');process.exitCode=1;return
  }
  console.log('OK:',name)
 }
}
await check('guardar, editar, revisar, anular y regenerar',[
 seed(),save(monthly),save(monthly,1),
 sql.query('SELECT 1 / CASE WHEN version=2 AND (SELECT count(*) FROM roles_revisiones WHERE rol_id=$1)=1 THEN 1 ELSE 0 END FROM roles_pago WHERE id=$1',[monthly.id]),
 cancel(monthly.id,2),save(monthly,3),
 sql.query("SELECT 1 / CASE WHEN version=4 AND estado='emitido' THEN 1 ELSE 0 END FROM roles_pago WHERE id=$1",[monthly.id]),sentinel()
])
await check('rechazar rol duplicado',[seed(),save(monthly),save({...monthly,id:crypto.randomUUID()})],'23505')
await check('rechazar versión obsoleta',[seed(),save(monthly),save(monthly,0)],'40001')
await check('proteger fuente de décimo emitido',[seed(),save(monthly),save(annual),save(monthly,1)],'P0002')
await check('proteger mes con saldo histórico ya liquidado',[seed(),save(monthly),save(annual),save(calculateMonthly(e,c,p,'2025-02',defaultInputs(e,'2025-02',p)))],'P0002')
await check('liberar fuente al anular décimo',[seed(),save(monthly),save(annual),cancel(annual.id,1),save(monthly,1),sentinel()])
const [cleanup]=await sql.query('SELECT count(*)::int AS cantidad FROM empleados WHERE id=$1',[e.id])
if(cleanup.cantidad!==0){console.error('FALLÓ: reversión de datos de prueba.');process.exitCode=1}
else console.log('Confirmado: no quedaron empleados ni roles de prueba.')
