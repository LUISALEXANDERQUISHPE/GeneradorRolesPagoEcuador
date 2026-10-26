# Entrega 01 · Código completo

Base Vue/Vite, Neon, esquema SQL y componentes compartidos. Los módulos de empleados y nómina se implementarán en las siguientes entregas. Instrucciones de instalación y seguridad: README.md, en la raíz.

Cada bloque reproduce el archivo íntegro. package-lock.json está incluido en el proyecto y no se reproduce aquí por ser generado por npm.

## Archivos incluidos

- .env.example
- .gitignore
- package.json
- index.html
- vite.config.js
- schema.sql
- public/favicon.svg
- src/App.vue
- src/assets/main.css
- src/components/common/AppHeader.vue
- src/components/common/AppModal.vue
- src/components/common/AppSidebar.vue
- src/components/common/ConfirmDialog.vue
- src/components/common/DataTable.vue
- src/components/common/FormField.vue
- src/components/common/PaginationControls.vue
- src/components/common/StatCard.vue
- src/components/common/ToastContainer.vue
- src/composables/useConfirm.js
- src/composables/usePagination.js
- src/db/client.js
- src/layouts/AppLayout.vue
- src/main.js
- src/router/index.js
- src/stores/conexion.js
- src/stores/notificaciones.js
- src/views/ConfiguracionView.vue
- src/views/DashboardView.vue
- src/views/ModuloPendienteView.vue
- src/views/NotFoundView.vue
- tests/client.test.js

## .env.example

````text
# EJEMPLO: sustituye usuario, contraseña, endpoint y base en tu archivo .env.
# Las variables VITE_* se exponen al navegador. Uso local/interno de confianza.
VITE_DATABASE_URL=postgresql://USUARIO:CONTRASENA@ep-ejemplo.us-east-2.aws.neon.tech/neondb?sslmode=require
````

## .gitignore

````text
node_modules/
dist/
.env
.env.*
!.env.example
*.local
*.log
.DS_Store
.vscode/
coverage/
````

## package.json

````json
{
  "name": "roles-de-pago-ecuador",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "engines": {
    "node": ">=22.12.0"
  },
  "scripts": {
    "dev": "vite --host 127.0.0.1",
    "build": "vite build",
    "preview": "vite preview --host 127.0.0.1",
    "test": "node --test tests/*.test.js"
  },
  "dependencies": {
    "@neondatabase/serverless": "^1.0.0",
    "jspdf": "^4.0.0",
    "jspdf-autotable": "^5.0.2",
    "pinia": "^3.0.3",
    "vue": "^3.5.22",
    "vue-router": "^4.6.0",
    "xlsx": "https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz",
    "@lucide/vue": "^1.61.0"
  },
  "devDependencies": {
    "@tailwindcss/vite": "^4.1.13",
    "@vitejs/plugin-vue": "^6.0.1",
    "tailwindcss": "^4.1.13",
    "vite": "^7.1.7"
  }
}
````

## index.html

````html
<!doctype html>
<html lang="es">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="theme-color" content="#173d35" />
    <meta name="description" content="Gestión de empleados y roles de pago para pequeñas empresas en Ecuador." />
    <title>Nómina · Roles de pago</title>
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="/src/main.js"></script>
  </body>
</html>
````

## vite.config.js

````javascript
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [vue(), tailwindcss()],
  server: { host: '127.0.0.1', port: 5173, strictPort: true },
  preview: { host: '127.0.0.1', port: 4173, strictPort: true },
})
````

## schema.sql

````sql
BEGIN;

