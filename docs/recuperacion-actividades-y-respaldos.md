# Actividades accidentales y respaldos

Entrega web 629: puntos 22, 26, 27, 47, 67 y 69 del plan aprobado. La extensión
conserva su versión y comportamiento; estas funciones se usan en la tool.

## Descartar y continuar

- La confirmación de una llamada explica si retoma una pausa interrumpida,
  revierte un turno abierto automáticamente o conserva el turno existente.
  No registra otra llamada, ganancias ni un nuevo final para el ACW anterior.
- Reabrir el mismo Break/Lunch dentro de cinco minutos conserva el inicio
  anterior y muestra que es una continuación. Su descarte devuelve el tramo
  cerrado original; no elimina también ese descanso ya guardado.
- Una pausa nueva descartada elimina su propio evento de inicio. Una
  continuación elimina solo su evento/interrupción de continuación.
- Confirmaciones y editores verifican cuenta, revisión y actividad vigente;
  una descarga fallida o un cambio posterior impide aplicar una acción vieja.
  Un rechazo al guardar revierte memoria y no detiene alarmas ni anuncia éxito.

El tramo cerrado se conserva en `continuationClosedPause` para nuevas
continuaciones. Una pausa continuada por una versión antigua sin esa copia no
permite reconstruir con certeza su final anterior; el diálogo conserva la
explicación del descarte completo en ese caso.

## Clasificaciones manuales

Los huecos editados dicen «Clasificado por vos» en la tabla y el editor.
El resumen semanal distingue el estado de día elegido manualmente; el
calendario lo señala con M. El editor explica cómo Libre/Trabajado modifica
adherencia y metas sin borrar llamadas. Una nota/categoría por sí sola no
fuerza el estado. Si los datos cambian durante la edición, debe abrirse otra
vez; si el guardado falla, se conserva el contenido previo y el editor.

## Restaurar y reiniciar

La confirmación muestra las cantidades actuales de llamadas, acciones y
pausas. Al importar un JSON o recuperar una copia también muestra las del
respaldo y aclara qué ajustes se reemplazan. Un respaldo antiguo sin settings
conserva la configuración actual. Se informa si trae una actividad abierta.

Antes de cada reemplazo se conserva el snapshot completo en las copias
privadas de la cuenta. Se accede desde **Reiniciar → Ver copias recuperables**:
elegir una copia abre una segunda comparación antes de restaurarla. Recuperar
reemplaza todo el conjunto, no mezcla solo el día borrado, y conserva otra
copia del estado que reemplaza.

- Reiniciar día conserva otros días, horario y metas. La copia previa es
  completa para poder recuperar también los datos relacionados.
- Reiniciar todo devuelve datos y ajustes de la tool a sus valores iniciales;
  conserva la cuenta y las preferencias propias de la extensión.
- Estos cambios se sincronizan con la cuenta. No borran el historial oficial
  de Propio, que una importación posterior puede volver a incorporar.
- No se reemplazan datos con una actividad/respaldo live pendiente. Falta de
  espacio para la copia, cuenta/revisión cambiada o fallo de escritura detiene
  el reemplazo. No se borra otra copia automáticamente para hacer espacio.
- Las copias son locales: borrar datos del navegador las elimina y otro PC
  no las recibe. No sustituyen el JSON descargado. Su recuperación completa
  puede reemplazar trabajo posterior, por eso vuelve a exigir comparación.

## Validación y límites

Regresiones de los handlers reales y del coordinador: pausa continuada,
descarte/rechazo, restauración de actividad, clasificación manual, cuenta
cambiada, datos posteriores, doble confirmación y copia antes del reemplazo.
Los tests existentes de persistencia conservan las comprobaciones atómicas.

QA de Chrome aislado usa datos ficticios y app compilada: ES/EN, claro/oscuro,
320/390/768/1365 px; cancelar, descartar, clasificar, restaurar JSON,
recuperar una copia, reiniciar día y recargar. Pruebas adicionales verifican
reinicio completo, cuota real simulada y marcas manuales de día. No modifica
la cuenta humana ni provoca llamadas en Propio.

Las funciones y traducciones de recuperación se cargan bajo demanda. El
detalle tiene un presupuesto revisado de 65 KB; los iniciales de app, boot y
traducciones permanecen en 803/350/230 KB respectivamente.
