# Propio · Tracker y resumen · 2.1.4

Una sola extensión reúne la conexión al tracker y la barra de llamadas, minutos y ganancias en Propio. «Registrar en mi tracker» y «Mostrar resumen en Propio» son controles independientes. El resumen empieza oculto y no exige cuenta vinculada; encenderlo o apagarlo se aplica a las pestañas abiertas sin recargar. La conexión conserva su modo y cuenta al actualizar la carpeta existente.

## Resumen opcional e interfaz

La conexión inicial es automática: una sola pestaña del tracker con sesión lista vincula la cuenta, activa el registro y prepara el inicio de turno. Al volver a abrir Chrome conserva la cuenta y tus elecciones; si apagaste registro o arranque, no los vuelve a encender. Varias pestañas/cuentas o datos pendientes de otro propietario impiden adivinar una cuenta. El anuncio del tracker reintenta fallos transitorios y comprueba el vínculo cada diez segundos.

El popup explica «Ponerme disponible automáticamente» y diferencia comenzar turno, terminar Break y terminar Lunch. El estado principal de conexión usa lenguaje simple. El volumen de tráfico normal que se observa en Propio y sus códigos HTTP queda dentro de «Detalles para soporte», cerrado por defecto; esas cifras no equivalen a acciones o llamadas de la extensión.

En el historial, la barra muestra el subtotal de la página visible: cantidad de llamadas, minutos y pago oficial. «Calcular total» recorre todas las páginas del rango elegido y vuelve a la página inicial. Ocultarlo mientras suma cancela el recorrido y restaura la página. La barra conserva la colocación compacta junto a los encabezados. Filtros, datos pendientes y errores de paginación mantienen sus verificaciones.

El popup tiene tarjetas de conexión y resumen, controles separados, cuenta vinculada, llamadas detectadas y pendientes, actividad y diagnóstico desplegables. Las preferencias del resumen permiten English/Español y conversión opcional; se guardan localmente y se reflejan en la barra. Usan el mismo icono de reloj de la tool, preparado a 16, 32, 48 y 128 px. Los temas claro/oscuro siguen la preferencia del navegador.

El resumen no inicia turnos, registra llamadas, ni comparte filas con el tracker. El registro puede funcionar con la barra oculta, y el resumen con el registro apagado. El espacio de trabajo añade únicamente el permiso acotado de SuInterpreter descrito abajo; la apertura por perfil no añade permisos nuevos.

## Sesión y Shift

«Al comenzar mi turno» es una opción separada; el primer vínculo automático la prepara y después conserva tu elección. Lee el horario de la cuenta vinculada cuando el tracker está abierto y conserva ese plan hasta su fin. Con registro activo, sesión reconocida y un solo portal, a partir de la hora de inicio pulsa únicamente Start Calls si el botón habilitado y el estado Offline están confirmados. Sirve también al entrar tarde, mientras el turno no haya terminado. Respeta los Break/Lunch programados aunque no hayas iniciado una pausa en la tool; al terminar el intervalo puede comenzar la preparación pendiente. Exige que el tracker transmita el horario completo de pausas; con una versión anterior abierta espera a que se recargue. Si dejás pasar una llamada y volvés a Offline, reintenta con un intervalo mínimo de 15 segundos. Al conectar la primera llamada, registra la finalización de esta preparación y no la reactiva al recargar ni al apagar/encender la opción durante el mismo turno. Nunca pulsa Accept, Reject, Stop Calls ni controles de video/terceros; vos elegís qué tomar. Para permanecer Offline antes de la primera llamada, apagá la opción. No actúa con estado ambiguo, llamada activa, horarios faltantes o finalizados, día libre ni varias pestañas del portal.

Reconoce localmente el encabezado visible «Welcome, … (ID)» del portal. Con automático activado, la primera detección inicia el Shift; si ya estaba abierto, conserva su hora. Desde 1.5.1, pulsar Sign out y completar la redirección de esa pestaña a propio.com o www.propio.com termina el Shift vinculado, sin tener que abrir Login otra vez. El clic se comunica antes de abandonar el portal; el worker confirma la navegación aun cuando desaparece el script de la página. Usa webNavigation con filtros para esos dos hosts y no persiste direcciones. Un clic sin redirección, una visita desde la barra de direcciones, Back, recargar u otra pestaña no termina el turno. Volver al formulario visible `#loginform` sigue confirmando el cierre si la sesión expiró. Una llamada automática pendiente se cierra antes del turno con tiempo estimado hasta esa detección. No cierra llamadas manuales sin revisión.

