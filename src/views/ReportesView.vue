<script setup>
import { computed,onMounted,ref,watch } from 'vue'
import { useConfiguracionStore } from '../stores/configuracion.js'
import { useNotificacionesStore } from '../stores/notificaciones.js'
import { listRoles, getRole } from '../db/repositories/rolesRepository.js'
import { downloadExcel,downloadConsolidatedPdf,downloadIndividual } from '../services/exportService.js'
import { currentMonth,money,employeeName,roleLabel } from '../utils/formatos.js'
import DataTable from '../components/common/DataTable.vue'
import { usePagination } from '../composables/usePagination.js'
const settings=useConfiguracionStore(),notices=useNotificacionesStore(),month=ref(currentMonth()),type=ref(''),items=ref([]),loading=ref(false),exporting=ref(false),error=ref('')
const filtered=computed(()=>items.value.filter(r=>!type.value||r.tipo===type.value))
const {page,pageSize,total,rows,reset}=usePagination(filtered)
const sum=key=>filtered.value.reduce((s,r)=>s+Number(r[key]),0)
const columns=[{key:'empleado',label:'Empleado'},{key:'tipo',label:'Rol'},{key:'total_ingresos',label:'Ingresos',align:'right'},{key:'total_egresos',label:'Egresos',align:'right'},{key:'neto_recibir',label:'Neto',align:'right'},{key:'aporte_personal',label:'IESS personal',align:'right'},{key:'aporte_patronal',label:'IESS patronal',align:'right'},{key:'pdf',label:'PDF'}]
let request=0
async function load(){const token=++request;loading.value=true;error.value='';try{const result=await listRoles({month:month.value,state:'emitido'});if(token===request)items.value=result}catch(e){if(token===request){error.value=e.message;items.value=[]}}finally{if(token===request)loading.value=false}}
async function exportFile(format,row){exporting.value=true;try{if(row)await downloadIndividual(await getRole(row.id));else if(format==='excel')await downloadExcel(filtered.value,month.value);else await downloadConsolidatedPdf(filtered.value,settings.empresa,month.value);notices.notify('Archivo generado.')}catch{notices.notify('No se pudo exportar el archivo. Revisa los datos e inténtalo de nuevo.','error')}finally{exporting.value=false}}
watch(month,()=>{reset();if(month.value)load()});watch(type,reset)
onMounted(async()=>{await settings.load();load()})
</script>
<template>
 <div class="mb-6"><h1 class="text-3xl font-semibold">Reportes y exportaciones</h1><p class="mt-2 text-sm text-slate-500">Consolidado por período del rol. Solo se incluyen roles emitidos; los anulados quedan excluidos.</p></div>
 <div class="card mb-5 flex flex-wrap items-end gap-4 p-5"><label class="text-sm">Mes del rol<input v-model="month" type="month" class="input mt-1" required /></label><label class="text-sm">Tipo<select v-model="type" class="input mt-1"><option value="">Todos</option><option v-for="t in ['mensual','decimo_tercero','decimo_cuarto']" :key="t" :value="t">{{roleLabel(t)}}</option></select></label><button class="btn btn-primary" :disabled="!filtered.length||loading||exporting||!settings.empresa" @click="exportFile('pdf')">PDF consolidado</button><button class="btn btn-secondary" :disabled="!filtered.length||loading||exporting" @click="exportFile('excel')">Exportar Excel</button></div>
 <div class="mb-5 grid gap-4 md:grid-cols-3"><div v-for="t in [{key:'total_ingresos',label:'Ingresos'},{key:'total_egresos',label:'Egresos'},{key:'neto_recibir',label:'Neto total'}]" :key="t.key" class="card p-5"><p class="text-sm text-slate-500">{{t.label}}</p><p class="mt-2 text-2xl font-semibold">{{loading?'…':money(sum(t.key))}}</p></div></div>
 <DataTable :columns="columns" :rows="rows" :total="total" v-model:page="page" v-model:page-size="pageSize" :loading="loading" :error="error">
 <template #cell-empleado="{row}">{{employeeName(row.empleado_snapshot)}}</template><template #cell-tipo="{value}">{{roleLabel(value)}}</template>
 <template v-for="key in ['total_ingresos','total_egresos','neto_recibir','aporte_personal','aporte_patronal']" :key="key" #[`cell-${key}`]="{value}">{{money(value)}}</template>
 <template #cell-pdf="{row}"><button class="text-brand-600 underline" :disabled="exporting" @click="exportFile('pdf',row)">Descargar</button></template>
 </DataTable>
</template>
