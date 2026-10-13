# Auditoría profunda de Finanzas — versión 604

Iniciada el 12 y cerrada el 13 de octubre de 2026, hora de Honduras. Base: v603, commit `949bc60124c4a302ae3372b7728cd1a6d4f66eea`.

## Alcance y criterio

Revisión funcional, estructural, contable y de persistencia de Gastos, Metas, reservas, pagos fechados, prioridades, reparto automático, plan de presupuesto, categorías propias, conversión USD/moneda secundaria, importación de respaldos y acoples con ganancias, Higher Rate y Logros. Se conserva el diseño aprobado de v603 y sus explicaciones de Sumar/Restar.

La reserva es una distribución virtual de las ganancias registradas. Un pago pertenece a su fecha y constituye un registro independiente: no reduce automáticamente la reserva ni modifica las llamadas. Liberar reserva conserva el historial. «Omitir reserva automática» excluye un gasto del reparto; no declara que esté pagado.

## Fallos reproducidos y correcciones

1. **Ajustes rechazados que seguían en memoria.** Reservar/devolver, reordenar, activar reparto, crear/editar/borrar categorías y crear/editar/mover/borrar filas podían sobrevivir a un guardado fallido y filtrarse al siguiente guardado. Se restaura el estado previo, incluidos objetos, listas y prioridades; la UI vuelve al estado real. La restauración nunca sustituye una configuración de otro propietario.
2. **Guardado parcial de tarifa y metas.** Dos escrituras separadas podían confirmar la tarifa sin confirmar su efecto sobre la meta y la planificación histórica. Se usa una sola escritura del snapshot completo, con reversión condicionada al propietario actual.
3. **Ledger anterior restaurado sobre otro propietario.** Un rechazo de creación/borrado de pago podía reinstalar el historial capturado en una configuración reemplazada durante el guardado. La reversión valida la referencia del propietario. El plan protege por separado sus propietarios de estado y ajustes.
4. **Confirmaciones con listas obsoletas.** Borrar una categoría podía mover una lista antigua; borrar una fila trasladada mientras el diálogo estaba abierto podía no encontrarla; borrar un pago ya retirado podía fallar. Se consulta el estado vigente al confirmar y se evita recrear registros inexistentes.
5. **Límite de un gasto aplicado demasiado tarde.** Pedir una cantidad mayor que el objetivo se rechazaba por saldo insuficiente aunque hubiera saldo para completar el gasto. Se limita primero al pendiente del objetivo y después se verifica el Disponible.
6. **Pendiente entre varias metas incorrecto.** El excedente de una meta reducía artificialmente lo pendiente de otra. Los totales suman el pendiente positivo de cada fila; las metas sobrecubiertas no ocultan necesidades ajenas.
7. **Prioridad falsa por filas antiguas de presupuesto cero.** Aparecían como el próximo destino del ingreso. Se excluyen del próximo pendiente y de la vista previa, conservando sus datos.
8. **Redondeo incorrecto de medios centavos.** Entradas como 10.075 podían quedar en 10.07. Se corrige la tolerancia de representación binaria en la entrada monetaria. Los presupuestos nuevos usan centavos y un mínimo de $0.01; editar solo el nombre de un presupuesto antiguo conserva su precisión original.
9. **Saldo visible imposible de asignar.** Bonos con fracciones de centavo podían mostrar un Disponible redondeado que el control rechazaba. El ajuste acepta esa cantidad visible y limita el traslado al saldo interno real; no inventa ingreso. El tooltip de reserva explica la precisión interna cuando corresponde. Se evita mostrar un cero negativo por residuo numérico.
10. **Conversión que borraba importes pequeños o producía infinito.** Cambiar de USD a una moneda con tasa 0.005 redondeaba $1 a una entrada cero. Se conservan los decimales necesarios y se expande la notación exponencial. Tasas/conversiones no finitas se rechazan antes de modificar ajustes o borradores. Rechazar la moneda restaura también los campos.
11. **Comparación mensual sin una base mensual.** Dos pagos de un presupuesto quincenal podían mostrarse como exceso indebido. Solo se calcula saldo pendiente/exceso para presupuestos explícitamente mensuales y comparables en centavos. Los demás conservan sus pagos por fecha, con explicación. El total evita comparar períodos mezclados o pagos de gastos eliminados.
12. **Respaldos financieros corruptos aceptados.** Se rechazan antes de modificar datos las reservas negativas/no finitas, objetivos inválidos, filas/pagos duplicados, fechas imposibles, estructuras incorrectas e identificadores de categorías ambiguos o peligrosos. Se conservan respaldos antiguos compatibles y pagos históricos de filas eliminadas.
13. **Reservas en categorías huérfanas invisibles.** Una categoría heredada sin definición podía consumir Disponible sin aparecer en la cola. Todas las categorías con filas se recorren, se normaliza la pertenencia de cada fila y las reservas vuelven a ser accesibles.
14. **Estimación opcional imposible de quitar y borradores ligados al mes de pagos.** Vaciar el plazo ahora elimina la estimación; cambiar de mes o pestaña conserva el borrador de la meta. Un rechazo conserva el plazo guardado y muestra el error.
15. **Bonos históricos concatenados como texto.** Dos bonos congelados de texto `2.50` podían concatenarse y falsear las ganancias disponibles. Se convierten explícitamente a números finitos no negativos; metadatos corruptos no aportan NaN, infinito ni importes negativos. Los registros originales no se reescriben.
16. **Premios por una exclusión automática sin reserva.** Logros interpretaba `manualPaid` como un gasto financiado. Los premios actuales comprueban la reserva real y describen «reserva completa». Una meta vacía tampoco obtiene un premio por tolerancia de redondeo. Se conservan claves históricas del ledger para evitar premios duplicados.
17. **Validación repetida de todo el historial por fila.** Se indexan y validan los pagos una sola vez por renderizado. Con 40 gastos y 400 pagos, el caso medido baja de 65.684 a 885 construcciones de Date. Es una medida del trabajo de validación de fechas, no una promesa de igual reducción en el tiempo total de la página. El índice se actualiza al renderizar, cambiar mes, historial o propietario.
18. **Estado de controles y feedback contradictorios.** Un guardado rechazado podía perder la selección Restar durante el redibujado; se conserva el sentido y el importe para reintentar. Los tooltips se cierran al reemplazar sus filas. El aviso global de almacenamiento lleno ya no promete conservar todo cambio en memoria; permite mostrar el error específico de una operación revertida. Liberar reserva y cambiar exclusión restauran sus controles y explican el rechazo.

