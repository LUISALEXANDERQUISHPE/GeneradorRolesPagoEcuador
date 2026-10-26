<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { listRoles, getRole, annulRole, revisions } from '../db/repositories/rolesRepository.js'
import { useEmpleadosStore } from '../stores/empleados.js'
import { useNotificacionesStore } from '../stores/notificaciones.js'
import { usePagination } from '../composables/usePagination.js'
import DataTable from '../components/common/DataTable.vue'
import AppModal from '../components/common/AppModal.vue'
import RolPreview from '../components/roles/RolPreview.vue'
import { downloadIndividual } from '../services/exportService.js'
import { employeeName, money, roleLabel, currentMonth } from '../utils/formatos.js'
const employees=useEmpleadosStore(),notices=useNotificacionesStore()
const items=ref([]),loading=ref(false),error=ref(''),year=ref(currentMonth().slice(0,4)),month=ref(''),employee=ref(''),type=ref(''),state=ref(''),detail=ref(null),audit=ref([]),showDetail=ref(false),cancel=ref(null),showCancel=ref(false),reason=ref(''),busy=ref(false)
const filtered=computed(()=>items.value.filter(r=>(!year.value||r.periodo.startsWith(year.value))&&(!month.value||r.periodo.slice(5,7)===month.value)&&(!employee.value||r.empleado_id===employee.value)&&(!type.value||r.tipo===type.value)&&(!state.value||r.estado===state.value)))
const {page,pageSize,total,rows,reset}=usePagination(filtered)
watch([year,month,employee,type,state],reset)
const columns=[{key:'periodo',label:'Período'},{key:'empleado',label:'Empleado'},{key:'tipo',label:'Tipo'},{key:'neto_recibir',label:'Neto',align:'right'},{key:'estado',label:'Estado'},{key:'acciones',label:'Acciones'}]
async function load(){loading.value=true;error.value='';try{items.value=await listRoles()}catch(e){error.value=e.message}finally{loading.value=false}}
async function inspect(row){detail.value=row;audit.value=[];showDetail.value=true;try{audit.value=await revisions(row.id)}catch(e){notices.notify(e.message,'error')}}
function requestCancel(row){cancel.value=row;reason.value='';showCancel.value=true}
async function doCancel(){busy.value=true;try{await annulRole(cancel.value.id,cancel.value.version,reason.value.trim());showCancel.value=false;notices.notify('Rol anulado.');await load()}catch(e){notices.notify(e.message,'error')}finally{busy.value=false}}
async function pdf(row){try{await downloadIndividual(await getRole(row.id))}catch{notices.notify('No se pudo generar el PDF.','error')}}
onMounted(()=>{employees.load();load()})
</script>
<template>
 <div class="mb-6 flex justify-between gap-4"><div><h1 class="text-3xl font-semibold">Historial de roles</h1><p class="mt-2 text-sm text-slate-500">Consulta pagos, versiones anteriores y anulaciones.</p></div><button class="btn btn-secondary" :disabled="loading" @click="load">Actualizar</button></div>
 <div class="card mb-5 grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-5">
 <input v-model="year" class="input" type="number" min="2000" max="2100" placeholder="Todos los años" aria-label="Año" />
 <select v-model="month" class="input" aria-label="Mes"><option value="">Todos los meses</option><option v-for="n in 12" :key="n" :value="String(n).padStart(2,'0')">{{n}}</option></select>
 <select v-model="employee" class="input" aria-label="Empleado"><option value="">Todos los empleados</option><option v-for="e in employees.items" :key="e.id" :value="e.id">{{employeeName(e)}}</option></select>
 <select v-model="type" class="input" aria-label="Tipo"><option value="">Todos los tipos</option><option v-for="t in ['mensual','decimo_tercero','decimo_cuarto']" :key="t" :value="t">{{roleLabel(t)}}</option></select>
 <select v-model="state" class="input" aria-label="Estado"><option value="">Todos los estados</option><option value="emitido">Emitidos</option><option value="anulado">Anulados</option></select></div>
 <DataTable :columns="columns" :rows="rows" :total="total" v-model:page="page" v-model:page-size="pageSize" :loading="loading" :error="error">
 <template #cell-periodo="{value}">{{value.slice(0,7)}}</template><template #cell-empleado="{row}">{{employeeName(row.empleado_snapshot)}}</template><template #cell-tipo="{value}">{{roleLabel(value)}}</template><template #cell-neto_recibir="{value}">{{money(value)}}</template>
 <template #cell-acciones="{row}"><div class="flex flex-wrap gap-2 text-xs"><button class="text-brand-600 underline" @click="inspect(row)">Detalle</button><button class="text-brand-600 underline" @click="pdf(row)">PDF</button><RouterLink v-if="row.estado==='emitido'" :to="{path:'/roles/nuevo',query:{editar:row.id}}" class="text-brand-600 underline">Editar</RouterLink><RouterLink :to="{path:'/roles/nuevo',query:{editar:row.id,regenerar:'1'}}" class="text-brand-600 underline">Regenerar</RouterLink><button v-if="row.estado==='emitido'" class="text-red-700 underline" @click="requestCancel(row)">Anular</button></div></template>
 </DataTable>
 <AppModal v-model="showDetail" title="Detalle del rol"><template v-if="detail"><p class="mb-3 text-xs text-slate-500">Versión {{detail.version}} · {{detail.estado}}<span v-if="detail.motivo_anulacion"> · Motivo: {{detail.motivo_anulacion}}</span></p><RolPreview :rol="detail" /><div v-if="detail.tipo!=='mensual'" class="mt-4 text-xs text-slate-500"><p>Roles fuente: {{detail.datos_entrada.fuentes?.length || 0}}</p><p v-for="h in detail.datos_entrada.historicos || []" :key="h.periodo">{{h.periodo.slice(0,7)}} · Respaldo: {{h.respaldo}} · Pagado previamente: {{money(h.pagado)}}</p></div><h3 class="mt-5 font-semibold">Versiones anteriores</h3><p v-if="!audit.length" class="mt-2 text-sm text-slate-500">Sin modificaciones anteriores.</p><details v-for="a in audit" :key="a.version" class="mt-3"><summary class="cursor-pointer text-sm">Versión {{a.version}} · {{a.creado_en.slice(0,10)}}</summary><RolPreview :rol="{...a.contenido.rol,detalle:a.contenido.detalle}" /></details></template></AppModal>
 <AppModal v-model="showCancel" title="Anular rol" :dismissible="!busy"><form @submit.prevent="doCancel"><p class="mb-3 text-sm">El rol se conservará en el historial y se excluirá de los totales.</p><label class="text-sm">Motivo obligatorio<textarea v-model="reason" required maxlength="500" class="input mt-2" /></label><div class="mt-4 flex justify-end gap-3"><button type="button" :disabled="busy" class="btn btn-secondary" @click="showCancel=false">Volver</button><button :disabled="busy||!reason.trim()" class="btn btn-danger">{{busy?'Anulando…':'Confirmar anulación'}}</button></div></form></AppModal>
</template>
