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

- **Cambiar el username no tiene pantalla.** `auth.js` ya exporta
  `updateUsername()`, pero nada la llama. Importa sobre todo para cuentas de
  Google (username autogenerado del correo). Sitio natural: Ajustes → "Tu
  perfil", junto a nombre y emoji.
- **Cambiar el correo tampoco.** Mismo lugar; Supabase lo soporta con
  `auth.updateUser({ email })`.
- **Los dos temas se afinan con una capa, no en su origen.**
  `css/app-shell.css` redefine tokens y reglas bajo `:root.theme-light`/
  `:root.theme-dark` porque `app.html` no remapea sus colores en su fuente.
  Funciona y es estable, pero el lugar correcto es el bloque de tokens de
  cada tema — se unifica en la Fase 3. El sidebar de navegación (`.sidebar-
  link`, `.sidebar-link-icon`) sigue el mismo patrón: el acento único se
  define dos veces dentro de `app.html` (bloque `@media (prefers-color-
  scheme: light)` y bloque `html.theme-light`) — es la misma duplicación a
  propósito, no un descuido.
- **Sin Content-Security-Policy.** No se puede poner sin romper los
  `<script>` inline que montan la app y leen el tema — se resuelve en la
  Fase 3, cuando la app sea un módulo con `src`.
- **`@supabase/supabase-js` pinchado a 2.45.4 desde jsDelivr**, sin lockfile.
  Para actualizar: subir el número en `js/supabase-client.js`, probar login +
  sincronización, y recién ahí desplegar.
- **El freno por IP de `/api/login` es best-effort** (vive en memoria, las
  funciones serverless se reciclan). Si hace falta de verdad: Upstash Redis o
  el rate limiting de Vercel.
