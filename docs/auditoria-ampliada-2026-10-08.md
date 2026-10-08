# Auditoría ampliada — Propio Shift Tracker 597

Fecha: 8 de octubre de 2026. Amplía la auditoría de la versión 596. Se corrigieron cinco fallos reproducibles en arranque, sincronización y PWA. No se modificaron registros de usuarios reales.

## Fallos corregidos

1. **La subida de arranque podía sobrescribir una escritura posterior.** `USE_LOCAL` utilizaba `force: true`, anulando el control por revisión. Ahora la subida compara la revisión descargada; una escritura entre lectura y montaje conserva el servidor y deja la copia local pendiente.
2. **Una cuenta nueva tenía una base de sincronización nula.** Ahora conserva la revisión observada incluso si el snapshot está vacío. Si no existe fila, usa una revisión centinela: la RPC puede crearla, pero rechaza reemplazar una fila que haya aparecido después.
3. **Elegir la copia local ante un conflicto no completaba la subida.** Ahora la elección utiliza la revisión mostrada y dispara la subida. Una escritura aún posterior vuelve a producir conflicto; la elección no autoriza sobrescribir cambios futuros.
4. **La PWA no reabría datos propios sin red.** El shell cargaba, pero la lectura de nube detenía el arranque. Ahora abre una copia local identificada con la cuenta autenticada ante desconexión, sin adoptar una descarga parcial ni borrar la base de concurrencia. No acepta una copia ajena, sin propietario, vacía, ni oculta errores de permisos, sesión o servidor. Con la señal offline del navegador evita esperar la descarga.
5. **Las actualizaciones de caché generaban rechazos sin gestionar.** Los recursos cacheados seguían lanzando errores de red en segundo plano; los fallos de escritura por cuota tampoco se gestionaban. Ahora el evento mantiene viva la actualización y gestiona su rechazo. Una respuesta de red válida sigue disponible aunque no pueda almacenarse.

## Evidencia de regresión

- El arranque anterior falló cinco de seis escenarios iniciales; después pasan los once escenarios del arranque completo con el módulo real de sincronización.
- El trabajador anterior produjo rechazos sin gestionar por desconexión y cuota. Los cuatro escenarios del trabajador corregido pasan.
- Suite final: **319 pruebas correctas**, cero fallos. Se agregaron 21 pruebas y se actualizó la comprobación existente de descarga fallida para preservar la copia local sin adoptar datos parciales.
- Build de app, 2.097 textos ES/EN, comprobación de 32 módulos y wiring de controles correctos. Los builds del puente y del resumen independiente también pasan.

## Laboratorio SQL aislado

Se ejecutaron las cuatro migraciones existentes sobre PostgreSQL 18.3 mediante PGlite 0.5.4, con roles y dos cuentas sintéticas. Se sustituyeron únicamente los servicios ausentes: tabla de autenticación mínima, `auth.uid()` mediante identidad de transacción y permisos base del entorno. Se excluyeron la extensión `pg_cron` y sus dos bloques de programación.

Los **15 escenarios SQL** pasaron:

- Creación de perfil y snapshot por registro; lectura limitada al propietario; invisibilidad para el rol anónimo; rechazo de inserciones para otra cuenta.
- Lectura, edición y eliminación entre cuentas bloqueadas; correos, cuotas, telemetría y respaldos privados.
- RPC vigente guarda llamadas normalizadas; una revisión vieja no cambia estado ni llamadas; repetir una llamada no duplica filas ni cuota.
- Error de cuota revierte snapshot, llamadas y contador en la misma transacción. El límite se probó con un contador preparado en 99.999, sin afirmar que se insertaron cien mil filas SQL.
- Eliminar una llamada libera cuota; el respaldo contiene llamadas normalizadas y es idempotente; usuarios comunes no ejecutan backup ni mantenimiento.
- Borrar los datos sintéticos de A conserva B; un lote real de 2.505 llamadas conserva todas las filas.

PGlite ejecuta SQL real, pero utiliza una conexión serializada. Esto comprueba RLS, RPC y atomicidad local; no certifica bloqueos de sesiones PostgreSQL concurrentes, autenticación alojada ni tareas programadas de producción.

