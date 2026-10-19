# Disponibilidad visible en Inicio

Primera entrega del [plan integral](plan-mejoras-integrales.md), aprobada con
vista previa claro/oscuro. Revisión compacta: app 624 y extensión 2.2.10.

**Ubicación:** esta sección está en la tool web. La extensión le proporciona
los datos; sus opciones se siguen configurando en el popup de Chrome. En 2.2.8
se agregó la lectura de estado y en 2.2.9 se ampliaron los datos de conexión y
pausas. Esas versiones de la extensión no representan pantallas nuevas en su popup.

## Qué cambia

Debajo de los controles del turno aparece el estado confirmado por la extensión:
horario, espera por ACW, pausa manual, Break/Lunch, llamada activa/entrante,
disponibilidad o necesidad de revisar la conexión. El resumen está cerrado por
defecto e identifica «Extensión de Chrome · estado en tu tool». Pulsarlo abre
cuenta, portal, horario, iniciador, espera y regresos de las pausas en una lista
sin viñetas vacías. «Sobre estos horarios» conserva la explicación completa.
Las opciones se siguen configurando en el popup; la tool solo informa.

Los cinco estilos de la app llevan la misma versión de publicación que el HTML
y la precarga offline. Así una entrada antigua del caché sin versión no puede
reemplazar los estilos nuevos. Se corrigió un riesgo confirmado en el build;
no se inspeccionó el caché privado del navegador del propietario.

La preparación distingue la hora en que la extensión detectó la conexión a
Propio del comienzo laboral calculado por la tool. Entrar a las 7:42 para un
turno de las 8:00 muestra ambas horas; ese tiempo previo no suma trabajo ni
ACW. Una llamada real a las 7:50 adelanta el comienzo laboral a esa llamada.
Un inicio manual conserva la hora elegida. Cerrar antes del comienzo laboral
se identifica sin inventar minutos trabajados. No se modifica la contabilidad.

Durante Break o Lunch se muestra el final previsto y si la pausa se termina
manualmente o si la extensión intentará cerrarla. Sin duración configurada se
pide terminarla en la tool; con regreso apagado se indica Start Calls manual.
Una pausa solo programada se distingue de una pausa activa. Al vencer la
duración se espera la confirmación del tracker, sin anunciar un cierre ficticio.

El contador es una presentación del límite calculado por el worker. No concede
disponibilidad: al llegar a cero espera la comprobación y confirmación del
portal. Si el registro, el horario o una pausa lo impiden, sigue mostrando ese
motivo. Un inicio de turno apagado no promete una entrada automática.

La sección aparece solo en Inicio y conserva los controles existentes. No guarda
su estado en la cuenta ni crea eventos, llamadas o sonidos. El popup conserva sus
controles y sigue siendo quien permite elegir las opciones.

## Integridad del transporte

- La consulta exige origen del tracker, marco principal y cuenta vinculada.
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
El propietario confirmó la recarga de 2.2.9, Propio y el tracker el 18/10/2026,
y después confirmó que el popup y Chrome muestran ambos 2.2.10. La revisión
web 624 no exige volver a instalar o recargar la extensión.

Esta entrega no cierra las 79 mejoras: los puntos compuestos conservan sus
partes pendientes y la lista distingue pruebas, publicación y recarga local.
