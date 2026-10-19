# Mejoras integrales aprobadas

Solicitud del propietario: «Me gustó todo lo que me dijiste así que haremos
todo. Empieza». Base: app 621, extensión 2.2.7, evaluación de 79 funciones del
18/10/2026. Esta lista conserva el alcance completo entre entregas; cada fase
se publica con pruebas apropiadas. Una función existente marcada para mejorar
no se considera rota por esa razón.

## Lista de control completa

**18 de 79 mejoras publicadas.** 6 probadas en la entrega web 629, 2 en curso y 53 pendientes. La preparación del
turno usa app 624 y extensión 2.2.10, con publicación comprobada y recarga de la
extensión, Propio y tracker confirmada por el propietario. App 625 refuerza la
limpieza de Higher Rate; app 626 incorpora, en orden, el desglose de ganancias,
consulta de conversión y alcance de tarifa. App 627 completa 36 y 37: revisión
por ventana y corrección con vista previa, conservando bonos al editar o limpiar.
App 628 completa el punto 21 con historial antes/después y recuperación de
ediciones, eliminaciones y vaciados de llamadas. La entrega web 629 completa la implementación de 22, 26–27, 47, 67 y 69; falta comprobar su publicación para cerrar la fase 3.

Estas 79 mejoras corresponden al sistema completo. El panel de disponibilidad
y preparación se ve en la **tool web**; el popup de la **extensión de Chrome**
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
- [ ] **3. Inicio y cierre manual de turno — Pendiente.** Confirmación de cierre con alcance y actividades pendientes.
- [ ] **4. Continuar después de un cierre accidental — Pendiente.** Distinguir continuación del turno y sesión nueva.
- [ ] **5. Día activo e historial de acciones — Pendiente.** Hacer evidente Hoy frente a una fecha histórica antes de acciones.
- [x] **6. Vinculación con tu cuenta — Publicado.** Resumen de preparación: cuenta, tracker, Propio y automatismos. [Evidencia](disponibilidad-en-inicio.md).
- [x] **7. Ponerte disponible al comenzar el turno — Publicado.** Mostrar en Inicio la espera hasta el horario de entrada. [Evidencia](disponibilidad-en-inicio.md).
- [x] **8. Esperar entre llamadas usando el ACW de la tool — Publicado.** Cuenta regresiva del ACW confirmada por la extensión en Inicio. [Evidencia](disponibilidad-en-inicio.md).
- [x] **9. Regreso automático de Break — Publicado.** Indica si terminar Break intentará volver a disponibilidad o si hace falta Start Calls manual. [Evidencia](disponibilidad-en-inicio.md).
- [x] **10. Regreso automático de Lunch — Publicado.** Mostrar por separado la preferencia de regreso de Lunch. [Evidencia](disponibilidad-en-inicio.md).
- [x] **11. Elegir cómo terminan las pausas — Publicado.** Modalidad y final previsto visibles para pausas activas; distingue horarios programados, duración ausente y cierre por confirmar. [Evidencia](disponibilidad-en-inicio.md).
- [x] **12. Pausar todos los automatismos de disponibilidad — Publicado.** Estado de pausa manual y forma de reanudar visibles en la tool. [Evidencia](disponibilidad-en-inicio.md).
- [x] **13. Reintento cuando no tomás una oferta — Publicado.** Explicar reintento y condición que lo detiene sin interruptores adicionales. [Evidencia](disponibilidad-en-inicio.md).
- [ ] **14. Prioridades que frenan los clics automáticos — En curso.** Motivo dominante del bloqueo y coordinación antes de uso simultáneo en PCs.
- [ ] **15. Llamadas detectadas en vivo por la extensión — Pendiente.** Origen en vivo y carácter estimado identificables.
- [ ] **16. Recuperación desde el historial oficial de Propio — Pendiente.** Vista concentrada de estimadas, oficiales y corregidas.
- [ ] **17. Registros pendientes cuando el tracker no está abierto — Pendiente.** Pendientes próximos a vencer y acciones para resolverlos.
- [ ] **18. Llamada en vivo con los botones de la tool — Pendiente.** Explicar tiempo medido, mínimo de registro e importe estimado.
- [ ] **19. Agregar una llamada manual — Pendiente.** Comprobación de fecha, duración y pago antes de guardar manuales.
- [ ] **20. Pegar llamadas de Propio — Pendiente.** Resultado de importación por fila y su motivo.
- [x] **21. Editar y borrar llamadas — Publicado.** Historial antes/después, deshacer edición y recuperar borrados individuales/lotes, con vista previa y protección frente a versiones posteriores y fallo al guardar. [Evidencia y límites](recuperacion-llamadas.md).
- [ ] **22. Descartar una llamada accidental — Probado (sin publicar).** Confirmación específica del turno/pausa que se restaura y guardado con reversión ante fallo. [Alcance y pruebas](recuperacion-actividades-y-respaldos.md).
- [ ] **23. ACW en vivo y ACW acumulado — Pendiente.** Distinguir ACW actual del acumulado y explicar su origen.
- [ ] **24. Meta máxima de ACW — Pendiente.** Distinguir máximo deseado de ACW de la espera entre llamadas.
- [ ] **25. Break y Lunch de la tool — Pendiente.** Presentar pausa planeada y real con duración actual.
- [ ] **26. Continuar o descartar una pausa accidental — Probado (sin publicar).** Continuación identificada; descartarla devuelve el tramo cerrado previo, con protección de guardado. [Alcance y pruebas](recuperacion-actividades-y-respaldos.md).
- [ ] **27. Editar huecos entre llamadas — Probado (sin publicar).** Clasificación manual visible en tabla/editor; revisión vigente y reversión ante rechazo. [Alcance y pruebas](recuperacion-actividades-y-respaldos.md).
- [ ] **28. Adherencia al horario — Pendiente.** Desglose de minutos y causas al consultar adherencia.
- [ ] **29. Plantilla semanal — Pendiente.** Orden y cruce de medianoche legibles en el editor.
- [ ] **30. Semana específica y copia de horarios — Pendiente.** Alcance plantilla/semana y vista previa de días al copiar.
- [ ] **31. Ajustar todo el turno y decidir qué pasa si llegás tarde — Pendiente.** Vista previa de jornada desplazada antes de guardar.
- [ ] **32. Metas diarias, por fecha y del ciclo — Pendiente.** Identificar meta general, excepción o calculada desde Finanzas.
- [x] **33. Ganancias de hoy y del ciclo — Publicado.** Desglose plegado de base registrada, estimada en vivo, Higher Rate calculado y total; actualización tras correcciones oficiales y navegación por día/ciclo. [Evidencia](ganancias-desglose.md).
- [x] **34. Moneda secundaria e intercambio del monto principal — Publicado.** Conserva intercambio persistente y equivalencia debajo; la tasa manual se consulta en el desglose. [Evidencia](ganancias-desglose.md).
- [x] **35. Tasa base por minuto — Publicado.** Explica nuevas estimaciones/meta general y conservación de pagos, bonos y metas especiales; guardar mantiene su alcance anterior. [Evidencia](ganancias-desglose.md).
- [x] **36. Ventanas de Higher Rate — Publicado.** Revisión de llamadas por ventana, gracia y motivos; carga mediante fecha, horas y nivel comprobables del aviso. [Evidencia y alcance](higher-rate-revision.md).
- [x] **37. Conservar bonos ganados al editar o limpiar ventanas — Publicado.** Edición normal y limpieza conservan bonos; corrección explícita con vista previa antes/después y confirmación, reversión ante fallo y protección de cuenta/revisión. [Evidencia y alcance](higher-rate-revision.md).
- [ ] **38. Gastos, ahorro y categorías — Pendiente.** Distinguir objetivo, reservado, pagado y pendiente en las filas.
- [ ] **39. Asignación manual o automática del dinero ganado — Pendiente.** Explicar destino de cada asignación manual/automática.
- [ ] **40. Registrar pagos de gastos — Pendiente.** Separación visual de reserva y pago real registrado.
- [ ] **41. Períodos, gastos recurrentes y reinicio — Pendiente.** Vista previa de reinicio, liberaciones, historial y período.
- [ ] **42. Resumen de Finanzas en Inicio — Pendiente.** Identificar pendientes de Finanzas como acumulados.
- [ ] **43. Reportes de rendimiento — Pendiente.** Conclusiones principales antes del detalle de métricas.
- [ ] **44. Proyección del ciclo — Pendiente.** Supuestos de proyección y efecto de días/ritmo visibles.
- [ ] **45. Fechas de pago — Pendiente.** Registrar pago recibido manual y diferencia con lo esperado.
- [ ] **46. Calendario de productividad — Pendiente.** Leyenda que distinga sin datos, libre y meta no cumplida.
- [ ] **47. Marcar días y agregar contexto — Probado (sin publicar).** Estado manual visible en semana/calendario y efecto histórico explicado; edición protegida. [Alcance y pruebas](recuperacion-actividades-y-respaldos.md).
- [ ] **48. Alarmas de turno y descansos — Pendiente.** Resumen de alarmas activas.
- [ ] **49. Sonidos al guardar llamadas — Pendiente.** Asociación clara acción/sonido conservando reconciliación silenciosa.
- [ ] **50. Aviso de descanso por minutos productivos — Pendiente.** Progreso hacia el aviso sin iniciar pausas automáticamente.
- [ ] **51. Mensaje de apoyo cuando llevás tiempo sin llamadas — Pendiente.** Acceso comprensible al apoyo configurable desde Avisos.
- [ ] **52. Cierre breve y recuperación de una llamada difícil — Pendiente.** Respuesta/cierre ágil y consulta de reflexiones guardadas.
- [ ] **53. Activar Logros y la batalla — Pendiente.** Introducción que explique batalla y opciones.
- [ ] **54. Armas y práctica — Pendiente.** Conservar alcance de armas/práctica y verificar separación contable.
- [ ] **55. XP, niveles, misiones, rachas y récords — Pendiente.** Explicar reglas de XP/hitos y ajustes por correcciones.
- [ ] **56. Cofre de la meta diaria — Pendiente.** Estados de cofre disponible, reclamado y reconciliado.
- [ ] **57. Equipo, trofeos y bestiario — Pendiente.** Organización y vista previa de equipo disponible/equipado.
- [ ] **58. Premios personales — Pendiente.** Simplificar creación y distinguir estados de premios personales.
- [ ] **59. Duelo durante una pausa o fuera del turno — Pendiente.** Entrada/salida móvil y continuidad del duelo al volver al trabajo.
- [ ] **60. Premio del ciclo completado — Pendiente.** Identificar ciclo y condición de cada premio.
- [ ] **61. Temas, paletas e idioma — Pendiente.** Paletas legibles, revisión de contraste y vista esencial configurable.
- [ ] **62. Reloj, fecha, saludo y vista angosta — Pendiente.** Mantener frase fija/fecha completa y revisar espacio en anchos pequeños.
- [ ] **63. Vista original de Propio — Pendiente.** Explicar estado y dependencia del componente nativo de Propio.
- [ ] **64. Escritorio de trabajo al iniciar Windows — Pendiente.** Configuración guiada para otras PCs de páginas/perfil/notas/tamaños.
- [ ] **65. Cuenta y perfil — Pendiente.** Rótulos acordes con campos editables y acceso Google vigente.
- [ ] **66. Guardado local y sincronización — Pendiente.** Detalle visible de guardado local/nube y conflictos. Revisar el reconocimiento tras una subida al salir: QA detectó un conflicto conservador con contenido de llamadas equivalente en distinto orden y revisión local anterior; se conservaron ambas versiones. Reproducir con el orden real de la consulta antes de cambiar la comparación.
- [ ] **67. Respaldo completo JSON — Probado (sin publicar).** Comparación actual/respaldo, copia privada previa, recuperación explícita y protección de cuenta/revisión/cuota. [Alcance y pruebas](recuperacion-actividades-y-respaldos.md).
- [ ] **68. Reportes CSV y PDF — Pendiente.** Explicar período/datos incluidos y diferencia con respaldo.
- [ ] **69. Reinicios y borrados — Probado (sin publicar).** Alcance específico del día/total, copia previa y recuperación consultable; rechazo conserva los datos. [Alcance y pruebas](recuperacion-actividades-y-respaldos.md).
- [ ] **70. App instalable y recuperación — Pendiente.** Explicar estado local, reconexión y límites de PWA.
- [x] **71. Estado de conexión y actividad de la extensión — Publicado.** Diagnóstico inicial: qué pasa, qué sigue funcionando y qué hacer. [Evidencia](disponibilidad-en-inicio.md).
- [ ] **72. Borrar la cuenta — Pendiente.** Alcance y retención claros, ofreciendo exportar antes.
- [x] **73. Guías y apoyo voluntario — Publicado.** Actualizar guía y README retirando descripciones desactualizadas. [Evidencia](guia-practica-tool-y-extension.md) y [README](../extension/propio-bridge/README.md).
- [ ] **74. Funcionamiento con otra pestaña al frente — En curso.** Lectura atrasada/reconexión visibles y coordinación futura multi-PC.
- [ ] **75. Volumen general y sonidos propios — Pendiente.** Explicar volumen cero, avisos escritos y espacio de archivos.
- [ ] **76. Planificador de Finanzas hacia la meta diaria — Pendiente.** Desglosar cálculo y mostrar meta propuesta antes de guardar.
- [ ] **77. Filtros de llamadas y acciones — Pendiente.** Búsqueda Customer ID y filtros estimadas/oficiales/corregidas.
- [ ] **78. Barra de actividad en vivo — Pendiente.** Consistencia entre barra y tarjetas incluidas llamadas pendientes.
- [ ] **79. Accesibilidad — Pendiente.** Revisión de teclado, zoom, lector, ayudas táctiles y objetivos de controles.