Si activás la extensión con Propio ya conectado, registra desde la detección, sin inventar la hora anterior de login. Recargar, cerrar pestañas, ocultar ventanas, perder conexión o cambiar disponibilidad no equivale a salir. Un cierre atrasado tampoco termina un Shift manual posterior. Las observaciones desconocidas no modifican la sesión.

## Llamadas

Combina las solicitudes exitosas allowlisted del portal/Twilio con una alternativa desde controles visibles en inglés/español: aceptar/contestar y rechazar, colgar/finalizar llamada, y estados explícitos de llamada conectada/terminada. Un clic en aceptar necesita confirmación posterior de conexión; Start Calls, disponibilidad, un rechazo y un final suelto nunca crean una llamada. El detector espera evidencia estable e ignora controles ocultos. La opción de disponibilidad solo puede pulsar Start Calls.

Ambas fuentes comparten el mismo estado e identificador aleatorio para evitar duplicados. Un inicio observado empieza el contador; su final guarda por la ruta existente de llamadas, ganancias y refuerzo positivo. Activar en mitad de una llamada no inventa su inicio. Tiempo y pago son estimados: el historial oficial permite corregirlos sin duplicar progreso. Offline no se interpreta como Break/Lunch.

La compatibilidad con el diseño de una llamada real en tu portal aún debe comprobarse durante tu trabajo habitual: las pruebas simuladas cubren controles reconocidos, no certifican variantes que Propio no nos ha mostrado. No provocar llamadas para probar. El popup muestra sesión reconocida, señales, solicitudes y pendientes; si un control tiene un formato desconocido, no inventa registros.

## Espera entre llamadas

«Esperar entre llamadas» es optativo y empieza apagado. Se configura de 1 a
60 minutos desde el fin confirmado de cada llamada. Si Propio queda Available,
pulsa Stop Calls solo con un control único y sin llamada activa o entrante.
Al terminar la espera, pulsa Start Calls y reintenta si volvés a Offline, hasta
que vos aceptés. Break/Lunch activos y descansos programados tienen prioridad;
no inicia fuera del turno. La primera llamada conserva su propia opción y
volver de una pausa confirmada respeta la espera restante, si todavía existe.
No acepta ni rechaza llamadas. La preferencia y el fin observado sobreviven
al reinicio del worker, sin atribuir a otra cuenta un intervalo anterior.
Terminar una pausa en el tracker permite volver aun con regreso por duración
activado. Si la conexión no confirma descansos, el popup ofrece actualizar
la única pestaña del tracker; no la recarga durante una llamada o una oferta.

## Recuperación del historial

El contador del popup distingue filas oficiales de llamadas observadas en vivo. Leer 2 filas de 0 minutos significa 2 registros de Propio y 0 minutos; no inventa tiempo ni pago. La fecha/hora debe existir y no terminar en el futuro; duración/pago deben ser números válidos, las banderas Yes/No y el identificador numérico. Filas incompletas se indican y se reintentan cuando Propio las actualiza. El tracker valida de nuevo, aplica sus reglas de duplicados/correcciones/traslapes y solo confirma tras guardar.

Con el registro activo, se recuperan las filas visibles aunque el resumen esté oculto. En un historial filtrado explícitamente a hoy, recorre hasta 2.000 filas, vuelve a la página inicial y sincroniza todas las páginas confirmadas. Si cambiás filtros o intervenís durante el recorrido, cancela sin mezclar rangos. Otros filtros recuperan solo las páginas que se carguen; no consulta endpoints privados ni historiales que no estén abiertos. La cola funciona con el tracker cerrado y se entrega al volver a la misma cuenta dentro de 24 horas. No se importan filas durante una llamada activa.

El popup tiene ancho propio de 400 px en la raíz; ya no depende del viewport inicial de Chrome para calcular su tamaño. Sus controles conservan los temas claro/oscuro y el icono de la tool.

## Privacidad y persistencia

