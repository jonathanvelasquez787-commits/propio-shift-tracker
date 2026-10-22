# Disponibilidad automática: estado y ajustes

**Ubicación actual:** Inicio conserva el estado breve y la espera. Al pulsarlo se abre Ajustes → Disponibilidad automática, con preparación, sesión, horario y regresos. Las opciones se configuran en el popup de la extensión de Chrome.

## Qué muestra

El estado recibido distingue:
horario, espera por ACW, pausa manual, Break/Lunch, llamada activa/entrante,
disponibilidad o necesidad de revisar la conexión. En Ajustes, los detalles están plegados para consultar la cuenta, Propio, el horario y los automatismos sin llenar Inicio de explicaciones. La aplicación muestra el estado y el popup configura las opciones.

Los cinco estilos de la app llevan la misma versión de publicación que el HTML
y la precarga offline. Así una entrada antigua del caché sin versión no puede
reemplazar los estilos nuevos. Se corrigió un riesgo confirmado en el build;
no se inspeccionó el caché privado del navegador del propietario.

La preparación distingue la hora en que la extensión detectó la conexión a
Propio del comienzo laboral calculado por la aplicación. Entrar a las 7:42 para un
turno de las 8:00 muestra ambas horas; ese tiempo previo no suma trabajo ni
ACW. Una llamada real a las 7:50 adelanta el comienzo laboral a esa llamada.
Un inicio manual conserva la hora elegida. Cerrar antes del comienzo laboral
se identifica sin inventar minutos trabajados. No se modifica la contabilidad.

Durante Break o Lunch se muestra el final previsto y si la pausa se termina
manualmente o si la extensión intentará cerrarla. Sin duración configurada se
pide terminarla en la aplicación; con regreso apagado se indica Start Calls manual.
Una pausa solo programada se distingue de una pausa activa. Al vencer la
duración se espera la confirmación de Propio Shift Tracker, sin anunciar un cierre ficticio.

El contador es una presentación del límite calculado por el worker. No concede
disponibilidad: al llegar a cero espera la comprobación y confirmación del
portal. Si el registro, el horario o una pausa lo impiden, sigue mostrando ese
motivo. Un inicio de turno apagado no promete una entrada automática.

El resumen breve está en Inicio y los detalles en Ajustes, conservando los controles existentes. No guarda
su estado en la cuenta ni crea eventos, llamadas o sonidos. El popup conserva sus
controles y sigue siendo quien permite elegir las opciones.

## Integridad del transporte

- La consulta exige origen de Propio Shift Tracker, marco principal y cuenta vinculada.
- La página exige origen, ventana, nonce y cuenta actuales. Una respuesta de
  otro documento o cuenta se descarta; la lectura no puede invocar controles.
- Se transmiten opciones, indicadores y tiempos; no llamadas, nombres, tokens,
  notas ni historial de solicitudes.
- Se comprueba tanto la fecha de respuesta como la observación del portal y del
  ACW. Una respuesta nueva no vuelve reciente una observación vieja. A los
  15 segundos sin confirmación se retira la cuenta regresiva.
- Lecturas reordenadas no reemplazan una más nueva. Cambiar de cuenta o cerrar
  la página detiene sus observadores y temporizadores.

## Evidencia

- Pruebas en [automation-status.test.mjs](../tests/automation-status.test.mjs):
  límites de datos, prioridades, cero sin inventar disponibilidad, observación
  vieja, autorización, cuenta/documento cambiado, render, navegación, limpieza,
  conexión, pausas reales/programadas y modos de cierre. Los paquetes anteriores
  siguen siendo válidos aunque no incluyan los detalles nuevos.
- [connection-work-time.test.mjs](../tests/connection-work-time.test.mjs) verifica
  el resumen de trabajo sin escrituras, inicio manual, llamada anticipada y pestaña
  obsoleta. [appearance-language.test.mjs](../tests/appearance-language.test.mjs)
  comprueba que el empaquetado sin textos duplicados reconstruye ambos idiomas
  exactamente, con todos sus parámetros y diccionarios independientes.
- Fixtures existentes de recarga y arranque actualizados para conservar sus
  comprobaciones originales con la nueva lectura independiente.
- 835 pruebas completas; build, ES/EN, imports, wiring y matriz correctos.
  Matriz de 23 criterios, 70 suites y 76 módulos. Presupuestos conservados.
- Recorrido con app compilada, content scripts y worker reales, autenticación
  ficticia y backend local: horario temprano, llamada, ACW ya iniciado, Stop/Start,
  pausa manual, Break y pérdida de lectura. Ninguna llamada real provocada.
- 320 vistas: veinte situaciones, ES/EN, claro/oscuro y 320/390/768/1.365 px.
  Sin overflow ni texto cortado; plegado de detalles y navegación fuera de Inicio.
- Revisión compacta aprobada en ambos temas: 336 vistas incluyen ausencia de
  conexión, estados anteriores, apertura por teclado, cierre y controles intactos.
  Regresiones de estilos versionados y recuperación offline en
  [production-shell.test.mjs](../tests/production-shell.test.mjs) y
  [service-worker-runtime.test.mjs](../tests/service-worker-runtime.test.mjs).

Los artefactos de navegador quedan fuera de Git. CI y despliegue del commit se
enlazan en el PR. Esto no certifica todas las variantes nativas de Save ni dos
PCs simultáneos. La coordinación global sigue pendiente en el plan.

## Actualización local

La extensión anterior mantiene sus funciones, pero no transmite la nueva lectura.
La carpeta instalada se actualiza con respaldo y se conservan sus preferencias
personales. La recarga de la extensión y de las páginas se realiza fuera de una
llamada pendiente; instalar archivos no demuestra que Chrome ya los ejecuta.
El propietario confirmó la recarga de 2.2.9, Propio y Propio Shift Tracker el 18/10/2026,
y después confirmó que el popup y Chrome muestran ambos 2.2.10. La revisión
web 624 no exige volver a instalar o recargar la extensión.

Esta entrega no cierra las 79 mejoras: los puntos compuestos conservan sus
partes pendientes y la lista distingue pruebas, publicación y recarga local.
