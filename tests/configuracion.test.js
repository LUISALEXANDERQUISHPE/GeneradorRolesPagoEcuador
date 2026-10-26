import test from 'node:test'
import assert from 'node:assert/strict'
import { validateConfiguration } from '../src/utils/configuracion.js'
import { createConfiguracionRepository } from '../src/db/repositories/configuracionRepository.js'
import { createPinia, setActivePinia } from 'pinia'
import { useConfiguracionStore } from '../src/stores/configuracion.js'
import { useConexionStore } from '../src/stores/conexion.js'
import { configuracionRepository } from '../src/db/repositories/configuracionRepository.js'

const company = { nombre: 'Empresa de prueba', ruc: '', correo: '' }
const parameters = { sbu: '500.00', aporte_personal_pct: '9.45', aporte_patronal_pct: '11.15', fondos_reserva_pct: '8.33', recargo_suplementarias_pct: '50', recargo_extraordinarias_pct: '100', dias_base_mes: '30', horas_jornada: '8' }

test('SBU vacío no se convierte en cero; rechaza días fraccionarios y porcentajes fuera de rango', () => {
  assert.deepEqual(validateConfiguration(company, parameters), {})
  for (const sbu of ['', null, '0', '-1', 'NaN', '1e3']) assert.ok(validateConfiguration(company, { ...parameters, sbu }).sbu)
  assert.ok(validateConfiguration(company, { ...parameters, dias_base_mes: '30.5' }).dias_base_mes)
  assert.ok(validateConfiguration(company, { ...parameters, aporte_personal_pct: '101' }).aporte_personal_pct)
  assert.ok(validateConfiguration(company, { ...parameters, sbu: '500.001' }).sbu)
})

test('acepta porcentajes cero y datos opcionales vacíos; rechaza logo activo y correo inválido', () => {
  assert.deepEqual(validateConfiguration(company, { ...parameters, fondos_reserva_pct: '0' }), {})
  assert.ok(validateConfiguration({ ...company, logo_data_url: 'data:image/svg+xml;base64,PHN2Zz4=' }, parameters).logo_data_url)
  assert.ok(validateConfiguration({ ...company, correo: 'correo-invalido' }, parameters).correo)
})

test('guardar rechaza datos inválidos sin enviar ninguna consulta', async () => {
  let count = 0
  const repository = createConfiguracionRepository(async () => { count++; return [] })
  await assert.rejects(repository.save(company, { ...parameters, sbu: '' }), { code: 'VALIDATION_ERROR' })
  assert.equal(count, 0)
})

test('el guardado envía empresa y parámetros juntos y mantiene el nombre hostil como parámetro', async () => {
  const input = "Empresa'; DROP TABLE empleados; --"
  let calls = 0
  const repository = createConfiguracionRepository(async (text, values) => {
    calls++
    assert.equal(text.includes(input), false)
    assert.equal(values[0], input)
    assert.equal(values[1], null)
    assert.equal(values[7], '500.00')
    assert.equal(values.length, 18)
    assert.equal(values[15], '#123b73')
    assert.equal(values[16], '#7dd3fc')
    return [{ empresa: { ...company, nombre: input }, parametros: parameters }]
  })
  const saved = await repository.save({ ...company, nombre: input, color_primario: '#123b73', color_acento: '#7dd3fc' }, parameters)
  assert.equal(calls, 1)
  assert.equal(saved.empresa.nombre, input)
})

test('no comunica éxito si faltan registros iniciales', async () => {
  const repository = createConfiguracionRepository(async () => [])
  await assert.rejects(repository.load(), { code: 'SEED_MISSING' })
  await assert.rejects(repository.save(company, parameters), { code: 'SEED_MISSING' })
})

test('Pinia conserva datos anteriores tras fallo y actualiza SBU y nombre solo al confirmar guardado', async () => {
  setActivePinia(createPinia())
  const store = useConfiguracionStore()
  const connection = useConexionStore()
  const oldSave = configuracionRepository.save
  try {
    store.empresa = { nombre: 'Anterior' }
    store.parametros = { sbu: null }
    connection.sbuConfigured = false
    configuracionRepository.save = async () => { throw new Error('Sin permisos para guardar.') }
    assert.equal(await store.save(company, parameters), false)
    assert.equal(store.empresa.nombre, 'Anterior')
    assert.equal(connection.sbuConfigured, false)
    assert.equal(store.saving, false)
    assert.equal(store.error, 'Sin permisos para guardar.')
    configuracionRepository.save = async () => ({ empresa: company, parametros: parameters })
    assert.equal(await store.save(company, parameters), true)
    assert.equal(store.error, '')
    assert.equal(connection.sbuConfigured, true)
    assert.equal(connection.company, company.nombre)
  } finally { configuracionRepository.save = oldSave }
})

test('al volver a abrir se leen los valores persistidos en lugar de reemplazarlos por valores iniciales', async () => {
  setActivePinia(createPinia())
  const store = useConfiguracionStore()
  const connection = useConexionStore()
  const oldLoad = configuracionRepository.load
  try {
    connection.verify = async () => true
    configuracionRepository.load = async () => ({ empresa: { nombre: 'Guardada en Neon' }, parametros: { ...parameters, sbu: '550.00' } })
    assert.equal(await store.load(), true)
    assert.equal(store.empresa.nombre, 'Guardada en Neon')
    assert.equal(store.parametros.sbu, '550.00')
    assert.equal(store.loading, false)
  } finally { configuracionRepository.load = oldLoad }
})

test('la carga inicial compartida conserva nombre y logo para todas las pantallas', async () => {
  setActivePinia(createPinia())
  const store = useConfiguracionStore()
  const connection = useConexionStore()
  const oldLoad = configuracionRepository.load
  const logo = 'data:image/png;base64,aGVsbG8='
  let reads = 0
  let release
  try {
    configuracionRepository.load = async () => {
      reads++
      await new Promise(resolve => { release = resolve })
      return { empresa: { nombre: 'Empresa con logo', logo_data_url: logo }, parametros: parameters }
    }
    const startup = store.load()
    const screen = store.load()
    release(true)
    assert.deepEqual(await Promise.all([startup, screen]), [true, true])
    assert.equal(reads, 1)
    assert.equal(store.empresa.logo_data_url, logo)
    assert.equal(connection.company, 'Empresa con logo')
    assert.equal(store.loading, false)
  } finally { configuracionRepository.load = oldLoad }
})
