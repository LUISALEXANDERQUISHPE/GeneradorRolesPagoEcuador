import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { getConnectionStatus, testConnection } from '../db/client.js'

export const useConexionStore = defineStore('conexion', () => {
  const config = getConnectionStatus()
  const state = ref(config.configured ? 'pendiente' : 'sin-configurar')
  const message = ref(config.message)
  const company = ref('Mi empresa')
  const sbuConfigured = ref(false)
  const busy = computed(() => state.value === 'verificando')
  const connected = computed(() => state.value === 'conectado')

  async function verify() {
    if (busy.value) return false
    state.value = 'verificando'
    message.value = 'Verificando acceso a Neon y las tablas de nómina…'
    try {
      const result = await testConnection()
      company.value = result.company
      sbuConfigured.value = result.sbuConfigured
      state.value = 'conectado'
      message.value = 'Conexión verificada. Las cinco tablas y la configuración inicial están disponibles.'
      return true
    } catch (error) {
      state.value = error.code === 'CONFIG_REQUIRED' || error.code === 'CONFIG_INVALID' ? 'sin-configurar' : 'error'
      message.value = error.message
      return false
    }
  }

  return { state, message, company, sbuConfigured, busy, connected, verify }
})
