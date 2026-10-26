<script setup>
import { ref, watch, onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import AppSidebar from '../components/common/AppSidebar.vue'
import AppHeader from '../components/common/AppHeader.vue'
import AppModal from '../components/common/AppModal.vue'
import { useConfiguracionStore } from '../stores/configuracion.js'
const settings = useConfiguracionStore()
onMounted(() => { settings.load() })
const menuOpen = ref(false)
const route = useRoute()
watch(() => route.fullPath, () => { menuOpen.value = false })
const breakpoint = window.matchMedia('(min-width: 1024px)')
const closeOnDesktop = () => { if (breakpoint.matches) menuOpen.value = false }
breakpoint.addEventListener('change', closeOnDesktop)
onUnmounted(() => breakpoint.removeEventListener('change', closeOnDesktop))
</script>

<template>
  <div v-if="!settings.empresa && !settings.initialized" role="status" class="grid min-h-screen place-items-center bg-slate-50 text-sm text-slate-500">Cargando tu empresa…</div>
  <template v-else>
  <a href="#main-content" class="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-white focus:p-4">Saltar al contenido</a>
  <div class="fixed inset-y-0 left-0 hidden w-64 lg:block"><AppSidebar /></div>
  <AppModal v-model="menuOpen" title="Menú de navegación" :sidebar="true"><AppSidebar mobile @close="menuOpen = false" /></AppModal>
  <div class="min-h-screen lg:ml-64">
    <AppHeader @open-menu="menuOpen = true" />
    <main id="main-content" tabindex="-1" class="mx-auto max-w-[1440px] px-5 py-7 outline-none md:px-9 md:py-9"><RouterView /></main>
    <footer class="mx-auto flex max-w-[1440px] flex-wrap justify-between gap-2 px-5 pb-6 text-[11px] text-slate-400 md:px-9"><span>Nómina · Gestión de roles de pago</span><span>Ecuador · Uso local / interno</span></footer>
  </div>
  </template>
</template>
