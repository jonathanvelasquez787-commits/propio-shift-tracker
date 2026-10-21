# Presentación aprobada de la tool y el popup

Entrega publicada: web 635.0.0, PR #97 y producción del mismo commit verificada.
Extensión 2.3.1 instalada con respaldo y recarga confirmada por el propietario.

## Qué cambia y dónde

- **Logros:** XP diario y nivel como datos principales, estado del cofre,
  accesos a equipo y premios. Las reglas y la explicación de cero XP se consultan
  al desplegarlas. El nivel y el progreso salen del modelo de juego existente.
- **Avisos, botón de campana:** progreso de productividad y volumen al comienzo;
  turno/descansos, llamadas y configuración de productividad agrupados. Se
  conservan los 73 identificadores de controles y ayudas del contenido original.
- **Restaurar JSON, Ajustes:** comparación de llamadas actuales y entrantes,
  alcance de ajustes y copia previa visibles; detalle de sincronización plegado.
  Restaurar todavía exige confirmar y conservar la copia anterior.
- **Disponibilidad, Inicio:** estado de la extensión y preparación consultable.
  Por petición posterior del propietario, el contador de espera y «Próximo intento
  de disponibilidad» comparten una fila compacta. Una lectura antigua, pausa o
  desconexión no presenta una cuenta regresiva válida.
- **Ganancias, desglose del día/ciclo:** total destacado y tres componentes:
  base, estimación en vivo y Higher Rate. Moneda secundaria debajo del importe.
- **Higher Rate, revisión de una ventana:** bono y conteos primero, reglas
  consultables y comparación antes/después al corregir. No cambia el cálculo ni
  la separación entre limpiar el historial conservando bonos y recalcular.
- **Reportes, proyección:** estimación del ciclo y ritmo necesario separados.
  Los días naturales de la proyección y los días laborales del ritmo mantienen
  sus cálculos existentes. Los supuestos se consultan en el detalle.
- **Popup de Chrome:** eventos pendientes destacados, ayuda por temas y pausa
  de disponibilidad fuera de las opciones adicionales. Los eventos vencidos se
  conservan para revisión. Es una interfaz distinta de la tool web.
- **Horario, confirmación:** antes/después, días afectados y bloques consultables.
  Se conservan el rechazo de cambios concurrentes y los registros reales.
- **Finanzas, aplicar plan como meta:** meta actual/propuesta, minutos productivos
  y cálculo desplegable. Aplicar una meta no reserva dinero ni registra pagos.
- **Ajustes, borrar cuenta:** conteos del estado local al abrir Ajustes, acceso
  al exportador JSON existente y alcance consultable. La retención prevista y el
  carácter irreversible siguen visibles; la confirmación y el endpoint no cambian.

## Resguardos y comprobación

Los resguardos de propietario, revisión, guardado rechazado y confirmación se
conservan. El editor de premios personales además rechaza una cuenta o revisión
de premios diferente de la que abrió el formulario. El contexto de un cofre
ajustado se conserva al normalizar y recargar, sin conceder otra recompensa.

La suite completa ejecutó 947 pruebas correctas. Los recorridos de navegador usan
una cuenta ficticia y backend local: ambos idiomas, temas claro/oscuro y anchos
320, 390 y 1200 px. Comprueban apertura de detalles, cancelación sin cambios,
filtros y accesos, volumen cero y disponibilidad con lectura antigua o pausa.
Las capturas de la tool corresponden al código compilado. El popup usa su
HTML/CSS/JS reales con API de Chrome simulada; eso no certifica una sesión humana
de Propio ni sustituye la recarga de la extensión instalada.

La comprobación de módulos, conexiones de controles, traducciones y criterios de
producción es independiente de la inspección visual. Esta entrega no cierra por
sí sola las veinte mejoras funcionales que siguen abiertas en el plan integral.
