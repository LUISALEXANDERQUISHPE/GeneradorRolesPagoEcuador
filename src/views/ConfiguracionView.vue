<script setup>
import EscalasConfig from '../components/EscalasConfig.vue'
import { regimenes } from '../utils/regimenes.js'
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
  company.regimen_laboral = settings.empresa.regimen_laboral || 'codigo_trabajo'
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
    <div><p class="eyebrow mb-2">Ajustes de tu espacio</p><h1 class="text-3xl font-semibold tracking-tight">Configuración</h1><p class="mt-3 text-sm text-slate-500">Edita tu empresa, régimen laboral y valores de nómina.</p></div>
    <span v-if="connection.connected" class="inline-flex items-center gap-2 rounded-full bg-brand-50 px-3 py-2 text-xs font-medium text-brand-600"><CheckCircle2 :size="16" />Neon conectado</span>
  </div>

  <div v-if="settings.loading" role="status" class="card mb-5 flex items-center gap-3 p-6 text-sm text-slate-600"><LoaderCircle :size="20" class="animate-spin" />Cargando la configuración de tu empresa…</div>
  <div v-if="settings.error" role="alert" class="mb-5 rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-800"><p>{{ settings.error }}</p><button v-if="!loaded" class="btn btn-secondary mt-3" :disabled="busy" @click="load">Reintentar conexión</button><p v-else class="mt-2">Tus cambios siguen en el formulario. Puedes volver a guardar.</p></div>

  <form v-if="loaded" ref="form" novalidate @submit.prevent="save">
    <fieldset :disabled="busy" class="min-w-0 space-y-6">
      <section class="card p-6 md:p-7" aria-labelledby="company-title">
        <h2 id="company-title" class="mb-6 flex items-center gap-3 text-lg font-semibold"><Building2 :size="22" class="text-brand-600" />Datos de la empresa</h2>
        <label class="mb-5 block text-sm">Régimen laboral<select v-model="company.regimen_laboral" class="input mt-2"><option v-for="r in regimenes" :key="r.id" :value="r.id">{{r.nombre}}</option></select></label><p v-if="company.regimen_laboral !== 'codigo_trabajo'" class="mb-5 rounded-lg bg-amber-50 p-4 text-sm text-amber-900">Puedes registrar este régimen y sus escalas. La emisión de roles para este régimen está pendiente de sus reglas específicas; cambiar el nombre no aplica ni valida sus aportes o beneficios.</p><div class="grid gap-5 md:grid-cols-2">
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

  <EscalasConfig v-if="loaded" :regimen="company.regimen_laboral" />

  <details class="card mt-6 p-5" :open="!loaded && !settings.loading">
    <summary class="cursor-pointer text-sm font-semibold"><Database :size="17" class="mr-2 inline" />{{ loaded ? 'Conexión y ayuda de instalación' : 'Configurar la conexión a Neon' }}</summary>
    <div class="mt-4 space-y-3 text-sm leading-6 text-slate-600"><p>{{ connection.message }}</p><ol class="list-inside list-decimal space-y-2"><li>Ejecuta <code>schema.sql</code> en SQL Editor de Neon.</li><li>Crea <code>.env</code> a partir de <code>.env.example</code> solo si aún no existe.</li><li>Configura <code>VITE_DATABASE_URL</code> con la conexión de Neon.</li><li>Reinicia Vite con <code>npm run dev</code> y vuelve a esta pantalla.</li></ol><button type="button" class="btn btn-secondary" :disabled="busy" @click="load">{{ loaded ? 'Verificar y recargar' : 'Verificar conexión y cargar formulario' }}</button><p class="text-xs text-amber-800">La conexión queda accesible en el navegador. Utiliza esta versión solo en un entorno local o interno de confianza.</p></div>
  </details>
</template>