CREATE TABLE IF NOT EXISTS empresa (
    id SMALLINT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
    nombre VARCHAR(180) NOT NULL CHECK (length(btrim(nombre)) > 0),
    ruc VARCHAR(13) CHECK (ruc IS NULL OR ruc ~ '^[0-9]{13}$'),
    direccion TEXT,
    telefono VARCHAR(30),
    correo VARCHAR(180),
    -- Imagen PNG/JPEG en formato data URL.
    logo_data_url TEXT,
    representante VARCHAR(180),
    creado_en TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    actualizado_en TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS parametros (
    id SMALLINT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
    empresa_id SMALLINT NOT NULL UNIQUE DEFAULT 1 REFERENCES empresa(id) ON DELETE RESTRICT,
    -- Debe configurarse antes de generar roles.
    sbu NUMERIC(12,2) CHECK (sbu IS NULL OR sbu > 0),
    aporte_personal_pct NUMERIC(7,4) NOT NULL DEFAULT 9.45 CHECK (aporte_personal_pct BETWEEN 0 AND 100),
    aporte_patronal_pct NUMERIC(7,4) NOT NULL DEFAULT 11.15 CHECK (aporte_patronal_pct BETWEEN 0 AND 100),
    fondos_reserva_pct NUMERIC(7,4) NOT NULL DEFAULT 8.33 CHECK (fondos_reserva_pct BETWEEN 0 AND 100),
    -- 25% solicitado; revisar legalmente antes de usar en nómina real.
    recargo_suplementarias_pct NUMERIC(7,4) NOT NULL DEFAULT 25 CHECK (recargo_suplementarias_pct BETWEEN 0 AND 1000),
    recargo_extraordinarias_pct NUMERIC(7,4) NOT NULL DEFAULT 100 CHECK (recargo_extraordinarias_pct BETWEEN 0 AND 1000),
    dias_base_mes SMALLINT NOT NULL DEFAULT 30 CHECK (dias_base_mes BETWEEN 1 AND 31),
    horas_jornada NUMERIC(4,2) NOT NULL DEFAULT 8 CHECK (horas_jornada > 0 AND horas_jornada <= 24),
    actualizado_en TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS empleados (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id SMALLINT NOT NULL DEFAULT 1 REFERENCES empresa(id) ON DELETE RESTRICT,
    -- La aplicación complementa el formato con el algoritmo módulo 10.
    cedula VARCHAR(10) NOT NULL UNIQUE CHECK (cedula ~ '^[0-9]{10}$'),
    nombres VARCHAR(120) NOT NULL CHECK (length(btrim(nombres)) > 0),
    apellidos VARCHAR(120) NOT NULL CHECK (length(btrim(apellidos)) > 0),
    cargo VARCHAR(120) NOT NULL CHECK (length(btrim(cargo)) > 0),
    departamento VARCHAR(120) NOT NULL CHECK (length(btrim(departamento)) > 0),
    fecha_ingreso DATE NOT NULL,
    fecha_salida DATE,
    sueldo_base NUMERIC(12,2) NOT NULL CHECK (sueldo_base > 0),
    numero_cuenta VARCHAR(40),
    estado VARCHAR(10) NOT NULL DEFAULT 'activo' CHECK (estado IN ('activo', 'inactivo')),
    -- FALSE significa acumulación en IESS cuando cumple la antigüedad.
    recibe_fondos_reserva BOOLEAN NOT NULL DEFAULT TRUE,
    decimo_tercero_modalidad VARCHAR(12) NOT NULL DEFAULT 'mensualizar' CHECK (decimo_tercero_modalidad IN ('mensualizar', 'acumular')),
    decimo_cuarto_modalidad VARCHAR(12) NOT NULL DEFAULT 'mensualizar' CHECK (decimo_cuarto_modalidad IN ('mensualizar', 'acumular')),
    creado_en TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    actualizado_en TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CHECK (fecha_salida IS NULL OR fecha_salida >= fecha_ingreso)
);

CREATE TABLE IF NOT EXISTS roles_pago (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empleado_id UUID NOT NULL REFERENCES empleados(id) ON DELETE RESTRICT,
    -- Primer día del mes; mes y año se derivan sin redundancia.
    periodo DATE NOT NULL CHECK (EXTRACT(DAY FROM periodo) = 1),
    estado VARCHAR(10) NOT NULL DEFAULT 'emitido' CHECK (estado IN ('emitido', 'anulado')),
    version INTEGER NOT NULL DEFAULT 1 CHECK (version >= 1),
    dias_trabajados NUMERIC(5,2) NOT NULL CHECK (dias_trabajados BETWEEN 0 AND 31),
    horas_suplementarias NUMERIC(7,2) NOT NULL DEFAULT 0 CHECK (horas_suplementarias >= 0),
    horas_extraordinarias NUMERIC(7,2) NOT NULL DEFAULT 0 CHECK (horas_extraordinarias >= 0),
    comisiones NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (comisiones >= 0),
    bonos NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (bonos >= 0),
    anticipos NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (anticipos >= 0),
    prestamos_iess NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (prestamos_iess >= 0),
    prestamos_quirografarios NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (prestamos_quirografarios >= 0),
    base_aportacion NUMERIC(14,2) NOT NULL CHECK (base_aportacion >= 0),
    total_ingresos NUMERIC(14,2) NOT NULL CHECK (total_ingresos >= 0),
    total_egresos NUMERIC(14,2) NOT NULL CHECK (total_egresos >= 0),
    neto_recibir NUMERIC(14,2) GENERATED ALWAYS AS (total_ingresos - total_egresos) STORED,
    aporte_personal NUMERIC(14,2) NOT NULL CHECK (aporte_personal >= 0),
    aporte_patronal NUMERIC(14,2) NOT NULL CHECK (aporte_patronal >= 0),
    decimo_tercero_acumulado NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (decimo_tercero_acumulado >= 0),
    decimo_cuarto_acumulado NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (decimo_cuarto_acumulado >= 0),
    fondos_reserva_acumulados NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (fondos_reserva_acumulados >= 0),
    empleado_snapshot JSONB NOT NULL CHECK (jsonb_typeof(empleado_snapshot) = 'object'),
    empresa_snapshot JSONB NOT NULL CHECK (jsonb_typeof(empresa_snapshot) = 'object'),
    parametros_snapshot JSONB NOT NULL CHECK (jsonb_typeof(parametros_snapshot) = 'object'),
    observaciones TEXT,
    motivo_anulacion TEXT,
    anulado_en TIMESTAMPTZ,
    creado_en TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    actualizado_en TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_rol_empleado_periodo UNIQUE (empleado_id, periodo),
    CONSTRAINT ck_rol_anulacion CHECK (
        (estado = 'emitido' AND anulado_en IS NULL AND motivo_anulacion IS NULL)
        OR
        (estado = 'anulado' AND anulado_en IS NOT NULL
            AND motivo_anulacion IS NOT NULL AND length(btrim(motivo_anulacion)) > 0)
    )
);

CREATE TABLE IF NOT EXISTS roles_pago_detalle (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rol_id UUID NOT NULL REFERENCES roles_pago(id) ON DELETE CASCADE,
    tipo VARCHAR(12) NOT NULL CHECK (tipo IN ('ingreso', 'egreso', 'informativo')),
    codigo VARCHAR(60) NOT NULL CHECK (length(btrim(codigo)) > 0),
    descripcion VARCHAR(250) NOT NULL CHECK (length(btrim(descripcion)) > 0),
    cantidad NUMERIC(12,4) CHECK (cantidad IS NULL OR cantidad >= 0),
    base_calculo NUMERIC(14,4) CHECK (base_calculo IS NULL OR base_calculo >= 0),
    porcentaje NUMERIC(9,4) CHECK (porcentaje IS NULL OR porcentaje >= 0),
    monto NUMERIC(14,2) NOT NULL CHECK (monto >= 0),
    orden SMALLINT NOT NULL DEFAULT 0 CHECK (orden >= 0),
    CONSTRAINT uq_rol_detalle_codigo UNIQUE (rol_id, codigo)
);

CREATE INDEX IF NOT EXISTS idx_empleados_estado_departamento ON empleados (estado, departamento);
CREATE INDEX IF NOT EXISTS idx_empleados_apellidos_nombres ON empleados (apellidos, nombres);
CREATE INDEX IF NOT EXISTS idx_roles_periodo_estado ON roles_pago (periodo DESC, estado);
CREATE INDEX IF NOT EXISTS idx_roles_detalle_orden ON roles_pago_detalle (rol_id, orden);

CREATE OR REPLACE FUNCTION actualizar_fecha_modificacion()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.actualizado_en := CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_empresa_actualizada ON empresa;
CREATE TRIGGER trg_empresa_actualizada BEFORE UPDATE ON empresa FOR EACH ROW EXECUTE FUNCTION actualizar_fecha_modificacion();
DROP TRIGGER IF EXISTS trg_parametros_actualizados ON parametros;
CREATE TRIGGER trg_parametros_actualizados BEFORE UPDATE ON parametros FOR EACH ROW EXECUTE FUNCTION actualizar_fecha_modificacion();
DROP TRIGGER IF EXISTS trg_empleados_actualizados ON empleados;
CREATE TRIGGER trg_empleados_actualizados BEFORE UPDATE ON empleados FOR EACH ROW EXECUTE FUNCTION actualizar_fecha_modificacion();
DROP TRIGGER IF EXISTS trg_roles_actualizados ON roles_pago;
CREATE TRIGGER trg_roles_actualizados BEFORE UPDATE ON roles_pago FOR EACH ROW EXECUTE FUNCTION actualizar_fecha_modificacion();

INSERT INTO empresa (id, nombre) VALUES (1, 'Mi empresa') ON CONFLICT (id) DO NOTHING;
INSERT INTO parametros (id, empresa_id) VALUES (1, 1) ON CONFLICT (id) DO NOTHING;

COMMIT;
````

## public/favicon.svg

````xml
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><rect width="48" height="48" rx="14" fill="#173d35"/><path d="M14 34V14h5l10 13V14h5v20h-5L19 21v13Z" fill="#d5eb8b"/></svg>
````

## src/App.vue

````vue
<script setup>
import { RouterView } from 'vue-router'
import ToastContainer from './components/common/ToastContainer.vue'
import ConfirmDialog from './components/common/ConfirmDialog.vue'
</script>

<template>
  <RouterView />
  <ToastContainer />
  <ConfirmDialog />
</template>
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
}

@layer base {
  body { @apply m-0 bg-[#f6f7f4] font-sans text-slate-800 antialiased; }
  button, a, input, select, textarea { @apply outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2; }
  button:not(:disabled), select { cursor: pointer; }
  button:disabled { cursor: not-allowed; }
  ::selection { background: #d5eb8b; color: #173d35; }
}

@layer components {
  .btn { @apply inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors disabled:opacity-50; }
  .btn-primary { @apply bg-brand-900 text-white hover:bg-brand-700; }
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
    <div class="flex min-w-0 items-center gap-3"><button class="rounded-lg p-2 lg:hidden" aria-label="Abrir menú" @click="$emit('open-menu')"><Menu :size="22" /></button><span class="hidden text-sm text-slate-400 sm:inline">Mi espacio</span><span class="hidden text-slate-300 sm:inline">/</span><span class="truncate text-sm font-medium">{{ route.meta.title }}</span></div>
    <div class="flex shrink-0 items-center gap-4"><RouterLink to="/configuracion" class="flex items-center gap-2 rounded-lg text-xs text-slate-500"><span class="h-2 w-2 rounded-full" :class="connection.connected ? 'bg-emerald-500' : 'bg-amber-400'" /><span class="hidden sm:inline">{{ label }}</span><span class="sr-only sm:hidden">{{ label }}</span></RouterLink><RouterLink to="/configuracion" class="rounded-full border border-slate-200 p-2 text-slate-400 hover:text-brand-900" aria-label="Ayuda de configuración"><CircleHelp :size="18" /></RouterLink></div>
  </header>
</template>
````

## src/components/common/AppModal.vue

````vue
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
````

## src/components/common/AppSidebar.vue

````vue
<script setup>
import { RouterLink } from 'vue-router'
import { LayoutDashboard, UsersRound, FilePlus2, History, ChartNoAxesCombined, Settings2, ArrowUpRight, X } from '@lucide/vue'
import { useConexionStore } from '../../stores/conexion.js'
defineProps({ mobile: Boolean })
defineEmits(['close'])
const connection = useConexionStore()
const links = [
  { to: '/', label: 'Resumen', icon: LayoutDashboard },
  { to: '/empleados', label: 'Empleados', icon: UsersRound },
  { to: '/roles/nuevo', label: 'Generar roles', icon: FilePlus2 },
  { to: '/historial', label: 'Historial', icon: History },
  { to: '/reportes', label: 'Reportes', icon: ChartNoAxesCombined },
]
</script>

<template>
  <aside class="flex h-full flex-col bg-brand-900 px-5 py-7 text-white">
    <div class="mb-10 flex items-center justify-between px-2">
      <RouterLink to="/" class="flex items-center gap-3 rounded-lg" aria-label="Nómina, ir al inicio" @click="$emit('close')">
        <span class="grid h-10 w-10 place-items-center rounded-xl bg-lime-soft text-2xl font-bold text-brand-900">N</span>
        <div><span class="text-2xl font-semibold tracking-tight">nómina<span class="text-lime-soft">.</span></span><p class="mt-0.5 text-[10px] uppercase tracking-[0.22em] text-white/50">Hecho para tu equipo</p></div>
      </RouterLink>
      <button v-if="mobile" class="rounded-lg p-2" aria-label="Cerrar menú" @click="$emit('close')"><X :size="20" /></button>
    </div>
    <p class="mb-4 px-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-white/40">Espacio de trabajo</p>
    <nav aria-label="Navegación principal" class="space-y-1.5">
      <RouterLink v-for="link in links" :key="link.to" :to="link.to" custom v-slot="{ href, navigate, isExactActive }">
        <a :href="href" :aria-current="isExactActive ? 'page' : undefined" class="flex min-h-12 items-center gap-3 rounded-xl px-3 text-sm transition-colors" :class="isExactActive ? 'bg-white/12 font-semibold text-lime-soft' : 'text-white/70 hover:bg-white/5 hover:text-white'" @click="navigate($event); $emit('close')">
          <component :is="link.icon" :size="19" :stroke-width="1.7" /><span>{{ link.label }}</span><span v-if="isExactActive" class="ml-auto h-1.5 w-1.5 rounded-full bg-lime-soft" />
        </a>
      </RouterLink>
    </nav>
    <div class="mt-6 border-t border-white/10 pt-5">
      <RouterLink to="/configuracion" class="flex min-h-12 items-center gap-3 rounded-xl px-3 text-sm text-white/70 hover:bg-white/5" active-class="!bg-white/12 !text-lime-soft" @click="$emit('close')"><Settings2 :size="19" :stroke-width="1.7" />Configuración</RouterLink>
    </div>
    <div class="mt-auto pt-10">
      <div class="rounded-xl border border-white/10 bg-white/5 p-4">
        <div class="mb-2 flex items-center justify-between"><span class="text-xs font-medium text-lime-soft">Tu empresa, en orden</span><ArrowUpRight :size="15" class="text-white/50" /></div>
        <p class="text-xs leading-relaxed text-white/55">Empleados, pagos y reportes en un mismo lugar.</p>
      </div>
      <div class="mt-5 flex items-center gap-3 px-2">
        <span class="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white/10 text-xs font-semibold">EC</span>
        <div class="min-w-0"><p class="truncate text-sm font-medium">{{ connection.company }}</p><p class="mt-0.5 text-[11px] text-white/45">Ecuador · USD</p></div>
      </div>
    </div>
  </aside>
</template>
````

## src/components/common/ConfirmDialog.vue

````vue
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
````

## src/components/common/DataTable.vue

````vue
<script setup>
import { Inbox, LoaderCircle } from '@lucide/vue'
import PaginationControls from './PaginationControls.vue'
defineProps({ columns: { type: Array, required: true }, rows: { type: Array, default: () => [] }, rowKey: { type: String, default: 'id' }, caption: { type: String, default: 'Listado de registros' }, loading: Boolean, error: String, emptyMessage: { type: String, default: 'No hay registros para mostrar.' }, page: { type: Number, default: 1 }, pageSize: { type: Number, default: 10 }, total: { type: Number, default: 0 } })
defineEmits(['update:page', 'update:pageSize'])
</script>

<template>
  <div class="card overflow-hidden" :aria-busy="loading">
    <div class="overflow-x-auto"><table class="w-full text-left text-sm"><caption class="sr-only">{{ caption }}</caption><thead class="border-b border-slate-100 bg-slate-50/70"><tr><th v-for="column in columns" :key="column.key" scope="col" class="whitespace-nowrap px-5 py-4 text-xs font-semibold text-slate-500" :class="column.align === 'right' ? 'text-right' : ''">{{ column.label }}</th></tr></thead><tbody class="divide-y divide-slate-100">
      <tr v-if="loading"><td :colspan="columns.length" class="p-12 text-center text-slate-500"><LoaderCircle :size="24" class="mx-auto mb-3 animate-spin" />Cargando registros…</td></tr>
      <tr v-else-if="error"><td :colspan="columns.length" class="p-10 text-center text-red-700" role="alert">{{ error }}</td></tr>
      <tr v-else-if="rows.length === 0"><td :colspan="columns.length" class="p-12 text-center text-slate-500"><Inbox :size="30" class="mx-auto mb-3 text-slate-300" />{{ emptyMessage }}<slot name="empty-action" /></td></tr>
      <template v-else><tr v-for="row in rows" :key="row[rowKey]" class="hover:bg-brand-50/40"><td v-for="column in columns" :key="column.key" class="px-5 py-4" :class="column.align === 'right' ? 'text-right tabular-nums' : ''"><slot :name="'cell-' + column.key" :row="row" :value="row[column.key]">{{ row[column.key] ?? '—' }}</slot></td></tr></template>
    </tbody></table></div>
    <PaginationControls v-if="!loading && !error && total > 0" :page="page" :page-size="pageSize" :total="total" @update:page="$emit('update:page', $event)" @update:page-size="$emit('update:pageSize', $event)" />
  </div>
</template>
````

## src/components/common/FormField.vue

````vue
<script setup>
import { useId } from 'vue'
const props = defineProps({ label: { type: String, required: true }, id: String, error: String, hint: String, required: Boolean })
const generatedId = useId()
</script>

<template>
  <div><label :for="props.id || generatedId" class="mb-1.5 block text-sm font-medium text-slate-700">{{ label }}<span v-if="required" class="ml-1 text-red-600" aria-hidden="true">*</span></label><slot :id="props.id || generatedId" :describedby="error || hint ? (props.id || generatedId) + '-description' : undefined" :invalid="Boolean(error)" /><p v-if="error || hint" :id="(props.id || generatedId) + '-description'" class="mt-1.5 text-xs" :class="error ? 'text-red-700' : 'text-slate-500'" :role="error ? 'alert' : undefined">{{ error || hint }}</p></div>
</template>
````

## src/components/common/PaginationControls.vue

````vue
<script setup>
import { computed } from 'vue'
import { ChevronLeft, ChevronRight } from '@lucide/vue'
const props = defineProps({ page: { type: Number, default: 1 }, pageSize: { type: Number, default: 10 }, total: { type: Number, default: 0 } })
defineEmits(['update:page', 'update:pageSize'])
const pages = computed(() => Math.max(1, Math.ceil(props.total / props.pageSize)))
const start = computed(() => props.total ? (props.page - 1) * props.pageSize + 1 : 0)
const end = computed(() => Math.min(props.page * props.pageSize, props.total))
</script>

<template>
  <nav aria-label="Paginación de la tabla" class="flex flex-wrap items-center justify-between gap-4 border-t border-slate-100 px-5 py-4 text-xs text-slate-500">
    <p aria-live="polite">{{ start }}–{{ end }} de {{ total }} registros</p>
    <div class="flex flex-wrap items-center gap-3"><label class="flex items-center gap-2">Por página<select class="rounded-lg border border-slate-200 bg-white p-2" :value="pageSize" @change="$emit('update:pageSize', Number($event.target.value))"><option :value="10">10</option><option :value="25">25</option><option :value="50">50</option></select></label><button class="rounded-lg border border-slate-200 p-2 disabled:opacity-30" :disabled="page <= 1" aria-label="Página anterior" @click="$emit('update:page', page - 1)"><ChevronLeft :size="17" /></button><span>{{ page }} / {{ pages }}</span><button class="rounded-lg border border-slate-200 p-2 disabled:opacity-30" :disabled="page >= pages" aria-label="Página siguiente" @click="$emit('update:page', page + 1)"><ChevronRight :size="17" /></button></div>
  </nav>
</template>
````

## src/components/common/StatCard.vue

````vue
<script setup>
defineProps({ label: { type: String, required: true }, value: { type: [String, Number], default: '—' }, description: String, icon: [Object, Function], loading: Boolean })
</script>

<template>
  <article class="card p-5"><div class="flex items-center justify-between gap-3"><h2 class="text-sm text-slate-500">{{ label }}</h2><span v-if="icon" class="rounded-xl bg-brand-50 p-2.5 text-brand-600"><component :is="icon" :size="19" /></span></div><p class="mt-4 text-3xl font-semibold tracking-tight tabular-nums" :aria-busy="loading">{{ loading ? '…' : value }}</p><p v-if="description" class="mt-2 text-xs leading-relaxed text-slate-400">{{ description }}</p></article>
</template>
````

## src/components/common/ToastContainer.vue

````vue
<script setup>
import { CheckCircle2, AlertCircle, X } from '@lucide/vue'
import { useNotificacionesStore } from '../../stores/notificaciones.js'
const notifications = useNotificacionesStore()
</script>

<template>
  <div class="pointer-events-none fixed bottom-5 right-5 z-50 flex w-[calc(100%-2.5rem)] max-w-sm flex-col gap-3" aria-label="Notificaciones">
    <div v-for="item in notifications.items" :key="item.id" :role="item.type === 'error' ? 'alert' : 'status'" class="pointer-events-auto flex items-start gap-3 rounded-xl border bg-white p-4 shadow-lg" :class="item.type === 'error' ? 'border-red-200' : 'border-emerald-200'">
      <component :is="item.type === 'error' ? AlertCircle : CheckCircle2" :size="20" class="mt-0.5 shrink-0" :class="item.type === 'error' ? 'text-red-600' : 'text-emerald-600'" /><p class="flex-1 text-sm leading-relaxed">{{ item.message }}</p><button class="rounded p-1 text-slate-400" aria-label="Cerrar notificación" @click="notifications.remove(item.id)"><X :size="16" /></button>
    </div>
  </div>
</template>
````

## src/composables/useConfirm.js

````javascript
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
````

## src/composables/usePagination.js

````javascript
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
````

## src/db/client.js

````javascript
import { neon } from '@neondatabase/serverless'

export class DatabaseError extends Error {
  constructor(message, code = 'DATABASE_ERROR') {
    super(message)
    this.name = 'DatabaseError'
    this.code = code
  }
}

export function validateConnectionString(value) {
  if (!value?.trim() || /USUARIO|CONTRASENA|ep-ejemplo/.test(value)) {
    throw new DatabaseError('Configura VITE_DATABASE_URL en .env y reinicia Vite.', 'CONFIG_REQUIRED')
  }
  let url
  try { url = new URL(value.trim()) } catch {
    throw new DatabaseError('La conexión debe ser una URL PostgreSQL válida.', 'CONFIG_INVALID')
  }
  if (!['postgres:', 'postgresql:'].includes(url.protocol) || !url.hostname || !url.username || !url.password || url.pathname.length < 2) {
    throw new DatabaseError('La conexión necesita usuario, contraseña, servidor y nombre de base de datos.', 'CONFIG_INVALID')
  }
  return value.trim()
}

export function toDatabaseError(error) {
  if (error instanceof DatabaseError) return error
  const messages = {
    '23505': 'Ya existe un registro con esos datos. Revisa la cédula o el período del rol.',
    '23503': 'El registro tiene datos relacionados o la referencia ya no existe.',
    '23514': 'Hay valores fuera de los límites permitidos. Revisa el formulario.',
    '23502': 'Faltan campos obligatorios.',
    '42P01': 'Faltan tablas. Ejecuta schema.sql en SQL Editor de Neon.',
    '42703': 'El esquema no coincide con esta versión. Revisa schema.sql.',
    '42501': 'El usuario de la conexión no tiene permisos para esta operación.',
    '28P01': 'Neon rechazó las credenciales. Revisa tu archivo .env.',
    '40001': 'Los datos cambiaron durante la operación. Recarga y vuelve a intentarlo.',
  }
  if (['AbortError', 'TimeoutError'].includes(error?.name)) {
    return new DatabaseError('La consulta tardó demasiado. Comprueba la conexión y vuelve a intentar.', 'TIMEOUT')
  }
  const code = String(error?.code || '')
  // Nunca mostramos el mensaje original: puede contener SQL o datos sensibles.
  return new DatabaseError(messages[code] || 'No se pudo completar la consulta. Revisa la conexión a Internet, Neon y la configuración.', messages[code] ? code : 'CONNECTION_ERROR')
}

export function createDatabaseClient({ connectionString, driver = neon, timeoutMs = 15000 }) {
  let sql
  const getSql = () => {
    if (!sql) sql = driver(validateConnectionString(connectionString))
    return sql
  }

  async function execute(operation) {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs)
    try {
      return await operation(getSql(), { fetchOptions: { signal: controller.signal } })
    } catch (error) {
      throw toDatabaseError(error)
    } finally {
      clearTimeout(timer)
    }
  }

  return {
    // text es SQL estático del repositorio; los datos siempre van en values.
    query(text, values = []) {
      return execute((client, options) => client.query(text, values, options))
    },
    // Todas las sentencias se envían juntas y se confirman o revierten juntas.
    transaction(statements) {
      if (!Array.isArray(statements) || statements.length === 0) {
        return Promise.reject(new DatabaseError('La transacción necesita al menos una consulta.', 'EMPTY_TRANSACTION'))
      }
      return execute((client, options) => client.transaction(
        statements.map(({ text, values = [] }) => client.query(text, values)),
        options,
      ))
    },
  }
}

const connectionString = import.meta.env?.VITE_DATABASE_URL || ''
export function getConnectionStatus() {
  try {
    validateConnectionString(connectionString)
    return { configured: true, message: 'Conexión configurada. Falta verificar acceso a Neon.' }
  } catch (error) {
    return { configured: false, message: toDatabaseError(error).message }
  }
}

const database = createDatabaseClient({ connectionString })
export const query = database.query
export const transaction = database.transaction

export async function testConnection() {
  const [result] = await query(`
    SELECT
      to_regclass('public.empresa') IS NOT NULL AS empresa,
      to_regclass('public.parametros') IS NOT NULL AS parametros,
      to_regclass('public.empleados') IS NOT NULL AS empleados,
      to_regclass('public.roles_pago') IS NOT NULL AS roles_pago,
      to_regclass('public.roles_pago_detalle') IS NOT NULL AS roles_pago_detalle
  `)
  const missing = Object.entries(result).filter(([, exists]) => !exists).map(([table]) => table)
  if (missing.length) {
    throw new DatabaseError(`Neon responde, pero faltan estas tablas: ${missing.join(', ')}. Ejecuta schema.sql.`, 'SCHEMA_MISSING')
  }
  const [settings] = await query(`
    SELECT e.nombre, p.sbu
    FROM public.empresa e
    JOIN public.parametros p ON p.empresa_id = e.id
    WHERE e.id = $1
  `, [1])
  if (!settings) throw new DatabaseError('Faltan los registros iniciales de empresa y parámetros. Ejecuta schema.sql.', 'SEED_MISSING')
  return { company: settings.nombre, sbuConfigured: Number(settings.sbu) > 0 }
}
````

## src/layouts/AppLayout.vue

````vue
<script setup>
import { ref, watch, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import AppSidebar from '../components/common/AppSidebar.vue'
import AppHeader from '../components/common/AppHeader.vue'
import AppModal from '../components/common/AppModal.vue'
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

## src/main.js

````javascript
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router/index.js'
import './assets/main.css'

createApp(App).use(createPinia()).use(router).mount('#app')
````

## src/router/index.js

````javascript
import { createRouter, createWebHashHistory } from 'vue-router'
import AppLayout from '../layouts/AppLayout.vue'

const pendingModule = () => import('../views/ModuloPendienteView.vue')

const router = createRouter({
  history: createWebHashHistory(),
  scrollBehavior: () => ({ top: 0 }),
  routes: [
    {
      path: '/',
      component: AppLayout,
      children: [
        { path: '', name: 'inicio', component: () => import('../views/DashboardView.vue'), meta: { title: 'Resumen' } },
        { path: 'empleados', name: 'empleados', component: pendingModule, meta: { title: 'Empleados', description: 'Administra los datos personales, laborales y las modalidades de beneficios de tu equipo.', block: 2 } },
        { path: 'roles/nuevo', name: 'generar-roles', component: pendingModule, meta: { title: 'Generar roles', description: 'Prepara la nómina mensual, revisa el desglose y guarda los roles individuales o de todo tu equipo.', block: 3 } },
        { path: 'historial', name: 'historial', component: pendingModule, meta: { title: 'Historial', description: 'Consulta, edita, anula y regenera los roles de pago de períodos anteriores.', block: 4 } },
        { path: 'reportes', name: 'reportes', component: pendingModule, meta: { title: 'Reportes', description: 'Exporta roles individuales y consolidados mensuales a PDF y Excel.', block: 5 } },
        { path: 'configuracion', name: 'configuracion', component: () => import('../views/ConfiguracionView.vue'), meta: { title: 'Configuración' } },
        { path: ':pathMatch(.*)*', name: 'no-encontrado', component: () => import('../views/NotFoundView.vue'), meta: { title: 'Página no encontrada' } },
      ],
    },
  ],
})

router.afterEach((to) => { document.title = `${to.meta.title} · Nómina` })
export default router
````

## src/stores/conexion.js

````javascript
import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { getConnectionStatus, testConnection } from '../db/client.js'

export const useConexionStore = defineStore('conexion', () => {
  const config = getConnectionStatus()
  const state = ref(config.configured ? 'pendiente' : 'sin-configurar')
  const message = ref(config.message)
  const company = ref('Mi empresa')
  const sbuConfigured = ref(false)
  const busy = computed(() => state.value === 'verificando')
  const connected = computed(() => state.value === 'conectado')

  async function verify() {
    if (busy.value) return false
    state.value = 'verificando'
    message.value = 'Verificando acceso a Neon y las tablas de nómina…'
    try {
      const result = await testConnection()
      company.value = result.company
      sbuConfigured.value = result.sbuConfigured
      state.value = 'conectado'
      message.value = 'Conexión verificada. Las cinco tablas y la configuración inicial están disponibles.'
      return true
    } catch (error) {
      state.value = error.code === 'CONFIG_REQUIRED' || error.code === 'CONFIG_INVALID' ? 'sin-configurar' : 'error'
      message.value = error.message
      return false
    }
  }

  return { state, message, company, sbuConfigured, busy, connected, verify }
})
````

## src/stores/notificaciones.js

````javascript
import { ref } from 'vue'
import { defineStore } from 'pinia'

export const useNotificacionesStore = defineStore('notificaciones', () => {
  const items = ref([])
  const timers = new Map()

  function remove(id) {
    clearTimeout(timers.get(id))
    timers.delete(id)
    items.value = items.value.filter((item) => item.id !== id)
  }

  function notify(message, type = 'success') {
    const id = crypto.randomUUID()
    items.value.push({ id, message, type })
    if (items.value.length > 4) remove(items.value[0].id)
    if (type !== 'error') timers.set(id, setTimeout(() => remove(id), 7000))
    return id
  }

  return { items, notify, remove }
})
````

## src/views/ConfiguracionView.vue

````vue
<script setup>
import { computed } from 'vue'
import { Database, CheckCircle2, Circle, LoaderCircle, ArrowUpRight, TriangleAlert } from '@lucide/vue'
import { useConexionStore } from '../stores/conexion.js'
import { useNotificacionesStore } from '../stores/notificaciones.js'
const connection = useConexionStore()
const notifications = useNotificacionesStore()
const instructions = [
  { title: 'Crea tu proyecto en Neon', description: 'Selecciona una base de datos y abre SQL Editor dentro del proyecto.' },
  { title: 'Ejecuta el esquema SQL', description: 'Copia el contenido completo de schema.sql y ejecútalo. Se crearán las cinco tablas y los registros iniciales.' },
  { title: 'Completa tu archivo .env', description: 'Copia .env.example como .env y sustituye el ejemplo de VITE_DATABASE_URL con tu conexión PostgreSQL de Neon.' },
  { title: 'Reinicia y verifica', description: 'Si Vite estaba abierto, detenlo y ejecuta npm run dev. Luego presiona Verificar conexión.' },
]
const statusLabel = computed(() => connection.connected ? 'Base de datos lista' : 'Prepara tu base de datos')
async function verify() {
  const ok = await connection.verify()
  notifications.notify(connection.message, ok ? 'success' : 'error')
}
</script>

<template>
  <div class="mb-7"><p class="eyebrow mb-2">Ajustes de tu espacio</p><h1 class="text-3xl font-semibold tracking-tight">Configuración</h1><p class="mt-3 text-sm text-slate-500">Conecta tu empresa y prepara los datos para trabajar.</p></div>
  <div class="grid items-start gap-6 xl:grid-cols-[1.6fr_1fr]">
    <section class="card p-6 md:p-7"><div class="mb-6 flex items-center gap-3"><span class="rounded-xl bg-brand-50 p-3 text-brand-600"><Database :size="22" /></span><div><h2 class="text-lg font-semibold">Conexión a Neon</h2><p class="mt-1 text-xs text-slate-500">PostgreSQL desde el navegador</p></div></div>
      <ol class="space-y-6"><li v-for="(step, index) in instructions" :key="step.title" class="flex gap-4"><span class="grid h-7 w-7 shrink-0 place-items-center rounded-full border border-brand-100 bg-brand-50 text-xs font-semibold text-brand-600">{{ index + 1 }}</span><div><h3 class="text-sm font-semibold">{{ step.title }}</h3><p class="mt-1.5 text-sm leading-6 text-slate-500">{{ step.description }}</p></div></li></ol>
      <div class="mt-6 rounded-xl bg-slate-900 px-4 py-4 font-mono text-xs leading-6 text-slate-100"><p class="text-slate-400"># PowerShell, en la carpeta del proyecto</p><p>Copy-Item .env.example .env</p><p class="mt-2 text-slate-400"># Edita .env con tu conexión y luego ejecuta</p><p>npm run dev</p></div>
      <a href="https://console.neon.tech" target="_blank" rel="noopener noreferrer" class="mt-5 inline-flex items-center gap-2 rounded-lg text-sm font-semibold text-brand-600">Abrir consola de Neon<ArrowUpRight :size="16" /></a>
    </section>
    <div class="space-y-5"><section class="card p-6"><span class="mb-4 inline-flex rounded-full px-3 py-1 text-xs font-medium" :class="connection.connected ? 'bg-brand-50 text-brand-600' : 'bg-amber-50 text-amber-700'">{{ connection.connected ? 'Conectado' : 'Configuración inicial' }}</span><h2 class="text-lg font-semibold">{{ statusLabel }}</h2><p role="status" aria-live="polite" class="mt-3 text-sm leading-6 text-slate-500">{{ connection.message }}</p><button :disabled="connection.busy" class="btn btn-primary mt-5 w-full" @click="verify"><LoaderCircle v-if="connection.busy" :size="18" class="animate-spin" /><CheckCircle2 v-else :size="18" />{{ connection.busy ? 'Verificando…' : 'Verificar conexión' }}</button><p class="mt-3 text-xs leading-5 text-slate-400">Esta comprobación consulta las tablas y los datos iniciales. No modifica registros.</p><p v-if="connection.connected && !connection.sbuConfigured" class="mt-4 rounded-lg bg-amber-50 p-3 text-xs leading-5 text-amber-800">El SBU está pendiente de configuración. Se completará en el módulo de parámetros antes de generar roles.</p></section>
      <section class="rounded-2xl border border-amber-200 bg-amber-50/70 p-5"><h2 class="flex items-center gap-2 text-sm font-semibold text-amber-900"><TriangleAlert :size="18" />Uso local o interno</h2><p class="mt-3 text-xs leading-6 text-amber-900/80">La conexión VITE_DATABASE_URL queda accesible en el navegador. Usa un entorno de confianza y un usuario PostgreSQL con permisos mínimos. No publiques esta versión con datos reales.</p></section>
    </div>
  </div>
  <section class="card mt-6 p-6"><div class="flex items-center gap-2"><Circle :size="16" class="text-slate-300" /><h2 class="font-semibold">Empresa y parámetros de nómina</h2><span class="ml-auto text-xs text-slate-400">Próxima entrega</span></div><p class="mt-3 text-sm leading-6 text-slate-500">En el bloque 2 podrás editar nombre, logo, SBU, aportes al IESS, recargos y días base del mes. Los valores se guardarán en Neon.</p></section>
</template>
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
  { number: '02', title: 'Personaliza tu empresa', description: 'Nombre, logo y parámetros de nómina en un solo lugar.', done: false, to: '/configuracion', label: 'Ver configuración' },
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

  <section class="relative mb-8 overflow-hidden rounded-2xl bg-brand-900 p-7 text-white md:p-9">
    <div class="pointer-events-none absolute -right-8 -top-24 h-80 w-80 rounded-full border-[40px] border-white/5" aria-hidden="true" /><div class="pointer-events-none absolute -bottom-32 right-32 h-64 w-64 rounded-full border-[35px] border-white/5" aria-hidden="true" />
    <div class="relative grid gap-7 md:grid-cols-[1.5fr_1fr] md:items-center"><div><p class="mb-4 text-[11px] font-semibold uppercase tracking-[0.2em] text-lime-soft">Menos tareas. Más claridad.</p><h2 class="max-w-lg text-3xl font-semibold leading-tight tracking-tight md:text-[34px]">La nómina de tu empresa,<br />paso a paso.</h2><p class="mt-4 max-w-md text-sm leading-6 text-white/65">Empieza conectando tu base de datos. Después podrás gestionar empleados, calcular pagos y generar tus documentos.</p><RouterLink to="/configuracion" class="btn mt-6 bg-lime-soft text-brand-900 hover:bg-lime-200">{{ connection.connected ? 'Ver configuración' : 'Configurar conexión' }}<ArrowRight :size="17" /></RouterLink></div>
    <div class="rounded-2xl border border-white/15 bg-white/5 p-5 md:ml-4"><div class="mb-5 flex items-center gap-3"><span class="rounded-xl bg-white/10 p-2.5"><Database :size="22" class="text-lime-soft" /></span><div><p class="text-sm font-medium">Tu espacio de datos</p><p class="mt-1 text-xs text-white/50">PostgreSQL · Neon</p></div></div><div class="flex items-center justify-between border-t border-white/10 pt-4 text-sm"><span class="text-white/60">Estado de conexión</span><span class="flex items-center gap-2 text-xs"><span class="h-2 w-2 rounded-full" :class="connection.connected ? 'bg-lime-soft' : 'bg-amber-300'" />{{ connection.connected ? 'Verificada' : 'Por configurar' }}</span></div><div class="mt-3 flex items-center justify-between text-sm"><span class="text-white/60">Moneda</span><span class="text-xs">Dólar estadounidense</span></div></div></div>
  </section>

  <section aria-labelledby="first-steps"><div class="mb-4 flex items-center justify-between"><h2 id="first-steps" class="text-lg font-semibold tracking-tight">Tus primeros pasos</h2><span class="text-xs text-slate-400">{{ connection.connected ? 1 : 0 }} de 3 completados</span></div><div class="grid gap-4 xl:grid-cols-3"><article v-for="step in steps" :key="step.number" class="card flex flex-col p-6"><div class="mb-5 flex items-center justify-between"><span class="grid h-10 w-10 place-items-center rounded-xl text-sm font-semibold" :class="step.done ? 'bg-brand-100 text-brand-600' : 'bg-slate-100 text-slate-400'"><Check v-if="step.done" :size="20" /><template v-else>{{ step.number }}</template></span><span v-if="step.done" class="text-xs text-brand-600">Completado</span></div><h3 class="font-semibold">{{ step.title }}</h3><p class="mb-5 mt-2 text-sm leading-6 text-slate-500">{{ step.description }}</p><RouterLink :to="step.to" class="mt-auto flex items-center justify-between rounded-lg text-sm font-semibold text-brand-600">{{ step.label }}<ArrowRight :size="17" /></RouterLink></article></div></section>

  <section class="mt-8" aria-labelledby="workspace-modules"><div class="mb-4 flex flex-wrap items-center justify-between gap-2"><h2 id="workspace-modules" class="text-lg font-semibold tracking-tight">Una gestión más sencilla</h2><span class="text-xs text-slate-400">Módulos de las próximas entregas</span></div><div class="card divide-y divide-slate-100"><RouterLink v-for="module in modules" :key="module.to" :to="module.to" class="flex items-center gap-4 px-5 py-5 hover:bg-brand-50/40"><span class="rounded-xl bg-brand-50 p-3 text-brand-600"><component :is="module.icon" :size="20" :stroke-width="1.7" /></span><div class="min-w-0 flex-1"><h3 class="text-sm font-semibold">{{ module.title }}</h3><p class="mt-1 text-xs leading-5 text-slate-500">{{ module.description }}</p></div><span class="hidden rounded-full bg-slate-100 px-3 py-1 text-[11px] text-slate-500 sm:inline">{{ module.block }}</span><ArrowRight :size="17" class="shrink-0 text-slate-300" /></RouterLink></div></section>
  <div class="mt-6 flex items-start gap-3 rounded-xl bg-brand-50 px-5 py-4 text-xs leading-5 text-brand-600"><ShieldCheck :size="19" class="shrink-0" /><p>Este espacio está preparado para uso local o interno de confianza. Revisa las indicaciones de conexión antes de cargar información de tu equipo.</p></div>
</template>
````

## src/views/ModuloPendienteView.vue

````vue
<script setup>
import { useRoute } from 'vue-router'
import { Layers, ArrowLeft, ArrowRight } from '@lucide/vue'
const route = useRoute()
</script>

<template>
  <div class="mb-7"><p class="eyebrow mb-2">Tu espacio de trabajo</p><h1 class="text-3xl font-semibold tracking-tight">{{ route.meta.title }}</h1><p class="mt-3 max-w-2xl text-sm leading-6 text-slate-500">{{ route.meta.description }}</p></div>
  <section class="card flex min-h-80 flex-col items-center justify-center px-6 py-12 text-center"><span class="mb-5 rounded-2xl bg-brand-50 p-4 text-brand-600"><Layers :size="30" :stroke-width="1.5" /></span><span class="mb-3 text-xs font-semibold uppercase tracking-widest text-brand-600">Bloque {{ route.meta.block }}</span><h2 class="text-xl font-semibold">Este módulo llega en una próxima entrega</h2><p class="mt-3 max-w-md text-sm leading-6 text-slate-500">La navegación ya está preparada. En esta primera entrega puedes configurar y verificar la conexión a tu base de datos.</p><div class="mt-6 flex flex-wrap justify-center gap-3"><RouterLink to="/" class="btn btn-secondary"><ArrowLeft :size="17" />Volver al resumen</RouterLink><RouterLink to="/configuracion" class="btn btn-primary">Configurar conexión<ArrowRight :size="17" /></RouterLink></div></section>
</template>
````

## src/views/NotFoundView.vue

````vue
<script setup>
import { ArrowLeft } from '@lucide/vue'
</script>

<template>
  <section class="card py-20 text-center"><p class="text-sm font-semibold text-brand-600">404</p><h1 class="mt-3 text-2xl font-semibold">No encontramos esta página</h1><p class="mt-3 text-sm text-slate-500">Revisa la dirección o vuelve al inicio.</p><RouterLink to="/" class="btn btn-primary mt-6"><ArrowLeft :size="17" />Volver al resumen</RouterLink></section>
</template>
````

## tests/client.test.js

````javascript
import test from 'node:test'
import assert from 'node:assert/strict'
import { createDatabaseClient, validateConnectionString, toDatabaseError } from '../src/db/client.js'

const example = 'postgresql://test:fictional@localhost/testing'

test('la configuración ausente no impide importar o crear el cliente', async () => {
  const client = createDatabaseClient({ connectionString: '' })
  await assert.rejects(client.query('SELECT 1'), { code: 'CONFIG_REQUIRED' })
})

test('rechaza el ejemplo y protocolos incorrectos sin revelar credenciales', () => {
  assert.throws(() => validateConnectionString('postgresql://USUARIO:CONTRASENA@ep-ejemplo.neon.tech/db'), { code: 'CONFIG_REQUIRED' })
  assert.throws(() => validateConnectionString('https://test:fictional@localhost/testing'), { code: 'CONFIG_INVALID' })
  assert.equal(validateConnectionString(example), example)
})

test('transmite una entrada maliciosa como parámetro, nunca como texto SQL', async () => {
  let received
  const client = createDatabaseClient({ connectionString: example, driver: () => ({
    query: async (text, values, options) => { received = { text, values, options }; return [] },
  }) })
  const input = "'; DROP TABLE empleados; --"
  await client.query('SELECT id FROM empleados WHERE nombres = $1', [input])
  assert.equal(received.text, 'SELECT id FROM empleados WHERE nombres = $1')
  assert.deepEqual(received.values, [input])
  assert.equal(received.options.fetchOptions.signal.aborted, false)
})

test('la transacción conserva parámetros y utiliza una única transacción del driver', async () => {
  let calls = 0
  let actual
  const client = createDatabaseClient({ connectionString: example, driver: () => ({
    query: (text, values) => ({ text, values }),
    transaction: async (queries) => { calls++; actual = queries; return [[], []] },
  }) })
  const statements = [{ text: 'SELECT $1::int', values: [1] }, { text: 'SELECT $1::text', values: ['dato'] }]
  await client.transaction(statements)
  assert.equal(calls, 1)
  assert.deepEqual(actual, statements)
  await assert.rejects(client.transaction([]), { code: 'EMPTY_TRANSACTION' })
})

test('los errores desconocidos no exponen credenciales, consultas ni detalles del driver', async () => {
  const secretMessage = 'password=secreto SELECT datos_privados'
  const safe = toDatabaseError({ code: secretMessage, message: secretMessage })
  assert.equal(safe.code, 'CONNECTION_ERROR')
  assert.equal(JSON.stringify(safe).includes('secreto'), false)
  assert.equal(safe.message.includes('SELECT'), false)
  assert.equal(toDatabaseError({ code: '23505' }).code, '23505')
  const client = createDatabaseClient({ connectionString: example, driver: () => ({ query: async () => { throw new Error(secretMessage) } }) })
  await assert.rejects(client.query('SELECT 1'), { code: 'CONNECTION_ERROR' })
})

test('cancela la consulta y devuelve un error legible al vencer el tiempo', async () => {
  const client = createDatabaseClient({ connectionString: example, timeoutMs: 5, driver: () => ({
    query: (_text, _values, options) => new Promise((_resolve, reject) => {
      options.fetchOptions.signal.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')))
    }),
  }) })
  await assert.rejects(client.query('SELECT 1'), { code: 'TIMEOUT' })
})
````
