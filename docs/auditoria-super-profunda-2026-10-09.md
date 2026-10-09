# Auditoría super profunda — Propio Shift Tracker 600

Fecha: 9 de octubre de 2026. Fuente: aplicación y módulos actuales, pruebas de regresión y laboratorio local con datos sintéticos. La revisión identifica **20 grupos de fallos reproducibles corregidos**: seis de gamificación, siete de contabilidad/importación/Finanzas, seis de sincronización/arranque/PWA y uno de la API de login. Se cuentan causas y comportamientos distintos, no cada variante, ruta o aserción como un bug separado.

Los ocho archivos funcionales modificados son `js/game.js`, `js/app-main.js`, `js/calls.js`, `js/finance.js`, `js/sync.js`, `js/boot.js`, `js/service-worker.js` y `api/login.js`. La versión de `package.json` es 600.0.0. Este informe documenta validación local; no acredita por sí solo una publicación ni un despliegue. Los archivos de evidencia citados por nombre pertenecen a la evidencia local del chat, conservada junto al entregable en `outputs/evidencia-v600`; no son rutas relativas al directorio `docs` del repositorio.

## Fallos corregidos: gamificación

### G01. El premio mejorado de ocho llamadas sobrevivía al perder la octava

- **Reproducción:** guardar ocho llamadas elegibles; obtener `loot:fecha:8:improved`; recargar; borrar o corregir la octava hasta dejar siete. El premio mejorado podía seguir en el ledger, en el XP adicional o como accesorio equipado.
- **Causa:** la reconciliación verificaba que el recibo mejorado correspondiera al umbral ocho, pero omitía comprobar que todavía existieran ocho llamadas elegibles.
- **Corrección:** revocar el recibo cuando `eligible.length < 8`, utilizando la reversión existente de XP, colección y equipo. Volver a alcanzar ocho concede una sola recompensa válida.
- **Regresión:** `correction below eight calls revokes improved loot and requalifying grants it exactly once`, `correction removes improved cosmetic and equipment before requalifying` y el ledger de 100 llamadas reducido sucesivamente a cero. Se preserva un bono ajeno de 50 XP y el límite diario de 150 XP.

### G02. Continuar un turno restauraba una fotografía antigua de los escudos

- **Reproducción:** cerrar un turno; exportar un backup que concede un escudo; recargar y continuar. También: cerrar con un escudo consumido por adherencia fallida y luego obtener el escudo de backup, o corregir la adherencia antes de continuar.
- **Causa:** `revokeStageClear()` reponía `rollback.shieldsBefore`; esa fotografía descartaba premios o restituciones posteriores al cierre.
- **Corrección:** revertir únicamente el premio semanal del recibo de cierre y devolver únicamente su escudo consumido. No reconstruir el saldo desde una fotografía anterior.
- **Regresión:** conservación del escudo de backup, devolución del escudo consumido, corrección previa de adherencia y combinación con premio semanal. Las recargas y cierres/continuaciones repetidos no quitan los escudos válidos.

### G03. Reabrir un día sellado no reconciliaba premios invalidados mientras estaba cerrado

- **Reproducción:** obtener el premio de ocho llamadas y cerrar; retirar una llamada con el XP sellado; recargar y continuar. Repetir con Logros desactivado durante la reapertura.
- **Causa:** la corrección de un día cerrado conservaba deliberadamente su resultado sellado, pero el flujo de reapertura retiraba el cierre sin reconciliar inmediatamente las llamadas actuales.
- **Corrección:** llamar a `onGameCallsChanged(dayKey)` tras revocar el cierre. El día cerrado conserva sus reglas hasta reabrir; una vez abierto, el premio inválido desaparece antes de ganar nuevo XP.
- **Regresión:** `reopening a corrected frozen day reconciles invalid loot before earning new XP` repite tres ciclos de cierre/continuación; la variante con Logros apagado obtiene el mismo ledger válido al reactivarlo.

