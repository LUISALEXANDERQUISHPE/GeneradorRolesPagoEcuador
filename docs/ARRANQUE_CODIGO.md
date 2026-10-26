# Arranque optimizado · Archivos actualizados completos

Sustituye estos archivos sobre la versión de configuración y colores. No requiere cambios en Neon.

## src/main.js

````javascript
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router/index.js'
import './assets/main.css'
import { readBrandCache } from './utils/marcaCache.js'
import { applyTheme } from './utils/tema.js'

const savedBrand = readBrandCache()
if (savedBrand) applyTheme(savedBrand)

createApp(App).use(createPinia()).use(router).mount('#app')
````

## src/utils/marcaCache.js

````javascript
import { isHexColor } from './tema.js'

export function brandCacheKey(url) {
  try {
    const parsed = new URL(url)
    if (!['postgres:', 'postgresql:'].includes(parsed.protocol)) return null
    // La clave identifica la base; nunca contiene usuario ni contraseña.
    return 'nomina:marca:v1:' + parsed.hostname + parsed.pathname
  } catch { return null }
}
const cacheKey = brandCacheKey(import.meta.env?.VITE_DATABASE_URL)
function localStorageOrNull() {
  try { return globalThis.localStorage || null } catch { return null }
}
function sanitize(company) {
  if (!company || typeof company.nombre !== 'string' || !company.nombre.trim() ||
      company.nombre.length > 180 || !isHexColor(company.color_primario) || !isHexColor(company.color_acento)) return null
  const logo = company.logo_data_url || ''
  if (typeof logo !== 'string' || logo.length > 700000 ||
      (logo && !/^data:image\/(png|jpeg);base64,[A-Za-z0-9+/=]+$/.test(logo))) return null
  return { nombre: company.nombre, logo_data_url: logo,
    color_primario: company.color_primario, color_acento: company.color_acento }
}
export function readBrandCache(storage = localStorageOrNull(), key = cacheKey) {
  if (!key || !storage) return null
  try {
    const cached = JSON.parse(storage.getItem(key))
    return cached?.version === 1 ? sanitize(cached.empresa) : null
  } catch { return null }
}
export function saveBrandCache(company, storage = localStorageOrNull(), key = cacheKey) {
  const safe = sanitize(company)
  if (!key || !storage || !safe) return
  try { storage.setItem(key, JSON.stringify({ version: 1, empresa: safe })) } catch {
    // El bloqueo de almacenamiento nunca debe impedir guardar en Neon.
  }
}
````

## src/stores/configuracion.js

````javascript
import { ref } from 'vue'
import { applyTheme } from '../utils/tema.js'
import { readBrandCache, saveBrandCache } from '../utils/marcaCache.js'
import { defineStore } from 'pinia'
import { configuracionRepository } from '../db/repositories/configuracionRepository.js'
import { useConexionStore } from './conexion.js'

export const useConfiguracionStore = defineStore('configuracion', () => {
  const empresa = ref(readBrandCache())
  const parametros = ref(null)
  const initialized = ref(false)
  const loading = ref(false)
  const saving = ref(false)
  const error = ref('')
  const connection = useConexionStore()
  if (empresa.value) connection.company = empresa.value.nombre
  let lastLoadedAt = 0

  function apply(result) {
    empresa.value = result.empresa
    applyTheme(result.empresa)
    saveBrandCache(result.empresa)
    parametros.value = result.parametros
    connection.company = result.empresa.nombre
    connection.sbuConfigured = Number(result.parametros.sbu) > 0
    connection.state = 'conectado'
    connection.message = 'Configuración sincronizada con Neon.'
    lastLoadedAt = Date.now()
  }

  let pendingLoad
  function load({ force = false } = {}) {
    if (pendingLoad) return pendingLoad
    if (saving.value) return Promise.resolve(false)
    if (!force && parametros.value && Date.now() - lastLoadedAt < 60000) return Promise.resolve(true)
    loading.value = true
    error.value = ''
    connection.state = 'verificando'
    pendingLoad = (async () => {
      try {
        // Una consulta trae todo; no repetimos comprobaciones antes de leer.
        apply(await configuracionRepository.load())
        return true
      } catch (cause) {
        error.value = cause.message
        connection.state = 'error'
        connection.message = cause.message
        return false
      } finally {
        initialized.value = true
        loading.value = false
        pendingLoad = undefined
      }
    })()
    return pendingLoad
  }

  async function save(company, parameters) {
    if (loading.value || saving.value) return false
    saving.value = true
    error.value = ''
    try {
      apply(await configuracionRepository.save(company, parameters))
      return true
    } catch (cause) {
      error.value = cause.message
      return false
    } finally {
      saving.value = false
    }
  }

  return { empresa, parametros, initialized, loading, saving, error, load, save }
})
````

