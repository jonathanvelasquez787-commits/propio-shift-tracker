# Guía práctica de la tool y su extensión

Revisión: 17 de octubre de 2026. Esta guía explica las funciones que existen en el proyecto y cómo se usan juntas. La publicación de las correcciones de la auditoría se documenta por separado.

La **tool** lleva tus registros, cálculos y ajustes. La **extensión** conecta esos registros con Propio y puede pulsar Start Calls o Stop Calls según tus preferencias. La aceptación de una llamada sigue siendo tuya.

## 1. Empezar y terminar tu jornada

### 1. Registro automático de la conexión a Propio

- **Qué hace:** detecta tu sesión de Propio y comunica el inicio o cierre confirmado a la tool. No confunde simplemente tener Chrome abierto con estar autenticado en Propio.
- **Qué configurás:** «Registrar en mi tracker» en la extensión. La tool debe estar abierta con tu cuenta.
- **Ejemplo:** abrís Propio a las 7:42 y la tool registra esa conexión sin que tengás que pulsar Iniciar shift.

### 2. Diferencia entre estar conectado y empezar a trabajar

- **Qué hace:** conserva la hora de conexión y separa el comienzo laboral usado para ACW y tiempo en turno. Una conexión anticipada espera el inicio programado; una llamada real anticipada acredita trabajo antes.
- **Qué configurás:** tu hora de entrada en Horario. Un inicio manual explícito conserva la hora que elegiste.
- **Ejemplo:** Propio está abierto desde las 7:42, tu horario empieza a las 8:00 y no hay llamadas antes: Conectado incluye esos 18 minutos, pero el trabajo y su ACW empiezan a las 8:00. Si tomás una llamada real a las 7:50, el trabajo empieza a las 7:50.

### 3. Inicio y cierre manual de turno

- **Qué hace:** los botones de Inicio abren y cierran tu sesión de trabajo; el historial conserva esos movimientos.
- **Qué configurás:** no requiere activar la extensión. Para empezar con el botón, tenés que estar viendo Hoy; el inicio manual respeta el día libre y su margen de entrada anticipada de diez minutos.
- **Ejemplo:** sin usar Propio todavía, iniciás a las 7:55 para tu turno de las 8:00 y lo finalizás a las 16:00. Es una decisión manual y se conserva como tal.

### 4. Continuar después de un cierre accidental

- **Qué hace:** si reanudás dentro del margen de una interrupción accidental, continúa el turno y deja constancia de esa interrupción.
- **Qué configurás:** usás de nuevo Iniciar shift; no hace falta borrar el historial ni rehacer las llamadas.
- **Ejemplo:** tocás Finalizar por error y enseguida volvés a iniciar. La app puede reconocer la continuación del mismo turno.

### 5. Día activo e historial de acciones

- **Qué hace:** permite consultar otro día y ver sus llamadas, inicio, salida, pausas y huecos. Cambiar la fecha que mirás no cambia la fecha real de la PC ni mueve llamadas de día.
- **Qué configurás:** el selector Día activo y sus flechas.
- **Ejemplo:** hoy es viernes, pero seleccionás jueves para revisar una llamada. Los controles de trabajo en vivo te indican que debés volver a Hoy para usarlos.

## 2. Disponibilidad automática en Propio

Estas opciones están en el popup de la extensión. **Registrar llamadas y ponerte disponible son decisiones distintas.**

### 6. Vinculación con tu cuenta

- **Qué hace:** la extensión reconoce la tool abierta y se vincula con su cuenta. Si necesita intervención, ofrece Vincular cuenta y muestra su estado.
- **Qué configurás:** abrís Propio y la tool con tu sesión. Conviene mantener una sola pestaña escribible de cada una para evitar ambigüedad.
- **Ejemplo:** se abre tu escritorio de trabajo y la extensión reconoce la cuenta del tracker sin pedirte vincular cada mañana.

### 7. Ponerte disponible al comenzar el turno

- **Qué hace:** pulsa Start Calls desde la hora de entrada, dentro del horario y hasta que conectás tu primera llamada. No añade la espera entre llamadas antes de esa primera llamada.
- **Qué configurás:** «Al comenzar mi turno» y tu horario en la tool.
- **Ejemplo:** encendés a las 6:00, tu turno empieza a las 6:30 y la espera es de tres minutos: manda el inicio de las 6:30. No empieza a las 6:03 ni espera hasta las 6:33.

### 8. Esperar entre llamadas usando el ACW de la tool

- **Qué hace:** después de una llamada, pulsa Stop Calls cuando reconoce el control disponible. Espera a que el ACW que publica la tool alcance o supere el límite y después pulsa Start Calls.
- **Qué configurás:** «Esperar entre llamadas» y de 1 a 60 minutos de ACW.
- **Ejemplo:** elegís tres minutos y el ACW ya muestra 00:50 cuando la extensión lo recibe. Faltan 02:10. No necesita haber visto 00:00. Si cambiás el límite a cinco minutos, usa el mismo tramo de ACW, sin reiniciarlo.

