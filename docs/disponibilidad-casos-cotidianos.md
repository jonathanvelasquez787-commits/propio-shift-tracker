# Disponibilidad automática: casos de la jornada

Revisión del 15 de octubre de 2026. App 617, extensión 2.2.4.
Este documento reemplaza la propuesta del 14/10 basada en un contador futuro:
la espera ahora usa el ACW que publica la aplicación. No necesita ver el segundo cero.

## Prioridades aplicadas

1. No tocar una llamada conectada, una oferta ni un estado desconocido.
2. Exigir sesión, cuenta, un portal y un Propio Shift Tracker actual y único.
3. Respetar el horario efectivo del día, su inicio, fin y cierre manual.
4. Respetar una pausa manual de los automatismos, Break y Lunch.
5. Aplicar primera llamada o regreso de pausa habilitado.
6. Aplicar el límite elegido al ACW visible para las llamadas siguientes.

Un Stop Calls manual pausa los clics automáticos; un Stop de la extensión no.
La pausa se recuerda al recargar y al reiniciar Chrome. Se puede quitar en el
popup o pulsando Start Calls manualmente. El registro sigue funcionando.
Pausar los automatismos no cambia por sí solo la disponibilidad actual de Propio.
Si había un cierre automático de pausa todavía sin entregar, se cancela; los
eventos de llamadas permanecen en la cola.

## Casos 1–26: reglas conservadas y comprobadas

Pruebas de referencia: `tests/propio-bridge.test.mjs`,
`tests/propio-acw-plan.test.mjs`, `tests/connection-work-time.test.mjs`,
`tests/workspace-startup.test.mjs` y `tests/workspace-profile.test.mjs`.

1. Entrada antes del horario: espera hasta el comienzo programado.
2. Entrada puntual: inicia disponibilidad con primera llamada habilitada.
3. Entrada tardía: puede iniciar dentro del turno, sin inventar tiempo previo.
4. Llegada durante Break programado: espera a su final.
5. Llegada durante Lunch programado: misma protección.
6. Entrada después de salida: no inicia.
7. Chrome de madrugada: las páginas pueden abrirse; no habilita llamadas fuera del horario.
8. Día libre: no hay plan automático; una excepción laboral usa su horario.
9. Horario distinto: utiliza el plan efectivo enviado por la aplicación.
10. Sesión desconocida: espera, sin confundir Chrome abierto con login.
11. Available: no duplica Start Calls; durante una espera válida puede usar Stop.
12. Oferta visible: no usa ninguno de los controles de disponibilidad.
13. Oferta dejada pasar: puede reintentar tras quince segundos, sin otra espera completa.
14. OPI, video o terceros: vos elegís; nunca pulsa Accept ni Reject.
15. Conexión de cualquier tipo: consume la primera llamada del horario.
16. Llamada activa: no toca controles ni interrumpe audio.
17. Cierre manual de turno: bloquea nuevas activaciones.
18. Salida durante llamada: no cuelga; impide nuevos inicios posteriores.
19. Dos portales: detiene la preparación por ambigüedad.
20. Varios trackers locales: exige una sola pestaña escribible para la cuenta.
21. Control desconocido, oculto o duplicado: no adivina otro botón.
22. Tracker antiguo sin pausas: bloquea y pide actualizar.
23. Regreso de Break activado: tiene prioridad sobre una espera nueva.
24. Duración desconocida: no inventa un cierre por tiempo; acepta cierre manual.
25. Cierre manual elegido: no sustituye esa elección al alcanzar la duración.
26. Start manual antes del horario: no deshace tu elección ni adelanta los clics automáticos.

## Casos 27–54: decisión y cobertura de la espera ACW

Regresiones adicionales en `tests/availability-day-cases.test.mjs` y en el
observador de `tests/propio-bridge.test.mjs`.

27. ACW largo antes de primera llamada: manda el horario; no agrega tres minutos al comenzar.
28. Fin de llamada: Stop con control reconocido; Start al alcanzar o superar el límite del ACW.
29. Oferta durante espera: no la cancela ni toca controles.
30. Aceptación manual durante espera: respeta la llamada; espera nueva al terminarla.
31. Oferta rechazada o no aceptada: conserva el mismo tramo de ACW.
32. Break durante espera: bloquea nuevas activaciones; no inventa otro reloj.
33. Regreso activado: permite volver al terminar, aunque el ACW nuevo aún sea corto.
34. Regreso apagado: ni primera llamada ni spacing lo sustituyen. Una llamada real posterior vuelve a habilitar spacing.
35. Pausa corta: regreso activado tiene prioridad; apagado conserva la decisión manual.
36. Cierre anticipado: reconoce el cierre del bloque correspondiente; no omite otro Break/Lunch ajeno.
37. Fin de pausa después de salida: no inicia disponibilidad.
38. Activar espera con ACW ya cumplido: puede iniciar enseguida si las demás reglas lo permiten.
39. Subir tres a cinco: usa el mismo inicio del ACW, hasta 05:00.
40. Bajar cinco a dos con ACW 03:00: puede iniciar enseguida; no reinicia el contador.
41. Apagar espera: deja de dar clics por ese modo; no cambia disponibilidad ni otros iniciadores.
42. Stop manual: pausa persistente de todos los clics automáticos. La caída a Offline por una oferta no es un Stop manual.
43. Tracker cerrado o cuenta distinta: elimina el plan guardado, incluso sin eventos pendientes; no inicia con datos antiguos.
44. Recarga/reinicio: conserva selección, primera llamada consumida, pausa manual y límite del mismo ACW.
45. Suspensión: reevalúa horario, pausas y snapshots al volver; no ejecuta acciones atrasadas en lote.
46. Sin conexión: no puede garantizar disponibilidad. Sin Propio Shift Tracker actual no actúa; el registro pendiente conserva su mecanismo separado.
47. Corrección oficial: sigue el ACW recalculado que se ve en la aplicación; no mantiene un temporizador secreto distinto. La regla oficial de pago por segundos sigue sin confirmarse.
48. Llamada real anticipada: cuenta como trabajo y consume la primera llamada de ese horario; no permite automatismos antes de su inicio.
49. Cerrar/reabrir el mismo turno: no repite primera llamada. Se identifica por el inicio del horario; un horario nuevo constituye otro plan.
50. Desplazar horario al llegar tarde: utiliza el inicio, fin y pausas efectivos que publica la aplicación, sin sumar un desplazamiento propio.
51. Medianoche: mantiene el inicio/fin del turno activo en timestamps completos; no reinicia por el cambio de fecha.
52. Cambio de reloj/zona: el horario y ACW se recalculan con la PC. Rechaza snapshots de ACW futuros; no existe un reloj servidor independiente que certifique cambios arbitrarios del reloj del sistema.
53. Otra PC: no hay exclusión global entre dispositivos. La protección local no la garantiza; dejar los iniciadores activos en una sola PC sigue siendo necesario.
54. Alejarse de la PC: aceptación siempre manual. El interruptor de pausa detiene automatismos y conserva registro y preferencias.

## Límites de la comprobación

Las pruebas ejecutan worker, validadores, observador y plan reales con datos
controlados. La comprobación de Chrome personal es de lectura y no provoca
llamadas ni cambia horarios. El usuario confirmó que las llamadas automáticas
ya funcionan en su sesión. Esto no certifica todas las variantes nativas de
llamada, dos PCs, un reinicio físico de Windows ni la regla de pago de Propio.
La vista original y los accesos de arranque se conservan.
