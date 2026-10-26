<script setup>
import { computed,onMounted,ref,watch } from 'vue'
import { UsersRound,Wallet,Landmark,ArrowRight } from '@lucide/vue'
import { useEmpleadosStore } from '../stores/empleados.js'
import { listRoles } from '../db/repositories/rolesRepository.js'
import { currentMonth,money,employeeName,roleLabel } from '../utils/formatos.js'
import StatCard from '../components/common/StatCard.vue'
const employees=useEmpleadosStore(),month=ref(currentMonth()),items=ref([]),loading=ref(false),error=ref('')
const net=computed(()=>items.value.reduce((s,r)=>s+Number(r.neto_recibir),0))
const iess=computed(()=>items.value.reduce((s,r)=>s+Number(r.aporte_personal)+Number(r.aporte_patronal),0))
const active=computed(()=>employees.items.filter(e=>e.estado==='activo').length)
let sequence=0
async function load(){const id=++sequence;loading.value=true;error.value='';try{const rows=await listRoles({month:month.value,state:'emitido'});if(id===sequence)items.value=rows}catch(e){if(id===sequence){error.value=e.message;items.value=[]}}finally{if(id===sequence)loading.value=false}}
watch(month,()=>{if(month.value)load()})
onMounted(()=>{employees.load();load()})
</script>
<template>
 <div class="mb-7 flex flex-wrap items-end justify-between gap-4"><div><p class="eyebrow mb-2">Tu empresa, en orden</p><h1 class="text-3xl font-semibold">Resumen de nómina</h1><p class="mt-2 text-sm text-slate-500">Roles emitidos del período · Código del Trabajo</p></div><label class="text-sm">Período<input v-model="month" type="month" class="input mt-1" required /></label></div>
 <p v-if="error||employees.error" role="alert" class="mb-5 rounded-xl bg-red-50 p-4 text-red-700">{{error||employees.error}} <RouterLink to="/configuracion" class="underline">Revisar configuración</RouterLink></p>
 <div class="grid gap-5 md:grid-cols-3"><StatCard label="Neto de nómina del mes" :value="money(net)" :loading="loading" :icon="Wallet" description="Incluye roles mensuales y décimos del período; excluye anulados." /><StatCard label="Empleados activos" :value="active" :loading="employees.loading" :icon="UsersRound" description="Estado actual del equipo." /><StatCard label="Aportes IESS del mes" :value="money(iess)" :loading="loading" :icon="Landmark" description="Suma del aporte personal y patronal." /></div>
 <div class="my-6 flex flex-wrap gap-3"><RouterLink to="/roles/nuevo" class="btn btn-primary">Generar rol<ArrowRight :size="17" /></RouterLink><RouterLink to="/empleados" class="btn btn-secondary">Registrar empleados</RouterLink><RouterLink to="/reportes" class="btn btn-secondary">Exportar nómina</RouterLink></div>
 <section class="card overflow-hidden"><div class="flex items-center justify-between border-b p-5"><h2 class="font-semibold">Roles del período</h2><RouterLink to="/historial" class="text-sm text-brand-600 underline">Ver historial</RouterLink></div><p v-if="!items.length&&!loading" class="p-10 text-center text-sm text-slate-500">Aún no hay roles emitidos en este período.</p><div v-for="r in items.slice(0,8)" :key="r.id" class="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-5"><div><p class="text-sm font-semibold">{{employeeName(r.empleado_snapshot)}}</p><p class="mt-1 text-xs text-slate-500">{{roleLabel(r.tipo)}} · {{r.fecha_pago}}</p></div><strong class="text-brand-600">{{money(r.neto_recibir)}}</strong></div></section>
</template>