### 9. Regreso automático de Break

- **Qué hace:** vuelve a ponerte disponible después de un Break cuando este regreso está habilitado y las demás condiciones lo permiten. Tiene prioridad sobre empezar una espera nueva de ACW.
- **Qué configurás:** «Al terminar mi Break».
- **Ejemplo:** terminás el Break a las 10:15 y puede pulsar Start Calls enseguida; no agrega otros tres minutos por la espera entre llamadas. Si apagás ese regreso, la espera entre llamadas no lo sustituye por su cuenta.

### 10. Regreso automático de Lunch

- **Qué hace:** aplica la misma regla de regreso, independientemente de la opción de Break.
- **Qué configurás:** «Al terminar mi Lunch».
- **Ejemplo:** dejás Break automático y Lunch manual. Volver de un Break puede habilitarte; terminar Lunch no te habilita automáticamente por esa opción.

### 11. Elegir cómo terminan las pausas

- **Qué hace:** permite esperar a que vos pulses Terminar Break/Lunch o solicitar que la pausa termine al cumplir su duración conocida.
- **Qué configurás:** el selector «¿Cómo querés terminar esas pausas?» y la duración de tus pausas en Horario. El tracker debe seguir abierto para guardar el cierre automático.
- **Ejemplo:** elegís cierre por duración y empezás un Break de quince minutos a las 10:00. Al cumplirlo, la extensión puede pedir su cierre y volver a disponibilidad. Si elegís cierre manual, llegar a las 10:15 no sustituye tu clic.

### 12. Pausar todos los automatismos de disponibilidad

- **Qué hace:** detiene los iniciadores y la espera automática, conservando sus preferencias. Sigue registrando llamadas. Activar la pausa no cambia por sí solo el estado actual de Propio.
- **Qué configurás:** «Pausar disponibilidad automática», visible fuera del desplegable. Un Stop Calls que pulsás vos también pausa los automatismos; un Stop de la extensión no.
- **Ejemplo:** querés decidir cuándo volver. Pulsás Stop Calls manualmente y la extensión respeta esa decisión incluso después de recargar. Para reanudar, apagás la pausa o pulsás Start Calls en Propio.

### 13. Reintento cuando no tomás una oferta

- **Qué hace:** si corresponde seguir disponible y Propio queda Offline después de una oferta no tomada, puede reintentar Start Calls. No acepta ni rechaza ofertas.
- **Qué configurás:** los iniciadores anteriores; no es un botón de autoaceptación.
- **Ejemplo:** pasa una oferta y Propio te deja Offline. Con el iniciador activo puede volverte a poner disponible, sin inventar otra llamada ni una espera completa nueva.

### 14. Prioridades que frenan los clics automáticos

- **Qué hace:** comprueba horario, cierre de turno, pausas, pausa manual, estado del portal y conexión actual antes de actuar. No toca una llamada conectada ni una oferta visible, y espera ante estados desconocidos.
- **Qué configurás:** Horario y las opciones de automatización. No hay que crear un temporizador independiente para cada condición.
- **Ejemplo:** el ACW supera tres minutos, pero seguís en Lunch: no pulsa Start Calls. Si terminó tu turno, tampoco lo pulsa. Para usar automatismos en dos PCs todavía no existe coordinación global: dejalos activos en una sola.

## 3. Registrar y corregir llamadas

### 15. Llamadas detectadas en vivo por la extensión

- **Qué hace:** comunica la conexión y desconexión confirmadas para registrar la llamada en la tool. Save de Propio sigue cumpliendo su función propia dentro de Propio.
- **Qué configurás:** «Registrar en mi tracker» activado y cuenta vinculada.
- **Ejemplo:** conectás a las 9:00 y colgás a las 9:05. El tracker recibe esos movimientos sin que pulsés también sus botones de llamada.

### 16. Recuperación desde el historial oficial de Propio

- **Qué hace:** usa las filas que Propio carga para completar o corregir tus llamadas. Reconcilia una llamada en vivo con su fila oficial y conserva filas de cero minutos como cero.
- **Qué configurás:** registro automático; abrís el historial y sus páginas para que Propio cargue las filas que querés recuperar.
- **Ejemplo:** la tool guardó una llamada en vivo y luego aparece su registro oficial. Actualiza el registro correspondiente en vez de sumar otra llamada. La sincronización de fondo carga los datos sin el sonido ni los avisos de una importación manual.

### 17. Registros pendientes cuando el tracker no está abierto

- **Qué hace:** la extensión guarda eventos pendientes y trata de entregarlos a la cuenta vinculada al volver. La cola tiene límites y no sustituye un respaldo permanente.
- **Qué configurás:** mantenés la vinculación; el popup muestra eventos por sincronizar. Los eventos tienen una ventana de hasta 24 horas para su entrega.
- **Ejemplo:** cerraste la tool un momento y terminaste una llamada. Al abrir la misma cuenta puede recibirla. Si se requiere revisar el estado, el popup lo informa.