### G04. Reiniciar un día perdía un escudo al operar en el tope

- **Reproducción:** comenzar con tres escudos y racha siete; cerrar un día fallido que consume uno y concede el semanal, dejando otra vez tres; borrar las llamadas y reiniciar el día.
- **Causa:** `onGameDayReset()` intentaba devolver primero el escudo usado, pero el tope impedía sumarlo; después retiraba el semanal y terminaba con dos.
- **Corrección:** retirar primero el premio semanal y después restituir el consumo. Ambas operaciones pertenecen al recibo eliminado.
- **Regresión:** `day reset reverses stage consumption and award in the right order at the shield cap`: termina con tres escudos, cero XP del cierre y sin recibo semanal; repetir el reinicio no modifica nada.

### G05. Una meta diaria alcanzada con decimales podía bloquear el cofre

- **Reproducción:** meta $1,80; dos llamadas de $1,20 y $0,60. Su suma binaria es `1.7999999999999998`: el monstruo podía conservar una fracción de vida y no permitir el cofre aunque la interfaz mostrara el importe exacto.
- **Causa:** la derrota dependía directamente del porcentaje calculado con coma flotante, en lugar del criterio monetario usado por los hitos.
- **Corrección:** `computeGameDay()` utiliza `monetaryMilestones(...).claimed.includes(100)` y fija vida cero cuando alcanza la meta.
- **Regresión:** el caso exacto abre el cofre y obtiene Visor violeta. Bajar la segunda llamada a $0,59 revoca el premio y bloquea otra apertura: la tolerancia no cubre un centavo real faltante.

### G06. La misma imprecisión impedía reconocer la meta del ciclo

- **Reproducción:** meta de ciclo $1,80 y ganancias $1,20 + $0,60; consultar el ciclo actual o avanzar al siguiente. El jefe/recompensa podían tratar el ciclo cumplido como incompleto.
- **Causa:** `cycleBossSnapshot()` y `recordPreviousCycleOutcome()` comparaban porcentajes crudos con 100.
- **Corrección:** ambos usan el mismo criterio monetario del día; al alcanzar la meta, la representación fija 100% y el rollover conserva un único recibo.
- **Regresión:** ciclo actual y anterior con $1,7999999999999998 frente a $1,79. El caso exacto concede una sola recompensa de 35 XP; recarga, render, rollover y selección repetidos no duplican el premio.

## Fallos corregidos: contabilidad, importación y Finanzas

### C01. Corregir una llamada oficial a cero creaba una segunda fila y podía perpetuar duplicados heredados

- **Reproducción:** importar cliente 42 del 1/9/2025 a las 8:00, diez minutos y $1,20; importar la corrección de la misma identidad con cero minutos y $0,00. Los intervalos de duración cero no solapaban, por lo que se aceptaba otra fila. Si ya había original y duplicado cero, reimportar exactamente la fila cero podía ser descartado antes de reparar el conjunto.
- **Causa:** la decisión de corrección dependía del solapamiento y la detección previa de duplicados rechazaba la oportunidad de sanear el estado legado.
- **Corrección:** reconocer identidad oficial y comienzo exacto aunque una duración sea cero. Colapsar únicamente duplicados de esa identidad con una fila cero, preservando el ID primario y la referencia de Higher Rate; no colapsar ante un solapamiento ajeno. Incluir todos los días afectados en la reconciliación.
- **Regresión:** corrección diez→cero→cinco minutos; saneamiento de original + `legacy-zero`; reimportación de la fila cero ya presente. Quedan una llamada y cero ganancias/bono activo/XP inválido; Finanzas recorta la asignación previa y repetir el pegado no guarda ni recompensa otra vez. La referencia congelada se conserva para recalcularla si vuelve a calificar.

### C02. Dos correcciones de la misma llamada en un solo pegado dejaban filas intermedias

