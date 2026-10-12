# Auditoría super profunda — segunda revisión del 12 de octubre de 2026

Base: `main` en `d0d87068353f2de2312570b858d2852b9c5d22aa`. Esta revisión
ejecuta el protocolo de `instrucciones.md` solicitado por el propietario y
complementa la auditoría anterior del mismo día. Los defectos anteriores se
conservan corregidos; los siguientes se reprodujeron sobre esa base antes de
aplicar sus reparaciones. Versión resultante: 602.

## Fallos reproducidos y corregidos

- **SP01, P1 — Salida interrumpida después de borrar una cuenta.** El callback
  de `injectDeleteAccount` referenciaba una variable `session` fuera de su
  alcance. El servidor podía borrar la cuenta y luego la interfaz lanzar un
  ReferenceError sin completar la limpieza y la salida. Recibe el propietario
  explícitamente y obtiene la sesión dentro del callback.
- **SP02, P1 — Borrado con identidad cambiada.** Una confirmación antigua
  podía usar el token de una cuenta distinta. Un cambio durante DELETE podía
  limpiar o cerrar la nueva cuenta. Se valida el propietario del token antes
  de enviar y la identidad del documento y almacenamiento después de responder.
  La cuenta nueva se conserva. Se usaron identidades ficticias.
- **SP03, P2 — Limpieza local rechazada bloqueaba la salida.** Si el navegador
  rechazaba borrar una copia recuperable o limpiar el snapshot, el borrado remoto
  ya exitoso no terminaba de retirar el token y salir. Las limpiezas se intentan
  independientemente, y la salida continúa. La eliminación física local puede
  fallar si el almacenamiento está bloqueado: no se certifica que se haya borrado.
- **SP04, P2 — Error de sesión sin respuesta al borrar.** `getSession` estaba
  fuera del manejo de errores. Un refresh rechazado terminaba sin mensaje útil.
  Ahora muestra el aviso de reintento existente y conserva datos y sesión.
- **SP05, P1 — Decisión de arranque con metadata antigua.** Mientras se esperaba
  la nube, otra pestaña podía editar datos o cambiar su propietario. El arranque
  aún decidía descargar usando los valores previos. Relee metadata después de
  la descarga y revalida el propietario en el fallback de red. Conserva la copia
  ajena cuando corresponde cambiar de cuenta.
- **SP06, P1 — Elección de conflicto reemplazaba ediciones posteriores.** Si
  otra pestaña guardaba mientras el diálogo seguía abierto, elegir una versión
  podía reemplazar un snapshot que ya no era el mostrado. Se compara el snapshot,
  revisión y propietario observados antes de aplicar la elección. Si cambian,
  recarga sin sustituir datos. Una regresión adicional mantiene la compatibilidad
  con snapshots legacy sin dueño, evitando un bucle de recargas.
- **SP07, P1 — Arranque offline y carga diferida con propietario cambiado.**
  La identidad offline se capturaba antes de resolver la sesión; los datos
  locales podían pertenecer a otra cuenta al montar. También se comprobó la
  ventana mientras se espera el import de producción. El documento conserva
  el dueño esperado; se comprueba antes y después del import y alrededor de
  las lecturas iniciales de modelos, antes de migraciones y guardados. El test
  con Rollup e import aplazado pasó de leer tres modelos ajenos a leer/escribir
  cero y conservar el gate; el control positivo del mismo dueño abre normalmente.
- **SP08, P1 — JSON idéntico ocultaba un cambio de dueño.** La revisión de las
  tres claves permitía guardar si dos cuentas tenían el mismo JSON, aunque la
  metadata ya identificaba a otra. Cada escritor protegido verifica también el
  dueño esperado. Cambiar solamente revisión o dirty de la misma cuenta permite
  guardar normalmente.
- **SP09, P2 — Duración incompleta guardada como cero.** `Number('')` convertía
  campos vacíos y inputs con `badInput` en llamadas válidas de cero minutos.
  Afectaba altas, ediciones, preview y recuperación live. Se exige entrada no
  vacía y válida; el cero explícito sigue permitido y un rechazo conserva el
  respaldo y el borrador del pago. Reproducido también en navegador real.
- **SP10, P2 — Hora cero aceptada en un reloj de 12 horas.** `0:00 AM` y
  `00:30 PM` se interpretaban como horas válidas. Se exige 1–12; `12 AM` sigue
  siendo medianoche y `12 PM`, mediodía. El pegado real rechaza `0:19 AM` sin
  crear una llamada y conserva la entrada para corregirla.
