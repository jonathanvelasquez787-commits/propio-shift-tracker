**NOTA DE MANTENIMIENTO DE ESTE ARCHIVO (leer antes de editar este .md)**

Este archivo tiene dos partes:

1. **PROTOCOLOS** (de "ESTILO DE LAYOUT" a "FLUJO DE TRABAJO CON ESTE
   REPOSITORIO"). Reglas permanentes — casi no cambian, y NO se tocan al
   cerrar una versión. Solo se editan si el usuario pide explícitamente
   modificar un protocolo.
2. **ESTADO DEL PROYECTO** (de "ESTADO DEL ROADMAP" en adelante). Roadmap,
   pendientes, limitaciones conocidas y el historial de las últimas
   versiones. Esta parte SÍ se reescribe en cada versión nueva:

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
  fuente de verdad** (hasta v554 era solo `app.html`; desde la Fase 3 —
  módulos ES nativos, sin build — el cuerpo de la app vive en
  `js/app-main.js`, ver ESTADO DEL ROADMAP). No existe (ni debe volver a
  existir) un archivo "congelado" de referencia ni un script generador ni
  verificación "byte por byte".
- **Cualquier cambio a `app.html` (o a cualquier otro archivo del repo) lo
  hace Claude directamente**, con sus propias herramientas de archivo, a
  partir del contenido que el usuario pega o sube en la conversación. Nunca
  se le entregan al usuario instrucciones tipo "busca X, reemplaza por Y en
  el editor de GitHub" — eso es pedirle que edite código.
- **Regla permanente (v546): toda entrega de un cambio a este repo se hace
  como archivo(s) completo(s) ya editado(s), listo(s) para reemplazar tal
  cual en GitHub** (arrastrar encima del existente o pegar con el ícono de
  lápiz + "Commit changes"). Nunca una lista de instrucciones de edición
  manual para que el usuario las aplique él mismo, salvo que el propio
  usuario pida explícitamente solo la lista de cambios sin los archivos.
- **Si un archivo es demasiado grande para reproducirlo de forma confiable
  solo a partir del texto pegado en el chat** (alto riesgo de error de
  transcripción en un archivo de miles de líneas), Claude lo dice
  explícitamente y pide que ese archivo puntual se suba como adjunto real
  (arrastrado al chat), para poder editarlo con herramientas de archivo que
  garanticen que solo se tocan las líneas necesarias. Esto no es un permiso
  para pedirle al usuario que edite nada — solo que suba el archivo tal cual
  ya lo tiene.
- Si el archivo se puede pegar o subir sin ese problema de tamaño, se sigue
  como siempre: se pega/sube en el chat, Claude lo edita, y entrega el
  archivo completo.
- Cualquier script de apoyo (generadores, verificadores, migraciones de este
  `.md`, etc.) es responsabilidad exclusiva de Claude: si hace falta uno, lo
  ejecuta él mismo — nunca se entrega como algo que el usuario deba correr.
- Si en el futuro se reintroduce alguna prueba automática, es una
  herramienta que Claude corre o interpreta por su cuenta cuando tenga el
  entorno disponible — nunca un paso manual del usuario.
- Este archivo (`instrucciones.md`) sigue la misma regla: cuando haga falta
  editarlo, Claude entrega el .md completo, nunca una lista de cambios para
  pegar a mano — salvo que el usuario pida explícitamente solo eso.

---

**PENDIENTES**

Sin pendientes técnicos abiertos en las fases 4 y 5. El cambio de visibilidad
del repositorio se completa en GitHub como último paso operativo porque afecta
quién puede acceder al código fuente.
- **Fase 6 (El Monstruo): sin código todavía.** El mockup de la Arena
  (monstruo a la DERECHA, arcade feroz, claro y oscuro) está hecho y espera
  aprobación explícita del usuario antes de escribir HTML/CSS/JS. Faltan por
  mockupear: modo "Solo sutil", jefe del ciclo y bestiario.

**LIMITACIONES CONOCIDAS** (alcance reducido a propósito, no son bugs)

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
  que los togglea, ver v552.
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

**ESTADO DEL ROADMAP A PRODUCCIÓN**

Fases 0 (proceso de trabajo), 1 (Supabase: tablas, RLS, triggers, alta/login
reales) y 2 (landing pública, los 3 métodos de login, páginas legales) están
**cerradas y funcionando en producción**, verificado por el usuario.

Pendientes, en orden:
- **Fase 3 — Modularizar (CERRADA; Finanzas, Reportes, Calendario, Horario,
  Llamadas, Higher Rate y Ajustes ya partidas).** Se resolvió el
  bloqueo original
  ("cómo se entrega sin build"): módulos ES **nativos**, sin bundler — mismo
  patrón que ya usan `js/auth.js`/`js/sync.js`, cero comandos de terminal
  para el usuario. `js/boot.js` ya no inyecta un `<script>` clásico desde
  `#appMainScript` — hace `import()` dinámico de `js/app-main.js` (solo se
  ejecuta la primera vez que se llama, sigue sirviendo de gate), precargado
  con `<link rel="modulepreload">` en el `<head>` (también para
  `js/finance.js`, `js/reports.js`, `js/calendar.js`, `js/schedule.js`,
  `js/calls.js`, `js/higher-rate.js` y `js/settings.js`) para que no espere red.
  Cada extracción se hizo con ayuda del parser de `typescript` (ya
  estaba disponible en el entorno) para detectar con precisión qué usa cada
  bloque desde afuera y qué necesita el resto del archivo desde el bloque —
  no a mano ni a ojo, dado el tamaño del archivo. Arquitectura confirmada:
  **hub-and-spoke** — los módulos de página solo importan de `js/app-main.js`,
  nunca entre sí. Patrón para variables
  `let` de estado de vista (`reportsMonthlyOffset`, `calMonthOffset`,
  `calViewMode`, `calYearOffset`): si algo FUERA de la página también
  reasigna esa variable (ej. los botones prev/next/hoy, que viven en el
  wiring centralizado de la app), la variable se queda declarada en
  `js/app-main.js`. Si la página misma TAMBIÉN necesita reasignarla (no solo
  leerla — pasó con `calMonthOffset`/`calViewMode` en Calendario, que las
  cambia al saltar de la vista año a la vista mes), `js/app-main.js` expone
  además una función `setX()` que la página importa y llama en vez de
  reasignar directo (un módulo no puede reasignar algo que solo importó).
  La extracción de páginas está completa. `state` se exporta desde
  `js/app-main.js` porque Llamadas y Ajustes lo necesitan.
- **Fase 4 — Protección del código fuente (CERRADA).** El gate de sesión,
  licencia, términos y privacidad siguen activos. Rollup empaqueta la app y el
  cliente estable de Supabase; Terser minifica sin sourcemaps y Vercel publica
  solo `public/`, no los módulos fuente de `js/`. La CSP ya solo permite scripts
  del mismo origen. El motor de Adherencia permanece en el cliente por decisión
  de producto: moverlo quitaría el funcionamiento offline, una promesa central
  de la app, sin impedir que alguien observe el resultado ejecutado. Los
  agregados futuros pueden salir de la tabla normalizada de llamadas. Se
  mantienen descartados el bloqueo de click derecho, F12 y los ofuscadores.
- **Fase 5 — Producción y resiliencia (CERRADA).** `calls` vive en tabla propia
  con RLS y sincronización por deltas; estado, ajustes, lotes y filas tienen
  límites de tamaño. La app es instalable y conserva su shell offline mediante
  service worker. El monitoreo es propio en Supabase para no enviar horas,
  dinero ni navegación a Sentry u otro tercero. Hay rate limiting persistente
  para login y telemetría, y un backup diario con 30 días de retención. Borrado
  de cuenta y exportación de datos continúan disponibles.
- **Fase 6 — El Monstruo (gamificación).** Ver sección siguiente. Módulo
  nuevo `js/monsters.js` (hub-and-spoke, importa solo de `js/app-main.js`),
  precargado con `modulepreload` en `app.html`.

---

**FASE 6 — GAMIFICACIÓN (EN DISEÑO)**

**Estado.** Solo hay mockups exploratorios y este mapa. Ninguna línea de
código se toca hasta que (1) este mapa esté aprobado, (2) cada pantalla tenga
su mockup visual claro+oscuro aprobado (protocolo de layout). Mockups ya
vistos por el usuario: chips/avisos/Ajustes, tarjetas racha-nivel-combo-caja,
llamada terminada + STAGE CLEAR + cofre, y la Arena en claro y oscuro con el
monstruo a la derecha. Aún falta la aprobación explícita del conjunto y los
mockups indicados al final de esta sección.

**Concepto central acordado: el monstruo del día.** La barra de "jefe final"
pasa a ser un monstruo pixel-art con personalidad que reacciona a cada
llamada (ver sección "EL MONSTRUO" más abajo). Es la pieza principal de
Inicio; casi todo lo demás del mapa (misiones, fantasma, Modo Estrella,
combo, estrellas) cuelga de él. Tono decidido: arcade feroz. La Arena ya tiene
mockup en claro y oscuro, con el monstruo a la derecha.

**Objetivo del usuario.** Que terminar una llamada dé un golpe de dopamina,
que cerrar el turno dé ganas de volver mañana, y que tomar llamadas se sienta
adictivo — sin que la app empuje a trabajar de más.

**Dirección visual acordada: dos capas.**
- *Capa sutil (siempre, con Gamificación activada):* chips, números, barras y
  avisos chicos con el lenguaje visual normal de la app (`ic-svg`, tokens de
  tema). Sin sonido, sin efectos de pantalla.
- *Capa arcade (SOLO al lograr algo):* fuente pixel, borde grueso, sombra
  dura, confeti/pixel, sonido. Se dispara únicamente en: subir de nivel,
  STAGE CLEAR, abrir cofre, récord, jefe final derrotado, escudo ganado.
- Ajuste "Intensidad": *Solo sutil* / *Arcade en logros* (default propuesto) /
  *Desactivada*. Con `prefers-reduced-motion` no hay animación en ningún
  modo; los sonidos usan `settings.masterVolume` (mismo control de Avisos).

**Reglas de diseño (no negociables salvo que el usuario diga lo contrario).**
1. Nada resta XP ni baja de nivel. Fallar una misión solo muestra cuánto
   faltó (dato exacto, sin tono de castigo).
2. Nada da puntos por alargar el turno: la productividad puntúa hasta la
   meta del día, nunca por tiempo conectado extra. Tope de XP diario visible
   (propuesto 150).
3. Un día libre no rompe la racha (reutiliza `settings.streakSkipOffDays`);
   los escudos cubren un día fallado.
4. El cofre no caduca: si no trabajas mañana, espera.
5. Importaciones históricas/tardías (`callImportFlag`) no dan XP. Pegar o
   agregar a mano solo da XP si la llamada es del día actual.
6. Descartar una llamada en vivo: sin XP y sin castigo.
7. Horario es configuración: no da puntos.
8. Todo monto en dinero del juego lleva su conversión (protocolo de moneda
   secundaria).
9. Un monstruo derrotado se queda derrotado: no aparece uno nuevo ni da XP
   nuevo ese día. Lo ganado después es "botín extra" (solo dinero, sin
   puntos). Derrotarlo no es una razón para seguir trabajando.
10. Descansar es seguro: con Break/Lunch activo el monstruo duerme, no se
   cura ni se enoja, y no pasa nada en contra del usuario.

**EL MONSTRUO (concepto central de Inicio)**

*Qué es.* Un monstruo por día, dibujado en pixel-art, cuya vida es la meta
diaria en dólares. Cada llamada guardada le pega; al llegar a 0 se derrota,
suelta botín y el día queda "ganado". Reemplaza al "jefe final" como barra
de vida simple: misma lógica, con cara y reacciones.

*Vida y daño.*
- Vida máxima = `effectiveDailyGoal(dayKey).usd`. Vida actual = meta menos
  ganancias del día (`importedCallStats().earnings`, ya incluye bono Higher
  Rate). Sin meta > 0 no hay monstruo (se queda la tarjeta de meta normal).
- La vida se CALCULA desde los datos del día, igual que el XP (ver "Cómo se
  calcula"): editar, borrar o importar una llamada recalcula la barra sin
  inflar nada. Lo que sí es un evento es la animación de golpe, y solo se
  dispara cuando un guardado nuevo tiene éxito (`autoSaveLiveCall`,
  `saveManualCall` de hoy); si el guardado falla no hay golpe.
- Golpe = número flotante con lo que pagó la llamada, con su conversión:
  "-$1.68 (≈ L 45)".

*Estados y reacciones.*

| Estado | Cuándo | Qué se ve |
|---|---|---|
| Dormido | Sin turno iniciado, o con Break/Lunch activo (`state.activePause`) | Ojos cerrados, "Zzz". Sin cambios de vida ni de humor. |
| Despierto | Turno en curso, vida > 50% | Idle suave (respira). |
| Enojado | Vida ≤ 50% | Cara enojada, más movimiento. |
| Herido | Vida ≤ 25% | Tambalea, grietas. |
| Furia | Ventana Higher Rate activa (`higherRateLiveStatus().active`) | Monstruo dorado, golpes críticos (número dorado + destello). Es el "Modo Estrella" del mapa. |
| Derrotado | Vida = 0 | Explosión pixel + botín una sola vez (capa arcade); después queda tumbado con el botín extra acumulado. |

*Combo = cadena de golpes.* Contador "xN" estilo pelea. Definición exacta
sigue abierta (decisión 2): propuesta de minutos productivos continuos; el
Break/Lunch en horario lo pausa (el monstruo duerme) sin romperlo.

*Las 3 misiones = 3 armaduras.* Cada misión cumplida rompe una pieza de la
armadura del monstruo: (1) minutos productivos ≥ meta, (2) Break/Lunch a
tiempo, (3) Adherencia ≥ `settings.adherenceGoalPct`. Propuesta: estrellas
del STAGE CLEAR = armaduras rotas (1, 2 o 3). Nota: la vida es en dólares y
la armadura 1 es en minutos; pueden divergir (ej. Higher Rate hace derrotar
al monstruo antes de llegar a los minutos). Es intencional, no un bug.

*Fantasma de ayer = su sombra.* Un monstruito gris marca dentro de la barra
dónde ibas ayer a esta misma hora. Solo informativo.

*Tres capas.*
1. **Monstruo del día** (meta diaria), en Inicio.
2. **Jefe del ciclo de 14 días** (`effectiveCycleGoal(0)`, ligado a
   `cycleBoundsForOffset`): enorme, se va agrietando conforme sube el % del
   ciclo. Se muestra en la vista "Ciclo" de "Ganancias de hoy" y en Logros.
   Al llegar al día de pago con la meta cumplida cae y el botín es el pago
   real (con su conversión). Si el ciclo termina sin llegar, "huye herido"
   mostrando el % y lo que faltó — sin castigo y sin XP negativo.
3. **Bestiario** (página Logros): cada monstruo derrotado se colecciona con
   su fecha y estrellas; los que faltan salen como siluetas "???".
   Sustituye a la lista de stickers.

*Variedad.*
- Una especie determinista por día (`weekdayKeyForDayKey`), igual en todos los
  dispositivos: Lunes Perezoso ("Cinco minutitos más…"), Martillo Tuerto
  ("Hoy sí me doy cuenta de todo"), Mediodía Mordedor ("Estoy a la mitad y con
  hambre"), Jueves Jadeante ("Ya casi, ya casi…"), Viernes Furioso y Fantasma
  de Fin de Semana para sábado y domingo cuando se trabaja un día libre.
- Variantes raras: dorado en días con ventana Higher Rate y Rey de la Racha
  con una racha de al menos 7 días.
- Nuevas especies se desbloquean al subir de nivel.
- El botín de la caja "?" y del cofre son monedas de XP cosméticas y accesorios
  para el bestiario (corona, cuernos dorados, bufanda). Nunca representan
  dinero real ni cambian las ganancias; la lista de stickers se retira.

*Intensidad (ajuste existente).*
- *Desactivada:* no hay monstruo, se ve la tarjeta de meta original.
- *Solo sutil:* el monstruo se reduce a un ícono chico junto a la barra de
  vida, sin animación de golpe ni sonido.
- *Arcade en logros:* monstruo completo. El golpe normal es una sacudida
  corta + número flotante; el crítico, la derrota y el STAGE CLEAR llevan
  destello, confeti pixel y sonido. El "pop" del golpe pertenece a esta capa
  arcade; Solo sutil continúa sin sonido.
- Con `prefers-reduced-motion` el monstruo queda quieto pero sigue mostrando
  su estado (cara, grietas, barra). Sonidos: `settings.masterVolume`
  (golpe = pop corto, crítico = más agudo, derrota = fanfarria de ~1 s).

*Cómo se dibuja (sin romper la app).*
- SVG inline hecho de rectángulos (pixel-art), sin imágenes: pesa unos KB,
  hereda colores de los tokens de tema (`--rpt-purple`, `--good`, `--warn`,
  `--bad`; dorado con `--tier-gold`) y convive con `ic-svg`.
- Animaciones solo CSS. `render()` corre cada segundo (ver el `setInterval`
  de `app-main.js`): el SVG NO se reescribe en cada tick — solo cuando cambia
  el estado (rango de vida, humor, dormido/despierto), porque reescribir el
  nodo reinicia las animaciones. Mismo cuidado que ya se tiene con
  `renderHigherRateLiveCard`.
- `role="img"` con `aria-label` que describe el estado ("Monstruo del
  lunes, 40% de vida"); los golpes no van en `aria-live` (los avisos de
  juego ya lo cubren).
- La regla de `prefers-reduced-motion` de `tokens.css` solo cubre las
  páginas públicas: `css/game.css` debe traer la suya.

**MAPA DE UBICACIÓN Y COMPORTAMIENTO**

Inicio (`#pageHome`):

| Pieza | Dónde va | Cuándo aparece | Comportamiento |
|---|---|---|---|
| Chips racha / combo / nivel | Fila `.chips` del hero, después de "ACW/Available" | Racha y nivel siempre; combo solo con combo activo | Tocar cualquiera abre la página Logros. En mobile la fila ya hace wrap; el combo es el primero en ocultarse si no hay combo. |
| XP flotante "+N" | Ancla sobre `#callsStatusCard` (y barra fija `#liveActivityBar` si está visible) | Al guardar con éxito una llamada del día (`autoSaveLiveCall`, `saveManualCall` de hoy) | Sube y se desvanece en ~2 s. Muestra el monto ganado en $ y moneda secundaria. Si el guardado falla (traslape/duplicado) no aparece. |
| Caja "?" / tragamonedas | Misma zona, debajo de la tarjeta de estado | Cada 5 llamadas guardadas del día (contador diario, se reinicia a medianoche) | Se revela en ~1.5 s: moneda de XP cosmética o accesorio del bestiario. No bloquea el botón "Iniciar llamada" (nunca modal). |
| Aviso de récord | Franja bajo `#callsStatusCard`, 3 s | Récord de llamada más larga/pago/racha de la semana | Un solo aviso a la vez; el más importante gana. |
| Monstruo del día ("Arena") | Dentro de "Ganancias de hoy" (vista Hoy), debajo de `#earningsTagsRow` y antes de `.gh-goal-card`; con intensidad distinta de Solo sutil reemplaza visualmente la tarjeta de meta | Siempre que haya meta | Ver sección "EL MONSTRUO". La barra baja conforme sube `goalPct`. Al llegar a 100%: derrota con efecto arcade una vez. Sin meta > 0 no se muestra. |
| Sombra de ayer (fantasma) | Marcador gris dentro de la barra de vida | Si ayer tuvo datos | Posición = lo que llevabas ayer a esta misma hora. Solo informativo. |
| Misiones del día = 3 armaduras (3 fijas) | Bloque nuevo dentro del acordeón "Ganancias de hoy", vista Hoy, entre las etiquetas y "Próximos pendientes" | Todo el día | Siempre las mismas 3: (1) Minutos productivos ≥ meta diaria, (2) cada Break/Lunch tomado dentro de su ventana de gracia de Adherencia, (3) Adherencia del día ≥ `settings.adherenceGoalPct`. Checklist con dato exacto de lo que falta; cada misión cumplida rompe una pieza de armadura del monstruo. Se congelan al hacer STAGE CLEAR. |
| Modo Estrella = Furia del monstruo | Reutiliza `#earningsHigherRateLiveCard` (y la del modal Higher Rate) | Solo dentro de una ventana Higher Rate activa (`higherRateLiveStatus().active`) | Tinte dorado + cuenta regresiva ya existente; el monstruo se pone dorado y los golpes son críticos. Las llamadas que empiezan dentro de la ventana puntúan XP ×1.5 (redondeado hacia arriba), aparte del bono monetario que Higher Rate ya paga. |
| Aviso de escudo/nivel/cofre | Cola de avisos de juego (ver abajo) | Al ocurrir | Ver "Avisos de juego". |

Página nueva **Logros** (sidebar, después de Finanzas, ícono medalla):
- Tarjeta de racha (semana en cuadritos: cumplido / escudo / hoy / libre) con escudos disponibles.
- Nivel: insignia, barra, escalera de niveles y adelanto del siguiente.
- Bestiario (monstruos derrotados con fecha y estrellas; siluetas "???" para los que faltan) y trofeos (E1). Sustituye a la colección de stickers.
- Jefe del ciclo de 14 días con su vida/grietas.
- Temporada de 14 días ligada al ciclo de pago (`cycleBoundsForOffset`).
- Récords personales, cofre pendiente y "Último STAGE CLEAR" (reabrible).
- Ubicación decidida: página propia en el sidebar, después de Finanzas — no acordeón dentro de Reportes, que ya tiene 7+ secciones.

Momentos con modal:
- **STAGE CLEAR** (`#stageClearModal`): se abre al terminar `endShift()` manual, no con cierres estimados por inactividad. Contenido: estrellas, puntaje, comparaciones (ayer y récord, con conversión), misiones, desglose de XP con tope, cofre sellado, adelanto del siguiente nivel. Sin llamadas ese día: versión corta, sin XP. Si el turno se reabre dentro de la ventana de gracia (`ACCIDENTAL_TOGGLE_GRACE_MIN`), el STAGE CLEAR se revoca y se rehace al cerrar de nuevo.
- **Cofre** (`#chestModal`): se abre en el primer `startShift()`/inicio automático del día calendario siguiente al STAGE CLEAR que lo selló. Contiene monedas de XP cosméticas o accesorios del bestiario. Si abres la app sin iniciar turno, sigue sellado.

Avisos de juego:
- Contenedor nuevo `#gameToastStack`, separado de `#toast` (que es único y se pisa) y de los banners inferiores. Arriba, debajo de la barra fija `#liveActivityBar` (respetar `env(safe-area-inset-top)`).
- Cola FIFO, máximo 3 visibles, ~2.6 s cada uno, `pointer-events: none` (nunca bloquean clics), `aria-live="polite"`.
- Si hay un modal abierto se encolan y salen al cerrarlo.

Ajustes (`#goalsModal`): sección "Gamificación" entre "Ciclo de pago" y "Backup de datos": checkbox activar, selector de Intensidad, línea de perfil (nivel, XP, mejor racha, colección) y "Reiniciar progreso" como tarjeta de peligro con confirmación (`appConfirm`).

Botones de la app y su conexión:
- Iniciar/Finalizar shift: puntualidad, abre cofre, STAGE CLEAR.
- Break/Lunch: misión "break a tiempo" y protege el combo.
- Iniciar/Terminar llamada, Pegar (solo hoy), Agregar manual (solo hoy): XP y combo. Descartar: nada.
- Higher Rate: Furia del monstruo (Modo Estrella). Meta diaria: vida del monstruo del día. Ciclo de pago: jefe del ciclo/temporadas. Break/Lunch: el monstruo duerme.
- **E1 Finanzas como logros:** meta cumplida = trofeo + accesorio raro; gasto recurrente pagado a tiempo = XP chico, una vez por gasto y mes (clave `rowId+AAAA-MM`).
- **E2 Huecos clasificados:** `saveGapEditor` da XP chico, una vez por `gapKey`, con tope diario.
- **E3 Reflejos:** iniciar turno dentro de 2 min del aviso "Conéctate ya" (`checkShiftAlarm`) da bonus; requiere guardar la hora en que sonó.
- **E4 Backup semanal:** `exportJSON` una vez por semana da un escudo extra (tope de escudos por definir, propuesto 3).
- Sin puntos a propósito: Horario, Descartar llamada, importaciones históricas.

**Cómo se calcula (decisión de diseño propuesta).** El XP del día se CALCULA
desde los datos del día (llamadas, pausas, adherencia), no se acumula evento
por evento. Lo flotante en vivo es una proyección; el XP se congela al hacer
STAGE CLEAR. Así editar, borrar, importar o sincronizar entre dispositivos no
permite inflar puntos ni deja XP fantasma. El nivel es la suma de los XP
congelados más bonos del cofre/E1–E4 (esos sí se registran por evento, con id
idempotente).

**Datos y sincronización.** Se guarda en `state.game` (dentro de la clave
`STORAGE_KEY`), que ya viaja en `user_data.state` sin migración ni cambio de
`schema_version` (campo aditivo; `defaultState()`/`normalizeStateObject()`
deben incluirlo). Forma propuesta: `{ totalXp, level, shields, bestStreak,
accessories[], trophies[], chest: {pending, sealedOn}, days: { 'MM/DD/AAAA':
{ xp, stars, missions, monster: { species, variant, defeated, hpPct } } }, ledger: {idBono: true} }` (la especie es determinista por día; `monster` se congela en el STAGE CLEAR y alimenta el bestiario). `days` se poda a ~400
días. El resto (intensidad, activar/desactivar) va en `settings.game`.
Conflicto entre dispositivos: usa el flujo existente de "elige cuál se
queda", sin merge.

**Piezas técnicas.**
- Módulo nuevo `js/game.js` (hub-and-spoke: solo importa de `js/app-main.js`) y `css/game.css`; se incorpora al entrypoint de Rollup y a la verificación de imports/exports, sin publicar el módulo fuente.
- `computeComplianceStreak` y `dayComplianceStatus` viven en `js/reports.js` sin exportar: exportarlas y reexportarlas desde `js/app-main.js` (patrón ya usado) para que game.js las reutilice; no duplicar la lógica de racha.
- `app-main.js` llama a hooks de game.js en: `startShift`, `endShift`, `autoSaveLiveCall`/`saveManualCall`, `endPause`, `saveGapEditor`, `exportJSON`, `checkDayRollover` y las acciones de Finanzas.
- Sprites de monstruos: módulo hoja `js/monsters.js` (solo datos y una función que devuelve el SVG por especie/estado/variante, sin imports), importado por `js/game.js`; así la verificación de imports/exports lo alcanza sin excepciones al patrón hub-and-spoke. Ver "Cómo se dibuja".
- Íconos: `flame`, `zap`, `medal`, `star`, `lock`, `check` ya existen en `ICON`; faltan escudo, trofeo y caja/regalo. El mockup usó íconos Tabler que la app no tiene: en el código real se usan solo `ic-svg`.
- Fuente pixel local o fallback monoespaciado, sin agregar orígenes externos a la CSP. Solo para textos cortos.
- Tema: paletas de `app.html` (claro índigo/morado, oscuro cian sobre azul marino); nada de colores nuevos fuera de tokens salvo el dorado del juego.

**DECISIONES ABIERTAS (bloquean los mockups siguientes).**
1. Criterio de estrellas: propuesto (nuevo) = armaduras rotas, 1 a 3. Alternativa anterior: 1 = cerrar turno, 2 = meta diaria, 3 = meta + adherencia.
2. Definición exacta del combo (propuesto: minutos productivos continuos; Break/Lunch en horario lo pausan sin romperlo; se rompe con hueco "Otro" o desvío de adherencia mayor a la gracia).
3. Página Logros propia vs. sección dentro de Reportes.
4. Intensidad por defecto ("Arcade en logros" propuesto).
5. Multiplicador de Modo Estrella (propuesto ×1.5) o solo visual.
6. Reparto del tope de 150 XP entre adherencia/puntualidad/productividad/llamadas, curva de niveles, lista de accesorios y frecuencia de la caja "?".
7. Tope de escudos y cómo se ganan además de E4.
8. ~~Tono del monstruo~~ **RESUELTO: arcade feroz** (jefe de videojuego: cuernos, dientes, mirada enojada, armadura, fuente pixel, golpes con peso). Las frases y nombres de especies siguen ese tono.

**DECISIONES RESUELTAS 9-13.** Las especies y frases quedan fijadas en
"Variedad"; Rey de la Racha aparece desde 7 días. Cofre y caja entregan
monedas de XP cosméticas y accesorios del bestiario. El jefe incompleto huye
herido. El pop pertenece solo a la capa arcade. La Arena va debajo de
`#earningsTagsRow`, antes de `.gh-goal-card`, y reemplaza visualmente esa
tarjeta cuando la intensidad no es Solo sutil.

**Mockups pendientes, en este orden.** (1) Inicio en modo Solo sutil, chips,
misiones/armaduras, sombra de ayer y jefe del ciclo; (2) página Logros con
bestiario y jefe del ciclo; (3) Ajustes: sección Gamificación; (4) cola de
avisos en claro/oscuro/mobile; (5) aprobación final de la Arena, STAGE CLEAR y
cofre ya hechos.

---

**ÚLTIMOS FIXES (máx. 3, los más recientes)**

**v566** — Fases 4 y 5 cerradas.

- Build de producción con Rollup + Terser, cliente Supabase 2.117.2 local,
  módulos minificados sin sourcemaps y CSP limitada a scripts propios.
- Llamadas normalizadas con RLS y sincronización por deltas; límites de tamaño,
  rate limiting persistente, telemetría privada y backup diario.
- PWA instalable con service worker. El motor de Adherencia queda local para
  preservar el funcionamiento offline; no se envían datos a Sentry.
- Verificados 14 tests, imports/exports de 11 módulos, sintaxis y build completo;
  el bundle no contiene rutas `/js/`, jsDelivr ni `sourceMappingURL`.


**v564** — Content Security Policy activada.

- `vercel.json` pasa de observación a `Content-Security-Policy` efectiva; el
  navegador bloquea scripts, conexiones y recursos fuera de la lista permitida.
- Prueba real completada con la cuenta existente: Google + retorno OAuth, carga
  de perfil y datos, cambio/restauración del tema con "Guardado en la nube",
  activación del sonido y generación del reporte PDF. Sin errores ni avisos del
  navegador. No se enviaron contraseñas ni correos de recuperación.
- La documentación y las pruebas automáticas reflejan la política activa.


**v563** — Tokens de temas consolidados y preparación de CSP.

- Los colores, superficies y sombras finales viven en las paletas de
  `app.html`; `app-shell.css` conserva reglas de componentes, sin sobrescribir
  tokens. El sidebar usa el acento común de cada tema.
- `theme-init.js` aplica el tema antes del primer pintado en las cuatro páginas;
  `footer-year.js` actualiza el año en las páginas públicas. El botón del reporte
  PDF registra su evento desde JavaScript.
- CSP en modo Report-Only; la activación efectiva y la validación autenticada
  quedan pendientes, con alcance y orígenes documentados.
- Verificados 11 tests automáticos, imports/exports de 11 módulos y sintaxis de
  18 archivos JS. Comparación en navegador del marcado estático: 0 diferencias
  en estilos visibles, claro/oscuro a 1440 y 390 px; páginas legales verificadas
  con CSP aplicada en una prueba local. No se probaron accesos con cuenta real.
