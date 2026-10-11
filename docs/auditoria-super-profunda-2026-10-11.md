# Auditoría integral del 11 de octubre de 2026

La revisión encontró ocho grupos de fallos reproducibles y los corrigió. La base
anterior pasaba 436 pruebas: estos casos escapaban a esa cobertura. La versión
corregida pasa 452 pruebas, los contratos de 33 módulos, el wiring de controles,
las traducciones ES/EN y el build con presupuestos de tamaño. La publicación se
realiza mediante PR, CI y la rama protegida; la evidencia final de despliegue se
conserva fuera de Git para no publicar información de la cuenta del propietario.

## Hallazgos corregidos

| ID | Prioridad | Reproducción y causa | Corrección y regresión |
|---|---|---|---|
| SA01 | P1 | Una pestaña conserva llamadas antiguas; otra guarda una llamada nueva. `saveAll` consultaba la revisión pero ignoraba el resultado y reemplazaba el historial reciente. | Los guardados completos y parciales rechazan revisiones locales antiguas y explican que hay que recargar. Pruebas con almacenamiento compartido: la llamada externa y las tres claves quedan intactas. |
| SA02 | P1 | La nube tiene una revisión nueva y una llamada adicional; la copia local divergente está marcada como pendiente. Compartir `device_id` hacía elegir automáticamente la copia local. Las pestañas de un navegador comparten esa identidad. | Una identidad de navegador ya no demuestra que una copia sea más reciente. La divergencia requiere resolución de conflicto; la igualdad de contenido y las revisiones conocidas mantienen sus recorridos normales. Prueba de reabrir sin escrituras ni pérdida de la llamada nueva. |
| SA03 | P2 | Con meta general de 250,7 min y una excepción de 90 min visible, cambiar la tarifa a 0,20 reemplazaba la meta general por 90 y eliminaba la excepción. | La tarifa recalcula los dólares desde los minutos generales guardados, conserva las excepciones y congela el historial anterior. Prueba de 50,14 dólares generales, excepción intacta y recarga. |
| SA04 | P2 | Un valor finito de `1e308` desbordaba al dividirse por la tarifa o multiplicarse por los minutos. JSON convertiría `Infinity` en `null`. | Validación de los resultados, además de las entradas. Se rechaza el desbordamiento sin abrir el diálogo de alcance ni guardar una tarifa inválida. |
| SA05 | P1 | Asignar `12,50` en Finanzas se interpretaba como 1250. Texto como `1e3` o `12abc50` se convertía silenciosamente en otro importe. La moneda secundaria compartía el parser antiguo. | Parser estricto exclusivo de las entradas de asignación: coma o punto decimal, agrupación válida y resultados finitos. Ambos campos y Aplicar comparten la interpretación. Se conserva el parser de pagos importados para no alterar identidades/deduplicación antiguas. Pruebas de sumar, restar, agrupación y rechazo de texto ambiguo o mal formado. |
| SA06 | P2 | Un respaldo con `calls:[null]` superaba la validación; normalizarlo fallaba después de reemplazar el estado en memoria. | Se rechazan registros que no sean objetos y se normalizan estado y llamadas antes de sustituirlos. Pruebas de null, listas, números, texto y error de normalización sin cambios parciales. Los formatos antiguos válidos siguen admitidos. |
| SA07 | P2 | Importar JSON anunciaba «restauradas» aunque `saveAll` hubiera rechazado el guardado. | La importación devuelve el resultado real y mantiene el aviso de fallo, sin éxito falso. Prueba del handler con una escritura rechazada. |
| SA08 | P2 | Otros controles de llamadas, turnos, pausas, horario, calendario, ajustes y Finanzas continuaban hacia avisos de éxito o recompensas después de fallar la escritura. | Propagación explícita de `false` antes de esas acciones posteriores. Regresiones de llamadas manuales/en vivo, cierre de pausa con guardado completo/parcial, eliminación de excepción diaria, edición de meta del ciclo y notas del calendario. Sin premio ni éxito tras el rechazo; la cobertura mensual y de gamificación sigue pasando. |

## Contabilidad, calendario y acoples

La simulación cronológica de 31 días ejecuta las funciones reales con un libro
independiente: pegado, llamadas manuales y en vivo, correcciones a cero, reemplazo
de llamadas en vivo, duplicados, borrado, metas y recargas. Conserva 161 puntos
de reconciliación, 72 llamadas finales, 31 snapshots diarios y 31 exportaciones
contables reconciliadas. No es una sesión humana de un mes ni una simulación de
una función ficticia que repita el cálculo de producción.

Además pasan 17.000 casos deterministas independientes de hitos monetarios,
intervalos de trabajo, Higher Rate y cascadas financieras. Se cubren fronteras
de fecha, sesiones superpuestas, pausas, llamadas fuera del turno, días libres
con actividad, finanzas sin sobreasignación, correcciones históricas, bonos
congelados, recibos idempotentes y conservación del progreso al desactivar
Logros. Las exportaciones incluyen períodos de dos años, más allá del día 400.

Las cuentas nuevas conservan la plantilla de lunes a viernes 06:00–14:00,
siete bloques y metas productivas 120 + 120 + 60 + 60 = 360 min. Sábado y domingo
son libres. Cargar una cuenta existente conserva su configuración.

## Interfaz y persistencia

Se usa el build real servido por un backend local aislado, una cuenta ficticia
y dos orígenes con almacenamiento independiente. No se envían llamadas de prueba
a producción. Se verificaron estos resultados visibles:

