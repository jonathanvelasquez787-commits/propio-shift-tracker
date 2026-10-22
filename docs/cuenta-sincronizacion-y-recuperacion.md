# Cuenta, sincronización y recuperación

Alcance de la fase 11: puntos 65, 66, 70 y 72. El punto 73 conserva su evidencia
en la guía práctica existente. La entrada pública continúa siendo Google y no
se cambió la configuración de Auth, SMTP ni el esquema de datos de la cuenta.

## Cuenta y campos editables

En Ajustes, «Cuenta y acceso con Google» distingue el usuario editable del perfil,
el correo de Google de solo lectura y el nombre del saludo. El usuario no se
presenta como una credencial habilitada para entrar con contraseña. El botón
guarda el usuario del perfil. Se conservan validación, unicidad, protección por
identidad y rechazo de respuestas atrasadas. Incluso un cambio programático del
campo de correo no envía una actualización con el acceso por email desactivado.

## Qué confirma cada guardado

El detalle plegable «Guardado y recuperación de esta app» usa los patrones
visuales existentes. Expone copia local y último cambio local, última revisión
confirmada por el servidor, estado de red y control de caché de la PWA. Una red
disponible no se presenta como confirmación de subida. Un fallo local sigue
visible aunque una petición anterior haya recibido respuesta correcta.

La fecha del último cambio local es informativa; no sustituye al propietario ni
a la revisión de sincronización. Los datos anteriores a esta entrega pueden no
tenerla. La fecha de nube procede de la revisión confirmada, no del reloj usado
para presentar el estado relativo. El botón «Reconectar y sincronizar» respeta
el vaciado local pendiente, la sesión y las revisiones; una sesión sin acceso
activo vuelve a comprobarse al recargar.

Un error de permisos o servidor con red disponible informa que la nube no
confirmó el guardado. Los conflictos conservan el aviso al seguir editando o
recuperar la conexión. La recarga permite comparar/elegir y conserva la versión
reemplazada en las copias recuperables. No se activa mezcla automática ni una
escritura forzada; se mantienen revisiones, cuenta, copias previas y rollback
ante cuota insuficiente.

## Conflicto conservador tras una subida al cerrar

Se reprodujo el fallo antes de modificar la comparación. `fetchCloud` consulta
las llamadas por `order('call_id')`: un historial local en orden `[z-new,a-old]`
vuelve de la consulta como `[a-old,z-new]`. Con idénticos payloads, estado y
ajustes, `dirty=true` y revisión local anterior, `resolveBoot` devolvía
`conflict`. La regresión falló con ese resultado antes de aplicar el cambio.

`sameSnapshot` ahora compara la colección de llamadas ordenada por identidad
solo cuando todos sus registros tienen ID y esos IDs son únicos. Compara los
payloads completos, incluidas claves JSON como `__proto__`, conserva los tipos
y no muta las listas. La ordenación de IDs es estricta e independiente del
idioma, también para identificadores Unicode distintos. No compara meros
conteos, no usa el nombre del dispositivo como autoridad y no omite las guardas
de revisión/propietario. Las listas de eventos y preferencias conservan su
orden; IDs duplicados o ausentes no obtienen esta normalización. Una diferencia
de pago, identidad, evento, preferencia o multiplicidad sigue siendo conflicto.
La adopción equivalente confirma la revisión observada sin subir ni crear una
copia recuperable redundante. Las divergencias reales mantienen ambas versiones.

## App instalable y desconexión

La instalación conserva una forma de abrir la app; la caché del shell y los
datos son mecanismos separados. El detalle distingue control de caché activo
de caché todavía no confirmada. Explica que abrir sin red requiere haber abierto
la app antes y conservar una copia local identificada de la misma cuenta.
Google y la nube necesitan conexión; una sesión vencida puede exigir volver a
entrar. Se conserva el flujo de apertura offline y reconexión existente.

Instalar no crea un respaldo independiente, no mantiene despierta la PC ni
garantiza ejecución de llamadas/avisos con el equipo suspendido. Limpiar datos
del navegador elimina datos y copias privadas locales. El JSON descargado es
la copia independiente que puede conservar el usuario. No se promete persistencia
si el navegador descarta su almacenamiento.

## Borrado de cuenta

Antes de la acción irreversible se ofrece el exportador JSON ya existente. El
alcance visible incluye cuenta y datos activos del tracker, limpieza de sus
datos/copias recuperables en este navegador y retención histórica cifrada
prevista de 31 días por rotación. Google, historial oficial de Propio, JSON
descargados y copias locales de otros navegadores/dispositivos quedan fuera.
La limpieza local sigue sujeta a los permisos del navegador; una limpieza
rechazada no conserva activa la identidad borrada remotamente.

Antes del POST se comprueban sesión, cuenta actual y propietario local. Un
cambio mientras la confirmación estaba abierta no puede borrar una identidad
distinta. Un fallo de red/API conserva los datos locales y la sesión. No se
ejecutó ningún borrado alojado ni se modificó la retención configurada.

## Evidencia y límites

- `tests/sync-integration.test.mjs`: reproducción previa, orden real de consulta,
  reconocimiento de revisión anterior y casos de divergencia; paginación,
  integridad y fallo de RPC conservados.
- `tests/local-save-status.test.mjs`: prioridad de fallo local, último guardado,
  nube pendiente/confirmada, error online, conflicto tras edición/reconexión y
  cambio real de control de caché.
- `tests/profile-goal-integrity.test.mjs`: correo Google de solo lectura sin
  envío accidental, unicidad e identidad y respuestas atrasadas.
- `tests/deep-audit-sync-identity.test.mjs`: botón que invoca el exportador,
  alcance/retención visibles, cambio de propietario antes del POST, rechazo y
  limpieza posterior con fallos locales.
- Se ejecutan además `boot-sync`, `offline-identity`, `super-audit-sync` y
  `service-worker-runtime` para conservar guardas de cuenta, reapertura,
  reconexión, copias y caché.

Los fixtures usan identidades y datos ficticios. No certifican OAuth humano
nuevo, eliminación real alojada, borrado físico de backups por rotación,
instalación en otro dispositivo ni ejecución con una PC suspendida. La
comprobación de build, traducciones, recorridos compilados y publicación se
registra en el cierre conjunto de la entrega.