### 18. Llamada en vivo con los botones de la tool

- **Qué hace:** Iniciar llamada corre el tiempo y terminarla la guarda automáticamente. Si falla el guardado normal, conserva un respaldo pendiente para recuperarlo.
- **Qué configurás:** tu tasa y, si corresponde, las ventanas de Higher Rate. Podés usarlo sin la extensión.
- **Ejemplo:** una llamada de cinco minutos a $0.12/min genera $0.60 de base. No tenés que volver a escribir cinco minutos al terminar. Las llamadas en vivo tienen un mínimo de un minuto en su registro; las manuales e importadas aceptan cero.

### 19. Agregar una llamada manual

- **Qué hace:** registra una llamada que falta con fecha, hora, minutos, pago, Billable, Dropped y Customer ID opcional.
- **Qué configurás:** esos campos en Agregar llamada. Podés usar una tarifa sugerida o escribir el pago.
- **Ejemplo:** olvidaste registrar una llamada de ayer de diez minutos y $1.20. La agregás en la fecha correcta y entra en sus ganancias y reportes.

### 20. Pegar llamadas de Propio

- **Qué hace:** lee datos en columnas o una fila por bloque y reconoce registros ya guardados. Informa filas que necesita omitir o revisar.
- **Qué configurás:** pegás la exportación en Pegar Llamadas y pulsás Importar.
- **Ejemplo:** pegás ocho llamadas y después repetís el mismo texto. Las ocho no deberían convertirse en dieciséis. Una fila corregida conserva su identidad cuando corresponde.

### 21. Editar y borrar llamadas

- **Qué hace:** permite corregir duración, pago, Billable o Dropped y eliminar registros. Recalcula lo que depende de esas llamadas, como ganancias y progreso.
- **Qué configurás:** abrís la acción de la fila; las acciones destructivas piden confirmación cuando corresponde.
- **Ejemplo:** una llamada quedó con veinte minutos, pero fueron diez. La corregís y se actualizan sus totales. No es necesario borrar todo el día para arreglarla.

### 22. Descartar una llamada accidental

- **Qué hace:** elimina la llamada en curso sin guardarla. Cuando esa llamada abrió un turno o interrumpió una pausa por accidente, restaura la situación previa que le corresponde.
- **Qué configurás:** usás Descartar y confirmás la acción.
- **Ejemplo:** pulsaste Iniciar llamada por error mientras estabas en Break. Descartarla evita guardar una llamada ficticia y permite recuperar la pausa anterior.

## 4. ACW, descansos y adherencia

### 23. ACW en vivo y ACW acumulado

- **Qué hace:** el chip en vivo muestra el tramo actual sin llamada ni Break/Lunch activo. Los totales y el historial reúnen los intervalos del día; son medidas distintas.
- **Qué configurás:** no se inicia a mano; depende del turno, llamadas y pausas registradas.
- **Ejemplo:** terminás una llamada a las 9:30:40. El tramo en vivo comienza desde ese final registrado. Después de otra llamada comienza otro tramo, mientras el total del día conserva los anteriores. Sigue pendiente confirmar cómo Propio usa los segundos para el pago.

### 24. Meta máxima de ACW

- **Qué hace:** permite comparar el ACW con un máximo que querés mantener.
- **Qué configurás:** el máximo de minutos en su ajuste de ACW.
- **Ejemplo:** elegís un máximo diario para revisar tu uso del tiempo. Ese objetivo no sustituye los tres minutos entre llamadas: la espera automática se configura por separado en la extensión.

### 25. Break y Lunch de la tool

- **Qué hace:** registra inicio y final de cada pausa y muestra su duración. Una llamada real puede cerrar la pausa para registrar la actividad que empieza.
- **Qué configurás:** sus bloques y duraciones en Horario; sus botones en Inicio registran cuándo los tomás realmente.
- **Ejemplo:** tu Break está planeado a las 10:00, pero lo empezás a las 10:07. Quedan el plan y el inicio real para poder compararlos.

### 26. Continuar o descartar una pausa accidental

- **Qué hace:** reconoce continuaciones dentro del margen accidental y permite descartar una pausa iniciada por error, sin conservarla como un descanso real completo.
- **Qué configurás:** usás los controles de la actividad en vivo y sus confirmaciones.
- **Ejemplo:** cerraste Break sin querer y lo reanudás enseguida. La tool puede conservar la continuación y señalar la interrupción, en vez de tratarla como dos descansos independientes.

### 27. Editar huecos entre llamadas

- **Qué hace:** permite clasificar un intervalo y agregar una nota cuando el espacio entre llamadas no describe bien lo ocurrido. Conserva las anotaciones manuales.
- **Qué configurás:** abrís el editor del hueco y elegís su clasificación y comentario.
- **Ejemplo:** hubo un corte de luz entre dos llamadas. Podés explicarlo en ese intervalo en vez de dejar todo como espera sin contexto.

### 28. Adherencia al horario

