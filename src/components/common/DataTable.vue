<script setup>
import { Inbox, LoaderCircle } from '@lucide/vue'
import PaginationControls from './PaginationControls.vue'
defineProps({ columns: { type: Array, required: true }, rows: { type: Array, default: () => [] }, rowKey: { type: String, default: 'id' }, caption: { type: String, default: 'Listado de registros' }, loading: Boolean, error: String, emptyMessage: { type: String, default: 'No hay registros para mostrar.' }, page: { type: Number, default: 1 }, pageSize: { type: Number, default: 10 }, total: { type: Number, default: 0 } })
defineEmits(['update:page', 'update:pageSize'])
</script>

<template>
  <div class="card overflow-hidden" :aria-busy="loading">
    <div class="overflow-x-auto"><table class="w-full text-left text-sm"><caption class="sr-only">{{ caption }}</caption><thead class="border-b border-slate-100 bg-slate-50/70"><tr><th v-for="column in columns" :key="column.key" scope="col" class="whitespace-nowrap px-5 py-4 text-xs font-semibold text-slate-500" :class="column.align === 'right' ? 'text-right' : ''">{{ column.label }}</th></tr></thead><tbody class="divide-y divide-slate-100">
      <tr v-if="loading"><td :colspan="columns.length" class="p-12 text-center text-slate-500"><LoaderCircle :size="24" class="mx-auto mb-3 animate-spin" />Cargando registros…</td></tr>
      <tr v-else-if="error"><td :colspan="columns.length" class="p-10 text-center text-red-700" role="alert">{{ error }}</td></tr>
      <tr v-else-if="rows.length === 0"><td :colspan="columns.length" class="p-12 text-center text-slate-500"><Inbox :size="30" class="mx-auto mb-3 text-slate-300" />{{ emptyMessage }}<slot name="empty-action" /></td></tr>
      <template v-else><tr v-for="row in rows" :key="row[rowKey]" class="hover:bg-brand-50/40"><td v-for="column in columns" :key="column.key" class="px-5 py-4" :class="column.align === 'right' ? 'text-right tabular-nums' : ''"><slot :name="'cell-' + column.key" :row="row" :value="row[column.key]">{{ row[column.key] ?? '—' }}</slot></td></tr></template>
    </tbody></table></div>
    <PaginationControls v-if="!loading && !error && total > 0" :page="page" :page-size="pageSize" :total="total" @update:page="$emit('update:page', $event)" @update:page-size="$emit('update:pageSize', $event)" />
  </div>
</template>
