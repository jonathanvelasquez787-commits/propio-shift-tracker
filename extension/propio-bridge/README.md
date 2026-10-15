# Propio · Tracker y vista original · 2.2.3

La extensión conecta tu tracker con la sesión y el historial de Propio. Su
registro de llamadas funciona independientemente de la apariencia del portal.

## Vista original de Propio

«Usar la vista original de Propio» recupera la vista nativa que todavía incluye
el portal: barra turquesa, Calls, Minutes, Pay e iconos. Apagado por defecto,
guarda la elección en el perfil de Chrome. Al apagarlo vuelve a la selección
normal de Propio. No crea una barra alternativa ni calcula totales propios.
La anterior barra de la extensión y sus controles de cálculo/conversión fueron
retirados; el paquete independiente para instalaciones antiguas se conserva.

Cambiar la elección solicita una recarga únicamente con un portal, estado
Offline confirmado y sin llamada activa ni oferta. Si está ocupado, espera;
no pulsa Start Calls, Stop Calls, Accept ni Reactivate para aplicar el diseño.
La comprobación se repite con el controlador de sesión y el worker. Una revisión
se recarga una sola vez por pestaña para evitar bucles. Varias pestañas del
portal bloquean la recarga hasta resolver la ambigüedad.

`classic-portal.js` se ejecuta antes del código del portal en su contexto
principal; `original-portal-content.js` comunica la elección desde el
almacenamiento aislado de la extensión. El único valor sustituido durante la
lectura es la opción de interfaz nativa
`enable-analytics-block-AT-415-interpreter-portal`. Su valor real se conserva al
serializar el objeto de esa opción, conservando los cachés nativos de ese objeto.
Otras opciones,
respuestas de llamadas y formatos desconocidos permanecen intactos. No cambia
permisos, llamadas, cuentas ni datos del tracker.

Esta opción depende de que Propio conserve el componente y el formato de esa
opción; si los cambia, debe revisarse la compatibilidad. La selección corresponde
a la vista antigua completa, incluidos Call Status y la colocación de Feedback.

La conexión inicial sigue siendo automática con una sola pestaña del tracker
con sesión lista. Reabrir Chrome conserva cuenta y preferencias. El popup mantiene
el diagnóstico técnico dentro de Detalles para soporte, cerrado por defecto.

## Sesión y Shift

«Al comenzar mi turno» es una opción separada; el primer vínculo automático la prepara y después conserva tu elección. Lee el horario de la cuenta vinculada cuando el tracker está abierto y conserva ese plan hasta su fin. Con registro activo, sesión reconocida y un solo portal, a partir de la hora de inicio pulsa únicamente Start Calls si el botón habilitado y el estado Offline están confirmados. Sirve también al entrar tarde, mientras el turno no haya terminado. Respeta los Break/Lunch programados aunque no hayas iniciado una pausa en la tool; al terminar el intervalo puede comenzar la preparación pendiente. Exige que el tracker transmita el horario completo de pausas; con una versión anterior abierta espera a que se recargue. Si dejás pasar una llamada y volvés a Offline, reintenta con un intervalo mínimo de 15 segundos. Al conectar la primera llamada, registra la finalización de esta preparación y no la reactiva al recargar ni al apagar/encender la opción durante el mismo turno. Nunca pulsa Accept, Reject ni controles de video/terceros; vos elegís qué tomar. Stop Calls se usa únicamente al esperar entre llamadas. Un Stop manual pausa los automatismos. No actúa con estado ambiguo, llamada activa, horarios faltantes o finalizados, día libre ni varias pestañas del portal.

Reconoce localmente el encabezado visible «Welcome, … (ID)» del portal. Con automático activado, la primera detección inicia el Shift; si ya estaba abierto, conserva su hora. Desde 1.5.1, pulsar Sign out y completar la redirección de esa pestaña a propio.com o www.propio.com termina el Shift vinculado, sin tener que abrir Login otra vez. El clic se comunica antes de abandonar el portal; el worker confirma la navegación aun cuando desaparece el script de la página. Usa webNavigation con filtros para esos dos hosts y no persiste direcciones. Un clic sin redirección, una visita desde la barra de direcciones, Back, recargar u otra pestaña no termina el turno. Volver al formulario visible `#loginform` sigue confirmando el cierre si la sesión expiró. Una llamada automática pendiente se cierra antes del turno con tiempo estimado hasta esa detección. No cierra llamadas manuales sin revisión.

Si activás la extensión con Propio ya conectado, registra desde la detección, sin inventar la hora anterior de login. Recargar, cerrar pestañas, ocultar ventanas, perder conexión o cambiar disponibilidad no equivale a salir. Un cierre atrasado tampoco termina un Shift manual posterior. Las observaciones desconocidas no modifican la sesión.

## Llamadas

