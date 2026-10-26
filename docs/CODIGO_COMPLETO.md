# Nómina Ecuador · Código completo

Versión actual. Cada bloque contiene el archivo íntegro. Instrucciones en README.md. package-lock.json está disponible por separado en la raíz.

## Archivos

- .env.example
- .gitignore
- package.json
- index.html
- vite.config.js
- schema.sql
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
- src/components/roles/RolPreview.vue
- src/composables/useConfirm.js
- src/composables/usePagination.js
- src/db/client.js
- src/db/repositories/configuracionRepository.js
- src/db/repositories/empleadosRepository.js
- src/db/repositories/rolesRepository.js
- src/layouts/AppLayout.vue
- src/main.js
- src/router/index.js
- src/services/exportService.js
- src/services/nominaService.js
- src/stores/conexion.js
- src/stores/configuracion.js
- src/stores/empleados.js
- src/stores/notificaciones.js
- src/utils/cedula.js
- src/utils/configuracion.js
- src/utils/formatos.js
- src/utils/marcaCache.js
- src/utils/tema.js
- src/views/ConfiguracionView.vue
- src/views/DashboardView.vue
- src/views/EmpleadosView.vue
- src/views/GenerarRolesView.vue
- src/views/HistorialView.vue
- src/views/ModuloPendienteView.vue
- src/views/NotFoundView.vue
- src/views/ReportesView.vue
- public/favicon.svg
- migrations/002_colores_empresa.sql
- migrations/003_modulos_nomina.sql
- scripts/migrate-payroll.mjs
- scripts/migrate-theme.mjs
- scripts/verify-payroll.mjs
- tests/client.test.js
- tests/configuracion.test.js
- tests/marcaCache.test.js
- tests/nomina.test.js
- tests/tema.test.js

## .env.example

````text
# EJEMPLO: sustituye usuario, contraseña, endpoint y base en tu archivo .env.
# Las variables VITE_* se exponen al navegador. Uso local/interno de confianza.
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
    "test": "node --test tests/*.test.js",
    "db:migrate:theme": "node scripts/migrate-theme.mjs",
    "db:migrate:payroll": "node scripts/migrate-payroll.mjs",
    "test:db": "node scripts/verify-payroll.mjs"
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
    color_primario VARCHAR(7) NOT NULL DEFAULT '#173d35' CHECK (color_primario ~ '^#[0-9A-Fa-f]{6}
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
),
    color_acento VARCHAR(7) NOT NULL DEFAULT '#d5eb8b' CHECK (color_acento ~ '^#[0-9A-Fa-f]{6}
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
),
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

-- MÓDULOS COMPLETOS: ampliación idempotente
BEGIN;
ALTER TABLE empleados
  ADD COLUMN IF NOT EXISTS region VARCHAR(10) NOT NULL DEFAULT 'sierra' CHECK (region IN ('sierra','costa')),
  ADD COLUMN IF NOT EXISTS modalidades JSONB NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(modalidades) = 'array');

ALTER TABLE roles_pago
  ADD COLUMN IF NOT EXISTS tipo VARCHAR(16) NOT NULL DEFAULT 'mensual' CHECK (tipo IN ('mensual','decimo_tercero','decimo_cuarto')),
  ADD COLUMN IF NOT EXISTS ejercicio INTEGER,
  ADD COLUMN IF NOT EXISTS fecha_pago DATE,
  ADD COLUMN IF NOT EXISTS inicio_devengo DATE,
  ADD COLUMN IF NOT EXISTS fin_devengo DATE,
  ADD COLUMN IF NOT EXISTS datos_entrada JSONB NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE roles_pago DROP CONSTRAINT IF EXISTS uq_rol_empleado_periodo;

CREATE UNIQUE INDEX IF NOT EXISTS uq_rol_empleado_tipo_periodo ON roles_pago(empleado_id,tipo,periodo);

CREATE UNIQUE INDEX IF NOT EXISTS uq_rol_beneficio_ejercicio ON roles_pago(empleado_id,tipo,ejercicio) WHERE tipo <> 'mensual';

CREATE TABLE IF NOT EXISTS roles_revisiones (
 id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 rol_id UUID NOT NULL REFERENCES roles_pago(id) ON DELETE RESTRICT,
 version INTEGER NOT NULL,
 contenido JSONB NOT NULL,
 creado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
 UNIQUE(rol_id,version)
);

CREATE TABLE IF NOT EXISTS roles_fuentes (
 rol_id UUID NOT NULL REFERENCES roles_pago(id) ON DELETE CASCADE,
 fuente_id UUID NOT NULL REFERENCES roles_pago(id) ON DELETE RESTRICT,
 PRIMARY KEY(rol_id,fuente_id),
 CHECK(rol_id <> fuente_id)
);

CREATE OR REPLACE FUNCTION guardar_rol(p JSONB, esperada INTEGER DEFAULT 0)
RETURNS UUID LANGUAGE plpgsql AS $$
DECLARE r roles_pago; rid UUID; item JSONB; src roles_pago; suma_i NUMERIC; suma_e NUMERIC;
BEGIN
 rid := (p->>'id')::uuid;
 -- Serializa operaciones del empleado, incluidas las liquidaciones y sus fuentes.
 PERFORM 1 FROM empleados WHERE id=(p->>'empleado_id')::uuid FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Empleado inexistente' USING ERRCODE='23503'; END IF;
 IF p->>'tipo'='mensual' AND EXISTS (
   SELECT 1 FROM roles_pago b WHERE b.empleado_id=(p->>'empleado_id')::uuid
   AND b.tipo<>'mensual' AND b.estado='emitido'
   AND b.inicio_devengo <= ((p->>'periodo')::date + interval '1 month - 1 day')::date
   AND b.fin_devengo >= (p->>'periodo')::date
 ) THEN RAISE EXCEPTION 'Decimo del periodo ya emitido' USING ERRCODE='P0002'; END IF;
 SELECT * INTO r FROM roles_pago WHERE id=rid FOR UPDATE;
 IF FOUND THEN
   IF r.version <> esperada OR r.empleado_id <> (p->>'empleado_id')::uuid
      OR r.tipo <> p->>'tipo' OR r.periodo <> (p->>'periodo')::date THEN
     RAISE EXCEPTION 'Conflicto de version' USING ERRCODE='40001';
   END IF;
   IF EXISTS(SELECT 1 FROM roles_fuentes WHERE fuente_id=rid) THEN
     RAISE EXCEPTION 'Anula primero el decimo vinculado' USING ERRCODE='P0002';
   END IF;
   INSERT INTO roles_revisiones(rol_id,version,contenido)
     SELECT r.id,r.version,jsonb_build_object('rol',to_jsonb(r),'detalle',
       (SELECT coalesce(jsonb_agg(to_jsonb(d)),'[]'::jsonb) FROM roles_pago_detalle d WHERE d.rol_id=rid));
 ELSE
   IF esperada <> 0 THEN RAISE EXCEPTION 'Rol inexistente' USING ERRCODE='40001'; END IF;
 END IF;
 SELECT coalesce(sum((x->>'monto')::numeric) FILTER(WHERE x->>'tipo'='ingreso'),0),
        coalesce(sum((x->>'monto')::numeric) FILTER(WHERE x->>'tipo'='egreso'),0)
 INTO suma_i,suma_e FROM jsonb_array_elements(p->'detalle') x;
 IF suma_i <> (p->>'total_ingresos')::numeric OR suma_e <> (p->>'total_egresos')::numeric OR suma_e > suma_i THEN
   RAISE EXCEPTION 'Totales inconsistentes' USING ERRCODE='23514';
 END IF;
 FOR item IN SELECT * FROM jsonb_array_elements(coalesce(p->'fuentes','[]'::jsonb)) LOOP
   SELECT * INTO src FROM roles_pago WHERE id=(item->>'id')::uuid FOR UPDATE;
   IF NOT FOUND OR src.estado <> 'emitido' OR src.tipo <> 'mensual'
      OR src.empleado_id <> (p->>'empleado_id')::uuid OR src.version <> (item->>'version')::int THEN
      RAISE EXCEPTION 'Fuente modificada' USING ERRCODE='40001';
   END IF;
 END LOOP;
 INSERT INTO roles_pago(id,empleado_id,periodo,tipo,ejercicio,fecha_pago,inicio_devengo,fin_devengo,
   dias_trabajados,horas_suplementarias,horas_extraordinarias,comisiones,bonos,anticipos,prestamos_iess,prestamos_quirografarios,
   base_aportacion,total_ingresos,total_egresos,aporte_personal,aporte_patronal,decimo_tercero_acumulado,
   decimo_cuarto_acumulado,fondos_reserva_acumulados,empleado_snapshot,empresa_snapshot,parametros_snapshot,datos_entrada,observaciones)
 VALUES(rid,(p->>'empleado_id')::uuid,(p->>'periodo')::date,p->>'tipo',(p->>'ejercicio')::int,
   (p->>'fecha_pago')::date,(p->>'inicio_devengo')::date,(p->>'fin_devengo')::date,
   (p->>'dias_trabajados')::numeric,(p->>'horas_suplementarias')::numeric,(p->>'horas_extraordinarias')::numeric,
   (p->>'comisiones')::numeric,(p->>'bonos')::numeric,(p->>'anticipos')::numeric,(p->>'prestamos_iess')::numeric,
   (p->>'prestamos_quirografarios')::numeric,(p->>'base_aportacion')::numeric,(p->>'total_ingresos')::numeric,
   (p->>'total_egresos')::numeric,(p->>'aporte_personal')::numeric,(p->>'aporte_patronal')::numeric,
   (p->>'decimo_tercero_acumulado')::numeric,(p->>'decimo_cuarto_acumulado')::numeric,
   (p->>'fondos_reserva_acumulados')::numeric,p->'empleado_snapshot',p->'empresa_snapshot',p->'parametros_snapshot',p->'datos_entrada',p->>'observaciones')
 ON CONFLICT(id) DO UPDATE SET
   version=roles_pago.version+1,estado='emitido',anulado_en=NULL,motivo_anulacion=NULL,
   fecha_pago=EXCLUDED.fecha_pago,inicio_devengo=EXCLUDED.inicio_devengo,fin_devengo=EXCLUDED.fin_devengo,
   dias_trabajados=EXCLUDED.dias_trabajados,horas_suplementarias=EXCLUDED.horas_suplementarias,
   horas_extraordinarias=EXCLUDED.horas_extraordinarias,comisiones=EXCLUDED.comisiones,bonos=EXCLUDED.bonos,
   anticipos=EXCLUDED.anticipos,prestamos_iess=EXCLUDED.prestamos_iess,prestamos_quirografarios=EXCLUDED.prestamos_quirografarios,
   base_aportacion=EXCLUDED.base_aportacion,total_ingresos=EXCLUDED.total_ingresos,total_egresos=EXCLUDED.total_egresos,
   aporte_personal=EXCLUDED.aporte_personal,aporte_patronal=EXCLUDED.aporte_patronal,
   decimo_tercero_acumulado=EXCLUDED.decimo_tercero_acumulado,decimo_cuarto_acumulado=EXCLUDED.decimo_cuarto_acumulado,
   fondos_reserva_acumulados=EXCLUDED.fondos_reserva_acumulados,empleado_snapshot=EXCLUDED.empleado_snapshot,
   empresa_snapshot=EXCLUDED.empresa_snapshot,parametros_snapshot=EXCLUDED.parametros_snapshot,
   datos_entrada=EXCLUDED.datos_entrada,observaciones=EXCLUDED.observaciones;
 DELETE FROM roles_pago_detalle WHERE rol_id=rid;
 INSERT INTO roles_pago_detalle(rol_id,tipo,codigo,descripcion,monto,orden)
 SELECT rid,x.tipo,x.codigo,x.descripcion,x.monto,x.orden
 FROM jsonb_to_recordset(p->'detalle') AS x(tipo text,codigo text,descripcion text,monto numeric,orden smallint);
 DELETE FROM roles_fuentes WHERE rol_id=rid;
 INSERT INTO roles_fuentes(rol_id,fuente_id)
 SELECT rid,(x->>'id')::uuid FROM jsonb_array_elements(coalesce(p->'fuentes','[]'::jsonb)) x;
 RETURN rid;
END; $$;

CREATE OR REPLACE FUNCTION anular_rol(rid UUID, esperada INTEGER, motivo TEXT)
RETURNS UUID LANGUAGE plpgsql AS $$
DECLARE r roles_pago;
BEGIN
 PERFORM 1 FROM empleados WHERE id=(SELECT empleado_id FROM roles_pago WHERE id=rid) FOR UPDATE;
 SELECT * INTO r FROM roles_pago WHERE id=rid FOR UPDATE;
 IF NOT FOUND OR r.version<>esperada OR r.estado<>'emitido' THEN RAISE EXCEPTION 'Conflicto' USING ERRCODE='40001'; END IF;
 IF length(btrim(motivo))=0 THEN RAISE EXCEPTION 'Motivo obligatorio' USING ERRCODE='23514'; END IF;
 IF EXISTS(SELECT 1 FROM roles_fuentes WHERE fuente_id=rid) THEN RAISE EXCEPTION 'Decimo vinculado' USING ERRCODE='P0002'; END IF;
 INSERT INTO roles_revisiones(rol_id,version,contenido)
 SELECT rid,r.version,jsonb_build_object('rol',to_jsonb(r),'detalle',
 (SELECT coalesce(jsonb_agg(to_jsonb(d)),'[]'::jsonb) FROM roles_pago_detalle d WHERE rol_id=rid));
 UPDATE roles_pago SET estado='anulado',motivo_anulacion=motivo,anulado_en=now(),version=version+1 WHERE id=rid;
 DELETE FROM roles_fuentes WHERE rol_id=rid;
 RETURN rid;
