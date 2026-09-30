# Auditoría profunda — 30 de septiembre de 2026

Auditoría activada por el comando explícito del usuario y ejecutada sobre la
versión 575. Las reparaciones integran la versión 576. No se cambiaron los
protocolos permanentes ni el diseño de la interfaz.

## Fallos reproducidos y reparados

1. **Premio mensual adelantado.** A las 19:00 del 30 de septiembre en Honduras,
   el recibo de Finanzas se registraba en octubre porque usaba el mes UTC.
   Ahora usa año y mes locales, igual que las fechas de llamadas. La regresión
   comprueba septiembre, revocación, recarga y el cambio real a octubre.
2. **Recompensas persistidas sin la llamada.** Si fallaba la escritura de
   llamadas por cuota, `saveAll` restauraba el almacenamiento anterior, pero
   un `saveStateOnly` posterior guardaba el recibo de la nueva llamada. Además,
   «Llamada agregada» reemplazaba el aviso de error. Un snapshot pendiente
   obliga a reintentar estado, llamadas y ajustes juntos; el aviso conserva
   prioridad hasta completar el guardado. Los cambios continúan en memoria
   durante el fallo, como indica el aviso existente.
3. **Respaldo sin su escudo.** El JSON se serializaba antes de conceder el
   escudo semanal. Ahora incluye el escudo y su recibo, de modo que restaurar
   ese mismo respaldo no permite concederlo otra vez.
4. **Exportación truncada.** CSV y PDF compartían un recorrido limitado a 400
   días aunque el formulario aceptaba períodos mayores. Ahora se recorre el
   rango completo. La regresión verifica 730 días y una llamada del último;
   el navegador descargó un CSV que conserva llamadas posteriores al día 400.
5. **Gasto recurrente sin recompensa.** La UI consideraba pagado un gasto con
   su monto completo, pero el juego exigía `manualPaid`, una opción que esa
   fila no muestra. Ambos usan ahora el mismo criterio `financeIsRowPagado`.
   Se comprueba concesión, recarga sin duplicación y revocación al reiniciar.
6. **Restauración destructiva ante escrituras rechazadas.** Guardado local,
   hidratación de nube y reemplazo de escenario QA borraban todas las claves
   antes de restaurarlas. Si el navegador tampoco permitía reescribirlas,
   perdían datos que todavía estaban intactos. Ahora se restauran únicamente
   las claves efectivamente escritas, incluyendo el identificador de escenario
   QA. Hay regresiones para rechazo total y fallo a mitad de la hidratación.
7. **Cambios durante una subida marcados como sincronizados.** La respuesta
   de una subida limpiaba `dirty` aunque las llamadas hubieran cambiado mientras
   esperaba la red. Ahora compara el snapshot enviado con el actual, mantiene
   el cambio pendiente y programa otro delta con la nueva base del servidor.
   QA no se activa si todavía quedan cambios reales pendientes. Se comprueban
   el segundo delta, conflictos, error de red y reintento.

## Cobertura ejecutada

- Chrome con reloj controlado, datos sintéticos y almacenamiento QA aislado:
  31 días consecutivos, del 1 de septiembre al 1 de octubre; 27 días con turno,
  4 días sin turno y 108 llamadas. Cada jornada con trabajo incluyó llamada
  live, formulario manual, pegado oficial, duplicado, corrección, Break,
  Lunch y cierre. Se compararon llamadas y recibos completos antes y después
  de recargar; no aparecieron duplicados ni excepciones del navegador.
- Flujos adicionales: llamada antes y después del turno, futuro y traslape
  rechazados, edición, día libre real y trabajo importado en ese día, turno
  vacío, continuación accidental, segunda sesión, pausa continuada descartada,
  interrupción por llamada y recarga durante llamada/pausa. Cruce de medianoche
  con llamada atribuida al día de inicio; cierre, borrado y reinicio.
- Horario: plantilla, día libre, ajuste de horario y semana personalizada.
  Ajustes: nombre, moneda y meta diaria. Higher Rate: creación, fechas, horas
  y nivel. Finanzas: alta, asignación y premio. Avisos: configuración persistente.
  Calendario y Reportes: navegación y meta anual. Exportación/restauración JSON
  y exportación CSV con período mayor a 400 días.
- Ambos recorridos QA completos, recarga, reinicio y salida/restauración;
  llamadas actuales e históricas, monstruo de ayer, duplicados, efectos,
  movimiento reducido y foco. Las verificaciones preservan las reparaciones
  de Logros, guía y fila Shift/Break/Lunch de la versión anterior.
- Ocho páginas, temas claro/oscuro y anchos 1365, 390 y 320 px: 48 combinaciones
  de navegación/render sin overflow horizontal del documento. La revisión
  específica de Logros también cubre tablet de 768 px.
- Inventario de 457 controles en la simulación mensual, junto con revisión de
  ids, referencias de modales, labels, `aria-controls`, rutas y handlers directos
  y delegados. No se afirma que cada variante dinámica se haya pulsado.
- Análisis de los 30 módulos JS: 5369 llamadas sintácticas, sin helpers llamados
  sin definición/import; nueve contratos de inyección completos. El recorrido
  QA se verificó además con sus pruebas funcionales.
- Revisión de sincronización, aislamiento QA, RLS y límites en las migraciones,
  CSP y build público; auditoría de las nueve dependencias de producción sin
  vulnerabilidades reportadas.
- Lecturas anónimas en Supabase de producción: `calls`, `user_data` y
  `daily_backups` devolvieron cero filas; `app_errors` rechazó la lectura con
  401. Landing/app responden 200 con CSP, los archivos fuente privados
  responden 404 y telemetría rechaza GET con 405. No se hicieron escrituras.

## Regresión y límites

Se agregaron 13 pruebas funcionales en `audit-persistence.test.mjs`,
`sync-integration.test.mjs` y `reinforcement-integration.test.mjs`, y se
actualizaron dos guardas estructurales de `deep-audit.test.mjs`. La suite final
contiene 187 pruebas. Imports/exports, ciclos y wiring verifican 21 módulos
de la app; el build genera producción sin sourcemaps ni fuentes JS públicas.

La simulación de red usa respuestas controladas del RPC y ejecuta la lógica
completa de sincronización. No se certifica una sesión autenticada real en
dos dispositivos, OAuth, entrega de correos, cron de backup de Supabase,
instalación PWA en un teléfono físico ni audio audible en hardware. No se
usaron llamadas reales ni se modificaron datos personales para esta auditoría.
Las limitaciones deliberadas de `instrucciones.md` siguen vigentes.