## Regresión y simulación contable

`tests/finance-deep-audit.test.mjs` contiene 37 casos nuevos. Se agrega además una regresión de Logros; la suite completa pasa **621 pruebas, cero fallos y cero omitidas**, frente a las 583 de v603. Se actualizan los harnesses existentes para los nuevos contratos de módulo y guardado.

La simulación cubre **35 días de octubre a noviembre**, con un ledger de referencia independiente en centavos. Incluye ganancias y bonos reales del helper Higher Rate, gastos y metas en prioridad global, exclusiones, pagos fechados, asignación manual y automática, corrección/borrado de ingreso, liberación de reservas, cambio de presupuesto/categoría, cambio de moneda y recargas. Termina con 34 llamadas y 34 pagos después de sus borrados programados. Cada paso compara reservas, Disponible y totales mensuales contra el oráculo y verifica que repetir la cascada no duplique dinero.

Antes de reparar se reprodujeron los 13 fallos iniciales de la nueva suite; posteriormente se reprodujeron por separado las confirmaciones obsoletas, los bonos históricos y el exceso de validaciones de fechas. El navegador detectó además el aviso global contradictorio, que no aparecía en los mocks de toast.

## Pruebas interactivas y controles

Chrome con cuenta ficticia y servidor local controlado. Todas las peticiones externas se bloquean; la simulación del backend registra y confirma los snapshots enviados. Se prueban entradas, botones, confirmaciones y recargas de la app construida, sin escribir en la cuenta real.

- 17 comprobaciones de flujo: reservas en USD/L, Sumar/Restar, pagos parciales/completos/excedidos, meses, liberación, reparto/exclusión, edición del período, recarga y estimaciones.
- Comprobaciones adicionales de integridad: rechazo de escritura con cuota ficticia, UI/localStorage/backend intactos, reintento y recarga, checkbox revertido, plan inválido/revertido, borrador/plazo opcional, tasa 0.005, importación corrupta, categorías/movimientos, rechazo de pagos y respaldo antiguo válido.
- 24 vistas: Gastos/Metas, español/inglés, claro/oscuro, 1440/390/320 px, sin desbordamiento horizontal.
- Tooltips: puntero, significado del importe/reserva/moneda/acciones, foco por teclado, Escape y ajuste al viewport móvil. Se comprueba que abrirlos no modifica el dinero.

Inventario estructural de Finanzas: tabs; plan de horas/días/distribución y ayuda; selector de mes; reserva automática; prioridades; importe/moneda/signo/Aplicar; liberación; creación/edición/borrado de filas; categorías, emojis y color; pagos/fecha/borrado/exclusión; plazo/guardar estimación; modales y confirmaciones. Los checks generales verifican imports/exports, IDs, modales, listeners y helpers en 35 módulos y la matriz de 17 áreas, 57 suites y 58 fuentes. Esta matriz verifica contratos estructurales, no todas las combinaciones posibles de uso.

## Construcción y publicación

Pasan traducciones de **2.230 textos ES/EN**, build de app, puente y resumen, presupuestos de tamaño, diff sin errores y escaneo de secretos de archivos e historial sin hallazgos. Se publica mediante PR y el flujo Git de main. CI, Vercel READY y `/api/health.release` deben coincidir con el commit integrado; la evidencia de cierre se guarda aparte de este informe para no atribuir al build local una publicación no verificada.

## Límites comprobados

La prueba interactiva de persistencia usa un backend local controlado; no certifica una sesión OAuth real ni una caída de red contra la base alojada. No se modifican datos de clientes, tablas, políticas RLS o migraciones. La publicación pública verifica release y recursos, no una sesión autenticada de la cuenta de Jonathan. Las fechas/plazos describen registros y estimaciones; no son una garantía de depósito, una fecha límite ni un histórico automático de presupuestos mensuales.
