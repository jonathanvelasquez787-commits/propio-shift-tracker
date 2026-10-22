# Revisar y corregir Higher Rate

App 627 completa los puntos 36 y 37, después del desglose de ganancias de
33–35. La extensión continúa en 2.2.10: estos controles pertenecen a la aplicación.

## Revisar una promoción

En Higher Rate, cada ventana ofrece «Revisar llamadas». Muestra su horario,
llamadas elegibles, bonos atribuidos y llamadas cercanas que quedan fuera,
con ese último grupo plegado. Cada registro explica si entra por horario,
gracia inicial, una ventana superpuesta con mayor bono o un bono conservado.
La revisión no modifica datos; «Volver a revisar» toma los registros actuales.

Son las reglas configuradas de la aplicación: cinco minutos de gracia antes del
inicio, fin exclusivo, duración completa y mayor bono en superposiciones.
Se conserva el comportamiento de ventanas que cruzan medianoche. Esto no
certifica cómo Propio liquida los segundos o los bonos oficialmente.

Se evaluó cargar promociones: se mantiene la entrada explícita de fecha,
horas y nivel del aviso de Propio, para comprobarlos antes de usarlos. No se
introduce un lector de mensajes ni se interpretan automáticamente avisos.

## Conservar frente a corregir

- Editar normalmente fecha, horas o nivel conserva el bono que ya ganó cada
  llamada. Retirar una tarjeta o limpiar el historial también lo conserva.
- Para corregir un dato erróneo, abrir «Revisar llamadas» y después «Corregir
  promoción». Cambiar los campos y pulsar «Revisar recálculo» muestra las
  llamadas afectadas y sus importes antes/después, con moneda secundaria.
- «Confirmar recálculo» aplica la corrección. También se puede indicar que
  la promoción fue un error y retirarla recalculando sus llamadas.
- El recálculo libera únicamente los bonos conservados de esa promoción y
  vuelve a calcular con las ventanas resultantes. Los bonos conservados de
  otras promociones y los pagos base permanecen. Una superposición vuelve a
  elegir el mayor bono válido, sin sumar dos veces el pago.
- Finanzas se ajusta al importe resultante. Logros se reconcilia solo después
  de aceptar el guardado. No se fabrican llamadas ni productividad.

Cerrar sin confirmar no cambia nada. Cambiar un campo invalida la vista
previa. Cambios de cuenta, llamadas, ajustes o revisión de guardado exigen
revisar de nuevo. Una confirmación no se ejecuta dos veces. Un rechazo o
interrupción del guardado restaura ventanas, bonos y asignaciones anteriores.

## Evidencia y límites

866 pruebas completas y build con presupuestos verificados.
Regresiones sobre el cálculo real: segundos de inicio, gracia inclusiva, fin
exclusivo, medianoche, superposiciones, duración cero, bonos conservados y
legados. La corrección prueba cancelación implícita del modelo de preview,
fechas/horas inválidas, identidades ambiguas, guardado rechazado/interrumpido,
doble confirmación, cambios de cuenta/datos/moneda y recarga. El desglose y
la limpieza mantienen sus regresiones anteriores.

Interfaz compilada con backend ficticio y Chrome aislado: ES/EN, claro/oscuro,
320/390/768/1365 px. Revisa llamadas, cancela, cambia nivel conservando el
bono, rechaza horas iguales, invalida una confirmación al editar, confirma,
recarga y retira una promoción equivocada. Conserva pagos, otras promociones
y preferencia de moneda, sin desborde horizontal ni errores JavaScript.
No modifica la cuenta humana ni llamadas reales.

Las traducciones exclusivas del detalle se descargan junto con su módulo,
manteniendo los presupuestos iniciales. El presupuesto del detalle pasa de
14 a 30 KB para incluir esta función y sus traducciones; no aumenta el del
JavaScript inicial ni el catálogo inicial. La descarga fallida permite reintentar.

La revisión opera sobre ventanas que siguen en la lista. Limpiar no permite
reconstruir ventanas retiradas ni calcular automáticamente bonos de llamadas
que aún no habían llegado al Propio Shift Tracker; esa recuperación tardía pertenece a la
fase de llamadas/importación. No se elimina ningún bono histórico por limpiar.

Sigue la fase 3 del plan: recuperación y trazabilidad. No se considera
terminada ninguna fase posterior por esta entrega.
