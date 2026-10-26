import { ref } from 'vue'
import { defineStore } from 'pinia'

export const useNotificacionesStore = defineStore('notificaciones', () => {
  const items = ref([])
  const timers = new Map()

  function remove(id) {
    clearTimeout(timers.get(id))
    timers.delete(id)
    items.value = items.value.filter((item) => item.id !== id)
  }

  function notify(message, type = 'success') {
    const id = crypto.randomUUID()
    items.value.push({ id, message, type })
    if (items.value.length > 4) remove(items.value[0].id)
    if (type !== 'error') timers.set(id, setTimeout(() => remove(id), 7000))
    return id
  }

  return { items, notify, remove }
})
