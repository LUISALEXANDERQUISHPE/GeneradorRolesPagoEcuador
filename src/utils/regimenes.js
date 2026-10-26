export const regimenes = [
 {id:'codigo_trabajo',nombre:'Código del Trabajo',habilitado:true},
 {id:'losep',nombre:'LOSEP · Servicio público',habilitado:false},
 {id:'loep',nombre:'LOEP · Empresas públicas',habilitado:false},
 {id:'loei',nombre:'LOEI · Carrera educativa',habilitado:false},
 {id:'loes',nombre:'LOES · Personal académico',habilitado:false},
 {id:'especial',nombre:'Otro régimen especial',habilitado:false},
]
export const regimenNombre = id => regimenes.find(r=>r.id===id)?.nombre || id
export function assertRegimen(company) {
 const id=company?.regimen_laboral || 'codigo_trabajo'
 if(!regimenes.find(r=>r.id===id)?.habilitado) throw new Error('El cálculo para '+regimenNombre(id)+' aún no está implementado. No se pueden emitir roles con fórmulas del Código del Trabajo para este régimen.')
}
export function inicioFondos(fecha) {
 if(!/^\d{4}-\d{2}-\d{2}$/.test(fecha || '')) return ''
 const [y,m,d]=fecha.split('-').map(Number)
 return new Date(Date.UTC(y+1,m-1,Math.min(d,new Date(Date.UTC(y+1,m,0)).getUTCDate()))).toISOString().slice(0,10)
}
