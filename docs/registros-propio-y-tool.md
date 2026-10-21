# Propio y el respaldo observado

El diseño y la separación de registros se aprobaron el 21/10/2026. La web
conserva dos fuentes vinculadas a una sola llamada; la extensión 2.3.1 ya
transmite los instantes observados y no necesita cambiar para esta entrega.

## Datos y prioridades

- Una llamada live conserva inicio y fin ISO con milisegundos, `durationMs`
  entero y duración en minutos sin redondeo decimal. Una observación de
  7:41 conserva 461000 ms; puede estimar el pago con 8 minutos.
- `records.tool` guarda la observación original, el pago estimado y si la
  detectó la extensión o la tool. La importación y las correcciones posteriores
  no sustituyen esa observación.
- `records.propio` conserva el inicio, duración y pago informados, el final
  calculado y la recepción. El inicio del historial tiene precisión de minutos;
  no presentarlo como segundos originales oficiales. Se guardan hasta doce
  versiones anteriores de Propio, sin recortar el respaldo original.
- La fila principal y la contabilidad siguen usando Propio al reconciliar.
  El respaldo no se agrega como otra llamada ni otro ingreso.
- El ACW usa el final del historial cuando está disponible. Puede adelantarse
  respecto al cierre observado. La etiqueta identifica su origen y muestra
  la diferencia; pulsar el contador abre el cálculo y ambas versiones.
- La duración del respaldo se calcula con los instantes observados, sin
  aplicar el redondeo personal de pago. Son tiempos detectados, no una garantía
  de precisión del sistema de Propio; las señales pueden tener retraso.

## Dónde verlo

En Inicio, pulsar el ACW o «Ver registros» de la última llamada. En la tabla,
cada llamada tiene acceso a su registro. El detalle distingue Propio, respaldo,
diferencia de cierre y pago, y muestra el historial y milisegundos plegados.
No se muestran controles de simulación de la maqueta en la app real.

## Ausencias y discrepancias

Un historial vacío, parcial, paginado o tardío no es una orden de borrar. La
llamada local queda pendiente de confirmar. Un cero informado sí es un dato:
Propio pasa a ser principal, conservando duración y estimación originales.

Si varias llamadas live pueden coincidir, `state.callRecordReviews` conserva
la fila recibida y los candidatos sin reemplazarlos. «Revisar vínculos pendientes»
permite seleccionar uno. Cuenta, fila recibida y candidatos deben seguir
iguales al confirmar. Otra llamada real que cruce el intervalo bloquea la
vinculación, sin borrar ni excluir datos del total. No se adivina cómo dividir
una fila oficial entre varias llamadas reales. La cola admite 100 revisiones;
al llenarse, se rechaza el siguiente lote para que la extensión lo retenga.

El guardado fallido revierte las llamadas, la revisión y las categorías de
Finanzas. Las reimportaciones idénticas no duplican registros. Las correcciones
oficiales conservan el respaldo y actualizan el ancla de ACW, también al pasar
a cero minutos.

## Compatibilidad y verificación

Los campos viajan en el payload JSON existente de llamadas y estado; no cambia
el esquema alojado ni la cuenta. Un registro oficial antiguo sin observación
no recibe segundos inventados. No se pueden recuperar instantes provisionales
que una versión anterior ya haya reemplazado sin conservarlos.

Las pruebas cubren precisión de 7:41 y milisegundos, importación, corrección,
recarga, ausencia, cero, contabilidad única, cambio de cuenta/datos, fallo de
persistencia y vínculo explícito. Los recorridos compilados usan datos ficticios
aislados ES/EN, claro/oscuro y 320/390/1200 px. No certifican la precisión del
reloj del servidor ni todas las variantes nativas de llamada/Save.

El detalle y sus traducciones se cargan al abrir. El presupuesto inicial de
idiomas conserva 235 KB y el gate conserva 350 KB; se revisan 815 KB para el
coordinador y 138 KB para detalles por la nueva comparación y vinculación.
