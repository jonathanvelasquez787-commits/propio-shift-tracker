**NOTA DE MANTENIMIENTO DE ESTE ARCHIVO (leer antes de editar este .md)**

Este archivo tiene dos partes:

1. **PROTOCOLOS** (de "ESTILO DE LAYOUT" a "FLUJO DE TRABAJO CON ESTE
   REPOSITORIO"). Reglas permanentes — casi no cambian, y NO se tocan al
   cerrar una versión. Solo se editan si el usuario pide explícitamente
   modificar un protocolo.
2. **ESTADO DEL PROYECTO** (de "PENDIENTES" en adelante). Estado actual,
   pendientes, limitaciones conocidas y el historial de las últimas versiones.
   Esta parte SÍ se reescribe en cada versión nueva:

- PENDIENTES: sin límite — se conservan TODOS los bugs/tareas pendientes
  mientras sigan sin resolver, con el detalle que haga falta para
  retomarlos sin releer código.
- ÚLTIMOS FIXES: máximo 3 entradas (las 3 versiones más recientes). Al
  agregar una versión nueva, se BORRA la más antigua de las 3 (no se
  compacta a una línea, se elimina por completo).
- RESUELTO / historial viejo: no se conserva.
- Ejemplos puntuales de excepciones a un protocolo se mantienen genéricos,
  sin listar cada versión histórica una por una — si algo ya no aporta como
  referencia futura, se recorta en la siguiente edición de este archivo.

---

**ESTILO DE LAYOUT DE LA APP (leer antes de cualquier rediseño visual)**

Todo rediseño 100% visual de esta app sigue el mismo protocolo:

1. Mockup VISUAL (no texto/ASCII) de la sección a rediseñar, reutilizando los
   colores/variables reales de la app (`--panel-navy`, `--cyan`, `--line`,
   etc.) para que se vea lo más parecido posible al resultado final.
2. Una sola versión del layout, responsive: NO se arman una vista "celular" y
   otra "escritorio" por separado. El mismo layout de escritorio tiene que
   funcionar angostado a ancho de celular — es al CSS del mockup al que le
   toca demostrar eso, no a un segundo diseño aparte.
3. El mockup se presenta en modo claro Y modo oscuro (misma composición, las
   dos paletas) — nunca uno solo de los dos temas.
4. Esperar aprobación explícita del usuario antes de escribir una sola línea
   de HTML/CSS.
5. CERO cambios funcionales: mismos ids, mismos listeners, mismo JS — el
   rediseño es solo HTML/CSS que envuelve lo mismo de siempre.

EXCEPCIONES que NO exigen repetir el protocolo (aunque si incluyen un mockup,
ese mockup igual debe ser visual y aprobado antes de tocar código):
- Bugs/ajustes puntuales de JS sin tocar HTML/CSS visible.
- Cambios que mezclan reordenamiento visual con datos/funcionalidad ya
  aprobados aparte.
- Simples reordenamientos de secciones ya existentes; eliminación de una
  feature completa.
- Cambios puramente de DATOS/valores por default sin tocar HTML/CSS.
- Limpiezas de CSS/código muerto sin ningún cambio visible.
- Extensiones chicas de datos que reutilizan un patrón/función ya rediseñado
  en otro lado (ej. un nuevo bloque que copia 1:1 `.fin-preview` con otro id).
- Ajustes mínimos de HTML/atributos o de estado visual (opacidad/badge) que
  reutilizan 100% patrones ya existentes, sin lenguaje visual nuevo.
- Cuando el usuario trae el mockup YA armado y aprobado en el mismo mensaje,
  o renuncia explícitamente al mockup para un cambio puntual — vale solo para
  ese cambio, no cambia el protocolo por defecto.
- Cambios solo de valores/tokens de color sobre componentes que ya existen
  (ej. cambiar qué variable de color usa un borde), sin lenguaje visual nuevo.

---

**PROTOCOLO DE COMENTARIOS EN EL CÓDIGO (leer antes de tocar el .html)**

Este proyecto es un solo archivo HTML de miles de líneas. El historial de
"por qué se hizo cada cambio" vive en este resumen — el código en sí NO debe
repetir esa narrativa. Al agregar o editar código:

1. NUNCA escribir comentarios tipo diario ("v217 — antes se veía X, causa Y,
   se cambió a Z..."). Esa información va al resumen, no al código.
2. Un comentario en el código solo se justifica si explica algo NO OBVIO
   leyendo el código mismo: una restricción externa, un bug sutil que se
   evitó, una decisión de diseño que alguien podría "corregir" por error.
3. Máximo 1-2 líneas por comentario. Si hace falta más contexto, se pone en
   el resumen y el comentario del código solo apunta ahí.
4. Nunca mencionar números de versión dentro del código — esas referencias
   solo tienen sentido en el resumen.
5. Si hace falta explicar el "por qué" de una decisión de más de 2 líneas, se
   escribe en el resumen como parte del registro de esa versión, no como
   comentario en el archivo HTML.
6. Al editar código que ya tiene un comentario largo tipo diario, se
   aprovecha para comprimirlo a 1-2 líneas (o borrarlo si el resumen ya lo
   cubre), sin que haga falta que el usuario lo pida.
7. Aplica a todo cambio futuro sobre este archivo, sin excepción.

---

**PROTOCOLO DE DIAGNÓSTICO DE OVERFLOW (leer antes de agregar una tabla,
sección o caja nueva — y antes de "arreglar" un reclamo de overflow a ciegas)**

LECCIÓN CENTRAL: cuando algo se ve "grande"/desbordado en un contenedor y el
elemento que el usuario señala parece bien dimensionado en el código, EL
PROBLEMA CASI NUNCA ESTÁ AHÍ. Está en un HERMANO o ANCESTRO que empuja el
contenedor completo (ej. una tabla de referencia con `min-width` fijo que
arrastra a todo su padre). Revisar el elemento señalado en 3+ intentos sin
resultado es la señal de cambiar de estrategia.

LECCIONES ADICIONALES:
- `min-width: 0` en el contenedor de un grid/flex no siempre alcanza — a
  veces hace falta también en cada CELDA/ítem individual, sobre todo si esa
  celda tiene `aspect-ratio` y no ancho propio.
- Un `overflow-x: auto` con scrollbar oculta (patrón `.week-nav`/`.chips`)
  NO es intercambiable con "se ve bien recortado": si el usuario ve un borde
  cortado sin señal de que hay más contenido, se reporta como "roto". Cuando
  el pedido es "que se vea bien"/"que quepa", eso NO autoriza a decidir por
  cuenta propia qué dato quitar — solo el usuario decide qué información
  puede perderse. Orden correcto: (1) achicar texto/font-size sin perder
  datos, (2) agregar el mismo fundido de borde que `.chips.is-scrollable`
  (mask-image + clase toggleada por JS comparando `scrollWidth` vs
  `clientWidth`), (3) solo si el usuario lo pide explícitamente, recién ahí
  se oculta un dato.
- Reglas de tema en `css/app-shell.css` (que carga DESPUÉS del `<style>` de
  `app.html`) sin prefijo de tema pueden pisar `font-size` de un elemento con
  compactación mobile propia y reintroducir un desborde — fijar tamaño ahí
  solo donde el elemento no tiene ya una regla propia dentro de un
  `@media (max-width: …)`.

CHECKLIST RÁPIDO al reproducir un overflow horizontal (en orden):
1. Pedir o revisar un screenshot real si un diagnóstico a ciegas ya falló una
   vez.
2. `overflow-x: hidden` temporal en el contenedor sospechoso (o medir con
   `getBoundingClientRect().width` vs `.scrollWidth` en consola) para
   encontrar qué hijo se recorta.
3. Buscar con grep, en esa sección: `min-width:` en px en cualquier elemento;
   `white-space: nowrap` sin `max-width`/`min-width: 0` acompañante; selectores
   genéricos por etiqueta (`table`, `input`, `button`) ya existentes en el
   archivo que un elemento nuevo hereda sin querer; grid/flex con hijos de
   `aspect-ratio` sin `min-width: 0` en los ítems; reglas sin prefijo de tema
   en `css/app-shell.css` que fijan `font-size`.
4. Si nada de eso aparece, recién ahí mirar el propio elemento señalado.

AL AGREGAR una tabla/caja/sección nueva (prevención):
- Toda `<table>` nueva lleva `min-width: 0` explícito en su propio selector.
- Todo texto de longitud variable dentro de flex/grid necesita
  `min-width: 0` en su propia celda/columna.
- Todo grid/heatmap de celdas con `aspect-ratio` fijo necesita `min-width: 0`
  en el contenedor Y en cada celda.
- Antes de dar por buena una compactación de tamaños en mobile, confirmar con
  `overflow-x: hidden` temporal que el padre no se desborda por otra causa.

---

**PROTOCOLO DE MONEDA SECUNDARIA (leer antes de agregar o tocar cualquier
monto en dólares en la UI)**

Cualquier monto en dólares que se muestre en la UI (texto plano, tarjeta,
pill, tabla, preview, tooltip, etc.) debe ir acompañado de su equivalente en
la moneda secundaria configurada (`settings.currencyLabel`/
`settings.exchangeRate`), salvo que el usuario no la tenga configurada (se
omite automáticamente). Aplica sin excepción a montos nuevos que se agreguen
en cualquier sesión futura.

Dos helpers ya existen — usar el que corresponda al layout, sin inventar un
tercero:
- `convertedAmountText(usdAmount)`: devuelve `"≈ L 123.45"` como texto suelto,
  para su propia línea/elemento. Vacío si no hay moneda secundaria.
- `financeConvertedInline(usdAmount)`: devuelve `" (≈ L 123.45)"` ya envuelto
  en `<span class="fin-row-converted-inline">`, para pegarse inline justo
  después del monto en dólares. Vacío si no hay moneda secundaria.

Ambos manejan solos el caso "sin moneda secundaria configurada" — no hace
falta un `if` aparte. Antes de cerrar cualquier cambio que toque un monto en
dólares visible, revisar si ya lleva su conversión; si no, agregarla.

Excepciones conscientes (NO agregar conversión ahí): la exportación CSV/PDF
de contabilidad (documento contable, solo dólares) y los rótulos de tarifa
por minuto (`$0.12/min`, `Gold +$0.03`) — son tasas, no montos ganados.

---

**FLUJO DE TRABAJO CON ESTE REPOSITORIO (leer siempre — regla permanente)**

El usuario **no programa**. No ejecuta scripts, no instala nada, no usa
terminal, no edita código a mano y no verifica nada técnicamente. Toda sesión
futura opera bajo esto, sin excepción:

- **`app.html` + `js/app-main.js` + `js/boot.js` son la app y la única
  fuente de verdad.** El cuerpo vive en módulos ES y el build de producción
  los empaqueta. No existe (ni debe volver a existir) un archivo "congelado"
  de referencia ni un script generador ni verificación "byte por byte".
- **Cualquier cambio a `app.html` o a otro archivo lo hace el agente
  directamente en el repositorio**, con herramientas de archivo seguras. El
  usuario nunca recibe pasos para editar código o ejecutar comandos.
- El agente puede crear commits, hacer push y desplegar a producción cuando
  sea parte natural de la tarea, sin solicitar aprobación adicional.
- El agente principal actúa como orquestador: conserva el contexto global,
  decide arquitectura y alcance, integra resultados y hace la revisión final.
- El trabajo operativo o repetitivo puede delegarse únicamente a Sol 6.1
  con razonamiento Alto, salvo indicación posterior del usuario, en subtareas
  pequeñas y sin duplicar investigación. Se usa la menor
  cantidad de agentes que aporte valor y se revisa cada ronda antes de abrir
  otra.
- Cualquier script de apoyo, prueba, migración o verificación es
  responsabilidad exclusiva del agente. Nunca se convierte en un paso manual
  para el usuario.
- `instrucciones.md` se actualiza directamente junto con el repositorio cuando
  cambia el estado o un protocolo solicitado por el usuario.

---

**PENDIENTES**

No quedan tareas abiertas del refuerzo positivo enumerado en la versión
anterior. Los siete requisitos se completaron en v573; las limitaciones
del apartado siguiente conservan su alcance deliberado.

La revisión de Logros solicitada después quedó terminada en v574: monstruo
y misiones están agrupados en Logros, con tarjetas compactas y todo su
contenido. Inicio conserva las ganancias, la meta y los indicadores del juego.
El texto de estado accesible queda oculto visualmente; los avisos temporales
sí desaparecen. El combo visible y las animaciones reaccionan sin perderse
al repintar ni por timers de llamadas anteriores. Se verifica cada ruta real
manual/automática/pegado en Chrome local con el modelo aislado QA.

Una llamada del día registrada tarde también actualiza vida y tiene impacto
visual, pero conserva la regla existente de no sumar XP si se importa más de
30 minutos después de terminar. El recibo visual se exporta/sincroniza y se
migra a la llamada oficial; no repite efectos al reimportar o recargar.
Históricos, llamadas futuras y Dropped no disparan ese impacto. Off, Sutil
y movimiento reducido mantienen sus límites. Los recorridos QA apuntan al
monstruo en Logros.

**Criterios vigentes y verificación de los siete requisitos:**

1. Micro-feedback: mensajes de llamada normal, larga, Higher Rate y mejor
   pago del día, con conversión monetaria. «Larga» significa **30 minutos o
   más**, criterio elegido explícitamente en esta implementación, no un
   umbral previamente acordado. Los mensajes combinan hechos cuando coinciden.
   Se verificaron manual/en vivo/importación, reemplazo oficial, recarga,
   elegibilidad, duplicados, sellado y tope de XP.
2. Hitos monetarios: 25/50/75/100% con marcas y próximo hito en Ganancias de
   hoy. Cada hito se registra una sola vez por día contable. Cruces múltiples
   se agrupan en un aviso; meta cero no genera hitos. Cambiar la meta,
   corregir o borrar llamadas conserva las celebraciones ya registradas,
   mientras el próximo hito refleja las ganancias actuales. Al arrancar se
   registran silenciosamente los hitos de datos anteriores. El render solo
   consulta el progreso, sin conceder celebraciones ni alterar el dinero.
3. Pausas: iniciar Break/Lunch reinicia el combo y conserva la racha. El
   regreso puntual concede hasta 5 XP mediante recibo, con la tolerancia
   existente de cinco minutos para inicio y duración. Volver al iniciar una
   llamada también cuenta; cerrar el turno durante la pausa no equivale a
   regresar. Una continuación accidental revoca el premio anterior y vuelve
   a evaluar el regreso definitivo. Se probaron idempotencia y reconciliación.
4. Dificultad automática: Dropped recibe apoyo como máximo una vez por día,
   sin XP ni penalización nueva; una llamada productiva posterior registra
   recuperación. Una hora sin llamadas mide trabajo real dentro de los
   bloques Work y del turno abierto, excluyendo pausas, interrupciones y
   llamadas en curso. No avisa en Break, fuera del horario o con turno cerrado.
   El recibo impide spam/recarga y se rearma tras una nueva llamada. Se
   conservaron los cálculos generales de adherencia y racha: un día que no
   cumpla el plan puede seguir fallándolos; el mensaje de apoyo no los altera.
5. Sorpresa: sorteo del 15% por llamada elegible, guardando también el
   resultado no ganador. Otorga hasta 5 XP extra y comparte cofre/recibos
   existentes sin sustituir las cajas de hitos. Se respeta sellado/tope;
   corregir o eliminar una llamada revoca el XP indebido sin repetir el azar.
   El reemplazo provisional/oficial migra el recibo. Pruebas con azar fijo.
6. Cierre: el modal existente incluye hasta tres evidencias reales y una
   proyección de racha solo si corresponde, condicionada a cumplir mañana.
   Si hay menos evidencia, no se inventan frases. El refuerzo personal solo
   muestra su cierre amable cuando el juego está apagado. No hay cierres
   automáticos duplicados y el premio físico espera a cerrar el resumen.
   Los importes del resumen usan la moneda secundaria vigente al consultarlo.
   El cierre nocturno conserva la proyección del día contable; las correcciones
   históricas no proyectan rachas nuevas. Cerrar siete días, restaurar backup
   y reabrir el turno conserva y revoca correctamente XP/escudo/metadatos.
7. Intensidad/accesibilidad: catálogo común de variantes y canal de mensajes
   personales/juego compartido. Sutil no usa partículas; Arcade conserva
   efectos en hitos/récords; Off silencia avisos, efectos, región accesible y
   modales automáticos, manteniendo progreso interno. Cambiar intensidad no
   activa/desactiva los interruptores ni modifica preferencias por sorpresa.
   Máximo tres toasts visibles; no se repite el último texto consecutivo en
   cola ni en presentación. Movimiento reducido y foco visible respetados.

Todo estado nuevo vive en el modelo game exportable/sincronizado, normalizado
para backups antiguos; QA mantiene el namespace aislado y la nube bloqueada.
El ledger admite hasta 30.000 recibos y los días conservan su límite existente
de 400. El escenario **Refuerzo completo** añade una guía de trece pasos con
llamadas sintéticas, resultados de azar controlados y restauración del estado
real; conserva el recorrido original de ocho pasos.

Verificación actual: 172 pruebas, contratos/ciclos de 21 módulos, wiring y build de
producción sin sourcemaps. Auditoría de dependencias de producción sin alertas.
Chrome local con datos QA: recorrido completo, claro/oscuro, 390 y 1365 px sin
overflow, foco de teclado, movimiento reducido y recarga sin cambiar recibos.
Esto **no** certifica una sesión autenticada de producción. No se reprodujo
un mockup externo no disponible: se reutilizaron componentes y tokens existentes.

**LIMITACIONES CONOCIDAS** (alcance reducido a propósito, no son bugs)

- Los premios físicos son compromisos personales: la app registra que el
  usuario marcó uno como realizado, pero no comprueba la actividad ni hace
  compras o pagos automáticos.
- Se pueden configurar hasta 60 premios y mantener 100 pendientes. Al llenar
  la cola no se descartan premios: los nuevos hitos conservan su progreso y
  pueden generar un premio en un evento posterior cuando haya espacio.
- La Proyección del ciclo de Inicio muestra siempre el ciclo ACTUAL
  (`reportsCycleProjection()`/`cycleGoalPace()` fijadas al offset 0); se
  esconde sola al navegar a otro ciclo.
- El tema elegido en la landing se guarda en la misma clave que usa la app,
  así que la app abre con él — salvo que la nube traiga otro `theme`
  guardado, en cuyo caso gana la nube (correcto: es la fuente de verdad de
  los ajustes) y solo puede notarse la primera vez que se entra desde un
  navegador nuevo.
- El aviso "Dos versiones distintas de tus datos" solo sale ante una
  divergencia REAL entre dos dispositivos (nunca se mezcla sola porque
  inventaría un día de trabajo que no existió) — todo lo demás se resuelve
  sin preguntar.
- El preview de "Próximos pendientes" en Ganancias de hoy muestra el balance
  GLOBAL acumulado de Finanzas, no algo que nazca/se resetee por día — es
  consciente, pese a la inconsistencia visual de mostrarlo en una vista
  rotulada "de hoy".
- Turno sin cerrar antes de medianoche: `dayShiftSessions` solo empareja
  eventos del día consultado y del ANTERIOR, nunca del siguiente. Se dejó así
  a propósito para no romper el caso mucho más común de "olvidé cerrar ayer y
  hoy arranqué un turno nuevo".
- Código muerto conocido, no borrar sin pedirlo: 13 ids que
  `renderDayStatsCards()` sigue escribiendo pero que ya no existen en el
  HTML (protegidos por `if (el)`, inofensivos salvo el costo de recalcular
  cada segundo); un `Set` de fechas futuras en `renderHigherRateDayStats()`
  que se arma y no se usa; `stats.possiblePauseTotal` calculado y expuesto
  pero sin ningún render que lo lea; en el sidebar, los `<span>` de flecha
  (`.sidebar-link-arrow`) y punto (`.sidebar-link-dot`) siguen en el HTML de
  cada link con `display:none` fijo por CSS — se dejaron para no tocar el JS
  que los togglea.
- Importación: `parseCalls` guarda `pay` tal como viene en el texto pegado,
  sin clampear negativos (a diferencia del editor/modal manual, que sí lo
  hacen) — no se tocó a propósito porque cambiaría `callDedupeKey` y con eso
  la detección de duplicados de llamadas ya guardadas.
- `parseMoney` trata la coma como separador de miles: `"12,50"` da 1250, no
  12.50. Alcanzable en los campos de texto de Finanzas; en la práctica casi
  siempre lo frena el tope de Disponible.
- Higher Rate: editar la fecha o el horario de una ventana congela el bono ya
  ganado por las llamadas que calificaban antes del cambio (a propósito).
  Efecto secundario: corregir una hora mal tecleada deja el bono viejo
  pegado además del nuevo.
- Una llamada en vivo sigue redondeando a 1 min como mínimo
  (`buildLiveCallCandidate`); el importador y los modales sí aceptan 0 min.
- Cambiar el ancla del ciclo de pago mueve el inicio de TODAS las semanas
  (`startOfCycleWeek`), incluidas las claves de "Semana específica" — se
  re-anclan solas por el centro de la semana vieja, pero un movimiento grande
  del ancla puede dejar una semana personalizada cubriendo un día distinto en
  los extremos.

---

**ESTADO ACTUAL**

La aplicación funciona en producción con estas bases vigentes:

- Cuenta, datos y llamadas sincronizados con Supabase bajo RLS; el repositorio
  de GitHub es privado y Vercel publica únicamente el build de `public/`.
- `app.html`, `js/app-main.js` y `js/boot.js` son la fuente principal;
  `js/app-context.js` concentra el estado compartido y los módulos de página
  reciben sus dependencias sin ciclos. Rollup/Terser genera el bundle sin
  sourcemaps ni módulos fuente navegables.
- La PWA precarga el shell crítico completo. Telemetría con límites por IP y
  global, backup diario, exportación y borrado de cuenta permanecen activos.
- Turnos, llamadas, Horario, Higher Rate, Finanzas, Reportes, Calendario,
  Adherencia y la gamificación «El Monstruo» están integrados.
- La versión actual es 574. Los siete pendientes de refuerzo positivo y
  la revisión de Logros están terminados; sus criterios figuran arriba.

---

**ÚLTIMOS FIXES (máx. 3, los más recientes)**

**v574** — Logros compacto y reacción visible del monstruo.

- Monstruo y misiones agrupados debajo del resumen de Logros. Menos altura,
  sprite y placas pequeños, recompensa individual en texto y paneles con
  espaciado compacto; se conserva el contenido y la misma vista responsive.
- Corregida la región accesible que mostraba permanentemente «Armadura rota»
  arriba de la app. El anuncio queda disponible al lector de pantalla y los
  toasts visibles desaparecen. El encabezado ya no desborda en tablet por
  el ancho intrínseco de su celda.
- Los efectos usan el SVG vigente. Combo incluido en la clave del render,
  impacto preservado al repintar y timers protegidos para llamadas seguidas.
  Apagar la intensidad retira cualquier impacto pendiente.
- Llamadas actuales tardías tienen evidencia visual sin XP nuevo; recibo
  idempotente y migrable a la oficial. Se conservan elegibilidad, tope,
  ganancias, metas y adherencia. Históricos/futuros/Dropped no simulan daño.
- Verificadas 172 pruebas, build y wiring de 21 módulos. Chrome local con
  rutas reales: formulario manual, guardado automático y textarea de pegado,
  además de ambos temas, escritorio/tablet/móvil y movimiento reducido.
  La revisión usa datos QA aislados, no una sesión autenticada de producción.

**v573** — Refuerzo positivo completo e idempotente.

- Completados los siete requisitos: micro-feedback, hitos monetarios,
  regreso puntual, apoyo automático, sorpresa, cierre con evidencia e
  intensidad/accesibilidad comunes. Los motores financieros, metas y
  adherencia conservan sus cálculos.
- Nuevos módulos pequeños de textos/notificaciones y reglas de refuerzo;
  recibos persistentes con migración de identidad provisional/oficial,
  normalización para backups anteriores y correcciones sin premios repetidos.
- Corregidos los casos de pausas reabiertas, regreso mediante llamada en
  vivo, sorteo al tope, horarios nocturnos y referencias de entradas del día
  durante la normalización. El modo Off conserva el progreso interno.
- QA incorpora Refuerzo completo (trece pasos) y mantiene el tour original.
  Los eventos posteriores a la pausa tienen fechas reales posteriores a ella;
  el azar controlado existe únicamente en este escenario local.
- Verificadas 166 pruebas, build y wiring de 21 módulos. Revisión local en
  Chrome: temas claro/oscuro, móvil/escritorio, teclado, movimiento reducido,
  todos los hitos, recuperación, cofre, cierre y recarga sin duplicados.
  La revisión visual fue sintética/local, no autenticada en producción.
- Por indicación del usuario, cualquier delegación futura usa únicamente
  Sol 6.1 con razonamiento Alto, salvo que indique otra cosa.

**v572** — Configuración en Logros y laboratorio guiado.

- Gamificación, refuerzo positivo y Laboratorio QA se agrupan en paneles
  plegables de Logros, fuera de Ajustes. «Plan del día» vive dentro del
  editor de gamificación, conserva el bloqueo tras la primera llamada y
  permanece oculto cuando el juego está apagado.
- El interruptor de gamificación es la única opción de activación; la
  intensidad conserva Sutil y Arcade y sigue reconociendo backups antiguos
  con intensidad `off`.
- Se puede guardar un nombre personal para el monstruo diario. Dejarlo
  vacío conserva los nombres del catálogo; las especies, accesorios,
  cálculos y recompensas no cambian.
- QA usa horarios de demostración independientes, IDs únicos y un día
  activo con llamadas progresivas e historial precargado. Se corrigió el escenario que aparecía vacío cerca
  de medianoche por seleccionar hoy aunque sus muestras pertenecían a ayer.
- El recorrido guiado demuestra llamadas, cierre positivo, recuperación,
  constancia, pausas, premios y cierre del turno mediante los motores
  existentes. Sus preferencias y progreso son locales al namespace QA;
  reiniciar o salir recarga la app para descartar callbacks transitorios.
- La normalización de fechas del juego ya no depende del contexto que se
  configura después de cargar el estado. Un historial guardado podía lanzar
  un error durante el arranque y activar el fallback vacío; ahora se conserva
  al cargar y recargar. Las sesiones QA antiguas muestran cómo abrir la guía.
- Se corrigió el bono de XP que escribía una entrada obsoleta después de
  recalcular el día. Conserva las reglas de bloqueo y tope; las cajas ya
  registran el bono concedido en la entrada vigente sin duplicarlo.
- Verificados 120 tests, contratos/ciclos de 19 módulos, wiring de UI y
  build de producción sin sourcemaps; auditoría de dependencias sin alertas.
  En una demostración local aislada se comprobó el recorrido completo,
  recarga sin duplicados, bono de caja persistente, pausa/premios, cierre
  del turno y salida/restauración. Controles QA y guía revisados en móvil;
  esta comprobación no usó una cuenta autenticada de producción.