- **Reproducción:** llamada oficial de diez minutos; pegar correcciones sucesivas de once y doce minutos en el mismo lote. Repetir partiendo de una llamada live provisional o de una lista vacía.
- **Causa:** la aceptación acumulaba versiones del mismo registro y perdía la cadena de reemplazo original; las filas recién aceptadas tampoco estaban normalizadas como importadas al evaluar la siguiente corrección.
- **Corrección:** `replaceAcceptedCall()` retira la versión intermedia tanto de la lista aceptada como del conjunto de solapamiento y conserva el reemplazo raíz y su tipo. Solo la versión final se guarda y migra los recibos live cuando corresponde.
- **Regresión:** los tres puntos de partida terminan con una fila de doce minutos y $1,44; el ID oficial se conserva y una llamada realmente nueva dispara un único callback de guardado.

### C03. Recuperar un backup live nocturno cambiaba su día contable

- **Reproducción:** turno del 1/9 a las 23:00; llamada live del 2/9 de 00:10 a 00:20; borrar su fila, comenzar otro turno el 2/9 a las 08:00, guardar/recargar, recuperar el backup y confirmarlo en el modal manual.
- **Causa:** `saveManualCall()` recalculaba los campos contables según el turno activo al confirmar, aunque el candidato recuperado ya guardaba la pertenencia original.
- **Corrección:** conservar `callDate`, `shiftDayKey` y `calendarCallDate` de la llamada original junto con su ID y comienzo.
- **Regresión:** la fila recuperada pertenece al día contable 1/9 y al día calendario 2/9; la autosalvación duplicada no genera otra fila.

### C04. Finanzas rechazaba los últimos diez centavos disponibles

- **Reproducción:** ganancias $0,30, asignación existente $0,20, asignar otros $0,10. La resta binaria podía producir menos de $0,10 aunque Disponible mostrara diez centavos.
- **Causa:** la comparación estricta `monto > financeAvailableBalance()` confundía ruido numérico con falta de saldo.
- **Corrección:** rechazar únicamente una diferencia mayor que `1e-9`.
- **Regresión:** la asignación llega a $0,30; intentar sumar después $0,01 se rechaza y conserva el saldo.

### C05. La cascada automática se detenía después de 500 filas

- **Reproducción:** 601 gastos de $1 con prioridad ascendente y $601 disponibles. La guardia de 500 iteraciones dejaba gastos pendientes y saldo sin asignar.
- **Causa:** un límite fijo del bucle truncaba la cantidad de filas configuradas por el usuario.
- **Corrección:** recorrer una cola finita de gastos pendientes y metas, conservando prioridades y una variable de saldo restante. Completar una fila asigna exactamente su importe objetivo.
- **Regresión:** las 601 filas reciben $601; la segunda ejecución es estable. El test también repite sin la fila cero del siguiente fallo para aislar el límite.

### C06. Un gasto heredado con objetivo cero bloqueaba toda la cascada

- **Reproducción:** anteponer un gasto de objetivo/asignación cero a gastos válidos. La búsqueda lo seleccionaba continuamente y abortaba porque su importe pendiente era cero.
- **Causa:** se tomaba la primera fila no pagada sin saltar filas que ya no necesitaban dinero.
- **Corrección:** omitir pendientes `<= 1e-9` y conservar el umbral existente de metas; continuar con la siguiente fila de la cola.
- **Regresión:** la fila cero queda en cero y los 601 gastos posteriores se completan. Se comprueban estabilidad y conservación de saldo.

### C07. Ampliar una fila oficial de cero podía reemplazar una llamada live ajena