END; $$;

COMMIT;
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

## src/components/roles/RolPreview.vue

````vue
<script setup>
import { money, employeeName, roleLabel } from '../../utils/formatos.js'
defineProps({rol:{type:Object,required:true}})
</script>
<template>
 <article class="card overflow-hidden">
 <div class="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-5"><div><h3 class="font-semibold">{{employeeName(rol.empleado_snapshot)}}</h3><p class="mt-1 text-xs text-slate-500">{{roleLabel(rol.tipo)}} · {{rol.periodo.slice(0,7)}} · {{rol.empleado_snapshot.cedula}}</p><p v-if="rol.tipo!=='mensual'" class="mt-1 text-xs text-slate-500">Devengo: {{rol.inicio_devengo}} a {{rol.fin_devengo}}</p></div><div class="text-right"><p class="text-xs text-slate-500">Neto a recibir</p><strong class="text-2xl text-brand-600">{{money(rol.neto_recibir)}}</strong></div></div>
 <div class="overflow-x-auto"><table class="w-full text-left text-sm"><thead class="bg-slate-50 text-xs text-slate-500"><tr><th class="p-3">Tipo</th><th class="p-3">Concepto</th><th class="p-3 text-right">Valor</th></tr></thead><tbody><tr v-for="line in rol.detalle" :key="line.codigo" class="border-t border-slate-100"><td class="p-3">{{line.tipo}}</td><td class="p-3">{{line.descripcion}}</td><td class="p-3 text-right tabular-nums">{{money(line.monto)}}</td></tr></tbody></table></div>
 <div class="flex flex-wrap justify-end gap-5 border-t p-4 text-sm"><span>Ingresos: <b>{{money(rol.total_ingresos)}}</b></span><span>Egresos: <b>{{money(rol.total_egresos)}}</b></span></div>
 <p v-if="rol.observaciones" class="border-t px-5 py-3 text-sm text-slate-500">{{rol.observaciones}}</p>
 </article>
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
    'P0002': 'Este rol sustenta un décimo emitido. Anula primero ese décimo para modificar sus fuentes.',
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

## src/db/repositories/empleadosRepository.js

````javascript
import { query, DatabaseError } from '../client.js'
import { validarCedula } from '../../utils/cedula.js'
import { validDate } from '../../services/nominaService.js'

export async function listEmployees() {
 const rows=await query('SELECT to_jsonb(e) AS empleado FROM empleados e ORDER BY apellidos,nombres')
 return rows.map(r=>r.empleado)
}
export async function saveEmployee(input, original=null) {
 const e=JSON.parse(JSON.stringify(input))
 for(const key of ['nombres','apellidos','cargo','departamento']) {
  e[key]=String(e[key] || '').trim()
  if(!e[key] || e[key].length>120) throw new Error('Completa '+key+' (máximo 120 caracteres).')
 }
 if(!validarCedula(e.cedula)) throw new Error('La cédula ecuatoriana no es válida.')
 if(!validDate(e.fecha_ingreso)||e.fecha_salida&&!validDate(e.fecha_salida)||e.fecha_salida&&e.fecha_salida<e.fecha_ingreso) throw new Error('Revisa las fechas de ingreso y salida.')
 if(!Number.isFinite(Number(e.sueldo_base))||Number(e.sueldo_base)<=0||Number(e.sueldo_base)>9999999999.99) throw new Error('Ingresa un sueldo válido.')
 if(!['sierra','costa'].includes(e.region)) throw new Error('Selecciona la región laboral.')
 const id=e.id || crypto.randomUUID()
 let history=original?.modalidades || []
 const changed=!original || original.decimo_tercero_modalidad!==e.decimo_tercero_modalidad || original.decimo_cuarto_modalidad!==e.decimo_cuarto_modalidad
 if(changed) {
  const since=(e.vigente_desde || e.fecha_ingreso.slice(0,7))+'-01'
  if(!validDate(since) || since < e.fecha_ingreso.slice(0,7)+'-01') throw new Error('La vigencia debe ser un mes válido desde el ingreso.')
  if(!history.length && since > e.fecha_ingreso.slice(0,7)+'-01') {
   history=[{desde:e.fecha_ingreso.slice(0,7)+'-01',tercero:original?.decimo_tercero_modalidad || 'mensualizar',cuarto:original?.decimo_cuarto_modalidad || 'mensualizar',solicitud:'Modalidad anterior al cambio registrado'}]
  }
  const [last]=await query("SELECT max(periodo)::text AS periodo FROM roles_pago WHERE empleado_id=$1 AND tipo='mensual' AND estado='emitido'",[id])
  if(last.periodo && since<=last.periodo) throw new Error('La nueva modalidad debe iniciar después del último rol emitido: '+last.periodo.slice(0,7))
  if((e.decimo_tercero_modalidad==='acumular'||e.decimo_cuarto_modalidad==='acumular')&&!e.solicitud?.trim()) throw new Error('Registra la referencia de la solicitud escrita de acumulación.')
  history=[...history.filter(x=>x.desde!==since),{desde:since,tercero:e.decimo_tercero_modalidad,cuarto:e.decimo_cuarto_modalidad,solicitud:e.solicitud || ''}].sort((a,b)=>a.desde.localeCompare(b.desde))
 }
 const [row]=await query(`
 INSERT INTO empleados(id,cedula,nombres,apellidos,cargo,departamento,fecha_ingreso,fecha_salida,sueldo_base,numero_cuenta,estado,recibe_fondos_reserva,decimo_tercero_modalidad,decimo_cuarto_modalidad,region,modalidades)
 VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16::jsonb)
 ON CONFLICT(id) DO UPDATE SET cedula=EXCLUDED.cedula,nombres=EXCLUDED.nombres,apellidos=EXCLUDED.apellidos,
 cargo=EXCLUDED.cargo,departamento=EXCLUDED.departamento,fecha_ingreso=EXCLUDED.fecha_ingreso,fecha_salida=EXCLUDED.fecha_salida,
 sueldo_base=EXCLUDED.sueldo_base,numero_cuenta=EXCLUDED.numero_cuenta,estado=EXCLUDED.estado,
 recibe_fondos_reserva=EXCLUDED.recibe_fondos_reserva,decimo_tercero_modalidad=EXCLUDED.decimo_tercero_modalidad,
 decimo_cuarto_modalidad=EXCLUDED.decimo_cuarto_modalidad,region=EXCLUDED.region,modalidades=EXCLUDED.modalidades
 RETURNING *
 `,[id,e.cedula,e.nombres,e.apellidos,e.cargo,e.departamento,e.fecha_ingreso,e.fecha_salida || null,e.sueldo_base,e.numero_cuenta || null,e.estado,e.recibe_fondos_reserva,e.decimo_tercero_modalidad,e.decimo_cuarto_modalidad,e.region,JSON.stringify(history)])
 return row
}
export async function deleteEmployee(id) {
 const rows=await query('DELETE FROM empleados WHERE id=$1 RETURNING id',[id])
 if(!rows.length) throw new DatabaseError('El empleado ya no existe. Recarga la lista.','40001')
}
````

## src/db/repositories/rolesRepository.js

````javascript
import { query, transaction } from '../client.js'
export async function listRoles({ month='',year='',employee='',type='',state='' }={}) {
 const rows=await query(`
 SELECT (to_jsonb(r) - 'empresa_snapshot') || jsonb_build_object('empresa_snapshot',r.empresa_snapshot - 'logo_data_url') AS rol,
 coalesce((SELECT jsonb_agg(to_jsonb(d) ORDER BY d.orden) FROM roles_pago_detalle d WHERE d.rol_id=r.id),'[]'::jsonb) AS detalle
 FROM roles_pago r WHERE ($1='' OR to_char(r.periodo,'YYYY-MM')=$1)
 AND ($2='' OR to_char(r.periodo,'YYYY')=$2) AND ($3='' OR r.empleado_id::text=$3)
 AND ($4='' OR r.tipo=$4) AND ($5='' OR r.estado=$5)
 ORDER BY r.periodo DESC,r.creado_en DESC
 `,[month,String(year),employee,type,state])
 return rows.map(x=>({...x.rol,detalle:x.detalle}))
}
export async function getRole(id) {
 const [row]=await query(`
 SELECT to_jsonb(r) AS rol,
 coalesce((SELECT jsonb_agg(to_jsonb(d) ORDER BY d.orden) FROM roles_pago_detalle d WHERE d.rol_id=r.id),'[]'::jsonb) AS detalle
 FROM roles_pago r WHERE id=$1`,[id])
 if(!row) throw new Error('No se encontró el rol.')
 return {...row.rol,detalle:row.detalle}
}
export async function saveRoles(roles) {
 if(!roles.length) throw new Error('No hay roles para guardar.')
 return transaction(roles.map(r=>({text:'SELECT guardar_rol($1::jsonb,$2::int) AS id',values:[JSON.stringify(r),r.version || 0]})))
}
export const annulRole=(id,version,motivo)=>query('SELECT anular_rol($1::uuid,$2::int,$3::text)',[id,version,motivo])
export const revisions=id=>query('SELECT version,creado_en,contenido FROM roles_revisiones WHERE rol_id=$1 ORDER BY version DESC',[id])
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

## src/router/index.js

````javascript
import { createRouter, createWebHashHistory } from 'vue-router'
import AppLayout from '../layouts/AppLayout.vue'



const router = createRouter({
  history: createWebHashHistory(),
  scrollBehavior: () => ({ top: 0 }),
  routes: [
    {
      path: '/',
      component: AppLayout,
      children: [
        { path: '', name: 'inicio', component: () => import('../views/DashboardView.vue'), meta: { title: 'Resumen' } },
        { path: 'empleados', name: 'empleados', component: () => import('../views/EmpleadosView.vue'), meta: { title: 'Empleados', description: 'Administra los datos personales, laborales y las modalidades de beneficios de tu equipo.', block: 2 } },
        { path: 'roles/nuevo', name: 'generar-roles', component: () => import('../views/GenerarRolesView.vue'), meta: { title: 'Generar roles', description: 'Prepara la nómina mensual, revisa el desglose y guarda los roles individuales o de todo tu equipo.', block: 3 } },
        { path: 'historial', name: 'historial', component: () => import('../views/HistorialView.vue'), meta: { title: 'Historial', description: 'Consulta, edita, anula y regenera los roles de pago de períodos anteriores.', block: 4 } },
        { path: 'reportes', name: 'reportes', component: () => import('../views/ReportesView.vue'), meta: { title: 'Reportes', description: 'Exporta roles individuales y consolidados mensuales a PDF y Excel.', block: 5 } },
        { path: 'configuracion', name: 'configuracion', component: () => import('../views/ConfiguracionView.vue'), meta: { title: 'Configuración' } },
        { path: ':pathMatch(.*)*', name: 'no-encontrado', component: () => import('../views/NotFoundView.vue'), meta: { title: 'Página no encontrada' } },
      ],
    },
  ],
})

router.afterEach((to) => { document.title = `${to.meta.title} · Nómina` })
export default router
````

## src/services/exportService.js

