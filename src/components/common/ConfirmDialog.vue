<script setup>
import AppModal from './AppModal.vue'
import { useConfirm } from '../../composables/useConfirm.js'
const { request, settle } = useConfirm()
</script>

<template>
  <AppModal :model-value="Boolean(request)" :title="request?.title || 'Confirmar acción'" @update:model-value="!$event && settle(false)">
    <p class="text-sm leading-relaxed text-slate-600">{{ request?.message }}</p>
    <div class="mt-6 flex flex-wrap justify-end gap-3"><button autofocus class="btn btn-secondary" @click="settle(false)">Cancelar</button><button class="btn" :class="request?.danger ? 'btn-danger' : 'btn-primary'" @click="settle(true)">{{ request?.confirmLabel }}</button></div>
  </AppModal>
</template>
