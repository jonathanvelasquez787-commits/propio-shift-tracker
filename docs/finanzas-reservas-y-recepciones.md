# Finanzas: reservas, pagos y recepciones

## Qué significa cada importe

- **Objetivo o presupuesto:** cuánto querés cubrir en la fila y el período que
  elegiste. Un período no crea pagos ni borra reservas automáticamente.
- **Reservado:** parte de tus ganancias apartada para esa fila. No prueba que
  hayas pagado un gasto ni recibido dinero de Propio.
- **Pendiente de reservar:** diferencia entre objetivo y reserva.
- **Pagado:** pagos de gastos registrados por vos con fecha. El resumen de pagos
  usa el mes seleccionado; los presupuestos semanales o puntuales no se comparan
  como si fueran mensuales.
- **Pago recibido del ciclo:** total que confirmás haber recibido de Propio.
  Se lleva aparte de las llamadas, las reservas y los pagos de tus gastos.

Todos los importes nuevos muestran la moneda secundaria configurada. Las tasas
por minuto conservan su presentación habitual.

## Reservar y liberar

Al activar el reparto, la vista previa muestra cuánto se reservará, cuánto queda
disponible y los destinos en su orden. Primero Gastos y luego Metas. Cancelar no
cambia el ajuste ni aparta dinero. La próxima llamada puede continuar el reparto.

Una asignación manual confirma el nombre de la fila y el importe aplicado.
«Ver reparto automático» conserva el último ajuste: importes positivos reservan;
negativos liberan después de una corrección de ganancias. No es un historial de
pagos ni una instantánea de los saldos actuales.

«Liberar reserva» anticipa cuánto vuelve a Disponible, el período y los pagos que
se conservarán. No borra la fila ni su historial. Si el reparto sigue activo,
puede volver a reservar en la próxima llamada; una fila de gasto permite omitir
la reserva automática. Un rechazo de almacenamiento conserva el estado anterior.

El resumen de Inicio identifica los pendientes como acumulados de Finanzas,
independientes del día activo.

## Registrar lo recibido

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

## Proponer una meta desde el plan

La confirmación compara meta actual y propuesta. El detalle plegado muestra
días por semana, cuatro semanas, tarifa base, proyección y distribución.
No incluye Higher Rate. Aplicar cambia la meta general y el plan, sin asignar
dinero ni registrar pagos. Conserva metas históricas de otros días y avisa si
retirará la excepción de hoy.

## Presentación y comprobación

La propuesta de Jornada, Reservas y Pago recibido fue aprobada el 20/10.
Usa resumen principal, detalles plegados y el mismo diseño adaptable en ambos
temas. La maqueta y las capturas de pruebas usan datos ficticios fuera de Git.

Los registros de recepción, la validación de respaldos y el informe de reparto
añaden lógica al paquete inicial: presupuesto revisado de 803 a 807 KB.
Los editores y sus explicaciones siguen bajo carga diferida, con presupuesto
de 80 a 100 KB. No se aumenta el límite de arranque ni de locales; las medidas
incluyen el SHA completo de producción.

Validación: 931 pruebas de la suite, comprobaciones de módulos, controles,
traducciones y criterios de producción. Dieciséis recorridos de la app compilada
en ES/EN, claro/oscuro y 320/390/768/1365 px; controles de conservación de pagos,
recepción y reapertura. Caso adicional de rechazo de almacenamiento con borrador
conservado. Capturas revisadas y corrección del botón de eliminar que antes
ignoraba visualmente su atributo oculto.

Las pruebas no comprueban depósitos bancarios ni las reglas oficiales de
facturación de Propio. Solo el usuario confirma una recepción real.
