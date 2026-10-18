# Auditoría profunda de la tool y extensión

Trabajo iniciado el 15/10 y cierre de verificaciones el 17/10/2026. App 618 y
extensión 2.2.6. Activado por la petición explícita «haz una auditoria profunda».
Parte de main `6b001ae3238a60f0133228b1e4ea591728646060`, sin modificar datos reales.

## Fallos reproducidos y corregidos

1. **Una fila histórica de cero minutos adelantaba el comienzo laboral.**
   `workStartForConnection` aceptaba intervalos con inicio igual al final como
   evidencia de trabajo anticipado. Ahora exige duración positiva en registros
   guardados; una llamada activa confirmada cuenta desde su conexión, incluido
   ese primer instante. Conserva la fila cero, pago y timestamps originales.

2. **Un regreso de pausa podía sobrevivir hasta otro horario.** Al desaparecer
   el tracker se retenía un regreso terminado; el plan nuevo podía reutilizarlo.
   `updatePlan` descarta el regreso que queda fuera de la ventana nueva y cancela
   su petición de cierre no entregada. No cancela registros de llamadas.

3. **Extender una pausa conservaba el cierre automático anterior en la cola.**
   Cambiar `endsAt` no retiraba su petición bloqueada. Al cambiar la duración o
   reemplazar la pausa se cancela la petición anterior y se reconstruye el
   seguimiento. El nuevo final no hereda `requestId` ni `endedAt` antiguos.

4. **El puente publicaba el inicio/fin originales con bloques desplazados.**
   El modo de llegada tardía desplazaba descansos, pero la extensión recibía el
   límite anterior del turno. El plan usa los mismos límites de sesión y la
   misma precisión de minuto que el horario mostrado. El modo anclado conserva
   sus límites. Se prueba también un inicio reconciliado distinto del timestamp
   bruto de la conexión.

5. **Una aceptación atrasada rechazada podía consumir la primera llamada de
   otro plan.** El reductor ignoraba una respuesta de red vieja, pero el worker
   marcaba igualmente `doneFor` y podía consumir el regreso de pausa. Solo una
   transición real `call-start` consume esas preparaciones.

6. **Los bloques de un turno nocturno perdían su orden y fecha.** Ordenarlos
   por hora de reloj situaba 01:00 antes de 22:00, y restar horas sin fecha podía
   producir duración cero. Los slots derivados conservan minutos relativos al
   día del plan; adherencia minuto a minuto, estadísticas, emparejamiento de pausas, checkpoints y estados
   de bloques usan el día correspondiente. El desplazamiento tardío calcula
   la diferencia entre fechas completas, incluido llegar después de medianoche.
   Los registros persistidos no se reescriben para conseguirlo. También se
   corrigen el rango de adherencia que quedaba en cero, su indicador después de
   medianoche, los avisos de pausa y el denominador del progreso del turno.

7. **Los botones de llamadas recortaban texto en móvil.** El layout horizontal
   conservaba icono, título y subtítulo en la misma fila dentro de tres columnas.
   Se reutiliza su composición vertical existente para mostrar también el
   contador y los subtítulos completos. Se comprueban los rectángulos de cada
   línea de texto dentro de su botón; medir solo el ancho de la página no bastaba.

## Casos adicionales cerrados durante la revisión

- El día contable anterior conserva la sesión viva cuando coincide con el
  inicio del turno todavía abierto. No inventa una salida ni penaliza pausas
  futuras; los registros huérfanos históricos conservan su comportamiento.
- El editor permite guardar horarios como 22:00–06:00 y bloques que cruzan
  medianoche; normaliza duración, orden de sugerencias y validación de límites.
  Sigue rechazando horas iguales, solapamientos y bloques fuera del turno.
- Un bloque ya transcurrido después de salir temprano se muestra Incompleto,
  en lugar de permanecer Próximo. Se comprueba en ES/EN y en la app compilada.
- Si llamadas recientes producen un turno estimado de hoy, una sesión explícita
  ya cerrada de ayer no desvía hacia ayer sus avisos de Break/Lunch.

## Regresiones y controles automáticos

- Base: 786 pruebas. Resultado final: **798 pruebas correctas, cero fallos y
  cero omitidas**. Doce casos nuevos, más dos aserciones en el caso existente
  que compara el plan real con el horario desplazado.
- Nuevos casos en `connection-work-time`, `propio-bridge`, `propio-acw-plan`,
  `domain-language-render` y `reinforcement-schedule`; ampliación de
  `super-audit-accounting`. Todos ejecutan las funciones de producción.
- Se conservan las simulaciones contables de 31 días con 161 comprobaciones,
  el ledger mensual de pagos y 42 días que cruzan febrero bisiesto. También
  pasan las suites de guardado rechazado, cuota, aislamiento de cuenta,
  sincronización, callbacks atrasados, Higher Rate, Finanzas y juego.
- Build: 2.260 textos ES/EN, contratos y ciclos de 38 módulos, wiring de ids,
  modales, listeners y helpers. Matriz ampliada: 22 criterios, 67 suites y 73
  módulos fuente. App y ambas extensiones compilan sin sourcemaps públicos.
