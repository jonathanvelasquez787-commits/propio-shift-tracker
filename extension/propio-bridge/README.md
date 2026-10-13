# Conexión con Propio · 1.5.1

Extensión independiente de Propio · Minutos y ganancias. Conectá una sola pestaña del tracker a tu cuenta y activá Registrar llamadas automáticamente. En observación muestra señales sin modificar el tracker.

## Sesión y Shift

Reconoce localmente el encabezado visible «Welcome, … (ID)» del portal. Con automático activado, la primera detección inicia el Shift; si ya estaba abierto, conserva su hora. Desde 1.5.1, pulsar Sign out y completar la redirección de esa pestaña a propio.com o www.propio.com termina el Shift vinculado, sin tener que abrir Login otra vez. El clic se comunica antes de abandonar el portal; el worker confirma la navegación aun cuando desaparece el script de la página. Usa webNavigation con filtros para esos dos hosts y no persiste direcciones. Un clic sin redirección, una visita desde la barra de direcciones, Back, recargar u otra pestaña no termina el turno. Volver al formulario visible `#loginform` sigue confirmando el cierre si la sesión expiró. Una llamada automática pendiente se cierra antes del turno con tiempo estimado hasta esa detección. No cierra llamadas manuales sin revisión.

Si activás la extensión con Propio ya conectado, registra desde la detección, sin inventar la hora anterior de login. Recargar, cerrar pestañas, ocultar ventanas, perder conexión o cambiar disponibilidad no equivale a salir. Un cierre atrasado tampoco termina un Shift manual posterior. Las observaciones desconocidas no modifican la sesión.

## Llamadas

Combina las solicitudes exitosas allowlisted del portal/Twilio con una alternativa desde controles visibles en inglés/español: aceptar/contestar y rechazar, colgar/finalizar llamada, y estados explícitos de llamada conectada/terminada. Un clic en aceptar necesita confirmación posterior de conexión; Start Calls, disponibilidad, un rechazo y un final suelto nunca crean una llamada. El detector espera evidencia estable, ignora controles ocultos y no pulsa nada.

Ambas fuentes comparten el mismo estado e identificador aleatorio para evitar duplicados. Un inicio observado empieza el contador; su final guarda por la ruta existente de llamadas, ganancias y refuerzo positivo. Activar en mitad de una llamada no inventa su inicio. Tiempo y pago son estimados: el historial oficial permite corregirlos sin duplicar progreso. Offline no se interpreta como Break/Lunch.

La compatibilidad con el diseño de una llamada real en tu portal aún debe comprobarse durante tu trabajo habitual: las pruebas simuladas cubren controles reconocidos, no certifican variantes que Propio no nos ha mostrado. No provocar llamadas para probar. El popup muestra sesión reconocida, señales, solicitudes y pendientes; si un control tiene un formato desconocido, no inventa registros.

## Privacidad y persistencia

No recoge usuario/contraseña, nombres, ID del intérprete, clientes, audio, URLs, headers, tokens o cuerpos para diagnóstico. Solo guarda clasificaciones, tiempos, identificadores aleatorios y cola local. La cuenta del tracker se vincula por hash. No incorpora barras, sumas de historial ni el userscript de la otra extensión.

La cola y sesión sobreviven al reinicio del worker. Entrega a una sola pestaña de la cuenta conectada, conserva hasta 200 eventos y reintenta cuando vuelve el tracker. Eventos de más de 24 horas requieren revisión. Una llamada manual, un respaldo pendiente, traslapes, varias pestañas o errores de almacenamiento bloquean la entrega. Cambiar de cuenta con pendientes exige resolverlos primero. Pausar durante una llamada requiere esperar o descartar expresamente las señales revisadas. Si cerrás Propio durante una llamada, revisá su final en el tracker.

## Actualizar la extensión existente

1. Extraé el ZIP 1.5.1 y reemplazá los archivos de la carpeta que Chrome tiene instalada, incluida `portal-content.js`.
2. En `chrome://extensions`, recargá Shift Tracker Bridge. La versión 1.5.1 añade webNavigation para confirmar la redirección de Sign out; si Chrome solicita habilitarlo, aceptá para completar la actualización.
3. Recargá las pestañas de Propio y del tracker. Dejando la misma carpeta y extensión se mantiene la configuración. Comprobá «Diagnóstico del detector · 1.5.1» y «Sesión de Propio reconocida».
4. Si estaba sin conectar: abrí el tracker, iniciá sesión, pulsá Conectar esta cuenta y activá el registro automático.

Recargar la versión anterior sin reemplazar los archivos no instala la actualización. Si la extensión fue eliminada, usá Cargar descomprimida con la carpeta que contiene `manifest.json` y conectá la cuenta de nuevo.

Build: `node scripts/build-extension.mjs <salida>`. Se prueban sesión, entrega, duplicados, reinicio, bloqueos y guardado; la comprobación del navegador usa un portal y cuenta ficticios en Chromium aislado.
