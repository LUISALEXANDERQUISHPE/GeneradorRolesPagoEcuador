# Alcance confirmado: empresa privada bajo Código del Trabajo

## Requisito del usuario

Solo Código del Trabajo de Ecuador. No implementar LOSEP ni selector de régimen. La aplicación es para una empresa privada.

## Tipos de rol que debe incluir el módulo de generación

1. Rol mensual de remuneraciones.
2. Rol específico de pago del décimo tercer sueldo acumulado.
3. Rol específico de pago del décimo cuarto sueldo acumulado.

Cada empleado tendrá dos decisiones independientes:
- Décimo tercero: mensualizar / acumular (no mensualizar).
- Décimo cuarto: mensualizar / acumular (no mensualizar).

La región laboral determinará el calendario del décimo cuarto. No inferirla solo por la ubicación del computador o domicilio de la empresa.

## Requisitos incorporados a la implementación

- Guardar vigencia de las modalidades y la solicitud de acumulación para no reinterpretar retroactivamente meses anteriores al cambiar una opción.
- Registrar período de devengo, tipo de beneficio, fecha de pago, región, base de cálculo y valores ya pagados.
- Excluir del saldo acumulado los valores ya abonados mensualmente o mediante un rol de beneficio anterior.
- Separar los roles de beneficios de la restricción actual de un rol mensual por empleado. Preparar una migración sin borrar roles existentes; no basta con eliminar la restricción única.
- Impedir duplicados por empleado, beneficio y período, incluyendo la regeneración de un rol anulado.
- Conservar el detalle de los meses utilizados, proporciones por ingreso/salida y saldos iniciales documentados si falta historia previa. No tratar meses sin información como cero automáticamente.
- Evaluar cada beneficio con su base legal; no aplicar automáticamente los descuentos del rol mensual a los décimos.
- Emitir vista previa, PDF, consolidado e historial identificando el tipo de rol.
- La modalidad acumulada no suma efectivo al neto del rol mensual; su pago se documenta con el rol específico.
- Revisar reglas y períodos vigentes del Código del Trabajo al implementar el motor. No trasladar a esta empresa instrucciones particulares para servidores públicos ni adelantos excepcionales de otro año.

## Fuentes oficiales consultadas

- [Ministerio del Trabajo: obligaciones del empleador, MDT-2023-140](https://www.trabajo.gob.ec/wp-content/uploads/downloads/2024/01/MDT-2023-140-AM-Obligaciones-empleador-y-procedimientos-de-inspeccion-14-11-23-signed.pdf).
- [Preguntas frecuentes del sector privado](https://www.trabajo.gob.ec/preguntas-frecuentes-sector-privado/).
- [Comunicado MDT-2025-164](https://www.trabajo.gob.ec/ministerio-del-trabajo-expide-los-lineamientos-para-el-pago-de-la-decima-tercera-remuneracion-o-bono-navideno-2025/): contiene medidas particulares de 2025 y distinción público/privado; no convertirlas en una fecha permanente del sistema.

## Estado

Implementados empleados, modalidades por vigencia, roles mensuales y de décimos, respaldo de meses faltantes, versiones, anulación y exportaciones. Consulta README.md para el uso y los límites de la versión actual.
