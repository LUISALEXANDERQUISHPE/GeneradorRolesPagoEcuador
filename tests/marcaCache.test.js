import test from 'node:test'
import assert from 'node:assert/strict'
import { brandCacheKey, readBrandCache, saveBrandCache } from '../src/utils/marcaCache.js'
import { createPinia, setActivePinia } from 'pinia'
import { useConfiguracionStore } from '../src/stores/configuracion.js'
import { configuracionRepository } from '../src/db/repositories/configuracionRepository.js'
const company = { nombre: 'Marca guardada', color_primario: '#123b73', color_acento: '#7dd3fc', logo_data_url: '' }
const memory = () => { const data = new Map(); return { getItem: key => data.get(key) ?? null, setItem: (key, value) => data.set(key, value) } }

test('caché solo contiene identidad visual y distingue bases sin incluir credenciales', () => {
  const key = brandCacheKey('postgresql://usuario:secreto@host/base')
  assert.equal(key.includes('secreto'), false)
  assert.notEqual(key, brandCacheKey('postgresql://usuario:secreto@host/otra'))
  const storage = memory()
  saveBrandCache({ ...company, ruc: '123', correo: 'privado', sueldo: 500 }, storage, key)
  assert.deepEqual(readBrandCache(storage, key), company)
  assert.equal(storage.getItem(key).includes('privado'), false)
  assert.equal(readBrandCache(storage, 'otra'), null)
})

test('caché dañada o almacenamiento bloqueado no interrumpen el arranque', () => {
  assert.equal(readBrandCache({ getItem: () => '{' }, 'key'), null)
  const blocked = { getItem() { throw new Error('denied') }, setItem() { throw new Error('quota') } }
  assert.equal(readBrandCache(blocked, 'key'), null)
  assert.doesNotThrow(() => saveBrandCache(company, blocked, 'key'))
  const storage = memory()
  storage.setItem('key', JSON.stringify({ version: 1, empresa: { ...company, color_primario: 'url(fake)' } }))
  assert.equal(readBrandCache(storage, 'key'), null)
})

test('reutiliza configuración reciente, permite refrescar y preserva identidad si falla la red', async () => {
  setActivePinia(createPinia())
  const store = useConfiguracionStore()
  const original = configuracionRepository.load
  let calls = 0
  try {
    configuracionRepository.load = async () => { calls++; return { empresa: company, parametros: { sbu: '500' } } }
    assert.equal(await store.load(), true)
    assert.equal(await store.load(), true)
    assert.equal(calls, 1)
    assert.equal(await store.load({ force: true }), true)
    assert.equal(calls, 2)
    configuracionRepository.load = async () => { throw new Error('Sin red') }
    assert.equal(await store.load({ force: true }), false)
    assert.equal(store.empresa.color_primario, company.color_primario)
    assert.equal(store.initialized, true)
  } finally { configuracionRepository.load = original }
})
