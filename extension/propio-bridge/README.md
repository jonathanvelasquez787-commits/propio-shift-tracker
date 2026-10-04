# Conexión con Propio

Extensión propia MV3, escrita desde cero. Observa únicamente solicitudes exitosas de disponibilidad en el portal y señales de llamadas en el endpoint de eventos de Twilio iniciadas por ese portal. No pulsa controles, acepta llamadas, graba audio ni envía información a terceros. No necesita credenciales ni datos de clientes. Guarda localmente tipos de señal, tiempos, identificadores aleatorios de llamada y la cola pendiente; la cuenta del tracker se identifica por un hash.

Comienza en **observación**: no modifica la app. Conectar la cuenta requiere una sola pestaña del tracker abierta e iniciada. El registro automático solo puede activarse desde el popup después de observar una llamada aceptada y terminada durante el trabajo normal. Activarlo a mitad de una llamada no registra el final como una nueva llamada: espera la siguiente aceptación.

Las señales provienen de los endpoints identificados en el add-on público de 2023. Su compatibilidad con el portal actual queda pendiente hasta observarlas en una llamada real. Los tiempos son de observación de eventos, no tiempos oficiales de facturación. Los pagos se estiman con la tarifa del tracker; importar el historial oficial corrige el registro usando la misma conciliación que las llamadas manuales en vivo. No interpreta estar disponible como estar en llamada, ni estar fuera de línea como Break/Lunch.

Entrega a una única pestaña de la cuenta conectada. Conserva hasta 200 eventos pendientes y reintenta cuando vuelve la app. No entrega señales de más de 24 horas: pausa y pide revisión. Una llamada manual activa, un traslape o un respaldo pendiente bloquean la cola para evitar sobrescribir datos. Cambiar de cuenta con pendientes requiere resolverlos primero. El estado del reducer y la cola sobreviven al reinicio del worker; una solicitud HTTP que estaba en vuelo al detenerse el worker puede perderse y requerir revisión manual.

Build: `node scripts/build-extension.mjs <directorio-de-salida>`. No requiere publicar en Chrome Web Store para probar el paquete en un perfil de desarrollo controlado. El usuario confirmó instalación y conexión de la cuenta en Chrome habitual; la observación de señales reales sigue pendiente. El build y las pruebas simuladas no prueban compatibilidad del portal actual.

## Resumen dentro del portal (extensión 1.1.0)

Una barra compacta encima del historial suma exclusivamente las columnas **Duration (Minutes)** y **Pay** de la tabla visible, sin depender de Twilio ni de la conexión al tracker. Funciona también en observación. El pago es el que figura en Propio, sin multiplicar minutos por una tarifa estimada; incluye pagos cero y ajustes negativos. Respeta cambios de filas, fechas y paginación de la interfaz. El rótulo **Página visible** distingue este subtotal del período completo: otras páginas y llamadas en curso no están incluidas. Los valores vacíos, pendientes o no reconocidos se excluyen de su suma y se marca **Total parcial**. No acumula datos entre páginas ni guarda llamadas del historial.

Solo lee los encabezados y las dos celdas numéricas necesarias, no IDs de clientes, audio, credenciales ni detalles de llamadas. No hace solicitudes, cambia filtros, pulsa botones de Propio ni importa datos al tracker. En Detalles se puede configurar una conversión secundaria opcional; guarda únicamente moneda y cambio en el almacenamiento de la extensión. La tasa no se obtiene automáticamente ni se supone que coincide con la cuenta del tracker.

El build incluye `propio-resumen.user.js`, una alternativa independiente para un gestor de userscripts ya instalado. **Usar solo una de las dos opciones**, extensión o userscript. El userscript guarda únicamente su configuración de conversión en el almacenamiento local de Propio, con una clave propia. El código, cálculos y comportamiento son los mismos en ambas opciones. No necesita el puente de llamadas ni registra llamadas automáticamente.

Probado contra tablas HTML y Angular Material simuladas. La compatibilidad con el historial real aún necesita comprobarse en la sesión del usuario; si cambian los encabezados, no muestra un total de una tabla desconocida.

Reconectar la misma cuenta no cambia el modo ni interrumpe una llamada. Pausar o cambiar de cuenta durante una llamada automática requiere esperar su final, o descartar explícitamente las señales y revisar la llamada activa en el tracker. Las señales vencidas o rechazadas se conservan hasta revisarlas; el popup permite descartarlas con confirmación y volver a observación.

Referencias: [observación HTTP de Chrome](https://developer.chrome.com/docs/extensions/reference/api/webRequest), [mensajería entre extensión y app](https://developer.chrome.com/docs/extensions/develop/concepts/messaging) y [add-on público usado para identificar los endpoints](https://chromewebstore.google.com/detail/propio-add-on-for-interpr/kmcnnnjpeldhklebpdgjibbpillbcplp). No se copió código ni se usa el servicio de Bilingual del add-on.
