import test from 'node:test'
import assert from 'node:assert/strict'
import { createDatabaseClient, validateConnectionString, toDatabaseError } from '../src/db/client.js'

const example = 'postgresql://test:fictional@localhost/testing'

test('la configuración ausente no impide importar o crear el cliente', async () => {
  const client = createDatabaseClient({ connectionString: '' })
  await assert.rejects(client.query('SELECT 1'), { code: 'CONFIG_REQUIRED' })
})

test('rechaza el ejemplo y protocolos incorrectos sin revelar credenciales', () => {
  assert.throws(() => validateConnectionString('postgresql://USUARIO:CONTRASENA@ep-ejemplo.neon.tech/db'), { code: 'CONFIG_REQUIRED' })
  assert.throws(() => validateConnectionString('https://test:fictional@localhost/testing'), { code: 'CONFIG_INVALID' })
  assert.equal(validateConnectionString(example), example)
})

test('transmite una entrada maliciosa como parámetro, nunca como texto SQL', async () => {
  let received
  const client = createDatabaseClient({ connectionString: example, driver: () => ({
    query: async (text, values, options) => { received = { text, values, options }; return [] },
  }) })
  const input = "'; DROP TABLE empleados; --"
  await client.query('SELECT id FROM empleados WHERE nombres = $1', [input])
  assert.equal(received.text, 'SELECT id FROM empleados WHERE nombres = $1')
  assert.deepEqual(received.values, [input])
  assert.equal(received.options.fetchOptions.signal.aborted, false)
})

test('la transacción conserva parámetros y utiliza una única transacción del driver', async () => {
  let calls = 0
  let actual
  const client = createDatabaseClient({ connectionString: example, driver: () => ({
    query: (text, values) => ({ text, values }),
    transaction: async (queries) => { calls++; actual = queries; return [[], []] },
  }) })
  const statements = [{ text: 'SELECT $1::int', values: [1] }, { text: 'SELECT $1::text', values: ['dato'] }]
  await client.transaction(statements)
  assert.equal(calls, 1)
  assert.deepEqual(actual, statements)
  await assert.rejects(client.transaction([]), { code: 'EMPTY_TRANSACTION' })
})

test('los errores desconocidos no exponen credenciales, consultas ni detalles del driver', async () => {
  const secretMessage = 'password=secreto SELECT datos_privados'
  const safe = toDatabaseError({ code: secretMessage, message: secretMessage })
  assert.equal(safe.code, 'CONNECTION_ERROR')
  assert.equal(JSON.stringify(safe).includes('secreto'), false)
  assert.equal(safe.message.includes('SELECT'), false)
  assert.equal(toDatabaseError({ code: '23505' }).code, '23505')
  const client = createDatabaseClient({ connectionString: example, driver: () => ({ query: async () => { throw new Error(secretMessage) } }) })
  await assert.rejects(client.query('SELECT 1'), { code: 'CONNECTION_ERROR' })
})

test('cancela la consulta y devuelve un error legible al vencer el tiempo', async () => {
  const client = createDatabaseClient({ connectionString: example, timeoutMs: 5, driver: () => ({
    query: (_text, _values, options) => new Promise((_resolve, reject) => {
      options.fetchOptions.signal.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')))
    }),
  }) })
  await assert.rejects(client.query('SELECT 1'), { code: 'TIMEOUT' })
})
