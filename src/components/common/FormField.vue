<script setup>
import { useId } from 'vue'
const props = defineProps({ label: { type: String, required: true }, id: String, error: String, hint: String, required: Boolean })
const generatedId = useId()
</script>

<template>
  <div><label :for="props.id || generatedId" class="mb-1.5 block text-sm font-medium text-slate-700">{{ label }}<span v-if="required" class="ml-1 text-red-600" aria-hidden="true">*</span></label><slot :id="props.id || generatedId" :describedby="error || hint ? (props.id || generatedId) + '-description' : undefined" :invalid="Boolean(error)" /><p v-if="error || hint" :id="(props.id || generatedId) + '-description'" class="mt-1.5 text-xs" :class="error ? 'text-red-700' : 'text-slate-500'" :role="error ? 'alert' : undefined">{{ error || hint }}</p></div>
</template>
