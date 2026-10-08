# Auditoría profunda — 8 de octubre de 2026

Activada por el comando explícito del usuario sobre la versión 595. Las
reparaciones forman la versión 596. No se modificaron los protocolos permanentes,
el diseño ni los datos de la cuenta real. El navegador ejecutó datos sintéticos
en localhost; las comprobaciones de producción fueron de solo lectura.

## Seis fallos reproducidos y corregidos

1. **Un error de nube podía sustituir el historial vigente por el legado.**
   `fetchCloud` usaba `user_data.calls` ante cualquier error de la tabla normalizada,
   aunque ese campo ya podía estar vacío. Fallos de red, permisos y timeout ahora
   interrumpen la descarga y conservan el almacenamiento local. Solo una tabla
   ausente (`42P01`, `PGRST205`) habilita la compatibilidad anterior.
2. **Historial truncado al descargar más de 1000 llamadas.** La consulta única
   quedaba limitada por la API. Se reprodujo con 2505 filas y solo 1000 devueltas.
   Ahora pagina con orden estable por `call_id`, avanza por la cantidad realmente
   recibida y solicita conteo exacto. También cubre un límite de servidor de 200
   filas y respuestas sin conteo. Una página fallida o incompleta impide adoptar
   un historial parcial; los hashes de sincronización se cambian tras completar
   la lectura.
3. **Una RPC rechazada podía confirmar falsamente una escritura antigua.** El
   fallback se activaba por palabras en el mensaje de error, incluyendo el nombre
   de la RPC vigente. Un rechazo por permisos podía terminar en `push_user_data`,
   que no escribe las llamadas normalizadas. Ahora solo una función ausente
   (`42883`, `PGRST202`) permite esa compatibilidad. Otros errores conservan los
   cambios pendientes y no se confirman como sincronizados.
4. **Descarga mezclada entre dos revisiones de nube.** Estado/ajustes y llamadas
   se consultaban por separado sin comprobar si otro dispositivo actualizaba el
   snapshot durante la lectura. Ahora vuelve a leer `updated_at` al terminar;
   si cambió o desapareció la fila, rechaza el resultado antes de adoptarlo o
   actualizar los hashes. La regresión conserva los datos locales frente a esa
   carrera. Esto verifica la revisión usada por las escrituras de la app, sin
   afirmar que las solicitudes HTTP constituyan una transacción SQL única.
5. **El puente podía sobrescribir llamadas desde una pestaña desactualizada.**
   Dos pestañas locales reprodujeron la pérdida de una llamada recién guardada
   cuando la segunda recibía un evento automático. Una guardia compara las tres
   claves persistidas con la revisión conocida por la pestaña. Si detecta cambios
   externos, bloquea el evento sin crear recibos ni escribir, hasta recargar.
   Registra sus propias escrituras; un guardado parcial o de solo estado no
   vuelve a habilitar una pestaña que ya quedó obsoleta. Tras recargar, el evento
   se guardó junto con la llamada nueva y repetirlo no creó un duplicado. Se
   conserva el comportamiento deliberado de aviso para la edición manual.
6. **Hito monetario perdido por precisión decimal.** `$1.20 + $0.60` quedaba
   internamente justo por debajo de `$1.80`: la UI mostraba 50%, pero Hitos 1/4
   y «faltan $0.00». La comparación ahora tolera exclusivamente el error de
   representación del número. La regresión comprueba el límite y un importe
   realmente inferior. La interfaz repetida muestra 50%, Hitos 2/4 y el siguiente
   hito de 75%.