## Entregas verificadas

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
3. **Recuperación y trazabilidad — en curso.** El punto 21 está publicado:
   historial de ediciones y borrados de llamadas, vista previa y recuperación.
   22, 26–27, 47, 67 y 69 están probados en la entrega 629, en verificación de publicación. Deshacer/papelera temporal para
   llamadas y acciones recuperables; historial antes/después; restauración con
   comparación y copia previa; confirmaciones de alcance. Cubre 21–22, 26–27,
   47, 67 y 69. No restaurar datos ajenos ni sobrescribir cambios posteriores.
4. **Revisión de llamadas — pendiente.** Estimada/oficial/corregida, resultado
   por fila de importación, cola y vencimientos, búsqueda Customer ID y filtros.
   Cubre 15–20 y 77. Conservar silencio en reconciliación automática.
5. **Jornada, pausas, ACW, adherencia y horario — pendiente.** Alcances visibles,
   hoy/histórico, continuidad, plan/real, origen de metas y vista previa de
   desplazamiento/copia. Cubre 3–5, 23–25 y 28–32.
6. **Finanzas y pagos — pendiente.** Explicar reparto y alcance acumulado,
   reservado/pagado, recurrencia/reinicio y planificador; pago recibido manual
   y diferencia contra lo esperado. Cubre 38–42, 45 y 76. Sin movimientos bancarios
   ni afirmar depósitos a partir de reservas.
