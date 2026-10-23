# Auditoría profunda del 23 de octubre de 2026

Web 644, desde main `28b1016f349ed6a2f146361327192a9e345f8631`. Activada por la petición explícita del propietario. Se combinó revisión estructural, integridad transaccional, regresiones y uso interactivo del compilado. La extensión conserva 2.3.5 y su activación previamente confirmada; no requiere instalación nueva.

## Fallos encontrados y reparados

1. **Bienvenida rechazada que se guardaba después.** Nombre, emoji y marca de bienvenida quedaban mutados cuando fallaba el escritor local. Se restauran los campos anteriores, incluida su ausencia, sin escribir sobre otra cuenta. Regresiones: rechazo, guardado ajeno posterior y reintento.
2. **Racha modificada sin guardar.** Cambiar la regla de días libres conservaba el valor rechazado y ejecutaba cambios derivados del juego. Se revierte y repinta; Logros solo se actualiza tras guardar.
3. **Preferencias de Logros rechazadas.** Arma, sonido de arena/lateral y volumen quedaban en memoria. Comparten una escritura con rollback por propietario y restauran sus controles y audio al rechazar.
4. **Semanas personalizadas sin transacción.** Activar podía dejar una excepción huérfana; quitar borraba excepción e historial antes de confirmar. Ambas ramas guardan estado y ajustes juntos, revierten el rechazo y actualizan Logros después. La confirmación captura cuenta, vista, semana y horario; rechaza acciones obsoletas y semanas que ya quedaron en el pasado.
5. **Descarte de llamada pendiente que perdía su respaldo.** El rechazo o excepción al guardar dejaba memoria y bandera de recuperación ya borradas. Se restaura la instantánea completa y se conserva el modal; la confirmación valida propietario y actividad y solo se ejecuta una vez. También se conserva la exclusión de replay del puente cuando aún no existía candidato.
6. **Filas guardadas dentro de una llamada activa.** Manuales, ediciones e imports solo comprobaban llamadas ya terminadas; después la llamada live no podía guardarse por el traslape. Ahora protegen el intervalo activo; imports protegen también el pendiente. El intervalo es semiabierto: una fila que termina exactamente al comenzar la llamada sigue permitida. El importador interactivo puede omitir la fila problemática y el automático rechaza el lote sin aplicar cambios parciales.
7. **Recarga entre cierre y creación de candidato.** El respaldo contenía marcas exactas pero, sin candidato, el formulario reconstruía una manual con minutos y hora redondeados, perdiendo segundos e identidad del puente. Se utiliza el mismo constructor observado que el guardado automático; se conservan `records.tool`, milisegundos, identificador y fuente live. Caso de regresión: 461.234 ms.
8. **ACW que ignoraba una corrección manual.** El ancla, reconciliación, vínculo al detalle y plan del puente preferían el final antiguo de Propio. Usan el final vigente; la duración en milisegundos de la fila también sigue la edición cuando ese campo ya existía, sin añadirlo a filas antiguas. las fuentes originales siguen separadas e intactas. El detalle indica «Final corregido» y el origen de esa edición, sin presentar segundos calculados como observados.
9. **Premios posteriores borrados al descartar un turno automático.** Se restauraba todo el juego anterior a la llamada, incluso si otra llamada histórica ya guardada había obtenido premios. Se captura el efecto del inicio y se revierte solo ese cambio; luego se reconcilian llamadas y metadatos. Se preservan premios, recibos y elecciones posteriores tanto en activo como en pendiente.
10. **Etiquetas de Reportes en español al elegir inglés.** El estado futuro y los nombres de Productividad/Adherencia en tendencias no pasaban por traducción. Se traducen en el render y se prueban en ambos idiomas.

