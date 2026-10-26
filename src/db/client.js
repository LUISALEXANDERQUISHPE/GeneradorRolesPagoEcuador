import { neon } from '@neondatabase/serverless'

export class DatabaseError extends Error {
  constructor(message, code = 'DATABASE_ERROR') {
    super(message)
    this.name = 'DatabaseError'
    this.code = code
  }
}

export function validateConnectionString(value) {
  if (!value?.trim() || /USUARIO|CONTRASENA|ep-ejemplo/.test(value)) {
    throw new DatabaseError('Configura VITE_DATABASE_URL en .env y reinicia Vite.', 'CONFIG_REQUIRED')
  }
  let url
  try { url = new URL(value.trim()) } catch {
    throw new DatabaseError('La conexión debe ser una URL PostgreSQL válida.', 'CONFIG_INVALID')
  }
  if (!['postgres:', 'postgresql:'].includes(url.protocol) || !url.hostname || !url.username || !url.password || url.pathname.length < 2) {
    throw new DatabaseError('La conexión necesita usuario, contraseña, servidor y nombre de base de datos.', 'CONFIG_INVALID')
  }
  return value.trim()
}

export function toDatabaseError(error) {
  if (error instanceof DatabaseError) return error
  const messages = {
    'P0002': 'Este rol sustenta un décimo emitido. Anula primero ese décimo para modificar sus fuentes.',
    '23505': 'Ya existe un registro con esos datos. Revisa la cédula o el período del rol.',
    '23503': 'El registro tiene datos relacionados o la referencia ya no existe.',
    '23514': 'Hay valores fuera de los límites permitidos. Revisa el formulario.',
    '23502': 'Faltan campos obligatorios.',
    '42P01': 'Faltan tablas. Ejecuta schema.sql en SQL Editor de Neon.',
    '42703': 'El esquema no coincide con esta versión. Revisa schema.sql.',
    '42501': 'El usuario de la conexión no tiene permisos para esta operación.',
    '28P01': 'Neon rechazó las credenciales. Revisa tu archivo .env.',
    '40001': 'Los datos cambiaron durante la operación. Recarga y vuelve a intentarlo.',
  }
  if (['AbortError', 'TimeoutError'].includes(error?.name)) {
    return new DatabaseError('La consulta tardó demasiado. Comprueba la conexión y vuelve a intentar.', 'TIMEOUT')
  }
  const code = String(error?.code || '')
  // Nunca mostramos el mensaje original: puede contener SQL o datos sensibles.
  return new DatabaseError(messages[code] || 'No se pudo completar la consulta. Revisa la conexión a Internet, Neon y la configuración.', messages[code] ? code : 'CONNECTION_ERROR')
}

export function createDatabaseClient({ connectionString, driver = neon, timeoutMs = 15000 }) {
  let sql
  const getSql = () => {
    if (!sql) sql = driver(validateConnectionString(connectionString))
    return sql
  }

  async function execute(operation) {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs)
    try {
      return await operation(getSql(), { fetchOptions: { signal: controller.signal } })
    } catch (error) {
      throw toDatabaseError(error)
    } finally {
      clearTimeout(timer)
    }
  }

  return {
    // text es SQL estático del repositorio; los datos siempre van en values.
    query(text, values = []) {
      return execute((client, options) => client.query(text, values, options))
    },
    // Todas las sentencias se envían juntas y se confirman o revierten juntas.
    transaction(statements) {
      if (!Array.isArray(statements) || statements.length === 0) {
        return Promise.reject(new DatabaseError('La transacción necesita al menos una consulta.', 'EMPTY_TRANSACTION'))
      }
      return execute((client, options) => client.transaction(
        statements.map(({ text, values = [] }) => client.query(text, values)),
        options,
      ))
    },
  }
}

const connectionString = import.meta.env?.VITE_DATABASE_URL || ''
export function getConnectionStatus() {
  try {
    validateConnectionString(connectionString)
    return { configured: true, message: 'Conexión configurada. Falta verificar acceso a Neon.' }
  } catch (error) {
    return { configured: false, message: toDatabaseError(error).message }
  }
}

const database = createDatabaseClient({ connectionString })
export const query = database.query
export const transaction = database.transaction

export async function testConnection() {
  const [result] = await query(`
    SELECT
      to_regclass('public.empresa') IS NOT NULL AS empresa,
      to_regclass('public.parametros') IS NOT NULL AS parametros,
      to_regclass('public.empleados') IS NOT NULL AS empleados,
      to_regclass('public.roles_pago') IS NOT NULL AS roles_pago,
      to_regclass('public.roles_pago_detalle') IS NOT NULL AS roles_pago_detalle
  `)
  const missing = Object.entries(result).filter(([, exists]) => !exists).map(([table]) => table)
  if (missing.length) {
    throw new DatabaseError(`Neon responde, pero faltan estas tablas: ${missing.join(', ')}. Ejecuta schema.sql.`, 'SCHEMA_MISSING')
  }
  const [settings] = await query(`
    SELECT e.nombre, p.sbu
    FROM public.empresa e
    JOIN public.parametros p ON p.empresa_id = e.id
    WHERE e.id = $1
  `, [1])
  if (!settings) throw new DatabaseError('Faltan los registros iniciales de empresa y parámetros. Ejecuta schema.sql.', 'SEED_MISSING')
  return { company: settings.nombre, sbuConfigured: Number(settings.sbu) > 0 }
}
