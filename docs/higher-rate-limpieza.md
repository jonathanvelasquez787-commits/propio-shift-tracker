# Limpiar Higher Rate conservando los bonos

Solicitud: limpiar un historial largo de ventanas no debe borrar los bonos de
las llamadas. La conservación ya existía; app 625 refuerza la confirmación y
evita aplicar una limpieza preparada con datos que ya cambiaron.

- «Limpiar historial» quita solo las ventanas terminadas de esa lista. Las
  ventanas activas/futuras y las llamadas permanecen.
- Antes de confirmar muestra cuántas ventanas saldrán, cuántas llamadas ya
  tienen bono de ellas y el total conservado con su moneda secundaria.
- El nivel del bono queda guardado en la llamada antes de retirar la ventana,
  dentro del mismo guardado completo. Las ganancias del día y del ciclo siguen
  calculándolo; no se suma otra copia al pago base. Un nivel conocido sigue
  ajustándose a una corrección posterior de duración oficial.
- No ejecuta un nuevo reparto de Finanzas ni emite recompensas de Logros.
- Cancelar no cambia nada. Una confirmación no se ejecuta dos veces. Si llegan
  llamadas, cambian ventanas/moneda/cuenta o la pestaña queda obsoleta, exige
  revisar de nuevo. Si guardar falla, restaura ventanas y bonos anteriores.
- La limpieza toma las ventanas guardadas, sin guardar incidentalmente campos
  sin confirmar del editor.

## Comprobación

846 pruebas completas y build ES/EN con presupuestos conservados. Ocho
regresiones nuevas comprueban llamadas con ventanas superpuestas, gracia,
cruce de medianoche, límite de fin exclusivo, bonos ya conservados, legado,
recarga, corrección de duración, rechazo y cambios durante la confirmación.

Interfaz compilada en Chrome aislado: 12 recorridos (ES/EN, claro/oscuro,
320/390/1365 px), abriendo Higher Rate, revisando el importe, cancelando,
limpiando y recargando. El caso conserva $1.50 de ganancias ($1.20 base más
$0.30 de bono), la llamada y la ventana futura, sin errores JavaScript ni
desborde de página. Datos y backend ficticios; no se modificó la cuenta humana.

## Lo que sigue pendiente

El punto 37 no está terminado: falta «Corregir y recalcular», con vista previa
específica y confirmación explícita. Esa acción será independiente de limpiar
el historial. El editor conserva mientras tanto su comportamiento actual de
conservar bonos al mover fechas/horas. Los puntos 33–36 también siguen en el
plan; no se consideran completados por mejorar esta limpieza.

El alcance de conservación aquí son los bonos de llamadas ya registradas.
No se afirma que una ventana retirada permita calcular el bono de llamadas
que todavía no habían llegado al tracker. La recuperación tardía se revisará
con el bloque de llamadas/importación, sin borrar beneficios ya guardados.