- Meta especial de 91 min conservada al cambiar la tarifa a 0,20; general de
  360 min con 72 dólares. El historial previo sigue independiente.
- Una llamada futura se rechaza. Una llamada válida de 100 min genera
  20 dólares y aparece en los cálculos del día y de Finanzas.
- Asignación de `12,50`: 12,50 dólares asignados y 7,50 disponibles de un total
  de 20. Se devuelve y reasigna el importe usando `335,00` de moneda local.
- Desplazar el lunes 15 min conserva siete bloques y sus duraciones; se guarda
  06:15–14:15. La recarga y la segunda sesión reciben ese horario y la asignación.
- Inicio, Horario, Reportes, Fechas de pago, Calendario, Finanzas y Logros se
  comprueban a 1365 y 390 px sin overflow horizontal del documento. En 390 px
  se usó activación por teclado; no se certifican gestos en un teléfono físico.
- Exportación JSON real de la cuenta ficticia, rechazo de `calls:[null]` desde
  el selector de archivos y restauración del JSON válido con confirmación.
  Después de recargar permanecen la llamada, la meta, la tarifa y la asignación
  financiera. Los fallos de escritura también se prueban con los handlers reales.

La revisión estructural verifica IDs, modales, rutas, listeners directos y
delegados, helpers e imports/exports. No significa que se hayan pulsado
manualmente todas las combinaciones posibles de controles.

## Seguridad y operación alojada

Las comprobaciones públicas vuelven a pasar 18/18: Google habilitado, Email y
acceso anónimo deshabilitados, acceso sin sesión denegado a las tablas de cuenta
y RPC de sincronización, rutas privadas ausentes, redirección a HTTPS, cuerpos
de login limitados y operaciones/borrado sin credenciales rechazados.

Se revisaron las nueve tablas públicas con RLS, las políticas por `auth.uid()` y
los privilegios reales de tablas y funciones. Las tablas operativas no tienen
acceso del cliente; los RPC de administración son exclusivos del servicio.
`wipe_my_data` deriva el propietario de Auth y `username_available` devuelve
disponibilidad, sin exponer correos ni filas completas. La API de borrado obtiene
el usuario desde el token verificado, sin aceptar un propietario del cuerpo.

`production_readiness` y `operations_readiness` confirman backups, retención,
permisos privados y operación reciente. Producción y el ensayo alojado contienen
nueve migraciones. Los avisos informativos de RLS sin políticas en tablas
privadas corresponden a denegación deliberada; las advertencias sobre las dos
funciones de cliente se contrastaron con sus cuerpos y permisos. Email permanece
deshabilitado por decisión expresa del propietario; SMTP y protección de
contraseñas de Email no se presentan como tareas pendientes.

Se revisan límites persistentes de login/telemetría, redacción de diagnósticos,
validación de cuerpos, protección contra lectura cruzada, cuotas, timeout,
backups cifrados, aislamiento de cuentas y guardados con revisión esperada.
No se añadieron dependencias. `pnpm audit --audit-level high` no encontró
vulnerabilidades conocidas; el escáner de credenciales no encontró coincidencias
en 1219 archivos/blobs del árbol y la historia antes del nuevo commit. Ambos son
controles con alcance conocido, no una prueba de ausencia absoluta de secretos
o vulnerabilidades.

## Incidente de integridad investigado

La inspección encontró una revisión de cuenta posterior a la recuperación
anterior con menos datos que la copia conservada. Los logs muestran escrituras
autenticadas de `push_user_data_v2` desde el origen público de la aplicación.
El propietario confirmó que no había solicitado reinicio ni importación.

Se corrigieron dos mecanismos de sobrescritura reproducibles descritos en SA01
y SA02. Esa reproducción demuestra el riesgo; los logs disponibles no demuestran
cuál de ellos originó exactamente la revisión histórica. Se recuperó la copia
cifrada verificada mediante una transacción que exige la revisión observada y
el estado esperado, conserva el snapshot diario previo y comprueba todo el
contenido antes del commit. No se modificaron identidades, credenciales ni Auth.
Los detalles de la cuenta y los respaldos se conservan fuera del repositorio.

## Límites explícitos

- Sólo hay una cuenta Google real disponible. El aislamiento entre propietarios
  se prueba con PostgreSQL y políticas reales más identidades sintéticas; no se
  afirma haber iniciado sesión con dos personas Google distintas.
- Las pruebas de la interfaz usan un backend local controlado. La base alojada,
  permisos, recuperación y endpoints públicos se verifican aparte. No se afirma
  haber probado cada edición contra producción desde dos teléfonos.
- Los ensayos de capacidad de 10.000 llamadas y carga pública acotada pertenecen
  a la revisión anterior; no se repitieron ni se presentan como resultados nuevos.
- El service worker se prueba automáticamente. El servidor local de interfaz
  no instala un service worker: no certifica una sesión móvil real sin red.
- No se midió un RTO completo que incluya creación de infraestructura y DNS.
  La recuperación de contenido verificada no equivale a ese tiempo total.
- El monitor de Codex depende del equipo y de la app disponibles. Las copias
  externas diarias tienen su intervalo de copia; no se promete pérdida máxima
  de datos cero ni vigilancia local continua con el equipo apagado.

Referencias de los criterios de permisos: [RLS de Supabase](https://supabase.com/docs/guides/database/postgres/row-level-security)
y [funciones definer ejecutables por clientes](https://supabase.com/docs/guides/observability/advisors?queryGroups=lint&lint=0029_authenticated_security_definer_function_executable).
