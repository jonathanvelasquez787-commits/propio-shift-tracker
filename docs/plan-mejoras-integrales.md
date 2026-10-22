# Mejoras integrales aprobadas

Solicitud del propietario: «Me gustó todo lo que me dijiste así que haremos
todo. Empieza». Base: app 621, extensión 2.2.7, evaluación de 79 funciones del
18/10/2026. Esta lista conserva el alcance completo entre entregas; cada fase
se publica con pruebas apropiadas. Una función existente marcada para mejorar
no se considera rota por esa razón.

## Prioridad visual antes de continuar

### Incumplimientos directos reabiertos el 22/10

Esta lista tiene prioridad sobre Logros y batalla. Las capturas del propietario
confirman que web 638 ya estaba cargada; no atribuir estos reclamos a caché.
Los 59 puntos funcionales publicados y los 20 abiertos del inventario se
mantienen; estos son pedidos directos que no quedaron correctamente cerrados.

- [x] **Azul original y presentación de Fechas de pago — entrega 640.** Restauradas
  la fecha azul a la derecha y la etiqueta «Actual — día X de 14». Referencia:
  renderer de `js/weekly-summary.js` anterior a `37d8ee9`, usando el mismo token
  `var(--accent-blue-2, var(--cyan))`. Comparar y registrar recibido se conservan;
  una fecha pasada no confirma ningún depósito.
- [x] **Ganancias del ciclo — entrega 640.** Se aprovecha el hueco bajo Racha/meta
  para el desglose existente, junto a Proyección, tal como señaló el propietario.
  Las tres tarjetas, sus posiciones y los datos de proyección se conservan.
- [x] **Desglose de ganancias — entrega 640.** Día y ciclo juntos dentro de la
  misma sección, con filas compactas que usan su ancho completo. Se retira la
  limitación interior de 780 px que dejaba el marco casi vacío; en móvil se apilan.
- [x] **Hover del ACW — entrega 639.** En 638 solo muestra procedencia y ancla. El inicio y
  final observados con segundos existen en el detalle; faltan en el hover.
  Corrección de 639: última llamada completada por su observación conservada,
  distinta del origen del ACW tras una pausa, y finales oficiales identificados
  como calculados. No inventar segundos ausentes ni cambiar los registros.
- [x] **Guía visual actualizada — entrega 641.** Galería externa renovada:
  25 secciones y las 59 mejoras publicadas, con ubicación, motivo, configuración
  y ejemplo. Capturas compiladas de web 641 en ambos temas y cuatro anchos;
  popup 2.3.4 identificado como extensión con API de Chrome simulada.
- [x] **Lenguaje claro también en la ayuda — entrega 641.** Galería, guías,
  popup y organizador distinguen Propio Shift Tracker, el portal de Propio y
  la extensión de Chrome. «Actualizar y reconectar» conserva su acción.
  Corregidas rutas desactualizadas y la explicación de segundos/redondeo.
- [x] **Cierre visual verificable — entrega 641.** Capturas actuales de las once
  vistas, inspección del resultado real y recorridos de sus controles. Azul
  contrastado con el token histórico en 640; ciclo y desglose integrados en el
  hueco solicitado. Criterios y evidencia en control-visual-11-vistas.md.
- [x] **Guía práctica de todas las funciones — entrega 639.** La lista seguía en
  73 apartados y no explicaba por separado el planificador y filtros nuevos;
  el apoyo sin llamadas todavía apuntaba a Logros. Añadidos 74–79 con qué hace,
  qué configurar y ejemplo, y corregida la ubicación a Avisos. Las funciones
  existentes y las mejoras todavía pendientes no se confunden.

La solicitud posterior del 22/10 ordena publicar las reubicaciones concretas:
Desglose bajo Racha/meta junto a Proyección, Jornada dentro de Adherencia y
restauración de fecha/etiqueta azul. Entrega 640 conserva los nodos y funciones;
la evidencia de publicación se verifica aparte. No aplicar la propuesta previa.

Propuesta externa anterior para los tres bloques: «propio-tres-correcciones.html», con
referencia histórica ejecutada desde el renderer anterior, ambos temas y un
único diseño responsive. Archivada y no aplicada: fue sustituida por las reubicaciones expresamente
solicitadas y publicadas en 640. No requiere otra aprobación para este cierre.

### Presentación nativa aprobada el 21–22/10

Web 638 aplica el mockup que conserva identidad y layout general. Inicio
retiene sus funciones habituales y ACW; preparación en Ajustes, jornada y
desgloses en Reportes, ayuda en el detalle único de llamada. El intento de
recuperar el azul y compactar los bloques anteriores fue insuficiente; esos
pedidos se corrigieron en 640 y su evidencia actual se renovó en 641.
La cuadrícula del calendario no se rediseña. Se revisan los nombres visibles
y el popup 2.3.3 sin cambiar reglas automáticas ni contables.

Ver [control visual](control-visual-11-vistas.md) y la guía de funciones para
ubicaciones y evidencia. Esta entrega no cambia los 59 puntos funcionales
publicados ni los 20 abiertos del plan original.


### Integración solicitada el 21/10

El propietario pidió revisar exhaustivamente la repetición de información y
la incorporación de mejoras en funciones existentes. Revisión de código,
navegación e inventario completo de 79 funciones realizada; no es una nueva
certificación mensual ni cierra las veinte mejoras funcionales abiertas.
Integración aprobada y aplicada en web 637 / PR #99. La publicación se comprueba
con el commit servido; no se considera completada por estas pruebas locales.