## src/layouts/AppLayout.vue

````vue
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
````

## src/views/ConfiguracionView.vue

````vue
<script setup>
import { computed, watch, nextTick, onMounted, onBeforeUnmount, reactive, ref } from 'vue'
import { onBeforeRouteLeave } from 'vue-router'
import { Building2, CheckCircle2, Database, LoaderCircle, Save, TriangleAlert, Upload, X } from '@lucide/vue'
import FormField from '../components/common/FormField.vue'
import { useConfiguracionStore } from '../stores/configuracion.js'
import { useConexionStore } from '../stores/conexion.js'
import { useNotificacionesStore } from '../stores/notificaciones.js'
import { useConfirm } from '../composables/useConfirm.js'
import { companyFields, parameterFields, validateConfiguration } from '../utils/configuracion.js'
import { defaultTheme, themeFields, themePresets, isHexColor, applyTheme } from '../utils/tema.js'

const settings = useConfiguracionStore()
const connection = useConexionStore()
const notifications = useNotificacionesStore()
const { confirm } = useConfirm()
const company = reactive({})
const parameters = reactive({})
const loaded = ref(false)
const baseline = ref('')
const submitted = ref(false)
const logoBusy = ref(false)
const logoError = ref('')
const form = ref(null)
const busy = computed(() => settings.loading || settings.saving || logoBusy.value)
const snapshot = () => JSON.stringify([company, parameters])
const dirty = computed(() => loaded.value && snapshot() !== baseline.value)
const errors = computed(() => submitted.value ? validateConfiguration(company, parameters) : {})

function setColors(palette) {
  for (const { key } of themeFields) company[key] = palette[key]
}
watch(() => [company.color_primario, company.color_acento], () => {
  if (loaded.value && themeFields.every(({ key }) => isHexColor(company[key]))) applyTheme(company)
})

function fill() {
  for (const { key } of companyFields) company[key] = settings.empresa[key] ?? ''
  company.logo_data_url = settings.empresa.logo_data_url ?? ''
  for (const { key } of themeFields) company[key] = settings.empresa[key] ?? defaultTheme[key]
  for (const { key } of parameterFields) parameters[key] = settings.parametros[key] ?? ''
  baseline.value = snapshot()
  loaded.value = true
  submitted.value = false
  logoError.value = ''
}

async function load({ force = true } = {}) {
  if (settings.saving || logoBusy.value) return
  if (dirty.value && !await confirm({ title: 'Descartar cambios', message: 'Hay cambios sin guardar. ¿Quieres descartarlos y cargar los datos de Neon?', confirmLabel: 'Descartar y recargar', danger: true })) return
  if (await settings.load({ force })) fill()
}

async function save() {
  if (busy.value) return
  submitted.value = true
  if (Object.keys(errors.value).length || logoError.value) {
    notifications.notify('Revisa los campos marcados antes de guardar.', 'error')
    await nextTick()
    form.value?.querySelector('[aria-invalid="true"]')?.focus()
    return
  }
  if (await settings.save(company, parameters)) {
    fill()
    notifications.notify('Empresa y parámetros guardados en Neon.')
  } else {
    notifications.notify(settings.error, 'error')
  }
}

