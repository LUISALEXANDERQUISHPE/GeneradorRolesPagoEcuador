<script setup>
import { money, employeeName, roleLabel } from '../../utils/formatos.js'
defineProps({rol:{type:Object,required:true}})
</script>
<template>
 <article class="card overflow-hidden">
 <div class="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-5"><div><h3 class="font-semibold">{{employeeName(rol.empleado_snapshot)}}</h3><p class="mt-1 text-xs text-slate-500">{{roleLabel(rol.tipo)}} · {{rol.periodo.slice(0,7)}} · {{rol.empleado_snapshot.cedula}}</p><p v-if="rol.empleado_snapshot.escala_codigo" class="mt-1 text-xs text-slate-500">Escala: {{rol.empleado_snapshot.escala_codigo}} · Sueldo base: {{money(rol.empleado_snapshot.sueldo_base)}}</p><p v-if="rol.datos_entrada?.inicio_fondos_reserva" class="mt-1 text-xs text-slate-500">Fondos de reserva desde {{rol.datos_entrada.inicio_fondos_reserva}} · {{rol.datos_entrada.dias_fondos_reserva}} días con derecho en este mes</p><p v-if="rol.tipo!=='mensual'" class="mt-1 text-xs text-slate-500">Devengo: {{rol.inicio_devengo}} a {{rol.fin_devengo}}</p></div><div class="text-right"><p class="text-xs text-slate-500">Neto a recibir</p><strong class="text-2xl text-brand-600">{{money(rol.neto_recibir)}}</strong></div></div>
 <div class="overflow-x-auto"><table class="w-full text-left text-sm"><thead class="bg-slate-50 text-xs text-slate-500"><tr><th class="p-3">Tipo</th><th class="p-3">Concepto</th><th class="p-3 text-right">Valor</th></tr></thead><tbody><tr v-for="line in rol.detalle" :key="line.codigo" class="border-t border-slate-100"><td class="p-3">{{line.tipo}}</td><td class="p-3">{{line.descripcion}}</td><td class="p-3 text-right tabular-nums">{{money(line.monto)}}</td></tr></tbody></table></div>
 <div class="flex flex-wrap justify-end gap-5 border-t p-4 text-sm"><span>Ingresos: <b>{{money(rol.total_ingresos)}}</b></span><span>Egresos: <b>{{money(rol.total_egresos)}}</b></span></div>
 <p v-if="rol.observaciones" class="border-t px-5 py-3 text-sm text-slate-500">{{rol.observaciones}}</p>
 </article>
</template>