- Inventario AST: 64 archivos JS, 2.595 funciones, 308 lugares de registro de
  listeners y 403 controles/enlaces estáticos entre app, popup y organizador.
  Sin llamadas directas potencialmente no declaradas según el inventario.
  Es un control estructural conservador, no una prueba de todas las ramas.
- Escaneo del árbol e historial: 1.846 archivos/blobs, sin hallazgos.
  `pnpm audit --audit-level high`: sin vulnerabilidades conocidas.
- El bundle final de app mide 801.666 bytes. Se revisó el aumento necesario
  para estas correcciones y se ajustó únicamente su presupuesto de 800.000 a
  802.000 bytes; los otros límites permanecen. El build conserva la comprobación.

## Mes de uso en Chrome aislado

Del 1/9 al 2/10/2026: **32 días**, alternando 390 y 1280 px y llegada manual
temprana dentro del margen, puntual y tardía. Controles reales del bundle:
iniciar/terminar turno, iniciar/terminar llamada en vivo, agregar llamada manual,
Break, Lunch y pegar dos veces la misma fila oficial.

Resultado: **96 llamadas, 736 minutos, $88.32 de pago base y 64 pausas**. Un
ledger independiente compara cantidad, minutos y centavos en cada checkpoint.
Treinta recargas diarias y dos reaperturas tras interrupciones de la prueba
conservan los registros. La segunda reapertura recuperó el estado mientras se
reconstruía la carpeta del servidor local; no se atribuye ese timeout a un fallo
de guardado de producción. Resultado final sin errores JS ni overflow de raíz.

La cuenta, autenticación, reloj y RPC de nube son ficticios. El SDK, boot,
interfaz y handlers de la tool son reales. Se bloqueó el tráfico externo para
que las pruebas no escribieran en la cuenta del usuario. No equivale a dos
dispositivos Google reales escribiendo simultáneamente en Supabase alojado.

## Interfaz y ajustes en el bundle

Siete páginas principales, cuatro anchuras (320/390/768/1365 px), ES/EN y
claro/oscuro: 112 vistas navegadas, sin errores JS ni overflow de raíz. Se
comprueban también cambio de moneda principal, nombre, sonido de llamada,
desplazamiento del horario completo, alta de gasto y texto/minutos/repetición
del aviso sin llamadas. Ajustes y llamadas originales permanecen al reabrir.

Chrome compilado comprueba además tres momentos nocturnos (antes y después de
medianoche con turno abierto, y cerrado al día siguiente): orden de tres bloques,
duración de tres horas del primero, adherencia 90/90 y 150/150 en vivo, y 180/180
y 285/285 al cerrar. Agrega un bloque en el editor, guarda 22:00–06:00 con una
meta modificada y conserva sus duraciones al reabrir. Sin errores ni overflow.

## Disponibilidad y popup compilados

El flujo de Chrome con content script compilado y worker real comprueba:
conexión anticipada, inicio a la hora del turno, Stop tras Wrap Up, ACW observado
desde 00:50, regreso al superar los tres minutos después de reiniciar el worker,
Stop manual persistente y Start manual que reanuda. Sin errores JS.

El popup compilado comprueba elección y rechazo de guardado de vista original,
ausencia de la barra antigua, pausa visible con opciones cerradas, persistencia
al recargar y opciones abiertas/cerradas en ambos temas. Doce comprobaciones,
sin errores ni overflow.

Las capturas y JSON de recorridos están en outputs del espacio de trabajo;
los logs detallados quedan en work, fuera del repositorio público. La evidencia
de publicación, CI y SHA alojado se conserva separadamente del informe local.

## Guía de funciones

`guia-practica-tool-y-extension.md` reemplaza el inventario superficial por
73 funciones agrupadas: qué hacen, qué se configura y un ejemplo por función.
Incluye prioridades, una mañana completa, diferencia entre conexión/trabajo,
ACW actual/acumulado y límites que no deben presentarse como automatismos.

## Límites de la comprobación

No se provocaron llamadas, se aceptaron ofertas ni se cambió el historial del
usuario para probar. La confirmación previa del usuario de llamadas automáticas
y arranque tras reiniciar se conserva; no se atribuye una nueva prueba física.
La conexión oficial sigue bloqueando páginas internas de Chrome: no se elude
ese bloqueo para recargar la extensión.

No certifica audibilidad de hardware, gestos de teléfono físico, una nueva
instalación PWA móvil, todas las variantes nativas de llamada/Save, cada control
individual mediante clic, OAuth Google humano, cron alojado ni concurrencia
entre dos PCs. Las migraciones/RLS se comprueban mediante sus suites locales;
no se modificó el esquema alojado. Se conserva la reconstrucción diaria de
sesiones nocturnas con el alcance reducido documentado en instrucciones.md.

Siguen externos o fuera del alcance implementado: regla oficial de segundos y
pago de Propio, procesamiento del nombre en Google, exclusión global entre PCs
y reloj servidor independiente. Ninguna de las correcciones añade autoaceptación,
pagos, compras ni acceso al audio.

## Antecedentes consolidados · 18/10/2026

