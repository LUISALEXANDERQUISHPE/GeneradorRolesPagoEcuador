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

-- ESCALAS SALARIALES Y RÉGIMEN
BEGIN;
ALTER TABLE empresa ADD COLUMN IF NOT EXISTS regimen_laboral text NOT NULL DEFAULT 'codigo_trabajo'
 CHECK (regimen_laboral IN ('codigo_trabajo','losep','loep','loei','loes','especial'));
-- @statement
CREATE TABLE IF NOT EXISTS escalas_salariales (
 id uuid PRIMARY KEY,
 codigo varchar(30) NOT NULL CHECK (length(trim(codigo))>0),
 descripcion varchar(180) NOT NULL DEFAULT '',
 sueldo numeric(12,2) NOT NULL CHECK (sueldo>0),
 regimen text NOT NULL CHECK (regimen IN ('codigo_trabajo','losep','loep','loei','loes','especial')),
 activo boolean NOT NULL DEFAULT true,
 UNIQUE(regimen,codigo)
);
-- @statement
ALTER TABLE empleados ADD COLUMN IF NOT EXISTS escala_id uuid REFERENCES escalas_salariales(id) ON DELETE RESTRICT;
-- @statement
ALTER TABLE empleados ADD COLUMN IF NOT EXISTS escala_codigo varchar(30);
-- @statement
CREATE INDEX IF NOT EXISTS empleados_escala_idx ON empleados(escala_id);

COMMIT;
