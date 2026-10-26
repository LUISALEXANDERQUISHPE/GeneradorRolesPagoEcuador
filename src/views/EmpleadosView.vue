<script setup>
import { listScales } from '../db/repositories/escalasRepository.js'
import { useConfiguracionStore } from '../stores/configuracion.js'
import { inicioFondos, regimenNombre } from '../utils/regimenes.js'
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useEmpleadosStore } from '../stores/empleados.js'
import { saveEmployee, deleteEmployee } from '../db/repositories/empleadosRepository.js'
import { useNotificacionesStore } from '../stores/notificaciones.js'
import { useConfirm } from '../composables/useConfirm.js'
import { usePagination } from '../composables/usePagination.js'
import DataTable from '../components/common/DataTable.vue'
import AppModal from '../components/common/AppModal.vue'
import { money, today, currentMonth } from '../utils/formatos.js'
const employees=useEmpleadosStore(),notices=useNotificacionesStore(),{confirm}=useConfirm()
const settings=useConfiguracionStore(), scales=ref([]),scaleError=ref('')
const availableScales=computed(()=>scales.value.filter(s=>s.regimen===(settings.empresa?.regimen_laboral || 'codigo_trabajo') && (s.activo || s.id===form.escala_id)))
async function loadScales(){try{await settings.load();scales.value=await listScales();scaleError.value=''}catch(e){scaleError.value=e.message}}
function selectScale(){const s=scales.value.find(s=>s.id===form.escala_id);form.aplicar_escala=Boolean(s);if(s){form.sueldo_base=s.sueldo;form.escala_codigo=s.codigo}}
const search=ref(''),status=ref(''),department=ref(''),open=ref(false),busy=ref(false),error=ref(''),original=ref(null),form=reactive({})
const filtered=computed(()=>employees.items.filter(e=>(!status.value||e.estado===status.value)&&(!department.value||e.departamento===department.value)&&[e.nombres,e.apellidos,e.cedula,e.cargo].join(' ').toLowerCase().includes(search.value.toLowerCase())))
const departments=computed(()=>[...new Set(employees.items.map(e=>e.departamento))].sort())
const {page,pageSize,total,rows,reset}=usePagination(filtered)
watch([search,status,department],reset)
const columns=[{key:'cedula',label:'Cédula'},{key:'nombre',label:'Empleado'},{key:'cargo',label:'Cargo / departamento'},{key:'sueldo_base',label:'Sueldo',align:'right'},{key:'estado',label:'Estado'},{key:'acciones',label:'Acciones'}]
function edit(employee=null){
 loadScales()
 original.value=employee?JSON.parse(JSON.stringify(employee)):null
 Object.keys(form).forEach(k=>delete form[k])
 Object.assign(form,employee?JSON.parse(JSON.stringify(employee)):{cedula:'',nombres:'',apellidos:'',cargo:'',departamento:'',fecha_ingreso:today(),fecha_salida:'',sueldo_base:'',numero_cuenta:'',estado:'activo',recibe_fondos_reserva:true,decimo_tercero_modalidad:'mensualizar',decimo_cuarto_modalidad:'mensualizar',region:'sierra'})
 form.escala_id=employee?.escala_id || '';form.aplicar_escala=false
 form.vigente_desde=employee?currentMonth():form.fecha_ingreso.slice(0,7);form.solicitud='';error.value='';open.value=true
}
async function save(){busy.value=true;error.value='';try{await saveEmployee(form,original.value);open.value=false;notices.notify('Empleado guardado.');await employees.load()}catch(e){error.value=e.message}finally{busy.value=false}}
async function remove(e){if(!await confirm({title:'Eliminar empleado',message:'¿Eliminar a '+e.nombres+' '+e.apellidos+'? Si tiene roles, debes inactivarlo en lugar de eliminarlo.',confirmLabel:'Eliminar',danger:true}))return;try{await deleteEmployee(e.id);notices.notify('Empleado eliminado.');await employees.load()}catch(e){notices.notify(e.message,'error')}}
onMounted(employees.load)
</script>
<template>
 <div class="mb-6 flex flex-wrap items-center justify-between gap-4"><div><h1 class="text-3xl font-semibold">Empleados</h1><p class="mt-2 text-sm text-slate-500">Gestiona tu equipo y sus beneficios · {{regimenNombre(settings.empresa?.regimen_laboral || 'codigo_trabajo')}}</p></div><button class="btn btn-primary" @click="edit()">Registrar empleado</button></div>
 <div class="card mb-5 grid gap-3 p-4 md:grid-cols-3"><input v-model="search" class="input" aria-label="Buscar empleado" placeholder="Buscar por cédula, nombre o cargo" /><select v-model="status" class="input" aria-label="Estado"><option value="">Todos los estados</option><option value="activo">Activos</option><option value="inactivo">Inactivos</option></select><select v-model="department" class="input" aria-label="Departamento"><option value="">Todos los departamentos</option><option v-for="d in departments" :key="d">{{d}}</option></select></div>
 <DataTable :columns="columns" :rows="rows" :total="total" v-model:page="page" v-model:page-size="pageSize" :loading="employees.loading" :error="employees.error" empty-message="Todavía no hay empleados que coincidan.">
 <template #cell-nombre="{row}"><strong>{{row.apellidos}} {{row.nombres}}</strong><p class="mt-1 text-xs text-slate-500">13.º: {{row.decimo_tercero_modalidad}} · 14.º: {{row.decimo_cuarto_modalidad}}</p></template>
 <template #cell-cargo="{row}">{{row.cargo}}<p class="text-xs text-slate-500">{{row.departamento}}</p></template>
 <template #cell-sueldo_base="{value,row}">{{money(value)}}<p class="text-xs text-slate-500">{{row.escala_codigo ? 'Escala ' + row.escala_codigo : 'Sueldo individual'}}</p></template>
 <template #cell-acciones="{row}"><div class="flex gap-2"><button class="btn btn-secondary" @click="edit(row)">Editar</button><button class="btn text-red-700" @click="remove(row)">Eliminar</button></div></template>
 </DataTable>
 <AppModal v-model="open" :title="original?'Editar empleado':'Registrar empleado'" :dismissible="!busy">
 <form @submit.prevent="save"><fieldset :disabled="busy" class="space-y-4">
 <p v-if="error" role="alert" class="rounded-lg bg-red-50 p-3 text-sm text-red-700">{{error}}</p>
 <div class="grid gap-4 sm:grid-cols-2"><label v-for="field in [{key:'cedula',label:'Cédula',max:10},{key:'nombres',label:'Nombres',max:120},{key:'apellidos',label:'Apellidos',max:120},{key:'cargo',label:'Cargo',max:120},{key:'departamento',label:'Departamento',max:120}]" :key="field.key" class="text-sm">{{field.label}} *<input v-model="form[field.key]" class="input mt-1" required :maxlength="field.max" /></label>
 <label class="text-sm">Ingreso *<input v-model="form.fecha_ingreso" type="date" class="input mt-1" required /></label>
 <label class="text-sm">Salida (opcional)<input v-model="form.fecha_salida" type="date" class="input mt-1" :min="form.fecha_ingreso" /></label>
 <label class="text-sm">Escala salarial<select v-model="form.escala_id" class="input mt-1" @change="selectScale"><option value="">Sueldo individual (sin escala)</option><option v-for="s in availableScales" :key="s.id" :value="s.id">{{s.codigo}} · {{money(s.sueldo)}}{{s.activo?'':' · Inactiva'}}</option></select><span v-if="scaleError" role="alert" class="text-red-700">{{scaleError}}</span><button v-if="form.escala_id && scales.find(s=>s.id===form.escala_id)?.activo" type="button" class="mt-2 text-brand-600 underline" @click="selectScale">Aplicar sueldo actual de la escala</button></label>
 <label class="text-sm">Sueldo mensual (USD) *<input v-model="form.sueldo_base" :readonly="Boolean(form.escala_id)" type="number" min="0.01" step="0.01" class="input mt-1" required /></label>
 <label class="text-sm">Cuenta bancaria<input v-model="form.numero_cuenta" class="input mt-1" maxlength="40" /></label>
 <label class="text-sm">Estado<select v-model="form.estado" class="input mt-1"><option value="activo">Activo</option><option value="inactivo">Inactivo</option></select></label>
 <label class="text-sm">Región laboral<select v-model="form.region" class="input mt-1"><option value="sierra">Sierra / Amazonía</option><option value="costa">Costa / Insular</option></select></label>
 <label class="text-sm">Fondos de reserva<select v-model="form.recibe_fondos_reserva" class="input mt-1"><option :value="true">Recibir mensualmente</option><option :value="false">Acumular en IESS</option></select></label>
 <label v-for="field in [{key:'decimo_tercero_modalidad',label:'Décimo tercero'},{key:'decimo_cuarto_modalidad',label:'Décimo cuarto'}]" :key="field.key" class="text-sm">{{field.label}}<select v-model="form[field.key]" class="input mt-1"><option value="mensualizar">Mensualizar</option><option value="acumular">No mensualizar (acumular)</option></select></label>
 </div>
 <p class="rounded-lg bg-brand-50 p-3 text-sm">Inicio de fondos de reserva: <strong>{{inicioFondos(form.fecha_ingreso) || 'Ingresa la fecha de ingreso'}}</strong>. Se generan desde el segundo año; el primer mes se calcula proporcionalmente.</p>
 <label class="block text-sm">Modalidades vigentes desde<input v-model="form.vigente_desde" type="month" class="input mt-1" required /></label>
 <label class="block text-sm">Referencia de solicitud de acumulación<input v-model="form.solicitud" class="input mt-1" maxlength="250" placeholder="Fecha y referencia del documento firmado" /></label>
 <p class="text-xs leading-5 text-slate-500">La modalidad se aplica desde el mes indicado. Los roles emitidos conservan su modalidad original. Registra los cambios conforme a la solicitud del trabajador; la aplicación no sustituye ese documento.</p>
 <div class="flex justify-end gap-3"><button type="button" class="btn btn-secondary" @click="open=false">Cancelar</button><button class="btn btn-primary">{{busy?'Guardando…':'Guardar empleado'}}</button></div>
 </fieldset></form></AppModal>
</template>