- **SP11, P2 — Premios Higher Rate guardados antes de los ajustes.** Cambiar
  Bronze a Gold podía persistir el premio de Gold mientras una cuota impedía
  guardar los ajustes nuevos. Eliminar ventanas tampoco restauraba todos los
  bonos congelados y las asignaciones financieras. Se guarda primero el snapshot,
  se restaura el modelo ante rechazo y después se reconcilia el juego. El render,
  que también puede conceder premios, se difiere para estas mutaciones. Reintentar
  y guardar otra vez no duplica el callback ni premios. El editor conserva el
  borrador; la eliminación rechazada recupera su fila.
- **SP12, P2 — Controles de cabecera inaccesibles en móvil.** El espacio de
  acciones se reducía y recortaba Avisos y Higher Rate. Los centros de ambos
  botones caían sobre la marca; los clicks no abrían sus modales. La fila ahora
  puede envolver y el grupo conserva su ancho sin recorte. Mismos controles,
  listeners y temas. Comprobado antes y después a 320 y 390 px en claro/oscuro,
  más escritorio después de corregir.
- **SP13, P3 — Texto y estados dependientes del idioma.** Algunos toasts,
  estados de bloque, motivos de adherencia y rótulos financieros seguían en
  español en English. La clase de color comparaba etiquetas traducidas con
  palabras españolas. Se traducen los textos de interfaz y las clases se derivan
  de los estados reales, conservando nombres personales, fechas y claves guardadas.
  Los renders reales de Horario y Finanzas y el cierre de turno se prueban en
  ambos idiomas. El catálogo y la comprobación de traducciones se regeneraron.

## Simulación cronológica e integridad

- Se reejecutó el recorrido de 31 días con 161 checkpoints, 72 llamadas finales,
  31 snapshots y 31 conciliaciones de exportación. Incluye importación, manual,
  live, correcciones, borrados, duplicados, metas, sesiones y recargas.
- Segundo recorrido de 31 días: 31 conciliaciones de pagos, 29 pagos finales,
  cambios de moneda/tasa, reinicios de asignación y correcciones. Los pagos siguen
  siendo independientes de las ganancias y del dinero asignado.
- Recorrido nuevo de **42 días**, del 1 de febrero al 13 de marzo de 2024:
  29 de febrero, importaciones a medianoche, Higher Rate, 84 entradas incompletas
  rechazadas, correcciones oficiales, borrados, reparto automático y recargas.
  Ledger independiente de minutos y centavos: 75 llamadas finales, 42 snapshots
  y 42 exportaciones reconciliadas. No equivale a esperar 42 días reales.
- Se reejecutaron 17.000 casos con oráculos independientes: dinero, intervalos
  de trabajo/pausas, Higher Rate y cascadas financieras. Migraciones, RLS,
  cuotas, recuperación, criptografía, PWA y extensiones conservan sus suites.

## Controles y recorrido real de navegador

Inventario AST de `app.html`: **343 controles** (227 botones, 76 inputs,
17 summaries, 19 selects, 4 textareas) y 20 enlaces. Imports/exports y ciclos,
targets de modales, navegación, IDs, listeners y helpers pasan sus guardas.
La matriz de producción relaciona las suites nuevas con sus áreas. El inventario
no significa haber pulsado todas las combinaciones de controles dinámicos.

Se usó el bundle de producción con una cuenta ficticia y backend HTTP local:
turno, dos llamadas live, Break interrumpido por llamada, Lunch, llamada manual,
edición, borrado, Higher Rate Gold/Silver, gasto y pago independiente, horario,
nota de día, Reportes, Calendario, meta anual, Logros, nombre del monstruo,
cierre de etapa, idioma y temas. La recarga conservó los cambios en el backend.

El pegado histórico agregó una llamada y el duplicado exacto no volvió a crearla.
Se importó un JSON ficticio mediante el selector real; el reinicio diario dejó
cero llamadas, conservó horario/ajustes, y reimportar restauró llamadas, pausas,
nota, pagos y Higher Rate. Restaurar una copia recuperable conservó también la
versión desplazada. Los conflictos observados se resolvieron explícitamente.