````javascript
import { foreground } from '../utils/tema.js'
import { money, employeeName, roleLabel } from '../utils/formatos.js'
const clean=s=>String(s ?? '').replace(/[\u00a0\u202f]/g,' ')
const color=c=>/^#[0-9a-f]{6}$/i.test(c || '')?c:'#173d35'
async function createPdf(company,title) {
 const {jsPDF}=await import('jspdf')
 const doc=new jsPDF()
 doc.setFont('helvetica','bold');doc.setFontSize(16)
 const logo=company.logo_data_url
 let left=14
 if(logo){try{const properties=doc.getImageProperties(logo);const w=Math.min(32,20*properties.width/properties.height);doc.addImage(logo,properties.fileType,14,12,w,Math.min(20,32*properties.height/properties.width));left=51}catch{left=14}}
 const nameLines=doc.splitTextToSize(company.nombre || 'Empresa',196-left)
 doc.text(nameLines,left,19)
 const headerY=Math.max(29,19+nameLines.length*7)
 doc.setFont('helvetica','normal');doc.setFontSize(9)
 doc.text(clean(company.ruc?'RUC: '+company.ruc:''),left,headerY)
 doc.setFontSize(12);doc.text(title,14,headerY+13)
 doc.payrollHeaderEnd=headerY+13
 return doc
}
function footer(doc) {
 const count=doc.getNumberOfPages()
 for(let p=1;p<=count;p++){doc.setPage(p);doc.setFont('helvetica','normal');doc.setFontSize(8);doc.setTextColor(100);doc.text('Código del Trabajo · Ecuador · USD',14,287);doc.text('Página '+p+' de '+count,196,287,{align:'right'})}
}
export async function buildIndividualPdf(role) {
 const doc=await createPdf(role.empresa_snapshot,roleLabel(role.tipo)+(role.estado==='anulado'?' · ANULADO':''))
 const {autoTable}=await import('jspdf-autotable')
 doc.setFontSize(10)
 const info=[
  'Empleado: '+employeeName(role.empleado_snapshot),
  'Cédula: '+role.empleado_snapshot.cedula+' · Cargo: '+role.empleado_snapshot.cargo,
  'Departamento: '+role.empleado_snapshot.departamento,
  'Período: '+role.periodo.slice(0,7)+' · Fecha de pago: '+role.fecha_pago,
  role.tipo==='mensual'?'Días trabajados: '+role.dias_trabajados:'Devengo: '+role.inicio_devengo+' a '+role.fin_devengo,
  'Cuenta: '+(role.empleado_snapshot.numero_cuenta || 'No registrada'),
 ]
 let cursor=doc.payrollHeaderEnd+8
 for(const text of info){const lines=doc.splitTextToSize(clean(text),182);doc.text(lines,14,cursor);cursor+=lines.length*5}
 autoTable(doc,{startY:cursor+3,head:[['Tipo','Concepto','Valor (USD)']],body:role.detalle.filter(x=>Number(x.monto)!==0).map(x=>[x.tipo,x.descripcion,clean(money(x.monto))]),styles:{fontSize:9,cellPadding:3},headStyles:{fillColor:color(role.empresa_snapshot.color_primario),textColor:foreground(color(role.empresa_snapshot.color_primario))},columnStyles:{2:{halign:'right'}},margin:{bottom:23}})
 cursor=doc.lastAutoTable.finalY+9
 if(cursor>238){doc.addPage();cursor=20}
 doc.setFontSize(10);doc.text('Total ingresos: '+clean(money(role.total_ingresos)),14,cursor)
 doc.text('Total egresos: '+clean(money(role.total_egresos)),14,cursor+6)
 doc.setFont('helvetica','bold');doc.setFontSize(13);doc.text('NETO A RECIBIR: '+clean(money(role.neto_recibir)),14,cursor+15)
 doc.setFont('helvetica','normal');doc.setFontSize(9)
 cursor+=24
 if(role.observaciones){const lines=doc.splitTextToSize('Observaciones: '+clean(role.observaciones),180);for(const line of lines){if(cursor>258){doc.addPage();cursor=20}doc.text(line,14,cursor);cursor+=5}}
 if(cursor>235){doc.addPage();cursor=30}
 doc.line(20,cursor+25,90,cursor+25);doc.line(120,cursor+25,190,cursor+25)
 doc.text('Firma del empleado',55,cursor+31,{align:'center'});doc.text('Firma del empleador',155,cursor+31,{align:'center'})
 footer(doc)
 return doc
}
export async function downloadIndividual(role) {
 const doc=await buildIndividualPdf(role)
 doc.save(role.tipo+'_'+role.empleado_snapshot.cedula+'_'+role.periodo.slice(0,7)+'.pdf')
}
export async function buildConsolidatedPdf(roles,company,title) {
 const doc=await createPdf(company,title)
 const {autoTable}=await import('jspdf-autotable')
 const total=key=>roles.reduce((s,r)=>s+Number(r[key]),0)
 autoTable(doc,{startY:doc.payrollHeaderEnd+8,head:[['Empleado','Tipo','Ingresos','Egresos','Neto','IESS patronal']],
 body:roles.map(r=>[employeeName(r.empleado_snapshot),roleLabel(r.tipo),clean(money(r.total_ingresos)),clean(money(r.total_egresos)),clean(money(r.neto_recibir)),clean(money(r.aporte_patronal))]),
 foot:[['TOTALES','',clean(money(total('total_ingresos'))),clean(money(total('total_egresos'))),clean(money(total('neto_recibir'))),clean(money(total('aporte_patronal')))]],
 styles:{fontSize:8,cellPadding:2},headStyles:{fillColor:color(company.color_primario),textColor:foreground(color(company.color_primario))},footStyles:{fillColor:color(company.color_primario),textColor:foreground(color(company.color_primario))},margin:{bottom:23},columnStyles:{2:{halign:'right'},3:{halign:'right'},4:{halign:'right'},5:{halign:'right'}}})
 footer(doc);return doc
}
export async function downloadConsolidatedPdf(roles,company,month) {
 const doc=await buildConsolidatedPdf(roles,company,'Consolidado de nómina · '+month)
 doc.save('nomina_'+month+'.pdf')
}
export async function buildWorkbook(roles) {
 const XLSX=await import('xlsx')
 const data=roles.map(r=>({'Cédula':r.empleado_snapshot.cedula,'Empleado':employeeName(r.empleado_snapshot),'Tipo':roleLabel(r.tipo),'Período':r.periodo.slice(0,7),'Fecha de pago':r.fecha_pago,'Ingresos':Number(r.total_ingresos),'Egresos':Number(r.total_egresos),'Neto':Number(r.neto_recibir),'IESS personal':Number(r.aporte_personal),'IESS patronal':Number(r.aporte_patronal)}))
 const headers=['Cédula','Empleado','Tipo','Período','Fecha de pago','Ingresos','Egresos','Neto','IESS personal','IESS patronal']
 const sheet=XLSX.utils.json_to_sheet(data,{header:headers})
 const last=roles.length+2
 XLSX.utils.sheet_add_aoa(sheet,[['TOTALES']],{origin:'A'+last})
 for(let c=5;c<=9;c++){
  const col=XLSX.utils.encode_col(c)
  sheet[col+last]={t:'n',f:'SUM('+col+'2:'+col+(last-1)+')',v:data.reduce((s,r)=>s+r[headers[c]],0),z:'"$"#,##0.00'}
  for(let row=2;row<last;row++)sheet[col+row].z='"$"#,##0.00'
 }
 sheet['!cols']=[{wch:14},{wch:32},{wch:22},{wch:12},{wch:16},...Array.from({length:5},()=>({wch:18}))]
 sheet['!autofilter']={ref:'A1:J'+(last-1)}
 const workbook=XLSX.utils.book_new();XLSX.utils.book_append_sheet(workbook,sheet,'Nómina')
 return {XLSX,workbook}
}
export async function downloadExcel(roles,month) {
 const {XLSX,workbook}=await buildWorkbook(roles)
 XLSX.writeFile(workbook,'nomina_'+month+'.xlsx')
}
````

## src/services/nominaService.js

````javascript
import { today } from '../utils/formatos.js'

export const round = n => Math.round((Number(n) + Number.EPSILON) * 100) / 100
const num = (v, name, max=1000000000) => {
 const n=Number(v || 0)
 if (!Number.isFinite(n)||n<0||n>max) throw new Error(name + ': valor inválido.')
 return n
}
export const monthEnd = period => {
 const [y,m]=period.slice(0,7).split('-').map(Number)
 return new Date(Date.UTC(y,m,0)).toISOString().slice(0,10)
}
export function validDate(value) {
 return /^\d{4}-\d{2}-\d{2}$/.test(value || '') && !isNaN(Date.parse(value)) && new Date(value+'T12:00:00Z').toISOString().slice(0,10)===value
}
export function monthDays(employee, period, base=30, from=null) {
 const start=[period.slice(0,7)+'-01', employee.fecha_ingreso, from].filter(Boolean).sort().at(-1)
 const end=[monthEnd(period),employee.fecha_salida].filter(Boolean).sort()[0]
 if(start>end) return 0
 const dayStart=Number(start.slice(8))
 const dayEnd=end===monthEnd(period)?base:Math.min(base,Number(end.slice(8)))
 return Math.max(0, Math.min(base,dayEnd-Math.min(dayStart,base)+1))
}
export function modeFor(employee, period) {
 const entries=(employee.modalidades || []).filter(x=>x.desde<=period).sort((a,b)=>a.desde.localeCompare(b.desde))
 return entries.at(-1) || { tercero:employee.decimo_tercero_modalidad, cuarto:employee.decimo_cuarto_modalidad }
}
export function defaultInputs(employee,period,params) {
 return { dias_trabajados:monthDays(employee,period,Number(params.dias_base_mes)),horas_suplementarias:0,horas_extraordinarias:0,
 comisiones:0,bonos:0,anticipos:0,prestamos_iess:0,prestamos_quirografarios:0,descuentos:[],observaciones:'',fecha_pago:monthEnd(period),base_fondos:'' }
}
function shell(employee, company, params, period, type, input) {
 if(!employee.id) throw new Error('Selecciona un empleado.')
 return {id:crypto.randomUUID(),empleado_id:employee.id,periodo:period.slice(0,7)+'-01',tipo:type,ejercicio:null,
 fecha_pago:input.fecha_pago || today(),inicio_devengo:period.slice(0,7)+'-01',fin_devengo:monthEnd(period),
 dias_trabajados:0,horas_suplementarias:0,horas_extraordinarias:0,comisiones:0,bonos:0,anticipos:0,prestamos_iess:0,prestamos_quirografarios:0,
 base_aportacion:0,total_ingresos:0,total_egresos:0,aporte_personal:0,aporte_patronal:0,decimo_tercero_acumulado:0,decimo_cuarto_acumulado:0,
 fondos_reserva_acumulados:0,empleado_snapshot:JSON.parse(JSON.stringify(employee)),empresa_snapshot:JSON.parse(JSON.stringify(company)),
 parametros_snapshot:JSON.parse(JSON.stringify(params)),datos_entrada:JSON.parse(JSON.stringify(input)),observaciones:input.observaciones || '',detalle:[],fuentes:[],version:0}
}
function add(role,tipo,codigo,descripcion,monto) {
 role.detalle.push({tipo,codigo,descripcion,monto:round(monto),orden:role.detalle.length})
}
function totals(role) {
 role.total_ingresos=round(role.detalle.filter(x=>x.tipo==='ingreso').reduce((s,x)=>s+x.monto,0))
 role.total_egresos=round(role.detalle.filter(x=>x.tipo==='egreso').reduce((s,x)=>s+x.monto,0))
 role.neto_recibir=round(role.total_ingresos-role.total_egresos)
 if(role.neto_recibir<0) throw new Error('Los descuentos superan los ingresos. Corrige los valores.')
 if(!validDate(role.fecha_pago)) throw new Error('Fecha de pago inválida.')
 return role
}
export function calculateMonthly(employee,company,params,period,input) {
 if(!/^\d{4}-(0[1-9]|1[0-2])/.test(period)) throw new Error('Selecciona un mes válido.')
 const sbu=num(params.sbu,'SBU'); if(!sbu) throw new Error('Configura el SBU antes de generar roles.')
 const base=num(params.dias_base_mes,'Días base',31), hours=num(params.horas_jornada,'Jornada',24)
 if(!base||!hours) throw new Error('Configura días base y jornada.')
 const r=shell(employee,company,params,period,'mensual',input)
 const mode=modeFor(employee,r.periodo)
 const days=num(input.dias_trabajados,'Días trabajados',base)
 if(!Number.isInteger(days)||days>monthDays(employee,r.periodo,base)) throw new Error('Los días trabajados exceden el tiempo de contrato en el mes o no son enteros.')
 for(const field of ['horas_suplementarias','horas_extraordinarias','comisiones','bonos','anticipos','prestamos_iess','prestamos_quirografarios']) r[field]=num(input[field],field)
 r.dias_trabajados=days
 const salary=num(employee.sueldo_base,'Sueldo'), hourValue=salary/base/hours
 add(r,'ingreso','SUELDO','Sueldo proporcional',salary/base*days)
 add(r,'ingreso','SUPLEMENTARIAS','Horas suplementarias',hourValue*r.horas_suplementarias*(1+num(params.recargo_suplementarias_pct,'Recargo')/100))
 add(r,'ingreso','EXTRAORDINARIAS','Horas extraordinarias',hourValue*r.horas_extraordinarias*(1+num(params.recargo_extraordinarias_pct,'Recargo')/100))
 add(r,'ingreso','COMISIONES','Comisiones remunerativas',r.comisiones)
 add(r,'ingreso','BONOS','Bonos remunerativos',r.bonos)
 r.base_aportacion=round(r.detalle.reduce((s,x)=>s+x.monto,0))
 if(!days&&r.base_aportacion) throw new Error('No puede haber remuneración con cero días trabajados.')
 r.aporte_personal=round(r.base_aportacion*num(params.aporte_personal_pct,'IESS')/100)
 r.aporte_patronal=round(r.base_aportacion*num(params.aporte_patronal_pct,'IESS')/100)
 const d13=round(r.base_aportacion/12),d14=round(sbu/12*days/base)
 r.decimo_tercero_acumulado=mode.tercero==='acumular'?d13:0
 r.decimo_cuarto_acumulado=mode.cuarto==='acumular'?d14:0
 add(r,mode.tercero==='acumular'?'informativo':'ingreso','DECIMO_13','Décimo tercero ('+(mode.tercero==='acumular'?'acumulado':'mensualizado')+')',d13)
 add(r,mode.cuarto==='acumular'?'informativo':'ingreso','DECIMO_14','Décimo cuarto ('+(mode.cuarto==='acumular'?'acumulado':'mensualizado')+')',d14)
 const entered=new Date(employee.fecha_ingreso+'T12:00:00Z')
 const nextYear=entered.getUTCFullYear()+1, enteredMonth=entered.getUTCMonth()
 const lastDay=new Date(Date.UTC(nextYear,enteredMonth+1,0)).getUTCDate()
 const anniversary=new Date(Date.UTC(nextYear,enteredMonth,Math.min(entered.getUTCDate(),lastDay)))
 const eligible=Math.min(days,monthDays(employee,r.periodo,base,anniversary.toISOString().slice(0,10)))
 const eligibleBase=eligible===0?0:input.base_fondos!=='' && input.base_fondos!=null?num(input.base_fondos,'Base fondos'):r.base_aportacion*(eligible/Math.max(days,1))
 if(eligibleBase>r.base_aportacion) throw new Error('La base de fondos no puede superar la base de aportación.')
 const funds=round(eligibleBase*num(params.fondos_reserva_pct,'Fondos')/100)
 r.fondos_reserva_acumulados=employee.recibe_fondos_reserva?0:funds
 add(r,employee.recibe_fondos_reserva?'ingreso':'informativo','FONDOS','Fondos de reserva'+(employee.recibe_fondos_reserva?'':' al IESS'),funds)
 add(r,'egreso','IESS','Aporte personal IESS',r.aporte_personal)
 add(r,'egreso','ANTICIPOS','Anticipos',r.anticipos)
 add(r,'egreso','PRESTAMOS','Otros préstamos IESS',r.prestamos_iess)
 add(r,'egreso','QUIROGRAFARIOS','Préstamos quirografarios',r.prestamos_quirografarios)
 for(const [i,d] of (input.descuentos || []).entries()) {
  if(!d.descripcion?.trim()) throw new Error('Describe cada descuento adicional.')
  add(r,'egreso','OTRO_'+i,d.descripcion.trim(),num(d.monto,'Descuento'))
 }
 add(r,'informativo','PATRONAL','Aporte patronal IESS',r.aporte_patronal)
 r.datos_entrada.modalidad_aplicada=mode
 r.datos_entrada.dias_acumulados_14=mode.cuarto==='acumular'?days/base*30:0
 r.datos_entrada.base_fondos_calculada=round(eligibleBase)
 return totals(r)
}
export function benefitPeriod(type,year,region) {
 const y=Number(year)
 if(!Number.isInteger(y)||y<2000||y>2100) throw new Error('Año inválido.')
 if(type==='decimo_tercero') return {inicio:(y-1)+'-12-01',fin:y+'-11-30',pago:y+'-12-24'}
 if(type!=='decimo_cuarto') throw new Error('Tipo de rol inválido.')
 return region==='costa'?{inicio:(y-1)+'-03-01',fin:monthEnd(y+'-02'),pago:y+'-03-15'}:{inicio:(y-1)+'-08-01',fin:y+'-07-31',pago:y+'-08-15'}
}
export function monthsBetween(start,end) {
 const list=[];let value=start.slice(0,7)
 while(value<=end.slice(0,7)) {
  list.push(value+'-01')
  const [y,m]=value.split('-').map(Number)
  value=new Date(Date.UTC(y,m,1)).toISOString().slice(0,7)
 }
 return list
}
export function benefitCoverage(employee,type,year,rows) {
 const period=benefitPeriod(type,year,employee.region)
 const start=[period.inicio,employee.fecha_ingreso].sort().at(-1)
 const end=[period.fin,employee.fecha_salida].filter(Boolean).sort()[0]
 const months=start>end?[]:monthsBetween(start,end)
 const sources=rows.filter(r=>r.tipo==='mensual'&&r.estado==='emitido'&&r.empleado_id===employee.id&&months.includes(r.periodo.slice(0,10)))
 return {...period,start,end,months,sources,missing:months.filter(m=>!sources.some(r=>r.periodo.slice(0,10)===m))}
}
export function calculateBenefit(employee,company,params,type,year,rows,input) {
 const coverage=benefitCoverage(employee,type,year,rows)
 if(!coverage.months.length) throw new Error('El empleado no trabajó en este período.')
 if(coverage.end>today()) throw new Error('El período aún no ha cerrado. Genera el rol al finalizar el período o al registrar la salida.')
 const p={...params,sbu:num(input.sbu_anual || params.sbu,'SBU del año')}
 if(!p.sbu) throw new Error('Indica el SBU aplicable al año de pago.')
 const r=shell(employee,company,p,coverage.pago,type,input)
 r.ejercicio=Number(year); r.inicio_devengo=coverage.start;r.fin_devengo=coverage.end
 r.fecha_pago=input.fecha_pago || coverage.pago
 if(r.fecha_pago<coverage.end) throw new Error('La fecha de pago debe ser posterior al devengo.')
 let amount=0
 for(const source of coverage.sources) {
  const modes=source.datos_entrada?.modalidad_aplicada || modeFor(source.empleado_snapshot,source.periodo)
  if(type==='decimo_tercero'&&modes.tercero==='acumular') amount+=Number(source.base_aportacion)/12
  if(type==='decimo_cuarto'&&modes.cuarto==='acumular') amount+=p.sbu/360*(Number(source.dias_trabajados)/Number(source.parametros_snapshot.dias_base_mes)*30)
  r.fuentes.push({id:source.id,version:source.version})
 }
 const manual=input.historicos || []
 for(const month of coverage.missing) {
  const h=manual.find(x=>x.periodo===month)
  if(!h||!h.respaldo?.trim()) throw new Error('Falta completar el respaldo histórico de '+month.slice(0,7)+'.')
  const accrued=type==='decimo_tercero'?num(h.base,'Remuneración histórica')/12:p.sbu/360*num(h.dias,'Días históricos',monthDays(employee,month,30))
  const paid=num(h.pagado,'Décimo ya pagado')
  if(paid>round(accrued)) throw new Error('El décimo ya pagado supera lo devengado en '+month.slice(0,7)+'.')
  amount+=Math.max(0,accrued-paid)
 }
 if(round(amount)<=0) throw new Error('No hay saldo acumulado pendiente. Revisa la mensualización y los pagos previos.')
 add(r,'ingreso','BENEFICIO',type==='decimo_tercero'?'Décimo tercero acumulado':'Décimo cuarto acumulado',amount)
 r.datos_entrada.fuentes=r.fuentes
 r.datos_entrada.periodo_beneficio={inicio:coverage.inicio,fin:coverage.fin,pago:coverage.pago,meses:coverage.months}
 return totals(r)
}
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