Las reglas de compatibilidad se contrastaron con la documentación oficial de
[errores de PostgREST](https://docs.postgrest.org/en/latest/references/errors.html)
y la paginación con
[Supabase range](https://supabase.com/docs/reference/javascript/using-modifiers-range).

## Uso interactivo y persistencia

- Simulación consecutiva del 1 de septiembre al 1 de octubre de 2026, con reloj
  local controlado: 31 fechas, 23 jornadas de trabajo, 8 días libres y 69 llamadas
  al cierre del recorrido mensual. En las jornadas laborales se combinaron
  llamada en vivo, manual, pegado, duplicado, corrección, Break, Lunch y cierre.
  Se variaron entradas tempranas, tardías y puntuales. La comparación tras
  recargar verificó llamadas, XP total y ledger completos.
- Se añadieron 35 puntos de comprobación para casos extremos y estados editables:
  turno vacío, continuación y segunda sesión, llamada fuera de horario y en día
  libre, llamadas que interrumpen Break/Lunch, pausa accidental continuada y
  descartada, recarga con actividad abierta, llamada que cruza medianoche y
  conserva el día contable anterior. Se comprobaron borrado individual y de día,
  edición histórica sin XP retroactivo, importación histórica, fila futura,
  solapamiento omitido y reemplazo del registro provisional por su fila oficial.
- Horario: desplazamiento de plantilla, gracia/meta de adherencia, excepción
  semanal de domingo laboral y bloque nuevo. Un bloque fuera del turno fue
  rechazado con un mensaje; ampliar el turno permitió guardarlo. Higher Rate:
  nueva ventana, cambio de nivel y ganancias con el bono correspondiente.
- Finanzas: gasto y meta sintéticos, edición de importe y asignación automática.
  Ajustes/Avisos: meta de día, conversión monetaria, volumen y aviso previo.
  Calendario/Reportes: meses/año, meta anual manual y automática, meta de ciclo
  manual y automática, semanas, regla de racha y nota personal mostrada como
  texto aunque contenga etiquetas HTML. Ayuda: navegación y filtro de búsqueda.
- Logros: cofre pendiente reclamado una vez, recarga sin repetición, accesorio
  equipado y nombre personalizado persistidos. Reiniciar un día con llamada
  activa fue bloqueado; descartar la llamada no agregó una fila. Se verificó
  cambio ES → EN → ES conservando el historial y la configuración.
- JSON descargado e importado desde la UI: restauró llamadas y ajustes del
  respaldo. CSV del ciclo comprobado: resumen de 14 días, una llamada, 5 minutos,
  $0.75 con Higher Rate y $0.60 de pago base en el detalle. El botón PDF mostró
  confirmación de generación y su prueba funcional pasa; el navegador embebido
  no expuso la ventana imprimible como pestaña controlable. No se certifica un
  PDF impreso o descargado.
- Seis páginas (Inicio, Horario, Reportes, Calendario, Finanzas, Logros), anchos
  solicitados 320/390/768/1365 y temas oscuro/claro: 48 combinaciones comprobadas
  sin overflow horizontal del documento. Se ejercitó navegación con sidebar y
  overlays; se conservaron capturas desktop y móvil.
- Snapshot final tras los casos adicionales: 78 llamadas persistidas, 2985 XP,
  400 recibos en el ledger y ninguna llamada, pausa o respaldo live pendiente.
  No se observaron excepciones no capturadas en los puntos comprobados.

## Revisión estructural y seguridad

- Inventario estático de `app.html`: 578 IDs y 352 controles (225 botones,
  70 inputs, 18 selects, 4 textareas, 20 enlaces y 15 summaries). Revisión de
  apertura/cierre de modales, labels, `aria-controls`, rutas, listeners directos
  y acciones delegadas/dinámicas. Esto es cobertura estructural; no significa
  que se haya pulsado cada control con todas sus combinaciones posibles.
- Análisis sintáctico de 45 módulos JS: 20142 líneas, 6573 llamadas directas a
  identificadores y nueve contratos de inyección completos; ninguna referencia
  directa sin definición/import/global reconocido. El check del build verifica
  imports/exports y ciclos de los 32 módulos alcanzables de la app.
- Revisión de migraciones RLS, permisos de RPC, validación de origen/nonce/cuenta
  del puente, CSP y separación de fuentes del build. Auditoría de las diez
  dependencias de producción: cero vulnerabilidades reportadas por `pnpm audit`.
- Producción, solo lectura: landing y `/app` responden 200 con CSP y `nosniff`;
  fuentes principales, configuración fuente y sourcemap responden 404. Consultas
  HEAD anónimas a Supabase no ven filas en `calls`, `user_data` o `daily_backups`;
  `app_errors` rechaza la lectura con 401. No se efectuaron escrituras de prueba
  en Supabase real ni se examinó contenido personal.

## Regresiones y validación

Se añadieron 13 pruebas funcionales: nueve en `sync-integration.test.mjs`, dos
en `propio-bridge.test.mjs`, una en `audit-persistence.test.mjs` y una en
`reinforcement-rules.test.mjs`. Cubren los seis fallos y sus límites. La suite
pasó de 285 a **298 pruebas**, sin fallos, omisiones ni cancelaciones.

Pasaron traducciones (2097 textos ES/EN), imports/exports/ciclos, wiring, build
de producción y builds del puente y del resumen independiente. No cambia la
versión ni los permisos de las extensiones.

## Límites y pendientes ajenos a estas reparaciones

La descarga/subida de nube y los errores se prueban con fixtures que ejecutan
la lógica real del cliente. El harness local entra directamente en la app y
bloquea conexiones externas. No certifica OAuth, una sesión autenticada en dos
dispositivos físicos, envío de correos, cron de backups, actualización de una
PWA instalada en un teléfono o audio audible en hardware. La prueba del puente
usa eventos sintéticos válidos; no captura una llamada real en Propio.

Las limitaciones deliberadas de `instrucciones.md` siguen vigentes. La aparición
por nombre en Google sigue siendo el pendiente externo ya documentado; esta
auditoría no volvió a solicitar indexación ni consumió la cuota de Search Console.