async function selectLogo(event) {
  const file = event.target.files?.[0]
  event.target.value = ''
  if (!file) return
  logoError.value = ''
  if (!['image/png', 'image/jpeg'].includes(file.type) || file.size > 500 * 1024) {
    logoError.value = 'Elige un archivo PNG o JPEG de hasta 500 KB.'
    return
  }
  logoBusy.value = true
  try {
    const data = await new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result)
      reader.onerror = () => reject(new Error('No se pudo leer el archivo.'))
      reader.readAsDataURL(file)
    })
    const img = new Image()
    img.src = data
    await img.decode()
    if (img.naturalWidth > 2000 || img.naturalHeight > 2000) throw new Error('El logo debe medir como máximo 2000 × 2000 píxeles.')
    company.logo_data_url = data
  } catch {
    logoError.value = 'No se pudo cargar la imagen. Usa PNG/JPEG de hasta 2000 × 2000 píxeles.'
  } finally {
    logoBusy.value = false
  }
}

function beforeUnload(event) {
  if (dirty.value || settings.saving) { event.preventDefault(); event.returnValue = '' }
}
onMounted(() => {
  window.addEventListener('beforeunload', beforeUnload)
  if (settings.parametros) fill()
  load({ force: false })
})
onBeforeUnmount(() => {
  window.removeEventListener('beforeunload', beforeUnload)
  applyTheme(settings.empresa || defaultTheme)
})
onBeforeRouteLeave(async () => {
  if (settings.saving || logoBusy.value) return false
  return !dirty.value || await confirm({ title: 'Cambios sin guardar', message: 'Si sales, se perderán los cambios de configuración. ¿Quieres continuar?', confirmLabel: 'Salir sin guardar', danger: true })
})
</script>