## src/stores/empleados.js

````javascript
import { ref } from 'vue'
import { defineStore } from 'pinia'
import { listEmployees } from '../db/repositories/empleadosRepository.js'
export const useEmpleadosStore=defineStore('empleados',()=>{
 const items=ref([]),loading=ref(false),error=ref('')
 async function load(){loading.value=true;error.value='';try{items.value=await listEmployees();return true}catch(e){error.value=e.message;return false}finally{loading.value=false}}
 return {items,loading,error,load}
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

## src/utils/cedula.js

````javascript
export function validarCedula(value) {
 if (!/^\d{10}$/.test(value)) return false
 const province=Number(value.slice(0,2))
 if (!((province>=1 && province<=24)||province===30) || Number(value[2])>=6) return false
 const sum=[...value.slice(0,9)].reduce((total,digit,i)=>{let n=Number(digit)*(i%2===0?2:1);return total+(n>9?n-9:n)},0)
 return (10-sum%10)%10===Number(value[9])
}
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

## src/utils/formatos.js

````javascript
export const money = value => new Intl.NumberFormat('es-EC',{style:'currency',currency:'USD'}).format(Number(value || 0))
export const today = () => new Intl.DateTimeFormat('en-CA',{timeZone:'America/Guayaquil',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date())
export const currentMonth = () => today().slice(0,7)
export const roleLabel = type => ({mensual:'Rol mensual',decimo_tercero:'Décimo tercero',decimo_cuarto:'Décimo cuarto'})[type] || type
export const employeeName = e => [e.apellidos,e.nombres].filter(Boolean).join(' ')
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

## src/views/DashboardView.vue

````vue
<script setup>
import { computed,onMounted,ref,watch } from 'vue'
import { UsersRound,Wallet,Landmark,ArrowRight } from '@lucide/vue'
import { useEmpleadosStore } from '../stores/empleados.js'
import { listRoles } from '../db/repositories/rolesRepository.js'
import { currentMonth,money,employeeName,roleLabel } from '../utils/formatos.js'
import StatCard from '../components/common/StatCard.vue'
const employees=useEmpleadosStore(),month=ref(currentMonth()),items=ref([]),loading=ref(false),error=ref('')
const net=computed(()=>items.value.reduce((s,r)=>s+Number(r.neto_recibir),0))
const iess=computed(()=>items.value.reduce((s,r)=>s+Number(r.aporte_personal)+Number(r.aporte_patronal),0))
const active=computed(()=>employees.items.filter(e=>e.estado==='activo').length)
let sequence=0
async function load(){const id=++sequence;loading.value=true;error.value='';try{const rows=await listRoles({month:month.value,state:'emitido'});if(id===sequence)items.value=rows}catch(e){if(id===sequence){error.value=e.message;items.value=[]}}finally{if(id===sequence)loading.value=false}}
watch(month,()=>{if(month.value)load()})
onMounted(()=>{employees.load();load()})
</script>
<template>
 <div class="mb-7 flex flex-wrap items-end justify-between gap-4"><div><p class="eyebrow mb-2">Tu empresa, en orden</p><h1 class="text-3xl font-semibold">Resumen de nómina</h1><p class="mt-2 text-sm text-slate-500">Roles emitidos del período · Código del Trabajo</p></div><label class="text-sm">Período<input v-model="month" type="month" class="input mt-1" required /></label></div>
 <p v-if="error||employees.error" role="alert" class="mb-5 rounded-xl bg-red-50 p-4 text-red-700">{{error||employees.error}} <RouterLink to="/configuracion" class="underline">Revisar configuración</RouterLink></p>
 <div class="grid gap-5 md:grid-cols-3"><StatCard label="Neto de nómina del mes" :value="money(net)" :loading="loading" :icon="Wallet" description="Incluye roles mensuales y décimos del período; excluye anulados." /><StatCard label="Empleados activos" :value="active" :loading="employees.loading" :icon="UsersRound" description="Estado actual del equipo." /><StatCard label="Aportes IESS del mes" :value="money(iess)" :loading="loading" :icon="Landmark" description="Suma del aporte personal y patronal." /></div>
 <div class="my-6 flex flex-wrap gap-3"><RouterLink to="/roles/nuevo" class="btn btn-primary">Generar rol<ArrowRight :size="17" /></RouterLink><RouterLink to="/empleados" class="btn btn-secondary">Registrar empleados</RouterLink><RouterLink to="/reportes" class="btn btn-secondary">Exportar nómina</RouterLink></div>
 <section class="card overflow-hidden"><div class="flex items-center justify-between border-b p-5"><h2 class="font-semibold">Roles del período</h2><RouterLink to="/historial" class="text-sm text-brand-600 underline">Ver historial</RouterLink></div><p v-if="!items.length&&!loading" class="p-10 text-center text-sm text-slate-500">Aún no hay roles emitidos en este período.</p><div v-for="r in items.slice(0,8)" :key="r.id" class="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-5"><div><p class="text-sm font-semibold">{{employeeName(r.empleado_snapshot)}}</p><p class="mt-1 text-xs text-slate-500">{{roleLabel(r.tipo)}} · {{r.fecha_pago}}</p></div><strong class="text-brand-600">{{money(r.neto_recibir)}}</strong></div></section>
</template>
````

## src/views/EmpleadosView.vue

````vue
<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useEmpleadosStore } from '../stores/empleados.js'
import { saveEmployee, deleteEmployee } from '../db/repositories/empleadosRepository.js'
import { useNotificacionesStore } from '../stores/notificaciones.js'
import { useConfirm } from '../composables/useConfirm.js'
import { usePagination } from '../composables/usePagination.js'
import DataTable from '../components/common/DataTable.vue'
import AppModal from '../components/common/AppModal.vue'
import { money, today, currentMonth } from '../utils/formatos.js'
const employees=useEmpleadosStore(),notices=useNotificacionesStore(),{confirm}=useConfirm()
const search=ref(''),status=ref(''),department=ref(''),open=ref(false),busy=ref(false),error=ref(''),original=ref(null),form=reactive({})
const filtered=computed(()=>employees.items.filter(e=>(!status.value||e.estado===status.value)&&(!department.value||e.departamento===department.value)&&[e.nombres,e.apellidos,e.cedula,e.cargo].join(' ').toLowerCase().includes(search.value.toLowerCase())))
const departments=computed(()=>[...new Set(employees.items.map(e=>e.departamento))].sort())
const {page,pageSize,total,rows,reset}=usePagination(filtered)
watch([search,status,department],reset)
const columns=[{key:'cedula',label:'Cédula'},{key:'nombre',label:'Empleado'},{key:'cargo',label:'Cargo / departamento'},{key:'sueldo_base',label:'Sueldo',align:'right'},{key:'estado',label:'Estado'},{key:'acciones',label:'Acciones'}]
function edit(employee=null){
 original.value=employee?JSON.parse(JSON.stringify(employee)):null
 Object.keys(form).forEach(k=>delete form[k])
 Object.assign(form,employee?JSON.parse(JSON.stringify(employee)):{cedula:'',nombres:'',apellidos:'',cargo:'',departamento:'',fecha_ingreso:today(),fecha_salida:'',sueldo_base:'',numero_cuenta:'',estado:'activo',recibe_fondos_reserva:true,decimo_tercero_modalidad:'mensualizar',decimo_cuarto_modalidad:'mensualizar',region:'sierra'})
 form.vigente_desde=employee?currentMonth():form.fecha_ingreso.slice(0,7);form.solicitud='';error.value='';open.value=true
}
async function save(){busy.value=true;error.value='';try{await saveEmployee(form,original.value);open.value=false;notices.notify('Empleado guardado.');await employees.load()}catch(e){error.value=e.message}finally{busy.value=false}}
async function remove(e){if(!await confirm({title:'Eliminar empleado',message:'¿Eliminar a '+e.nombres+' '+e.apellidos+'? Si tiene roles, debes inactivarlo en lugar de eliminarlo.',confirmLabel:'Eliminar',danger:true}))return;try{await deleteEmployee(e.id);notices.notify('Empleado eliminado.');await employees.load()}catch(e){notices.notify(e.message,'error')}}
onMounted(employees.load)
</script>
<template>
 <div class="mb-6 flex flex-wrap items-center justify-between gap-4"><div><h1 class="text-3xl font-semibold">Empleados</h1><p class="mt-2 text-sm text-slate-500">Gestiona tu equipo y sus beneficios · Código del Trabajo</p></div><button class="btn btn-primary" @click="edit()">Registrar empleado</button></div>
 <div class="card mb-5 grid gap-3 p-4 md:grid-cols-3"><input v-model="search" class="input" aria-label="Buscar empleado" placeholder="Buscar por cédula, nombre o cargo" /><select v-model="status" class="input" aria-label="Estado"><option value="">Todos los estados</option><option value="activo">Activos</option><option value="inactivo">Inactivos</option></select><select v-model="department" class="input" aria-label="Departamento"><option value="">Todos los departamentos</option><option v-for="d in departments" :key="d">{{d}}</option></select></div>
 <DataTable :columns="columns" :rows="rows" :total="total" v-model:page="page" v-model:page-size="pageSize" :loading="employees.loading" :error="employees.error" empty-message="Todavía no hay empleados que coincidan.">
 <template #cell-nombre="{row}"><strong>{{row.apellidos}} {{row.nombres}}</strong><p class="mt-1 text-xs text-slate-500">13.º: {{row.decimo_tercero_modalidad}} · 14.º: {{row.decimo_cuarto_modalidad}}</p></template>
 <template #cell-cargo="{row}">{{row.cargo}}<p class="text-xs text-slate-500">{{row.departamento}}</p></template>
 <template #cell-sueldo_base="{value}">{{money(value)}}</template>
 <template #cell-acciones="{row}"><div class="flex gap-2"><button class="btn btn-secondary" @click="edit(row)">Editar</button><button class="btn text-red-700" @click="remove(row)">Eliminar</button></div></template>
 </DataTable>
 <AppModal v-model="open" :title="original?'Editar empleado':'Registrar empleado'" :dismissible="!busy">
 <form @submit.prevent="save"><fieldset :disabled="busy" class="space-y-4">
 <p v-if="error" role="alert" class="rounded-lg bg-red-50 p-3 text-sm text-red-700">{{error}}</p>
 <div class="grid gap-4 sm:grid-cols-2"><label v-for="field in [{key:'cedula',label:'Cédula',max:10},{key:'nombres',label:'Nombres',max:120},{key:'apellidos',label:'Apellidos',max:120},{key:'cargo',label:'Cargo',max:120},{key:'departamento',label:'Departamento',max:120}]" :key="field.key" class="text-sm">{{field.label}} *<input v-model="form[field.key]" class="input mt-1" required :maxlength="field.max" /></label>
 <label class="text-sm">Ingreso *<input v-model="form.fecha_ingreso" type="date" class="input mt-1" required /></label>
 <label class="text-sm">Salida (opcional)<input v-model="form.fecha_salida" type="date" class="input mt-1" :min="form.fecha_ingreso" /></label>
 <label class="text-sm">Sueldo mensual (USD) *<input v-model="form.sueldo_base" type="number" min="0.01" step="0.01" class="input mt-1" required /></label>
 <label class="text-sm">Cuenta bancaria<input v-model="form.numero_cuenta" class="input mt-1" maxlength="40" /></label>
 <label class="text-sm">Estado<select v-model="form.estado" class="input mt-1"><option value="activo">Activo</option><option value="inactivo">Inactivo</option></select></label>
 <label class="text-sm">Región laboral<select v-model="form.region" class="input mt-1"><option value="sierra">Sierra / Amazonía</option><option value="costa">Costa / Insular</option></select></label>
 <label class="text-sm">Fondos de reserva<select v-model="form.recibe_fondos_reserva" class="input mt-1"><option :value="true">Recibir mensualmente</option><option :value="false">Acumular en IESS</option></select></label>
 <label v-for="field in [{key:'decimo_tercero_modalidad',label:'Décimo tercero'},{key:'decimo_cuarto_modalidad',label:'Décimo cuarto'}]" :key="field.key" class="text-sm">{{field.label}}<select v-model="form[field.key]" class="input mt-1"><option value="mensualizar">Mensualizar</option><option value="acumular">No mensualizar (acumular)</option></select></label>
 </div>
 <label class="block text-sm">Modalidades vigentes desde<input v-model="form.vigente_desde" type="month" class="input mt-1" required /></label>
 <label class="block text-sm">Referencia de solicitud de acumulación<input v-model="form.solicitud" class="input mt-1" maxlength="250" placeholder="Fecha y referencia del documento firmado" /></label>
 <p class="text-xs leading-5 text-slate-500">La modalidad se aplica desde el mes indicado. Los roles emitidos conservan su modalidad original. Registra los cambios conforme a la solicitud del trabajador; la aplicación no sustituye ese documento.</p>
 <div class="flex justify-end gap-3"><button type="button" class="btn btn-secondary" @click="open=false">Cancelar</button><button class="btn btn-primary">{{busy?'Guardando…':'Guardar empleado'}}</button></div>
 </fieldset></form></AppModal>
</template>
````

## src/views/GenerarRolesView.vue

````vue
<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useConfiguracionStore } from '../stores/configuracion.js'
import { useEmpleadosStore } from '../stores/empleados.js'
import { useNotificacionesStore } from '../stores/notificaciones.js'
import { useConfirm } from '../composables/useConfirm.js'
import { listRoles, getRole, saveRoles } from '../db/repositories/rolesRepository.js'
import { benefitCoverage, benefitPeriod, calculateBenefit, calculateMonthly, defaultInputs, monthDays } from '../services/nominaService.js'
import { currentMonth, employeeName, money, today } from '../utils/formatos.js'
import RolPreview from '../components/roles/RolPreview.vue'
const route=useRoute(),router=useRouter(),settings=useConfiguracionStore(),employees=useEmpleadosStore(),notices=useNotificacionesStore(),{confirm}=useConfirm()
const type=ref('mensual'),month=ref(currentMonth()),year=ref(Number(today().slice(0,4))),selected=ref(''),loading=ref(true),saving=ref(false),error=ref(''),previews=ref([]),existing=ref([]),editing=ref(null),drafts=reactive({})
const benefit=reactive({fecha_pago:'',sbu_anual:'',historicos:[],observaciones:''})
const regenerate=computed(()=>route.query.regenerar==='1')
const person=computed(()=> editing.value&&!regenerate.value?editing.value.empleado_snapshot:employees.items.find(e=>e.id===selected.value))
const company=computed(()=>editing.value&&!regenerate.value?editing.value.empresa_snapshot:settings.empresa)
const params=computed(()=>editing.value&&!regenerate.value?editing.value.parametros_snapshot:settings.parametros)
const chosen=computed(()=>selected.value==='todos'?employees.items.filter(e=>e.estado==='activo'&&monthDays(e,month.value+'-01',Number(params.value?.dias_base_mes || 30))>0):person.value?[person.value]:[])
const coverage=computed(()=>person.value&&type.value!=='mensual'?benefitCoverage(person.value,type.value,year.value,existing.value):null)
const fields=[{key:'dias_trabajados',label:'Días trabajados',step:'1'},{key:'horas_suplementarias',label:'Horas suplementarias'},{key:'horas_extraordinarias',label:'Horas extraordinarias'},{key:'comisiones',label:'Comisiones (USD)'},{key:'bonos',label:'Bonos remunerativos (USD)'},{key:'anticipos',label:'Anticipos (USD)'},{key:'prestamos_iess',label:'Otros préstamos IESS'},{key:'prestamos_quirografarios',label:'Préstamos quirografarios'}]
function initializeDrafts(){
 previews.value=[]
 if(!params.value || !/^\d{4}-\d{2}$/.test(month.value))return
 for(const e of chosen.value) drafts[e.id]=defaultInputs(e,month.value,params.value)
 if(type.value!=='mensual'&&person.value){
  benefit.fecha_pago=benefitPeriod(type.value,year.value,person.value.region).pago
  benefit.sbu_anual=params.value.sbu
  benefit.historicos=(coverage.value?.missing || []).map(periodo=>({periodo,base:'',dias:'',pagado:0,respaldo:''}))
 }
}
watch([selected,month,type,year],initializeDrafts)
watch([drafts,benefit],()=>{previews.value=[]},{deep:true})
async function initialize(){
 loading.value=true;error.value=''
 try{
  if(!await settings.load())throw new Error(settings.error)
  if(!await employees.load())throw new Error(employees.error)
  existing.value=await listRoles()
  if(route.query.editar){
   const old=await getRole(route.query.editar);editing.value=old;type.value=old.tipo;selected.value=old.empleado_id;month.value=old.periodo.slice(0,7);year.value=old.ejercicio || Number(month.value.slice(0,4))
   await new Promise(resolve=>setTimeout(resolve,0))
   if(old.tipo==='mensual')drafts[old.empleado_id]=JSON.parse(JSON.stringify(old.datos_entrada))
   else Object.assign(benefit,JSON.parse(JSON.stringify(old.datos_entrada)))
  }
 }catch(e){error.value=e.message}finally{loading.value=false}
}
function preview(){
 error.value='';previews.value=[]
 try{
  if(!selected.value)throw new Error('Selecciona un empleado.')
  const result=[]
  if(type.value==='mensual'){
   for(const e of chosen.value){
    if(!editing.value&&existing.value.some(r=>r.empleado_id===e.id&&r.tipo==='mensual'&&r.periodo.slice(0,7)===month.value))throw new Error('Ya existe un rol para '+employeeName(e)+' en ese mes. Edítalo o regénéralo desde Historial.')
    result.push(calculateMonthly(e,company.value,params.value,month.value,drafts[e.id]))
   }
  } else {
   if(!person.value)throw new Error('Selecciona un empleado para el décimo.')
   if(!editing.value&&existing.value.some(r=>r.empleado_id===person.value.id&&r.tipo===type.value&&Number(r.ejercicio)===Number(year.value)))throw new Error('Ya existe este décimo para el año seleccionado. Utiliza Historial.')
   result.push(calculateBenefit(person.value,company.value,params.value,type.value,year.value,existing.value,benefit))
  }
  if(!result.length)throw new Error('No hay empleados con días laborables para ese mes.')
  if(editing.value){result[0].id=editing.value.id;result[0].version=editing.value.version}
  previews.value=result
 }catch(e){error.value=e.message}
}
async function save(){
 if(!previews.value.length)return
 if(!await confirm({title:editing.value?'Actualizar rol':'Guardar roles',message:'Se guardarán '+previews.value.length+' rol(es), con un neto total de '+money(previews.value.reduce((s,r)=>s+r.neto_recibir,0))+'. Confirma que revisaste el desglose.',confirmLabel:'Guardar'}))return
 saving.value=true
 try{await saveRoles(previews.value);notices.notify('Roles guardados correctamente.');await router.push('/historial')}catch(e){error.value=e.message;notices.notify(e.message,'error')}finally{saving.value=false}
}
onMounted(initialize)
</script>
<template>
 <div class="mb-6"><h1 class="text-3xl font-semibold">{{editing?(regenerate?'Regenerar rol':'Editar rol'):'Generar roles'}}</h1><p class="mt-2 text-sm text-slate-500">Código del Trabajo · Revisa todos los valores antes de guardar.</p></div>
 <p v-if="loading" role="status" class="card p-6">Cargando empleados y parámetros…</p>
 <p v-if="error" role="alert" class="mb-5 rounded-xl bg-red-50 p-4 text-red-700">{{error}}</p>
 <form v-if="!loading&&params" @submit.prevent="preview"><fieldset :disabled="saving" class="space-y-5">
 <div class="card grid gap-4 p-5 md:grid-cols-3">
 <label class="text-sm">Tipo de rol<select v-model="type" :disabled="!!editing" class="input mt-1"><option value="mensual">Rol mensual</option><option value="decimo_tercero">Décimo tercer sueldo</option><option value="decimo_cuarto">Décimo cuarto sueldo</option></select></label>
 <label v-if="type==='mensual'" class="text-sm">Período<input v-model="month" :disabled="!!editing" type="month" required class="input mt-1" /></label>
 <label v-else class="text-sm">Año de pago<input v-model="year" :disabled="!!editing" type="number" min="2000" max="2100" required class="input mt-1" /></label>
 <label class="text-sm">Empleado<select v-model="selected" :disabled="!!editing" required class="input mt-1"><option value="">Seleccionar empleado</option><option v-if="type==='mensual'" value="todos">Todos los activos</option><option v-for="e in employees.items" :key="e.id" :value="e.id">{{employeeName(e)}} ({{e.estado}})</option></select></label>
 </div>
 <p v-if="!employees.items.length" class="card p-5">Primero <RouterLink to="/empleados" class="font-semibold text-brand-600 underline">registra empleados</RouterLink>.</p>
 <p v-if="editing" class="rounded-xl bg-brand-50 p-4 text-sm text-brand-600">{{regenerate?'Se recalcula con los datos actuales de la empresa y el empleado.':'Se conservan los datos y parámetros históricos del rol.'}} La versión anterior se conservará en el historial.</p>
 <template v-if="type==='mensual'">
 <section v-for="e in chosen" :key="e.id" class="card p-5">
 <template v-if="drafts[e.id]"><h2 class="mb-4 font-semibold">{{employeeName(e)}} · {{money(e.sueldo_base)}}</h2>
 <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><label v-for="field in fields" :key="field.key" class="text-sm">{{field.label}}<input v-model="drafts[e.id][field.key]" type="number" min="0" :step="field.step || '0.01'" required class="input mt-1" /></label>
 <label class="text-sm">Fecha de pago<input v-model="drafts[e.id].fecha_pago" type="date" required class="input mt-1" /></label>
 <label class="text-sm">Base fondos (opcional)<input v-model="drafts[e.id].base_fondos" type="number" min="0" step="0.01" class="input mt-1" placeholder="Automática" /></label></div>
 <p class="mt-2 text-xs text-slate-500">Fondos: elegibilidad desde el segundo año. Si cumple el año a mitad del mes, la base automática se prorratea; puedes indicar la remuneración exacta del tramo elegible. Los bonos aquí son remunerativos.</p>
 <div class="mt-5"><div class="mb-3 flex items-center justify-between"><h3 class="text-sm font-semibold">Otros descuentos</h3><button type="button" class="btn btn-secondary" @click="drafts[e.id].descuentos.push({descripcion:'',monto:0})">Añadir descuento</button></div><div v-for="(d,i) in drafts[e.id].descuentos" :key="i" class="mb-2 flex gap-2"><input v-model="d.descripcion" required maxlength="250" class="input" aria-label="Descripción del descuento" placeholder="Descripción" /><input v-model="d.monto" type="number" min="0" step="0.01" required class="input max-w-36" aria-label="Monto del descuento" /><button type="button" class="btn text-red-700" @click="drafts[e.id].descuentos.splice(i,1)">Quitar</button></div></div>
 <label class="mt-4 block text-sm">Observaciones<textarea v-model="drafts[e.id].observaciones" class="input mt-1" maxlength="1000" /></label></template>
 </section></template>
 <section v-else-if="coverage" class="card space-y-5 p-5">
 <h2 class="font-semibold">Devengo: {{coverage.start}} a {{coverage.end}}</h2><p class="text-sm text-slate-500">Región: {{person.region==='costa'?'Costa / Insular':'Sierra / Amazonía'}}. Se usan {{coverage.sources.length}} roles mensuales emitidos; los décimos mensualizados se excluyen del saldo.</p>
 <div class="grid gap-4 sm:grid-cols-2"><label class="text-sm">Fecha de pago<input v-model="benefit.fecha_pago" type="date" required class="input mt-1" /></label><label v-if="type==='decimo_cuarto'" class="text-sm">SBU aplicable al año {{year}}<input v-model="benefit.sbu_anual" type="number" min="0.01" step="0.01" required class="input mt-1" /><span class="text-xs text-slate-500">Verifica el SBU de ese año, especialmente al generar períodos anteriores.</span></label></div>
 <div v-if="coverage.missing.length" class="rounded-xl bg-amber-50 p-4 text-sm text-amber-900">Falta historia de {{coverage.missing.length}} mes(es). Genera esos roles o completa los valores documentados abajo. El monto ya pagado incluye anticipos o mensualización del mismo décimo.</div>
 <div v-for="h in benefit.historicos" :key="h.periodo" class="rounded-xl border border-slate-200 p-4"><h3 class="mb-3 text-sm font-semibold">{{h.periodo.slice(0,7)}}</h3><div class="grid gap-3 md:grid-cols-3"><label v-if="type==='decimo_tercero'" class="text-sm">Remuneración computable<input v-model="h.base" type="number" min="0" step="0.01" required class="input mt-1" /></label><label v-else class="text-sm">Días devengados (base 30)<input v-model="h.dias" type="number" min="0" max="30" step="1" required class="input mt-1" /></label><label class="text-sm">Décimo ya pagado (USD)<input v-model="h.pagado" type="number" min="0" step="0.01" required class="input mt-1" /></label><label class="text-sm">Documento de respaldo<input v-model="h.respaldo" required maxlength="250" class="input mt-1" placeholder="Referencia del rol o comprobante" /></label></div></div>
 <label class="block text-sm">Observaciones<textarea v-model="benefit.observaciones" class="input mt-1" maxlength="1000" /></label>
 </section>
 <button type="submit" class="btn btn-primary" :disabled="!selected">Calcular y ver desglose</button>
 </fieldset></form>
 <section v-if="previews.length" class="mt-6 space-y-5"><h2 class="text-xl font-semibold">Vista previa · {{previews.length}} rol(es)</h2><RolPreview v-for="r in previews" :key="r.id" :rol="r" /><button class="btn btn-primary" :disabled="saving" @click="save">{{saving?'Guardando…':'Guardar roles revisados'}}</button></section>
</template>
````

## src/views/HistorialView.vue

````vue
<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { listRoles, getRole, annulRole, revisions } from '../db/repositories/rolesRepository.js'
import { useEmpleadosStore } from '../stores/empleados.js'
import { useNotificacionesStore } from '../stores/notificaciones.js'
import { usePagination } from '../composables/usePagination.js'
import DataTable from '../components/common/DataTable.vue'
import AppModal from '../components/common/AppModal.vue'
import RolPreview from '../components/roles/RolPreview.vue'
import { downloadIndividual } from '../services/exportService.js'
import { employeeName, money, roleLabel, currentMonth } from '../utils/formatos.js'
const employees=useEmpleadosStore(),notices=useNotificacionesStore()
const items=ref([]),loading=ref(false),error=ref(''),year=ref(currentMonth().slice(0,4)),month=ref(''),employee=ref(''),type=ref(''),state=ref(''),detail=ref(null),audit=ref([]),showDetail=ref(false),cancel=ref(null),showCancel=ref(false),reason=ref(''),busy=ref(false)
const filtered=computed(()=>items.value.filter(r=>(!year.value||r.periodo.startsWith(year.value))&&(!month.value||r.periodo.slice(5,7)===month.value)&&(!employee.value||r.empleado_id===employee.value)&&(!type.value||r.tipo===type.value)&&(!state.value||r.estado===state.value)))
const {page,pageSize,total,rows,reset}=usePagination(filtered)
watch([year,month,employee,type,state],reset)
const columns=[{key:'periodo',label:'Período'},{key:'empleado',label:'Empleado'},{key:'tipo',label:'Tipo'},{key:'neto_recibir',label:'Neto',align:'right'},{key:'estado',label:'Estado'},{key:'acciones',label:'Acciones'}]
async function load(){loading.value=true;error.value='';try{items.value=await listRoles()}catch(e){error.value=e.message}finally{loading.value=false}}
async function inspect(row){detail.value=row;audit.value=[];showDetail.value=true;try{audit.value=await revisions(row.id)}catch(e){notices.notify(e.message,'error')}}
function requestCancel(row){cancel.value=row;reason.value='';showCancel.value=true}
async function doCancel(){busy.value=true;try{await annulRole(cancel.value.id,cancel.value.version,reason.value.trim());showCancel.value=false;notices.notify('Rol anulado.');await load()}catch(e){notices.notify(e.message,'error')}finally{busy.value=false}}
async function pdf(row){try{await downloadIndividual(await getRole(row.id))}catch{notices.notify('No se pudo generar el PDF.','error')}}
onMounted(()=>{employees.load();load()})
</script>
<template>
 <div class="mb-6 flex justify-between gap-4"><div><h1 class="text-3xl font-semibold">Historial de roles</h1><p class="mt-2 text-sm text-slate-500">Consulta pagos, versiones anteriores y anulaciones.</p></div><button class="btn btn-secondary" :disabled="loading" @click="load">Actualizar</button></div>
 <div class="card mb-5 grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-5">
 <input v-model="year" class="input" type="number" min="2000" max="2100" placeholder="Todos los años" aria-label="Año" />
 <select v-model="month" class="input" aria-label="Mes"><option value="">Todos los meses</option><option v-for="n in 12" :key="n" :value="String(n).padStart(2,'0')">{{n}}</option></select>
 <select v-model="employee" class="input" aria-label="Empleado"><option value="">Todos los empleados</option><option v-for="e in employees.items" :key="e.id" :value="e.id">{{employeeName(e)}}</option></select>
 <select v-model="type" class="input" aria-label="Tipo"><option value="">Todos los tipos</option><option v-for="t in ['mensual','decimo_tercero','decimo_cuarto']" :key="t" :value="t">{{roleLabel(t)}}</option></select>
 <select v-model="state" class="input" aria-label="Estado"><option value="">Todos los estados</option><option value="emitido">Emitidos</option><option value="anulado">Anulados</option></select></div>
 <DataTable :columns="columns" :rows="rows" :total="total" v-model:page="page" v-model:page-size="pageSize" :loading="loading" :error="error">
 <template #cell-periodo="{value}">{{value.slice(0,7)}}</template><template #cell-empleado="{row}">{{employeeName(row.empleado_snapshot)}}</template><template #cell-tipo="{value}">{{roleLabel(value)}}</template><template #cell-neto_recibir="{value}">{{money(value)}}</template>
 <template #cell-acciones="{row}"><div class="flex flex-wrap gap-2 text-xs"><button class="text-brand-600 underline" @click="inspect(row)">Detalle</button><button class="text-brand-600 underline" @click="pdf(row)">PDF</button><RouterLink v-if="row.estado==='emitido'" :to="{path:'/roles/nuevo',query:{editar:row.id}}" class="text-brand-600 underline">Editar</RouterLink><RouterLink :to="{path:'/roles/nuevo',query:{editar:row.id,regenerar:'1'}}" class="text-brand-600 underline">Regenerar</RouterLink><button v-if="row.estado==='emitido'" class="text-red-700 underline" @click="requestCancel(row)">Anular</button></div></template>
 </DataTable>
 <AppModal v-model="showDetail" title="Detalle del rol"><template v-if="detail"><p class="mb-3 text-xs text-slate-500">Versión {{detail.version}} · {{detail.estado}}<span v-if="detail.motivo_anulacion"> · Motivo: {{detail.motivo_anulacion}}</span></p><RolPreview :rol="detail" /><div v-if="detail.tipo!=='mensual'" class="mt-4 text-xs text-slate-500"><p>Roles fuente: {{detail.datos_entrada.fuentes?.length || 0}}</p><p v-for="h in detail.datos_entrada.historicos || []" :key="h.periodo">{{h.periodo.slice(0,7)}} · Respaldo: {{h.respaldo}} · Pagado previamente: {{money(h.pagado)}}</p></div><h3 class="mt-5 font-semibold">Versiones anteriores</h3><p v-if="!audit.length" class="mt-2 text-sm text-slate-500">Sin modificaciones anteriores.</p><details v-for="a in audit" :key="a.version" class="mt-3"><summary class="cursor-pointer text-sm">Versión {{a.version}} · {{a.creado_en.slice(0,10)}}</summary><RolPreview :rol="{...a.contenido.rol,detalle:a.contenido.detalle}" /></details></template></AppModal>
 <AppModal v-model="showCancel" title="Anular rol" :dismissible="!busy"><form @submit.prevent="doCancel"><p class="mb-3 text-sm">El rol se conservará en el historial y se excluirá de los totales.</p><label class="text-sm">Motivo obligatorio<textarea v-model="reason" required maxlength="500" class="input mt-2" /></label><div class="mt-4 flex justify-end gap-3"><button type="button" :disabled="busy" class="btn btn-secondary" @click="showCancel=false">Volver</button><button :disabled="busy||!reason.trim()" class="btn btn-danger">{{busy?'Anulando…':'Confirmar anulación'}}</button></div></form></AppModal>
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

## src/views/ReportesView.vue

````vue
<script setup>
import { computed,onMounted,ref,watch } from 'vue'
import { useConfiguracionStore } from '../stores/configuracion.js'
import { useNotificacionesStore } from '../stores/notificaciones.js'
import { listRoles, getRole } from '../db/repositories/rolesRepository.js'
import { downloadExcel,downloadConsolidatedPdf,downloadIndividual } from '../services/exportService.js'
import { currentMonth,money,employeeName,roleLabel } from '../utils/formatos.js'
import DataTable from '../components/common/DataTable.vue'
import { usePagination } from '../composables/usePagination.js'
const settings=useConfiguracionStore(),notices=useNotificacionesStore(),month=ref(currentMonth()),type=ref(''),items=ref([]),loading=ref(false),exporting=ref(false),error=ref('')
const filtered=computed(()=>items.value.filter(r=>!type.value||r.tipo===type.value))
const {page,pageSize,total,rows,reset}=usePagination(filtered)
const sum=key=>filtered.value.reduce((s,r)=>s+Number(r[key]),0)
const columns=[{key:'empleado',label:'Empleado'},{key:'tipo',label:'Rol'},{key:'total_ingresos',label:'Ingresos',align:'right'},{key:'total_egresos',label:'Egresos',align:'right'},{key:'neto_recibir',label:'Neto',align:'right'},{key:'aporte_personal',label:'IESS personal',align:'right'},{key:'aporte_patronal',label:'IESS patronal',align:'right'},{key:'pdf',label:'PDF'}]
let request=0
async function load(){const token=++request;loading.value=true;error.value='';try{const result=await listRoles({month:month.value,state:'emitido'});if(token===request)items.value=result}catch(e){if(token===request){error.value=e.message;items.value=[]}}finally{if(token===request)loading.value=false}}
async function exportFile(format,row){exporting.value=true;try{if(row)await downloadIndividual(await getRole(row.id));else if(format==='excel')await downloadExcel(filtered.value,month.value);else await downloadConsolidatedPdf(filtered.value,settings.empresa,month.value);notices.notify('Archivo generado.')}catch{notices.notify('No se pudo exportar el archivo. Revisa los datos e inténtalo de nuevo.','error')}finally{exporting.value=false}}
watch(month,()=>{reset();if(month.value)load()});watch(type,reset)
onMounted(async()=>{await settings.load();load()})
</script>
<template>
 <div class="mb-6"><h1 class="text-3xl font-semibold">Reportes y exportaciones</h1><p class="mt-2 text-sm text-slate-500">Consolidado por período del rol. Solo se incluyen roles emitidos; los anulados quedan excluidos.</p></div>
 <div class="card mb-5 flex flex-wrap items-end gap-4 p-5"><label class="text-sm">Mes del rol<input v-model="month" type="month" class="input mt-1" required /></label><label class="text-sm">Tipo<select v-model="type" class="input mt-1"><option value="">Todos</option><option v-for="t in ['mensual','decimo_tercero','decimo_cuarto']" :key="t" :value="t">{{roleLabel(t)}}</option></select></label><button class="btn btn-primary" :disabled="!filtered.length||loading||exporting||!settings.empresa" @click="exportFile('pdf')">PDF consolidado</button><button class="btn btn-secondary" :disabled="!filtered.length||loading||exporting" @click="exportFile('excel')">Exportar Excel</button></div>
 <div class="mb-5 grid gap-4 md:grid-cols-3"><div v-for="t in [{key:'total_ingresos',label:'Ingresos'},{key:'total_egresos',label:'Egresos'},{key:'neto_recibir',label:'Neto total'}]" :key="t.key" class="card p-5"><p class="text-sm text-slate-500">{{t.label}}</p><p class="mt-2 text-2xl font-semibold">{{loading?'…':money(sum(t.key))}}</p></div></div>
 <DataTable :columns="columns" :rows="rows" :total="total" v-model:page="page" v-model:page-size="pageSize" :loading="loading" :error="error">
 <template #cell-empleado="{row}">{{employeeName(row.empleado_snapshot)}}</template><template #cell-tipo="{value}">{{roleLabel(value)}}</template>
 <template v-for="key in ['total_ingresos','total_egresos','neto_recibir','aporte_personal','aporte_patronal']" :key="key" #[`cell-${key}`]="{value}">{{money(value)}}</template>
 <template #cell-pdf="{row}"><button class="text-brand-600 underline" :disabled="exporting" @click="exportFile('pdf',row)">Descargar</button></template>
 </DataTable>
</template>
````

## public/favicon.svg

````text
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><rect width="48" height="48" rx="14" fill="#173d35"/><path d="M14 34V14h5l10 13V14h5v20h-5L19 21v13Z" fill="#d5eb8b"/></svg>
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

## migrations/003_modulos_nomina.sql

````sql
ALTER TABLE empleados
  ADD COLUMN IF NOT EXISTS region VARCHAR(10) NOT NULL DEFAULT 'sierra' CHECK (region IN ('sierra','costa')),
  ADD COLUMN IF NOT EXISTS modalidades JSONB NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(modalidades) = 'array');
