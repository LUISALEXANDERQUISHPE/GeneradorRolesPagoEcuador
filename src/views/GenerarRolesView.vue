<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useConfiguracionStore } from '../stores/configuracion.js'
import { useEmpleadosStore } from '../stores/empleados.js'
import { useNotificacionesStore } from '../stores/notificaciones.js'
import { useConfirm } from '../composables/useConfirm.js'
import { listRoles, getRole, saveRoles } from '../db/repositories/rolesRepository.js'
import { benefitCoverage, benefitPeriod, calculateBenefit, calculateMonthly, defaultInputs, monthDays } from '../services/nominaService.js'
import { currentMonth, employeeName, money, today } from '../utils/formatos.js'
import RolPreview from '../components/roles/RolPreview.vue'
const route=useRoute(),router=useRouter(),settings=useConfiguracionStore(),employees=useEmpleadosStore(),notices=useNotificacionesStore(),{confirm}=useConfirm()
const type=ref('mensual'),month=ref(currentMonth()),year=ref(Number(today().slice(0,4))),selected=ref(''),loading=ref(true),saving=ref(false),error=ref(''),previews=ref([]),existing=ref([]),editing=ref(null),drafts=reactive({})
const benefit=reactive({fecha_pago:'',sbu_anual:'',historicos:[],observaciones:''})
const regenerate=computed(()=>route.query.regenerar==='1')
const person=computed(()=> editing.value&&!regenerate.value?editing.value.empleado_snapshot:employees.items.find(e=>e.id===selected.value))
const company=computed(()=>editing.value&&!regenerate.value?editing.value.empresa_snapshot:settings.empresa)
const params=computed(()=>editing.value&&!regenerate.value?editing.value.parametros_snapshot:settings.parametros)
const chosen=computed(()=>selected.value==='todos'?employees.items.filter(e=>e.estado==='activo'&&monthDays(e,month.value+'-01',Number(params.value?.dias_base_mes || 30))>0):person.value?[person.value]:[])
const coverage=computed(()=>person.value&&type.value!=='mensual'?benefitCoverage(person.value,type.value,year.value,existing.value):null)
const fields=[{key:'dias_trabajados',label:'Días trabajados',step:'1'},{key:'horas_suplementarias',label:'Horas suplementarias'},{key:'horas_extraordinarias',label:'Horas extraordinarias'},{key:'comisiones',label:'Comisiones (USD)'},{key:'bonos',label:'Bonos remunerativos (USD)'},{key:'anticipos',label:'Anticipos (USD)'},{key:'prestamos_iess',label:'Otros préstamos IESS'},{key:'prestamos_quirografarios',label:'Préstamos quirografarios'}]
function initializeDrafts(){
 previews.value=[]
 if(!params.value || !/^\d{4}-\d{2}$/.test(month.value))return
 for(const e of chosen.value) drafts[e.id]=defaultInputs(e,month.value,params.value)
 if(type.value!=='mensual'&&person.value){
  benefit.fecha_pago=benefitPeriod(type.value,year.value,person.value.region).pago
  benefit.sbu_anual=params.value.sbu
  benefit.historicos=(coverage.value?.missing || []).map(periodo=>({periodo,base:'',dias:'',pagado:0,respaldo:''}))
 }
}
watch([selected,month,type,year],initializeDrafts)
watch([drafts,benefit],()=>{previews.value=[]},{deep:true})
async function initialize(){
 loading.value=true;error.value=''
 try{
  if(!await settings.load())throw new Error(settings.error)
  if(!await employees.load())throw new Error(employees.error)
  existing.value=await listRoles()
  if(route.query.editar){
   const old=await getRole(route.query.editar);editing.value=old;type.value=old.tipo;selected.value=old.empleado_id;month.value=old.periodo.slice(0,7);year.value=old.ejercicio || Number(month.value.slice(0,4))
   await new Promise(resolve=>setTimeout(resolve,0))
   if(old.tipo==='mensual')drafts[old.empleado_id]=JSON.parse(JSON.stringify(old.datos_entrada))
   else Object.assign(benefit,JSON.parse(JSON.stringify(old.datos_entrada)))
  }
 }catch(e){error.value=e.message}finally{loading.value=false}
}
function preview(){
 error.value='';previews.value=[]
 try{
  if(!selected.value)throw new Error('Selecciona un empleado.')
  const result=[]
  if(type.value==='mensual'){
   for(const e of chosen.value){
    if(!editing.value&&existing.value.some(r=>r.empleado_id===e.id&&r.tipo==='mensual'&&r.periodo.slice(0,7)===month.value))throw new Error('Ya existe un rol para '+employeeName(e)+' en ese mes. Edítalo o regénéralo desde Historial.')
    result.push(calculateMonthly(e,company.value,params.value,month.value,drafts[e.id]))
   }
  } else {
   if(!person.value)throw new Error('Selecciona un empleado para el décimo.')
   if(!editing.value&&existing.value.some(r=>r.empleado_id===person.value.id&&r.tipo===type.value&&Number(r.ejercicio)===Number(year.value)))throw new Error('Ya existe este décimo para el año seleccionado. Utiliza Historial.')
   result.push(calculateBenefit(person.value,company.value,params.value,type.value,year.value,existing.value,benefit))
  }
  if(!result.length)throw new Error('No hay empleados con días laborables para ese mes.')
  if(editing.value){result[0].id=editing.value.id;result[0].version=editing.value.version}
  previews.value=result
 }catch(e){error.value=e.message}
}
async function save(){
 if(!previews.value.length)return
 if(!await confirm({title:editing.value?'Actualizar rol':'Guardar roles',message:'Se guardarán '+previews.value.length+' rol(es), con un neto total de '+money(previews.value.reduce((s,r)=>s+r.neto_recibir,0))+'. Confirma que revisaste el desglose.',confirmLabel:'Guardar'}))return
 saving.value=true
 try{await saveRoles(previews.value);notices.notify('Roles guardados correctamente.');await router.push('/historial')}catch(e){error.value=e.message;notices.notify(e.message,'error')}finally{saving.value=false}
}
onMounted(initialize)
</script>
<template>
 <div class="mb-6"><h1 class="text-3xl font-semibold">{{editing?(regenerate?'Regenerar rol':'Editar rol'):'Generar roles'}}</h1><p class="mt-2 text-sm text-slate-500">Código del Trabajo · Revisa todos los valores antes de guardar.</p></div>
 <p v-if="loading" role="status" class="card p-6">Cargando empleados y parámetros…</p>
 <p v-if="error" role="alert" class="mb-5 rounded-xl bg-red-50 p-4 text-red-700">{{error}}</p>
 <form v-if="!loading&&params" @submit.prevent="preview"><fieldset :disabled="saving" class="space-y-5">
 <div class="card grid gap-4 p-5 md:grid-cols-3">
 <label class="text-sm">Tipo de rol<select v-model="type" :disabled="!!editing" class="input mt-1"><option value="mensual">Rol mensual</option><option value="decimo_tercero">Décimo tercer sueldo</option><option value="decimo_cuarto">Décimo cuarto sueldo</option></select></label>
 <label v-if="type==='mensual'" class="text-sm">Período<input v-model="month" :disabled="!!editing" type="month" required class="input mt-1" /></label>
 <label v-else class="text-sm">Año de pago<input v-model="year" :disabled="!!editing" type="number" min="2000" max="2100" required class="input mt-1" /></label>
 <label class="text-sm">Empleado<select v-model="selected" :disabled="!!editing" required class="input mt-1"><option value="">Seleccionar empleado</option><option v-if="type==='mensual'" value="todos">Todos los activos</option><option v-for="e in employees.items" :key="e.id" :value="e.id">{{employeeName(e)}} ({{e.estado}})</option></select></label>
 </div>
 <p v-if="!employees.items.length" class="card p-5">Primero <RouterLink to="/empleados" class="font-semibold text-brand-600 underline">registra empleados</RouterLink>.</p>
 <p v-if="editing" class="rounded-xl bg-brand-50 p-4 text-sm text-brand-600">{{regenerate?'Se recalcula con los datos actuales de la empresa y el empleado.':'Se conservan los datos y parámetros históricos del rol.'}} La versión anterior se conservará en el historial.</p>
 <template v-if="type==='mensual'">
 <section v-for="e in chosen" :key="e.id" class="card p-5">
 <template v-if="drafts[e.id]"><h2 class="mb-4 font-semibold">{{employeeName(e)}} · {{money(e.sueldo_base)}}</h2>
 <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><label v-for="field in fields" :key="field.key" class="text-sm">{{field.label}}<input v-model="drafts[e.id][field.key]" type="number" min="0" :step="field.step || '0.01'" required class="input mt-1" /></label>
 <label class="text-sm">Fecha de pago<input v-model="drafts[e.id].fecha_pago" type="date" required class="input mt-1" /></label>
 <label class="text-sm">Base fondos (opcional)<input v-model="drafts[e.id].base_fondos" type="number" min="0" step="0.01" class="input mt-1" placeholder="Automática" /></label></div>
 <p class="mt-2 text-xs text-slate-500">Fondos: elegibilidad desde el segundo año. Si cumple el año a mitad del mes, la base automática se prorratea; puedes indicar la remuneración exacta del tramo elegible. Los bonos aquí son remunerativos.</p>
 <div class="mt-5"><div class="mb-3 flex items-center justify-between"><h3 class="text-sm font-semibold">Otros descuentos</h3><button type="button" class="btn btn-secondary" @click="drafts[e.id].descuentos.push({descripcion:'',monto:0})">Añadir descuento</button></div><div v-for="(d,i) in drafts[e.id].descuentos" :key="i" class="mb-2 flex gap-2"><input v-model="d.descripcion" required maxlength="250" class="input" aria-label="Descripción del descuento" placeholder="Descripción" /><input v-model="d.monto" type="number" min="0" step="0.01" required class="input max-w-36" aria-label="Monto del descuento" /><button type="button" class="btn text-red-700" @click="drafts[e.id].descuentos.splice(i,1)">Quitar</button></div></div>
 <label class="mt-4 block text-sm">Observaciones<textarea v-model="drafts[e.id].observaciones" class="input mt-1" maxlength="1000" /></label></template>
 </section></template>
 <section v-else-if="coverage" class="card space-y-5 p-5">
 <h2 class="font-semibold">Devengo: {{coverage.start}} a {{coverage.end}}</h2><p class="text-sm text-slate-500">Región: {{person.region==='costa'?'Costa / Insular':'Sierra / Amazonía'}}. Se usan {{coverage.sources.length}} roles mensuales emitidos; los décimos mensualizados se excluyen del saldo.</p>
 <div class="grid gap-4 sm:grid-cols-2"><label class="text-sm">Fecha de pago<input v-model="benefit.fecha_pago" type="date" required class="input mt-1" /></label><label v-if="type==='decimo_cuarto'" class="text-sm">SBU aplicable al año {{year}}<input v-model="benefit.sbu_anual" type="number" min="0.01" step="0.01" required class="input mt-1" /><span class="text-xs text-slate-500">Verifica el SBU de ese año, especialmente al generar períodos anteriores.</span></label></div>
 <div v-if="coverage.missing.length" class="rounded-xl bg-amber-50 p-4 text-sm text-amber-900">Falta historia de {{coverage.missing.length}} mes(es). Genera esos roles o completa los valores documentados abajo. El monto ya pagado incluye anticipos o mensualización del mismo décimo.</div>
 <div v-for="h in benefit.historicos" :key="h.periodo" class="rounded-xl border border-slate-200 p-4"><h3 class="mb-3 text-sm font-semibold">{{h.periodo.slice(0,7)}}</h3><div class="grid gap-3 md:grid-cols-3"><label v-if="type==='decimo_tercero'" class="text-sm">Remuneración computable<input v-model="h.base" type="number" min="0" step="0.01" required class="input mt-1" /></label><label v-else class="text-sm">Días devengados (base 30)<input v-model="h.dias" type="number" min="0" max="30" step="1" required class="input mt-1" /></label><label class="text-sm">Décimo ya pagado (USD)<input v-model="h.pagado" type="number" min="0" step="0.01" required class="input mt-1" /></label><label class="text-sm">Documento de respaldo<input v-model="h.respaldo" required maxlength="250" class="input mt-1" placeholder="Referencia del rol o comprobante" /></label></div></div>
 <label class="block text-sm">Observaciones<textarea v-model="benefit.observaciones" class="input mt-1" maxlength="1000" /></label>
 </section>
 <button type="submit" class="btn btn-primary" :disabled="!selected">Calcular y ver desglose</button>
 </fieldset></form>
 <section v-if="previews.length" class="mt-6 space-y-5"><h2 class="text-xl font-semibold">Vista previa · {{previews.length}} rol(es)</h2><RolPreview v-for="r in previews" :key="r.id" :rol="r" /><button class="btn btn-primary" :disabled="saving" @click="save">{{saving?'Guardando…':'Guardar roles revisados'}}</button></section>
</template>
