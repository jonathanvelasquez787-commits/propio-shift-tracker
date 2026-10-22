# Historial y recuperación de llamadas

App 628 inicia la fase 3 del plan y completa el punto 21. La extensión
permanece en 2.2.10; esta entrega corresponde a la aplicación web.

## Uso

En Bloques del día → Llamadas, «Historial de cambios» muestra ediciones,
eliminaciones individuales y vaciados de llamadas del día. Abre en
«Recuperables»; «Todos» incluye los cambios ya recuperados y los que tienen
una versión posterior o conflicto. Los detalles se mantienen plegados.

«Ver antes y después» compara duración, pago base, facturación y llamada
caída, además del total con bono que quedó registrado al hacer el cambio.
Todos los importes llevan moneda secundaria cuando está configurada.

«Deshacer edición» o «Recuperar llamadas» prepara una vista previa. Solo
«Confirmar recuperación» aplica sus importes. Cancelar conserva los datos.
Las ganancias, Finanzas y Logros se actualizan con las llamadas resultantes;
no se emite el sonido de una nueva llamada ni se duplica su pago.

## Protección

- El registro anterior y el cambio se guardan en el mismo snapshot completo.
  Si guardar se rechaza o interrumpe, vuelven las llamadas, bonos, historial
  y asignaciones anteriores. El editor permanece abierto si editar falla.
- Deshacer una edición exige que la llamada siga siendo la versión guardada.
  Una corrección posterior de Propio no se reemplaza desde una vista vieja.
- Recuperar una eliminación verifica identidad, duplicados y superposiciones,
  incluyendo una llamada activa. Si parte de un vaciado ya volvió a entrar,
  se bloquea la recuperación completa del lote para evitar resultados parciales.
- Nuevas llamadas distintas y nuevas acciones del turno permanecen. La
  recuperación no restaura una copia antigua de todo el día ni del juego.
- La confirmación se vincula a las llamadas, ajustes, historial y cuenta
  revisados. Se comprueban de nuevo al aplicar; no se puede confirmar dos veces.
- Vaciar llamadas conserva turnos, pausas, horario y acciones. Su confirmación
  se invalida si la cuenta o las llamadas seleccionadas cambian entretanto.

## Conservación y límites

El historial vive en `state.callRecovery`, dentro de los datos de la cuenta,
su sincronización y su respaldo JSON. No utiliza un registro global de otras
cuentas ni otra base de datos. Mantiene hasta 50 cambios durante hasta 30 días,
con un máximo de 384 KiB: al alcanzar un límite salen los más antiguos. Una
operación individual que supera ese espacio se rechaza conservando las llamadas.
Antes de guardar también se comprueba el límite existente de estado sincronizable.

La conservación empieza con esta versión. No reconstruye eliminaciones
anteriores ni reemplaza un respaldo completo. Las mejoras posteriores de
reinicio y restauración, puntos 67/69, se publicaron en web 629; ver
[actividades y respaldos](recuperacion-actividades-y-respaldos.md). La extensión puede volver a
recuperar una fila oficial eliminada; el historial la reconoce y evita duplicarla.

## Validación

879 pruebas completas, build y presupuestos. Trece regresiones nuevas cubren
recarga, bonos conservados, llamadas posteriores, versiones corregidas,
actividad nueva, traslapes, duplicados de cero minutos, límites de retención,
rechazo/interrupción, presupuesto, cuenta/revisión y doble confirmación.
Las simulaciones existentes de 31 días y de 42 días con febrero bisiesto
usan los handlers reales y siguen comprobando contabilidad y persistencia.

Chrome aislado con app compilada y backend ficticio: 16 recorridos ES/EN,
claro/oscuro, 320/390/768/1365 px. Cancelar, borrar, revisar antes/después,
recuperar, editar/deshacer, vaciar/restaurar y recargar conservan llamadas,
bonos y actividades. Pruebas adicionales interrumpen la descarga del detalle
y fuerzan un error de cuota de almacenamiento; se conserva la llamada y el
reintento funciona. No se modificó la cuenta humana ni llamadas reales.

La lógica de recuperación y su interfaz se cargan en el módulo de detalle.
Su presupuesto pasa de 30 a 50 KB; los presupuestos iniciales se conservan.
La precarga offline y el identificador de publicación siguen compartidos.

Sigue el punto 22: descarte de llamada accidental. Continúan después 26/27,
47, 67 y 69, sin cerrar el resto de la fase por esta entrega.
