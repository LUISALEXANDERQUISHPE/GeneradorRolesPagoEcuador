<script setup>
defineProps({ label: { type: String, required: true }, value: { type: [String, Number], default: '—' }, description: String, icon: [Object, Function], loading: Boolean })
</script>

<template>
  <article class="card p-5"><div class="flex items-center justify-between gap-3"><h2 class="text-sm text-slate-500">{{ label }}</h2><span v-if="icon" class="rounded-xl bg-brand-50 p-2.5 text-brand-600"><component :is="icon" :size="19" /></span></div><p class="mt-4 text-3xl font-semibold tracking-tight tabular-nums" :aria-busy="loading">{{ loading ? '…' : value }}</p><p v-if="description" class="mt-2 text-xs leading-relaxed text-slate-400">{{ description }}</p></article>
</template>
