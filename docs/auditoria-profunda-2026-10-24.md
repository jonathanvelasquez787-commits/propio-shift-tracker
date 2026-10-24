# Segunda auditoría profunda — 24 de octubre de 2026

Base examinada: web 644, `47b44dba6a10c5d27333a10398dbd86b46ce317c`. Resultado preparado: web 645 y extensión 2.3.6. Esta revisión amplía la auditoría anterior con respuestas tardías, guardados interrumpidos, formularios y confirmaciones obsoletos, intervalos pendientes, recibos de bonos y premios intercalados. No supone que pasar pruebas pruebe todas las combinaciones posibles.

## Hallazgos corregidos

1. Recuperar, editar o vincular una llamada podía ocupar el intervalo de una llamada pendiente aún sin guardar. Ahora esas operaciones comprueban tanto llamadas activas como respaldos pendientes, al previsualizar y al aplicar.
2. Rechazar un cambio de llamada o Higher Rate restauraba las reservas pero dejaba el informe de reparto cambiado; un guardado posterior podía conservar esa explicación falsa. Ahora ambos se revierten juntos, incluso al lanzar una excepción.
3. Una llamada eliminada perdía su bono ganado al recuperarla después de archivar o modificar la promoción. Los historiales nuevos conservan recibo completo y huella de la ventana; una corrección explícita actualiza esos recibos. El historial antiguo que solo guarda un importe no inventa un nivel ni reconstruye promociones.
4. Reversiones de recuperación, vinculación y Higher Rate podían restaurar referencias de otra cuenta si un escritor sustituía el estado. Ahora solo revierten objetos del intento original. Es una inyección adversarial de concurrencia; no afirma una carrera física entre dos equipos.
5. Una confirmación vieja de reinicio podía borrar progreso nuevo o de otra cuenta. Captura propietario y firma, y se consume una sola vez.
6. Acciones de premio, equipo y activación de Logros podían revertir campos sobre un propietario reemplazado durante un rechazo. Las reversiones quedan ligadas al estado original.
7. Elegir un cosmético del ciclo ya obtenido entretanto en un cofre consumía el premio sin añadir nada. Esa opción se omite y conserva la elección pendiente de 35 XP.
8. Las variantes de feedback quedaban en el idioma del primer render. Se traducen al idioma actual antes de interpolar nombres personales.
9. Una respuesta vieja de usuario autenticado podía devolver datos de una cuenta que ya había cambiado. Se vuelve a validar la sesión al recibirla.
10. Una RPC de permiso temporal colgada impedía renovar aun tras cambiar propietario o reanudar. Se separan generaciones, se abandona localmente la espera después de 25 s y se ignoran respuestas antiguas; no se concede permiso sin servidor.
11. Un ACK de una pestaña congelada bloqueaba toda la cola del puente. El envío vence a los 4 s, conserva el evento y permite reintento sin doble consumo.
12. Cerrar sesión después de una subida tardía podía archivar el respaldo de B bajo A y cerrar B. Se comprueba el propietario antes de archivar y salir.
13. Borrar filas/categorías y guardar formularios antiguos de Finanzas podía afectar una cuenta reemplazada o sobrescribir cambios posteriores. Se capturan propietario y datos del objetivo; una alta ya guardada no se repite. Una fila movida y las reservas actuales se conservan al borrar, respetando el contrato anterior.
14. Una excepción de escritura en las transacciones de Finanzas dejaba el ajuste en memoria. Se restaura igual que con un rechazo y se permite un reintento limpio.
15. La auditoría del registro npm encontró dos avisos en Undici 6.29.0, uno alto. Se fija únicamente `@vercel/blob>undici` a 6.29.1, parche compatible de la misma rama. Fuentes: [aviso oficial](https://github.com/nodejs/undici/security/advisories/GHSA-xjj6-f33q-929c) y [release oficial](https://github.com/nodejs/undici/releases/tag/v6.29.1).

## Evidencia automática

- 75 regresiones nuevas: 29 de llamadas/bonos, 27 de Logros, 7 de concurrencia y 12 de Finanzas. Cuatro casos existentes de Higher Rate ampliados; fixture antiguo de reset actualizado con ajustes realistas.
- Suite completa: 1.125 pruebas, cero fallos. Build, imports/exports/ciclos de 46 módulos, wiring y 36 criterios que mapean 94 suites/97 módulos correctos. Catálogo de 2.851 textos ES/EN y presupuestos de compilación correctos.
- Dependencias completas: cero vulnerabilidades conocidas después del parche. Escáner de secretos: 2.647 archivos/blobs de texto e historial, cero hallazgos al ejecutar antes del commit final.
- Además: 128 ciclos adversariales reproducibles de integridad con 176 checkpoints, persistencia serializada, rechazos, recuperación y reservas reales. Las decisiones aleatorias y premios pendientes no se revierten indiscriminadamente ni se conceden dos veces.

## Simulación de interfaz y persistencia

Se usa la app compilada y sus controles normales, con una identidad ficticia, servidor local aislado y reloj explícito de prueba. El servidor sustituye únicamente Auth/transporte y hora; una CSP impide conexiones externas. No se cargan datos personales ni se escribe en producción.

La simulación nueva recorre del 1 de octubre al 4 de noviembre: 35 días, 30 laborables y 5 libres; alterna entradas 07:55/08:00/08:15, llamada cronometrada de 39.000/40.000/79.404 ms, pausas de 1 y 5 min, manual de 7,5 min, importación oficial, repetición de importación y cierre/recarga. Se verifican desde el respaldo final los 90 registros, 465 minutos, 54 USD, 60 pausas y 30 pares tool/Propio; los milisegundos observados siguen intactos aunque el registro oficial marque 1 min. El manual de 7,5 min conserva duración exacta y estima 7 min pagables conforme a la regla personal de 40 s, no 0,90 USD. La importación repetida guarda cero filas. No hay errores JS registrados. Dos conflictos del backend ficticio se resolvieron mediante «Usar la de este dispositivo», conservando los 81 y 84 registros existentes. Tres esperas de observación agotaron el plazo de la herramienta pese a mostrar Finalizado; se verificaron después el cierre y el importe, sin repetir las mutaciones.

Las pruebas de fallos usan handlers reales, estado sintético y escritores controlados que devuelven false, lanzan excepción o sustituyen propietario; no se presentan como experiencia de hardware real. Los recorridos de interfaz confirman persistencia y visualización; la inyección fina de concurrencia corresponde a las regresiones automatizadas.

Después del mes se creó y editó un gasto desde la interfaz, se recargó y se verificó el nombre y el presupuesto persistidos. Finanzas se comprobó a 390 px en claro y oscuro, sin desbordamiento horizontal; estas capturas son del entorno ficticio.

## Extensión y límites

Extensión2.3.6 empaquetada e instalada en la ruta existente, con respaldo previo de 22 archivos. Los 21 archivos de paquete coinciden por SHA256 y las preferencias personales se conservan byte por byte. Release del paquete 645.0.0/2.3.6. Activación runtime 2.3.6 no certificada: la última versión activa confirmada por el usuario sigue siendo 2.3.5. Copiar archivos no demuestra recarga en Chrome.

No se certifican una llamada real de Propio, OAuth humano, dos PCs físicos, micrófono/audio nativo ni gestos de un teléfono físico. No se modifican Auth alojado, RLS ni SQL. La auditoría conserva el alcance y las limitaciones documentadas; no equivale a garantía de ausencia total de errores.

## Publicación

La evidencia de CI, merge y verificación pública de salud/commit/activos se conserva en el resultado externo de esta entrega. El cierre se anuncia solamente después de comprobarlo, distinguiendo publicación de web y activación de extensión.