Combina las solicitudes exitosas allowlisted del portal/Twilio con una alternativa desde controles visibles en inglés/español: aceptar/contestar y rechazar, colgar/finalizar llamada, y estados explícitos de llamada conectada/terminada. Un clic en aceptar necesita confirmación posterior de conexión; Start Calls, disponibilidad, un rechazo y un final suelto nunca crean una llamada. El detector espera evidencia estable e ignora controles ocultos. La disponibilidad usa Start Calls y, durante la espera, Stop Calls; nunca acepta llamadas.

Ambas fuentes comparten el mismo estado e identificador aleatorio para evitar duplicados. Un inicio observado empieza el contador; su final guarda por la ruta existente de llamadas, ganancias y refuerzo positivo. Activar en mitad de una llamada no inventa su inicio. Tiempo y pago son estimados: el historial oficial permite corregirlos sin duplicar progreso. Offline no se interpreta como Break/Lunch.

La compatibilidad con el diseño de una llamada real en tu portal aún debe comprobarse durante tu trabajo habitual: las pruebas simuladas cubren controles reconocidos, no certifican variantes que Propio no nos ha mostrado. No provocar llamadas para probar. El popup muestra sesión reconocida, señales, solicitudes y pendientes; si un control tiene un formato desconocido, no inventa registros.

## Espera entre llamadas

«Esperar entre llamadas» es optativo y empieza apagado. Se configura de 1 a
60 minutos del ACW actual de la tool, usando el mismo inicio que su contador.
No necesita observar 00:00 ni un segundo exacto: con ACW 00:50 y espera de tres
minutos faltan 02:10; si la siguiente lectura llega a 03:01, ya puede iniciar.
Reconoce Available y Wrap Up con el prefijo Call Status de la vista original,
para pulsar Stop Calls después de colgar, y Offline/Not Available para regresar.
Solo actúa con controles únicos habilitados y sin llamada/oferta activa.

Horario y pausas bloquean el inicio. La primera llamada espera al inicio real
del turno y no acumula una espera desde el login temprano. El regreso de pausas
activado conserva su prioridad. Después de las llamadas usa un ACW actualizado
del mismo tracker; una captura previa a la desconexión nunca autoriza el regreso.
Con tracker viejo, cerrado o sin lectura reciente, mantiene la espera y muestra
el motivo. La selección y la barrera de desconexión sobreviven al worker.
No acepta ni rechaza llamadas. Si una oferta pasa y vuelve a Not Available,
reintenta Start Calls sin comenzar otra espera. La tool debe permanecer abierta.

Un regreso de Break/Lunch apagado no es reemplazado por la espera. El regreso
habilitado tiene prioridad sobre un ACW recién iniciado. Terminar temprano una
pausa reconoce únicamente su bloque, sin omitir otra pausa distinta.

Si pulsás Stop Calls manualmente, se pausa la disponibilidad automática, pero
el registro continúa. Para reanudar, usá Start Calls manualmente o apagá
«Pausar disponibilidad automática» en el popup. Esta elección se conserva al
reiniciar. El interruptor pausa clics; no modifica la disponibilidad actual.
Un tracker cerrado, antiguo o de otra cuenta no autoriza nuevos inicios.
No hay coordinación global entre dos PCs: activá los iniciadores solo en una.
Las decisiones de los 54 escenarios constan en docs/disponibilidad-casos-cotidianos.md.

## Recuperación del historial

El contador del popup distingue filas oficiales de llamadas observadas en vivo. Leer 2 filas de 0 minutos significa 2 registros de Propio y 0 minutos; no inventa tiempo ni pago. La fecha/hora debe existir y no terminar en el futuro; duración/pago deben ser números válidos, las banderas Yes/No y el identificador numérico. Filas incompletas se indican y se reintentan cuando Propio las actualiza. El tracker valida de nuevo, aplica sus reglas de duplicados/correcciones/traslapes y solo confirma tras guardar.

Con el registro activo, se recuperan las filas visibles aunque el resumen esté oculto. En un historial filtrado explícitamente a hoy, recorre hasta 2.000 filas, vuelve a la página inicial y sincroniza todas las páginas confirmadas. Si cambiás filtros o intervenís durante el recorrido, cancela sin mezclar rangos. Otros filtros recuperan solo las páginas que se carguen; no consulta endpoints privados ni historiales que no estén abiertos. La cola funciona con el tracker cerrado y se entrega al volver a la misma cuenta dentro de 24 horas. No se importan filas durante una llamada activa.

El popup tiene ancho propio de 400 px, temas claro/oscuro y el icono de la tool.

## Privacidad y persistencia

No recoge usuario/contraseña, nombres, ID del intérprete, notas, audio, URLs, headers, tokens o cuerpos para diagnóstico. El registro automático lee únicamente las siete columnas del historial: Customer ID numérico, fecha, inicio, duración, Billable, Dropped y Pay. Esas filas se conservan en la cola local y se entregan a tu cuenta del tracker; sus comprobantes evitan repetirlas. La vista original usa el componente nativo de totales de Propio; la extensión no los calcula. La cuenta del tracker se vincula por hash.

