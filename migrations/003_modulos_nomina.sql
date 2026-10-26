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
