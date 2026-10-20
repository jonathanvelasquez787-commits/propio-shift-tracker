# Jornada, pausas y horarios

Web 631. Los controles pertenecen a la tool; la extensión conserva su versión
2.3.0 y no requiere otra instalación para este bloque.

## Cerrar o volver al turno

Finalizar turno presenta lo que cambiará: llamada activa que se intentará
guardar, pausa que se cerrará e iniciadores que dejan de actuar. Conserva las
llamadas anteriores y no cierra sesión en Propio. Cancelar no cambia la jornada.
Una llamada pendiente de recuperación debe resolverse antes del cierre.

Si volvés dentro de los cinco minutos del cierre, elegís:

- **Continuar el mismo turno:** conserva la entrada anterior y marca el hueco
  como interrupción accidental.
- **Iniciar otra sesión:** conserva el tramo cerrado y registra una entrada nueva.

La elección no se aplica al abrir el diálogo. Un cambio de actividad, cuenta,
fecha seleccionada o datos guardados invalida la confirmación. Pasados cinco
minutos ya corresponde una sesión nueva, según la regla existente.

Ejemplo: cerraste a las 15:00 por error y volvés a las 15:02. Continuar conserva
la entrada de las 8:00. Otra sesión conserva esa jornada cerrada y empieza a las
15:02. Si falla el guardado, se conserva la situación anterior sin recompensa.

Cerrar una jornada durante Break/Lunch guarda su cierre junto con el turno.
También al iniciar una llamada durante una pausa: se prepara la transición y
solo después de guardar se apaga su alarma y se reconoce el progreso.

## Consultar el día

El selector distingue **Hoy** de **Historial**. Su botón vuelve a Hoy; consultar
otra fecha no habilita los controles para alterar el turno de esa fecha.

«Ver jornada: ACW, pausas y adherencia», en Ganancias, abre tarjetas con:

- ACW actual frente al acumulado del día seleccionado. El acumulado usa los
  huecos clasificados como ACW; Break/Lunch/Otro no se convierten en ACW.
- Meta general, excepción de fecha o meta histórica. Los planes nuevos aplicados
  desde Finanzas guardan esa procedencia; no se adivina para configuraciones viejas.
  La meta del ciclo actual distingue personalizada de suma de días laborables.
- Adherencia: minutos evaluados, dentro del plan/gracia, fuera del plan y causas
  y puntos de control plegados. Sin minutos medibles se explica el cálculo alterno.
- Pausas planeadas y registradas o en curso, con tiempos y duración real. Son una
  consulta del estado al abrir; no se guardan otros registros por consultarla.

La meta máxima de ACW es un objetivo del acumulado diario. No cambia los minutos
de espera entre llamadas de la extensión ni provoca Start Calls.

## Revisar un horario antes de aplicar

Guardar día, copiar a Lunes–Viernes o Sábado–Domingo y desplazar el turno muestran
alcance y horas antes de aplicar. El resumen identifica todos los destinos; el
antes/después de cada día, los bloques y el ejemplo de llegada tarde quedan plegados.
La plantilla se distingue de una semana específica. El horario real de llamadas y
pausas guardadas no se reescribe al editar el plan.

Copiar desde un borrador de sábado a Lunes–Viernes cambia esos cinco destinos.
El sábado solo cambia al usar Guardar día. Esto corrige que antes se guardaba
también el origen aunque el diálogo prometía limitarse a los destinos.

Desplazar todo el turno modifica el borrador después de confirmar la vista previa;
todavía requiere Guardar día. La política de llegada tarde conserva el final o
desplaza el plan; la vista previa incluye el ejemplo de 30 minutos de atraso.

Los bloques se ordenan desde el inicio de la jornada. Un turno 22:00–06:00 sitúa
00:30 después de 23:45; el editor y la vista previa indican el día siguiente.
Editar 23:45–00:15 muestra 30 minutos inmediatamente, sin cambiar registros reales.

## Validación

Pruebas de confirmación, doble aceptación, cambios de actividad, copia de días,
medianoche, procedencia de meta y rechazo transaccional. Recorridos ES/EN,
claro/oscuro y cuatro anchos con cuenta ficticia: cancelar/cerrar, cierre de
pausa, continuar/nueva sesión, alcance de copia, guardar y recargar. Fallo de
cuota y edición nocturna comprobados por separado. No se modifican datos reales
ni se provocan llamadas para verificar estas funciones.

El detalle crece de 65 a 80 KB de presupuesto revisado por sus nuevas vistas;
los límites iniciales de la app, boot y traducciones se conservan.
La comprobación local contabiliza también los 40 caracteres del identificador
de producción: el primer preview reveló una diferencia de 17 bytes que el build
local anterior no incluía. La regresión y el build con SHA real cubren ese caso.