<template>
  <div class="mb-7 flex flex-wrap items-end justify-between gap-4">
    <div><p class="eyebrow mb-2">Ajustes de tu espacio</p><h1 class="text-3xl font-semibold tracking-tight">Configuración</h1><p class="mt-3 text-sm text-slate-500">Empresa privada · Código del Trabajo. Edita los datos y valores de tu nómina.</p></div>
    <span v-if="connection.connected" class="inline-flex items-center gap-2 rounded-full bg-brand-50 px-3 py-2 text-xs font-medium text-brand-600"><CheckCircle2 :size="16" />Neon conectado</span>
  </div>

  <div v-if="settings.loading" role="status" class="card mb-5 flex items-center gap-3 p-6 text-sm text-slate-600"><LoaderCircle :size="20" class="animate-spin" />Cargando la configuración de tu empresa…</div>
  <div v-if="settings.error" role="alert" class="mb-5 rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-800"><p>{{ settings.error }}</p><button v-if="!loaded" class="btn btn-secondary mt-3" :disabled="busy" @click="load">Reintentar conexión</button><p v-else class="mt-2">Tus cambios siguen en el formulario. Puedes volver a guardar.</p></div>

  <form v-if="loaded" ref="form" novalidate @submit.prevent="save">
    <fieldset :disabled="busy" class="min-w-0 space-y-6">
      <section class="card p-6 md:p-7" aria-labelledby="company-title">
        <h2 id="company-title" class="mb-6 flex items-center gap-3 text-lg font-semibold"><Building2 :size="22" class="text-brand-600" />Datos de la empresa</h2>
        <div class="grid gap-5 md:grid-cols-2">
          <FormField v-for="field in companyFields" :key="field.key" :label="field.label" :required="field.required" :error="errors[field.key]" v-slot="{ id, describedby, invalid }">
            <input :id="id" v-model="company[field.key]" :type="field.type || 'text'" :maxlength="field.max" :required="field.required" :aria-describedby="describedby" :aria-invalid="invalid" class="input" :inputmode="field.key === 'ruc' ? 'numeric' : undefined" />
          </FormField>
        </div>
        <div class="mt-6 rounded-xl border border-dashed border-slate-300 p-4">
          <p class="mb-3 text-sm font-medium">Logo para los roles de pago</p>
          <div class="flex flex-wrap items-center gap-4">
            <img v-if="company.logo_data_url" :src="company.logo_data_url" alt="Logo de la empresa" class="h-20 w-32 rounded-lg border border-slate-100 bg-white object-contain p-2" />
            <div class="min-w-0 flex-1"><label for="company-logo" class="mb-2 flex items-center gap-2 text-sm text-brand-600"><Upload :size="16" />Seleccionar logo</label><input id="company-logo" type="file" accept="image/png,image/jpeg" class="block max-w-full text-sm" :aria-invalid="Boolean(logoError || errors.logo_data_url)" aria-describedby="logo-help logo-error" @change="selectLogo" /><p id="logo-help" class="mt-2 text-xs text-slate-500">PNG o JPEG. Máximo 500 KB y 2000 × 2000 píxeles.</p></div>
            <button v-if="company.logo_data_url" type="button" class="btn btn-secondary" @click="company.logo_data_url = ''; logoError = ''"><X :size="16" />Quitar logo</button>
          </div>
          <p v-if="logoError || errors.logo_data_url" id="logo-error" role="alert" class="mt-2 text-xs text-red-700">{{ logoError || errors.logo_data_url }}</p>
        </div>
      </section>


      <section class="card p-6 md:p-7" aria-labelledby="appearance-title">
        <div class="mb-5 flex flex-wrap items-start justify-between gap-3">
          <div><h2 id="appearance-title" class="text-lg font-semibold">Colores de la aplicación</h2><p class="mt-2 text-sm text-slate-500">Prueba tus colores aquí. Pulsa Guardar configuración para conservarlos al volver a entrar.</p></div>
          <button type="button" class="btn btn-secondary" @click="setColors(defaultTheme)">Restablecer colores</button>
        </div>
        <div class="mb-6 flex flex-wrap gap-3" aria-label="Paletas de colores">
          <button v-for="preset in themePresets" :key="preset.label" type="button" class="btn btn-secondary" @click="setColors(preset)" :aria-pressed="company.color_primario === preset.color_primario && company.color_acento === preset.color_acento">
            <span aria-hidden="true" class="h-5 w-5 rounded-full border border-slate-200" :style="{ backgroundColor: preset.color_primario }" /><span aria-hidden="true" class="-ml-4 h-4 w-4 rounded-full border border-slate-200" :style="{ backgroundColor: preset.color_acento }" />{{ preset.label }}
          </button>
        </div>
        <div class="grid gap-5 md:grid-cols-2">
          <div v-for="field in themeFields" :key="field.key">
            <label :for="field.key + '-hex'" class="mb-2 block text-sm font-medium">{{ field.label }}</label>
            <div class="flex items-center gap-3">
              <input type="color" :value="isHexColor(company[field.key]) ? company[field.key] : defaultTheme[field.key]" :aria-label="'Seleccionar ' + field.label.toLowerCase()" class="h-11 w-14 shrink-0 cursor-pointer rounded-lg border border-slate-300 bg-white p-1" @input="company[field.key] = $event.target.value" />
              <input :id="field.key + '-hex'" v-model="company[field.key]" type="text" maxlength="7" spellcheck="false" class="input font-mono" :aria-invalid="!isHexColor(company[field.key])" :aria-describedby="field.key + '-help'" />
            </div>
            <p :id="field.key + '-help'" class="mt-2 text-xs" :class="isHexColor(company[field.key]) ? 'text-slate-500' : 'text-red-700'">{{ isHexColor(company[field.key]) ? field.description : 'Ingresa # seguido de seis dígitos hexadecimales.' }}</p>
          </div>
        </div>
        <p class="mt-5 text-xs text-slate-500">La barra lateral y los botones muestran la vista previa. El texto se adapta automáticamente al contraste del fondo.</p>
      </section>

      <section class="card p-6 md:p-7" aria-labelledby="parameters-title">
        <h2 id="parameters-title" class="text-lg font-semibold">Parámetros de nómina</h2>
        <p class="mb-6 mt-2 text-sm text-slate-500">Los porcentajes y valores se guardan en tu base de datos. Completa el SBU antes de generar roles.</p>
        <div class="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          <FormField v-for="field in parameterFields" :key="field.key" :label="field.label" required :error="errors[field.key]" v-slot="{ id, describedby, invalid }">
            <input :id="id" v-model="parameters[field.key]" type="number" :min="field.min" :max="field.max" :step="field.step" required :aria-describedby="describedby" :aria-invalid="invalid" class="input tabular-nums" />
          </FormField>
        </div>
        <div v-if="Number(parameters.recargo_suplementarias_pct) === 25" class="mt-5 flex items-start gap-3 rounded-xl bg-amber-50 p-4 text-sm leading-6 text-amber-900"><TriangleAlert :size="20" class="mt-1 shrink-0" /><p>El 25% es el valor inicial solicitado. El Ministerio del Trabajo indica un recargo de 50% para horas suplementarias diurnas. Revisa este parámetro antes de utilizarlo en roles reales. <a class="underline" href="https://www.trabajo.gob.ec/5-cual-es-la-jornada-maxima-de-trabajo-para-el-personal-sujeto-al-codigo-del-trabajo-y-cuando-procede-el-pago-por-horas-suplementarias-y-extraordinarias/" target="_blank" rel="noopener noreferrer">Consultar fuente</a>.</p></div>
      </section>

      <div class="sticky bottom-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-lg">
        <p class="text-sm text-slate-500" aria-live="polite">{{ settings.saving ? 'Guardando en Neon…' : dirty ? 'Tienes cambios sin guardar.' : 'Los valores mostrados están guardados en Neon.' }}</p>
        <div class="flex flex-wrap gap-3"><button type="button" class="btn btn-secondary" @click="load">Recargar datos</button><button type="submit" class="btn btn-primary" :disabled="busy || !dirty"><LoaderCircle v-if="settings.saving" :size="18" class="animate-spin" /><Save v-else :size="18" />Guardar configuración</button></div>
      </div>
    </fieldset>
  </form>

  <details class="card mt-6 p-5" :open="!loaded && !settings.loading">
    <summary class="cursor-pointer text-sm font-semibold"><Database :size="17" class="mr-2 inline" />{{ loaded ? 'Conexión y ayuda de instalación' : 'Configurar la conexión a Neon' }}</summary>
    <div class="mt-4 space-y-3 text-sm leading-6 text-slate-600"><p>{{ connection.message }}</p><ol class="list-inside list-decimal space-y-2"><li>Ejecuta <code>schema.sql</code> en SQL Editor de Neon.</li><li>Crea <code>.env</code> a partir de <code>.env.example</code> solo si aún no existe.</li><li>Configura <code>VITE_DATABASE_URL</code> con la conexión de Neon.</li><li>Reinicia Vite con <code>npm run dev</code> y vuelve a esta pantalla.</li></ol><button type="button" class="btn btn-secondary" :disabled="busy" @click="load">{{ loaded ? 'Verificar y recargar' : 'Verificar conexión y cargar formulario' }}</button><p class="text-xs text-amber-800">La conexión queda accesible en el navegador. Utiliza esta versión solo en un entorno local o interno de confianza.</p></div>
  </details>
