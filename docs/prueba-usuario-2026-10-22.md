# Recorrido de uso normal — 22 de octubre de 2026

Prueba interactiva de la aplicación compilada con una cuenta ficticia y un
backend local. Se pulsaron los controles reales; el backend guardó y devolvió
las llamadas, pausas, ajustes y Finanzas. Una política de contenido bloqueó
las conexiones remotas. No se usaron llamadas ni dinero del propietario.
Este recorrido no es una auditoría profunda ni una simulación mensual.

## Fallos encontrados y corregidos en web 643

1. **El trabajo usado disminuía durante una pausa posterior.** Una llamada de
   79.404 ms, con siete segundos previos de ACW, pasó de 1:26 a 1:02 y luego a
   cero en la tarjeta del bloque mientras seguía en Lunch. Se restaban pausas
   que quedaban fuera del tramo de actividad ya contado. La corrección limita
   esa deducción al tramo representado y conserva la cobertura de las llamadas.
2. **Los huecos desconectados inflaban el bloque.** Al agregar e importar
   llamadas anteriores al inicio del turno, el bloque mostraba 1:39 de trabajo
   aunque las llamadas sumaban 14:30 y el ACW clasificado era cero. El cálculo
   de Usado ahora comparte los intervalos de ACW clasificados y conectados con
   el resumen del bloque; no vuelve a descontar sus pausas. El mismo recorrido
   terminó con 14:30, sin cambiar llamadas, pagos ni reportes.

Se agregaron regresiones para pausas antes y después de la actividad, pausas
solapadas con llamadas, fuentes de pausas duplicadas, ACW inicial, huecos
desconectados y clasificados como Other, y progreso de pausas planeadas.
Pasaron 1.002 pruebas completas, el build y los controles de idiomas, módulos,
wiring, criterios y presupuestos. La publicación se acredita por CI y por el
commit servido, registrados aparte de este documento.

## Recorrido ejecutado

- Iniciar turno, iniciar llamada, comprobar Break/Lunch bloqueados y abrir
  Reportes conservando el contador en vivo.
- Recargar durante una llamada y guardarla una sola vez; consultar inicio y
  cierre con segundos y duración original de 79.404 ms.
- Iniciar Break, comenzar una llamada accidental, descartarla y recuperar el
  mismo Break; terminarlo, iniciar y terminar Lunch.
- Rechazar una duración manual negativa y agregar una llamada válida de 7:30.
- Importar una llamada nueva y conciliar otra con la medición guardada;
  conservar tres registros y la observación original. Repetir el mismo lote:
  cero nuevas y dos sin cambios.
- Revisar Reportes, desglose, jornada, Fechas de pago, Calendario, Horario y
  Logros. El importe del día y del ciclo conservó $1.74 y su conversión.
- Crear un gasto ficticio, reservar $0.50 y registrar un pago de $0.25. Tras
  recargar, siguieron separados: reserva $0.50, pago $0.25 y disponible $1.24.
- Descargar el respaldo JSON y el reporte CSV desde la interfaz; comprobar
  que el JSON contiene las tres llamadas y los ajustes de la cuenta ficticia.
- Cambiar a inglés y tema claro, recargar, revisar ancho móvil de 390 px y
  volver a español. Los registros y sus importes permanecieron iguales.
- Finalizar el turno, consultar STAGE CLEAR y recargar: Finalizado, tres
  llamadas y $1.74 conservados.

No se certifican con este recorrido OAuth nuevo, una llamada real de Propio,
dos PCs físicas, audibilidad, un lector de pantalla humano ni la facturación
oficial de segundos. La extensión 2.3.5 activa ya fue confirmada por una captura
del propietario; esta corrección es de la web y no exige recargar la extensión.
