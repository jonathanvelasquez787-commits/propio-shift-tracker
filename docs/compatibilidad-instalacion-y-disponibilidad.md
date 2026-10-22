# Compatibilidad, instalación y disponibilidad

Implementación de los puntos 63–64 y de la coordinación pendiente de 14/74.
La publicación web, migración alojada y actualización de archivos de la extensión
se verifican en el cierre de la entrega. La instalación que ya estaba confirmada
no vuelve a considerarse pendiente por incorporar el asistente de otras PCs.

## Vista original de Propio

El popup distingue la preferencia guardada del componente `app-daily-rollup`
detectado en el portal. Informa componente presente, carga pendiente, espera de
Offline o ausencia del componente. Los informes son de la revisión actual de la
preferencia, caducan a los 15 segundos y requieren una sola pestaña del portal.
No se leen ni calculan los totales de ese componente.

La elección se aplica únicamente con la sesión confirmada, Offline reciente y
sin llamada u oferta. El guardado no equivale a confirmar que la vista se mostró.
La recuperación conserva la protección de una recarga por preferencia/pestaña.
Si Propio retira su componente nativo, la extensión no puede recrearlo: lo explica
sin presentar un total alternativo ni cambiar registros.

## Preparar otra PC

El popup abre `workspace.html#setup`, un asistente del perfil de Chrome actual:

- Permite elegir las rutas de las cuatro páginas reconocidas, la apertura con
  el perfil y el ancho/alto de la columna derecha. No añade permisos de sitios.
  Rechaza orígenes ajenos, contraseñas, parámetros y fragmentos en las URLs.
- Muestra las preferencias existentes. Sin configuración propia propone «Solo
  registro en esta PC»; abrir el asistente no guarda ni mueve ventanas.
- Guarda configuración, apertura y rol local en una sola operación de storage.
  No modifica llamadas, archivos de notas ni preferencias de otras PCs.
  Un fallo deja las preferencias anteriores; un formato persistido inválido no
  se reemplaza silenciosamente por valores predeterminados.
- «Organizar ahora» utiliza la misma lógica que el inicio del perfil: reutiliza
  pestañas, evita duplicados y requiere la API de vista dividida de Chrome.
  No abre sesiones ni acepta llamadas por la persona.
- El apartado Windows prepara un JSON con el acceso de Chrome y archivo de
  notas que corresponden a esa PC y los tamaños seleccionados. Contiene rutas,
  nunca el contenido de las notas. Prepararlo no modifica accesos ni instala.

El agente puede entregar ese archivo al instalador con `-ConfigurationPath`.
El modo `-PlanOnly` valida rutas, acceso y tamaños, muestra el perfil/argumentos
que conservará y no crea una instalación. La instalación respalda el acceso,
ejecutable y configuración existentes; verifica el candidato antes de apuntar
el acceso al iniciador y restaura accesos/archivos previos ante un fallo en esa
fase. Conserva los argumentos originales de Chrome, incluido el perfil.
El ancho de notas y el de Chrome comparten el mismo porcentaje; el alto reserva
el área inferior. No se modifica la política de ejecución ni la seguridad de
Windows. El archivo de notas debe existir y permanece intacto.

## Una PC con permiso de automatización

`private.automation_availability_leases` guarda una fila por usuario, un UUID
aleatorio estable de esta instalación de la extensión y un vencimiento.
La RPC autenticada `public.automation_lease(p_owner uuid)` usa una inserción
atómica con conflicto por usuario: renueva al mismo dueño o toma una fila
vencida; nunca desplaza a otro dueño con permiso vigente. La duración se fija
con el reloj de PostgreSQL a 30 segundos; el cliente no elige el vencimiento.
La tabla está fuera del esquema público, tiene RLS y carece de permisos directos
para `anon`/`authenticated`. El helper privado comprueba `auth.uid()`, usa
`search_path` vacío y solo recibe el UUID de dueño. La RPC pública es invoker.