-- @statement
ALTER TABLE roles_pago
  ADD COLUMN IF NOT EXISTS tipo VARCHAR(16) NOT NULL DEFAULT 'mensual' CHECK (tipo IN ('mensual','decimo_tercero','decimo_cuarto')),
  ADD COLUMN IF NOT EXISTS ejercicio INTEGER,
  ADD COLUMN IF NOT EXISTS fecha_pago DATE,
  ADD COLUMN IF NOT EXISTS inicio_devengo DATE,
  ADD COLUMN IF NOT EXISTS fin_devengo DATE,
  ADD COLUMN IF NOT EXISTS datos_entrada JSONB NOT NULL DEFAULT '{}'::jsonb;
-- @statement
ALTER TABLE roles_pago DROP CONSTRAINT IF EXISTS uq_rol_empleado_periodo;
-- @statement
CREATE UNIQUE INDEX IF NOT EXISTS uq_rol_empleado_tipo_periodo ON roles_pago(empleado_id,tipo,periodo);
-- @statement
CREATE UNIQUE INDEX IF NOT EXISTS uq_rol_beneficio_ejercicio ON roles_pago(empleado_id,tipo,ejercicio) WHERE tipo <> 'mensual';
-- @statement
CREATE TABLE IF NOT EXISTS roles_revisiones (
 id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 rol_id UUID NOT NULL REFERENCES roles_pago(id) ON DELETE RESTRICT,
 version INTEGER NOT NULL,
 contenido JSONB NOT NULL,
 creado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
 UNIQUE(rol_id,version)
);
-- @statement
CREATE TABLE IF NOT EXISTS roles_fuentes (
 rol_id UUID NOT NULL REFERENCES roles_pago(id) ON DELETE CASCADE,
 fuente_id UUID NOT NULL REFERENCES roles_pago(id) ON DELETE RESTRICT,
 PRIMARY KEY(rol_id,fuente_id),
 CHECK(rol_id <> fuente_id)
);
-- @statement
CREATE OR REPLACE FUNCTION guardar_rol(p JSONB, esperada INTEGER DEFAULT 0)
RETURNS UUID LANGUAGE plpgsql AS $$
DECLARE r roles_pago; rid UUID; item JSONB; src roles_pago; suma_i NUMERIC; suma_e NUMERIC;
BEGIN
 rid := (p->>'id')::uuid;
 -- Serializa operaciones del empleado, incluidas las liquidaciones y sus fuentes.
 PERFORM 1 FROM empleados WHERE id=(p->>'empleado_id')::uuid FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Empleado inexistente' USING ERRCODE='23503'; END IF;
 IF p->>'tipo'='mensual' AND EXISTS (
   SELECT 1 FROM roles_pago b WHERE b.empleado_id=(p->>'empleado_id')::uuid
   AND b.tipo<>'mensual' AND b.estado='emitido'
   AND b.inicio_devengo <= ((p->>'periodo')::date + interval '1 month - 1 day')::date
   AND b.fin_devengo >= (p->>'periodo')::date
 ) THEN RAISE EXCEPTION 'Decimo del periodo ya emitido' USING ERRCODE='P0002'; END IF;
 SELECT * INTO r FROM roles_pago WHERE id=rid FOR UPDATE;
 IF FOUND THEN
   IF r.version <> esperada OR r.empleado_id <> (p->>'empleado_id')::uuid
      OR r.tipo <> p->>'tipo' OR r.periodo <> (p->>'periodo')::date THEN
     RAISE EXCEPTION 'Conflicto de version' USING ERRCODE='40001';
   END IF;
   IF EXISTS(SELECT 1 FROM roles_fuentes WHERE fuente_id=rid) THEN
     RAISE EXCEPTION 'Anula primero el decimo vinculado' USING ERRCODE='P0002';
   END IF;
   INSERT INTO roles_revisiones(rol_id,version,contenido)
     SELECT r.id,r.version,jsonb_build_object('rol',to_jsonb(r),'detalle',
       (SELECT coalesce(jsonb_agg(to_jsonb(d)),'[]'::jsonb) FROM roles_pago_detalle d WHERE d.rol_id=rid));
 ELSE
   IF esperada <> 0 THEN RAISE EXCEPTION 'Rol inexistente' USING ERRCODE='40001'; END IF;
 END IF;
 SELECT coalesce(sum((x->>'monto')::numeric) FILTER(WHERE x->>'tipo'='ingreso'),0),
        coalesce(sum((x->>'monto')::numeric) FILTER(WHERE x->>'tipo'='egreso'),0)
 INTO suma_i,suma_e FROM jsonb_array_elements(p->'detalle') x;
 IF suma_i <> (p->>'total_ingresos')::numeric OR suma_e <> (p->>'total_egresos')::numeric OR suma_e > suma_i THEN
   RAISE EXCEPTION 'Totales inconsistentes' USING ERRCODE='23514';
 END IF;
 FOR item IN SELECT * FROM jsonb_array_elements(coalesce(p->'fuentes','[]'::jsonb)) LOOP
   SELECT * INTO src FROM roles_pago WHERE id=(item->>'id')::uuid FOR UPDATE;
   IF NOT FOUND OR src.estado <> 'emitido' OR src.tipo <> 'mensual'
      OR src.empleado_id <> (p->>'empleado_id')::uuid OR src.version <> (item->>'version')::int THEN
      RAISE EXCEPTION 'Fuente modificada' USING ERRCODE='40001';
   END IF;
 END LOOP;
 INSERT INTO roles_pago(id,empleado_id,periodo,tipo,ejercicio,fecha_pago,inicio_devengo,fin_devengo,
   dias_trabajados,horas_suplementarias,horas_extraordinarias,comisiones,bonos,anticipos,prestamos_iess,prestamos_quirografarios,
   base_aportacion,total_ingresos,total_egresos,aporte_personal,aporte_patronal,decimo_tercero_acumulado,
   decimo_cuarto_acumulado,fondos_reserva_acumulados,empleado_snapshot,empresa_snapshot,parametros_snapshot,datos_entrada,observaciones)
 VALUES(rid,(p->>'empleado_id')::uuid,(p->>'periodo')::date,p->>'tipo',(p->>'ejercicio')::int,
   (p->>'fecha_pago')::date,(p->>'inicio_devengo')::date,(p->>'fin_devengo')::date,
   (p->>'dias_trabajados')::numeric,(p->>'horas_suplementarias')::numeric,(p->>'horas_extraordinarias')::numeric,
   (p->>'comisiones')::numeric,(p->>'bonos')::numeric,(p->>'anticipos')::numeric,(p->>'prestamos_iess')::numeric,
   (p->>'prestamos_quirografarios')::numeric,(p->>'base_aportacion')::numeric,(p->>'total_ingresos')::numeric,
   (p->>'total_egresos')::numeric,(p->>'aporte_personal')::numeric,(p->>'aporte_patronal')::numeric,
   (p->>'decimo_tercero_acumulado')::numeric,(p->>'decimo_cuarto_acumulado')::numeric,
   (p->>'fondos_reserva_acumulados')::numeric,p->'empleado_snapshot',p->'empresa_snapshot',p->'parametros_snapshot',p->'datos_entrada',p->>'observaciones')
 ON CONFLICT(id) DO UPDATE SET
   version=roles_pago.version+1,estado='emitido',anulado_en=NULL,motivo_anulacion=NULL,
   fecha_pago=EXCLUDED.fecha_pago,inicio_devengo=EXCLUDED.inicio_devengo,fin_devengo=EXCLUDED.fin_devengo,
   dias_trabajados=EXCLUDED.dias_trabajados,horas_suplementarias=EXCLUDED.horas_suplementarias,
   horas_extraordinarias=EXCLUDED.horas_extraordinarias,comisiones=EXCLUDED.comisiones,bonos=EXCLUDED.bonos,
   anticipos=EXCLUDED.anticipos,prestamos_iess=EXCLUDED.prestamos_iess,prestamos_quirografarios=EXCLUDED.prestamos_quirografarios,
   base_aportacion=EXCLUDED.base_aportacion,total_ingresos=EXCLUDED.total_ingresos,total_egresos=EXCLUDED.total_egresos,
   aporte_personal=EXCLUDED.aporte_personal,aporte_patronal=EXCLUDED.aporte_patronal,
   decimo_tercero_acumulado=EXCLUDED.decimo_tercero_acumulado,decimo_cuarto_acumulado=EXCLUDED.decimo_cuarto_acumulado,
   fondos_reserva_acumulados=EXCLUDED.fondos_reserva_acumulados,empleado_snapshot=EXCLUDED.empleado_snapshot,
   empresa_snapshot=EXCLUDED.empresa_snapshot,parametros_snapshot=EXCLUDED.parametros_snapshot,
   datos_entrada=EXCLUDED.datos_entrada,observaciones=EXCLUDED.observaciones;
 DELETE FROM roles_pago_detalle WHERE rol_id=rid;
 INSERT INTO roles_pago_detalle(rol_id,tipo,codigo,descripcion,monto,orden)
 SELECT rid,x.tipo,x.codigo,x.descripcion,x.monto,x.orden
 FROM jsonb_to_recordset(p->'detalle') AS x(tipo text,codigo text,descripcion text,monto numeric,orden smallint);
 DELETE FROM roles_fuentes WHERE rol_id=rid;
 INSERT INTO roles_fuentes(rol_id,fuente_id)
 SELECT rid,(x->>'id')::uuid FROM jsonb_array_elements(coalesce(p->'fuentes','[]'::jsonb)) x;
 RETURN rid;
