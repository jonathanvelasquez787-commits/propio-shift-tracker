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
- El trabajo operativo o repetitivo puede delegarse a Luna con razonamiento
  máximo, en subtareas pequeñas y sin duplicar investigación. Se usa la menor
  cantidad de agentes que aporte valor y se revisa cada ronda antes de abrir
  otra.
- Cualquier script de apoyo, prueba, migración o verificación es
  responsabilidad exclusiva del agente. Nunca se convierte en un paso manual
  para el usuario.
- `instrucciones.md` se actualiza directamente junto con el repositorio cuando
  cambia el estado o un protocolo solicitado por el usuario.

---

**PENDIENTES**

Ninguno conocido.

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
- La versión actual es 572. Las mejoras nuevas se documentan como pendientes
  actuales.

---

**ÚLTIMOS FIXES (máx. 3, los más recientes)**

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

**v571** — Refuerzo positivo personal y elección explícita de gamificación.

- Las cuentas nuevas arrancan con «El Monstruo» y el refuerzo positivo
  desactivados. Ambas preferencias se guardan por usuario; las elecciones
  existentes de gamificación se conservan.
- Inicio muestra evidencia de llamadas completadas, cierres positivos,
  aprendizajes y recuperaciones cuando se activa el refuerzo. Al guardar una
  llamada manual o en vivo se puede registrar un cierre breve sin puntos
  negativos; las importaciones se cuentan sin abrir un modal por fila.
- El catálogo ofrece 16 premios de Break, Lunch y fin del turno, incluido
  progreso acumulable. Cada usuario puede agregar o editar premios con
  disparador, frecuencia, hitos, duración, costo y límite diario.
- Los premios se ganan con llamadas, recuperación o meta diaria y esperan a
  una ventana segura. Se pueden realizar, cambiar o guardar; el presupuesto
  semanal opcional impide marcar como realizado un premio que lo exceda.
  Logros muestra el historial y un botón en Inicio permite reabrir premios
  durante la pausa o después del turno.
- «Plan del día» ya respeta `hidden` al apagar la gamificación; sus controles
  quedan inactivos. Reiniciar solo la gamificación preserva premios personales.
- ACW deja de ser una tarjeta de resumen y se muestra como tiempo en la línea
  final de cada bloque de trabajo, junto a los minutos usados, sin barra propia.
  Se excluyen pausas y huecos clasificados como «Otro».
- Sustituir una llamada en vivo por su importación oficial conserva su evidencia
  positiva. La recuperación exige una llamada posterior; realizar o cambiar un
  premio vuelve a validar la pausa/fin del turno y conserva el límite de origen.
- Verificados 108 tests, normalización, recompensas idempotentes, presupuesto,
  ventanas seguras, cálculo ACW, contratos/ciclos de 18 módulos, wiring de UI y
  build de producción sin sourcemaps; auditoría de dependencias sin alertas.

**v570** — Laboratorio QA reversible y enfoque diario en contexto.

- Ajustes incorpora un Laboratorio QA con tres escenarios: recorrido completo,
  victoria próxima y cofres/recompensas. Los fixtures viven en un namespace
  local separado y nunca pisan las llaves reales.
- Entrar a QA fuerza primero cualquier subida pendiente; durante la sesión se
  bloquean debounce, subida manual, visibilidad, reconexión y `pagehide`, y el
  arranque evita consultar/adoptar datos de nube.
- Salir de QA elimina únicamente el namespace de prueba: los datos reales se
  preservan byte a byte. Otras pestañas recargan al cambiar el marcador para
  no editar accidentalmente el estado equivocado.
- Un banner persistente y el estado del sidebar dejan claro que la nube está
  pausada; cerrar sesión restaura primero el estado real.
- Equilibrio/Calidad/Cuidado se movió de la grilla de Misiones a un bloque
  "Plan del día" junto a las acciones de llamada. Misiones conserva solo el
  enfoque activo y las tres armaduras, reduciendo competencia visual.
- Verificados 100 tests, aislamiento/restauración QA, contratos/ciclos de 16
  módulos, wiring de UI y build de producción sin sourcemaps.
