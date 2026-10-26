<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { Menu, CircleHelp } from '@lucide/vue'
import { useConexionStore } from '../../stores/conexion.js'
defineEmits(['open-menu'])
const route = useRoute()
const connection = useConexionStore()
const label = computed(() => ({ conectado: 'Neon conectado', verificando: 'Verificando conexión', pendiente: 'Conexión por verificar', error: 'Revisar conexión', 'sin-configurar': 'Sin conexión configurada' })[connection.state])
</script>

<template>
  <header class="flex min-h-20 items-center justify-between gap-3 border-b border-slate-200/80 bg-white/80 px-5 md:px-9">
    <div class="flex min-w-0 items-center gap-3"><button class="rounded-lg p-2 lg:hidden" aria-label="Abrir menú" @click="$emit('open-menu')"><Menu :size="22" /></button><span class="hidden max-w-48 truncate text-sm text-slate-400 sm:inline" :title="connection.company">{{ connection.company }}</span><span class="hidden text-slate-300 sm:inline">/</span><span class="truncate text-sm font-medium">{{ route.meta.title }}</span></div>
    <div class="flex shrink-0 items-center gap-4"><RouterLink to="/configuracion" class="flex items-center gap-2 rounded-lg text-xs text-slate-500"><span class="h-2 w-2 rounded-full" :class="connection.connected ? 'bg-emerald-500' : 'bg-amber-400'" /><span class="hidden sm:inline">{{ label }}</span><span class="sr-only sm:hidden">{{ label }}</span></RouterLink><RouterLink to="/configuracion" class="rounded-full border border-slate-200 p-2 text-slate-400 hover:text-brand-900" aria-label="Ayuda de configuración"><CircleHelp :size="18" /></RouterLink></div>
  </header>
</template>
