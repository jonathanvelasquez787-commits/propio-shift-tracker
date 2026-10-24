# Finanzas: reservas y datos anteriores

## Finanzas simplificada (web 647)

El propietario aprobó el mock de simplificación el 24/10. La vista muestra
Disponible, siguiente prioridad y Gastos/Metas. Cada fila presenta Reservado,
Objetivo y progreso; los ajustes y acciones de edición/borrado quedan plegados.
Todos los montos incluyen la moneda secundaria configurada.

Se retiran de la interfaz el planificador de presupuesto y 50-30-20, los pagos
mensuales y su historial, y las estimaciones de aportes por meses. No hay una
migración destructiva: financePayments, financePlanning, savingsMonths y los
descriptores anteriores de las filas se conservan en ajustes y respaldos.
Editar nombre/objetivo ya no modifica período ni comportamiento del importe.
Las metas diarias se siguen administrando desde Ajustes.

Reservar aparta ganancias; no representa un pago ni un depósito bancario.
El disponible sigue siendo ganancias menos reservas. Las reservas no se
reinician al cambiar el mes. Sumar aparta; Restar devuelve al Disponible.
La entrada conserva USD/moneda secundaria y su confirmación Aplicar ajuste.

El reparto sigue el orden de Gastos y luego Metas, con sus flechas de prioridad.
La siguiente prioridad también muestra la primera Meta pendiente cuando los
Gastos están completos. Activar el reparto conserva su vista previa protegida
contra cambios de cuenta o datos; un guardado rechazado restaura lo anterior.

Omitir reserva automática permanece en el detalle de cada Gasto, incluido si
ya estaba excluido. Liberar reserva conserva la fila y todos los datos previos;
si sigue activo el reparto, una nueva llamada puede volver a reservar.

El resumen de Inicio continúa mostrando pendientes acumulados de Finanzas,
independientes del día activo. Fechas de pago conserva la presentación 631.

## Fechas de pago y recepciones anteriores

Desde web 646, el propietario pidió recuperar la presentación compacta de la
631. Fechas de pago vuelve a mostrar la próxima fecha, el ciclo actual y la
lista con fechas a la derecha. Se retiraron de esa vista los botones de
registrar/editar recibido y la comparación de importes. No se borran datos de
recepción anteriores: siguen incluidos en el respaldo JSON y su validación.
Una fecha pasada no se marca recibida automáticamente; el indicador recibido
solo se usa si ya existía un registro válido.

El siguiente bloque describe el funcionamiento anterior, conservado para
interpretar esos respaldos; ya no es una instrucción de la interfaz actual.

En Fechas de pago, una fecha pasada no se considera pagada por sí sola.
«Registrar recibido» solicita total en USD y fecha real. Si hubo varios abonos,
ingresá el total acumulado y la fecha del último: existe un registro por ciclo.
Editar conserva su identidad; eliminar este registro no elimina llamadas.

El esperado suma las llamadas del ciclo según sus días contables y sus bonos
registrados. El recibido queda fijo; al corregir una llamada cambia la diferencia,
sin inventar otra recepción. Cambiar el ancla no elimina los registros de otros
ciclos: siguen disponibles en el historial.

Una fecha futura, una cuenta reemplazada o una recepción modificada mientras el
editor estaba abierto impiden guardar datos obsoletos. Si falla el guardado,
el borrador permanece abierto. Datos previos inválidos se conservan para revisión
en vez de sustituirse silenciosamente.

## Compatibilidad y validación

Los módulos de compatibilidad conservan la validación de datos históricos y
pruebas del formato anterior. Sus controles de creación ya no se conectan a
la interfaz. La aprobación de este cambio no altera llamadas ni ganancias.
