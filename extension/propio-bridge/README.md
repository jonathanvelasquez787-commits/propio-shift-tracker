# Propio · Tracker y resumen · 2.0.0

Una sola extensión reúne la conexión al tracker y la barra de llamadas, minutos y ganancias en Propio. «Registrar en mi tracker» y «Mostrar resumen en Propio» son controles independientes. El resumen empieza oculto y no exige cuenta vinculada; encenderlo o apagarlo se aplica a las pestañas abiertas sin recargar. La conexión conserva su modo y cuenta al actualizar la carpeta existente.

## Resumen opcional e interfaz

En el historial, la barra muestra el subtotal de la página visible: cantidad de llamadas, minutos y pago oficial. «Calcular total» recorre todas las páginas del rango elegido y vuelve a la página inicial. Ocultarlo mientras suma cancela el recorrido y restaura la página. La barra conserva la colocación compacta junto a los encabezados. Filtros, datos pendientes y errores de paginación mantienen sus verificaciones.

El popup tiene tarjetas de conexión y resumen, controles separados, cuenta vinculada, llamadas detectadas y pendientes, actividad y diagnóstico desplegables. Las preferencias del resumen permiten English/Español y conversión opcional; se guardan localmente y se reflejan en la barra. Usan el mismo icono de reloj de la tool, preparado a 16, 32, 48 y 128 px. Los temas claro/oscuro siguen la preferencia del navegador.

El resumen no inicia turnos, registra llamadas, ni comparte filas con el tracker. El registro puede funcionar con la barra oculta, y el resumen con el registro apagado. No se añaden permisos respecto de 1.5.1.

## Sesión y Shift

Reconoce localmente el encabezado visible «Welcome, … (ID)» del portal. Con automático activado, la primera detección inicia el Shift; si ya estaba abierto, conserva su hora. Desde 1.5.1, pulsar Sign out y completar la redirección de esa pestaña a propio.com o www.propio.com termina el Shift vinculado, sin tener que abrir Login otra vez. El clic se comunica antes de abandonar el portal; el worker confirma la navegación aun cuando desaparece el script de la página. Usa webNavigation con filtros para esos dos hosts y no persiste direcciones. Un clic sin redirección, una visita desde la barra de direcciones, Back, recargar u otra pestaña no termina el turno. Volver al formulario visible `#loginform` sigue confirmando el cierre si la sesión expiró. Una llamada automática pendiente se cierra antes del turno con tiempo estimado hasta esa detección. No cierra llamadas manuales sin revisión.

Si activás la extensión con Propio ya conectado, registra desde la detección, sin inventar la hora anterior de login. Recargar, cerrar pestañas, ocultar ventanas, perder conexión o cambiar disponibilidad no equivale a salir. Un cierre atrasado tampoco termina un Shift manual posterior. Las observaciones desconocidas no modifican la sesión.

## Llamadas

Combina las solicitudes exitosas allowlisted del portal/Twilio con una alternativa desde controles visibles en inglés/español: aceptar/contestar y rechazar, colgar/finalizar llamada, y estados explícitos de llamada conectada/terminada. Un clic en aceptar necesita confirmación posterior de conexión; Start Calls, disponibilidad, un rechazo y un final suelto nunca crean una llamada. El detector espera evidencia estable, ignora controles ocultos y no pulsa nada.

Ambas fuentes comparten el mismo estado e identificador aleatorio para evitar duplicados. Un inicio observado empieza el contador; su final guarda por la ruta existente de llamadas, ganancias y refuerzo positivo. Activar en mitad de una llamada no inventa su inicio. Tiempo y pago son estimados: el historial oficial permite corregirlos sin duplicar progreso. Offline no se interpreta como Break/Lunch.

La compatibilidad con el diseño de una llamada real en tu portal aún debe comprobarse durante tu trabajo habitual: las pruebas simuladas cubren controles reconocidos, no certifican variantes que Propio no nos ha mostrado. No provocar llamadas para probar. El popup muestra sesión reconocida, señales, solicitudes y pendientes; si un control tiene un formato desconocido, no inventa registros.

## Privacidad y persistencia

No recoge usuario/contraseña, nombres, ID del intérprete, clientes, audio, URLs, headers, tokens o cuerpos para diagnóstico. La conexión guarda clasificaciones, tiempos, identificadores aleatorios y cola local; el resumen guarda solo visibilidad, idioma y conversión, con los totales en memoria. La cuenta del tracker se vincula por hash. El historial se suma localmente y no se envía a otro servicio.

La cola y sesión sobreviven al reinicio del worker. Entrega a una sola pestaña de la cuenta conectada, conserva hasta 200 eventos y reintenta cuando vuelve el tracker. Eventos de más de 24 horas requieren revisión. Una llamada manual, un respaldo pendiente, traslapes, varias pestañas o errores de almacenamiento bloquean la entrega. Cambiar de cuenta con pendientes exige resolverlos primero. Pausar durante una llamada requiere esperar o descartar expresamente las señales revisadas. Si cerrás Propio durante una llamada, revisá su final en el tracker.

## Actualizar la extensión existente

1. Reemplazá los archivos de la carpeta de conexión instalada por el paquete 2.0.0, incluidos `summary-content.js` y la carpeta `icons`. Usar esa misma carpeta conserva cuenta vinculada, registro automático, sesión y cola.
2. En `chrome://extensions`, recargá la extensión de conexión: ahora se llama «Propio · Tracker y resumen». Desactivá la extensión anterior «Propio · Minutos y ganancias» y cualquier userscript de resumen para usar solo una barra.
3. Recargá Propio y el tracker. El popup muestra 2.0.0 y el icono de la tool. Activá «Mostrar resumen en Propio» si querés verlo en el historial.
4. Si estaba sin vincular: abrí el tracker, iniciá sesión y pulsá Vincular cuenta. Moneda/idioma de la extensión de resumen anterior se configuran una vez en el nuevo popup: Chrome separa el almacenamiento de las dos extensiones antiguas.

Recargar la versión anterior sin reemplazar los archivos no instala la actualización. Si la extensión fue eliminada, usá Cargar descomprimida con la carpeta que contiene `manifest.json` y conectá la cuenta de nuevo.

Build: `node scripts/build-extension.mjs <salida>`. Se prueban sesión, entrega, duplicados, reinicio, bloqueos y guardado; la comprobación del navegador usa un portal y cuenta ficticios en Chromium aislado.