Viewport real: escritorio 1280 px (client/scroll 1265), override 390 efectivo
391 px (client/scroll 376), y 320 px (client/scroll 305). Se comprobó el fix de
cabecera en ambos temas; Inicio, Finanzas, Reportes, Calendario y Ajustes tuvieron
recorridos móviles. Sin errores/warnings de consola en las consultas finales ni
eventos runtime en el backend ficticio. Los mensajes ocultos con opacidad cero
de la captura de accesibilidad no se clasificaron como fallos visibles.

## Seguridad y operación alojada

Inspección de solo lectura: PostgreSQL **17.11.0.003 / 17.11**, proyecto
`ACTIVE_HEALTHY`, nueve tablas públicas con RLS, diez políticas de propietario
para authenticated y nueve migraciones coincidentes. Ninguna tabla pública
concede SELECT a anon. Solo perfiles, user_data y llamadas permiten lectura de
cliente autenticado, limitada al dueño. RPC administrativas y funciones de
triggers no son ejecutables por visitantes ni clientes autenticados.

Advisors: sin hallazgos de rendimiento. Las seis tablas privadas con RLS sin
políticas deniegan deliberadamente al cliente; no se añadieron políticas para
silenciar el aviso. `username_available` solo devuelve disponibilidad y
`wipe_my_data` exige UID y restringe la eliminación a sus filas. Email continúa
deshabilitado y Google activo; la protección de contraseñas Email no se presenta
como una tarea nueva. Referencias: [RLS](https://supabase.com/docs/guides/database/postgres/row-level-security)
y [aviso definer](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable).

Readiness, monitor y copia externa saludables; cuatro jobs operativos activos.
No se restauraron llamadas reales: el borrado intencional previamente confirmado
se conserva. No se ejecutó el borrado de la cuenta real ni mantenimiento nuevo.

La consulta de dependencias no encontró avisos conocidos. El escaneo de árbol
e historial disponible no encontró coincidencias de credenciales; sus patrones
y los avisos publicados limitan esas conclusiones. Acciones de CI fijadas a SHA,
lockfile y versiones de paquetes conservados.

Producción base pasó **20/20 controles públicos**, con 12 assets de app HTTP 200:
health y release exacto, CSP/HSTS/nosniff/frame protection, no-store para app y
entrada de cuenta, rutas internas 404, operaciones/borrado sin autorización
denegados, Google exclusivo, tablas y exportación privada denegadas a anon.
La CLI confirmó `READY`, entorno producción y SHA `d0d8706`. El conector Vercel
denegó acceso al equipo; la alternativa CLI funcionó. Un fallo local de módulos
de la CLI al usar inspect no se atribuye a la app; list con JSON acreditó el estado
y commit. CI y publicación de los cambios se comprueban aparte en la entrega.

## Límites

Las carreras de cuenta usan código real, Rollup y sesiones/almacenamientos
controlados; no acreditan dos usuarios Google humanos ni atomicidad completa
de localStorage entre procesos. El navegador local verifica el SDK contra un
fixture HTTP; no equivale a escribir desde dos teléfonos en la nube real.

Se pulsó Export JSON sin error runtime, pero la espera de download de la
herramienta agotó su tiempo: no se acredita el archivo descargado. La importación
JSON real sí se completó. CSV/PDF e impresión no se certifican por este recorrido;
sus contratos y suites existentes se ejecutan automáticamente. No se probaron
todos los accesorios, paletas, dispositivos físicos, audibilidad del hardware,
instalación de extensiones o sesión de PWA móvil sin red. La visibilidad por
nombre en Google conserva el pendiente externo documentado; no se repitieron
solicitudes de indexación ni se publicaron mensajes externos.

## Validación final de la integración

- **573 pruebas, cero fallos, cero omitidas**: 42 pruebas nuevas sobre las 531
  de la base; regresiones de todos los grupos con controles positivos/negativos.
- **2.195 textos** ES/EN; **35 contratos de módulos**; wiring y sintaxis correctos.
- Matriz: **17 áreas, 56 suites y 58 módulos fuente**. Es trazabilidad estructural,
  no certificación de cada combinación dinámica de interfaz.
- Build de app, puente y resumen correcto; budgets de tamaño conservados.
- La última comprobación real del bundle confirmó **History (1 past)**, la
  ayuda del pegado en inglés con ejemplo Propio intacto, Assigned en preview,
  Skipped y motivos de adherencia en inglés; consola sin errores/warnings.
