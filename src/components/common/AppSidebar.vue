<script setup>
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import { LayoutDashboard, UsersRound, FilePlus2, History, ChartNoAxesCombined, Settings2, ArrowUpRight, X } from '@lucide/vue'
import { useConexionStore } from '../../stores/conexion.js'
import { useConfiguracionStore } from '../../stores/configuracion.js'
defineProps({ mobile: Boolean })
defineEmits(['close'])
const connection = useConexionStore()
const settings = useConfiguracionStore()
const companyName = computed(() => settings.empresa?.nombre || connection.company)
const companyLogo = computed(() => settings.empresa?.logo_data_url || '')
const initials = computed(() => companyName.value.split(/\s+/).filter(Boolean).slice(0, 2).map(word => word[0]).join('').toUpperCase())
const links = [
  { to: '/', label: 'Resumen', icon: LayoutDashboard },
  { to: '/empleados', label: 'Empleados', icon: UsersRound },
  { to: '/roles/nuevo', label: 'Generar roles', icon: FilePlus2 },
  { to: '/historial', label: 'Historial', icon: History },
  { to: '/reportes', label: 'Reportes', icon: ChartNoAxesCombined },
]
</script>

<template>
  <aside class="flex h-full flex-col overflow-y-auto bg-brand-900 px-5 py-7 text-on-brand">
    <div class="relative mb-8 px-2">
      <RouterLink to="/" class="flex min-w-0 flex-col items-start gap-3 rounded-lg" :class="mobile ? 'pr-7' : ''" :aria-label="companyName + ', ir al inicio'" @click="$emit('close')">
        <span v-if="companyLogo" class="flex h-20 w-full items-center justify-center rounded-xl bg-white p-2"><img :src="companyLogo" :alt="'Logo de ' + companyName" class="max-h-full max-w-full object-contain" /></span>
        <span v-else class="grid h-12 w-12 place-items-center rounded-xl bg-lime-soft text-xl font-bold text-on-accent" aria-hidden="true">{{ initials }}</span>
        <div class="w-full min-w-0"><p class="break-words text-lg font-semibold leading-snug tracking-tight">{{ companyName }}</p><p class="mt-1 text-[10px] uppercase tracking-[0.18em] text-on-brand/50">Roles de pago · Ecuador</p></div>
      </RouterLink>
      <button v-if="mobile" class="absolute -right-1 top-0 rounded-lg p-2" aria-label="Cerrar menú" @click="$emit('close')"><X :size="20" /></button>
    </div>
    <p class="mb-4 px-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-on-brand/40">Espacio de trabajo</p>
    <nav aria-label="Navegación principal" class="space-y-1.5">
      <RouterLink v-for="link in links" :key="link.to" :to="link.to" custom v-slot="{ href, navigate, isExactActive }">
        <a :href="href" :aria-current="isExactActive ? 'page' : undefined" class="flex min-h-12 items-center gap-3 rounded-xl px-3 text-sm transition-colors" :class="isExactActive ? 'bg-on-brand/12 font-semibold text-brand-highlight' : 'text-on-brand/70 hover:bg-on-brand/5 hover:text-on-brand'" @click="navigate($event); $emit('close')">
          <component :is="link.icon" :size="19" :stroke-width="1.7" /><span>{{ link.label }}</span><span v-if="isExactActive" class="ml-auto h-1.5 w-1.5 rounded-full bg-lime-soft" />
        </a>
      </RouterLink>
    </nav>
    <div class="mt-6 border-t border-on-brand/10 pt-5">
      <RouterLink to="/configuracion" class="flex min-h-12 items-center gap-3 rounded-xl px-3 text-sm text-on-brand/70 hover:bg-on-brand/5" active-class="!bg-on-brand/12 !text-brand-highlight" @click="$emit('close')"><Settings2 :size="19" :stroke-width="1.7" />Configuración</RouterLink>
    </div>
    <div class="mt-auto pt-10">
      <div class="rounded-xl border border-on-brand/10 bg-on-brand/5 p-4">
        <div class="mb-2 flex items-center justify-between"><span class="text-xs font-medium text-brand-highlight">Tu empresa, en orden</span><ArrowUpRight :size="15" class="text-on-brand/50" /></div>
        <p class="text-xs leading-relaxed text-on-brand/55">Empleados, pagos y reportes en un mismo lugar.</p>
      </div>
      <div class="mt-5 flex items-center gap-3 px-2">
        <span class="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-on-brand/10 text-xs font-semibold">EC</span>
        <div class="min-w-0"><p class="truncate text-sm font-medium" :title="companyName">{{ companyName }}</p><p class="mt-0.5 text-[11px] text-on-brand/45">Ecuador · USD</p></div>
      </div>
    </div>
  </aside>
</template>
