# Nómina Ecuador · Empresa privada

Aplicación Vue 3 + Vite, Composition API, Vue Router, Pinia y Tailwind. Conexión directa a PostgreSQL en Neon; cálculos en el navegador. Cálculo habilitado: Código del Trabajo. El catálogo de ajustes permite registrar otros regímenes; su cálculo específico aún no está implementado.

## Módulos disponibles

- **Empleados:** registrar, editar, buscar, filtrar, paginar, inactivar y eliminar si no tienen roles. Valida cédula con módulo 10. Registra fechas, sueldo, cuenta, cargo, departamento, región laboral, fondos de reserva y modalidad independiente de cada décimo.
- **Configuración:** empresa, logo, colores, SBU, porcentajes IESS/fondos/recargos, días base y jornada. Marca local para evitar el parpadeo inicial; sincronización con Neon.
- **Generación:** rol mensual individual o de todos los activos; horas, comisiones, bonos, anticipos, préstamos y descuentos descritos. Vista previa antes de guardar. Roles específicos de décimo tercero y cuarto acumulados.
- **Historial:** filtros por año, mes, empleado, tipo y estado; detalle, PDF, edición con datos históricos, regeneración con datos actuales, anulación con motivo y versiones anteriores.
- **Reportes:** PDF individual con logo, desglose y firmas; PDF y Excel consolidados por período. Se excluyen anulados. Los archivos se generan localmente.
- **Dashboard:** neto mensual, empleados activos y aporte IESS personal + patronal.

## Ejecutar localmente

Requiere Node.js 22.12 o posterior.

1. Abre una terminal en esta carpeta.
2. Ejecuta `npm ci`.
3. En una base nueva, ejecuta todo `schema.sql` en SQL Editor de Neon con el propietario.
4. Solo si no tienes archivo `.env`, copia `.env.example` como `.env` y configura `VITE_DATABASE_URL`.
Para actualizar una instalación anterior ejecuta también `npm run db:migrate:scales` (migración 004).

5. Ejecuta `npm run dev` y abre http://127.0.0.1:5173/.
6. En Configuración, completa empresa y SBU y guarda.
7. En Empleados, registra al equipo.
8. En Generar roles, selecciona tipo, período y empleado; completa valores, calcula y revisa antes de guardar.

En PowerShell puedes utilizar `npm.cmd` si la política impide ejecutar npm.ps1. Cambiar .env requiere reiniciar Vite.

### Base existente de las primeras entregas

Las migraciones ya se aplicaron a la base conectada durante este trabajo, conservando los registros existentes. En otra base anterior ejecuta:

```powershell
npm run db:migrate:theme
npm run db:migrate:payroll
```

Alternativamente, ejecuta los archivos de migrations/ en SQL Editor. La migración 003 agrega región e historial de modalidades, tipos de rol, revisiones y relaciones entre décimos y roles fuente. Sustituye la unicidad mensual por unicidad empleado/tipo/período y una restricción adicional de beneficio/año.

Las funciones SQL guardar_rol y anular_rol mantienen atomicidad, versiones y restricciones; no calculan la nómina ni son un backend propio. Usa consultas parametrizadas con @neondatabase/serverless.

## Comandos

```powershell
npm run dev
npm test
npm run build
npm run preview
npm run test:db
```

`test:db` necesita acceso a Neon. Crea datos sintéticos dentro de transacciones que se abortan deliberadamente y verifica que no queden registros. No utiliza empleados reales.

Para reconstruir desde otra carpeta:

```powershell
npm create vite@latest roles-de-pago -- --template vue
cd roles-de-pago
npm install vue@^3.5.22 vue-router@^4.6.0 pinia@^3.0.3 @neondatabase/serverless@^1.0.0 @lucide/vue@^1.61.0 jspdf@^4.0.0 jspdf-autotable@^5.0.2
npm install https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz
npm install -D vite@^7.1.7 @vitejs/plugin-vue@^6.0.1 tailwindcss@^4.1.13 @tailwindcss/vite@^4.1.13
```

Copia los archivos completos entregados y ejecuta npm install. En este proyecto package-lock.json fija las versiones verificadas.

## Uso de los décimos

El décimo tercero y el cuarto tienen decisiones independientes por empleado. Mensualizar suma el beneficio al rol mensual. Acumular lo registra informativamente y lo paga con el rol específico.

