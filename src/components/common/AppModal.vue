<script setup>
import { nextTick, onBeforeUnmount, ref, useId, watch } from 'vue'
import { X } from '@lucide/vue'
const props = defineProps({ modelValue: Boolean, title: { type: String, required: true }, sidebar: Boolean, dismissible: { type: Boolean, default: true } })
const emit = defineEmits(['update:modelValue'])
const dialog = ref(null)
const titleId = useId()
let previousFocus
let previousOverflow = ''
let scrollLocked = false
function restoreScroll() {
  if (scrollLocked) document.body.style.overflow = previousOverflow
  scrollLocked = false
}
watch(() => props.modelValue, async (open) => {
  await nextTick()
  if (!dialog.value) return
  if (open && !dialog.value.open) {
    previousFocus = document.activeElement
    previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    scrollLocked = true
    dialog.value.showModal()
  } else if (!open && dialog.value.open) {
    dialog.value.close()
    restoreScroll()
    previousFocus?.focus?.()
  }
}, { immediate: true })
function requestClose() { if (props.dismissible) emit('update:modelValue', false) }
function closeEvent() { restoreScroll(); emit('update:modelValue', false) }
onBeforeUnmount(restoreScroll)
</script>

<template>
  <Teleport to="body">
    <dialog ref="dialog" :aria-labelledby="titleId" class="border-0 p-0 shadow-2xl" :class="sidebar ? 'm-0 h-dvh max-h-dvh w-72 max-w-[85vw] bg-brand-900' : 'm-auto max-h-[90dvh] w-[calc(100%-2rem)] max-w-lg overflow-y-auto rounded-2xl bg-white'" @cancel.prevent="requestClose" @close="closeEvent" @click="($event.target === dialog) && requestClose()">
      <div :class="sidebar ? 'h-full' : 'p-6'" @click.stop>
        <div :class="sidebar ? 'sr-only' : 'mb-5 flex items-center justify-between gap-4'"><h2 :id="titleId" class="text-lg font-semibold">{{ title }}</h2><button v-if="!sidebar && dismissible" class="rounded-lg p-2 text-slate-400 hover:bg-slate-100" aria-label="Cerrar diálogo" @click="requestClose"><X :size="20" /></button></div>
        <slot />
      </div>
    </dialog>
  </Teleport>
</template>