- **Reproducción:** cliente 1 a las 08:00 con cero minutos; guardar una live distinta de 08:05 a 08:15; corregir la oficial a veinte minutos y $2,40. La rama que priorizaba sustituir una live podía eliminar la llamada ajena en lugar de detectar el conflicto.
- **Causa:** el conjunto de solapamiento no incluía la fila oficial cero y el orden de las ramas trataba la única live solapada como su provisional.
- **Corrección:** localizar primero las identidades oficiales exactas y rechazar si cualquier solapamiento pertenece a otra llamada, antes del reemplazo live o del saneamiento legado.
- **Regresión:** se conserva exactamente el JSON de las dos filas y el número de guardados. La variante con otro cliente oficial y los duplicados legados también conserva las filas frente al conflicto; son variantes de esta protección, no fallos adicionales contados.

## Fallos corregidos: sincronización, arranque y PWA

### S01. Borrar offline tras reabrir no enviaba la eliminación al reconectar

- **Reproducción:** descargar `keep` y `delete`; reabrir sin red; borrar `delete`; reconectar y subir sin otra recarga. El mapa de hashes en memoria estaba vacío y no detectaba la fila que debía eliminarse. Cambiar de cuenta y adoptar una descarga también podía perder esa base.
- **Causa:** la base de llamadas no estaba asociada explícitamente a propietario/revisión y dependía de la memoria del proceso anterior.
- **Corrección:** conservar `cloudCallOwner` y `cloudCallRevision`; recuperar los hashes si falta una base válida antes de calcular el delta. Adoptar nube reinstala la base. La revisión local se mantiene como condición de concurrencia aunque la descarga observada sea posterior.
- **Regresión:** solo queda `keep`, se envía `p_call_deletes: ['delete']` y `dirty` termina falso. Una nube posterior produce conflicto y permanece intacta. El laboratorio SQL prueba eliminación real y liberación de cuota sin recargar.

### S02. Cambiar la identidad durante un await mezclaba contextos de cuenta

- **Reproducción:** iniciar una subida de A y cambiar a B antes de su respuesta; o cambiar autenticación mientras se descarga A/está abierto el selector de conflicto. El callback anterior podía confirmar datos, adoptar una selección vieja o montar la cuenta anterior.
- **Causa:** el token no se asociaba a un propietario autenticado; los procesos asíncronos carecían de una generación de contexto y guardas tras cada espera crítica.
- **Corrección:** `setAccessToken(token, userId)`, `canSync()`, `syncEpoch` y `sameSyncContext()` bloquean subidas/confirmaciones ajenas. `boot()` invalida el contexto al cambiar de cuenta y comprueba la identidad tras lectura, selección, montaje y perfil.
- **Regresión:** respuestas de A no cambian propietario/base/dirty de B; el snapshot A no se envía con token B, tampoco al salir. Descarga/selector interrumpidos solo redirigen, sin adoptar ni subir. Renovar el token de la misma cuenta conserva la subida pendiente.

### S03. Una falla al guardar metadata permitía adoptar datos sin acreditar su propietario

- **Reproducción:** provocar `QuotaExceededError` únicamente al escribir `propio_sync_meta_v1` durante adopción de nube o copia local; alternativamente fallar al hidratar la clave de llamadas después de escribir metadata.
- **Causa:** `writeMeta()` ocultaba todas las excepciones; la adopción podía continuar con datos nuevos y metadata vieja, o dejar metadata nueva junto al snapshot anterior.
- **Corrección:** escrituras críticas con `{ required: true }`; adopción cloud persiste primero metadata y la restaura si falla la hidratación. La adopción local y el reconocimiento de una subida informan errores de persistencia.
- **Regresión:** las tres variantes lanzan el error y conservan exactamente el mapa previo de almacenamiento: estado, llamadas, ajustes y metadata. No se marca la operación como completada silenciosamente.

### S04. Una respuesta tardía retrocedía la revisión compartida por otra pestaña

