import { ref } from 'vue'
import { applyTheme } from '../utils/tema.js'
import { readBrandCache, saveBrandCache } from '../utils/marcaCache.js'
import { defineStore } from 'pinia'
import { configuracionRepository } from '../db/repositories/configuracionRepository.js'
import { useConexionStore } from './conexion.js'

export const useConfiguracionStore = defineStore('configuracion', () => {
  const empresa = ref(readBrandCache())
  const parametros = ref(null)
  const initialized = ref(false)
  const loading = ref(false)
  const saving = ref(false)
  const error = ref('')
  const connection = useConexionStore()
  if (empresa.value) connection.company = empresa.value.nombre
  let lastLoadedAt = 0

  function apply(result) {
    empresa.value = result.empresa
    applyTheme(result.empresa)
    saveBrandCache(result.empresa)
    parametros.value = result.parametros
    connection.company = result.empresa.nombre
    connection.sbuConfigured = Number(result.parametros.sbu) > 0
    connection.state = 'conectado'
    connection.message = 'Configuración sincronizada con Neon.'
    lastLoadedAt = Date.now()
  }

  let pendingLoad
  function load({ force = false } = {}) {
    if (pendingLoad) return pendingLoad
    if (saving.value) return Promise.resolve(false)
    if (!force && parametros.value && Date.now() - lastLoadedAt < 60000) return Promise.resolve(true)
    loading.value = true
    error.value = ''
    connection.state = 'verificando'
    pendingLoad = (async () => {
      try {
        // Una consulta trae todo; no repetimos comprobaciones antes de leer.
        apply(await configuracionRepository.load())
        return true
      } catch (cause) {
        error.value = cause.message
        connection.state = 'error'
        connection.message = cause.message
        return false
      } finally {
        initialized.value = true
        loading.value = false
        pendingLoad = undefined
      }
    })()
    return pendingLoad
  }

  async function save(company, parameters) {
    if (loading.value || saving.value) return false
    saving.value = true
    error.value = ''
    try {
      apply(await configuracionRepository.save(company, parameters))
      return true
    } catch (cause) {
      error.value = cause.message
      return false
    } finally {
      saving.value = false
    }
  }

  return { empresa, parametros, initialized, loading, saving, error, load, save }
})