No recoge usuario/contraseña, nombres, ID del intérprete, notas, audio, URLs, headers, tokens o cuerpos para diagnóstico. El registro automático lee únicamente las siete columnas del historial: Customer ID numérico, fecha, inicio, duración, Billable, Dropped y Pay. Esas filas se conservan en la cola local y se entregan a tu cuenta del tracker; sus comprobantes evitan repetirlas. El resumen visual sigue calculando solo duración y pago localmente. La cuenta del tracker se vincula por hash.

La cola y sesión sobreviven al reinicio del worker. Entrega a una sola pestaña de la cuenta conectada, conserva hasta 200 eventos y reintenta cuando vuelve el tracker. Eventos de más de 24 horas requieren revisión. Una llamada manual, un respaldo pendiente, traslapes, varias pestañas o errores de almacenamiento bloquean la entrega. Cambiar de cuenta con pendientes exige resolverlos primero. Pausar durante una llamada requiere esperar o descartar expresamente las señales revisadas. Si cerrás Propio durante una llamada, revisá su final en el tracker.

## Actualizar la extensión existente

1. Reemplazá los archivos de la carpeta de conexión instalada por el paquete 2.1.3, incluidos `summary-content.js` y la carpeta `icons`. Usar esa misma carpeta conserva cuenta vinculada, registro automático, sesión y cola.
2. En `chrome://extensions`, recargá la extensión de conexión: ahora se llama «Propio · Tracker y resumen». Desactivá la extensión anterior «Propio · Minutos y ganancias» y cualquier userscript de resumen para usar solo una barra.
3. Recargá Propio y el tracker. El popup muestra 2.1.3 y el icono de la tool. Activá «Mostrar resumen en Propio» si querés verlo en el historial.
4. Si estaba sin vincular: abrí el tracker, iniciá sesión y pulsá Vincular cuenta. Moneda/idioma de la extensión de resumen anterior se configuran una vez en el nuevo popup: Chrome separa el almacenamiento de las dos extensiones antiguas.

Recargar la versión anterior sin reemplazar los archivos no instala la actualización. Si la extensión fue eliminada, usá Cargar descomprimida con la carpeta que contiene `manifest.json` y conectá la cuenta de nuevo.

Build: `node scripts/build-extension.mjs <salida>`. Se prueban sesión, entrega, duplicados, reinicio, bloqueos y guardado; la comprobación del navegador usa un portal y cuenta ficticios en Chromium aislado.
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
una elección desactivada previa. La instalación de Jonathan está presente
solo en Default, no en su perfil Ocio. No se añaden permisos para esta apertura.

El acceso personal de Windows ahora contiene directamente una instrucción
corta de PowerShell oculto; ya no apunta a un `.vbs` externo. La comprobación
horaria sigue en UTC-6 y conserva el perfil Default. No cambia la política de
ejecución, el inicio de sesión ni ajustes de seguridad de Windows.

La página interna `workspace.html#startup` organiza Propio y SuInterpreter en una
vista dividida dentro de la ventana izquierda (dos tercios de la pantalla), y el
tracker en la ventana derecha. Reutiliza las pestañas existentes sin navegar ni
recargar sus sesiones. Si falta una página la abre; si hay varias de una página
se detiene antes de cambiar la distribución para no elegir entre cuentas.

Solo organiza de 05:45 inclusive hasta antes de 14:00, hora de Honduras, todos
los días. No cierra Chrome al terminar esa franja ni modifica Break/Lunch,
preferencias de registro o aceptación de llamadas. La página no se ejecuta
al abrir cualquier popup: requiere el acceso de inicio de Windows configurado
expresamente para este espacio. Ese acceso se ejecuta al iniciar sesión en
Windows, no antes del login.

La división usa `chrome.tabs.createSplit` y `chrome.tabs.unsplit`, disponibles
desde Chrome 155. Chrome anterior conserva el puente y el resumen, pero no puede
organizar esta vista. El permiso adicional de `app.suinterpreter.com` permite
identificar su pestaña para moverla; no se inyectan scripts ni se lee su contenido,
audio o credenciales. Las demás pestañas permanecen abiertas.

`workspace.html#setup` permite una configuración manual puntual fuera de horario;
el marcador se reemplaza por `#startup` para que una restauración posterior no
repita esa excepción. La página se cierra al completar la organización. Los
errores se muestran con opción de reintentar y un bloqueo corto evita dos
organizaciones simultáneas. No configura auto-login en Windows ni en Propio.