- **Reproducción:** A sube; mientras espera, B escribe en el almacenamiento compartido una revisión nueva con `dirty: true`; llega la confirmación vieja de A. También: A conserva hashes antiguos aunque B haya avanzado la revisión y llamadas compartidas.
- **Causa:** se aplicaba la confirmación sin comprobar que la revisión base siguiera vigente; los hashes no estaban vinculados a esa revisión.
- **Corrección:** comparar propietario, generación y revisión antes de enviar y después de cada RPC; no aplicar confirmaciones obsoletas. Refrescar la base de llamadas si la revisión compartida cambió.
- **Regresión:** se conservan `newer-tab-revision`, `dirty: true` y ausencia de evento `pushed`. La pestaña antigua calcula el delta contra la revisión nueva. SQL local reproduce la confirmación retrasada, con transacciones serializadas.

### S05. Un HTTP 503 sustituía el shell válido de la PWA

- **Reproducción:** cachear una app válida; navegar y recibir 503; cortar la red y reabrir. El worker podía haber almacenado la respuesta de error sobre la copia útil.
- **Causa:** el handler de navegación guardaba cualquier respuesta resuelta por `fetch`, incluso errores HTTP.
- **Corrección:** guardar la navegación únicamente si `response.ok`. Se mantiene la respuesta 503 de la petición actual y la copia válida para una reapertura sin red.
- **Regresión:** primera petición devuelve 503; segunda, desconectada, devuelve `valid-app` desde caché. No se confunde error HTTP con rechazo de red.

### S06. Activar el worker borraba cachés ajenas del mismo origen

- **Reproducción:** cachés `propio-old`, `propio-audit` y `other-feature`; activar la versión `audit`.
- **Causa:** la limpieza retiraba todas las claves distintas de la caché vigente, sin distinguir su pertenencia.
- **Corrección:** retirar solo claves antiguas con prefijo `propio-`.
- **Regresión:** se elimina exclusivamente `propio-old`; la caché vigente y `other-feature` se conservan.

## Fallo corregido: API de login

### A01. El limitador persistente podía abortar el login sin respuesta útil

- **Reproducción:** `consume_rate_limit` rechaza por red, devuelve JSON inválido o un objeto en lugar del booleano esperado; enviar intentos sintéticos desde una IP fija.
- **Causa:** `persistentlyThrottled()` no capturaba excepciones de `fetch`/JSON y convertía cualquier resultado por verdad/falsedad, sin validar el contrato.
- **Corrección:** aceptar únicamente un booleano cuando la respuesta es correcta; ante respuesta inválida/error usar el limitador local existente. No cambiar la política del límite.
- **Regresión:** en cada una de las tres variantes, doce intentos reciben 401 `LOGIN_FAILED` y el decimotercero 429 `RATE_LIMITED`; solo doce llegan al endpoint de autenticación. Cuando la RPC responde `false`, se devuelve 429 sin enviar credenciales a autenticación.

## Validación automática y estructural

Los cuatro archivos nuevos son `tests/super-audit-game.test.mjs`, `tests/super-audit-accounting.test.mjs`, `tests/super-audit-sync.test.mjs` y `tests/super-audit-api.test.mjs`. Se actualizó también `tests/game-phase6.test.mjs` para el rollback de escudos. Incluyen pruebas de fallos nuevos y pruebas de invariantes ya válidas: recibos heredados, XP/cofre idempotentes, pausas continuadas, varias sesiones y conservación de minutos. Esas invariantes adicionales no aumentan el contador de 20 fallos.