**14 de 14 integraciones aprobadas implementadas.** Verificación: 966 pruebas,
doce recorridos ES/EN, temas y 320/390/1200 px; popup 2.3.2 en ambos temas.
Instalación con respaldo y recarga confirmada por el propietario.

- [x] Comparación y edición de una llamada en un mismo detalle.
- [x] Listado de llamadas existente como acceso principal, sin otra tarjeta de historial.
- [x] Vínculos pendientes dentro de la revisión/listado de llamadas e importaciones.
- [x] XP, nivel, cofre y colección integrados en los paneles existentes de Logros.
- [x] Un solo editor para la meta del ciclo, con accesos contextuales.
- [x] Un editor de promoción con alcance explícito de conservación o recálculo.
- [x] Historial de Higher Rate por día con sus ventanas y llamadas, sin dos recorridos.
- [x] Detalle único de jornada con acceso desde Inicio; reubicado en Reportes en 638, conservando motivos y acciones.
- [x] Configuración del apoyo sin llamadas en Avisos; reflexión en su llamada.
- [x] Copias recuperables junto a importación/exportación de respaldo.
- [x] Último reparto plegado junto al control automático de Finanzas.
- [x] Indicadores actuales, metas y comparación histórica sin repetición en Reportes.
- [x] Un total principal en Ganancias y componentes dentro del desglose.
- [x] Estado breve y ayuda contextual de automatización, con explicación completa en la guía.

No todos son duplicados exactos: hay formularios paralelos, opciones mal
ubicadas y detalles que no necesitan otra ventana. Conservar las diferencias
entre ACW actual/acumulado, plan/actividad, XP diario/acumulado, reservas/pagos/
ingresos, meta diaria/bloque/ciclo y datos oficiales/respaldo observado.
`relocateCallsSection` mueve el mismo elemento; no duplica un historial.
El popup configura la extensión y la web muestra su estado: conservar esas
responsabilidades. La barra de actividad comparte handlers con la tarjeta;
revisar su visibilidad simultánea en vez de crear otra actividad.

Orden: integrar primero la entrega 637; luego Logros; después editores y
ubicación de opciones; finalmente compactar indicadores y ayudas. La revisión
del PR detectó además una cola que conservaba un vínculo ya resuelto por otra
importación: corregida con regresión de importación, borrado y recarga. El plan
funcional original conserva 59 puntos publicados y 20 abiertos.

### Aprobaciones visuales conservadas

La comprobación adicional del 20/10 confirmó que el problema no se limita a
las tres pantallas de la maqueta: detalles de Disponibilidad, desglose de
Ganancias, revisión/corrección de Higher Rate, supuestos de proyección,
respaldo JSON y borrado de cuenta en Ajustes y mensajes de cola del popup de
la extensión también acumulan explicaciones planas. La proyección presenta
además cifras y conversiones partidas en móvil. Horario y algunas confirmaciones
de Finanzas requieren una segunda prioridad por jerarquía/ayuda repetida.
El mockup completo externo a Git ya incluye 11 pantallas: Logros, Avisos,
restauración, disponibilidad, ganancias, Higher Rate, proyección, popup,
horario, meta desde Finanzas y borrado de cuenta. Se comprobaron 66 vistas
en claro/oscuro y 320/390/1200 px, y 22 accesos de detalle. El propietario
aprobó las once vistas el 20/10 con «Aprobadas». Aplicadas a la web 635 y al popup 2.3.1 conservando sus funciones. No publicar la fase 9 rechazada ni
considerar corregidas las pantallas reales por esta maqueta. El
[control visual de la entrega](control-visual-11-vistas.md) distingue aprobación,
implementación y comprobación real; las once tienen comprobación registrada con datos ficticios.

El 20/10 el propietario rechazó también el resumen de Logros en preparación:
demasiado texto plano y poca jerarquía. Se frena su publicación y se prepara
una propuesta con datos protagonistas, acciones y ayuda contextual, ampliada
después a las 11 pantallas anteriores. Conservar las funciones
en preparación y seguir después las 20 mejoras abiertas en el orden acordado.

El 20/10 el propietario reiteró que las últimas interfaces no cumplen su
preferencia de diseño. La revisión detectó filas del mismo peso, explicaciones
apiladas y valores partidos en móvil. El propietario aprobó explícitamente
la propuesta de Jornada, Reservas y Pago recibido en claro y oscuro; se aplica
con resumen principal y detalles plegados. Maqueta: 18 vistas sin desbordes.
La aprobación no certifica por sí sola la interfaz compilada: comprobarla antes
de publicar. Conservar datos y funciones; seguir después el orden de fases.

## Lista de control completa

**79 de 79 mejoras publicadas; extensión 2.3.5 activa confirmada por captura del propietario el 22/10/2026.** Las veinte mejoras restantes están implementadas y comprobadas en la entrega 642. [Cierre 642](cierre-642.md).