- **Qué hace:** compara presencia y pausas reales con lo planeado. Muestra resultados del día y por bloque, con minutos de excepción y sus motivos.
- **Qué configurás:** el horario, sus bloques y la ventana de gracia disponible en los ajustes de adherencia.
- **Ejemplo:** Lunch estaba previsto para las 12:30 y lo tomaste a las 13:00. Podés ver la diferencia en vez de asumir que registrar Lunch basta para estar dentro del plan. Estar adherente no exige estar hablando todo el tiempo.

## 5. Horario y metas

### 29. Plantilla semanal

- **Qué hace:** define la jornada habitual de cada día, incluidos días libres y bloques de trabajo, Break y Lunch.
- **Qué configurás:** entradas, salidas, comienzos y duraciones; cada bloque de trabajo puede tener su meta productiva.
- **Ejemplo:** de lunes a viernes trabajás de 8:00 a 16:00 y el domingo es libre. La tool usa esa plantilla sin que la repitás cada semana. Un horario 22:00–06:00 termina a las 6:00 del día siguiente.

### 30. Semana específica y copia de horarios

- **Qué hace:** permite personalizar una semana y reutilizar la configuración de un día en otros. La excepción semanal conserva la plantilla habitual.
- **Qué configurás:** Plantilla o Semana específica, la semana que editás y los botones de copia.
- **Ejemplo:** una semana entrás a las 9:00 por un compromiso. Cambiás esa semana y la siguiente puede seguir con las 8:00 habituales.

### 31. Ajustar todo el turno y decidir qué pasa si llegás tarde

- **Qué hace:** puede mover bloques juntos y permite elegir entre conservar el horario anclado o desplazarlo por una llegada tardía.
- **Qué configurás:** el ajuste del turno y «Si llegas tarde a tu turno» en Horario.
- **Ejemplo:** llegás una hora tarde. Con horario anclado, el Lunch sigue a su hora original; con desplazamiento, los bloques se corren. La extensión debe recibir ese mismo horario efectivo.

### 32. Metas diarias, por fecha y del ciclo

- **Qué hace:** muestra cuánto llevás y cuánto falta respecto de tus metas. Las metas de minutos y dinero se relacionan usando tu tasa; una excepción de un día no reemplaza necesariamente la meta general.
- **Qué configurás:** minutos, dólares o moneda secundaria y el alcance del cambio; también podés definir la meta del ciclo.
- **Ejemplo:** tu meta habitual es $30 y hoy solo querés $15. Elegís aplicarla solo al día para conservar los $30 de los demás días.

## 6. Ganancias y Higher Rate

### 33. Ganancias de hoy y del ciclo

- **Qué hace:** suma los pagos guardados y los bonos que corresponden; muestra avance, tiempo de llamadas y otros indicadores.
- **Qué configurás:** elegís Hoy o Ciclo y navegás entre ciclos cuando la vista lo permite.
- **Ejemplo:** hiciste $14 hoy, pero llevás $160 en el ciclo: cambiar la vista permite consultar ambos sin sumar los mismos registros otra vez.

### 34. Moneda secundaria e intercambio del monto principal

- **Qué hace:** convierte los importes con tu tasa y permite elegir qué moneda aparece grande en las tarjetas de ganancias. Recuerda esa preferencia.
- **Qué configurás:** nombre de moneda, equivalencia por dólar y el control de intercambio del monto.
- **Ejemplo:** con L 26.8 por dólar, $10 equivalen aproximadamente a L 268. Podés mostrar L 268 arriba y el equivalente en dólares abajo. La equivalencia es aproximada y la tasa la configurás vos.

### 35. Tasa base por minuto

- **Qué hace:** sirve para estimar pagos de llamadas manuales/en vivo y relacionar metas. Un pago oficial importado conserva el importe que trae.
- **Qué configurás:** la tasa por minuto en Ajustes.
- **Ejemplo:** a $0.12/min, diez minutos dan $1.20 de base. Cambiar la tasa no autoriza a reinterpretar automáticamente todos los pagos oficiales antiguos.

### 36. Ventanas de Higher Rate

- **Qué hace:** agrega el bono del nivel a llamadas que califican por su hora de inicio, con la gracia inicial prevista en la tool. No lee tu correo para crear ventanas por sí sola.
- **Qué configurás:** fecha, inicio, fin y nivel de la promoción en Higher Rate.
- **Ejemplo:** cargás una ventana Gold que anunció Propio. Las llamadas que califican reciben el bono calculado además de su pago base.

### 37. Conservar bonos ganados al editar o limpiar ventanas

- **Qué hace:** conserva bonos ya acreditados cuando se modifica o retira su ventana, para no perderlos retroactivamente.
- **Qué configurás:** edición y limpieza del historial de Higher Rate.
- **Ejemplo:** quitás ventanas antiguas para ordenar el editor y sus ganancias ya ganadas permanecen. Hay una limitación conocida: corregir una hora mal cargada puede conservar también el bono anterior; esa edición merece revisar el resultado.

## 7. Finanzas

### 38. Gastos, ahorro y categorías

