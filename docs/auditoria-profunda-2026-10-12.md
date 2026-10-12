# Auditoría integral — 12 de octubre de 2026

Alcance: app, cuentas Google, guardado local/nube, llamadas, turnos, pausas,
Horario, Reportes, Calendario, Fechas de pago, Finanzas, Logros, importaciones,
exportaciones, API, PostgreSQL, recuperación, PWA y extensiones. Email/SMTP sigue
deshabilitado por decisión del propietario. No se cambió el diseño de Finanzas.

## Fallos reproducidos y corregidos

- **DA01, P3 — Meta decimal modificada al guardar sólo el reparto.** Una meta de
  250.7 minutos se convertía en 250.69998 al pasar por las horas redondeadas de
  Finanzas. Se conserva el valor original cuando las horas no se editaron.
- **DA02, P2 — Pausas y ACW incorrectos.** Un Break corto dentro de un hueco largo
  atribuía el hueco completo al descanso y ocultaba el ACW restante. También se
  omitían pausas posteriores a la última llamada. Los totales usan intervalos
  reales y contabilizan por separado los minutos residuales.
- **DA03, P2 — ACW fuera de un turno explícito.** Una llamada manual/importada
  anterior al turno generaba ACW durante la desconexión. Los huecos automáticos
  se recortan a las sesiones conectadas, tanto en cabecera como en los bloques.
  La clasificación manual sigue siendo una decisión explícita del usuario.
- **DA04, P2 — Respaldo inválido aceptado antes de sustituir datos.** Registros
  nulos, primitivos o sin fechas válidas en eventos/pausas podían romper la
  interfaz. Se rechazan antes de confirmar o cambiar los datos existentes;
  formatos antiguos válidos siguen siendo compatibles.
- **DA05, P2 — Pago numérico interpretado como texto de importación.** El campo
  numérico admitía `1e-2`, pero el parser de exportaciones lo interpretaba mal.
  Manual y edición ahora guardan US$0.01 y rechazan valores no finitos, mayores
  de US$1,000,000,000 o incompletos. El parser y los IDs de importación quedan
  compatibles con los datos anteriores.
- **DA06, P2 — Break contado también como Lunch manual.** Un hueco de 60 minutos
  marcado Lunch encima de un Break real de 10 daba 70 minutos de pausas. Ahora
  conserva Break 10 y Lunch 50; totales, adherencia y asignación a bloques usan
  los mismos intervalos sin duplicarlos.

Además, el texto de Horario identifica correctamente que «Bloques del día» se
encuentra en Inicio.

## Verificación automática

- 530 pruebas, cero fallos y cero omitidas; 14 casos nuevos respecto a las 516
  de la versión anterior. Cada defecto tiene una reproducción que falló antes
  de corregirlo y pasa con el cambio.
- Uso contable cronológico de 31 días: 161 reconciliaciones, 72 llamadas
  finales, 31 snapshots y 31 exportaciones. No equivale a esperar un mes real.
- Segundo recorrido de 31 días con handlers de llamadas, cambio de moneda,
  pagos, correcciones, reinicios de asignación y recargas: 31 conciliaciones
  mensuales, 31 altas de llamadas y 29 pagos finales independientes de asignar.
- 17,000 casos de modelos con oráculos independientes de dinero, minutos,
  Higher Rate y cascadas de asignación. También pasan RLS/migraciones reales
  en PostgreSQL aislado, cuota, concurrencia, identidad, criptografía, juego,
  importación, recuperación y contratos de extensiones.
- Inventario estático: 343 controles internos y 20 enlaces. El único ID sin
  referencia directa, `sidebarAppearanceBtn`, tiene el listener delegado de
  `data-open-appearance`; no es un botón sin conexión.
- 35 contratos de módulos, wiring y 2,181 textos ES/EN correctos. La matriz
  relaciona 17 áreas, 53 suites y 58 módulos fuente. Comprueba trazabilidad;
  no acredita todas las combinaciones posibles de cada control dinámico.
