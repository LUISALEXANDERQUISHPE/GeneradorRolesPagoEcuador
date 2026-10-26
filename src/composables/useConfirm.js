import { readonly, ref } from 'vue'

const request = ref(null)
let resolveRequest

export function useConfirm() {
  function confirm({ title = 'Confirmar acción', message, confirmLabel = 'Confirmar', danger = false }) {
    if (resolveRequest) resolveRequest(false)
    request.value = { title, message, confirmLabel, danger }
    return new Promise((resolve) => { resolveRequest = resolve })
  }

  function settle(answer) {
    resolveRequest?.(answer)
    resolveRequest = undefined
    request.value = null
  }

  return { request: readonly(request), confirm, settle }
}
