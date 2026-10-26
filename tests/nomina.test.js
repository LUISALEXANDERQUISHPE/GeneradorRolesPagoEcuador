import test from 'node:test'
import assert from 'node:assert/strict'
import { calculateMonthly, calculateBenefit, defaultInputs, benefitPeriod, monthDays, modeFor } from '../src/services/nominaService.js'
import { validarCedula } from '../src/utils/cedula.js'
import { buildIndividualPdf, buildConsolidatedPdf, buildWorkbook } from '../src/services/exportService.js'
export const employee={id:'00000000-0000-4000-8000-000000000001',cedula:'1710034065',nombres:'Empleado',apellidos:'Prueba',cargo:'Analista',departamento:'Pruebas',fecha_ingreso:'2020-01-01',fecha_salida:null,sueldo_base:1000,recibe_fondos_reserva:true,decimo_tercero_modalidad:'mensualizar',decimo_cuarto_modalidad:'mensualizar',region:'sierra',modalidades:[]}
export const company={nombre:'Empresa de prueba',color_primario:'#123b73'}
export const params={sbu:500,aporte_personal_pct:9.45,aporte_patronal_pct:11.15,fondos_reserva_pct:8.33,recargo_suplementarias_pct:50,recargo_extraordinarias_pct:100,dias_base_mes:30,horas_jornada:8}
const base=(e=employee,period='2025-01')=>defaultInputs(e,period,params)

