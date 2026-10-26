import { assertRegimen, inicioFondos } from '../utils/regimenes.js'
import { today } from '../utils/formatos.js'

export const round = n => Math.round((Number(n) + Number.EPSILON) * 100) / 100
const num = (v, name, max=1000000000) => {
 const n=Number(v || 0)
 if (!Number.isFinite(n)||n<0||n>max) throw new Error(name + ': valor inválido.')
 return n
}
export const monthEnd = period => {
 const [y,m]=period.slice(0,7).split('-').map(Number)
 return new Date(Date.UTC(y,m,0)).toISOString().slice(0,10)
}
export function validDate(value) {
 return /^\d{4}-\d{2}-\d{2}$/.test(value || '') && !isNaN(Date.parse(value)) && new Date(value+'T12:00:00Z').toISOString().slice(0,10)===value
}
export function monthDays(employee, period, base=30, from=null) {
 const start=[period.slice(0,7)+'-01', employee.fecha_ingreso, from].filter(Boolean).sort().at(-1)
 const end=[monthEnd(period),employee.fecha_salida].filter(Boolean).sort()[0]
 if(start>end) return 0
 const dayStart=Number(start.slice(8))
 const dayEnd=end===monthEnd(period)?base:Math.min(base,Number(end.slice(8)))
 return Math.max(0, Math.min(base,dayEnd-Math.min(dayStart,base)+1))
}
export function modeFor(employee, period) {
 const entries=(employee.modalidades || []).filter(x=>x.desde<=period).sort((a,b)=>a.desde.localeCompare(b.desde))
 return entries.at(-1) || { tercero:employee.decimo_tercero_modalidad, cuarto:employee.decimo_cuarto_modalidad }
}
export function defaultInputs(employee,period,params) {
 return { dias_trabajados:monthDays(employee,period,Number(params.dias_base_mes)),horas_suplementarias:0,horas_extraordinarias:0,
 comisiones:0,bonos:0,anticipos:0,prestamos_iess:0,prestamos_quirografarios:0,descuentos:[],observaciones:'',fecha_pago:monthEnd(period),base_fondos:'' }
}
function shell(employee, company, params, period, type, input) {
 assertRegimen(company)
 if(!employee.id) throw new Error('Selecciona un empleado.')
 return {id:crypto.randomUUID(),empleado_id:employee.id,periodo:period.slice(0,7)+'-01',tipo:type,ejercicio:null,
 fecha_pago:input.fecha_pago || today(),inicio_devengo:period.slice(0,7)+'-01',fin_devengo:monthEnd(period),
 dias_trabajados:0,horas_suplementarias:0,horas_extraordinarias:0,comisiones:0,bonos:0,anticipos:0,prestamos_iess:0,prestamos_quirografarios:0,
 base_aportacion:0,total_ingresos:0,total_egresos:0,aporte_personal:0,aporte_patronal:0,decimo_tercero_acumulado:0,decimo_cuarto_acumulado:0,
 fondos_reserva_acumulados:0,empleado_snapshot:JSON.parse(JSON.stringify(employee)),empresa_snapshot:JSON.parse(JSON.stringify(company)),
 parametros_snapshot:JSON.parse(JSON.stringify(params)),datos_entrada:JSON.parse(JSON.stringify(input)),observaciones:input.observaciones || '',detalle:[],fuentes:[],version:0}
}
function add(role,tipo,codigo,descripcion,monto) {
 role.detalle.push({tipo,codigo,descripcion,monto:round(monto),orden:role.detalle.length})
}
function totals(role) {
 role.total_ingresos=round(role.detalle.filter(x=>x.tipo==='ingreso').reduce((s,x)=>s+x.monto,0))
 role.total_egresos=round(role.detalle.filter(x=>x.tipo==='egreso').reduce((s,x)=>s+x.monto,0))
 role.neto_recibir=round(role.total_ingresos-role.total_egresos)
 if(role.neto_recibir<0) throw new Error('Los descuentos superan los ingresos. Corrige los valores.')
 if(!validDate(role.fecha_pago)) throw new Error('Fecha de pago inválida.')
 return role
}
export function calculateMonthly(employee,company,params,period,input) {
 if(!/^\d{4}-(0[1-9]|1[0-2])/.test(period)) throw new Error('Selecciona un mes válido.')
 const sbu=num(params.sbu,'SBU'); if(!sbu) throw new Error('Configura el SBU antes de generar roles.')
 const base=num(params.dias_base_mes,'Días base',31), hours=num(params.horas_jornada,'Jornada',24)
 if(!base||!hours) throw new Error('Configura días base y jornada.')
 const r=shell(employee,company,params,period,'mensual',input)
 const mode=modeFor(employee,r.periodo)
 const days=num(input.dias_trabajados,'Días trabajados',base)
 if(!Number.isInteger(days)||days>monthDays(employee,r.periodo,base)) throw new Error('Los días trabajados exceden el tiempo de contrato en el mes o no son enteros.')
 for(const field of ['horas_suplementarias','horas_extraordinarias','comisiones','bonos','anticipos','prestamos_iess','prestamos_quirografarios']) r[field]=num(input[field],field)
 r.dias_trabajados=days
 const salary=num(employee.sueldo_base,'Sueldo'), hourValue=salary/base/hours
 add(r,'ingreso','SUELDO','Sueldo proporcional',salary/base*days)
 add(r,'ingreso','SUPLEMENTARIAS','Horas suplementarias',hourValue*r.horas_suplementarias*(1+num(params.recargo_suplementarias_pct,'Recargo')/100))
 add(r,'ingreso','EXTRAORDINARIAS','Horas extraordinarias',hourValue*r.horas_extraordinarias*(1+num(params.recargo_extraordinarias_pct,'Recargo')/100))
 add(r,'ingreso','COMISIONES','Comisiones remunerativas',r.comisiones)
 add(r,'ingreso','BONOS','Bonos remunerativos',r.bonos)
 r.base_aportacion=round(r.detalle.reduce((s,x)=>s+x.monto,0))
 if(!days&&r.base_aportacion) throw new Error('No puede haber remuneración con cero días trabajados.')
 r.aporte_personal=round(r.base_aportacion*num(params.aporte_personal_pct,'IESS')/100)
 r.aporte_patronal=round(r.base_aportacion*num(params.aporte_patronal_pct,'IESS')/100)
 const d13=round(r.base_aportacion/12),d14=round(sbu/12*days/base)
 r.decimo_tercero_acumulado=mode.tercero==='acumular'?d13:0
 r.decimo_cuarto_acumulado=mode.cuarto==='acumular'?d14:0
 add(r,mode.tercero==='acumular'?'informativo':'ingreso','DECIMO_13','Décimo tercero ('+(mode.tercero==='acumular'?'acumulado':'mensualizado')+')',d13)
 add(r,mode.cuarto==='acumular'?'informativo':'ingreso','DECIMO_14','Décimo cuarto ('+(mode.cuarto==='acumular'?'acumulado':'mensualizado')+')',d14)
 const anniversary=inicioFondos(employee.fecha_ingreso)
 const eligible=Math.min(days,monthDays(employee,r.periodo,base,anniversary))
 const eligibleBase=eligible===0?0:input.base_fondos!=='' && input.base_fondos!=null?num(input.base_fondos,'Base fondos'):r.base_aportacion*(eligible/Math.max(days,1))
 if(eligibleBase>r.base_aportacion) throw new Error('La base de fondos no puede superar la base de aportación.')
 const funds=round(eligibleBase*num(params.fondos_reserva_pct,'Fondos')/100)
 r.fondos_reserva_acumulados=employee.recibe_fondos_reserva?0:funds
 add(r,employee.recibe_fondos_reserva?'ingreso':'informativo','FONDOS','Fondos de reserva'+(employee.recibe_fondos_reserva?'':' al IESS'),funds)
 add(r,'egreso','IESS','Aporte personal IESS',r.aporte_personal)
 add(r,'egreso','ANTICIPOS','Anticipos',r.anticipos)
 add(r,'egreso','PRESTAMOS','Otros préstamos IESS',r.prestamos_iess)
 add(r,'egreso','QUIROGRAFARIOS','Préstamos quirografarios',r.prestamos_quirografarios)
 for(const [i,d] of (input.descuentos || []).entries()) {
  if(!d.descripcion?.trim()) throw new Error('Describe cada descuento adicional.')
  add(r,'egreso','OTRO_'+i,d.descripcion.trim(),num(d.monto,'Descuento'))
 }
 add(r,'informativo','PATRONAL','Aporte patronal IESS',r.aporte_patronal)
 r.datos_entrada.modalidad_aplicada=mode
 r.datos_entrada.dias_acumulados_14=mode.cuarto==='acumular'?days/base*30:0
 r.datos_entrada.inicio_fondos_reserva=anniversary
 r.datos_entrada.dias_fondos_reserva=eligible
 r.datos_entrada.base_fondos_calculada=round(eligibleBase)
 return totals(r)
}
export function benefitPeriod(type,year,region) {
 const y=Number(year)
 if(!Number.isInteger(y)||y<2000||y>2100) throw new Error('Año inválido.')
 if(type==='decimo_tercero') return {inicio:(y-1)+'-12-01',fin:y+'-11-30',pago:y+'-12-24'}
 if(type!=='decimo_cuarto') throw new Error('Tipo de rol inválido.')
 return region==='costa'?{inicio:(y-1)+'-03-01',fin:monthEnd(y+'-02'),pago:y+'-03-15'}:{inicio:(y-1)+'-08-01',fin:y+'-07-31',pago:y+'-08-15'}
}
export function monthsBetween(start,end) {
 const list=[];let value=start.slice(0,7)
 while(value<=end.slice(0,7)) {
  list.push(value+'-01')
  const [y,m]=value.split('-').map(Number)
  value=new Date(Date.UTC(y,m,1)).toISOString().slice(0,7)
 }
 return list
}
export function benefitCoverage(employee,type,year,rows) {
 const period=benefitPeriod(type,year,employee.region)
 const start=[period.inicio,employee.fecha_ingreso].sort().at(-1)
 const end=[period.fin,employee.fecha_salida].filter(Boolean).sort()[0]
 const months=start>end?[]:monthsBetween(start,end)
 const sources=rows.filter(r=>r.tipo==='mensual'&&r.estado==='emitido'&&r.empleado_id===employee.id&&months.includes(r.periodo.slice(0,10)))
 return {...period,start,end,months,sources,missing:months.filter(m=>!sources.some(r=>r.periodo.slice(0,10)===m))}
}
export function calculateBenefit(employee,company,params,type,year,rows,input) {
 const coverage=benefitCoverage(employee,type,year,rows)
 if(!coverage.months.length) throw new Error('El empleado no trabajó en este período.')
 if(coverage.end>today()) throw new Error('El período aún no ha cerrado. Genera el rol al finalizar el período o al registrar la salida.')
 const p={...params,sbu:num(input.sbu_anual || params.sbu,'SBU del año')}
 if(!p.sbu) throw new Error('Indica el SBU aplicable al año de pago.')
 const r=shell(employee,company,p,coverage.pago,type,input)
 r.ejercicio=Number(year); r.inicio_devengo=coverage.start;r.fin_devengo=coverage.end
 r.fecha_pago=input.fecha_pago || coverage.pago
 if(r.fecha_pago<coverage.end) throw new Error('La fecha de pago debe ser posterior al devengo.')
 let amount=0
 for(const source of coverage.sources) {
  const modes=source.datos_entrada?.modalidad_aplicada || modeFor(source.empleado_snapshot,source.periodo)
  if(type==='decimo_tercero'&&modes.tercero==='acumular') amount+=Number(source.base_aportacion)/12
  if(type==='decimo_cuarto'&&modes.cuarto==='acumular') amount+=p.sbu/360*(Number(source.dias_trabajados)/Number(source.parametros_snapshot.dias_base_mes)*30)
  r.fuentes.push({id:source.id,version:source.version})
 }
 const manual=input.historicos || []
 for(const month of coverage.missing) {
  const h=manual.find(x=>x.periodo===month)
  if(!h||!h.respaldo?.trim()) throw new Error('Falta completar el respaldo histórico de '+month.slice(0,7)+'.')
  const accrued=type==='decimo_tercero'?num(h.base,'Remuneración histórica')/12:p.sbu/360*num(h.dias,'Días históricos',monthDays(employee,month,30))
  const paid=num(h.pagado,'Décimo ya pagado')
  if(paid>round(accrued)) throw new Error('El décimo ya pagado supera lo devengado en '+month.slice(0,7)+'.')
  amount+=Math.max(0,accrued-paid)
 }
 if(round(amount)<=0) throw new Error('No hay saldo acumulado pendiente. Revisa la mensualización y los pagos previos.')
 add(r,'ingreso','BENEFICIO',type==='decimo_tercero'?'Décimo tercero acumulado':'Décimo cuarto acumulado',amount)
 r.datos_entrada.fuentes=r.fuentes
 r.datos_entrada.periodo_beneficio={inicio:coverage.inicio,fin:coverage.fin,pago:coverage.pago,meses:coverage.months}
 return totals(r)
}
