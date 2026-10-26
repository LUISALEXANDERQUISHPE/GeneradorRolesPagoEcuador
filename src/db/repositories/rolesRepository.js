import { query, transaction } from '../client.js'
export async function listRoles({ month='',year='',employee='',type='',state='' }={}) {
 const rows=await query(`
 SELECT (to_jsonb(r) - 'empresa_snapshot') || jsonb_build_object('empresa_snapshot',r.empresa_snapshot - 'logo_data_url') AS rol,
 coalesce((SELECT jsonb_agg(to_jsonb(d) ORDER BY d.orden) FROM roles_pago_detalle d WHERE d.rol_id=r.id),'[]'::jsonb) AS detalle
 FROM roles_pago r WHERE ($1='' OR to_char(r.periodo,'YYYY-MM')=$1)
 AND ($2='' OR to_char(r.periodo,'YYYY')=$2) AND ($3='' OR r.empleado_id::text=$3)
 AND ($4='' OR r.tipo=$4) AND ($5='' OR r.estado=$5)
 ORDER BY r.periodo DESC,r.creado_en DESC
 `,[month,String(year),employee,type,state])
 return rows.map(x=>({...x.rol,detalle:x.detalle}))
}
export async function getRole(id) {
 const [row]=await query(`
 SELECT to_jsonb(r) AS rol,
 coalesce((SELECT jsonb_agg(to_jsonb(d) ORDER BY d.orden) FROM roles_pago_detalle d WHERE d.rol_id=r.id),'[]'::jsonb) AS detalle
 FROM roles_pago r WHERE id=$1`,[id])
 if(!row) throw new Error('No se encontró el rol.')
 return {...row.rol,detalle:row.detalle}
}
export async function saveRoles(roles) {
 if(!roles.length) throw new Error('No hay roles para guardar.')
 return transaction(roles.map(r=>({text:'SELECT guardar_rol($1::jsonb,$2::int) AS id',values:[JSON.stringify(r),r.version || 0]})))
}
export const annulRole=(id,version,motivo)=>query('SELECT anular_rol($1::uuid,$2::int,$3::text)',[id,version,motivo])
export const revisions=id=>query('SELECT version,creado_en,contenido FROM roles_revisiones WHERE rol_id=$1 ORDER BY version DESC',[id])
