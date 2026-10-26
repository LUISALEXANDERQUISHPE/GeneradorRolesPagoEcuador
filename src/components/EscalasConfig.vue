<script setup>
import { onMounted, ref, reactive } from 'vue'
import { listScales, saveScale } from '../db/repositories/escalasRepository.js'
import { regimenes, regimenNombre } from '../utils/regimenes.js'
import { money } from '../utils/formatos.js'
import { useNotificacionesStore } from '../stores/notificaciones.js'
const props=defineProps({regimen:{type:String,default:'codigo_trabajo'}})
const items=ref([]), error=ref(''),busy=ref(false),form=reactive({}),notices=useNotificacionesStore()
function reset(){Object.assign(form,{id:null,codigo:'',descripcion:'',sueldo:'',regimen:props.regimen,activo:true})}
async function load(){try{items.value=await listScales();error.value=''}catch(e){error.value=e.message}}
async function save(){busy.value=true;error.value='';try{await saveScale(form);reset();await load();notices.notify('Escala guardada. Los sueldos ya asignados se conservan hasta que actualices cada empleado.')}catch(e){error.value=e.message}finally{busy.value=false}}
onMounted(()=>{reset();load()})
</script>
<template>
<section class="card mt-6 p-6">
<h2 class="text-lg font-semibold">Escalas salariales</h2>
<p class="my-3 text-sm text-slate-500">Registra códigos como A1 o B1 y su sueldo. No se han asignado valores de ejemplo: ingresa los de tu documento. Modificar una escala no cambia automáticamente sueldos ni roles anteriores.</p>
<p v-if="error" role="alert" class="my-3 text-red-700">{{error}}</p>
<form @submit.prevent="save" class="grid gap-3 md:grid-cols-3">
<label>Código<input v-model="form.codigo" class="input" required maxlength="30" placeholder="A1" /></label>
<label>Descripción<input v-model="form.descripcion" class="input" maxlength="180" /></label>
<label>Sueldo mensual USD<input v-model="form.sueldo" class="input" type="number" required min="0.01" step="0.01" /></label>
<label>Régimen<select v-model="form.regimen" class="input"><option v-for="r in regimenes" :value="r.id" :key="r.id">{{r.nombre}}</option></select></label>
<label class="flex items-center gap-2"><input v-model="form.activo" type="checkbox" />Activa para nuevas asignaciones</label>
<div class="flex items-end gap-2"><button class="btn btn-primary" :disabled="busy">{{form.id?'Actualizar escala':'Agregar escala'}}</button><button type="button" class="btn btn-secondary" @click="reset">Limpiar</button></div>
</form>
<div class="mt-5 overflow-x-auto"><table class="w-full text-left text-sm"><thead><tr><th>Código</th><th>Descripción</th><th>Régimen</th><th>Sueldo</th><th>Estado</th><th></th></tr></thead><tbody><tr v-for="s in items" :key="s.id" class="border-t border-slate-100"><td class="py-3">{{s.codigo}}</td><td>{{s.descripcion}}</td><td>{{regimenNombre(s.regimen)}}</td><td>{{money(s.sueldo)}}</td><td>{{s.activo?'Activa':'Inactiva'}}</td><td><button class="btn btn-secondary" @click="Object.assign(form,s)">Editar</button></td></tr></tbody></table><p v-if="!items.length" class="my-4 text-slate-500">Aún no hay escalas registradas.</p></div>
</section>
</template>