La web autenticada solicita/renueva únicamente cuando la extensión vinculada
lo pide. Una PC en «Solo registro», con registro apagado o disponibilidad
pausada no lo solicita. El worker no recibe tokens de Supabase. Un permiso no
contiene llamadas, notas, correo ni identidad del usuario. La web descuenta
cinco segundos y toda la demora del pedido; renueva aproximadamente cada ocho
segundos y limita la vigencia a 25 segundos usando reloj local y monotónico.
Errores, denegación, cambio de cuenta y respuestas tardías invalidan el permiso.
No hay liberación apresurada que una respuesta anterior pueda usar para quitar
el permiso a otra instancia; se deja vencer.

El worker exige permiso actual del dueño vinculado para Start Calls, Stop Calls
y cierre automático de pausas. Su reinicio exige recibir de nuevo permiso a
través del puente. Las órdenes de controles son de un solo uso: antes del clic
se vuelve a comprobar dueño, cuenta, documento, plan, rol, pausa manual y
vigencia; una respuesta de más de tres segundos no autoriza el clic. Se vuelve
a leer el control visible antes de actuar. Las observaciones del portal tienen
fecha y las atrasadas no ejecutan iniciadores ni cierres de pausas.
El cierre de una pausa también revalida el permiso dentro de la cola de escritura
de la web; si lo perdió, no termina la pausa ni bloquea el registro de llamadas.

El popup y el resumen de Inicio muestran «Solo registro en esta PC», espera de
permiso o lectura atrasada cuando corresponda. El estado dominante no confunde
el registro de llamadas con la disponibilidad automática. El rol pasivo conserva
espera ACW, primera llamada y regresos elegidos. Las señales de llamadas, el
historial y sus reintentos continúan sin depender del permiso de disponibilidad.

Para transferir disponibilidad se activa «Solo registro» o se pausan los
iniciadores en la PC anterior y se habilitan en la nueva. El permiso anterior
vence en hasta 30 segundos; la nueva puede obtenerlo después. Una copia antigua
de la extensión que aún no implemente esta coordinación debe actualizarse:
el servidor no puede impedir clics de un cliente antiguo o controles manuales.

## Evidencia y límites

- `automation-lease.test.mjs`: expiración conservadora, errores/denegación,
  identidad cambiada, respuesta tardía, puente y protección del cierre de pausa;
  migraciones reales ejecutadas con PostgreSQL/PGlite para aislamiento por
  cuenta, renovación, disputa, vencimiento, permisos y cascade al borrar cuenta.
- `propio-bridge.test.mjs`: permisos ausentes/vencidos/ajenos, PC pasiva,
  continuidad del registro y preferencias, pausa programada protegida,
  confirmación única y rechazo de órdenes tardías, pausadas o de plan/documento
  distinto. Se mantienen los escenarios anteriores de llamadas y ACW.
- `workspace-settings.test.mjs`, `workspace-profile.test.mjs` y
  `workspace-startup.test.mjs`: guardado/reapertura/fallo, rutas inválidas,
  conservación de instalación/preferencias y geometría de varios monitores.
- `original-portal-controller.test.mjs`: componente presente/ausente,
  espera segura, revisión de preferencia y una recuperación sin recarga repetida.
- `desktop-installer.test.mjs`: vista previa Windows con acceso y notas
  sintéticos, perfil/argumentos conservados y tamaños inválidos sin mutación.
  El sandbox impide a Windows PowerShell leer su política en el registro; esta
  prueba se verificó fuera de ese sandbox sin cambiar la política.
- Compilación C# y geometría del iniciador comprobadas en un DLL temporal:
  monitor de origen negativo y columna del 40% producen ancho de 784 px,
  izquierda −784 y notas desde y=636 para área 1920×1040 y alto 61.2%.

Estas pruebas no certifican dos PCs físicas, otro monitor físico, todas las
variantes de la interfaz propietaria de Propio ni su regla oficial de pago.
La suspensión impide ejecutar automatismos: al volver deben confirmarse de
nuevo el portal y el permiso. No se promete actividad con el equipo suspendido
ni resistencia a cambios arbitrarios del reloj/sistema. No se alteró la
instalación real al validar el asistente o el iniciador.