END; $$;
-- @statement
CREATE OR REPLACE FUNCTION anular_rol(rid UUID, esperada INTEGER, motivo TEXT)
RETURNS UUID LANGUAGE plpgsql AS $$
DECLARE r roles_pago;
BEGIN
 PERFORM 1 FROM empleados WHERE id=(SELECT empleado_id FROM roles_pago WHERE id=rid) FOR UPDATE;
 SELECT * INTO r FROM roles_pago WHERE id=rid FOR UPDATE;
 IF NOT FOUND OR r.version<>esperada OR r.estado<>'emitido' THEN RAISE EXCEPTION 'Conflicto' USING ERRCODE='40001'; END IF;
 IF length(btrim(motivo))=0 THEN RAISE EXCEPTION 'Motivo obligatorio' USING ERRCODE='23514'; END IF;
 IF EXISTS(SELECT 1 FROM roles_fuentes WHERE fuente_id=rid) THEN RAISE EXCEPTION 'Decimo vinculado' USING ERRCODE='P0002'; END IF;
 INSERT INTO roles_revisiones(rol_id,version,contenido)
 SELECT rid,r.version,jsonb_build_object('rol',to_jsonb(r),'detalle',
 (SELECT coalesce(jsonb_agg(to_jsonb(d)),'[]'::jsonb) FROM roles_pago_detalle d WHERE rol_id=rid));
 UPDATE roles_pago SET estado='anulado',motivo_anulacion=motivo,anulado_en=now(),version=version+1 WHERE id=rid;
 DELETE FROM roles_fuentes WHERE rol_id=rid;
 RETURN rid;
