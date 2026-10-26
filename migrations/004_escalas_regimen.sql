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