**Historial hasta 641 (evidencia fechada):** La preparación del
turno usa app 624 y extensión 2.2.10, con publicación comprobada y recarga de la
extensión, Propio y tracker confirmada por el propietario. App 625 refuerza la
limpieza de Higher Rate; app 626 incorpora, en orden, el desglose de ganancias,
consulta de conversión y alcance de tarifa. App 627 completa 36 y 37: revisión
por ventana y corrección con vista previa, conservando bonos al editar o limpiar.
App 628 completa el punto 21 con historial antes/después y recuperación de
ediciones, eliminaciones y vaciados de llamadas. App 629 publica 22, 26–27, 47, 67 y 69 y cierra la fase 3, con CI y producción comprobados. App 630 publica 15–20 y 77, con código de extensión 2.3.0 instalado y recarga aún sin confirmar. App 631 publica los once puntos de la fase 5, con CI y producción comprobados. App 632 publica Finanzas y pagos recibidos con el diseño aprobado de Jornada, Reservas y Pago recibido. App 633 publica los cuatro puntos de Reportes, Calendario y exportaciones con CI y producción comprobados. App 634 publica Avisos y reflexión con CI y producción comprobados. Sigue fase 9: Logros y batalla.

Estado vigente de la extensión: **2.3.5 activa**, confirmada por captura del popup aportada por el
propietario el 22/10/2026. Las menciones de recargas sin confirmar en el relato
de versiones y en las entregas verificadas describen el estado de aquella fecha;
no son una acción pendiente actual. La web sigue su numeración independiente.

Estas 79 mejoras corresponden al sistema completo. El panel de disponibilidad
y preparación se ve en **Propio Shift Tracker**; el popup de la **extensión de Chrome**
conserva sus controles y transmite los datos a ese panel. La corrección 2.2.10
sincroniza el rótulo de versión del popup con Chrome; el propietario confirmó que
ambos muestran 2.2.10. App 624 compacta ese resumen con detalles plegados y etiqueta
su procedencia. Esta revisión visual y de caché no suma otra casilla cerrada.

Estados: **Pendiente**, **En curso**, **Probado** (sin publicar), **Publicado**.
Una casilla solo se marca cuando todos los criterios del punto están resueltos
y su evidencia está enlazada. Se conservan las comprobaciones y decisiones de
no ampliar alcance. Un cambio parcial no cierra la función completa.