END; $$;
````

## scripts/migrate-payroll.mjs

````javascript
import { readFile } from 'node:fs/promises'
import { loadEnv } from 'vite'
import { neon } from '@neondatabase/serverless'
try {
 const env=loadEnv('development',process.cwd(),'VITE_')
 const sql=neon(env.VITE_DATABASE_URL)
 const source=await readFile(new URL('../migrations/003_modulos_nomina.sql',import.meta.url),'utf8')
 await sql.transaction(source.split('-- @statement').map(text=>sql.query(text,[])))
 console.log('Módulos de nómina instalados. Se conservaron los registros existentes.')
} catch(e) { console.error('No se pudo migrar. Código:', /^[A-Z0-9]{5}$/.test(e.code || '')?e.code:'CONEXION'); process.exitCode=1 }
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

## scripts/verify-payroll.mjs

````javascript
import { loadEnv } from 'vite'
import { neon } from '@neondatabase/serverless'
import { calculateMonthly, calculateBenefit, benefitCoverage, defaultInputs } from '../src/services/nominaService.js'
const env=loadEnv('development',process.cwd(),'VITE_')
const sql=neon(env.VITE_DATABASE_URL)
const e={id:crypto.randomUUID(),cedula:'9900000001',nombres:'PRUEBA TRANSACCIONAL',apellidos:'REVERSIBLE',cargo:'Prueba',departamento:'Prueba',fecha_ingreso:'2025-01-01',sueldo_base:1000,recibe_fondos_reserva:true,decimo_tercero_modalidad:'acumular',decimo_cuarto_modalidad:'acumular',region:'sierra',modalidades:[]}
const c={nombre:'Prueba sin persistencia'}
const p={sbu:500,aporte_personal_pct:9.45,aporte_patronal_pct:11.15,fondos_reserva_pct:8.33,recargo_suplementarias_pct:50,recargo_extraordinarias_pct:100,dias_base_mes:30,horas_jornada:8}
const monthly=calculateMonthly(e,c,p,'2025-01',defaultInputs(e,'2025-01',p))
const sources=[{...monthly,estado:'emitido',version:1}]
const coverage=benefitCoverage(e,'decimo_tercero',2025,sources)
const annual=calculateBenefit(e,c,p,'decimo_tercero',2025,sources,{historicos:coverage.missing.map(periodo=>({periodo,base:1000,pagado:0,respaldo:'Prueba revertida'}))})
const seed=()=>sql.query(`INSERT INTO empleados(id,cedula,nombres,apellidos,cargo,departamento,fecha_ingreso,sueldo_base,region) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)`,[e.id,e.cedula,e.nombres,e.apellidos,e.cargo,e.departamento,e.fecha_ingreso,e.sueldo_base,e.region])
const save=(role,version=0)=>sql.query('SELECT guardar_rol($1::jsonb,$2::int)',[JSON.stringify(role),version])
const cancel=(id,version)=>sql.query('SELECT anular_rol($1::uuid,$2::int,$3)',[id,version,'Prueba revertida'])
const sentinel=()=>sql.query('SELECT $1::integer',['ROLLBACK_NOMINA_PRUEBA'])
async function check(name,queries,expected='22P02'){
 try { await sql.transaction(queries); throw new Error('FALTA_ROLLBACK') }
 catch(error) {
  if(error.code!==expected || expected==='22P02'&&!String(error.message).includes('ROLLBACK_NOMINA_PRUEBA')) {
   console.error('FALLÓ:',name,'Código:',error.code || 'ERROR');process.exitCode=1;return
  }
  console.log('OK:',name)
 }
}
await check('guardar, editar, revisar, anular y regenerar',[
 seed(),save(monthly),save(monthly,1),
 sql.query('SELECT 1 / CASE WHEN version=2 AND (SELECT count(*) FROM roles_revisiones WHERE rol_id=$1)=1 THEN 1 ELSE 0 END FROM roles_pago WHERE id=$1',[monthly.id]),
 cancel(monthly.id,2),save(monthly,3),
 sql.query("SELECT 1 / CASE WHEN version=4 AND estado='emitido' THEN 1 ELSE 0 END FROM roles_pago WHERE id=$1",[monthly.id]),sentinel()
])
await check('rechazar rol duplicado',[seed(),save(monthly),save({...monthly,id:crypto.randomUUID()})],'23505')
await check('rechazar versión obsoleta',[seed(),save(monthly),save(monthly,0)],'40001')
await check('proteger fuente de décimo emitido',[seed(),save(monthly),save(annual),save(monthly,1)],'P0002')
await check('proteger mes con saldo histórico ya liquidado',[seed(),save(monthly),save(annual),save(calculateMonthly(e,c,p,'2025-02',defaultInputs(e,'2025-02',p)))],'P0002')
await check('liberar fuente al anular décimo',[seed(),save(monthly),save(annual),cancel(annual.id,1),save(monthly,1),sentinel()])
const [cleanup]=await sql.query('SELECT count(*)::int AS cantidad FROM empleados WHERE id=$1',[e.id])
if(cleanup.cantidad!==0){console.error('FALLÓ: reversión de datos de prueba.');process.exitCode=1}
else console.log('Confirmado: no quedaron empleados ni roles de prueba.')
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

