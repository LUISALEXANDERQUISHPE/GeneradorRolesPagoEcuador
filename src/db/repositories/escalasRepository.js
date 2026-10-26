import { query } from '../client.js'
import { regimenes } from '../../utils/regimenes.js'
export async function listScales() { return query('SELECT * FROM escalas_salariales ORDER BY regimen,codigo') }
export async function saveScale(input, execute=query) {
 const codigo=String(input.codigo || '').trim().toUpperCase()
 const descripcion=String(input.descripcion || '').trim()
 if(!codigo || codigo.length>30 || descripcion.length>180) throw new Error('Revisa el código y la descripción de la escala.')
 if(!/^\d+(\.\d{1,2})?$/.test(String(input.sueldo)) || Number(input.sueldo)<=0 || Number(input.sueldo)>9999999999.99) throw new Error('Ingresa un sueldo positivo con hasta dos decimales.')
 if(!regimenes.some(r=>r.id===input.regimen)) throw new Error('Selecciona un régimen válido.')
 await execute(`INSERT INTO escalas_salariales(id,codigo,descripcion,sueldo,regimen,activo)
 VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT(id) DO UPDATE SET
 codigo=EXCLUDED.codigo,descripcion=EXCLUDED.descripcion,sueldo=EXCLUDED.sueldo,regimen=EXCLUDED.regimen,activo=EXCLUDED.activo`,
 [input.id || crypto.randomUUID(),codigo,descripcion,input.sueldo,input.regimen,input.activo!==false])
}
