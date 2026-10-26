<script setup>
import { ArrowLeft } from '@lucide/vue'
</script>

<template>
  <section class="card py-20 text-center"><p class="text-sm font-semibold text-brand-600">404</p><h1 class="mt-3 text-2xl font-semibold">No encontramos esta página</h1><p class="mt-3 text-sm text-slate-500">Revisa la dirección o vuelve al inicio.</p><RouterLink to="/" class="btn btn-primary mt-6"><ArrowLeft :size="17" />Volver al resumen</RouterLink></section>
</template>