## tests/nomina.test.js

````javascript
import test from 'node:test'
import assert from 'node:assert/strict'
import { calculateMonthly, calculateBenefit, defaultInputs, benefitPeriod, monthDays, modeFor } from '../src/services/nominaService.js'
import { validarCedula } from '../src/utils/cedula.js'
import { buildIndividualPdf, buildConsolidatedPdf, buildWorkbook } from '../src/services/exportService.js'
export const employee={id:'00000000-0000-4000-8000-000000000001',cedula:'1710034065',nombres:'Empleado',apellidos:'Prueba',cargo:'Analista',departamento:'Pruebas',fecha_ingreso:'2020-01-01',fecha_salida:null,sueldo_base:1000,recibe_fondos_reserva:true,decimo_tercero_modalidad:'mensualizar',decimo_cuarto_modalidad:'mensualizar',region:'sierra',modalidades:[]}
export const company={nombre:'Empresa de prueba',color_primario:'#123b73'}
export const params={sbu:500,aporte_personal_pct:9.45,aporte_patronal_pct:11.15,fondos_reserva_pct:8.33,recargo_suplementarias_pct:50,recargo_extraordinarias_pct:100,dias_base_mes:30,horas_jornada:8}
const base=(e=employee,period='2025-01')=>defaultInputs(e,period,params)

test('cédula: dígito verificador, longitud y provincia',()=>{
 assert.equal(validarCedula('1710034065'),true)
 for(const value of ['1710034066','0000000000','9910034065','171003406','abcdefghij'])assert.equal(validarCedula(value),false)
})
test('rol mensual incluye extras, beneficios y descuentos sin descontar aporte patronal',()=>{
 const r=calculateMonthly(employee,company,params,'2025-01',{...base(),horas_suplementarias:2,horas_extraordinarias:1,comisiones:100,bonos:50,anticipos:100,prestamos_iess:20,prestamos_quirografarios:30,descuentos:[{descripcion:'Descuento documentado',monto:5}]})
 assert.equal(r.base_aportacion,1170.83)
 assert.equal(r.aporte_personal,110.64)
 assert.equal(r.aporte_patronal,130.55)
 assert.equal(r.total_ingresos,1407.60)
 assert.equal(r.total_egresos,265.64)
 assert.equal(r.neto_recibir,1141.96)
})
test('acumulaciones se informan y no se suman al neto mensual',()=>{
 const e={...employee,recibe_fondos_reserva:false,decimo_tercero_modalidad:'acumular',decimo_cuarto_modalidad:'acumular'}
 const r=calculateMonthly(e,company,params,'2025-01',base(e))
 assert.equal(r.neto_recibir,905.50)
 assert.equal(r.decimo_tercero_acumulado,83.33)
 assert.equal(r.decimo_cuarto_acumulado,41.67)
 assert.equal(r.fondos_reserva_acumulados,83.30)
})
test('días parciales, febrero y fecha de aniversario de fondos',()=>{
 assert.equal(monthDays(employee,'2025-02',30),30)
 assert.equal(monthDays({...employee,fecha_ingreso:'2025-02-16'},'2025-02',30),15)
 assert.equal(monthDays({...employee,fecha_salida:'2025-02-10'},'2025-02',30),10)
 const e={...employee,fecha_ingreso:'2024-01-16'}
 const r=calculateMonthly(e,company,params,'2025-01',base(e))
 assert.equal(r.detalle.find(d=>d.codigo==='FONDOS').monto,41.65)
 const before=calculateMonthly({...employee,fecha_ingreso:'2024-02-01'},company,params,'2025-01',base())
 assert.equal(before.detalle.find(d=>d.codigo==='FONDOS').monto,0)
})
test('rechaza días fuera del contrato y descuentos mayores que ingresos',()=>{
 assert.throws(()=>calculateMonthly(employee,company,params,'2025-01',{...base(),dias_trabajados:31}))
 assert.throws(()=>calculateMonthly(employee,company,params,'2025-01',{...base(),anticipos:9999}))
 assert.throws(()=>calculateMonthly(employee,company,params,'2025-01',{...base(),descuentos:[{descripcion:'',monto:5}]}))
})
test('modalidad por vigencia conserva meses anteriores',()=>{
 const e={...employee,modalidades:[{desde:'2024-01-01',tercero:'mensualizar',cuarto:'mensualizar'},{desde:'2025-01-01',tercero:'acumular',cuarto:'mensualizar'}]}
 assert.equal(modeFor(e,'2024-12-01').tercero,'mensualizar')
 assert.equal(modeFor(e,'2025-01-01').tercero,'acumular')
})
test('períodos oficiales de décimos y febrero bisiesto',()=>{
 assert.deepEqual(benefitPeriod('decimo_tercero',2025,'sierra'),{inicio:'2024-12-01',fin:'2025-11-30',pago:'2025-12-24'})
 assert.deepEqual(benefitPeriod('decimo_cuarto',2024,'costa'),{inicio:'2023-03-01',fin:'2024-02-29',pago:'2024-03-15'})
 assert.deepEqual(benefitPeriod('decimo_cuarto',2025,'sierra'),{inicio:'2024-08-01',fin:'2025-07-31',pago:'2025-08-15'})
})
function history(type) {
 const e={...employee,decimo_tercero_modalidad:'acumular',decimo_cuarto_modalidad:'acumular'}
 const start=type==='decimo_tercero'?11:7
 const rows=Array.from({length:12},(_,i)=>{
  const period=new Date(Date.UTC(2024,start+i,1)).toISOString().slice(0,7)
  const r=calculateMonthly(e,company,params,period,base(e,period))
  return {...r,version:1,estado:'emitido'}
 })
 return {e,rows}
}
test('décimo tercero anual usa remuneración, sin IESS y sin duplicar mensualizados',()=>{
 const {e,rows}=history('decimo_tercero')
 const r=calculateBenefit(e,company,params,'decimo_tercero',2025,rows,{})
 assert.equal(r.neto_recibir,1000)
 assert.equal(r.aporte_personal,0);assert.equal(r.aporte_patronal,0)
 rows[0].datos_entrada.modalidad_aplicada.tercero='mensualizar'
 assert.equal(calculateBenefit(e,company,params,'decimo_tercero',2025,rows,{}).neto_recibir,916.67)
})
test('décimo cuarto acumulado usa SBU del año de pago y días devengados',()=>{
 const {e,rows}=history('decimo_cuarto')
 for(const r of rows)r.parametros_snapshot.sbu=450
 assert.equal(calculateBenefit(e,company,params,'decimo_cuarto',2025,rows,{sbu_anual:500}).neto_recibir,500)
 rows[0].datos_entrada.modalidad_aplicada.cuarto='mensualizar'
 assert.equal(calculateBenefit(e,company,params,'decimo_cuarto',2025,rows,{sbu_anual:500}).neto_recibir,458.33)
})
test('exige respaldo de meses faltantes y resta lo ya pagado',()=>{
 const {e,rows}=history('decimo_tercero');const missing=rows.shift().periodo
 assert.throws(()=>calculateBenefit(e,company,params,'decimo_tercero',2025,rows,{}),/respaldo/)
 const r=calculateBenefit(e,company,params,'decimo_tercero',2025,rows,{historicos:[{periodo:missing,base:1000,pagado:50,respaldo:'Comprobante de prueba'}]})
 assert.equal(r.neto_recibir,950)
})
test('PDF individual/consolidado y Excel producen archivos con totales numéricos',async()=>{
 const role=calculateMonthly(employee,company,params,'2025-01',base())
 const pdf=await buildIndividualPdf(role);assert.ok(pdf.output('arraybuffer').byteLength>1000)
 const consolidated=await buildConsolidatedPdf([role],company,'Prueba');assert.ok(consolidated.getNumberOfPages()>=1)
 const {XLSX,workbook}=await buildWorkbook([role])
 const sheet=workbook.Sheets['Nómina']
 assert.equal(sheet.H2.v,role.neto_recibir);assert.equal(sheet.H3.f,'SUM(H2:H2)')
 assert.equal(sheet.A2.t,'s');assert.equal(sheet.A2.v,employee.cedula)
 const bytes=XLSX.write(workbook,{type:'buffer',bookType:'xlsx'});assert.ok(bytes.length>1000)
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
