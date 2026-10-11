# Auditoría de controles — 11 de octubre de 2026

La auditoría combina revisión de las conexiones de todos los controles,
regresiones de las acciones y recorridos de navegador con una cuenta ficticia.
No se borraron ni reemplazaron los datos de la cuenta del propietario.

## Correcciones

- Calendario: guardar/restaurar metas anuales y fechas de historial conserva
  el valor previo y el editor abierto cuando el navegador rechaza el guardado.
- Logros: nombre, reinicio, equipamiento, cofres y recompensas del ciclo
  anuncian éxito sólo después de persistir; permiten reintentar sin premio doble.
- Premios físicos: crear, editar, borrar, cambiar, reclamar y guardar cierres
  conservan los valores previos si la escritura falla. Sus interruptores también
  revierten el cambio rechazado.
- Higher Rate: la purga restaura ventanas, bonos congelados y asignaciones de
  Finanzas ante rechazo; la reconciliación y los avisos esperan el guardado.
- Llamadas: iniciar una llamada o turno respeta días libres y la selección
  explícita Trabajado/Libre del resumen semanal. Finalizar una llamada activa
  permanece permitido; los controles históricos siguen bloqueados.
- Tema claro: iniciar llamada usa rojo, incluso con paletas personalizadas.
  La paleta ya no fuerza los colores del botón a los del botón primario.
- Logros: Gamificación, Refuerzo positivo, Mis premios y Reiniciar progreso
  aparecen debajo de Activar Logros; se conserva su estructura desplegable.
- Cierre breve: las llamadas pegadas del día actual se encolan al cerrar el
  importador, sin superponer modales. Duplicados, filas eliminadas y llamadas
  descartadas no abren otro cierre. Apagar el cierre cancela la cola.
  Las llamadas manuales actuales también muestran el cierre.
- Reiniciar día: limpia cierres, recuperaciones, premios pendientes/realizados,
  recibos de gamificación y la acumulación atribuible a ese día. Conserva
  otros días, la configuración de premios y acumulaciones retenidas por límites.
  La confirmación informa que incluye la gamificación.
- Sync: espera 250 ms desde el último cambio y un máximo de 1500 ms de edición
  continua. Evita la segunda subida del debounce después de guardar al ocultar
  la pestaña y conserva cambios nuevos ocurridos durante una subida.
  Un error transitorio reintenta a los 5 segundos, luego 10, 20 y como máximo
  cada 30 segundos. No fuerza conflictos ni sigue subiendo tras cerrar sesión.

## Horario y meta

El horario predeterminado conserva 06:00–14:00 y metas por bloque de
120, 120, 60 y 60 minutos; meta diaria 360 minutos.
La consulta de sólo lectura de la nube ya encontró 60 minutos en el último
bloque de la cuenta revisada, sin excepciones de semana/historial con otro
valor en ese bloque. No se aplicó una migración que borrara metas personalizadas.
En navegador se cambió el último bloque de 60 a 55, se guardó, se cambió de
día y se comprobó 55; se restauró 60 mediante el mismo control.

## Evidencia y alcance

- Inventario de `app.html`: 329 controles estáticos: 225 botones, 15 summaries,
  67 inputs, 18 selects y 4 textareas. Incluye controles de modales.
- Wiring, contratos y matriz: 17 áreas, 56 módulos y 51 suites. Se revisan
  también controles creados en tiempo de ejecución; el inventario estático
  no incluye todos los elementos generados por JavaScript.
- Suite completa: 500 pruebas. Incluye rechazo/reintento, aislamiento de datos,
  migraciones/RLS, contabilidad, importaciones y conflictos de sincronización.
- Navegador: navegación de todas las páginas principales; edición/guardado
  de horario y metas; nota de día laboral; iniciar y guardar llamada en vivo;
  agregar llamada manual; importar dos filas y guardar sus cierres consecutivos;
  iniciar/finalizar Break y Lunch; finalizar/continuar turno; edición de meta
  anual y fecha de historial; crear/editar gasto; crear/ganar/reclamar premio;
  guardar nombre del monstruo; avisos, prueba de sonido y selector de paleta;
  exportar JSON/CSV; reiniciar día; recargar; importar respaldo JSON y recargar.
- Servidor de ensayo tras reiniciar: cero llamadas, premios pendientes y
  realizados, manteniendo meta 360 y nombre del monstruo. Pantalla tras
  recarga: cero cierres, recuperaciones y llamadas. Restaurar el JSON recuperó
  siete llamadas y su evidencia positiva, confirmado tras otra recarga.

Estos recorridos se ejecutaron contra un backend local controlado; no acreditan
latencia real de todas las redes. El texto «Guardado hace 2 min» indica la edad
del último guardado confirmado, no dos minutos de demora. Los 250 ms son la
espera de agrupación, a la que se suma el tiempo de red/servidor.

La revisión de 329 controles no significa haber pulsado cada combinación de
los 329: controles destructivos de cuentas reales, compras externas y percepción
física del audio no se ejecutaron. Sus contratos disponibles se revisan por
código y pruebas. El informe registra evidencia concreta y no promete ausencia
absoluta de errores.

La publicación requiere CI del commit del PR, revisión sin hilos pendientes,
despliegue READY y coincidencia del SHA con `/api/health`; se verifican al
publicar. Google permanece como único acceso y Email/SMTP sigue deshabilitado.