7. **Reportes y calendario — pendiente.** Conclusiones primero, supuestos de
   proyección, leyendas de días sin datos y exportaciones comprensibles.
   Cubre 43–44, 46 y 68.
8. **Avisos y acompañamiento — pendiente.** Resumen de alarmas, sonido/volumen y
   archivos, progreso hacia descanso, acceso a apoyo, reflexión fácil y consulta.
   Cubre 48–52 y 75. Mantener elecciones y carácter voluntario.
9. **Logros — pendiente.** Introducción, reglas y estados de premios/cofres,
   organización de equipo, creación de premios y entrada/salida del duelo.
   Cubre 53–60. Armas/práctica mantienen alcance; no crear productividad ficticia.
10. **Presentación esencial y accesibilidad — pendiente.** Bloques prioritarios
    configurables; paletas, zoom, foco, teclado, ayudas táctiles, lector y
    movimiento reducido; reloj/frase, consistencia de actividad viva. Cubre
    61–62, 78–79. Rediseños puramente visuales requieren su mockup aprobado según
    instrucciones.md; funcionalidades ya aprobadas conservan sus excepciones.
11. **Cuenta, sincronización y documentación — pendiente.** Textos de campos
    editables, detalle de confirmación local/nube y conflictos, recuperación PWA,
    borrado de cuenta y ayuda actualizadas. Cubre 65–66, 70, 72–73. Mantener Google
    como entrada pública y configuración de Auth/SMTP vigente.
12. **Compatibilidad e instalación — pendiente.** Estado de vista nativa de Propio,
    configuración guiada de páginas/perfil/notas y tamaños para otras PCs;
    coordinación entre dispositivos antes de permitir iniciadores simultáneos.
    Cubre 63–64 y ampliación de 14/74. No comprar proveedores ni cambiar seguridad
    de Windows. La instalación actual confirmada no vuelve a ser pendiente.

## Criterios comunes de entrega

- Conservar funciones actuales, registros, configuración y prioridades.
- Pruebas de éxito, fallo, cuenta/revisión cambiada, reapertura y ausencia de
  duplicados en las áreas modificadas. Confirmar CI y SHA de producción.
- ES/EN, claro/oscuro y mismo layout responsive; montos con moneda secundaria.
- Registrar qué quedó publicado y qué sigue pendiente en este documento.
- Segundos oficiales de Propio, procesamiento de Google y Locize conservan su
  condición externa. La aprobación de mejoras no demuestra reglas de pago ni
  autoriza compras o nuevas solicitudes de indexación.