- **Qué hace:** organiza cuánto necesitás para gastos y metas de ahorro; permite categorías propias además de las incluidas.
- **Qué configurás:** nombre, categoría, monto objetivo, prioridad y tipo de fila. Los gastos tienen ajustes de período y reutilización.
- **Ejemplo:** agregás internet como gasto y una computadora como meta de ahorro. Cada uno conserva su objetivo y avance.

### 39. Asignación manual o automática del dinero ganado

- **Qué hace:** distribuye el saldo disponible entre tus filas según sus prioridades, de forma manual o mediante el llenado automático.
- **Qué configurás:** orden de prioridad, importes asignados y la opción de asignación automática.
- **Ejemplo:** priorizás internet antes que ahorro. Al registrar ganancias, el llenado automático puede cubrir primero internet y después avanzar en la computadora.

### 40. Registrar pagos de gastos

- **Qué hace:** guarda pagos reales con fecha y monto. Permite consultar pagos y corregirlos o eliminarlos cuando corresponda. Asignar dinero y registrar que lo pagaste son acciones diferentes.
- **Qué configurás:** el gasto y el importe pagado, en dólares o mediante su conversión disponible.
- **Ejemplo:** reservaste $20 para internet y pagaste $10 hoy. La fila puede reflejar lo asignado y el registro de esos $10 pagados, sin afirmar que ya pagaste todo.

### 41. Períodos, gastos recurrentes y reinicio

- **Qué hace:** organiza presupuestos por sus períodos y permite liberar asignaciones con el reinicio que corresponda. No cobra servicios ni mueve dinero bancario.
- **Qué configurás:** período, reutilización, importe fijo/variable y las acciones de reinicio disponibles.
- **Ejemplo:** terminaste de cubrir un gasto recurrente y lo reiniciás para el próximo período. No se crea por eso un pago bancario nuevo.

### 42. Resumen de Finanzas en Inicio

- **Qué hace:** muestra próximos pendientes y avance sin abrir toda la página de Finanzas.
- **Qué configurás:** las filas y prioridades de Finanzas.
- **Ejemplo:** ves que te falta cubrir un gasto mientras revisás ganancias de hoy. Ese pendiente es el saldo global acumulado de Finanzas; no se reinicia cada mañana.

## 8. Reportes, calendario y pagos

### 43. Reportes de rendimiento

- **Qué hace:** reúne ganancias, metas, minutos, duración de llamadas, huecos, adherencia, tendencias y distribución por horas.
- **Qué configurás:** navegás por las semanas, ciclos o períodos de los controles disponibles; los datos salen de tus registros.
- **Ejemplo:** comparás dos semanas y ves que ganaste más con menos llamadas porque fueron más largas, en lugar de juzgar el día solo por su cantidad.

### 44. Proyección del ciclo

- **Qué hace:** estima el resultado del ciclo actual a partir del ritmo y los datos disponibles. Es una proyección, no una promesa de ingresos.
- **Qué configurás:** horario, metas, ciclo y registros que alimentan el cálculo.
- **Ejemplo:** mirás cuánto podrías completar si mantenés el ritmo. Navegar a otro ciclo no transforma esa estimación en un pronóstico histórico de aquel ciclo.

### 45. Fechas de pago

- **Qué hace:** organiza ciclos de catorce días y muestra cuándo les corresponde el pago según el desfase configurado.
- **Qué configurás:** fecha ancla del ciclo y cuántos días después se paga.
- **Ejemplo:** el ciclo termina un domingo y tu desfase es de varios días. La tool calcula la fecha esperada; no comprueba que Propio haya depositado.

### 46. Calendario de productividad

- **Qué hace:** muestra el año, el detalle mensual y qué días cumplieron o se acercaron a su meta, junto con sus ganancias.
- **Qué configurás:** año/mes consultado, meta anual y desde qué fecha querés considerar el historial.
- **Ejemplo:** abrís octubre para identificar días constantes y revisar un día concreto sin buscarlo entre todas las llamadas.

### 47. Marcar días y agregar contexto

- **Qué hace:** permite indicar Trabajado o Libre y guardar categoría o nota para explicar un día distinto.
- **Qué configurás:** Editar día en el resumen semanal y sus opciones.
- **Ejemplo:** faltaste por enfermedad o hubo un corte de luz. La nota conserva el motivo; cambiar su estado afecta cómo se considera ese día en los indicadores correspondientes.

## 9. Avisos y apoyo durante el trabajo

### 48. Alarmas de turno y descansos

- **Qué hace:** avisa antes del inicio del turno, comienzo de Break o final de una pausa, según lo que activés.
- **Qué configurás:** minutos de anticipación, mensaje y sonido en Avisos. Podés probar el sonido y usar un archivo propio dentro del límite indicado.
- **Ejemplo:** pedís un aviso cinco minutos antes del Break para preparar el cierre de tus pendientes. Un aviso informa; no reemplaza automáticamente todos los botones de tu jornada.

### 49. Sonidos al guardar llamadas