- Décimo tercero: período del 1 de diciembre anterior al 30 de noviembre del año de pago; fecha ordinaria hasta el 24 de diciembre.
- Décimo cuarto Costa/Insular: 1 de marzo anterior al último día de febrero; fecha ordinaria hasta el 15 de marzo.
- Décimo cuarto Sierra/Amazonía: 1 de agosto anterior al 31 de julio; fecha ordinaria hasta el 15 de agosto.
- Para generar un décimo, selecciona el año de pago y el empleado. La región laboral determina el período del cuarto.
- El tercero usa remuneración computable/12. El cuarto acumulado usa el SBU del año de pago y los días pendientes del período: SBU/360 × días. Confirma el SBU al generar años anteriores.
- Se excluyen los meses ya mensualizados. Para meses sin rol, debes completar valores históricos, pagos previos y una referencia documental; no se asume cero.
- Un período todavía abierto no se liquida como anual, salvo que exista fecha de salida que cierre el devengo.
- Una solicitud escrita respalda la acumulación. Registra su referencia y el mes de vigencia en el empleado. El formulario conserva el historial; registrar una fecha no sustituye la validez de la solicitud según la normativa.
- Si cambias modalidades, los roles existentes mantienen sus snapshots. La nueva vigencia debe ser posterior al último rol mensual emitido.
- Un décimo emitido bloquea modificaciones a sus meses fuente, incluso meses declarados por respaldo histórico. Anula primero el décimo, corrige los meses y luego regenera.

No se agrega automáticamente IESS personal/patronal a los décimos. Tampoco se les trasladan descuentos del rol ordinario.