test('cédula: dígito verificador, longitud y provincia',()=>{
 assert.equal(validarCedula('1710034065'),true)
 for(const value of ['1710034066','0000000000','9910034065','171003406','abcdefghij'])assert.equal(validarCedula(value),false)
})
test('rol mensual incluye extras, beneficios y descuentos sin descontar aporte patronal',()=>{
 const r=calculateMonthly(employee,company,params,'2025-01',{...base(),horas_suplementarias:2,horas_extraordinarias:1,comisiones:100,bonos:50,anticipos:100,prestamos_iess:20,prestamos_quirografarios:30,descuentos:[{descripcion:'Descuento documentado',monto:5}]})
 assert.equal(r.base_aportacion,1170.83)
 assert.equal(r.aporte_personal,110.64)
 assert.equal(r.aporte_patronal,130.55)
 assert.equal(r.total_ingresos,1407.60)
 assert.equal(r.total_egresos,265.64)
 assert.equal(r.neto_recibir,1141.96)
})
test('acumulaciones se informan y no se suman al neto mensual',()=>{
 const e={...employee,recibe_fondos_reserva:false,decimo_tercero_modalidad:'acumular',decimo_cuarto_modalidad:'acumular'}
 const r=calculateMonthly(e,company,params,'2025-01',base(e))
 assert.equal(r.neto_recibir,905.50)
 assert.equal(r.decimo_tercero_acumulado,83.33)
 assert.equal(r.decimo_cuarto_acumulado,41.67)
 assert.equal(r.fondos_reserva_acumulados,83.30)
})
test('días parciales, febrero y fecha de aniversario de fondos',()=>{
 assert.equal(monthDays(employee,'2025-02',30),30)
 assert.equal(monthDays({...employee,fecha_ingreso:'2025-02-16'},'2025-02',30),15)
 assert.equal(monthDays({...employee,fecha_salida:'2025-02-10'},'2025-02',30),10)
 const e={...employee,fecha_ingreso:'2024-01-16'}
 const r=calculateMonthly(e,company,params,'2025-01',base(e))
 assert.equal(r.detalle.find(d=>d.codigo==='FONDOS').monto,41.65)
 const before=calculateMonthly({...employee,fecha_ingreso:'2024-02-01'},company,params,'2025-01',base())
 assert.equal(before.detalle.find(d=>d.codigo==='FONDOS').monto,0)
})
test('rechaza días fuera del contrato y descuentos mayores que ingresos',()=>{
 assert.throws(()=>calculateMonthly(employee,company,params,'2025-01',{...base(),dias_trabajados:31}))
 assert.throws(()=>calculateMonthly(employee,company,params,'2025-01',{...base(),anticipos:9999}))
 assert.throws(()=>calculateMonthly(employee,company,params,'2025-01',{...base(),descuentos:[{descripcion:'',monto:5}]}))
})
test('modalidad por vigencia conserva meses anteriores',()=>{
 const e={...employee,modalidades:[{desde:'2024-01-01',tercero:'mensualizar',cuarto:'mensualizar'},{desde:'2025-01-01',tercero:'acumular',cuarto:'mensualizar'}]}
 assert.equal(modeFor(e,'2024-12-01').tercero,'mensualizar')
 assert.equal(modeFor(e,'2025-01-01').tercero,'acumular')
})
test('períodos oficiales de décimos y febrero bisiesto',()=>{
 assert.deepEqual(benefitPeriod('decimo_tercero',2025,'sierra'),{inicio:'2024-12-01',fin:'2025-11-30',pago:'2025-12-24'})
 assert.deepEqual(benefitPeriod('decimo_cuarto',2024,'costa'),{inicio:'2023-03-01',fin:'2024-02-29',pago:'2024-03-15'})
 assert.deepEqual(benefitPeriod('decimo_cuarto',2025,'sierra'),{inicio:'2024-08-01',fin:'2025-07-31',pago:'2025-08-15'})
})
function history(type) {
 const e={...employee,decimo_tercero_modalidad:'acumular',decimo_cuarto_modalidad:'acumular'}
 const start=type==='decimo_tercero'?11:7
 const rows=Array.from({length:12},(_,i)=>{
  const period=new Date(Date.UTC(2024,start+i,1)).toISOString().slice(0,7)
  const r=calculateMonthly(e,company,params,period,base(e,period))
  return {...r,version:1,estado:'emitido'}
 })
 return {e,rows}
}
test('décimo tercero anual usa remuneración, sin IESS y sin duplicar mensualizados',()=>{
 const {e,rows}=history('decimo_tercero')
 const r=calculateBenefit(e,company,params,'decimo_tercero',2025,rows,{})
 assert.equal(r.neto_recibir,1000)
 assert.equal(r.aporte_personal,0);assert.equal(r.aporte_patronal,0)
 rows[0].datos_entrada.modalidad_aplicada.tercero='mensualizar'
 assert.equal(calculateBenefit(e,company,params,'decimo_tercero',2025,rows,{}).neto_recibir,916.67)
})
test('décimo cuarto acumulado usa SBU del año de pago y días devengados',()=>{
 const {e,rows}=history('decimo_cuarto')
 for(const r of rows)r.parametros_snapshot.sbu=450
 assert.equal(calculateBenefit(e,company,params,'decimo_cuarto',2025,rows,{sbu_anual:500}).neto_recibir,500)
 rows[0].datos_entrada.modalidad_aplicada.cuarto='mensualizar'
 assert.equal(calculateBenefit(e,company,params,'decimo_cuarto',2025,rows,{sbu_anual:500}).neto_recibir,458.33)
})
test('exige respaldo de meses faltantes y resta lo ya pagado',()=>{
 const {e,rows}=history('decimo_tercero');const missing=rows.shift().periodo
 assert.throws(()=>calculateBenefit(e,company,params,'decimo_tercero',2025,rows,{}),/respaldo/)
 const r=calculateBenefit(e,company,params,'decimo_tercero',2025,rows,{historicos:[{periodo:missing,base:1000,pagado:50,respaldo:'Comprobante de prueba'}]})
 assert.equal(r.neto_recibir,950)
})
test('PDF individual/consolidado y Excel producen archivos con totales numéricos',async()=>{
 const role=calculateMonthly(employee,company,params,'2025-01',base())
 const pdf=await buildIndividualPdf(role);assert.ok(pdf.output('arraybuffer').byteLength>1000)
 const consolidated=await buildConsolidatedPdf([role],company,'Prueba');assert.ok(consolidated.getNumberOfPages()>=1)
 const {XLSX,workbook}=await buildWorkbook([role])
 const sheet=workbook.Sheets['Nómina']
 assert.equal(sheet.H2.v,role.neto_recibir);assert.equal(sheet.H3.f,'SUM(H2:H2)')
 assert.equal(sheet.A2.t,'s');assert.equal(sheet.A2.v,employee.cedula)
 const bytes=XLSX.write(workbook,{type:'buffer',bookType:'xlsx'});assert.ok(bytes.length>1000)
})

test('fondos: primer año cero, aniversario proporcional y siguiente mes completo',()=>{
 const e={...employee,fecha_ingreso:'2025-06-16'}
 const amount=(period,extra={})=>calculateMonthly(e,company,params,period,{...base(e,period),...extra})
 assert.equal(amount('2026-05').detalle.find(d=>d.codigo==='FONDOS').monto,0)
 const anniversary=amount('2026-06')
 assert.equal(anniversary.detalle.find(d=>d.codigo==='FONDOS').monto,41.65)
 assert.equal(anniversary.datos_entrada.inicio_fondos_reserva,'2026-06-16')
 assert.equal(anniversary.datos_entrada.dias_fondos_reserva,15)
 assert.equal(amount('2026-07').detalle.find(d=>d.codigo==='FONDOS').monto,83.30)
 assert.equal(amount('2026-05',{base_fondos:1000}).detalle.find(d=>d.codigo==='FONDOS').monto,0)
})
