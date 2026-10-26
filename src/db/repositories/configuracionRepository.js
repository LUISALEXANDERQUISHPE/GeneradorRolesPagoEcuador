import { query, DatabaseError } from '../client.js'
import { normalizeConfiguration, validateConfiguration } from '../../utils/configuracion.js'

export function createConfiguracionRepository(execute = query) {
  async function load() {
    const [row] = await execute(`
      SELECT to_jsonb(e) AS empresa, to_jsonb(p) AS parametros
      FROM public.empresa e JOIN public.parametros p ON p.empresa_id = e.id
      WHERE e.id = $1 AND p.id = $1
    `, [1])
    if (!row) throw new DatabaseError('Faltan la empresa o los parámetros iniciales. Ejecuta schema.sql.', 'SEED_MISSING')
    return row
  }

  async function save(company, parameters) {
    if (Object.keys(validateConfiguration(company, parameters)).length) {
      throw new DatabaseError('Revisa los campos marcados antes de guardar.', 'VALIDATION_ERROR')
    }
    const { empresa: e, parametros: p } = normalizeConfiguration(company, parameters)
    // Una sola sentencia: ambos cambios se guardan juntos o se revierten.
    const [row] = await execute(`
      WITH empresa_guardada AS (
        UPDATE public.empresa SET nombre = $1, ruc = $2, direccion = $3,
          telefono = $4, correo = $5, representante = $6, logo_data_url = $7,
          color_primario = $16, color_acento = $17, regimen_laboral = $18
        WHERE id = 1 AND EXISTS (
          SELECT 1 FROM public.parametros WHERE id = 1 AND empresa_id = 1
        )
        RETURNING *
      ), parametros_guardados AS (
        UPDATE public.parametros SET sbu = $8, aporte_personal_pct = $9,
          aporte_patronal_pct = $10, fondos_reserva_pct = $11,
          recargo_suplementarias_pct = $12, recargo_extraordinarias_pct = $13,
          dias_base_mes = $14, horas_jornada = $15
        WHERE id = 1 AND empresa_id IN (SELECT id FROM empresa_guardada)
        RETURNING *
      )
      SELECT to_jsonb(e) AS empresa, to_jsonb(p) AS parametros
      FROM empresa_guardada e CROSS JOIN parametros_guardados p
    `, [e.nombre, e.ruc, e.direccion, e.telefono, e.correo, e.representante, e.logo_data_url,
      p.sbu, p.aporte_personal_pct, p.aporte_patronal_pct, p.fondos_reserva_pct,
      p.recargo_suplementarias_pct, p.recargo_extraordinarias_pct, p.dias_base_mes, p.horas_jornada, e.color_primario, e.color_acento, e.regimen_laboral])
    if (!row) throw new DatabaseError('No se encontró la configuración inicial. Recarga y revisa schema.sql.', 'SEED_MISSING')
    return row
  }
  return { load, save }
}

export const configuracionRepository = createConfiguracionRepository()
