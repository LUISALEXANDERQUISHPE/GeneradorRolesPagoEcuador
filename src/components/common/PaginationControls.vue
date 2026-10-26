<script setup>
import { computed } from 'vue'
import { ChevronLeft, ChevronRight } from '@lucide/vue'
const props = defineProps({ page: { type: Number, default: 1 }, pageSize: { type: Number, default: 10 }, total: { type: Number, default: 0 } })
defineEmits(['update:page', 'update:pageSize'])
const pages = computed(() => Math.max(1, Math.ceil(props.total / props.pageSize)))
const start = computed(() => props.total ? (props.page - 1) * props.pageSize + 1 : 0)
const end = computed(() => Math.min(props.page * props.pageSize, props.total))
</script>

<template>
  <nav aria-label="Paginación de la tabla" class="flex flex-wrap items-center justify-between gap-4 border-t border-slate-100 px-5 py-4 text-xs text-slate-500">
    <p aria-live="polite">{{ start }}–{{ end }} de {{ total }} registros</p>
    <div class="flex flex-wrap items-center gap-3"><label class="flex items-center gap-2">Por página<select class="rounded-lg border border-slate-200 bg-white p-2" :value="pageSize" @change="$emit('update:pageSize', Number($event.target.value))"><option :value="10">10</option><option :value="25">25</option><option :value="50">50</option></select></label><button class="rounded-lg border border-slate-200 p-2 disabled:opacity-30" :disabled="page <= 1" aria-label="Página anterior" @click="$emit('update:page', page - 1)"><ChevronLeft :size="17" /></button><span>{{ page }} / {{ pages }}</span><button class="rounded-lg border border-slate-200 p-2 disabled:opacity-30" :disabled="page >= pages" aria-label="Página siguiente" @click="$emit('update:page', page + 1)"><ChevronRight :size="17" /></button></div>
  </nav>
</template>