- Build de app, puente y resumen correcto; escaneo de secretos de archivos e
  historial sin hallazgos; dependencias sin vulnerabilidades conocidas.

## Navegador y persistencia

Cuenta ficticia y backend HTTP local, usando el bundle de producción:

- Turno, llamadas live, Break/Lunch, cierre breve de llamada manual, nombre del
  monstruo, edición/restauración de la meta del último bloque y recarga.
- Dos llamadas importadas y nuevo pegado duplicado sin nuevas altas.
- JSON exportado, respaldo inválido rechazado, reinicio del día y restauración
  del JSON con siete llamadas sin introducir datos de prueba en producción.
- Pago manual `1e-2` guardado como un centavo. `1e` mantiene abierto el editor,
  muestra error y no crea otra llamada.
- Finanzas: 4.5 horas → 270 minutos y US$32.40; reparto 60/20/20, pago de US$5,
  ayuda del método y asignaciones anteriores 60/20/10 conservadas. El backend
  confirma ocho llamadas y un pago independiente.
- Navegación de Reportes, Fechas de pago y Calendario; creación y edición de una
  ventana Higher Rate y configuración del descanso por productividad.
- Recarga final conserva meta, reparto, llamadas y pago. Las siete páginas
  activas no desbordan horizontalmente a 1,265 px efectivos; consola sin errores.
  El navegador de Codex no aplicó la solicitud de 390 px (mantuvo 1,265 px incluso
  en otra pestaña): este recorrido no se contabiliza como prueba móvil real.

La captura de accesibilidad incluye mensajes con opacidad cero; no se toma
un texto oculto del DOM como evidencia de un error visible. La protección de
revisiones exige recargar una copia antigua y no debe retirarse para acelerar
el guardado.

## Plataforma y mantenimiento

La revisión pública previa al mantenimiento pasó 18/18 controles: Auth Google
exclusivo, rechazo de accesos anónimos y RPC privado, rutas internas no
expuestas, validación API, HTTPS, CSP, HSTS, no-store y health correcto.
Nueve tablas tienen RLS; tablas operativas sin políticas deniegan acceso al
cliente. Las funciones intencionalmente privilegiadas verifican identidad y
no conceden ejecución anónima. Nueve migraciones coinciden con el repositorio.

El propietario autorizó actualizar PostgreSQL 17.6.1.166 a 17.11.0.003 «ahora».
Supabase inició el mantenimiento el 12/10/2026 a las 07:14:45 de Honduras. La
copia diaria se actualizó y comprobó contra estado/ajustes antes de confirmar.
Se guardaron conteos y huellas privadas para comparar tras el mantenimiento.
La nube tenía cero llamadas antes de actualizar; el propietario confirmó que
las borró a propósito. No se restauran esas llamadas.

La compatibilidad revisada no usa ltree, btree_gist, operadores de selectividad
personalizados ni funciones PGP de la app. Referencias oficiales:
[cambios de 17.11](https://supabase.com/changelog/postgres-15-19-17-11-breaking-changes)
y [procedimiento de actualización](https://supabase.com/docs/guides/platform/upgrading).
La versión y recuperación del servicio se verifican después del mantenimiento;
iniciar una actualización no acredita que haya terminado.

## Límites

Hay una sola cuenta Google real disponible. El aislamiento entre usuarios se
prueba con identidades sintéticas y políticas SQL reales; no se certifican dos
usuarios Google humanos. No se borró la cuenta real ni se hicieron compras.
Las pruebas de sonido no acreditan el hardware de cada dispositivo. Los tests
de PWA no acreditan cada teléfono; el monitor local requiere equipo y Codex
disponibles. No se promete ausencia absoluta de bugs ni pérdida cero entre
copias diarias. La visibilidad por nombre en Google sigue siendo externa.

CI, revisión del PR, SHA publicado, estado de la actualización y controles
públicos posteriores se registran por separado de la validación local.
