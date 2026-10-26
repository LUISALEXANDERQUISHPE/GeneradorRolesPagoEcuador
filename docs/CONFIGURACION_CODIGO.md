# Configuración, marca y colores · Código completo

La migración de colores se encuentra en migrations/002_colores_empresa.sql. Puede ejecutarse con npm run db:migrate:theme.

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

async function load() {
  if (settings.saving || logoBusy.value) return
  if (dirty.value && !await confirm({ title: 'Descartar cambios', message: 'Hay cambios sin guardar. ¿Quieres descartarlos y cargar los datos de Neon?', confirmLabel: 'Descartar y recargar', danger: true })) return
  if (await settings.load()) fill()
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
onMounted(() => { window.addEventListener('beforeunload', beforeUnload); load() })
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

## src/db/repositories/configuracionRepository.js

````javascript
import { query, DatabaseError } from '../client.js'
import { normalizeConfiguration, validateConfiguration } from '../../utils/configuracion.js'

export function createConfiguracionRepository(execute = query) {
  async function load() {
    const [row] = await execute(`
      SELECT to_jsonb(e) AS empresa, to_jsonb(p) AS parametros
      FROM public.empresa e JOIN public.parametros p ON p.empresa_id = e.id
      WHERE e.id = $1 AND p.id = $1
    `, [1])
    if (!row) throw new DatabaseError('Faltan la empresa o los parámetros iniciales. Ejecuta schema.sql.', 'SEED_MISSING')
    return row
  }

  async function save(company, parameters) {
    if (Object.keys(validateConfiguration(company, parameters)).length) {
      throw new DatabaseError('Revisa los campos marcados antes de guardar.', 'VALIDATION_ERROR')
    }
    const { empresa: e, parametros: p } = normalizeConfiguration(company, parameters)
    // Una sola sentencia: ambos cambios se guardan juntos o se revierten.
    const [row] = await execute(`
      WITH empresa_guardada AS (
        UPDATE public.empresa SET nombre = $1, ruc = $2, direccion = $3,
          telefono = $4, correo = $5, representante = $6, logo_data_url = $7,
          color_primario = $16, color_acento = $17
        WHERE id = 1 AND EXISTS (
          SELECT 1 FROM public.parametros WHERE id = 1 AND empresa_id = 1
        )
        RETURNING *
      ), parametros_guardados AS (
        UPDATE public.parametros SET sbu = $8, aporte_personal_pct = $9,
          aporte_patronal_pct = $10, fondos_reserva_pct = $11,
          recargo_suplementarias_pct = $12, recargo_extraordinarias_pct = $13,
          dias_base_mes = $14, horas_jornada = $15
        WHERE id = 1 AND empresa_id IN (SELECT id FROM empresa_guardada)
        RETURNING *
      )
      SELECT to_jsonb(e) AS empresa, to_jsonb(p) AS parametros
      FROM empresa_guardada e CROSS JOIN parametros_guardados p
    `, [e.nombre, e.ruc, e.direccion, e.telefono, e.correo, e.representante, e.logo_data_url,
      p.sbu, p.aporte_personal_pct, p.aporte_patronal_pct, p.fondos_reserva_pct,
      p.recargo_suplementarias_pct, p.recargo_extraordinarias_pct, p.dias_base_mes, p.horas_jornada, e.color_primario, e.color_acento])
    if (!row) throw new DatabaseError('No se encontró la configuración inicial. Recarga y revisa schema.sql.', 'SEED_MISSING')
    return row
  }
  return { load, save }
}

export const configuracionRepository = createConfiguracionRepository()
````

## src/stores/configuracion.js

````javascript
import { ref } from 'vue'
import { applyTheme } from '../utils/tema.js'
import { defineStore } from 'pinia'
import { configuracionRepository } from '../db/repositories/configuracionRepository.js'
import { useConexionStore } from './conexion.js'

export const useConfiguracionStore = defineStore('configuracion', () => {
  const empresa = ref(null)
  const parametros = ref(null)
  const loading = ref(false)
  const saving = ref(false)
  const error = ref('')
  const connection = useConexionStore()

  function apply(result) {
    empresa.value = result.empresa
    applyTheme(result.empresa)
    parametros.value = result.parametros
    connection.company = result.empresa.nombre
    connection.sbuConfigured = Number(result.parametros.sbu) > 0
  }

  let pendingLoad
  function load() {
    // El layout y la pantalla pueden solicitar los datos al mismo tiempo.
    if (pendingLoad) return pendingLoad
    if (saving.value) return Promise.resolve(false)
    loading.value = true
    error.value = ''
    pendingLoad = (async () => {
      try {
        if (!await connection.verify()) throw new Error(connection.message)
        apply(await configuracionRepository.load())
        return true
      } catch (cause) {
        error.value = cause.message
        return false
      } finally {
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

  return { empresa, parametros, loading, saving, error, load, save }
})
````

## src/utils/configuracion.js

````javascript
import { defaultTheme, themeFields, isHexColor } from './tema.js'

export const parameterFields = [
  { key: 'sbu', label: 'Sueldo Básico Unificado (USD)', min: 0.01, max: 9999999999.99, decimals: 2, step: '0.01' },
  { key: 'aporte_personal_pct', label: 'Aporte personal IESS (%)', min: 0, max: 100, decimals: 4, step: '0.0001' },
  { key: 'aporte_patronal_pct', label: 'Aporte patronal IESS (%)', min: 0, max: 100, decimals: 4, step: '0.0001' },
  { key: 'fondos_reserva_pct', label: 'Fondos de reserva (%)', min: 0, max: 100, decimals: 4, step: '0.0001' },
  { key: 'recargo_suplementarias_pct', label: 'Recargo de horas suplementarias (%)', min: 0, max: 1000, decimals: 4, step: '0.0001' },
  { key: 'recargo_extraordinarias_pct', label: 'Recargo de horas extraordinarias (%)', min: 0, max: 1000, decimals: 4, step: '0.0001' },
  { key: 'dias_base_mes', label: 'Días base del mes', min: 1, max: 31, decimals: 0, step: '1' },
  { key: 'horas_jornada', label: 'Horas de jornada diaria', min: 0.01, max: 24, decimals: 2, step: '0.01' },
]

export const companyFields = [
  { key: 'nombre', label: 'Nombre de la empresa', max: 180, required: true },
  { key: 'ruc', label: 'RUC', max: 13 },
  { key: 'representante', label: 'Representante / empleador', max: 180 },
  { key: 'correo', label: 'Correo electrónico', max: 180, type: 'email' },
  { key: 'telefono', label: 'Teléfono', max: 30, type: 'tel' },
  { key: 'direccion', label: 'Dirección', max: 500 },
]

export function normalizeConfiguration(company, parameters) {
  const empresa = Object.fromEntries(companyFields.map(({ key }) => [key, String(company[key] ?? '').trim() || null]))
  empresa.logo_data_url = company.logo_data_url || null
  for (const { key } of themeFields) empresa[key] = company[key] ?? defaultTheme[key]
  const parametros = Object.fromEntries(parameterFields.map(({ key }) => [key, String(parameters[key] ?? '').trim()]))
  return { empresa, parametros }
}

export function validateConfiguration(company, parameters) {
  const errors = {}
  const { empresa, parametros } = normalizeConfiguration(company, parameters)
  for (const field of companyFields) {
    const value = empresa[field.key] || ''
    if (field.required && !value) errors[field.key] = 'Este campo es obligatorio.'
    else if (value.length > field.max) errors[field.key] = 'El máximo es ' + field.max + ' caracteres.'
  }
  if (empresa.ruc && !/^\d{13}$/.test(empresa.ruc)) errors.ruc = 'Ingresa los 13 dígitos del RUC.'
  if (empresa.correo && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(empresa.correo)) errors.correo = 'Ingresa un correo válido.'
  for (const field of parameterFields) {
    const value = parametros[field.key]
    const pattern = field.decimals === 0 ? /^\d+$/ : new RegExp('^\\d+(?:\\.\\d{1,' + field.decimals + '})?$')
    if (!value) errors[field.key] = 'Este campo es obligatorio.'
    else if (!pattern.test(value) || Number(value) < field.min || Number(value) > field.max) {
      errors[field.key] = 'Ingresa un valor entre ' + field.min + ' y ' + field.max + (field.decimals === 0 ? ', sin decimales.' : ', con hasta ' + field.decimals + ' decimales.')
    }
  }
  if (empresa.logo_data_url && (!/^data:image\/(png|jpeg);base64,[A-Za-z0-9+/=]+$/.test(empresa.logo_data_url) || empresa.logo_data_url.length > 700000)) {
    errors.logo_data_url = 'Selecciona una imagen PNG o JPEG de hasta 500 KB.'
  }
  for (const { key } of themeFields) {
    if (!isHexColor(empresa[key])) errors[key] = 'Usa un color hexadecimal de seis dígitos, como #123b73.'
  }
  return errors
}
````

## src/utils/tema.js

````javascript
export const defaultTheme = { color_primario: '#173d35', color_acento: '#d5eb8b' }
export const themeFields = [
  { key: 'color_primario', label: 'Color principal', description: 'Barra lateral, botones y encabezados.' },
  { key: 'color_acento', label: 'Color de acento', description: 'Resaltados y elementos destacados.' },
]
export const themePresets = [
  { label: 'Verde', color_primario: '#173d35', color_acento: '#d5eb8b' },
  { label: 'Azul', color_primario: '#123b73', color_acento: '#7dd3fc' },
  { label: 'Violeta', color_primario: '#4c2872', color_acento: '#e9c5ff' },
  { label: 'Grafito', color_primario: '#27272a', color_acento: '#fbbf24' },
]
export const isHexColor = value => typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value)
const rgb = color => [1, 3, 5].map(index => parseInt(color.slice(index, index + 2), 16))
const luminance = color => rgb(color).map(v => v / 255).map(v => v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4).reduce((sum, v, i) => sum + v * [0.2126, 0.7152, 0.0722][i], 0)
export const contrast = (a, b) => (Math.max(luminance(a), luminance(b)) + 0.05) / (Math.min(luminance(a), luminance(b)) + 0.05)
export const foreground = color => contrast(color, '#ffffff') >= contrast(color, '#000000') ? '#ffffff' : '#000000'
const mix = (a, b, amount) => '#' + rgb(a).map((v, i) => Math.round(v * (1 - amount) + rgb(b)[i] * amount).toString(16).padStart(2, '0')).join('')
export function themeVariables(theme = {}) {
  const primary = isHexColor(theme.color_primario) ? theme.color_primario : defaultTheme.color_primario
  const accent = isHexColor(theme.color_acento) ? theme.color_acento : defaultTheme.color_acento
  return {
    '--color-brand-900': primary,
    '--color-brand-700': mix(primary, foreground(primary) === '#ffffff' ? '#000000' : '#ffffff', 0.12),
    '--color-brand-600': mix(primary, '#000000', 0.55),
    '--color-brand-50': mix(primary, '#ffffff', 0.95),
    '--color-brand-100': mix(primary, '#ffffff', 0.85),
    '--color-lime-soft': accent,
    '--color-on-brand': foreground(primary),
    '--color-on-accent': foreground(accent),
    '--color-brand-highlight': contrast(primary, accent) >= 4.5 ? accent : foreground(primary),
  }
}
export function applyTheme(theme) {
  if (typeof document === 'undefined') return
  for (const [key, value] of Object.entries(themeVariables(theme))) document.documentElement.style.setProperty(key, value)
}
````

## src/assets/main.css

````css
@import "tailwindcss";

@theme {
  --font-sans: "Segoe UI", "Helvetica Neue", Arial, sans-serif;
  --color-brand-50: #f0f6f3;
  --color-brand-100: #dfece4;
  --color-brand-600: #27614d;
  --color-brand-700: #1e4d3e;
  --color-brand-900: #173d35;
  --color-lime-soft: #d5eb8b;
  --color-on-brand: #ffffff;
  --color-on-accent: #000000;
  --color-brand-highlight: #d5eb8b;
}

@layer base {
  body { @apply m-0 bg-[#f6f7f4] font-sans text-slate-800 antialiased; }
  button, a, input, select, textarea { @apply outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2; }
  button:not(:disabled), select { cursor: pointer; }
  button:disabled { cursor: not-allowed; }
  ::selection { background: var(--color-lime-soft); color: var(--color-on-accent); }
}

@layer components {
  .btn { @apply inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors disabled:opacity-50; }
  .btn-primary { @apply bg-brand-900 text-on-brand hover:bg-brand-700; }
  .btn-secondary { @apply border border-slate-200 bg-white text-slate-700 hover:bg-slate-50; }
  .btn-danger { @apply bg-red-700 text-white hover:bg-red-800; }
  .card { @apply rounded-2xl border border-slate-200/80 bg-white shadow-[0_2px_8px_0_#142b2010]; }
  .input { @apply min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm placeholder:text-slate-400 disabled:bg-slate-100; }
  .eyebrow { @apply text-xs font-semibold uppercase tracking-[0.16em] text-slate-500; }
}

dialog::backdrop { background: rgb(15 23 42 / 48%); backdrop-filter: blur(3px); }
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; }
}
````

## src/views/DashboardView.vue

````vue
<script setup>
import { computed } from 'vue'
import { ArrowRight, Database, ShieldCheck, UsersRound, FileText, Download, Check, Settings2 } from '@lucide/vue'
import { useConexionStore } from '../stores/conexion.js'
const connection = useConexionStore()
const steps = computed(() => [
  { number: '01', title: 'Conecta tu base de datos', description: 'Configura Neon y verifica las tablas de tu empresa.', done: connection.connected, to: '/configuracion', label: 'Preparar conexión' },
  { number: '02', title: 'Personaliza tu empresa', description: 'Nombre, logo y parámetros de nómina en un solo lugar.', done: connection.sbuConfigured, to: '/configuracion', label: 'Ver configuración' },
  { number: '03', title: 'Prepara tu primer rol', description: 'Registra a tu equipo y revisa los valores antes de guardar.', done: false, to: '/roles/nuevo', label: 'Ver módulo' },
])
const modules = [
  { icon: UsersRound, title: 'Tu equipo', description: 'Información laboral y beneficios de cada empleado.', to: '/empleados', block: 'Bloque 2' },
  { icon: FileText, title: 'Roles de pago', description: 'Ingresos, descuentos y neto con un desglose claro.', to: '/roles/nuevo', block: 'Bloques 3 y 4' },
  { icon: Download, title: 'Reportes', description: 'Documentos individuales y consolidados de nómina.', to: '/reportes', block: 'Bloque 5' },
]
</script>

<template>
  <div class="mb-7 flex flex-wrap items-end justify-between gap-4"><div><p class="eyebrow mb-2">Bienvenido a tu espacio</p><h1 class="text-3xl font-semibold tracking-tight md:text-4xl">Todo listo para empezar.</h1><p class="mt-3 text-sm text-slate-500">Un lugar para cuidar de tu equipo y organizar sus pagos.</p></div><span class="rounded-full border border-brand-100 bg-brand-50 px-3 py-1.5 text-xs font-medium text-brand-600">Entrega 01 · Base de la aplicación</span></div>

  <section class="relative mb-8 overflow-hidden rounded-2xl bg-brand-900 p-7 text-on-brand md:p-9">
    <div class="pointer-events-none absolute -right-8 -top-24 h-80 w-80 rounded-full border-[40px] border-on-brand/5" aria-hidden="true" /><div class="pointer-events-none absolute -bottom-32 right-32 h-64 w-64 rounded-full border-[35px] border-on-brand/5" aria-hidden="true" />
    <div class="relative grid gap-7 md:grid-cols-[1.5fr_1fr] md:items-center"><div><p class="mb-4 text-[11px] font-semibold uppercase tracking-[0.2em] text-brand-highlight">Menos tareas. Más claridad.</p><h2 class="max-w-lg text-3xl font-semibold leading-tight tracking-tight md:text-[34px]">La nómina de tu empresa,<br />paso a paso.</h2><p class="mt-4 max-w-md text-sm leading-6 text-on-brand/65">Empieza conectando tu base de datos. Después podrás gestionar empleados, calcular pagos y generar tus documentos.</p><RouterLink to="/configuracion" class="btn mt-6 bg-lime-soft text-on-accent hover:brightness-95">{{ connection.connected ? 'Ver configuración' : 'Configurar conexión' }}<ArrowRight :size="17" /></RouterLink></div>
    <div class="rounded-2xl border border-on-brand/15 bg-on-brand/5 p-5 md:ml-4"><div class="mb-5 flex items-center gap-3"><span class="rounded-xl bg-on-brand/10 p-2.5"><Database :size="22" class="text-brand-highlight" /></span><div><p class="text-sm font-medium">Tu espacio de datos</p><p class="mt-1 text-xs text-on-brand/50">PostgreSQL · Neon</p></div></div><div class="flex items-center justify-between border-t border-on-brand/10 pt-4 text-sm"><span class="text-on-brand/60">Estado de conexión</span><span class="flex items-center gap-2 text-xs"><span class="h-2 w-2 rounded-full" :class="connection.connected ? 'bg-lime-soft' : 'bg-amber-300'" />{{ connection.connected ? 'Verificada' : 'Por configurar' }}</span></div><div class="mt-3 flex items-center justify-between text-sm"><span class="text-on-brand/60">Moneda</span><span class="text-xs">Dólar estadounidense</span></div></div></div>
  </section>

  <section aria-labelledby="first-steps"><div class="mb-4 flex items-center justify-between"><h2 id="first-steps" class="text-lg font-semibold tracking-tight">Tus primeros pasos</h2><span class="text-xs text-slate-400">{{ steps.filter(step => step.done).length }} de 3 completados</span></div><div class="grid gap-4 xl:grid-cols-3"><article v-for="step in steps" :key="step.number" class="card flex flex-col p-6"><div class="mb-5 flex items-center justify-between"><span class="grid h-10 w-10 place-items-center rounded-xl text-sm font-semibold" :class="step.done ? 'bg-brand-100 text-brand-600' : 'bg-slate-100 text-slate-400'"><Check v-if="step.done" :size="20" /><template v-else>{{ step.number }}</template></span><span v-if="step.done" class="text-xs text-brand-600">Completado</span></div><h3 class="font-semibold">{{ step.title }}</h3><p class="mb-5 mt-2 text-sm leading-6 text-slate-500">{{ step.description }}</p><RouterLink :to="step.to" class="mt-auto flex items-center justify-between rounded-lg text-sm font-semibold text-brand-600">{{ step.label }}<ArrowRight :size="17" /></RouterLink></article></div></section>

  <section class="mt-8" aria-labelledby="workspace-modules"><div class="mb-4 flex flex-wrap items-center justify-between gap-2"><h2 id="workspace-modules" class="text-lg font-semibold tracking-tight">Una gestión más sencilla</h2><span class="text-xs text-slate-400">Módulos de las próximas entregas</span></div><div class="card divide-y divide-slate-100"><RouterLink v-for="module in modules" :key="module.to" :to="module.to" class="flex items-center gap-4 px-5 py-5 hover:bg-brand-50/40"><span class="rounded-xl bg-brand-50 p-3 text-brand-600"><component :is="module.icon" :size="20" :stroke-width="1.7" /></span><div class="min-w-0 flex-1"><h3 class="text-sm font-semibold">{{ module.title }}</h3><p class="mt-1 text-xs leading-5 text-slate-500">{{ module.description }}</p></div><span class="hidden rounded-full bg-slate-100 px-3 py-1 text-[11px] text-slate-500 sm:inline">{{ module.block }}</span><ArrowRight :size="17" class="shrink-0 text-slate-300" /></RouterLink></div></section>
  <div class="mt-6 flex items-start gap-3 rounded-xl bg-brand-50 px-5 py-4 text-xs leading-5 text-brand-600"><ShieldCheck :size="19" class="shrink-0" /><p>Este espacio está preparado para uso local o interno de confianza. Revisa las indicaciones de conexión antes de cargar información de tu equipo.</p></div>
</template>
````

## src/components/common/AppSidebar.vue

````vue
<script setup>
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import { LayoutDashboard, UsersRound, FilePlus2, History, ChartNoAxesCombined, Settings2, ArrowUpRight, X } from '@lucide/vue'
import { useConexionStore } from '../../stores/conexion.js'
import { useConfiguracionStore } from '../../stores/configuracion.js'
defineProps({ mobile: Boolean })
defineEmits(['close'])
const connection = useConexionStore()
const settings = useConfiguracionStore()
const companyName = computed(() => settings.empresa?.nombre || connection.company)
const companyLogo = computed(() => settings.empresa?.logo_data_url || '')
const initials = computed(() => companyName.value.split(/\s+/).filter(Boolean).slice(0, 2).map(word => word[0]).join('').toUpperCase())
const links = [
  { to: '/', label: 'Resumen', icon: LayoutDashboard },
  { to: '/empleados', label: 'Empleados', icon: UsersRound },
  { to: '/roles/nuevo', label: 'Generar roles', icon: FilePlus2 },
  { to: '/historial', label: 'Historial', icon: History },
  { to: '/reportes', label: 'Reportes', icon: ChartNoAxesCombined },
]
</script>

<template>
  <aside class="flex h-full flex-col overflow-y-auto bg-brand-900 px-5 py-7 text-on-brand">
    <div class="relative mb-8 px-2">
      <RouterLink to="/" class="flex min-w-0 flex-col items-start gap-3 rounded-lg" :class="mobile ? 'pr-7' : ''" :aria-label="companyName + ', ir al inicio'" @click="$emit('close')">
        <span v-if="companyLogo" class="flex h-20 w-full items-center justify-center rounded-xl bg-white p-2"><img :src="companyLogo" :alt="'Logo de ' + companyName" class="max-h-full max-w-full object-contain" /></span>
        <span v-else class="grid h-12 w-12 place-items-center rounded-xl bg-lime-soft text-xl font-bold text-on-accent" aria-hidden="true">{{ initials }}</span>
        <div class="w-full min-w-0"><p class="break-words text-lg font-semibold leading-snug tracking-tight">{{ companyName }}</p><p class="mt-1 text-[10px] uppercase tracking-[0.18em] text-on-brand/50">Roles de pago · Ecuador</p></div>
      </RouterLink>
      <button v-if="mobile" class="absolute -right-1 top-0 rounded-lg p-2" aria-label="Cerrar menú" @click="$emit('close')"><X :size="20" /></button>
    </div>
    <p class="mb-4 px-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-on-brand/40">Espacio de trabajo</p>
    <nav aria-label="Navegación principal" class="space-y-1.5">
      <RouterLink v-for="link in links" :key="link.to" :to="link.to" custom v-slot="{ href, navigate, isExactActive }">
        <a :href="href" :aria-current="isExactActive ? 'page' : undefined" class="flex min-h-12 items-center gap-3 rounded-xl px-3 text-sm transition-colors" :class="isExactActive ? 'bg-on-brand/12 font-semibold text-brand-highlight' : 'text-on-brand/70 hover:bg-on-brand/5 hover:text-on-brand'" @click="navigate($event); $emit('close')">
          <component :is="link.icon" :size="19" :stroke-width="1.7" /><span>{{ link.label }}</span><span v-if="isExactActive" class="ml-auto h-1.5 w-1.5 rounded-full bg-lime-soft" />
        </a>
      </RouterLink>
    </nav>
    <div class="mt-6 border-t border-on-brand/10 pt-5">
      <RouterLink to="/configuracion" class="flex min-h-12 items-center gap-3 rounded-xl px-3 text-sm text-on-brand/70 hover:bg-on-brand/5" active-class="!bg-on-brand/12 !text-brand-highlight" @click="$emit('close')"><Settings2 :size="19" :stroke-width="1.7" />Configuración</RouterLink>
    </div>
    <div class="mt-auto pt-10">
      <div class="rounded-xl border border-on-brand/10 bg-on-brand/5 p-4">
        <div class="mb-2 flex items-center justify-between"><span class="text-xs font-medium text-brand-highlight">Tu empresa, en orden</span><ArrowUpRight :size="15" class="text-on-brand/50" /></div>
        <p class="text-xs leading-relaxed text-on-brand/55">Empleados, pagos y reportes en un mismo lugar.</p>
      </div>
      <div class="mt-5 flex items-center gap-3 px-2">
        <span class="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-on-brand/10 text-xs font-semibold">EC</span>
        <div class="min-w-0"><p class="truncate text-sm font-medium" :title="companyName">{{ companyName }}</p><p class="mt-0.5 text-[11px] text-on-brand/45">Ecuador · USD</p></div>
      </div>
    </div>
  </aside>
</template>
````

## src/components/common/AppHeader.vue

````vue
<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { Menu, CircleHelp } from '@lucide/vue'
import { useConexionStore } from '../../stores/conexion.js'
defineEmits(['open-menu'])
const route = useRoute()
const connection = useConexionStore()
const label = computed(() => ({ conectado: 'Neon conectado', verificando: 'Verificando conexión', pendiente: 'Conexión por verificar', error: 'Revisar conexión', 'sin-configurar': 'Sin conexión configurada' })[connection.state])
</script>

<template>
  <header class="flex min-h-20 items-center justify-between gap-3 border-b border-slate-200/80 bg-white/80 px-5 md:px-9">
    <div class="flex min-w-0 items-center gap-3"><button class="rounded-lg p-2 lg:hidden" aria-label="Abrir menú" @click="$emit('open-menu')"><Menu :size="22" /></button><span class="hidden max-w-48 truncate text-sm text-slate-400 sm:inline" :title="connection.company">{{ connection.company }}</span><span class="hidden text-slate-300 sm:inline">/</span><span class="truncate text-sm font-medium">{{ route.meta.title }}</span></div>
    <div class="flex shrink-0 items-center gap-4"><RouterLink to="/configuracion" class="flex items-center gap-2 rounded-lg text-xs text-slate-500"><span class="h-2 w-2 rounded-full" :class="connection.connected ? 'bg-emerald-500' : 'bg-amber-400'" /><span class="hidden sm:inline">{{ label }}</span><span class="sr-only sm:hidden">{{ label }}</span></RouterLink><RouterLink to="/configuracion" class="rounded-full border border-slate-200 p-2 text-slate-400 hover:text-brand-900" aria-label="Ayuda de configuración"><CircleHelp :size="18" /></RouterLink></div>
  </header>
</template>
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
  <a href="#main-content" class="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-white focus:p-4">Saltar al contenido</a>
  <div class="fixed inset-y-0 left-0 hidden w-64 lg:block"><AppSidebar /></div>
  <AppModal v-model="menuOpen" title="Menú de navegación" :sidebar="true"><AppSidebar mobile @close="menuOpen = false" /></AppModal>
  <div class="min-h-screen lg:ml-64">
    <AppHeader @open-menu="menuOpen = true" />
    <main id="main-content" tabindex="-1" class="mx-auto max-w-[1440px] px-5 py-7 outline-none md:px-9 md:py-9"><RouterView /></main>
    <footer class="mx-auto flex max-w-[1440px] flex-wrap justify-between gap-2 px-5 pb-6 text-[11px] text-slate-400 md:px-9"><span>Nómina · Gestión de roles de pago</span><span>Ecuador · Uso local / interno</span></footer>
  </div>
</template>
````

## migrations/002_colores_empresa.sql

````sql
-- Ampliación compatible: conserva los datos y el logo de la empresa.
ALTER TABLE public.empresa
  ADD COLUMN IF NOT EXISTS color_primario VARCHAR(7) NOT NULL DEFAULT '#173d35'
    CHECK (color_primario ~ '^#[0-9A-Fa-f]{6}$'),
  ADD COLUMN IF NOT EXISTS color_acento VARCHAR(7) NOT NULL DEFAULT '#d5eb8b'
    CHECK (color_acento ~ '^#[0-9A-Fa-f]{6}$');
````

## scripts/migrate-theme.mjs

````javascript
import { readFile } from 'node:fs/promises'
import { loadEnv } from 'vite'
import { neon } from '@neondatabase/serverless'
const env = loadEnv('development', process.cwd(), 'VITE_')
try {
  if (!env.VITE_DATABASE_URL) throw new Error('CONFIG_REQUIRED')
  const sql = neon(env.VITE_DATABASE_URL)
  await sql.query(await readFile(new URL('../migrations/002_colores_empresa.sql', import.meta.url), 'utf8'), [], { fetchOptions: { signal: AbortSignal.timeout(15000) } })
  console.log('Columnas de colores disponibles. Datos existentes conservados.')
} catch (error) {
  const code = String(error.code || '')
  console.error(code === '42501' ? 'Faltan permisos. Ejecuta migrations/002_colores_empresa.sql con el propietario en Neon.' : 'No se pudo aplicar la migración. Comprueba la conexión y los permisos; también puedes ejecutar migrations/002_colores_empresa.sql en Neon.')
  process.exitCode = 1
}
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
    connection.verify = () => new Promise(resolve => { release = resolve })
    configuracionRepository.load = async () => {
      reads++
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

## tests/tema.test.js

````javascript
import test from 'node:test'
import assert from 'node:assert/strict'
import { foreground, contrast, themeVariables, defaultTheme } from '../src/utils/tema.js'
import { normalizeConfiguration, validateConfiguration } from '../src/utils/configuracion.js'

test('colores claros y oscuros eligen texto con contraste legible', () => {
  for (const color of ['#ffffff', '#000000', '#173d35', '#ff0000', '#00ff00', '#777777', '#123b73']) {
    assert.ok(contrast(color, foreground(color)) >= 4.5)
    const vars = themeVariables({ color_primario: color, color_acento: color })
    assert.ok(contrast(color, vars['--color-brand-highlight']) >= 4.5)
  }
})

test('rechaza valores CSS arbitrarios y conserva ambos colores al normalizar', () => {
  const company = { nombre: 'Prueba', color_primario: '#123b73', color_acento: '#7dd3fc' }
  assert.equal(normalizeConfiguration(company, {}).empresa.color_primario, '#123b73')
  assert.equal(normalizeConfiguration(company, {}).empresa.color_acento, '#7dd3fc')
  assert.ok(validateConfiguration({ ...company, color_primario: 'url(https://example.com)' }, {}).color_primario)
  assert.ok(validateConfiguration({ ...company, color_acento: '' }, {}).color_acento)
  assert.equal(themeVariables({ color_primario: 'invalid' })['--color-brand-900'], defaultTheme.color_primario)
})
````