- **Qué hace:** distingue sonidos de llamada finalizada, pegada y manual, con sus controles.
- **Qué configurás:** activar, elegir y probar el sonido de cada tipo, además del volumen correspondiente.
- **Ejemplo:** dejás sonido al cerrar una llamada manualmente, pero la recuperación automática del historial de la extensión actualiza en silencio para no celebrar dos veces el mismo registro.

### 50. Aviso de descanso por minutos productivos

- **Qué hace:** informa cuando acumulás los minutos productivos configurados desde la última pausa real o desde el inicio del turno.
- **Qué configurás:** minutos productivos, minutos de descanso informativos, mensajes de primera vez/repeticiones y sonido.
- **Ejemplo:** después de cierta cantidad de minutos en llamadas aparece tu mensaje de descanso ganado. El aviso no reserva ni descuenta esos minutos por sí mismo.

### 51. Mensaje de apoyo cuando llevás tiempo sin llamadas

- **Qué hace:** muestra un mensaje después de los minutos de trabajo sin llamadas elegidos. Puede funcionar con Logros apagado.
- **Qué configurás:** activar refuerzo, texto, minutos de espera y si se repite mientras seguís sin llamadas, en sus ajustes de Logros.
- **Ejemplo:** elegís veinte minutos y una sola vez: muestra el apoyo al cumplirlos y no insiste en ese mismo tramo. Con repetición, puede volver a avisar por cada nuevo intervalo de veinte minutos aplicable.

### 52. Cierre breve y recuperación de una llamada difícil

- **Qué hace:** permite dejar una reflexión de cómo cerró una llamada y reconocer la recuperación después de una difícil.
- **Qué configurás:** «Celebrar llamadas completadas», «Cierre breve después de cada llamada» y una nota opcional.
- **Ejemplo:** una llamada fue pesada, pero la completaste. Marcás que cumpliste aunque fue difícil y guardás algo que querés recordar. Esa reflexión no cambia su pago oficial.

## 10. Logros y juego opcional

### 53. Activar Logros y la batalla

- **Qué hace:** representa el avance real hacia tu meta mediante el héroe y el monstruo, y guarda progreso de juego.
- **Qué configurás:** Activar Logros, nombre del monstruo, intensidad y sonidos. Está desactivado por defecto para cuentas nuevas.
- **Ejemplo:** al guardar una llamada válida se representa un ataque; el avance contable sigue siendo el de tus llamadas reales.

### 54. Armas y práctica

- **Qué hace:** permite elegir armas visuales y probar ataques con los controles de la batalla o el teclado cuando el foco corresponde.
- **Qué configurás:** el arma y los ajustes de efectos/sonido.
- **Ejemplo:** probás el lanzacohetes por diversión. Disparar de práctica no inventa llamadas, dinero ni XP de productividad.

### 55. XP, niveles, misiones, rachas y récords

- **Qué hace:** reconoce hitos de constancia y progreso con registros de juego; permite revisar logros y récords personales.
- **Qué configurás:** Logros y sus preferencias disponibles; algunas reglas, como considerar días libres en rachas, tienen su ajuste.
- **Ejemplo:** completás actividad válida durante varios días y revisás la racha y los hitos. Repegar duplicados no debe servir para cobrar otra vez el mismo premio.

### 56. Cofre de la meta diaria

- **Qué hace:** al cumplir la meta del día actual permite obtener su premio, con un registro que evita reclamarlo varias veces por recargar.
- **Qué configurás:** la meta diaria y Logros; abrís el cofre cuando corresponda.
- **Ejemplo:** llegás a tu meta y abrís el cofre. Recargar la tool no genera un segundo cofre del mismo día. Si una corrección deja la meta sin cumplir, el progreso y premio se reconcilian.

### 57. Equipo, trofeos y bestiario

- **Qué hace:** conserva accesorios desbloqueados, distinciones y criaturas derrotadas; permite equipar elementos disponibles.
- **Qué configurás:** elegís el equipo que querés usar dentro de lo desbloqueado.
- **Ejemplo:** obtenés un accesorio y lo equipás al héroe. Cambia su presentación, no tu tasa de pago.

### 58. Premios personales

- **Qué hace:** permite crear premios y ofrecerlos en momentos seguros de la jornada, acumular hitos y registrar si los realizaste o guardaste para después.
- **Qué configurás:** premio, condición para ganarlo, frecuencia, acumulación, máximo diario y si ofrecerlo en Break, Lunch o fin de turno; duración/costo opcionales.
- **Ejemplo:** cada cinco llamadas ganás un té para el próximo Break. La tool lo recuerda; no compra el té ni verifica que lo hayas tomado. El costo es informativo.

### 59. Duelo durante una pausa o fuera del turno

- **Qué hace:** ofrece una partida arcade opcional con ataques y controles propios, separada de los registros laborales. Solo permite jugar en pausa o fuera de turno.
- **Qué configurás:** entrás al duelo desde los controles de la batalla cuando esté disponible y usás sus controles de juego.
- **Ejemplo:** durante tu Break jugás una partida. Sus puntos y vidas no se convierten en ingresos, llamadas ni productividad; al volver al trabajo se aplica la protección de su estado.