Además se actualizó **Zod indirecto de 4.1.11 a 4.6.6**, mediante override acotado al consumidor `@vercel/cli-config`. La alerta alta [GHSA-mrhx-c7xc-m3w5](https://github.com/advisories/GHSA-mrhx-c7xc-m3w5) describe agotamiento de memoria durante validación. El lockfile conserva el resto de versiones. Instalación congelada con pnpm 9 y carga de Vercel Blob correctas; audit posterior sin vulnerabilidades conocidas.

## Mes simulado e integridad

Se usó la interfaz compilada con cuenta ficticia, backend local persistente, revisiones y CSP que impide conexiones remotas. Un reloj exclusivo del fixture simuló **32 días consecutivos, del 1/9 al 2/10/2026**; no representa 32 días de espera real ni medición sobre la cuenta del propietario.

- 28 jornadas trabajadas y 4 domingos libres. Entradas tempranas, puntuales y tardías; llamada live, manual previa al turno, conciliación oficial y otra importada; Break y Lunch, cierre y reapertura cada jornada.
- Segunda importación del mismo texto: cero filas nuevas. Libro independiente comparado contra el backend: **84 llamadas, 476 minutos, $57.12 y 56 pausas**. Los 28 respaldos observados conservan sus 300.000 ms y la fuente oficial separada. Cero ids repetidos y cero errores de página.
- Un conflicto local/nube al reabrir con subida pendiente se resolvió desde la pantalla normal «Usar la de este dispositivo»; se conservaron las 60 llamadas de ese punto y la copia recuperable. No se mezclaron versiones a escondidas.
- El mes se ejecutó sobre 643 como línea base; los escenarios fallidos y recorridos adicionales se repitieron sobre el compilado 644 reparado. No se atribuye a 644 una segunda simulación mensual que no se ejecutó.

## Recorridos adicionales sobre la reparación

Se comprobó desde botones y formularios el rechazo de una manual e importación que cruzaban la llamada activa; la llamada live siguió guardándose. Una corrección de cinco a tres minutos movió ACW de 08:35 a **08:33**, conservando el final observado 08:35 y mostrando la explicación correcta.

Se borró y recuperó una llamada, se vació y recuperó el día, se cambió Bronce a Gold conservando el bono ya ganado, se editó horario y meta, se guardó nota y se contrastó con Calendario y Reportes. El reparto de Finanzas reservó $0.50 adicionales sin cambiar ganancias ni registrar un pago. Un recibido ficticio de $20.40 se contrastó con sus llamadas del ciclo. Una llamada 23:58–00:03 conservó su día contable anterior y se cerró el turno prolongado; Reportes mostró dos llamadas, ocho minutos y $1.23 con el bono preservado.

Exportación JSON real desde la interfaz: 86 llamadas tras los dos casos adicionales, ajustes, pausas, notas, reserva, recibido, correcciones y fuentes originales. Se probó su restauración por el selector de archivos y confirmación normal, conservando copia recuperable. Idioma y tema se cambiaron desde la UI; navegación y reportes se revisaron a 390 y 1280 px, con paletas originales clara y oscura. En móvil: viewport 391, raíz y cuerpo 376 px, sin overflow horizontal de raíz. No se alteró el layout del producto.

## Revisión estructural y validación

Inventario independiente: 91 módulos JS web/extensión y 170 vínculos; 722 ids estáticos sin duplicados ni destinos rotos; 252 botones, 92 inputs, 25 selects y cuatro textareas. Se revisaron controles delegados y dinámicos, contextos de módulos, excepciones parciales, confirmaciones y escritores. No se encontraron helpers libres inesperados ni imports/exports rotos. El inventario no demuestra todas las combinaciones de cada control.

Regresiones en `deep-audit-call-integrity`, `structural-controls`, contabilidad, recuperación, juego, registros y render de idioma. Resultado final local: 1.049 pruebas correctas, 47 más que la base; 2.850 textos ES/EN; 35 criterios, 91 suites y 97 módulos fuente. Validación final registrada junto a los artefactos externos: suite completa, catálogos ES/EN, imports/ciclos, wiring, criterios de producción, build y presupuestos, extensión compilada, scanner de credenciales e historial, dependencias y CI/publicación.

El scanner revisó 2.614 archivos/blobs de texto sin hallazgos. La suite se ejecuta después del build: una ejecución superpuesta leyó el directorio público mientras se reconstruía y fue repetida secuencialmente; no se modificó la prueba para ocultar esa condición de ejecución.

## Límites

No se crearon llamadas reales de Propio, una sesión Google humana nueva, dos PCs físicos ni certificación acústica. La sincronización y los rechazos se probaron con backend/identidades sintéticas y suites locales; no se cambió esquema ni configuración de Auth alojados. La eliminación irreversible de cuenta se revisó estructuralmente y en pruebas automatizadas, sin ejecutarla sobre la cuenta del usuario. Las reglas de facturación originales de Propio, indexación externa y limitaciones del sistema suspendido mantienen el alcance documentado del proyecto.

Las capturas, respaldo ficticio, ledger mensual y comprobante de producción se entregan fuera de Git en `outputs/` del chat, separados de los datos reales.