</template>
````

## tests/marcaCache.test.js

````javascript
import test from 'node:test'
import assert from 'node:assert/strict'
import { brandCacheKey, readBrandCache, saveBrandCache } from '../src/utils/marcaCache.js'
import { createPinia, setActivePinia } from 'pinia'
import { useConfiguracionStore } from '../src/stores/configuracion.js'
import { configuracionRepository } from '../src/db/repositories/configuracionRepository.js'
const company = { nombre: 'Marca guardada', color_primario: '#123b73', color_acento: '#7dd3fc', logo_data_url: '' }
const memory = () => { const data = new Map(); return { getItem: key => data.get(key) ?? null, setItem: (key, value) => data.set(key, value) } }

test('caché solo contiene identidad visual y distingue bases sin incluir credenciales', () => {
  const key = brandCacheKey('postgresql://usuario:secreto@host/base')
  assert.equal(key.includes('secreto'), false)
  assert.notEqual(key, brandCacheKey('postgresql://usuario:secreto@host/otra'))
  const storage = memory()
  saveBrandCache({ ...company, ruc: '123', correo: 'privado', sueldo: 500 }, storage, key)
  assert.deepEqual(readBrandCache(storage, key), company)
  assert.equal(storage.getItem(key).includes('privado'), false)
  assert.equal(readBrandCache(storage, 'otra'), null)
})

