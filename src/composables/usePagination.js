import { computed, ref, toValue, watch } from 'vue'

export function usePagination(items, initialSize = 10) {
  const page = ref(1)
  const pageSize = ref(initialSize)
  const total = computed(() => toValue(items).length)
  const pageCount = computed(() => Math.max(1, Math.ceil(total.value / pageSize.value)))
  const rows = computed(() => toValue(items).slice((page.value - 1) * pageSize.value, page.value * pageSize.value))
  watch(pageCount, (count) => { page.value = Math.min(page.value, count) })
  watch(pageSize, () => { page.value = 1 })
  return { page, pageSize, total, pageCount, rows, reset: () => { page.value = 1 } }
}