- **Suite final:** 388 pruebas pasan; cero fallos, canceladas, omitidas o pendientes. El TAP informa 379 subtests superiores y 388 pruebas totales. Duración registrada: 13.658,4761 ms. Evidencia: `super-final-tests.log`.
- **Build secuencial:** 2.109 textos ES/EN; imports/exports y ciclos de 33 módulos; wiring de ids, modales, rutas, listeners y helpers correcto; `public/` generado sin sourcemaps ni módulos fuente; builds del puente y resumen independiente correctos. Evidencia: `super-final-build.log`.
- **Censo estructural ampliado:** 46 módulos JavaScript, 20.424 líneas y 6.727 llamadas a identificadores; sin referencias faltantes detectadas en el análisis. Nueve contratos de inyección con cantidades aportadas/esperadas coincidentes: Finanzas 15, Reportes 35, Calendario 22, Horario 23, Llamadas 46, Higher Rate 28, Ajustes 26, Juego 34 y Refuerzo 12. Fuente: `audit-structure-results.json`. El censo ampliado y los 33 módulos del guard de build tienen alcances distintos; no representan dos resultados incompatibles.
- **Dependencias de producción:** árbol de diez dependencias, cero advisories reportados en todos los niveles de severidad. Fuente: `super-audit-dependencies.json`. Es el resultado del escaneo de dependencias, no una certificación general de seguridad.

Una ejecución inicial lanzó build y tests en paralelo: el build retiró/recreó `public/` mientras una prueba inspeccionaba ese directorio. Se repitió primero el build completo y después la suite. La conclusión de 388/388 corresponde a esa ejecución secuencial, no a la corrida interferida.

## Simulación contable de 31 días y modelos independientes

La prueba mensual utiliza los módulos reales y un ledger de referencia independiente. Avanza cronológicamente 31 días, guarda y recarga el estado, combina llamadas importadas, manuales y live, Higher Rate, pegados duplicados, correcciones de duración/importe, edición y eliminación individual, borrado completo de un día, días sin llamadas y cambios de metas. Compara el libro esperado con los datos vigentes, las asignaciones de Finanzas y las exportaciones diarias. Las correcciones sucesivas/cero, varias sesiones, llamadas fuera de ellas y pausas continuadas tienen escenarios de regresión adicionales separados.

Resultado comprobado: **161 puntos de control contable**, **72 llamadas finales**, **31 snapshots diarios persistidos** y **31 conciliaciones de exportación por día**. El escenario tarda 10.877,4986 ms en la suite final. Estas cifras pertenecen a la simulación automática y no se presentan como un recorrido manual del navegador.

La suite incluye además los modelos ya existentes de semillas fijas: 10.000 casos monetarios frente a centavos enteros, 2.000 combinaciones de trabajo/pausas/llamadas, 3.000 escenarios de Higher Rate y 2.000 cascadas financieras. Son **17.000 escenarios independientes** conservados y ejecutados otra vez, no 17.000 pruebas TAP nuevas. Permanecen las verificaciones previas de paginación de 100.000 llamadas y del puente con 500 eventos, que tampoco constituyen nuevas sesiones reales en el portal externo.

## Laboratorio SQL nuevo

`super-audit-sync-sql-rerun.log` registra **cuatro escenarios nuevos correctos** ejecutados con SQL real en PostgreSQL/PGlite local:

1. Reabrir offline, eliminar una llamada y reconectar elimina la fila SQL y libera cuota sin otra recarga.
2. Perder la respuesta HTTP después del commit, reabrir y sincronizar deja las mismas llamadas, metadata limpia y ningún duplicado.
3. Una confirmación SQL retrasada no retrocede metadata compartida que otra pestaña ya avanzó.
4. Reconectar ante una revisión SQL posterior conserva tanto su estado como sus filas de llamadas.

El adaptador serializa transacciones. Se omiten `pg_cron` y sus bloques de scheduler en `0003_phase_5.sql`/`0004_security_hardening.sql`. Este resultado amplía las pruebas SQL anteriores; no prueba conexiones simultáneas reales ni ejecución de cron alojado.

## Recorrido interactivo de navegador

Se completó un recorrido real por la UI de la aplicación en navegador local con reloj controlado y datos sintéticos: **31 días consecutivos, del 1 de septiembre al 1 de octubre de 2026**, distintos de la simulación automática contable anterior. Cada día incluye una llamada live y una manual: **62 llamadas**, **$111,60** acumulados, **31 cofres diarios**, **2.992 XP** y **355 recibos del ledger**.