test('caché dañada o almacenamiento bloqueado no interrumpen el arranque', () => {
  assert.equal(readBrandCache({ getItem: () => '{' }, 'key'), null)
  const blocked = { getItem() { throw new Error('denied') }, setItem() { throw new Error('quota') } }
  assert.equal(readBrandCache(blocked, 'key'), null)
  assert.doesNotThrow(() => saveBrandCache(company, blocked, 'key'))
  const storage = memory()
  storage.setItem('key', JSON.stringify({ version: 1, empresa: { ...company, color_primario: 'url(fake)' } }))
  assert.equal(readBrandCache(storage, 'key'), null)
})

test('reutiliza configuración reciente, permite refrescar y preserva identidad si falla la red', async () => {
  setActivePinia(createPinia())
  const store = useConfiguracionStore()
  const original = configuracionRepository.load
  let calls = 0
  try {
    configuracionRepository.load = async () => { calls++; return { empresa: company, parametros: { sbu: '500' } } }
    assert.equal(await store.load(), true)
    assert.equal(await store.load(), true)
    assert.equal(calls, 1)
    assert.equal(await store.load({ force: true }), true)
    assert.equal(calls, 2)
    configuracionRepository.load = async () => { throw new Error('Sin red') }
    assert.equal(await store.load({ force: true }), false)
    assert.equal(store.empresa.color_primario, company.color_primario)
    assert.equal(store.initialized, true)
  } finally { configuracionRepository.load = original }
})
````

## tests/configuracion.test.js

````javascript
import test from 'node:test'
import assert from 'node:assert/strict'
import { validateConfiguration } from '../src/utils/configuracion.js'
import { createConfiguracionRepository } from '../src/db/repositories/configuracionRepository.js'
import { createPinia, setActivePinia } from 'pinia'
import { useConfiguracionStore } from '../src/stores/configuracion.js'
import { useConexionStore } from '../src/stores/conexion.js'
import { configuracionRepository } from '../src/db/repositories/configuracionRepository.js'

const company = { nombre: 'Empresa de prueba', ruc: '', correo: '' }
const parameters = { sbu: '500.00', aporte_personal_pct: '9.45', aporte_patronal_pct: '11.15', fondos_reserva_pct: '8.33', recargo_suplementarias_pct: '50', recargo_extraordinarias_pct: '100', dias_base_mes: '30', horas_jornada: '8' }

test('SBU vacío no se convierte en cero; rechaza días fraccionarios y porcentajes fuera de rango', () => {
  assert.deepEqual(validateConfiguration(company, parameters), {})
  for (const sbu of ['', null, '0', '-1', 'NaN', '1e3']) assert.ok(validateConfiguration(company, { ...parameters, sbu }).sbu)
  assert.ok(validateConfiguration(company, { ...parameters, dias_base_mes: '30.5' }).dias_base_mes)
  assert.ok(validateConfiguration(company, { ...parameters, aporte_personal_pct: '101' }).aporte_personal_pct)
  assert.ok(validateConfiguration(company, { ...parameters, sbu: '500.001' }).sbu)
})

test('acepta porcentajes cero y datos opcionales vacíos; rechaza logo activo y correo inválido', () => {
  assert.deepEqual(validateConfiguration(company, { ...parameters, fondos_reserva_pct: '0' }), {})
  assert.ok(validateConfiguration({ ...company, logo_data_url: 'data:image/svg+xml;base64,PHN2Zz4=' }, parameters).logo_data_url)
  assert.ok(validateConfiguration({ ...company, correo: 'correo-invalido' }, parameters).correo)
})

test('guardar rechaza datos inválidos sin enviar ninguna consulta', async () => {
  let count = 0
  const repository = createConfiguracionRepository(async () => { count++; return [] })
  await assert.rejects(repository.save(company, { ...parameters, sbu: '' }), { code: 'VALIDATION_ERROR' })
  assert.equal(count, 0)
})

