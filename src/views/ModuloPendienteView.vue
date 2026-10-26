<script setup>
import { useRoute } from 'vue-router'
import { Layers, ArrowLeft, ArrowRight } from '@lucide/vue'
const route = useRoute()
</script>

<template>
  <div class="mb-7"><p class="eyebrow mb-2">Tu espacio de trabajo</p><h1 class="text-3xl font-semibold tracking-tight">{{ route.meta.title }}</h1><p class="mt-3 max-w-2xl text-sm leading-6 text-slate-500">{{ route.meta.description }}</p></div>
  <section class="card flex min-h-80 flex-col items-center justify-center px-6 py-12 text-center"><span class="mb-5 rounded-2xl bg-brand-50 p-4 text-brand-600"><Layers :size="30" :stroke-width="1.5" /></span><span class="mb-3 text-xs font-semibold uppercase tracking-widest text-brand-600">Bloque {{ route.meta.block }}</span><h2 class="text-xl font-semibold">Este módulo llega en una próxima entrega</h2><p class="mt-3 max-w-md text-sm leading-6 text-slate-500">La navegación ya está preparada. En esta primera entrega puedes configurar y verificar la conexión a tu base de datos.</p><div class="mt-6 flex flex-wrap justify-center gap-3"><RouterLink to="/" class="btn btn-secondary"><ArrowLeft :size="17" />Volver al resumen</RouterLink><RouterLink to="/configuracion" class="btn btn-primary">Configurar conexión<ArrowRight :size="17" /></RouterLink></div></section>
</template>