## Navegador con app real y SQL local

Se ejecutaron el bundle de arranque, la UI y el SDK de Supabase reales contra un adaptador HTTP local y el SQL anterior. La sesión fue sintética; no fue un inicio de sesión de Supabase. Dos orígenes locales separaron el almacenamiento de los dispositivos simulados. La política del laboratorio bloqueó destinos externos. El trabajador omitió las rutas REST locales para representar el comportamiento de producción, donde Supabase está en otro origen.

- Escritura de otro dispositivo entre lectura y montaje: la revisión nueva del SQL se conservó; la copia local quedó pendiente.
- Elección explícita de copia local sin una escritura posterior: UI, almacenamiento y SQL coincidieron, con metadata limpia.
- Reapertura offline: el shell y los datos propios se abrieron. Se agregó una llamada manual sintética, con dos llamadas locales y una en SQL. Al reconectar y reabrir quedaron dos en ambos y `dirty: false`.
- Respuesta HTTP perdida **después del commit SQL**: tres llamadas en ambos, con `dirty: true`. Al reabrir quedaron tres identificadores únicos en SQL y `dirty: false`, sin errores de página.
- Actualización del trabajador: activación de `lab-b` y retirada de `propio-lab-a`. Los fallos de red y cuota se verificaron además con el trabajador real en un contexto de ejecución controlado.
- Revisión del resultado a 390 px: tres llamadas, 30 minutos y $3,60, con equivalente en moneda secundaria. Captura de laboratorio sintético entregada con el informe.

La reconexión del laboratorio se verificó mediante reapertura; el corte HTTP simulado no genera el evento nativo `online`. No se certifica aquí reconexión automática en un teléfono físico.

## Cálculos independientes y carga

Semillas fijas hacen reproducibles **17.000 escenarios**:

- 10.000 casos monetarios comparados con un modelo de centavos enteros, incluida la ausencia de recompensas duplicadas.
- 2.000 combinaciones de trabajo, llamadas, pausas solapadas y cruces de medianoche comparadas minuto por minuto.
- 3.000 casos de Higher Rate con ventanas, gracia, medianoche y selección de mayor tarifa comparados con un modelo numérico de reloj.
- 2.000 cascadas financieras con tres niveles sucesivos de ganancias cada una, comparadas en centavos: prioridad de gastos, conservación de saldo y estabilidad al repetir.

La descarga de **100.000 llamadas** sobre el adaptador de consulta de pruebas conserva cien mil identificadores únicos. En una corrida completa tardó aproximadamente 708 ms; es una medición de lógica local con respuestas en memoria, no de red o rendimiento de Supabase. El lote SQL comprobado fue de 2.505 llamadas. No se certifican renderizado de cien mil filas, cuotas de almacenamiento del dispositivo ni una subida inicial de ese volumen.

## Puente

Se conectaron el trabajador real y el receptor real con una API Chrome simulada. **500 llamadas** pasaron de señales permitidas a registros locales; se perdió una confirmación cada siete llamadas y se reinició el trabajador cada once. Resultado: 500 identificadores únicos, cero eventos pendientes, contador 500 y ningún cuerpo sensible retenido. Las pruebas existentes siguen cubriendo cuentas distintas, varias pestañas, pestañas desactualizadas, revisión manual y eventos inválidos.

Esto no certifica la extensión instalada ni la compatibilidad actual con el portal externo. El usuario confirmó previamente que esos pendientes quedaron resueltos; no se reabrieron.

## Límites de la conclusión

No existe un proyecto Supabase de pruebas ni cuentas de prueba disponibles. No se escribieron datos reales para sustituirlos. Quedan sin certificación nueva: OAuth/correo, sesiones expiradas y renovaciones reales, infraestructura alojada, cron, concurrencia SQL entre conexiones y dispositivos físicos. La visibilidad por nombre en Google sigue pendiente del procesamiento externo ya documentado; esta auditoría no repitió solicitudes sujetas a cuota.
