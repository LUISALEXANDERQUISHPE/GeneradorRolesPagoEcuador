<script setup>
import { CheckCircle2, AlertCircle, X } from '@lucide/vue'
import { useNotificacionesStore } from '../../stores/notificaciones.js'
const notifications = useNotificacionesStore()
</script>

<template>
  <div class="pointer-events-none fixed bottom-5 right-5 z-50 flex w-[calc(100%-2.5rem)] max-w-sm flex-col gap-3" aria-label="Notificaciones">
    <div v-for="item in notifications.items" :key="item.id" :role="item.type === 'error' ? 'alert' : 'status'" class="pointer-events-auto flex items-start gap-3 rounded-xl border bg-white p-4 shadow-lg" :class="item.type === 'error' ? 'border-red-200' : 'border-emerald-200'">
      <component :is="item.type === 'error' ? AlertCircle : CheckCircle2" :size="20" class="mt-0.5 shrink-0" :class="item.type === 'error' ? 'text-red-600' : 'text-emerald-600'" /><p class="flex-1 text-sm leading-relaxed">{{ item.message }}</p><button class="rounded p-1 text-slate-400" aria-label="Cerrar notificación" @click="notifications.remove(item.id)"><X :size="16" /></button>
    </div>
  </div>
</template>