- [x] **1. Registro automático de la conexión a Propio — Publicado.** Hora de conexión detectada en la preparación, sin afirmar que es el momento exacto de login. [Evidencia](disponibilidad-en-inicio.md).
- [x] **2. Diferencia entre estar conectado y empezar a trabajar — Publicado.** Conexión y comienzo laboral separados, incluyendo trabajo anticipado real, inicio manual y cierre antes del horario. [Evidencia](disponibilidad-en-inicio.md).
- [x] **3. Inicio y cierre manual de turno — Publicado.** Cierre con alcance de llamada/pausa y rechazo que conserva la actividad. [Alcance](jornada-pausas-y-horarios.md).
- [x] **4. Continuar después de un cierre accidental — Publicado.** Elección explícita entre continuar y otra sesión dentro de la gracia. [Alcance](jornada-pausas-y-horarios.md).
- [x] **5. Día activo e historial de acciones — Publicado.** Hoy/Historial visibles, consulta del día y protección de controles. [Alcance](jornada-pausas-y-horarios.md).
- [x] **6. Vinculación con tu cuenta — Publicado.** Resumen de preparación: cuenta, tracker, Propio y automatismos. [Evidencia](disponibilidad-en-inicio.md).
- [x] **7. Ponerte disponible al comenzar el turno — Publicado.** Mostrar en Inicio la espera hasta el horario de entrada. [Evidencia](disponibilidad-en-inicio.md).
- [x] **8. Esperar entre llamadas usando el ACW de la aplicación — Publicado.** Cuenta regresiva del ACW confirmada por la extensión en Inicio. [Evidencia](disponibilidad-en-inicio.md).
- [x] **9. Regreso automático de Break — Publicado.** Indica si terminar Break intentará volver a disponibilidad o si hace falta Start Calls manual. [Evidencia](disponibilidad-en-inicio.md).
- [x] **10. Regreso automático de Lunch — Publicado.** Mostrar por separado la preferencia de regreso de Lunch. [Evidencia](disponibilidad-en-inicio.md).
- [x] **11. Elegir cómo terminan las pausas — Publicado.** Modalidad y final previsto visibles para pausas activas; distingue horarios programados, duración ausente y cierre por confirmar. [Evidencia](disponibilidad-en-inicio.md).
- [x] **12. Pausar todos los automatismos de disponibilidad — Publicado.** Estado de pausa manual y forma de reanudar visibles en la aplicación. [Evidencia](disponibilidad-en-inicio.md).
- [x] **13. Reintento cuando no tomás una oferta — Publicado.** Explicar reintento y condición que lo detiene sin interruptores adicionales. [Evidencia](disponibilidad-en-inicio.md).
- [x] **14. Prioridades que frenan los clics automáticos — Publicado.** Motivo dominante, PC de solo registro y permiso exclusivo por cuenta con vencimiento servidor; rechaza órdenes y lecturas atrasadas. [Evidencia](compatibilidad-instalacion-y-disponibilidad.md). Extensión 2.3.5 instalada con respaldo y activa confirmada por captura del propietario el 22/10/2026.
- [x] **15. Llamadas detectadas en vivo por la extensión — Publicado.** Procedencia estimada visible y conservada hasta la reconciliación oficial. [Alcance](revision-llamadas-e-importaciones.md).
- [x] **16. Recuperación desde el historial oficial de Propio — Publicado.** Consulta concentrada de estimadas, oficiales y correcciones con procedencia explícita. [Alcance](revision-llamadas-e-importaciones.md).
- [x] **17. Registros pendientes cuando el tracker no está abierto — Publicado.** Popup con vencimiento de eventos, revisión sin borrado automático y apertura de pestaña existente. [Alcance](revision-llamadas-e-importaciones.md).
- [x] **18. Llamada en vivo con los botones de la aplicación — Publicado.** Medición precisa, redondeo e importe estimado explicados; cierre con respaldo previo y rechazo recuperable. [Alcance](revision-llamadas-e-importaciones.md).
- [x] **19. Agregar una llamada manual — Publicado.** Vista previa de fecha, inicio/final, duración y pago; rechazo conserva formulario y evita recompensa. [Alcance](revision-llamadas-e-importaciones.md).
- [x] **20. Pegar llamadas de Propio — Publicado.** Resultado por fila, incluidas repeticiones y errores, con motivo plegado y reintento de detalle. [Alcance](revision-llamadas-e-importaciones.md).
- [x] **21. Editar y borrar llamadas — Publicado.** Historial antes/después, deshacer edición y recuperar borrados individuales/lotes, con vista previa y protección frente a versiones posteriores y fallo al guardar. [Evidencia y límites](recuperacion-llamadas.md).
- [x] **22. Descartar una llamada accidental — Publicado.** Confirmación específica del turno/pausa que se restaura y guardado con reversión ante fallo. [Alcance y pruebas](recuperacion-actividades-y-respaldos.md).
- [x] **23. ACW en vivo y ACW acumulado — Publicado.** Espera actual y acumulado del día diferenciados en jornada. [Alcance](jornada-pausas-y-horarios.md).
- [x] **24. Meta máxima de ACW — Publicado.** Máximo diario distinguido de la espera automática de la extensión. [Alcance](jornada-pausas-y-horarios.md).
- [x] **25. Break y Lunch de la aplicación — Publicado.** Consulta de pausas planeadas/registradas/en curso con tiempos reales. [Alcance](jornada-pausas-y-horarios.md).
- [x] **26. Continuar o descartar una pausa accidental — Publicado.** Continuación identificada; descartarla devuelve el tramo cerrado previo, con protección de guardado. [Alcance y pruebas](recuperacion-actividades-y-respaldos.md).
- [x] **27. Editar huecos entre llamadas — Publicado.** Clasificación manual visible en tabla/editor; revisión vigente y reversión ante rechazo. [Alcance y pruebas](recuperacion-actividades-y-respaldos.md).
- [x] **28. Adherencia al horario — Publicado.** Minutos evaluados, adherentes y excepciones con causas plegadas. [Alcance](jornada-pausas-y-horarios.md).
- [x] **29. Plantilla semanal — Publicado.** Orden desde inicio del turno, día siguiente y duración nocturna reactiva. [Alcance](jornada-pausas-y-horarios.md).
- [x] **30. Semana específica y copia de horarios — Publicado.** Vista previa antes/después y copia limitada a días de destino. [Alcance](jornada-pausas-y-horarios.md).
- [x] **31. Ajustar todo el turno y decidir qué pasa si llegás tarde — Publicado.** Desplazamiento del borrador y ejemplo de llegada tarde antes de aplicar. [Alcance](jornada-pausas-y-horarios.md).
- [x] **32. Metas diarias, por fecha y del ciclo — Publicado.** Procedencia general/fecha/histórica/Finanzas y meta de ciclo actual consultables. [Alcance](jornada-pausas-y-horarios.md).
- [x] **33. Ganancias de hoy y del ciclo — Publicado.** Desglose plegado de base registrada, estimada en vivo, Higher Rate calculado y total; actualización tras correcciones oficiales y navegación por día/ciclo. [Evidencia](ganancias-desglose.md).
- [x] **34. Moneda secundaria e intercambio del monto principal — Publicado.** Conserva intercambio persistente y equivalencia debajo; la tasa manual se consulta en el desglose. [Evidencia](ganancias-desglose.md).
- [x] **35. Tasa base por minuto — Publicado.** Explica nuevas estimaciones/meta general y conservación de pagos, bonos y metas especiales; guardar mantiene su alcance anterior. [Evidencia](ganancias-desglose.md).
- [x] **36. Ventanas de Higher Rate — Publicado.** Revisión de llamadas por ventana, gracia y motivos; carga mediante fecha, horas y nivel comprobables del aviso. [Evidencia y alcance](higher-rate-revision.md).
- [x] **37. Conservar bonos ganados al editar o limpiar ventanas — Publicado.** Edición normal y limpieza conservan bonos; corrección explícita con vista previa antes/después y confirmación, reversión ante fallo y protección de cuenta/revisión. [Evidencia y alcance](higher-rate-revision.md).
- [x] **38. Gastos, ahorro y categorías — Publicado.** Distinguir objetivo, reservado, pagado y pendiente en las filas. [Alcance y validación](finanzas-reservas-y-recepciones.md).
- [x] **39. Asignación manual o automática del dinero ganado — Publicado.** Explicar destino de cada asignación manual/automática. [Alcance y validación](finanzas-reservas-y-recepciones.md).
- [x] **40. Registrar pagos de gastos — Publicado.** Separación visual de reserva y pago real registrado. [Alcance y validación](finanzas-reservas-y-recepciones.md).
- [x] **41. Períodos, gastos recurrentes y reinicio — Publicado.** Vista previa de reinicio, liberaciones, historial y período. [Alcance y validación](finanzas-reservas-y-recepciones.md).
- [x] **42. Resumen de Finanzas en Inicio — Publicado.** Identificar pendientes de Finanzas como acumulados. [Alcance y validación](finanzas-reservas-y-recepciones.md).
- [x] **43. Reportes de rendimiento — Publicado.** Conclusiones principales antes del detalle de métricas. [Alcance y límites](reportes-calendario-y-exportaciones.md).
- [x] **44. Proyección del ciclo — Publicado.** Supuestos de proyección y efecto de días/ritmo visibles. [Alcance y límites](reportes-calendario-y-exportaciones.md).
- [x] **45. Fechas de pago — Publicado.** Registrar pago recibido manual y diferencia con lo esperado. [Alcance y validación](finanzas-reservas-y-recepciones.md).
- [x] **46. Calendario de productividad — Publicado.** Leyenda que distinga sin datos, libre y meta no cumplida. [Alcance y límites](reportes-calendario-y-exportaciones.md).
- [x] **47. Marcar días y agregar contexto — Publicado.** Estado manual visible en semana/calendario y efecto histórico explicado; edición protegida. [Alcance y pruebas](recuperacion-actividades-y-respaldos.md).
- [x] **48. Alarmas de turno y descansos — Publicado.** Resumen de alarmas activas. [Alcance y validación](avisos-y-cierres-de-llamadas.md).
- [x] **49. Sonidos al guardar llamadas — Publicado.** Asociación clara acción/sonido conservando reconciliación silenciosa. [Alcance y validación](avisos-y-cierres-de-llamadas.md).
- [x] **50. Aviso de descanso por minutos productivos — Publicado.** Progreso hacia el aviso sin iniciar pausas automáticamente. [Alcance y validación](avisos-y-cierres-de-llamadas.md).
- [x] **51. Mensaje de apoyo cuando llevás tiempo sin llamadas — Publicado.** Acceso comprensible al apoyo configurable desde Avisos. [Alcance y validación](avisos-y-cierres-de-llamadas.md).
- [x] **52. Cierre breve y recuperación de una llamada difícil — Publicado.** Respuesta/cierre ágil y consulta de reflexiones guardadas. [Alcance y validación](avisos-y-cierres-de-llamadas.md).
- [x] **53. Activar Logros y la batalla — Publicado.** Introducción dentro de Preferencias; desactivar conserva progreso y rechazar guardado revierte el interruptor. [Evidencia](logros-reglas-y-premios.md).
- [x] **54. Armas y práctica — Publicado.** Ayuda de armas, práctica y controles móviles; jugar conserva llamadas, ganancias y XP laboral. [Evidencia](logros-reglas-y-premios.md).
- [x] **55. XP, niveles, misiones, rachas y récords — Publicado.** XP del día, elegibilidad, componentes, tope, niveles, racha y correcciones en el detalle de Nivel. [Evidencia](logros-reglas-y-premios.md).
- [x] **56. Cofre de la meta diaria — Publicado.** Meta pendiente, cofre disponible, reclamado y ajustado por corrección; acción e idempotencia canónicas conservadas. [Evidencia](logros-reglas-y-premios.md).
- [x] **57. Equipo, trofeos y bestiario — Publicado.** Filtro de equipo y vista previa sin equipar ni guardar; apertura y foco conservados al actualizar. [Evidencia](logros-reglas-y-premios.md).
- [x] **58. Premios personales — Publicado.** Editor simple y opciones avanzadas existentes; pendientes y realizados visibles juntos, pausa sin retirar lo ganado. [Evidencia](logros-reglas-y-premios.md).
- [x] **59. Duelo durante una pausa o fuera del turno — Publicado.** Entrada y salida táctiles, pausa al volver al trabajo y reanudación explícita de la ronda sin registros laborales. [Evidencia](logros-reglas-y-premios.md).
- [x] **60. Premio del ciclo completado — Publicado.** Intervalo del ciclo, cierre propio del premio pendiente y constancia del último reclamado; sin duplicados ni depósitos inferidos. [Evidencia](logros-reglas-y-premios.md).
- [x] **61. Temas, paletas e idioma — Publicado.** Vista esencial reversible con bloques elegibles y contraste de las siete paletas en ambos modos. [Evidencia](presentacion-esencial-y-accesibilidad.md).
- [x] **62. Reloj, fecha, saludo y vista angosta — Publicado.** Fecha completa, frase fija y reloj adaptados al mismo layout angosto. [Evidencia](presentacion-esencial-y-accesibilidad.md).
- [x] **63. Vista original de Propio — Publicado.** Preferencia y componente nativo presente, ausente, cargando o esperando Offline distinguidos en el popup. [Evidencia](compatibilidad-instalacion-y-disponibilidad.md). Extensión 2.3.5 instalada con respaldo y activa confirmada por captura del propietario el 22/10/2026.
- [x] **64. Escritorio de trabajo al iniciar Windows — Publicado.** Asistente del perfil para otras PCs, páginas y tamaños; JSON de rutas Windows e instalador con vista previa y respaldo. [Evidencia](compatibilidad-instalacion-y-disponibilidad.md). Extensión 2.3.5 instalada con respaldo y activa confirmada por captura del propietario el 22/10/2026.
- [x] **65. Cuenta y perfil — Publicado.** Google vigente, correo de solo lectura, usuario de perfil editable y separado del saludo. [Evidencia](cuenta-sincronizacion-y-recuperacion.md).
- [x] **66. Guardado local y sincronización — Publicado.** Detalle local/nube/red/caché y reconexión; comparación por ID y payload completo resuelve el orden de consulta sin ocultar divergencias. [Evidencia](cuenta-sincronizacion-y-recuperacion.md).
- [x] **67. Respaldo completo JSON — Publicado.** Comparación actual/respaldo, copia privada previa, recuperación explícita y protección de cuenta/revisión/cuota. [Alcance y pruebas](recuperacion-actividades-y-respaldos.md).
- [x] **68. Reportes CSV y PDF — Publicado.** Explicar período/datos incluidos y diferencia con respaldo. [Alcance y límites](reportes-calendario-y-exportaciones.md).
- [x] **69. Reinicios y borrados — Publicado.** Alcance específico del día/total, copia previa y recuperación consultable; rechazo conserva los datos. [Alcance y pruebas](recuperacion-actividades-y-respaldos.md).
- [x] **70. App instalable y recuperación — Publicado.** Estado de caché, copia propia, sesión y límites; reapertura offline y posterior sincronización comprobadas con worker real aislado. [Evidencia](cuenta-sincronizacion-y-recuperacion.md).
- [x] **71. Estado de conexión y actividad de la extensión — Publicado.** Diagnóstico inicial: qué pasa, qué sigue funcionando y qué hacer. [Evidencia](disponibilidad-en-inicio.md).
- [x] **72. Borrar la cuenta — Publicado.** Exportación JSON antes de borrar, activos/copias/retención claros y revalidación de propietario antes del POST; cancelación sin borrado real. [Evidencia](cuenta-sincronizacion-y-recuperacion.md).
- [x] **73. Guías y apoyo voluntario — Publicado.** Actualizar guía y README retirando descripciones desactualizadas. [Evidencia](guia-practica-tool-y-extension.md) y [README](../extension/propio-bridge/README.md).
- [x] **74. Funcionamiento con otra pestaña al frente — Publicado.** Lecturas recientes y permiso exclusivo antes de automatizar; retorno de suspensión exige nueva confirmación y conserva registro. [Evidencia](compatibilidad-instalacion-y-disponibilidad.md). Extensión 2.3.5 instalada con respaldo y activa confirmada por captura del propietario el 22/10/2026.
- [x] **75. Volumen general y sonidos propios — Publicado.** Explicar volumen cero, avisos escritos y espacio de archivos. [Alcance y validación](avisos-y-cierres-de-llamadas.md).
- [x] **76. Planificador de Finanzas hacia la meta diaria — Publicado.** Desglosar cálculo y mostrar meta propuesta antes de guardar. [Alcance y validación](finanzas-reservas-y-recepciones.md).
- [x] **77. Filtros de llamadas y acciones — Publicado.** Búsqueda Customer ID y filtros de procedencia del día activo, sin cambiar totales ni registros. [Alcance](revision-llamadas-e-importaciones.md).
- [x] **78. Barra de actividad en vivo — Publicado.** Barra y tarjeta comparten estado y duración congelada de la llamada pendiente; mismo editor, sin duplicación. [Evidencia](presentacion-esencial-y-accesibilidad.md).
- [x] **79. Accesibilidad — Publicado.** Teclado, foco/restauración, salto al contenido, ayudas táctiles/Escape, reflow y movimiento reducido comprobados; límites de lector humano explícitos. [Evidencia](presentacion-esencial-y-accesibilidad.md).