### 60. Premio del ciclo completado

- **Qué hace:** al cerrar un ciclo cuya meta se cumplió, puede ofrecer una elección de premio de juego y registra lo reclamado para evitar repetirlo.
- **Qué configurás:** meta del ciclo y Logros; elegís entre las opciones disponibles cuando aparece el premio.
- **Ejemplo:** cumpliste la meta del ciclo anterior y elegís XP o un accesorio disponible. Ese premio no es dinero adicional pagado por Propio.

## 11. Apariencia y comodidad

### 61. Temas, paletas e idioma

- **Qué hace:** conserva claro/oscuro, Original y siete paletas, además de Español o English.
- **Qué configurás:** Temas y colores en el menú; idioma en el selector o en Tu perfil.
- **Ejemplo:** pasás de oscuro en la mañana a claro en el teléfono. Tus llamadas, notas y ganancias siguen siendo las mismas.

### 62. Reloj, fecha, saludo y vista angosta

- **Qué hace:** muestra hora y fecha junto al saludo, adapta el espacio disponible y conserva los controles del día en una presentación compacta. El texto motivador puede variar.
- **Qué configurás:** nombre y emoji del perfil, apariencia y tamaño de la ventana. El reloj también permite alternar su visibilidad con su control.
- **Ejemplo:** dejás el tracker en una ventana angosta a la derecha y seguís viendo la hora y el día activo sin dedicarle toda la pantalla.

### 63. Vista original de Propio

- **Qué hace:** permite recuperar opcionalmente la barra nativa de Propio que sigue incluida en su página. La barra oscura añadida por la extensión se retiró del puente unificado.
- **Qué configurás:** «Usar la vista original de Propio». Se aplica con un solo portal y cuando esté Offline, sin una llamada activa.
- **Ejemplo:** activás la opción y volvés a ver la barra original con Calls, Minutes, Pay e iconos. Desactivarla permite volver a la presentación habitual de Propio.

### 64. Escritorio de trabajo al iniciar Windows

- **Qué hace:** en tu PC configurada, abre Chrome con el perfil Jonathan y organiza las páginas de trabajo; abre también el archivo de notas que elegiste.
- **Qué configurás:** es la preparación local que dejamos instalada: Propio y app.useinterpreter.com a la izquierda; tracker y Linguee en la ventana derecha, con notas debajo.
- **Ejemplo:** iniciás Windows y aparece tu espacio de trabajo. También podés abrir «Jonathan - Chrome» del escritorio para abrir Chrome y ese mismo archivo de notas. Abrir las páginas no concede disponibilidad antes de tu horario. Ya confirmaste que el arranque funcionó después de reiniciar; esta preparación no se instala sola al entrar desde otra PC.

## 12. Cuenta, guardado y respaldo

### 65. Cuenta y perfil

- **Qué hace:** permite entrar con Google y personalizar los datos de perfil disponibles. El acceso público por correo o usuario y contraseña está deshabilitado actualmente.
- **Qué configurás:** cuenta, nombre, emoji y usuario en sus formularios.
- **Ejemplo:** entrás desde otro navegador con la misma cuenta para recuperar tus registros guardados en la nube.

### 66. Guardado local y sincronización

- **Qué hace:** conserva datos en el dispositivo y sincroniza la cuenta cuando hay conexión. Muestra problemas de guardado y pide decidir ante una divergencia real entre versiones.
- **Qué configurás:** tu sesión y conexión; ante un conflicto elegís la versión que querés conservar.
- **Ejemplo:** hiciste cambios distintos en dos dispositivos. La tool puede pedirte cuál conservar, en vez de inventar una mezcla. El modo sin conexión tiene límites y no garantiza que la extensión pueda automatizar disponibilidad.

### 67. Respaldo completo JSON

- **Qué hace:** exporta e importa un respaldo de los datos de la tool, incluidos ajustes y estados compatibles.
- **Qué configurás:** Exportar o Importar JSON en Ajustes; revisás las confirmaciones antes de reemplazar datos.
- **Ejemplo:** guardás un respaldo antes de una limpieza grande y lo conservás como una copia adicional. Un CSV contable no reemplaza ese respaldo.

### 68. Reportes CSV y PDF

- **Qué hace:** exporta información contable del período elegido para consultar o compartir fuera de la tool.
- **Qué configurás:** período o fechas Desde/Hasta y formato.
- **Ejemplo:** exportás las llamadas y totales de un ciclo para comparar con tu pago. Es un reporte en dólares; no es un archivo para restaurar toda tu cuenta.

### 69. Reinicios y borrados

- **Qué hace:** ofrece acciones para limpiar un día o los datos que indica cada opción, con confirmaciones y protección frente a llamadas pendientes.
- **Qué configurás:** elegís expresamente la acción y revisás su alcance antes de confirmar.
- **Ejemplo:** borrar un día no es lo mismo que cerrar el turno. Si solo querés terminar de trabajar, usás Finalizar shift para conservar los registros.