La cola y sesión sobreviven al reinicio del worker. Entrega a una sola pestaña de la cuenta conectada, conserva hasta 200 eventos y reintenta cuando vuelve el tracker. Eventos de más de 24 horas requieren revisión. Una llamada manual, un respaldo pendiente, traslapes, varias pestañas o errores de almacenamiento bloquean la entrega. Cambiar de cuenta con pendientes exige resolverlos primero. Pausar durante una llamada requiere esperar o descartar expresamente las señales revisadas. Si cerrás Propio durante una llamada, revisá su final en el tracker.

## Actualizar la extensión existente

El agente reemplaza los archivos de la misma carpeta instalada, conservando su
almacenamiento y cuenta vinculada. El build elimina el antiguo
`summary-content.js`; no debe volver a incluirlo en el manifest. Se recarga la
extensión y, con Propio libre, su página para activar los nuevos scripts.
Build: `node scripts/build-extension.mjs <salida>`. App y paquete independiente
mantienen sus verificaciones propias.

## Espacio de trabajo al iniciar Windows

La apertura por perfil es independiente del horario de Windows. Con la opción
activada en ese perfil, abrir su primera ventana normal prepara el espacio a
cualquier hora. Abrir ventanas adicionales no repite la preparación; cerrar
todas y volver a entrar al perfil sí. Incógnito y ventanas emergentes se ignoran,
y un worker reiniciado conserva el estado de esa sesión. El acceso de Windows
se reutiliza cuando llega junto al evento del perfil para evitar otra pestaña.

La distribución pública tiene `workspace-preferences.json` desactivado. Una
instalación personal expresamente configurada puede inicializarlo activado;
después se guarda en `chrome.storage.local`, separado por perfil y respetando
una elección desactivada previa. Una configuración personal autorizada puede
incluir `profileSetupRevision`: se aplica una sola vez por revisión y conserva
las elecciones posteriores. Actualizar la extensión vuelve a comprobar las
ventanas abiertas; un fallo de distribución libera el intento y muestra Reintentar. La instalación de Jonathan está presente
solo en Default, no en su perfil Ocio. No se añaden permisos para esta apertura.

El acceso personal de Windows abre Chrome directamente en Default/Jonathan
con la página del organizador. No depende de PowerShell ni de un `.vbs`,
y no aplica franjas horarias. No cambia el inicio de sesión ni ajustes
de seguridad de Windows.

La página interna `workspace.html#startup` organiza Propio y UseInterpreter en una
vista dividida dentro de la ventana izquierda, más ancha. El tracker y Linguee
son dos pestañas normales, en ese orden, dentro de la ventana derecha. Se
compensan los bordes invisibles de Windows para quitar huecos entre ventanas
y bajo ellas, usando la distribución de la captura aprobada. Reutiliza las pestañas existentes sin navegar ni
recargar sus sesiones. Si falta una página la abre; si hay varias de una página
se detiene antes de cambiar la distribución para no elegir entre cuentas.

Organiza a cualquier hora al abrir Jonathan o iniciar sesión en Windows.
Reutiliza las páginas del perfil; no modifica Break/Lunch, preferencias de
registro ni aceptación de llamadas. El acceso de Windows se ejecuta después
del login y abre ese perfil directamente, sin pasar por el selector.

La división usa `chrome.tabs.createSplit` y `chrome.tabs.unsplit`, disponibles
desde Chrome 155. Chrome anterior conserva el puente y el resumen, pero no puede
organizar esta vista. El permiso adicional de `app.useinterpreter.com` permite
identificar su pestaña para moverla; no se inyectan scripts ni se lee su contenido,
audio o credenciales. Los permisos acotados de www.linguee.es y www.linguee.com
permiten reutilizar una pestaña existente sin navegar ni leer su contenido.
Las demás pestañas permanecen abiertas.

`workspace.html#setup` permite organizar manualmente. Todos los marcadores
del organizador aplican la misma distribución sin comprobar la hora. La página se cierra al completar la organización. Los
errores se muestran con opción de reintentar y un bloqueo corto evita dos
organizaciones simultáneas. No configura auto-login en Windows ni en Propio.

Una instalación personal puede elegir `rightPaneHeightRatio` entre 0.4 y 1 en
`workspace-preferences.json`: reserva la parte inferior derecha para otra
aplicación y mantiene la izquierda de altura completa. La distribución pública
usa 1. Un valor inválido o archivo inaccesible conserva esa altura completa.
El organizador no abre ni lee archivos personales; abrir un archivo de notas
al iniciar Windows se configura por separado mediante un acceso de Inicio.