Fuentes: [Código del Trabajo, arts. 111–114](https://www.trabajo.gob.ec/wp-content/uploads/downloads/2024/01/CODIGO_DEL_TRABAJO.pdf), [MDT-2023-140](https://www.trabajo.gob.ec/wp-content/uploads/2024/01/MDT-2023-140-AM-Obligaciones-empleador-y-procedimientos-de-inspeccion-14-11-23-signed.pdf), [glosario oficial de períodos](https://www.trabajo.gob.ec/wp-content/uploads/2020/Indicadores/GlosarioDecimos.pdf).

## Criterios del rol mensual

- Sueldo proporcional: sueldo/días base × días trabajados.
- Valor hora: sueldo/días base/horas de jornada.
- Extras: cantidad × valor hora × (1 + recargo/100).
- Base de aportación: sueldo proporcional + extras + comisiones y bonos remunerativos.
- Décimo tercero mensual: base remunerativa/12.
- Décimo cuarto mensual: SBU/12 × días trabajados/días base.
- Fondos desde el segundo año. Cuando el aniversario cae dentro del mes, se prorratea la base; se ofrece una base manual para indicar la remuneración exacta del tramo elegible.
- Los egresos incluyen IESS personal, anticipos, otros préstamos IESS, quirografarios y descuentos descritos.
- El aporte patronal y las acumulaciones son informativos.
- Se redondea cada rubro a centavos y luego se suman los totales. Los egresos no pueden superar los ingresos.
- El recargo inicial solicitado de suplementarias es 25%. La configuración muestra la advertencia del [Ministerio del Trabajo sobre 50% para suplementarias diurnas y 100% para extraordinarias](https://www.trabajo.gob.ec/5-cual-es-la-jornada-maxima-de-trabajo-para-el-personal-sujeto-al-codigo-del-trabajo-y-cuando-procede-el-pago-por-horas-suplementarias-y-extraordinarias/). Revisa los valores antes de utilizar la nómina.

El alcance es nómina ordinaria bajo Código del Trabajo y décimos. No calcula automáticamente impuesto a la renta, finiquitos completos, vacaciones, utilidades ni modalidades especiales de jornada; un descuento calculado externamente puede registrarse con descripción.

## Historial y exportaciones

Editar conserva empleado, empresa y parámetros históricos. Regenerar toma los datos actuales y solicita revisar la vista previa. Ambas operaciones crean una nueva versión; anular también archiva la anterior. No hay eliminación de roles.

El consolidado usa el mes de período del rol, no la fecha efectiva de transferencia. Un rol emitido documenta un cálculo, no realiza pagos bancarios. Los PDF individuales usan el logo histórico guardado con el rol. El consolidado usa los datos actuales de empresa.

Los listados evitan descargar el logo repetido de cada rol; el documento individual lo carga al exportar. La paginación y filtros son del lado del navegador, apropiados para el alcance de pequeña empresa.

## Estructura

- src/db/client.js: cliente Neon, query y transacciones parametrizadas.
- src/db/repositories/: empresa/parámetros, empleados y roles.
- src/services/nominaService.js: cálculos mensuales, períodos y décimos.
- src/services/exportService.js: PDF y Excel.
- src/stores/: estado de configuración, conexión, empleados y avisos.
- src/components/: navegación, tablas, modales, campos y vista previa de roles.
- src/views/: pantallas completas.
- src/utils/: cédula, fechas/formato, colores y caché de marca.
- migrations/: ampliaciones compatibles.
- scripts/: instalación de ampliaciones y comprobación transaccional.
- tests/: casos locales.
- schema.sql: esquema completo para crear la aplicación desde cero.
- docs/CODIGO_COMPLETO.md: todos los archivos de código actuales, sin omisiones. package-lock.json se entrega en la raíz, separado del documento por ser generado.
- Los documentos ENTREGA_01, CONFIGURACION_CODIGO y ARRANQUE_CODIGO son entregas anteriores; usa CODIGO_COMPLETO para reconstruir la versión actual.

## Verificación

- Compilación de producción y pruebas locales de cédula, cálculo mensual, décimos, descuentos, períodos, exportaciones, configuración y caché.
- Seis comprobaciones transaccionales en Neon: guardar/editar/anular/regenerar, duplicados, versión obsoleta, protección de fuentes, protección de meses liquidados y liberación tras anulación.
- Confirmado que las pruebas de integración no dejaron empleados ni roles sintéticos.
- La inspección visual automática del navegador estuvo bloqueada por su política de acceso. No se presenta la revisión visual como realizada.

## Advertencias de seguridad

VITE_DATABASE_URL es accesible para quien use la aplicación. .env y .gitignore impiden publicar el archivo accidentalmente, pero no ocultan credenciales en el navegador o en dist/. Limita el uso a un entorno local/interno de confianza y una base dedicada. No compartas una compilación con credenciales reales.

Ejecuta el esquema con el propietario; utiliza para la app un rol con permisos mínimos necesarios sobre las tablas, secuencia de revisiones y funciones. El frontend no ofrece aislamiento entre usuarios ni sustituye controles de acceso.

Para migrar a una API intermedia, mueve las consultas al servidor, guarda DATABASE_URL solo allí, añade autenticación y autorización y recalcula/valida la nómina antes de guardar. El frontend podrá conservar sus pantallas y vistas previas.

La caché local solo guarda nombre, logo y colores, separada por base; no guarda credenciales ni datos de nómina.

## Referencias técnicas

- [Neon serverless](https://neon.com/docs/serverless/serverless-driver)
- [Tailwind con Vite](https://tailwindcss.com/docs/installation/using-vite)
- [Distribución oficial de SheetJS](https://docs.sheetjs.com/docs/getting-started/installation/nodejs/)


## Escalas salariales y régimen laboral
En Configuración selecciona el régimen laboral y guarda. El catálogo incluye Código del Trabajo, LOSEP, LOEP, LOEI, LOES y otro régimen especial. La existencia de estas opciones no implica que sus cálculos estén implementados: solo Código del Trabajo habilita la emisión. Los demás requieren determinar las reglas del personal concreto, aportaciones, jornadas y beneficios; no se reutilizan automáticamente las fórmulas privadas.

En Configuración → Escalas salariales registra código (A1, B1, etc.), descripción, sueldo y régimen. No se incluyen sueldos inventados: falta el documento del usuario. En Empleados selecciona la escala para asignar su sueldo. Sin escala puedes ingresar sueldo individual.
Editar una escala no modifica empleados ni roles anteriores. Para actualizar un empleado ya asignado usa Aplicar sueldo actual de la escala y guarda. Las escalas inactivas conservan asignaciones anteriores y no admiten nuevas. El rol conserva el código y sueldo en su instantánea, visible en la vista previa y PDF.

El fondo de reserva se genera desde el aniversario del primer año de ingreso para el mismo empleador. La ficha indica la fecha y el rol los días con derecho; se prorratea el mes del aniversario. Ejemplo: ingreso 16/06/2025, inicio 16/06/2026. Antes de esa fecha el fondo es cero, incluso si se introduce una base manual. La opción recibir/acumular determina el destino, no adelanta el derecho.
Fuente: [IESS: fondos de reserva](https://www.iess.gob.ec/web/afiliado/fondos-de-reserva).