test('el guardado envía empresa y parámetros juntos y mantiene el nombre hostil como parámetro', async () => {
  const input = "Empresa'; DROP TABLE empleados; --"
  let calls = 0
  const repository = createConfiguracionRepository(async (text, values) => {
    calls++
    assert.equal(text.includes(input), false)
    assert.equal(values[0], input)
    assert.equal(values[1], null)
    assert.equal(values[7], '500.00')
    assert.equal(values.length, 17)
    assert.equal(values[15], '#123b73')
    assert.equal(values[16], '#7dd3fc')
    return [{ empresa: { ...company, nombre: input }, parametros: parameters }]
  })
  const saved = await repository.save({ ...company, nombre: input, color_primario: '#123b73', color_acento: '#7dd3fc' }, parameters)
  assert.equal(calls, 1)
  assert.equal(saved.empresa.nombre, input)
})

test('no comunica éxito si faltan registros iniciales', async () => {
  const repository = createConfiguracionRepository(async () => [])
  await assert.rejects(repository.load(), { code: 'SEED_MISSING' })
  await assert.rejects(repository.save(company, parameters), { code: 'SEED_MISSING' })
})

test('Pinia conserva datos anteriores tras fallo y actualiza SBU y nombre solo al confirmar guardado', async () => {
  setActivePinia(createPinia())
  const store = useConfiguracionStore()
  const connection = useConexionStore()
  const oldSave = configuracionRepository.save
  try {
    store.empresa = { nombre: 'Anterior' }
    store.parametros = { sbu: null }
    connection.sbuConfigured = false
    configuracionRepository.save = async () => { throw new Error('Sin permisos para guardar.') }
    assert.equal(await store.save(company, parameters), false)
    assert.equal(store.empresa.nombre, 'Anterior')
    assert.equal(connection.sbuConfigured, false)
    assert.equal(store.saving, false)
    assert.equal(store.error, 'Sin permisos para guardar.')
    configuracionRepository.save = async () => ({ empresa: company, parametros: parameters })
    assert.equal(await store.save(company, parameters), true)
    assert.equal(store.error, '')
    assert.equal(connection.sbuConfigured, true)
    assert.equal(connection.company, company.nombre)
  } finally { configuracionRepository.save = oldSave }
})

test('al volver a abrir se leen los valores persistidos en lugar de reemplazarlos por valores iniciales', async () => {
  setActivePinia(createPinia())
  const store = useConfiguracionStore()
  const connection = useConexionStore()
  const oldLoad = configuracionRepository.load
  try {
    connection.verify = async () => true
    configuracionRepository.load = async () => ({ empresa: { nombre: 'Guardada en Neon' }, parametros: { ...parameters, sbu: '550.00' } })
    assert.equal(await store.load(), true)
    assert.equal(store.empresa.nombre, 'Guardada en Neon')
    assert.equal(store.parametros.sbu, '550.00')
    assert.equal(store.loading, false)
  } finally { configuracionRepository.load = oldLoad }
})

test('la carga inicial compartida conserva nombre y logo para todas las pantallas', async () => {
  setActivePinia(createPinia())
  const store = useConfiguracionStore()
  const connection = useConexionStore()
  const oldLoad = configuracionRepository.load
  const logo = 'data:image/png;base64,aGVsbG8='
  let reads = 0
  let release
  try {
    configuracionRepository.load = async () => {
      reads++
      await new Promise(resolve => { release = resolve })
      return { empresa: { nombre: 'Empresa con logo', logo_data_url: logo }, parametros: parameters }
    }
    const startup = store.load()
    const screen = store.load()
    release(true)
    assert.deepEqual(await Promise.all([startup, screen]), [true, true])
    assert.equal(reads, 1)
    assert.equal(store.empresa.logo_data_url, logo)
    assert.equal(connection.company, 'Empresa con logo')
    assert.equal(store.loading, false)
  } finally { configuracionRepository.load = oldLoad }
})
````
