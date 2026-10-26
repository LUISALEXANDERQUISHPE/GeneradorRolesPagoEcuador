import { query, DatabaseError } from '../client.js'
import { validarCedula } from '../../utils/cedula.js'
import { validDate } from '../../services/nominaService.js'

export async function listEmployees() {
 const rows=await query('SELECT to_jsonb(e) AS empleado FROM empleados e ORDER BY apellidos,nombres')
 return rows.map(r=>r.empleado)
}
export async function saveEmployee(input, original=null) {
 const e=JSON.parse(JSON.stringify(input))
 for(const key of ['nombres','apellidos','cargo','departamento']) {
  e[key]=String(e[key] || '').trim()
  if(!e[key] || e[key].length>120) throw new Error('Completa '+key+' (máximo 120 caracteres).')
 }
 if(!validarCedula(e.cedula)) throw new Error('La cédula ecuatoriana no es válida.')
 if(!validDate(e.fecha_ingreso)||e.fecha_salida&&!validDate(e.fecha_salida)||e.fecha_salida&&e.fecha_salida<e.fecha_ingreso) throw new Error('Revisa las fechas de ingreso y salida.')
 if(!Number.isFinite(Number(e.sueldo_base))||Number(e.sueldo_base)<=0||Number(e.sueldo_base)>9999999999.99) throw new Error('Ingresa un sueldo válido.')
 if(!['sierra','costa'].includes(e.region)) throw new Error('Selecciona la región laboral.')
 const id=e.id || crypto.randomUUID()
 if(e.escala_id) {
  const [scale]=await query('SELECT s.* FROM escalas_salariales s JOIN empresa e ON e.regimen_laboral=s.regimen WHERE s.id=$1 AND e.id=1',[e.escala_id])
  const applying=!original || original.escala_id!==e.escala_id || e.aplicar_escala
  if(!scale || applying && !scale.activo) throw new Error('La escala no está activa o no corresponde al régimen de la empresa.')
  if(applying) {
   if(Number(e.sueldo_base)!==Number(scale.sueldo)) throw new Error('El sueldo de la escala cambió. Recarga y vuelve a seleccionarla.')
   e.sueldo_base=scale.sueldo;e.escala_codigo=scale.codigo
  } else {
   e.sueldo_base=original.sueldo_base;e.escala_codigo=original.escala_codigo
  }
 } else {e.escala_id=null;e.escala_codigo=null}
 let history=original?.modalidades || []
 const changed=!original || original.decimo_tercero_modalidad!==e.decimo_tercero_modalidad || original.decimo_cuarto_modalidad!==e.decimo_cuarto_modalidad
 if(changed) {
  const since=(e.vigente_desde || e.fecha_ingreso.slice(0,7))+'-01'
  if(!validDate(since) || since < e.fecha_ingreso.slice(0,7)+'-01') throw new Error('La vigencia debe ser un mes válido desde el ingreso.')
  if(!history.length && since > e.fecha_ingreso.slice(0,7)+'-01') {
   history=[{desde:e.fecha_ingreso.slice(0,7)+'-01',tercero:original?.decimo_tercero_modalidad || 'mensualizar',cuarto:original?.decimo_cuarto_modalidad || 'mensualizar',solicitud:'Modalidad anterior al cambio registrado'}]
  }
  const [last]=await query("SELECT max(periodo)::text AS periodo FROM roles_pago WHERE empleado_id=$1 AND tipo='mensual' AND estado='emitido'",[id])
  if(last.periodo && since<=last.periodo) throw new Error('La nueva modalidad debe iniciar después del último rol emitido: '+last.periodo.slice(0,7))
  if((e.decimo_tercero_modalidad==='acumular'||e.decimo_cuarto_modalidad==='acumular')&&!e.solicitud?.trim()) throw new Error('Registra la referencia de la solicitud escrita de acumulación.')
  history=[...history.filter(x=>x.desde!==since),{desde:since,tercero:e.decimo_tercero_modalidad,cuarto:e.decimo_cuarto_modalidad,solicitud:e.solicitud || ''}].sort((a,b)=>a.desde.localeCompare(b.desde))
 }
 const [row]=await query(`
 INSERT INTO empleados(id,cedula,nombres,apellidos,cargo,departamento,fecha_ingreso,fecha_salida,sueldo_base,numero_cuenta,estado,recibe_fondos_reserva,decimo_tercero_modalidad,decimo_cuarto_modalidad,region,modalidades,escala_id,escala_codigo)
 VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16::jsonb,$17,$18)
 ON CONFLICT(id) DO UPDATE SET cedula=EXCLUDED.cedula,nombres=EXCLUDED.nombres,apellidos=EXCLUDED.apellidos,
 cargo=EXCLUDED.cargo,departamento=EXCLUDED.departamento,fecha_ingreso=EXCLUDED.fecha_ingreso,fecha_salida=EXCLUDED.fecha_salida,
 sueldo_base=EXCLUDED.sueldo_base,numero_cuenta=EXCLUDED.numero_cuenta,estado=EXCLUDED.estado,
 recibe_fondos_reserva=EXCLUDED.recibe_fondos_reserva,decimo_tercero_modalidad=EXCLUDED.decimo_tercero_modalidad,
 decimo_cuarto_modalidad=EXCLUDED.decimo_cuarto_modalidad,region=EXCLUDED.region,modalidades=EXCLUDED.modalidades,escala_id=EXCLUDED.escala_id,escala_codigo=EXCLUDED.escala_codigo
 RETURNING *
 `,[id,e.cedula,e.nombres,e.apellidos,e.cargo,e.departamento,e.fecha_ingreso,e.fecha_salida || null,e.sueldo_base,e.numero_cuenta || null,e.estado,e.recibe_fondos_reserva,e.decimo_tercero_modalidad,e.decimo_cuarto_modalidad,e.region,JSON.stringify(history),e.escala_id,e.escala_codigo])
 return row
}
export async function deleteEmployee(id) {
 const rows=await query('DELETE FROM empleados WHERE id=$1 RETURNING id',[id])
 if(!rows.length) throw new DatabaseError('El empleado ya no existe. Recarga la lista.','40001')
}