- **El blob de `user_data` no tiene tope.** Cada subida manda el snapshot
  completo. Señal de alarma: que la subida empiece a tardar más de 1-2 s —
  ahí toca la Fase 5 (tabla propia para `calls`).

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
- **Fase 3 — Modularizar (EN CURSO, arrancada v555; Finanzas v556, Reportes
  v557 ya partidas).** Se resolvió el bloqueo original ("cómo se entrega sin
  build"): módulos ES **nativos**, sin bundler — mismo patrón que ya usan
  `js/auth.js`/`js/sync.js`, cero comandos de terminal para el usuario.
  `js/boot.js` ya no inyecta un `<script>` clásico desde `#appMainScript` —
  hace `import()` dinámico de `js/app-main.js` (solo se ejecuta la primera
  vez que se llama, sigue sirviendo de gate), precargado con
  `<link rel="modulepreload">` en el `<head>` (también para `js/finance.js`
  y `js/reports.js`) para que no espere red. Cada extracción se hizo con
  ayuda del parser de `typescript` (ya estaba disponible en el entorno) para
  detectar con precisión qué usa cada bloque desde afuera y qué necesita el
  resto del archivo desde el bloque — no a mano ni a ojo, dado el tamaño del
  archivo. Arquitectura confirmada con Reportes: **hub-and-spoke** —
  `js/finance.js` y `js/reports.js` solo importan de `js/app-main.js`, nunca
  entre sí (Reportes necesitó helpers de Adherencia/Calendario/Ganancias que
  viven en `js/app-main.js` — compartidos con Horario y Calendario, que se
  quedan ahí por ahora — no se duplicó ninguno ni se armó una dependencia
  Reportes↔Finanzas). Ojo con variables `let` de estado de vista (como
  `reportsMonthlyOffset`): si algo FUERA de la página reasigna esa variable
  (ej. los botones de paginación, que viven en el bloque de wiring
  centralizado de la app, no dentro de la página misma), esa variable se
  queda declarada en `js/app-main.js` — un módulo no puede reasignar un
  `import`, solo leerlo. Siguen pendientes, en el mismo orden de páginas:
  Calendario, Horario, Llamadas, Higher Rate, Ajustes — `state` (no
  exportado todavía, ninguna extracción lo necesitó hasta ahora) se agregará
  a la exportación de `js/app-main.js` en cuanto la primera lo necesite.
- **Fase 4 — Protección del código fuente.** Ya hecho: gate de sesión
  (ahora `js/app-main.js` + `js/finance.js` + `js/reports.js` +
  `js/boot.js`), licencia + términos + privacidad en el repo. Pendiente:
  minificar/bundlear sin sourcemaps (más fácil una vez que Fase 3 esté más
  avanzada), mover al servidor el motor de
  Adherencia/reportes agregados (rompe el offline de esa parte), repo privado
  en GitHub (pendiente del usuario). Explícitamente descartado: bloquear
  click derecho, deshabilitar F12, ofuscadores agresivos.
- **Fase 5 — Opcionales.** `calls` en tabla propia para reportes del lado del
  servidor, PWA instalable con service worker, monitoreo de errores (Sentry),
  backup automático diario. Borrado de cuenta y exportación de datos ya están
  hechos (adelantados en Fase 2).

---

**ÚLTIMOS FIXES (máx. 3, los más recientes)**

**v557** — Continuación de la Fase 3: segunda página partida de
`js/app-main.js`, Reportes (KPIs, gráfico mensual, racha, mejores/peores
días, proyección del ciclo). Mismo método que Finanzas (v556): árbol de
sintaxis real vía `typescript` para calcular imports/exports, no a mano.

- A diferencia de Finanzas, el código de Reportes **no** era un bloque
  contiguo — está entreverado con funciones de Adherencia/Calendario que
  Reportes usa pero no es dueño (`dayAdherence`, `weekSummaryForOffset`,
  `effectiveHistoryStartDate`, etc.). Se movieron a `js/reports.js` solo las
  20 funciones/constantes que son genuinamente de Reportes; esas ~33 que
  Reportes solo consume se quedaron en `js/app-main.js` (compartidas con
  Horario/Calendario) y ahora están exportadas para que `js/reports.js` las
  importe.
- Caso particular: `reportsMonthlyOffset` (variable de qué página del
  gráfico mensual se está mirando) se lee dentro de Reportes pero se
  **reasigna** desde los botones prev/next/hoy, que viven en el bloque de
  wiring centralizado de `js/app-main.js` (junto a los de Horario/Ciclo/
  Calendario), no dentro de la página de Reportes. Un módulo no puede
  reasignar algo que importa — así que esa variable se quedó declarada en
  `js/app-main.js` (exportada de ahí) en vez de moverse a `js/reports.js`
  como el resto.
- `js/reports.js` (nuevo): exporta 5 nombres que `js/app-main.js` necesita
  de vuelta — `renderReportsDashboard`, `renderReportsMonthlyChart`,
  `reportsCycleProjection`, `cycleGoalPace`, `REPORTS_MONTHLY_PAGE_SIZE` —
  e importa 32 de `js/app-main.js` (7 ya estaban exportados desde Finanzas:
  `settings`, `calls`, `money`, `convertedAmountText`, `iconHtml`,
  `escapeHtml`, `saveSettingsOnly`; se agregó `export` a los otros 25, más
  `reportsMonthlyOffset`).
- Se confirmó la arquitectura **hub-and-spoke**: `js/finance.js` y
  `js/reports.js` importan solo de `js/app-main.js`, nunca uno del otro.
- Verificado: la cuenta de declaraciones top-level de `js/app-main.js` bajó
  exactamente en las 20 que se movieron (530 → 510) y las listas de
  export/import entre los dos archivos coinciden exactamente en ambos
  sentidos (mismo chequeo automático que en v556).
- `app.html`: se sumó `<link rel="modulepreload" href="/js/reports.js"/>`.
- Sigue sin poder probarse en navegador real — mismo pedido de verificación
  extra que en v555/v556.
- Entregado completo y editado: `app.html`, `js/app-main.js`,
  `js/reports.js` (nuevo).

**v556** — Continuación de la Fase 3: primera página partida de
`js/app-main.js` a su propio módulo, empezando por Finanzas (elegida por el
usuario). Mismo enfoque confirmado en v555 (módulos ES nativos).

- Se ubicaron los 3 bloques de código de Finanzas dentro de
  `js/app-main.js` (constantes/categorías, el bloque principal de
  Gastos/Metas, y el hint de scroll de Totales) usando el parser real de
  `typescript` (ya estaba instalado en el entorno) para armar un árbol de
  sintaxis del archivo completo — necesario porque a mano, en 10,930 líneas
  con literales de plantilla y regex de por medio, contar niveles de
  indentación no es confiable (se probó primero así y dio falsos positivos).
  Con el árbol se calculó automáticamente, cruzando cada identificador contra
  su alcance real: qué usa ese bloque desde afuera (pasa a ser `import`) y
  qué usan otras partes del archivo desde ese bloque (pasa a ser `export`).
- `js/finance.js` (nuevo): 24 funciones/constantes exportadas
  (`renderFinanceSection`, `openFinanceRowModal`, `saveFinanceRowModal`,
  `financeDeleteCategory`, `FINANCE_CATEGORIES`, etc. — lista completa al
  principio del archivo). Importa 16 nombres de `js/app-main.js`: `settings`,
  `calls` (no `state` — nada de Finanzas lo necesitó), `money`,
  `convertedAmountText`, `iconHtml`, `escapeHtml`, `toast`, `appConfirm`,
  `openModal`, `closeModal`, `saveSettingsOnly`, `makeLocalId`, `parseMoney`,
  `usdCeilFromCurrencyAmount`, `higherRateBonusForCalls`,
  `renderEmojiPicker`.
- `js/app-main.js`: se sacaron esos 3 bloques (verificado con el mismo
  análisis: la cantidad de declaraciones top-level del archivo bajó
  exactamente en la cantidad que se movió, 579 → 530, ni una de más ni de
  menos) y se agregó el `import` de los 24 nombres de `js/finance.js`, más
  `export` en los 16 que `js/finance.js` necesita de vuelta. Es una
  dependencia circular entre los dos módulos (cada uno importa del otro) —
  segura acá porque ninguno de los dos lee nada del otro en su propio nivel
  superior, solo dentro de funciones que se llaman después de que ambos ya
  terminaron de evaluarse (incluida `ensureCurrencySettings()`, que sí se
  llama a nivel superior de `js/app-main.js` y sí usa cosas de
  `js/finance.js` — funciona porque para cuando le toca ejecutarse,
  `js/finance.js` ya terminó de evaluar).
- `app.html`: se sumó `<link rel="modulepreload" href="/js/finance.js"/>`
  junto al de `app-main.js`.
- **No se pudo probar en un navegador real** (mismo límite que v555) — pedí
  verificación extra en el mensaje de entrega.
- Entregado completo y editado: `app.html`, `js/app-main.js`,
  `js/finance.js` (nuevo), `js/boot.js` (sin cambios esta vez, incluido para
  que la carpeta `js/` quede completa).

**v555** — Arranque de la Fase 3 (Modularizar), elegida explícitamente por
el usuario entre las 3 fases restantes del roadmap. Se le explicó primero en
texto plano qué hace cada fase y, ya elegida la Fase 3, se le planteó el
enfoque (módulos ES nativos sin build) y el plan por etapas antes de tocar
código — confirmado por el usuario.

- Se resolvió el bloqueo que el propio roadmap señalaba ("antes de encarar
  esta fase hay que resolver cómo se entrega sin build"): módulos ES
  **nativos** vía `<script type="module">`/`import()`, sin bundler — mismo
  patrón que ya usan `js/auth.js`, `js/sync.js`, etc. Cero comandos de
  terminal para el usuario.
- `app.html`: se sacó el `<script type="text/plain" id="appMainScript">`
  entero (todo el cuerpo de la app — Inicio, Horario, Llamadas, Higher Rate,
  Finanzas, Reportes, Calendario, Ajustes) y pasó tal cual a `js/app-main.js`
  como módulo ES nuevo. Se agregó `<link rel="modulepreload" href="/js/app-main.js"/>`
  en el `<head>` para que el archivo se descargue y parsee en paralelo con
  el chequeo de sesión, sin ejecutarse todavía.
- `js/boot.js`: `mountApp()` pasó a ser async — ya no crea un `<script>` y le
  copia el `textContent` de `#appMainScript` (ese elemento ya no existe);
  ahora hace `await import('/js/app-main.js')`. El `import()` dinámico solo
  ejecuta el módulo la primera vez que se llama, así que sigue cumpliendo el
  mismo rol de gate que el truco de `type="text/plain"` — nada de la app
  corre antes de que la sesión y los datos estén listos. Se revela el body
  (clase `app-ready` + sacar el overlay) ANTES del `import()`, no después —
  mismo motivo que antes: la app mide anchos reales al dibujarse y con el
  body oculto mediría 0.
- `js/app-main.js` termina exponiendo a mano en `window` las 9 funciones que
  `js/boot.js` lee desde ahí (`toast`, `appConfirm`, `iconHtml`, `money`,
  `convertedAmountText`, `financeConvertedInline`, `effectiveCycleGoal`,
  `cycleGoalPace`, `reportsCycleProjection`) — como `<script>` clásico las
  heredaba gratis (nivel superior = global), como módulo no cuelga nada de
  `window` solo. Se auditó que esas son las únicas 9 (no quedó ninguna otra
  dependencia implícita de `window` entre `boot.js` y el cuerpo de la app).
- Por ahora `state`/`settings`/`calls` siguen en un solo archivo
  (`js/app-main.js`) — no hizo falta todavía resolver cómo se comparte el
  estado mutable entre varios módulos. Eso viene en el próximo paso, al
  partir `js/app-main.js` por página (Finanzas primero).
- Pendiente para la próxima sesión: actualizar `README.md` (su sección
  "Cómo se edita `app.html`" todavía describe un solo archivo — no se tocó
  esta vez porque no estaba subido en esta conversación).
- Entregado completo y editado: `app.html`, `js/app-main.js` (nuevo),
  `js/boot.js`.
- Entregado completo y editado.
