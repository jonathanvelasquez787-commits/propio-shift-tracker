# Disponibilidad visible en Inicio

Primera entrega del [plan integral](plan-mejoras-integrales.md), aprobada con
vista previa claro/oscuro. App 622 y extensión 2.2.8.

## Qué cambia

Debajo de los controles del turno aparece el estado confirmado por la extensión:
horario, espera por ACW, pausa manual, Break/Lunch, llamada activa/entrante,
disponibilidad o necesidad de revisar la conexión. «Ver preparación del turno»
reúne cuenta, portal, horario, iniciador, espera y regresos de las pausas.

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

- Once pruebas nuevas en [automation-status.test.mjs](../tests/automation-status.test.mjs):
  límites de datos, prioridades, cero sin inventar disponibilidad, observación
  vieja, autorización, cuenta/documento cambiado, render, navegación y limpieza.
- Fixtures existentes de recarga y arranque actualizados para conservar sus
  comprobaciones originales con la nueva lectura independiente.
- 829 pruebas completas; build, ES/EN, imports, wiring y matriz correctos.
  Matriz de 23 criterios, 70 suites y 76 módulos. Presupuestos conservados.
- Recorrido con app compilada, content scripts y worker reales, autenticación
  ficticia y backend local: horario temprano, llamada, ACW ya iniciado, Stop/Start,
  pausa manual, Break y pérdida de lectura. Ninguna llamada real provocada.
- 224 vistas: catorce situaciones, ES/EN, claro/oscuro y 320/390/768/1.365 px.
  Sin overflow ni texto cortado; plegado de detalles y navegación fuera de Inicio.

Los artefactos de navegador quedan fuera de Git. CI y despliegue del commit se
enlazan en el PR. Esto no certifica todas las variantes nativas de Save ni dos
PCs simultáneos. La coordinación global sigue pendiente en el plan.

## Actualización local

La extensión anterior mantiene sus funciones, pero no transmite la nueva lectura.
La carpeta instalada se actualiza con respaldo y se conservan sus preferencias
personales. La recarga de la extensión y de las páginas se realiza fuera de una
llamada pendiente; instalar archivos no demuestra que Chrome ya los ejecuta.

Esta entrega no cierra las 79 mejoras: los puntos compuestos conservan sus
partes pendientes y la lista distingue pruebas, publicación y recarga local.