La suma monetaria se verificó en centavos enteros sobre `data.calls`: 11.160 centavos. El snapshot conserva 31 fechas distintas con dos llamadas cada una, 31 filas `source: live`, 31 `source: manual` y 31 claves `chest:`. El campo superior `earnings: 3.6` corresponde únicamente al día seleccionado, no al acumulado mensual.

Se ejercitaron entradas tempranas, a tiempo y tardías, cierres posteriores al horario y apertura del cofre tanto antes como después del cierre. Los primeros 16 días incluyeron Break y Lunch; el estado final acredita **32 pausas: 16 Break y 16 Lunch**. Los últimos 15 días fueron turnos cortos sin pausas; no se atribuyen a ellos pausas que no ocurrieron.

Evidencia: `super-browser-snapshot.json` contiene 62 filas en memoria y almacenamiento, `callsPersisted: true`, `settingsPersisted: true`, `totalXp: 2992`, `ledgerCount: 355`, `errors: []`, sin llamada/pausa/backup live pendientes. La comparación final en `super-browser-reload.json` acredita **`reloadMatch: true`**, 62 llamadas antes/después y en almacenamiento, XP 2.992, ledger 355 y cero errores: la recarga conserva llamadas, XP y ledger idénticos. Los checkpoints de UI están en `super-browser-checkpoints.ndjson` desde el tramo registrado a partir del 15 de septiembre. Captura final: `super-browser-final.jpg`.

### Navegación y responsive real

Se comprobaron **14 vistas**: Inicio, Horario, Reportes, Fechas de pago, Calendario, Finanzas y Logros en dos anchuras. Cada navegación confirmó el ID de la página activa: `pageHome`, `pageSchedule`, `pageReports`, `pagePayDates`, `pageCalendar`, `pageFinance` y `pageAchievements`. Horario/Reportes se activaron por clic; las otras páginas mediante Enter en ambos tamaños.

En la vista móvil de 320 × 820 px la raíz reportó `scrollWidth: 305`. En el override de escritorio 1365 × 900 px el DOM reportó anchura 1366 y `scrollWidth: 1351`. Las 14 vistas conservaron el ancho de raíz sin overflow horizontal. Evidencia: `super-browser-responsive.json`. Se acredita navegación, página activa y ancho de raíz; no se declara que todos los controles individuales de cada página se ejercitaran en este recorrido responsive. Estas métricas corresponden al navegador local y no certifican dispositivos físicos ni autenticación alojada.

## Alcance y límites de la conclusión

Los fallos enumerados tienen una corrección aplicada y cobertura de regresión local. La suite, el build, el censo, el escaneo de dependencias y los cuatro escenarios SQL respaldan los comportamientos indicados. No prueban toda combinación posible ni sustituyen las comprobaciones alojadas.

No hay proyecto Supabase de staging ni cuentas de prueba disponibles. La autenticación controlada, las respuestas de red simuladas y el SQL local permiten reproducir los fallos sin escribir datos reales. **No se certifican OAuth/correo alojados, cron de producción, concurrencia entre conexiones PostgreSQL reales, dispositivos físicos ni renovación real de sesiones en infraestructura alojada.** No se realizaron escrituras sobre datos de producción como parte de la auditoría.

La conexión Propio, los ZIP y la publicación en Chrome Web Store siguen siendo pendientes resueltos según la confirmación previa del usuario; este trabajo no infiere una nueva versión instalada ni una URL de tienda comprobada. La aparición por nombre en Google sigue pendiente del procesamiento externo ya documentado. No se repitió ninguna solicitud de indexación sujeta a cuota ni se creó otro reintento.

La publicación, CI y deployment se acreditan con evidencia separada vinculada al SHA final, archivo `auditoria-super-profunda-despliegue-v600.json` en outputs del chat; el informe de validación local no acredita por sí solo un despliegue.
