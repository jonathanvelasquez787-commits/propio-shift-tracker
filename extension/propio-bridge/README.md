# Conexión con Propio

Puente de llamadas MV3 propio, separado de Propio · Minutos y ganancias. Este paquete no inyecta barras en Propio, suma páginas ni incluye un userscript de historial. Observa únicamente solicitudes exitosas de disponibilidad en el portal y señales de llamadas en el endpoint de eventos de Twilio iniciadas por ese portal. No pulsa disponibilidad/aceptar/colgar, graba audio ni envía información a terceros. No necesita credenciales ni datos de clientes. Guarda localmente tipos de señal, tiempos, identificadores aleatorios de llamada y la cola pendiente; la cuenta del tracker se identifica por un hash.

## Preparar el registro desde la primera llamada

Abrir una sola pestaña del tracker e iniciar sesión. En el popup, pulsar Conectar esta cuenta y activar Registrar llamadas automáticamente. Desde 1.3.0 no exige observar una llamada previamente: el usuario puede dejarlo activado antes de trabajar. Por defecto sigue en observación, que no modifica registros. Activar a mitad de una llamada descarta el estado observado y espera la siguiente aceptación; no convierte un final suelto en una llamada nueva.

Con automático activado: una señal de aceptación inicia el contador del tracker; un final coincidente guarda la llamada usando la ruta existente de persistencia, ganancias y gamificación. Incoming, Start Calls y rechazos no crean llamadas. Repetir un final, recargar o sustituir por importación oficial conserva la deduplicación. El tiempo y pago automáticos son estimados con la tarifa del tracker; importar el historial oficial corrige ambos sin duplicar la llamada ni su progreso.

Las señales se identificaron en el add-on público de 2023. Su compatibilidad con Propio actual queda pendiente hasta observarlas durante una llamada normal. El código puede prepararse antes, pero las pruebas simuladas no certifican una llamada real. No provocar una llamada únicamente para probar. No interpreta disponibilidad como estar en llamada ni Offline como Break/Lunch.

## Persistencia y revisión

Entrega a una única pestaña de la cuenta conectada. Conserva hasta 200 eventos y reintenta cuando vuelve la app. Las señales mayores de 24 horas pausan y requieren revisión. Una llamada manual activa, un traslape, varias pestañas o un respaldo pendiente bloquean la entrega. Cambiar de cuenta con pendientes exige resolverlos primero. El reducer y la cola sobreviven al reinicio del worker; una solicitud HTTP en vuelo al detenerse el worker puede perderse y requerir revisión.

Reconectar la misma cuenta mantiene el modo. Pausar o cambiar de cuenta durante una llamada automática exige esperar el final, o descartar explícitamente señales revisadas y revisar la llamada activa en el tracker. El popup permite ese descarte con confirmación. La recarga que invalida scripts anteriores detiene sus mensajes/listeners/temporizadores pendientes sin una excepción no capturada.

## Instalación y actualización

La versión 1.4.0 admite formularios y los gateways documentados de Twilio `eventgw.us1`, `eventgw.ie1` y `eventgw.au1`. Chrome puede pedir acceso a esos tres hosts al actualizar. El popup distingue solicitudes observadas de señales reconocidas, incluso cuando el portal usa un formato que aún no entendemos. El diagnóstico guarda solo categorías, formato, hora y resultado HTTP; nunca URLs, headers ni cuerpos. Esta mejora no certifica la compatibilidad con el portal actual: se confirma al observar una llamada normal. El Shift sigue siendo manual en el tracker; login/logout del portal no se interpreta como inicio/fin del turno.

El botón de recargar de Chrome relee la carpeta instalada; no descarga archivos. Reemplazar primero el contenido de esa carpeta por el paquete actualizado, después recargar la extensión y las pestañas del portal y tracker. Esto conserva la configuración existente. Si se eliminó la extensión, cargar de nuevo la carpeta que contiene manifest.json mediante Cargar descomprimida y conectar la cuenta.

Build: node scripts/build-extension.mjs <salida>. El usuario confirmó instalación y conexión originales, luego reinstaló; el estado actual de vinculación/automático necesita comprobarse en su popup. La nueva autorización permite activar desde la primera llamada sin validación previa. Build, entrega, guardado, recarga, duplicados y corrección oficial se prueban en Chromium aislado con toda la red externa interceptada.

Referencias: [observación HTTP de Chrome](https://developer.chrome.com/docs/extensions/reference/api/webRequest), [mensajería](https://developer.chrome.com/docs/extensions/develop/concepts/messaging) y [add-on público usado para identificar endpoints](https://chromewebstore.google.com/detail/propio-add-on-for-interpr/kmcnnnjpeldhklebpdgjibbpillbcplp). No se copió código ni se usa su servicio de Bilingual.