## Entregas verificadas

- [PR #97](https://github.com/jonathanvelasquez787-commits/propio-shift-tracker/pull/97), main `b6eda674f36d0415b6dad4c27e2aaa13d3ad86e0`: once vistas aprobadas aplicadas, incluida disponibilidad compacta. 947 pruebas y doce recorridos ES/EN, temas y anchos; popup real con API de Chrome simulada. CI de PR/main y traducciones correctos, producción READY y ocho archivos públicos del mismo SHA verificados. Extensión 2.3.1 instalada con respaldo y recarga confirmada por el propietario. Esta corrección visual no cierra por sí sola las veinte mejoras funcionales pendientes.

- [PR #96](https://github.com/jonathanvelasquez787-commits/propio-shift-tracker/pull/96), main `00aeb67aa042798ef1e6e10ea95b476b994fef0f`: 943 pruebas y 20 recorridos compilados con datos ficticios. CI del PR/main y traducciones correctos, producción READY y archivos públicos del mismo SHA verificados. Cierra 48–52 y 75. Extensión sin cambios.


- [PR #95](https://github.com/jonathanvelasquez787-commits/propio-shift-tracker/pull/95), main `e04130cc20e10b6869e740c7e8cd64951d0391d7`: 941 pruebas, 16 recorridos y comprobaciones adicionales de exportación. CI del PR/main y traducciones correctos, producción READY y archivos públicos del SHA verificados. Cierra 43–44, 46 y 68. CSV Blob y documento de impresión comprobados; guardado nativo del CSV sin certificar por cancelación independiente de Chrome aislado.


- [PR #93](https://github.com/jonathanvelasquez787-commits/propio-shift-tracker/pull/93),
  commit `c178210a2ac30c4d7b46182f5be38817cebadd14`: 916 pruebas, build con
  identificador real de producción, 16 recorridos ES/EN/temas/anchos, cuota,
  editor nocturno y semana específica. CI del PR/main correctos, producción
  READY del SHA y archivos públicos comprobados. Cierra 3–5, 23–25 y 28–32.
  Extensión 2.3.0 sin cambios adicionales.

- [PR #92](https://github.com/jonathanvelasquez787-commits/propio-shift-tracker/pull/92),
  commit `7900eaafce954b03317815e3a5e3adb90efd85d3`: 904 pruebas, build,
  16 recorridos ES/EN/temas/anchos y pruebas de cuota/descarga fallida; popup
  en ambos temas. CI del PR y main correctos, producción READY del SHA y
  archivos públicos comprobados. Cierra 15–20 y 77. Extensión 2.3.0 instalada
  con respaldo y preferencias conservadas; recarga aún sin confirmar.

- [PR #91](https://github.com/jonathanvelasquez787-commits/propio-shift-tracker/pull/91),
  commit `0dbc8d055a70fe6e75b7a59201ca9e7de386b6f0`: 893 pruebas, build,
  16 recorridos de recuperación y pruebas adicionales de cuota/reinicio total.
  CI del PR y de main correctos; producción READY del mismo SHA, estilos,
  HTML, módulos y traducciones públicos comprobados. Cierra 22, 26–27, 47,
  67 y 69; extensión 2.2.10 sin cambios.

- [PR #87](https://github.com/jonathanvelasquez787-commits/propio-shift-tracker/pull/87),
  commit `297e02b6da0c1aa510e03ecf7a2ab122ea0e3adb`: 846 pruebas, build y
  12 recorridos de limpieza; CI del PR y main correctos, producción READY y
  lectura pública de código/vista/estilos del mismo commit comprobada.
  No cierra el punto 37: su corrección explícita permanece pendiente.
- [PR #86](https://github.com/jonathanvelasquez787-commits/propio-shift-tracker/pull/86),
  commit `ed3a4fa5dbd9c8ba91fe2d04191daad3bc1873a9`: 838 pruebas, build y
  336 vistas; CI del PR y main correctos. Producción READY y lectura pública
  del mismo commit comprobada. App 624 compacta el resumen web y versiona sus
  estilos; no cambia el motor de la extensión ni suma una casilla terminada.
- [PR #84](https://github.com/jonathanvelasquez787-commits/propio-shift-tracker/pull/84),
  commit `93d4392c121db17829d7a68f6e022d9cc46c3433`: 835 pruebas, builds y
  320 vistas; CI del PR y de main correctos. Producción READY y lectura pública
  del mismo commit comprobada. Archivos 2.2.9 instalados con respaldo, permisos
  y preferencias conservados; el propietario confirmó «Ya recargué todo».
  Cierra 1, 2, 9 y 11 sin cerrar otras fases ni la coordinación multi-PC.
- [PR #81](https://github.com/jonathanvelasquez787-commits/propio-shift-tracker/pull/81),
  commit `3eba5f8ef7869a98a0dd1ece1c5afd39572a5bf1`: CI del PR correcto,
  829 pruebas, builds y 224 vistas. Vercel producción READY en ese mismo SHA;
  `/api/health` y la nueva sección pública comprobados. Guía y evidencia técnica
  en [Disponibilidad en Inicio](disponibilidad-en-inicio.md).
- Archivos 2.2.8 instalados con respaldo y preferencias personales conservadas.
  El propietario confirmó «Ya recargué todo» el 18/10. No se marca ninguna otra
  fase como terminada por esa confirmación.

## Orden de ejecución

1. **Disponibilidad en Inicio y preparación del turno — parte de Inicio publicada.** Estado
   dominante, próxima acción, cuenta regresiva ligada al worker, lectura reciente,
   conexión/turno diferenciados y detalles de preparación. Cubre 1–2, 6–14, 71,
   74 y parte de 78. Vista previa en claro/oscuro aprobada; lógica de transporte
   sin modificar decisiones de Start/Stop ni aceptación de llamadas. Los puntos
   14 y 74 conservan abierta su parte de coordinación entre PCs en la fase 12;
   la consistencia de la barra de actividad del punto 78 sigue pendiente.
2. **Corrección de Higher Rate — publicada.** Limpiar el historial solo quita las
   ventanas de la lista: conserva los bonos ya registrados en las llamadas y
   no reasigna Finanzas. Recalcular nunca forma parte de esa limpieza.
   La acción explícita de corregir/recalcular muestra llamadas e importes antes
   y después, con confirmación y protección de beneficios de otras promociones.
   33–37 resueltos en orden. [Alcance y pruebas](higher-rate-revision.md).
3. **Recuperación y trazabilidad — publicada.** El punto 21 está publicado:
   historial de ediciones y borrados de llamadas, vista previa y recuperación.
   22, 26–27, 47, 67 y 69 se publicaron en la entrega 629. Deshacer/papelera temporal para
   llamadas y acciones recuperables; historial antes/después; restauración con
   comparación y copia previa; confirmaciones de alcance. Cubre 21–22, 26–27,
   47, 67 y 69. No restaurar datos ajenos ni sobrescribir cambios posteriores.
4. **Revisión de llamadas — publicada.** Estimada/oficial/corregida, resultado
   por fila de importación, cola y vencimientos, búsqueda Customer ID y filtros.
   Cubre 15–20 y 77. Conservar silencio en reconciliación automática.
5. **Jornada, pausas, ACW, adherencia y horario — publicada.** Alcances visibles,
   hoy/histórico, continuidad, plan/real, origen de metas y vista previa de
   desplazamiento/copia. Cubre 3–5, 23–25 y 28–32.
6. **Finanzas y pagos — publicada.** Explicar reparto y alcance acumulado,
   reservado/pagado, recurrencia/reinicio y planificador; pago recibido manual
   y diferencia contra lo esperado. Cubre 38–42, 45 y 76. Sin movimientos bancarios
   ni afirmar depósitos a partir de reservas.
7. **Reportes y calendario — publicada (web 633, PR #95).** Conclusiones primero, supuestos de
   proyección, leyendas de días sin datos y exportaciones comprensibles.
   Cubre 43–44, 46 y 68.
8. **Avisos y acompañamiento — publicada (web 634, PR #96).** Resumen de alarmas, sonido/volumen y
   archivos, progreso hacia descanso, acceso a apoyo, reflexión fácil y consulta.
   Cubre 48–52 y 75. Mantener elecciones y carácter voluntario.
9. **Logros — publicada (web 642).** Introducción, reglas y estados de premios/cofres,
   organización de equipo, creación de premios y entrada/salida del duelo.
   Cubre 53–60. Armas/práctica mantienen alcance; no crear productividad ficticia.
10. **Presentación esencial y accesibilidad — publicada (web 642).** Bloques prioritarios
    configurables; paletas, zoom, foco, teclado, ayudas táctiles, lector y
    movimiento reducido; reloj/frase, consistencia de actividad viva. Cubre
    61–62, 78–79. Rediseños puramente visuales requieren su mockup aprobado según
    instrucciones.md; funcionalidades ya aprobadas conservan sus excepciones.
11. **Cuenta, sincronización y documentación — publicada (web 642).** Textos de campos
    editables, detalle de confirmación local/nube y conflictos, recuperación PWA,
    borrado de cuenta y ayuda actualizadas. Cubre 65–66, 70, 72–73. Mantener Google
    como entrada pública y configuración de Auth/SMTP vigente.
12. **Compatibilidad e instalación — publicada.** Estado de vista nativa de Propio,
    configuración guiada de páginas/perfil/notas y tamaños para otras PCs;
    coordinación entre dispositivos antes de permitir iniciadores simultáneos.
    Cubre 63–64 y ampliación de 14/74. No comprar proveedores ni cambiar seguridad
    de Windows. La instalación actual confirmada no vuelve a ser pendiente.

## Entrega de Finanzas

[PR #94](https://github.com/jonathanvelasquez787-commits/propio-shift-tracker/pull/94), main `37d8ee96b6c68fffa0bafc0b05bfa43858857024`: 931 pruebas, 16 recorridos compilados y caso adicional de cuota, meta propuesta y cancelación de borrado. CI del PR y main correctos, traducción correcta, producción READY y hashes públicos del mismo SHA verificados. Extensión sin cambios.

## Criterios comunes de entrega

El conteo de veinte mejoras abiertas corresponde únicamente al plan de 79.
No es un inventario de todos los asuntos externos ni de toda la cobertura de
pruebas del proyecto.

### Asuntos adicionales fuera de ese conteo

- **Segundos oficiales de Propio:** obtener evidencia sobre duración y pago del
  último minuto incompleto. La precisión del contador de la aplicación no demuestra
  la regla de facturación de Propio.
  Por decisión del propietario se publicó el umbral personal inclusivo de 40 s
  para estimaciones nuevas (web 636); no cierra la investigación oficial. La
  entrega 637 conserva observación y Propio por separado; ver
  [registros y excepciones](registros-propio-y-tool.md). Ver también
  [alcance del redondeo](redondeo-de-estimaciones.md).
- **Visibilidad por nombre en Google:** seguimiento externo documentado en
  [SEO](seo.md). La última comprobación documentada no es una consulta actual.
  El reintento automático está pausado; no reactivarlo ni repetir solicitudes
  sin autorización del propietario.
- **Traducción automática opcional:** Locize preparado, sin proveedor activo
  confirmado. Requiere decisión del propietario y configuración si se elige
  contratarlo. ES/EN funcionan sin ese servicio.

### Límites de validación que deben comunicarse

- Las simulaciones no certifican todas las variantes nativas de llamada/Save,
  OAuth humano nuevo, dos PCs físicas, otro monitor físico ni audibilidad real.
  Parte de esta cobertura corresponde a 14, 64 y 74; no contarla dos veces.
- CSV: contenido y nombre del archivo comprobados; guardado nativo a disco sin
  certificar por cancelación de Chrome aislado. La vista de impresión no
  certifica una impresión física. Ver [exportaciones](reportes-calendario-y-exportaciones.md).
- SQL y restauración local con fixtures no certifican un ensayo completo de
  restauración de un proyecto alojado ni la ejecución real de sus cron.
  Ver [operación y recuperación](production-recovery.md).
- La suspensión del equipo y los cambios arbitrarios de reloj/zona siguen
  sujetos a los límites documentados. Una prueba correcta no implica que la
  automatización funcione con el equipo suspendido.

### Comprobación antes de cerrar una entrega

- Conservar funciones actuales, registros, configuración y prioridades.
- Pruebas de éxito, fallo, cuenta/revisión cambiada, reapertura y ausencia de
  duplicados en las áreas modificadas. Confirmar CI y SHA de producción.
- ES/EN, claro/oscuro y mismo layout responsive; montos con moneda secundaria.
- Registrar qué quedó publicado y qué sigue pendiente en este documento.
- Segundos oficiales de Propio, procesamiento de Google y Locize conservan su
  condición externa. La aprobación de mejoras no demuestra reglas de pago ni
  autoriza compras o nuevas solicitudes de indexación.
