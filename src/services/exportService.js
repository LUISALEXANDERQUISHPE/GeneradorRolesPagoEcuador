import { foreground } from '../utils/tema.js'
import { money, employeeName, roleLabel } from '../utils/formatos.js'
const clean=s=>String(s ?? '').replace(/[\u00a0\u202f]/g,' ')
const color=c=>/^#[0-9a-f]{6}$/i.test(c || '')?c:'#173d35'
async function createPdf(company,title) {
 const {jsPDF}=await import('jspdf')
 const doc=new jsPDF()
 doc.setFont('helvetica','bold');doc.setFontSize(16)
 const logo=company.logo_data_url
 let left=14
 if(logo){try{const properties=doc.getImageProperties(logo);const w=Math.min(32,20*properties.width/properties.height);doc.addImage(logo,properties.fileType,14,12,w,Math.min(20,32*properties.height/properties.width));left=51}catch{left=14}}
 const nameLines=doc.splitTextToSize(company.nombre || 'Empresa',196-left)
 doc.text(nameLines,left,19)
 const headerY=Math.max(29,19+nameLines.length*7)
 doc.setFont('helvetica','normal');doc.setFontSize(9)
 doc.text(clean(company.ruc?'RUC: '+company.ruc:''),left,headerY)
 doc.setFontSize(12);doc.text(title,14,headerY+13)
 doc.payrollHeaderEnd=headerY+13
 return doc
}
function footer(doc) {
 const count=doc.getNumberOfPages()
 for(let p=1;p<=count;p++){doc.setPage(p);doc.setFont('helvetica','normal');doc.setFontSize(8);doc.setTextColor(100);doc.text('Código del Trabajo · Ecuador · USD',14,287);doc.text('Página '+p+' de '+count,196,287,{align:'right'})}
}
export async function buildIndividualPdf(role) {
 const doc=await createPdf(role.empresa_snapshot,roleLabel(role.tipo)+(role.estado==='anulado'?' · ANULADO':''))
 const {autoTable}=await import('jspdf-autotable')
 doc.setFontSize(10)
 const info=[
  'Empleado: '+employeeName(role.empleado_snapshot),
  'Cédula: '+role.empleado_snapshot.cedula+' · Cargo: '+role.empleado_snapshot.cargo,
  'Departamento: '+role.empleado_snapshot.departamento,
  'Escala: '+(role.empleado_snapshot.escala_codigo || 'Sueldo individual')+' · Sueldo base: '+clean(money(role.empleado_snapshot.sueldo_base)),
  'Período: '+role.periodo.slice(0,7)+' · Fecha de pago: '+role.fecha_pago,
  role.tipo==='mensual'?'Días trabajados: '+role.dias_trabajados:'Devengo: '+role.inicio_devengo+' a '+role.fin_devengo,
  'Cuenta: '+(role.empleado_snapshot.numero_cuenta || 'No registrada'),
 ]
 let cursor=doc.payrollHeaderEnd+8
 for(const text of info){const lines=doc.splitTextToSize(clean(text),182);doc.text(lines,14,cursor);cursor+=lines.length*5}
 autoTable(doc,{startY:cursor+3,head:[['Tipo','Concepto','Valor (USD)']],body:role.detalle.filter(x=>Number(x.monto)!==0).map(x=>[x.tipo,x.descripcion,clean(money(x.monto))]),styles:{fontSize:9,cellPadding:3},headStyles:{fillColor:color(role.empresa_snapshot.color_primario),textColor:foreground(color(role.empresa_snapshot.color_primario))},columnStyles:{2:{halign:'right'}},margin:{bottom:23}})
 cursor=doc.lastAutoTable.finalY+9
 if(cursor>238){doc.addPage();cursor=20}
 doc.setFontSize(10);doc.text('Total ingresos: '+clean(money(role.total_ingresos)),14,cursor)
 doc.text('Total egresos: '+clean(money(role.total_egresos)),14,cursor+6)
 doc.setFont('helvetica','bold');doc.setFontSize(13);doc.text('NETO A RECIBIR: '+clean(money(role.neto_recibir)),14,cursor+15)
 doc.setFont('helvetica','normal');doc.setFontSize(9)
 cursor+=24
 if(role.observaciones){const lines=doc.splitTextToSize('Observaciones: '+clean(role.observaciones),180);for(const line of lines){if(cursor>258){doc.addPage();cursor=20}doc.text(line,14,cursor);cursor+=5}}
 if(cursor>235){doc.addPage();cursor=30}
 doc.line(20,cursor+25,90,cursor+25);doc.line(120,cursor+25,190,cursor+25)
 doc.text('Firma del empleado',55,cursor+31,{align:'center'});doc.text('Firma del empleador',155,cursor+31,{align:'center'})
 footer(doc)
 return doc
}
export async function downloadIndividual(role) {
 const doc=await buildIndividualPdf(role)
 doc.save(role.tipo+'_'+role.empleado_snapshot.cedula+'_'+role.periodo.slice(0,7)+'.pdf')
}
export async function buildConsolidatedPdf(roles,company,title) {
 const doc=await createPdf(company,title)
 const {autoTable}=await import('jspdf-autotable')
 const total=key=>roles.reduce((s,r)=>s+Number(r[key]),0)
 autoTable(doc,{startY:doc.payrollHeaderEnd+8,head:[['Empleado','Tipo','Ingresos','Egresos','Neto','IESS patronal']],
 body:roles.map(r=>[employeeName(r.empleado_snapshot),roleLabel(r.tipo),clean(money(r.total_ingresos)),clean(money(r.total_egresos)),clean(money(r.neto_recibir)),clean(money(r.aporte_patronal))]),
 foot:[['TOTALES','',clean(money(total('total_ingresos'))),clean(money(total('total_egresos'))),clean(money(total('neto_recibir'))),clean(money(total('aporte_patronal')))]],
 styles:{fontSize:8,cellPadding:2},headStyles:{fillColor:color(company.color_primario),textColor:foreground(color(company.color_primario))},footStyles:{fillColor:color(company.color_primario),textColor:foreground(color(company.color_primario))},margin:{bottom:23},columnStyles:{2:{halign:'right'},3:{halign:'right'},4:{halign:'right'},5:{halign:'right'}}})
 footer(doc);return doc
}
export async function downloadConsolidatedPdf(roles,company,month) {
 const doc=await buildConsolidatedPdf(roles,company,'Consolidado de nómina · '+month)
 doc.save('nomina_'+month+'.pdf')
}
export async function buildWorkbook(roles) {
 const XLSX=await import('xlsx')
 const data=roles.map(r=>({'Cédula':r.empleado_snapshot.cedula,'Empleado':employeeName(r.empleado_snapshot),'Tipo':roleLabel(r.tipo),'Período':r.periodo.slice(0,7),'Fecha de pago':r.fecha_pago,'Ingresos':Number(r.total_ingresos),'Egresos':Number(r.total_egresos),'Neto':Number(r.neto_recibir),'IESS personal':Number(r.aporte_personal),'IESS patronal':Number(r.aporte_patronal)}))
 const headers=['Cédula','Empleado','Tipo','Período','Fecha de pago','Ingresos','Egresos','Neto','IESS personal','IESS patronal']
 const sheet=XLSX.utils.json_to_sheet(data,{header:headers})
 const last=roles.length+2
 XLSX.utils.sheet_add_aoa(sheet,[['TOTALES']],{origin:'A'+last})
 for(let c=5;c<=9;c++){
  const col=XLSX.utils.encode_col(c)
  sheet[col+last]={t:'n',f:'SUM('+col+'2:'+col+(last-1)+')',v:data.reduce((s,r)=>s+r[headers[c]],0),z:'"$"#,##0.00'}
  for(let row=2;row<last;row++)sheet[col+row].z='"$"#,##0.00'
 }
 sheet['!cols']=[{wch:14},{wch:32},{wch:22},{wch:12},{wch:16},...Array.from({length:5},()=>({wch:18}))]
 sheet['!autofilter']={ref:'A1:J'+(last-1)}
 const workbook=XLSX.utils.book_new();XLSX.utils.book_append_sheet(workbook,sheet,'Nómina')
 return {XLSX,workbook}
}
export async function downloadExcel(roles,month) {
 const {XLSX,workbook}=await buildWorkbook(roles)
 XLSX.writeFile(workbook,'nomina_'+month+'.xlsx')
}