Los diez informes anteriores se consolidan aquí para reducir archivos del árbol
actual. Cada enlace conserva el original completo en una revisión inmutable de
Git, incluidos sus resultados, límites y evidencia fechada. Las correcciones y
regresiones siguen en el proyecto; esta consolidación no repite esas auditorías.

- **[30/09 · Auditoría profunda](https://github.com/jonathanvelasquez787-commits/propio-shift-tracker/blob/6b10046837a821ef9f37cbcebb4eed31c3ad4106/docs/auditoria-profunda-2026-09-30.md)**: Persistencia atómica de llamadas y premios, cierres mensuales con zona horaria, respaldos y exportaciones extensas, y protección frente a acuses de nube atrasados.
- **[04/10 · SEO](https://github.com/jonathanvelasquez787-commits/propio-shift-tracker/blob/6b10046837a821ef9f37cbcebb4eed31c3ad4106/docs/seo-audit-2026-10-04.md)**: HTML por idioma, canonical/hreflang, redirecciones y recursos públicos. Las mediciones de laboratorio no acreditan posiciones en Google; indexación y cuotas de Search Console dependen del servicio externo.
- **[08/10 · Auditoría profunda](https://github.com/jonathanvelasquez787-commits/propio-shift-tracker/blob/6b10046837a821ef9f37cbcebb4eed31c3ad4106/docs/auditoria-profunda-2026-10-08.md)**: Paginación de nube, revisión coherente de estado y llamadas, confirmaciones reales de escritura, protección de pestañas antiguas y precisión de importes.
- **[08/10 · Ampliación](https://github.com/jonathanvelasquez787-commits/propio-shift-tracker/blob/6b10046837a821ef9f37cbcebb4eed31c3ad4106/docs/auditoria-ampliada-2026-10-08.md)**: Arranque y conflictos con control de concurrencia, cuenta nueva con revisión observada, copia offline solo del propietario y manejo de caché PWA ante fallos de red/cuota.
- **[09/10 · Auditoría super profunda](https://github.com/jonathanvelasquez787-commits/propio-shift-tracker/blob/6b10046837a821ef9f37cbcebb4eed31c3ad4106/docs/auditoria-super-profunda-2026-10-09.md)**: Veinte grupos en premios revocables e idempotentes, correcciones oficiales, finanzas, identidad, bajas de llamadas, revisiones de nube, cachés y contrato de login. Simulaciones y PostgreSQL local no equivalen a una sesión humana alojada.
- **[11/10 · Auditoría super profunda](https://github.com/jonathanvelasquez787-commits/propio-shift-tracker/blob/6b10046837a821ef9f37cbcebb4eed31c3ad4106/docs/auditoria-super-profunda-2026-10-11.md)**: Ocho grupos en revisiones de pestañas, cambios de tarifa y metas, validación numérica y de respaldos, y rechazo de falsos éxitos al guardar/restaurar. Evidencia pública y alojada conserva su fecha original.
- **[11/10 · Controles](https://github.com/jonathanvelasquez787-commits/propio-shift-tracker/blob/6b10046837a821ef9f37cbcebb4eed31c3ad4106/docs/button-audit-2026-10-11.md)**: Rollback de calendario, metas, premios y Higher Rate; guardas de días libres, controles en tema claro y cierres deduplicados. Sincronización agrupada y reintentos con espera conservan conflictos. El inventario estático no acredita clic en cada control.
- **[12/10 · Auditoría profunda](https://github.com/jonathanvelasquez787-commits/propio-shift-tracker/blob/6b10046837a821ef9f37cbcebb4eed31c3ad4106/docs/auditoria-profunda-2026-10-12.md)**: Siete grupos en metas decimales, ACW y pausas por intervalos, respaldos validados antes de mutar y pagos manuales. Conserva simulaciones mensuales y evidencia separada de publicación y mantenimiento SQL.
- **[12/10 · Auditoría super profunda](https://github.com/jonathanvelasquez787-commits/propio-shift-tracker/blob/6b10046837a821ef9f37cbcebb4eed31c3ad4106/docs/auditoria-super-profunda-2026-10-12.md)**: Trece grupos en identidad durante callbacks y borrado, lectura offline, conflictos, validación de horas y duración, guardado de Higher Rate y controles móviles ES/EN. Recorrido de 42 días y backend controlado; no certifica hardware, OAuth humano ni todas las descargas.
- **[13/10 · Finanzas](https://github.com/jonathanvelasquez787-commits/propio-shift-tracker/blob/6b10046837a821ef9f37cbcebb4eed31c3ad4106/docs/auditoria-finanzas-2026-10-13.md)**: Dieciocho grupos en escrituras atómicas, reservas y pagos independientes, importes y conversiones finitos, comparaciones mensuales, respaldos y premios por reserva real. Reservar no transfiere dinero y las fechas estimadas no prometen depósitos.

El 18/10 se retira el resumen independiente y su build, por aprobación del
propietario. Las referencias históricas a «ambas extensiones» describen el estado
de cada auditoría, no la composición actual. Se mantiene la extensión unificada,
el historial oficial compartido y sus pruebas. No se modifican datos ni migraciones.
