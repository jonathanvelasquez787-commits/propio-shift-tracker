# Auditoría profunda del 18 de octubre de 2026

App 621; extensión conservada en 2.2.7. Parte de main
`4867760556614f02926656b0cb1ee7d02d63db14`. La petición del propietario fue
«haz auditoria profunda». Se revisaron funcionalidad, estructura, persistencia,
aislamiento, sincronización y uso continuado; las reparaciones mantienen la
interfaz y los contratos existentes. Ninguna prueba escribe datos reales ni
acepta llamadas de Propio.

## Hallazgos y reparación

1. **Metas parcialmente guardadas tras un rechazo local.** La meta general
   escribía primero estado y después ajustes. Si fallaba la segunda escritura,
   memoria, historial de planificación y disco podían discrepar. Quitar una meta
   diaria tampoco restauraba su snapshot histórico. Ambas operaciones usan ahora
   el escritor completo y restauran los valores anteriores cuando se rechaza.
   La restauración de la meta general conserva las referencias que necesita la
   transacción externa de Finanzas.

2. **Horario conservaba una edición rechazada.** Guardar día y copiar a días
   laborales o fin de semana modificaban ajustes e historial antes de comprobar
   persistencia. Un rechazo dejaba esas modificaciones en memoria. Las tres
   acciones guardan una sola instantánea completa y revierten ambas estructuras
   si falla. Una confirmación abierta tampoco puede aplicar el borrador a otro
   día, semana o cuenta seleccionados después.

3. **Respuestas tardías del perfil reemplazaban datos nuevos.** Una lectura
   pendiente podía borrar un nombre que se acababa de escribir; lecturas o
   guardados solapados podían aplicar información de una cuenta anterior.
   Se capturan propietario, identidad y versión de solicitud, se revalidan
   después de esperas, y solo se rellenan campos cuyo valor sigue intacto.
   La tarjeta pública también vuelve a comprobar la sesión antes de mostrarla.

4. **El perfil anunciaba éxito sin actualizar una fila.** La actualización de
   nombre solo comprobaba el error HTTP. Una respuesta sin fila actualizada
   podía mostrarse como guardada. Ahora exige la fila de la cuenta capturada;
   una confirmación vacía o de otra cuenta produce un error comprensible.
   Se conserva la validación de nombres duplicados. No se amplían permisos SQL.

5. **Botón de perfil bloqueado al reabrir Ajustes.** Una lectura nueva cancelaba
   el guardado anterior, pero su finalización ya no podía rehabilitar el botón.
   La nueva lectura restablece el botón y los resultados cancelados no cambian
   el mensaje actual ni ejecutan una edición pendiente.

6. **Recuperación no ligada a su cuenta original.** El formulario pasaba solo la
   contraseña al SDK; un cambio de sesión podía hacerla corresponder a otra
   cuenta. Se captura la identidad de recuperación, se cancela el formulario si
   cambia y se valida la cuenta antes y después de actualizar. Un enlace emitido
   válido sigue abriendo la app después de guardar. No se habilita Email/SMTP.

## Regresión y verificaciones

- 818 pruebas correctas, sin fallos ni omitidas: 14 casos nuevos en
  `tests/profile-goal-integrity.test.mjs` y adaptación del caso existente de
  quitar meta diaria en `tests/audit-save-feedback.test.mjs`. Incluyen rechazos,
  snapshots, respuestas solapadas, cambios de cuenta, acuses vacíos, confirmación
  vieja del horario, recuperación válida y nombre ocupado.
- Build correcto: 2.215 textos ES/EN, contratos de 39 módulos, wiring y matriz
  de 23 criterios, 69 suites y 74 módulos fuente. Extensión activa compilada.
- Inventario adicional de 66 archivos JS, 2.621 funciones, 306 sitios de
  listeners y 437 controles/enlaces estáticos. Sin llamadas directas a nombres
  potencialmente no declarados en ese inventario. El análisis es conservador:
  no demuestra por sí solo todas las ramas léxicas o combinaciones dinámicas.
- Escaneo de archivos e historial sin credenciales detectadas. Consulta actual
  del lockfile al registro oficial de npm: sin vulnerabilidades conocidas.
- Se retiraron dos dependencias inyectadas que ya no se consumían. El paquete
  principal mide 802.102 bytes; su presupuesto se ajusta de 802.000 a 803.000
  para los controles de integridad añadidos. Se mantienen los demás límites.

## Uso de navegador y persistencia

Se ejecutó Chrome aislado con el resultado compilado, autenticación ficticia,
backend local con revisiones y tráfico externo bloqueado. La línea base y la
versión reparada se compararon sin utilizar el perfil Chrome del propietario.

- **32 días consecutivos**, del 1/9 al 2/10/2026, alternando 1.280 y 390 px:
  entrada temprana/puntual/tardía, turno, llamada live, manual y oficial, segundo
  pegado duplicado, Break, Lunch y cierre. Cada día fuerza sincronización y
  reabre la app. Libro independiente: **96 llamadas, 736 minutos, $88.32 y
  64 pausas**; sin duplicados ni errores de página.
- **112 vistas**: siete páginas en 320/390/768/1.365 px, ES/EN y claro/oscuro.
  Sin overflow de la raíz ni texto recortado en los controles de llamadas.
  Ocho recorridos comprueban moneda, nombre, sonido, desplazamiento de horario,
  gasto de Finanzas, aviso de inactividad, reapertura y bloque incompleto.
- **Once recorridos adicionales** sobre el bundle: rechazo de cuota en meta y
  horario, restauración y reintento, confirmación vacía/positiva del perfil,
  exportación JSON, edición y borrado individual de llamadas, vaciado del día
  conservando acciones y reapertura con la nube local.
- **Tres escenarios nocturnos**: antes de medianoche, después de medianoche y
  turno cerrado. Se edita y conserva 22:00–06:00; se contrastan bloques y minutos
  de adherencia, incluidos 180/180 y 285/285.
- **Tres escenarios de acceso**: Google anónimo ES/EN y recuperación emitida con
  cuenta ficticia. No aparecen formularios públicos retirados.
- **Disponibilidad de la extensión compilada**: entrada anticipada detenida
  hasta el turno; Stop Calls al terminar; ACW ya en 00:50 deja 130 s de espera;
  cruce del umbral después de reiniciar el worker; pausa manual conservada y
  Start Calls manual para reanudar. Se repite con intervalos de página anulados
  y consulta de plan actual al tracker; fuera del turno no reinicia.

Las suites ejecutadas amplían esas secuencias con días libres, llamadas durante
pausas/fuera del turno, importaciones históricas/corregidas/solapadas, premios,
Higher Rate, Finanzas, calendarios, conflictos, identidad, migraciones y RLS en
PostgreSQL local. Esa cobertura automática no equivale a pulsar cada control
individualmente en un teléfono físico.

## Publicación y límites

La publicación se realiza mediante PR con CI sobre su SHA, seguido de la
comprobación del despliegue y `/api/health` sobre el SHA fusionado. El PR conserva
sus resultados verificables; los artefactos locales de QA quedan fuera de Git.

No se certifican dos PCs humanos simultáneos, OAuth humano nuevo, todas las
variantes nativas de llamada/Save, audibilidad física, otro monitor, un reinicio
físico nuevo ni cron alojado. No se cambian Auth, RLS, migraciones ni datos del
propietario. Continúan los límites de suspensión/congelación de Chrome y los
pendientes documentados: segundos oficiales de Propio, procesamiento de Google
y activación opcional de Locize. Evidencia anterior:
[auditoría consolidada del 17/10](auditoria-profunda-2026-10-17.md).