### 70. App instalable y recuperación

- **Qué hace:** la PWA permite abrir la tool como aplicación y conserva el shell necesario para su carga. El sistema de guardado incluye mecanismos de recuperación frente a fallos.
- **Qué configurás:** instalación desde el navegador y las opciones de recuperación cuando la tool las ofrece.
- **Ejemplo:** abrís la tool desde su icono. Para sincronizar y para coordinar disponibilidad con Propio seguís necesitando las condiciones de conexión y sesión correspondientes.

### 71. Estado de conexión y actividad de la extensión

- **Qué hace:** muestra vinculación, filas observadas, eventos pendientes y actividad reciente. Los detalles técnicos ayudan a revisar fallos.
- **Qué configurás:** abrís Estado de conexión o Detalles para soporte cuando lo necesitás; no hace falta vigilar los contadores al trabajar.
- **Ejemplo:** ves cientos de solicitudes observadas: son actividad habitual de la página, no cientos de llamadas ni errores por sí solos. El estado útil es si reconoció la sesión, si pudo registrar y si hay algo pendiente de revisión.

### 72. Borrar la cuenta

- **Qué hace:** elimina la cuenta y sus datos activos del servicio. Es una acción distinta de cerrar sesión, terminar turno o limpiar una vista local.
- **Qué configurás:** la acción Borrar cuenta y datos en Ajustes exige confirmar; exportá antes tu JSON si querés conservar una copia.
- **Ejemplo:** decidís dejar de usar el servicio y eliminar tu cuenta. También se eliminan sus llamadas, turnos y finanzas activos; las copias históricas cifradas se retiran por su rotación, con retención prevista de 31 días.

## 13. Ayuda y apoyo al proyecto

### 73. Guías y apoyo voluntario

- **Qué hace:** ofrece explicaciones de uso y enlaces de ayuda; el pie incluye Invítame un café como apoyo voluntario al desarrollo.
- **Qué configurás:** elegís el contenido que querés consultar o abrís el enlace externo de apoyo.
- **Ejemplo:** revisás cómo importar llamadas antes de hacerlo. Si decidís apoyar por Ko-fi, ese pago se realiza fuera de la tool y no se registra como gasto ni desbloquea funciones por sí solo.

## Una mañana completa con estas funciones

1. Encendés la PC a las 6:00. Se abren tu escritorio de Chrome y tus notas.
2. Propio ya está autenticado: queda registrada la conexión. Tu horario empieza a las 6:30 y todavía no hay trabajo anticipado acreditado por una llamada.
3. A las 6:30, con «Al comenzar mi turno» activo y sin bloqueos, la extensión pulsa Start Calls. Vos aceptás la llamada que elijás.
4. La llamada termina. Con espera de tres minutos, la extensión puede pulsar Stop Calls y usa el ACW de la tool para decidir cuándo volver a pulsar Start Calls.
5. Si cuando recibe el ACW ya va por 00:50, espera los 02:10 restantes. No vuelve a cero por su cuenta.
6. Empezás Break: no se inicia disponibilidad durante esa pausa. Al terminarlo, tu opción de regreso determina si vuelve automáticamente.
7. Pulsás Stop Calls manualmente porque querés detener los automatismos. Se recuerda la pausa, pero el registro de llamadas continúa.
8. Al cargar Propio el historial oficial, la tool completa o corrige sus llamadas en silencio. Después revisás ganancias, metas y Finanzas con esos registros.
9. Finalizás el turno. El cierre bloquea nuevos inicios automáticos de ese turno y conservás la jornada para Reportes y Calendario.

## Cosas que todavía no hace

- No acepta, rechaza ni cuelga llamadas por vos.
- No confirma las reglas de Propio para redondear segundos ni garantiza su pago.
- No coordina los iniciadores globalmente entre dos PCs ni dispone de un reloj servidor independiente para validar cambios arbitrarios de hora.
- No obtiene promociones de Higher Rate de tu correo automáticamente.
- No compra premios, paga gastos ni comprueba depósitos bancarios.
- Abrir Chrome y acomodar ventanas es una configuración local de tu PC; el encendido automático de la PC lo configurás vos.

## Usar otras pestañas durante el turno

Podés dejar el tracker abierto y consultar Linguee u otra pestaña. La extensión
protege el tracker, Propio y UseInterpreter contra el descarte automático por
memoria y añade una revisión de respaldo cada 30 segundos. Primero solicita el
ACW actual; mantiene las prioridades de horario, Break/Lunch y Stop manual.

No tenés que configurar un contador nuevo. Por ejemplo, si dejaste ACW en 00:50,
el umbral sigue siendo 03:00 aunque estés mirando Linguee. Una comprobación puede
llegar después del umbral: no se garantiza exactitud al segundo en segundo plano.
Si Chrome congela la página o la PC entra en suspensión, la extensión no inventa
un ACW actualizado ni pulsa Start Calls con una lectura antigua.
