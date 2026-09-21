**NOTA DE MANTENIMIENTO DE ESTE ARCHIVO (leer antes de editar este .md)**

Este archivo se reescribe en cada versión nueva y NO debe crecer indefinidamente:
- PENDIENTES: sin límite — se conservan TODOS los bugs/tareas pendientes mientras
  sigan sin resolver, con el detalle que haga falta para retomarlos sin releer
  código.
- ÚLTIMOS FIXES: máximo 3 entradas (las 3 versiones más recientes). Al agregar
  una versión nueva, se BORRA la más antigua de las 3 (no se compacta a una
  línea, se elimina por completo — su detalle ya cumplió su propósito una vez
  aplicado y verificado).
- RESUELTO / historial viejo: no se conserva. Un bug ya corregido y ya no
  reproducible no necesita seguir ocupando espacio aquí.
- El protocolo de LAYOUT, el protocolo de COMENTARIOS y el protocolo de
  DIAGNÓSTICO DE OVERFLOW de abajo son la excepción: son referencia permanente
  (no crecen con cada versión), se mantienen siempre.

---

**ESTILO DE LAYOUT DE LA APP (leer antes de cualquier rediseño visual)**

Todo rediseño 100% visual de esta app sigue el mismo protocolo y el mismo
lenguaje visual:

PROTOCOLO OBLIGATORIO:
1. Mockup VISUAL (no texto/ASCII) de la sección a rediseñar — con la
   herramienta de visualización o traído por el usuario ya armado,
   reutilizando los colores/variables reales de la app (--panel-navy, --cyan,
   --line, etc.) para que se vea lo más parecido posible al resultado final.
2. Mostrar 2 vistas del mockup: un archivo para celular y otro para
   escritorio.
3. Esperar aprobación explícita del usuario antes de escribir una sola línea
   de HTML/CSS.
4. CERO cambios funcionales: mismos ids, mismos listeners, mismo JS que ya
   lee/escribe esos campos — el rediseño es solo HTML/CSS que envuelve lo
   mismo de siempre.

EXCEPCIONES que NO exigen repetir el protocolo palabra por palabra (aunque si
incluyen un mockup, ese mockup igual debe ser visual y aprobado antes de tocar
código):
- Bugs/ajustes puntuales de JS sin tocar HTML/CSS visible.
- Cambios que mezclan reordenamiento visual con datos/funcionalidad ya
  aprobados aparte, o fusiones/reordenamientos de secciones ya aprobados con
  mockup en otra sesión.
- Simples reordenamientos de secciones ya existentes.
- Eliminación de una feature completa.
- Cambios puramente de DATOS/valores por default sin tocar HTML/CSS.
- Limpiezas de CSS/código muerto sin ningún cambio visible.
- Extensiones chicas de datos que reutilizan un patrón/función ya rediseñado
  en otro lado.
- Cambios mínimos de HTML/atributos sin tocar el lenguaje visual (ej. agregar
  el mismo min/max a más inputs).
- Ajustes chicos de estado visual (opacidad/badge) que reutilizan 100%
  patrones ya existentes, sin introducir lenguaje visual nuevo.
- Vistas mobile de una sección cuya vista de escritorio ya se aprobó/
  implementó en otra sesión, cuando el mockup mobile llega ya armado y
  aprobado por el usuario.
- v519 — Vista MÓVIL de las mejoras de "Resumen semanal" (ver ÚLTIMOS FIXES):
  el mockup celular vino armado y aprobado por el usuario dentro de
  resumen_semanal_mockup_v2_todo.html, junto al de escritorio (v518).
- Aviso a futuro: solo se aprobó/implementó la vista de ESCRITORIO de "Preview
  de próximos pendientes" (v450, ver abajo) — falta mockup mobile aparte antes
  de darla por completa en pantallas angostas.
- v477 — Rediseño completo de paleta de modo claro (ver ÚLTIMOS FIXES abajo):
  mockups mockup_light_v2_desktop.html/mockup_light_v2_mobile.html traídos ya
  armados y aprobados explícitamente por el usuario en el mismo mensaje que
  pidió el cambio — no hizo falta generar mockup nuevo ni esperar aprobación
  aparte.
- v488 — "Próxima ventana"/"En vivo" de Higher Rate reutiliza 1:1 la tarjeta
  ya diseñada de `#higherRateModal` (`.hr-live-card`), solo replicada con ids
  nuevos dentro de "Ganancias de hoy" — mismo lenguaje visual, sin inventar
  nada nuevo.
- v490 — `#goalScopeModal` ("¿Para cuándo es esta meta?") reutiliza 1:1 el
  patrón de modal chico ya existente (`.mc-modal-head` + `.mc-header-icon` +
  `.mc-btn-primary`/`.mc-btn-warn-pill`, igual que `#cycleGoalModal`/
  `#acwGoalModal`), y el aviso de meta especial del día reutiliza
  `.mc-warning-box` tal cual — cero lenguaje visual nuevo, y el propio
  pendiente ya especificaba "un modal chico con 2 botones".
- v491 — EXCEPCIÓN PUNTUAL, NO PERMANENTE: para las secciones por día de
  Higher Rate (Hoy/Próximos días/Días pasados) el usuario dijo textualmente
  "no hagas mockup, confío en que lo harás bien, aplica los cambios de
  inmediato sin mockup". Vale SOLO para ese cambio — el protocolo de arriba
  sigue igual para cualquier rediseño futuro, salvo que el usuario vuelva a
  renunciar al mockup explícitamente.
- v522 — Colores del líquido de "Bloques del día": el usuario indicó la fuente
  exacta (CodePen "Pure CSS Progress", Red/Cyan/Lime) y pidió los mismos
  colores y opacidad. Cambio solo de valores de color, sin lenguaje visual
  nuevo; no hizo falta mockup.
- v523 — Ajuste de los mismos colores de v522: en modo claro todos los bloques
  usan el cyan del Break. Solo cambia qué token de color se aplica, sin
  lenguaje visual nuevo.
- v524 — Segundo ajuste de los colores de v522: en modo claro el líquido de todos
  los bloques pasa de cyan a lima. Solo cambia qué token se aplica.
- v525 — Tercer ajuste de los colores de v522: en modo claro el líquido usa el
  color y la opacidad de las tarjetas de "Turno de Hoy". Valores ya existentes
  en la app, sin lenguaje visual nuevo.
- v526 — Extensión de v525: borde izquierdo y punto del riel de cada bloque
  toman el mismo color que su líquido en claro. Tokens ya existentes.
- v527 — Cuarto ajuste de los colores de v522: en modo claro Trabajo pasa del
  verde de ACW al índigo de la tarjeta Shift. Solo cambia el token.
- v532 — Modo oscuro plano: mockups mockup_dark_flat_desktop.html y
  mockup_dark_flat_mobile.html mostrados y aprobados por el usuario (opción A,
  tono Profundo) antes de tocar código. Solo cambian valores/tokens de color y
  borde, sin lenguaje visual nuevo.
- v533 — "Bloques del día" en modo oscuro: mismos colores, opacidad del líquido,
  borde izquierdo y punto del riel que ya tiene el modo claro. Solo cambian
  valores/tokens de color, sin lenguaje visual nuevo; no hizo falta mockup (misma
  excepción que v522-v527).
- v534 — Ajuste de v533: en "Bloques del día" Trabajo queda índigo y Break/Lunch
  comparten el morado, en claro y oscuro. Solo cambia qué token de color se aplica.
- v535 — Ajuste de v534: los 3 tipos de "Bloques del día" quedan morados, en
  claro y oscuro. Solo cambia qué token de color se aplica.
- v536 — Riel de "Bloques del día" (línea vertical + punto) con color propio por
  tipo, tomado de las tarjetas de "Turno de Hoy". Solo cambian tokens de color,
  sin lenguaje visual nuevo; no hizo falta mockup (la captura vino del usuario).
- v537 — Extensión de v536: el borde izquierdo de la tarjeta de bloque usa el
  mismo color por tipo que el riel. Solo cambia qué token se aplica.
- v540 — EXCEPCIÓN PUNTUAL, NO PERMANENTE: para la landing, el panel de entrada
  y las páginas legales (Fase 2 del roadmap) el usuario dijo textualmente "no me
  pidas aprobaciones para nada, solo haz lo que creas que es lo mejor y luego
  cuando ya tengamos todo listo te diré si debemos de cambiar algo". Vale SOLO
  para esa tanda — el protocolo sigue igual para cualquier rediseño futuro,
  salvo que el usuario vuelva a renunciar al mockup explícitamente. Lo que se
  construyó reutiliza los tokens reales de la app (`--panel-navy`, `--cyan`,
  `--card-line`, radios, sombras) en `css/tokens.css`, así que si hay que
  ajustar algo se ajusta ahí, no se rehace.
- v542 — Correcciones de contraste reportadas como bug por el usuario (texto
  ilegible en modo claro/oscuro): remapeo de un token y 4 reglas de color en
  componentes que ya existían. Sin lenguaje visual nuevo, sin ids ni listeners
  nuevos — entra por "bugs/ajustes puntuales", no por rediseño.
- v543 — Rediseño del tema CLARO de la app para que se parezca a la landing:
  protocolo cumplido. Mockup visual mostrado y aprobado explícitamente ("dale
  viaje") antes de tocar una línea de código. Dos matices para futuras
  sesiones: (1) las 2 vistas (escritorio y celular) fueron a UN solo archivo
  con un botón que alterna, no a dos archivos — el protocolo pide las dos
  vistas, no dos archivos, y así no se duplica el CSS del mockup; (2) solo se
  mockeó Inicio completo + un modal + la referencia de paleta, porque el resto
  de las páginas está hecho con los mismos ladrillos (tarjeta, pill, métrica
  con etiqueta arriba, fila de lista, timeline) y sale de las mismas reglas.
  CERO cambios funcionales: no se tocó `app.html` ni el congelado, ni un id, ni
  un listener.

---

**PROTOCOLO DE COMENTARIOS EN EL CÓDIGO (leer antes de tocar el .html)**

Este proyecto es un solo archivo HTML de miles de líneas. El historial de
"por qué se hizo cada cambio" ya vive en este resumen — el código en sí NO
debe repetir esa narrativa. Al agregar o editar código, seguir esto:

1. NUNCA escribir comentarios tipo diario ("v217 — pedido del usuario:
   antes se veía X, causa Y, se cambió a Z, ver v215/v227..."). Esa
   información va al resumen, no al código.
2. Un comentario en el código solo se justifica si explica algo NO OBVIO
   leyendo el código mismo: una restricción externa, un bug sutil que se
   evitó, una decisión de diseño que alguien podría "corregir" por error
   si no supiera el motivo. Ejemplo válido:
   `// dur se calcula desde end-start, no de un input directo — ver
   blockRowsCrossingMidnight() para el caso de bloques que cruzan medianoche`
3. Máximo 1-2 líneas por comentario. Si hace falta más contexto, se pone
   en el resumen y el comentario del código solo apunta ahí:
   `// Ver resumen.md "Calendario de productividad" si esto cambia de nuevo`
4. Nunca mencionar números de versión (v217, v290, etc.) dentro del código
   — esas referencias solo tienen sentido en el resumen, que sí lleva ese
   historial. En el código, cero versionado inline.
5. Antes de agregar código nuevo, si hace falta explicar el "por qué" de
   una decisión de más de 2 líneas, se escribe en el resumen como parte
   del registro de esa versión — NO como comentario en el archivo HTML.
6. Al editar código que YA tiene un comentario largo tipo diario, si de
   todos modos se va a tocar esa zona, se aprovecha para comprimirlo a 1-2
   líneas (o borrarlo si el resumen ya lo cubre), sin que haga falta que
   el usuario lo pida explícitamente — es parte de mantener el archivo
   liviano.
7. Este protocolo aplica a TODO cambio futuro sobre este archivo, sin
   excepción, en cualquier sesión — mismo criterio permanente que el
   protocolo de LAYOUT de arriba.

---

**PROTOCOLO DE DIAGNÓSTICO DE OVERFLOW (leer antes de agregar una tabla,
sección o caja nueva — y antes de "arreglar" un reclamo de overflow a ciegas)**

Historia real que motivó esto (v405-v409): el usuario reportó que un grid de
7 días se veía "grande" en mobile. Se gastaron 4 versiones (v405-v408)
achicando font-size/padding/gap del grid con clamp(), min-width:0,
overflow:hidden — todo eso era CORRECTO y no cambió nada visible, porque el
problema real nunca estuvo en el grid: era una tabla de referencia
(`table.cal-ref-table`) que heredaba `min-width: 900px` de una regla
genérica `table { min-width: 900px }` ya existente en el archivo (pensada
para OTRA tabla, en otro breakpoint). Esa tabla empujaba TODO el contenedor
padre más ancho que el viewport, arrastrando el grid con ella — el grid en
sí siempre había estado bien.

LECCIÓN — cuando algo se ve "grande"/desbordado en un contenedor y el
elemento que el usuario señala parece bien dimensionado en el código:
EL PROBLEMA CASI NUNCA ESTÁ AHÍ. Está en un HERMANO o ANCESTRO que empuja el
contenedor completo. Revisar el elemento señalado por el usuario en 3+
intentos sin resultado es la señal de que se está mirando el lugar
equivocado — cambiar de estrategia, no seguir afinando el mismo selector.

LECCIÓN 2 (agregada en v413) — "min-width: 0 en el hijo de grid/flex" no
siempre alcanza en el PRIMER nivel de hijo. Un elemento con `aspect-ratio`
y sin ancho propio, dentro de una columna `1fr`, puede seguir exigiendo su
tamaño "preferido" (no el disponible) si el `min-width: 0` se puso en el
CONTENEDOR del grid pero no en las CELDAS/ítems individuales de ese grid.
Si un contenedor ya tiene `min-width: 0` y el desborde persiste, medir con
DevTools (o un script) el `getBoundingClientRect().width` de cada item
directo contra el `scrollWidth` del grid — no asumir que un fix anterior en
un elemento "hermano/padre" ya cubrió a los hijos de un nivel más adentro.

LECCIÓN 3 (agregada en v453) — cuando un contenedor mobile usa
`overflow-x: auto` con scrollbar oculta (mismo patrón que `.week-nav`/
`.chips`) para "una sola línea, con scroll si no cabe", el scroll oculto NO
es intercambiable con "se ve bien recortado" — si el contenido total excede
el ancho visible, el usuario ve el borde derecho cortado a media palabra/
número sin ninguna señal de que hay más contenido deslizando, y lo reporta
como "roto", no como "necesito hacer scroll". Primer intento en v453 (quitar
un dato — el equivalente en moneda secundaria — para que "quepa" sin
scroll) fue RECHAZADO explícitamente por el usuario: cuando el pedido es
"que se vea bien"/"que quepa", eso NO autoriza a Claude a decidir por su
cuenta qué dato es "el menos importante" y quitarlo — solo el usuario decide
qué información puede perderse. El orden correcto es: (1) achicar texto/
font-size todo lo razonable sin perder ningún dato, (2) si aun así puede
desbordar en pantallas muy angostas, agregar el mismo fundido de borde que
ya usa `.chips.is-scrollable` (mask-image + una clase toggleada por JS
comparando `scrollWidth` vs `clientWidth`) para que quede claro que se puede
deslizar, y (3) SOLO si el usuario, viendo el resultado, pide explícitamente
quitar algo, recién ahí se oculta un dato.

CHECKLIST RÁPIDO al reportar/reproducir un overflow horizontal (seguir en
orden, cada paso es más barato que el siguiente):

1. Pedir o revisar un screenshot REAL antes del 2do intento de fix, no
   después del 3ro. Un diagnóstico "a ciegas" (solo leyendo código) que
   falla una vez ya justifica pedirlo — no hace falta fallar 3 veces.
2. `overflow-x: hidden` temporal en el contenedor sospechoso (ej. el
   `.accordion-card`/`.accordion-body` completo) para confirmar SI de
   verdad algo desborda y encontrar cuál hijo se recorta al hacerlo — más
   rápido que adivinar por lectura de CSS. Si hay forma de medir en
   consola (`elemento.getBoundingClientRect().width` vs `.scrollWidth`),
   mejor todavía — da el tamaño exacto del desborde, no solo si existe.
3. Buscar con grep, dentro de la sección en cuestión, cualquiera de estos
   patrones — son las causas más comunes de "el contenedor completo se
   estira, no el elemento que se ve mal":
   - `min-width:` en px (no `0` ni `auto`) en CUALQUIER elemento de esa
     sección, incluidos los que no parecen sospechosos (tablas, pills,
     badges con texto largo).
   - `white-space: nowrap` sin un `max-width`/`min-width: 0` acompañante en
     el mismo selector o en un padre — un texto que puede crecer sin límite
     estira a su contenedor con él.
   - Selectores GENÉRICOS por etiqueta (`table`, `input`, `button`, sin
     clase) que ya existan en el archivo — cualquier elemento nuevo de ese
     tipo los hereda automáticamente, incluso si nadie lo pensó para esa
     sección. `grep -n "^\s*table\s*{" archivo.html` (o `input`, `button`,
     etc.) para ver qué reglas genéricas ya existen antes de agregar algo
     que use esas etiquetas.
   - Grid/flex con hijos que llevan `aspect-ratio` y ya tiene `min-width: 0`
     en el CONTENEDOR pero no en los ITEMS del grid — ver LECCIÓN 2 arriba.
   - `overflow-x: auto` con scrollbar oculta cubriendo un texto/dato que el
     usuario espera ver COMPLETO de un vistazo — ver LECCIÓN 3 arriba: se
     achica texto/font-size y se agrega un fundido de borde que avise que
     hay más para deslizar; NUNCA se quita un dato sin que el usuario lo
     pida explícitamente.
4. Si el paso 3 no encuentra nada, recién ahí mirar el propio elemento que
   el usuario señaló — a esta altura ya se descartó lo más probable.

AL AGREGAR una tabla/caja/sección nueva (prevención, no reacción):
- Si es una `<table>`, agregar SIEMPRE `min-width: 0` explícito en su
  selector propio (`table.mi-clase-nueva { min-width: 0; ... }`), sin
  esperar a que algún media query lo resuelva — un media query que solo
  sobreescribe `width` (no `min-width`) deja vivo cualquier `min-width` fijo
  de una regla genérica más arriba en la cascada, en cualquier ancho donde
  ese media query no aplique.
- Cualquier texto que pueda variar de longitud (nombre de mes, badge con
  nombre de usuario, etc.) dentro de un contenedor flex/grid necesita
  `min-width: 0` en su propia celda/columna — un hijo de flex/grid tiene
  `min-width: auto` por default, que es el ancho de su CONTENIDO, no 0.
- Un grid/heatmap con celdas de `aspect-ratio` fijo (sin ancho propio)
  necesita `min-width: 0` tanto en el contenedor del grid COMO en cada
  celda/item — el `1fr` de las columnas no garantiza que se encojan al
  espacio real disponible si el item tiene un tamaño "preferido" vía
  aspect-ratio (ver LECCIÓN 2 arriba).
- Antes de dar por buena una compactación de tamaños (font-size/padding/
  gap) en mobile, confirmar con `overflow-x: hidden` temporal (paso 2 de
  arriba) que el contenedor padre no se está desbordando por otra causa —
  si el padre ya es más ancho que el viewport, ningún cambio de tamaño en
  los hijos se va a notar.
- Si una fila de métricas en mobile puede desbordar, achicar texto/font-size
  primero y agregar el fundido de borde de `.is-scrollable` como red de
  seguridad — nunca ocultar un dato por cuenta propia para "que quepa" sin
  que el usuario lo pida (ver LECCIÓN 3 arriba).

---

**PROTOCOLO DE MONEDA SECUNDARIA (leer antes de agregar o tocar cualquier
monto en dólares en la UI)**

Regla permanente pedida por el usuario (originada en v454, al notar que
"Próximos pendientes" — el preview de Finanzas en Ganancias de hoy — mostraba
"Faltan $57.26 de $93.28" sin el equivalente en Lempiras, a diferencia de
casi todo el resto de la app):

- Cualquier monto en dólares que se muestre en la UI (texto plano, tarjeta,
  pill, tabla, preview, tooltip, etc.) debe ir acompañado de su equivalente
  en la moneda secundaria configurada (`settings.currencyLabel`/
  `settings.exchangeRate`), salvo que el usuario no tenga esa moneda
  configurada (en cuyo caso se omite automáticamente — ver abajo).
- Esto aplica sin excepción a montos nuevos que se agreguen en cualquier
  sesión futura, no solo a los que ya existían — es la misma obligación que
  ya cumplen `financeRowHtml`/`financeTotalsRowHtml`/`renderHeader`
  (Ganancias de hoy/del ciclo)/`renderCalYear`/etc., ahora también aplicada
  a `renderFinancePreview()` (Próximos pendientes).
- Dos helpers ya existen para esto — usar el que corresponda al layout, sin
  inventar un tercero:
  - `convertedAmountText(usdAmount)`: devuelve `"≈ L 123.45"` como texto
    suelto, pensado para su propia línea/elemento (ej. debajo de un monto
    grande). Vacío si no hay moneda secundaria configurada.
  - `financeConvertedInline(usdAmount)`: devuelve `" (≈ L 123.45)"` ya
    envuelto en un `<span class="fin-row-converted-inline">`, pensado para
    pegarse inline justo después del monto en dólares dentro del mismo
    texto (ej. `` `${money(x)}${financeConvertedInline(x)}` ``). Vacío si no
    hay moneda secundaria.
  - Ambos ya manejan solos el caso "sin moneda secundaria configurada" — no
    hace falta un `if` aparte antes de llamarlos.
- Antes de dar por cerrado cualquier cambio que toque un monto en dólares
  visible, revisar si ese monto ya lleva su conversión — si no la lleva,
  agregarla con el helper que corresponda, aunque el usuario no lo haya
  pedido explícitamente esta vez.

---

**ROADMAP A PRODUCCIÓN — login, nube, modularización y protección del código**
(Fases 0, 1 y 2 cerradas en v540-v542. Este bloque se mantiene hasta que las 5
estén cerradas; al cerrar cada fase se borra su detalle y se deja una línea.)

DECISIONES YA CONFIRMADAS POR EL USUARIO:
1. **Más usuarios** → modelo de datos, RLS y textos legales multi-tenant desde
   el día 1. Implementado.
2. **Supabase** como auth + base de datos. Implementado y **funcionando en
   producción** (alta, login y Google verificados por el usuario en v542).
3. **Los 3 métodos de login** (Google + correo/contraseña + usuario/contraseña).
   Implementado. La fricción real (Supabase no tiene cuentas sin correo) se
   resolvió como estaba previsto: el registro pide correo + username, `profiles`
   mapea username → `auth.users.id`, y el login acepta cualquiera de los dos.
   **Cambio respecto al plan original**: esa traducción NO ocurre en el
   navegador. Resolver username → correo desde el cliente convertiría cualquier
   lista de usernames en una lista de correos, así que vive en
   `/api/login` (Vercel Function con `service_role`), que solo devuelve la
   sesión ya creada. La función SQL `email_for_login_identifier` tiene el
   `execute` revocado a `anon` y `authenticated`.
4. **Vercel Hobby por ahora.** Verificado en vercel.com/docs/limits/fair-use-guidelines
   (revisado 2026-09-19): Hobby no limita por cantidad de usuarios, limita por
   **uso comercial** — cobrar, pedir donaciones, correr publicidad o que el link
   de afiliados sea el propósito del sitio. Un producto gratis con varios
   usuarios reales sigue siendo válido mientras nadie gane dinero con él. El día
   que se cobre algo hay que pasar a Pro ANTES de activarlo, no después. Dato a
   vigilar: en Hobby, el contenido subido A TRAVÉS DE VERCEL puede usarse para
   entrenar modelos de IA. Los datos reales viven en Supabase, no en
   almacenamiento de Vercel, así que hoy no aplica — pero si algún día una
   Vercel Function procesa datos de usuario, revisar esa cláusula de nuevo.

FASE 0 — **CERRADA en v540.** `reference/propio_shift_tracker_Fixed_v539.html`
congelado + `tests/smoke.py` (Playwright/pytest) con las 6 páginas, los 16
modales, 2 zonas horarias, 2 anchos, migración de datos viejos y cero errores
de consola. Corre contra dos objetivos: el congelado y el `app.html` generado.

FASE 1 — **CERRADA en v542.** El código se entregó en v540
(`supabase/migrations/0001_init.sql`: tablas `profiles` y `user_data`, RLS por
dueño, triggers de alta y de `updated_at`, RPC `push_user_data` con control de
concurrencia, `username_available`, `wipe_my_data`; más `js/sync.js` y
`js/boot.js`) y el usuario completó el trámite manual: proyecto de Supabase
creado, llaves puestas, alta y login reales funcionando, incluido Google.

FASE 2 — **CERRADA en v542.** `index.html` es la landing con los 3 métodos,
registro con disponibilidad de username en vivo, recuperación de contraseña,
`privacidad.html` y `terminos.html`. La app quedó en `/app` detrás de la
sesión, y entrar a `/` con sesión abierta ya lleva directo a la app.

FASE 3 — Partir el archivo en un proyecto de verdad
- Herramienta: **Vite** en modo "vanilla" (sin framework). No hay que reescribir
  la app a React; solo pasar de un `<script>` gigante a módulos ES.
- Estructura propuesta:
  `index.html` (landing) · `app.html` · `src/styles/*.css` (tokens, temas,
  layout, componentes) · `src/state.js` · `src/dates.js` · `src/schedule.js` ·
  `src/adherence.js` · `src/gaps.js` · `src/higherRate.js` · `src/finance.js` ·
  `src/cycle.js` · `src/alarms.js` · `src/render/*.js` · `src/wiring.js`.
  `src/sync.js`, `src/auth.js` y `src/boot.js` ya existen y entran tal cual.
- RIESGO REAL, no menor: hoy TODO es global (`state`, `settings`, `calls` son
  `let` de módulo y ~300 funciones se llaman entre sí sin imports). Partirlo
  obliga a decidir cómo se comparte el estado mutable. Plan: `src/state.js`
  exporta UN objeto (`export const app = { state, settings, calls }`) y se
  reemplazan las referencias sueltas — mecánico pero masivo.
- **Dependencia nueva que introduce v540**: `js/boot.js` monta la app inyectando
  el contenido de `#appMainScript`, y `js/sync.js` intercepta
  `Storage.prototype.setItem`. Al pasar a módulos, las dos cosas desaparecen:
  el `boot` importa la app normalmente y el sync se engancha a las funciones de
  guardado reales. Ninguna de las dos es permanente, son andamios de esta fase.
- **Dependencia de `boot.js` sobre globales de la app**: usa `window.appConfirm`
  y `window.toast` (declaraciones de función en script clásico, que sí quedan en
  `window`). Al modularizar dejan de ser globales: hay que exportarlas.
- **Deuda de tema que hay que saldar acá** (introducida en v542, ampliada en
  v543, ver PENDIENTES): TODO el tema claro afinado vive hoy en
  `css/app-shell.css` como una capa que le gana por cascada a `app.html`, no en
  su origen. Al unificar el CSS, esas reglas se mudan al bloque de tokens/tema
  claro y la capa entera se borra — incluidos los dos tokens nuevos
  (`--surface-sunken`, `--surface-control`), que deberían existir en los dos
  temas y no solo en claro.
- Orden correcto: extraer primero el CSS (bajísimo riesgo), después los módulos
  "puros" sin DOM (fechas, adherencia, huecos, ciclo, Higher Rate, finanzas), y
  al final los `render*` y el wiring. `pytest tests/smoke.py` completo entre
  cada paso — para eso se escribió.

FASE 4 — Protección del código fuente (expectativas realistas)
- La verdad primero: **cualquier JS que llegue al navegador se puede leer**. No
  existe forma de impedirlo. En orden de utilidad real:
  1. **Minificar y bundlear** (sale gratis con la Fase 3) y **no publicar
     sourcemaps**. — pendiente, depende de Fase 3.
  2. **Mover al servidor lo que de verdad valga** (Vercel Functions): el
     candidato natural es el motor de Adherencia minuto a minuto + los reportes
     agregados. Ojo: rompe el funcionamiento offline de esa parte. — pendiente.
  3. **Gate de cuenta**: sin login no hay app. — **HECHO en v540** (ver
     `#appMainScript` + `js/boot.js`).
  4. **Licencia + copyright + términos** en el repo y en la landing. —
     **HECHO en v540** (`LICENSE`, `terminos.html`, `privacidad.html`). Falta
     rellenar los marcadores `[TU NOMBRE...]`, `[TU CORREO...]`, `[TU PAÍS]`.
  5. Ofuscadores tipo `javascript-obfuscator`: cuestan tamaño y velocidad,
     complican depurar bugs reportados y solo frenan al curioso. Recomendación:
     NO usarlo al principio.
  6. Repo **privado** en GitHub. — pendiente del usuario.
- Lo que NO sirve y no se va a implementar: bloquear click derecho, deshabilitar
  F12, detectar DevTools.

FASE 5 — Opcionales, después de que lo de arriba funcione
- `calls` en tabla propia (consultas y reportes del lado del servidor).
- PWA instalable + offline real con service worker.
- Monitoreo de errores (Sentry) y backup automático diario de la base.
- Borrado de cuenta y exportación de datos. — **ADELANTADO a v540**: el borrado
  existe (`/api/delete-account` + botón en Ajustes) porque la política de
  privacidad lo promete, y la exportación JSON ya existía.

---

**PENDIENTES**

- **Rellenar los marcadores legales.** `LICENSE`, `privacidad.html` y
  `terminos.html` siguen con `[TU NOMBRE O RAZÓN SOCIAL]`, `[TU CORREO DE
  CONTACTO]` y `[TU PAÍS]`. `tests/smoke.py::test_paginas_legales_cargan` los
  cuenta y avisa, pero no falla.
- **El interruptor de tema solo está en la landing.** `js/theme-toggle.js` ya
  es genérico (engancha cualquier `[data-theme-toggle]` de la página). Para
  ponerlo también en `privacidad.html`/`terminos.html` alcanza con copiar el
  `<button class="theme-toggle" data-theme-toggle>` dentro de
  `.topbar-actions` y agregar el `<script type="module" src="js/theme-toggle.js">`
  al final — los estilos ya los tienen, porque ambas cargan `landing.css`.
  Conviene además igualar su `<script>` inline del `<head>` al de
  `index.html`, que SIEMPRE pone una clase de tema (las legales solo la ponen
  si hay preferencia guardada).
- **El afinado del tema claro se detuvo en el modo claro, a propósito.** Las
  cifras de ancho fijo (`tabular-nums`) y las etiquetas en mayúsculas de v543
  van bajo `:root.theme-light` porque el mockup aprobado era de modo claro y
  se prometió no tocar el oscuro. El reloj y los contadores siguen bailando un
  poco en oscuro: si el usuario lo quiere ahí también, es mover esas dos
  reglas fuera del prefijo de tema (no hay nada más que decidir).
- **Cambiar el username no tiene pantalla.** `auth.js` ya exporta
  `updateUsername()` con su manejo de "ya está ocupado", pero nada la llama.
  Importa sobre todo para las cuentas de Google, a las que el trigger les genera
  el username desde el correo (`jonathan` → `jonathan`, y si choca, `jonathan1`).
  Sitio natural: Ajustes → "Tu perfil", junto a nombre y emoji.
- **Cambiar el correo tampoco.** Mismo lugar; Supabase lo soporta con
  `auth.updateUser({ email })` y manda confirmación a los dos correos.
- **El tema claro de la app se arregla con una capa, no en su origen.**
  `css/app-shell.css` redefine tokens y ~20 reglas bajo `:root.theme-light`
  porque `app.html` (congelado, generado) no remapea sus colores: los reemplaza
  regla por regla y deja fuera lo que nadie enumeró. Funciona y es estable —
  `:root.theme-light` le gana por especificidad a `html.theme-light` y por
  orden a `:root:not(.theme-dark)` dentro del `@media`— pero el lugar correcto
  es el bloque de tokens del tema claro, y se unifica en la Fase 3. Lo mismo
  con las 4 reglas de tema oscuro de las páginas públicas, que hoy viven al
  final de `css/tokens.css` en vez de en `landing.css`/`legal.css`.
- **La landing ya no se puede ver con la sesión abierta.** Entrar a `/` con
  sesión redirige a `/app.html`. Para verla igual: `/?quedarse=1`. Si algún día
  se quiere una página de marketing pública para usuarios ya registrados, hay
  que moverla a otra ruta, no deshacer el redirect.
- **Sin Content-Security-Policy.** `vercel.json` trae nosniff, Referrer-Policy,
  X-Frame-Options, Permissions-Policy y HSTS, pero no CSP. Motivo concreto:
  `boot.js` monta la app creando un `<script>` inline, y las páginas públicas
  leen el tema con otro `<script>` inline; cualquier CSP sin `'unsafe-inline'`
  los bloquearía. Se resuelve solo en la Fase 3, cuando la app sea un módulo con
  `src`. Ponerlo antes obliga a nonces generados por middleware — trabajo que se
  tira a la basura al modularizar.
- **`@supabase/supabase-js` pinchado a 2.45.4 desde jsDelivr.** No hay lockfile
  ni build: un `@2` flotante puede cambiar de comportamiento en cualquier
  despliegue. Para actualizar: subir el número en `js/supabase-client.js`,
  probar login + sincronización, y recién ahí desplegar. Efecto secundario a
  tener presente: como `boot.js` es un módulo que importa ese CDN, el gate de
  arranque se pinta antes de que corra una sola línea de JS propio — por eso el
  gate está escrito en claro por defecto y no con los tokens de la app.
- **El freno por IP de `/api/login` es best-effort.** Vive en memoria y las
  funciones serverless se reciclan, así que no sustituye al rate limit de
  Supabase Auth — solo abarata los picos obvios. Si algún día hace falta de
  verdad: Upstash Redis o el propio rate limiting de Vercel.
- **El blob de `user_data` no tiene tope.** Un año de llamadas son pocos MB y
  Supabase Free aguanta de sobra, pero cada subida manda el snapshot completo.
  Si `calls` llega a decenas de miles de filas, toca la Fase 5 (tabla propia).
  Señal de alarma: que la subida empiece a tardar más de 1-2 s.
- **Moneda secundaria, decisiones conscientes (NO agregar):** exportación
  CSV/PDF de contabilidad (`exportAccountingCsv`/`exportAccountingPdf`) queda
  solo en dólares, es un documento contable. Tampoco los rótulos de tarifa por
  minuto (`$0.12/min`, `Gold +$0.03`, `+$0.02/min` en "Editar llamada"): son
  tasas, no montos ganados.

**LIMITACIONES CONOCIDAS** (alcance reducido a propósito, no son bugs)

- El tema elegido en la landing se guarda en la misma clave de settings que usa
  la app, así que la app abre con él. Pero si al entrar la nube trae otro
  `theme` guardado, gana la nube y el tema "se revierte". Es correcto (la nube
  es la fuente de verdad de los ajustes) y solo puede pasar la primera vez que
  se entra en un navegador nuevo; a partir de ahí el switch del sidebar y el de
  la landing escriben lo mismo.
- El aviso "Dos versiones distintas de tus datos" sigue existiendo, pero SOLO
  para la divergencia real entre dos dispositivos distintos (ver v542): dos
  versiones que de verdad difieren, subidas desde máquinas distintas. Mezclarlas
  solas inventaría un día de trabajo que no existió, así que ahí sí decide el
  usuario. Todo lo demás se resuelve sin preguntar.
- La comparación de snapshots de `resolveBoot()` ordena las claves antes de
  comparar porque Postgres reordena `jsonb` al guardar. Si alguna vez deja de
  detectar "son el mismo dato" (por un número que vuelve distinto del round-trip,
  por ejemplo), el peor caso es que reaparezca la pregunta de conflicto — no se
  pierde nada.
- El preview de "Próximos pendientes" en Ganancias de hoy muestra el balance
  GLOBAL acumulado de Finanzas (no algo que nazca/se resetee por día) — es
  una decisión consciente confirmada con el usuario pese a la inconsistencia
  visual de mostrarlo dentro de una vista rotulada "de hoy".
- Turno sin cerrar antes de medianoche: `dayShiftSessions` solo empareja
  eventos del día consultado y del anterior, nunca del SIGUIENTE. Si un turno
  se abre un día y se cierra ya pasada la medianoche, el día de INICIO pierde
  la sesión (cae al estimado por llamadas, o a 0 si no hay llamadas). El día
  de CIERRE sí la ve y desde v529 la recorta a sus propias horas. Se dejó así
  a propósito: sumar los eventos del día siguiente rompería el caso mucho más
  común de "olvidé cerrar ayer y hoy arranqué un turno nuevo" (emparejaría el
  inicio de ayer con el cierre de hoy).
- Código muerto (NO borrar sin pedirlo): `renderDayStatsCards()` escribe 13
  ids que ya no existen en el HTML (`resumenDiaLlamadas`, `resumenDiaProductivo`,
  `resumenDiaACW`, `resumenDiaAdherencia`, `resumenDiaAdherenciaGoal`,
  `resumenDiaBreak`, `resumenDiaLunch`, `resumenDiaOtro`, `resumenDiaHigherRate`,
  `resumenDiaConectado`, `resumenDiaTiempoLlamadas`, `resumenDiaBillable`,
  `resumenDiaDropped`) — sobraron al eliminar "Resumen del día". Están
  protegidos por `if (el)`, no truenan; el costo real es que obligan a
  calcular `dayAdherence(dayKey)` y las stats del día anterior en CADA tick
  de 1 s para nada.
- Código muerto (NO borrar sin pedirlo): en `renderHigherRateDayStats()` se arma un
  `Set` con las fechas de las ventanas que no son de hoy, pero después solo se usan
  las PASADAS (`past`) — las futuras se recogen y se descartan. Inofensivo; "Próximos
  días" dejó de renderizarse en algún momento y ese filtro quedó sin uso.
- `stats.possiblePauseTotal` (de `dayGapTotals`) se calcula y se expone en
  `importedCallStats` pero ningún render lo usa. Además su criterio difiere
  del campo `possiblePause` de `gapClassification` (uno excluye break/lunch,
  el otro no). Dato muerto, no afecta nada visible.
- Importación: `parseCalls` guarda `pay` tal como viene en el texto pegado,
  sin clampear negativos (a diferencia de `saveCallEditor`/`saveManualCall`,
  que sí hacen `Math.max(0, ...)`). Un "-$5.00" pegado restaría de las
  ganancias. No se tocó a propósito: normalizarlo cambiaría `callDedupeKey`
  (usa `parseMoney(pay).toFixed(2)`) y con eso la detección de duplicados de
  las llamadas ya guardadas. Propio nunca exporta pagos negativos.
- `parseMoney` trata la coma como separador de miles: `"12,50"` devuelve
  **1250**, no 12.50. Alcanzable en los campos de texto de Finanzas; en la
  práctica casi siempre lo frena el tope de Disponible.
- Higher Rate: editar la FECHA o el HORARIO de una ventana congela el bono ya
  ganado por las llamadas que calificaban antes del cambio (a propósito, para
  no quitar retroactivamente lo ganado). El efecto secundario es que corregir
  una hora mal tecleada deja el bono viejo pegado además del nuevo. Es una
  decisión de producto, no se cambió; lo que sí se arregló en v530 es que un
  cambio de NIVEL ya no quede ignorado.
- Una llamada en vivo (botón "Iniciar/Terminar llamada") sigue redondeando a
  1 min como mínimo (`buildLiveCallCandidate`, `Math.max(1, ...)`). Desde v531
  el importador y los modales sí aceptan 0 min; ese piso de 1 min se dejó a
  propósito para no convertir en 0 una llamada corta real medida en segundos.
- Cambiar el ancla del ciclo de pago mueve el inicio de TODAS las semanas
  (`startOfCycleWeek`), así que también mueve Resumen semanal y las claves de
  "Semana específica". Desde v531 esas claves se re-anclan solas por el centro
  de la semana vieja, pero si el ancla se mueve varios días una semana
  personalizada puede terminar cubriendo un día distinto en los extremos.

---

**ÚLTIMOS FIXES (máx. 3, los más recientes)**

**v543** — Tres pedidos del usuario tras usar el login de verdad: no había
manera de ver la contraseña que estaba escribiendo, el tema claro/oscuro solo
se podía cambiar ya adentro de la app, y el modo claro de la app se veía
"menos profesional" que la landing. Nada de esto toca el script de la app: los
cambios son 4 archivos del envoltorio más 1 módulo nuevo.

- **Ojito en las 3 contraseñas.** `#loginPassword`, `#signupPassword` y
  `#resetPassword` quedan envueltos en `.field-input-wrap` con un
  `button.reveal-btn` encima (ojo / ojo tachado, alternados por CSS según
  `aria-pressed`). El listener vive en `js/landing-ui.js`, delegado en
  `document` y buscando `[data-reveal-for]`: los formularios se muestran y
  ocultan pero nunca se reconstruyen, así que un listener alcanza para los
  tres. Detalle que se ve feo si falta: cambiar `input.type` manda el cursor
  al final, así que se guarda y se restaura la selección con
  `setSelectionRange`. No se agregó ningún id nuevo — los 31 que busca
  `landing.js` siguen intactos.
- **Interruptor claro/oscuro en la landing.** `js/theme-toggle.js` (nuevo)
  engancha cualquier `[data-theme-toggle]` de la página y escribe en la MISMA
  clave que lee la app (`propio_shift_tracker_settings_es_v1`), con merge y no
  reemplazo — así el tema elegido antes de entrar es el que la app abre
  después, y el `<script>` inline del `<head>` lo aplica antes de pintar, sin
  parpadeo. También escucha el evento `storage`, para que cambiar el tema en
  otra pestaña se refleje en vivo. El botón es un `<button>` y no un `<a>`, así
  que la regla que esconde el nav bajo 860 px no lo toca: se ve también en
  celular.
- **Modo claro de la app, al nivel de la landing.** El pedido fue explícito:
  mismos layouts, solo colores y estilos de texto. Tres cambios hacen el salto:
  (1) fondo de página gris muy claro (`--bg-page: #f8fafc`) con las tarjetas
  blancas recuperando su borde — `app.html` las pinta con
  `border-color: transparent` en claro, así que sobre blanco flotaban sin
  contorno; (2) un solo acento: el modo claro arrastraba un `#4a90e2` suelto
  (un azul que no es de la paleta) en casi todos los hover — botones del
  header, pestañas, flechas de semana, cerrar modal, tiles de tarifa, emojis —
  y todos pasan al índigo `--accent-decorative`; (3) tipografía de datos:
  etiquetas en mayúsculas finas donde acompañan a un número (y ya había
  hermanas en mayúsculas al lado) y `tabular-nums` en relojes, contadores y
  montos, para que no bailen cada segundo.
- **Cómo gana la cascada sin tocar `app.html`.** Ese archivo declara su tema
  claro dos veces: `html.theme-light X` y `:root:not(.theme-dark) X` dentro de
  `@media (prefers-color-scheme: light)`. Todo lo nuevo va bajo
  `:root.theme-light X`, que le gana a la primera por especificidad (`:root` es
  pseudo-clase, `html` es etiqueta) y a la segunda por orden de cascada, porque
  `css/app-shell.css` carga después del `<style>`. Es fiable porque `boot.js`
  llama a `applyLightThemeDefault()` antes de montar: la clase de tema SIEMPRE
  está puesta en `/app`. El respaldo de `@media` quedó solo para los tokens,
  que es el camino que usan las pruebas cuando montan la app sin `boot.js`.
- **Dos tokens nuevos, solo en claro:** `--surface-sunken` (#f8fafc) y
  `--surface-control` (#f1f5f9). En oscuro casi todos los fondos "hundidos" son
  `rgba(255,255,255,.03..09)`, que sobre blanco simplemente no existen: chips,
  campos, pills segmentadas, rieles de progreso y hovers de sidebar se veían
  planos. Los `:not(.good):not(.warn):not(.bad)` de `.tag`/`.slot-status` están
  a propósito: sin ellos la regla base le ganaría a los tonos de estado y los
  borraría.
- Los 6 botones grandes de acción (Iniciar shift, Break, Lunch, llamadas)
  pasan de transparentes con borde gris a un tinte de su propio acento
  (`rgba(var(--accent-rgb), .07)`), que es el color que ya usan su texto y su
  ícono. El `#bootGate` pasa a `#f8fafc` para no dar un flash blanco antes de
  que aparezca la app.
- **Contraste:** el subtítulo de cada sección (`.accordion-head p`,
  `.section-title p`) usaba `--muted-3` (#94A3B8), que sobre blanco queda por
  debajo del mínimo legible para texto corrido; pasa a `--muted` (#64748B).
- No se tocó: ni una línea del script de la app, ni `app.html`, ni
  `reference/propio_shift_tracker_Fixed_v539.html`, ni
  `tools/build_app_html.py`, ni el SQL, ni `js/auth.js`/`js/landing.js`/
  `js/sync.js`/`js/boot.js`. El modo oscuro no cambia en ninguna regla.
- Verificado acá: `node --check` limpio en `js/theme-toggle.js` y
  `js/landing-ui.js`; llaves balanceadas en `css/app-shell.css` (67/67) y
  `css/landing.css` (209/209); etiquetas de `index.html` balanceadas, sin
  ninguna sin cerrar; 37 ids, cero duplicados, y los 31 que busca `landing.js`
  más `previewClock`/`year` siguen presentes; los 3 `data-reveal-for` apuntan a
  ids que existen; todos los enlaces internos de `index.html` resuelven a un
  archivo real.
- **Sin probar todavía**: el aspecto real del modo claro solo se puede juzgar
  con la app corriendo y con datos. Si algo quedó con poco contraste o un gris
  de más, se ajusta en `css/app-shell.css` (sección "Tema claro"), no se
  rehace. Tampoco se corrió `pytest tests/smoke.py`, que exige Playwright.

**v542** — Primer uso real con cuenta de Google. Tres cosas reportadas por el
usuario: azul oscuro sobre modo claro en el envoltorio de sesión, una pregunta
de "dos versiones distintas de tus datos" que no correspondía, y la landing
apareciendo otra vez con la sesión ya abierta. Nada de esto toca el script de
la app.

- **Azul en modo claro (gate, tarjetas de arranque y banner de conflicto).**
  Causa única para los tres: el tema claro de `app.html` nunca remapea
  `--panel-navy`, lo reemplaza elemento por elemento (`html.theme-light .hero`,
  `.modal-card`, `.toast`, `.sidebar-nav`...). Todo lo que quedó fuera de esa
  lista seguía pintándose navy, y encima con `var(--text)` ya remapeado a texto
  oscuro: ilegible. Los afectados eran `#bootGate`, `.boot-card`,
  `.storage-conflict-banner`, `#audioBlockedBanner` y, de yapa,
  `.fin-date-pill` (la pastilla "Ciclo actual" de Finanzas en escritorio).
  Fix en `css/app-shell.css`: `html.theme-light { --panel-navy: #ffffff; }`.
  Una línea cubre los cinco casos y cualquiera futuro — los elementos que ya
  tenían su propia rama de claro no cambian, porque esa regla sigue ganando por
  especificidad.
- **El gate ya no depende del tema para verse.** `syncThemeClass()` corre en la
  primera línea de `boot.js`, pero `boot.js` es un módulo que espera a que baje
  `@supabase/supabase-js` desde jsDelivr: hasta entonces el `<html>` no tiene
  clase de tema y hereda el `:root` oscuro de la app. Por eso el gate y sus
  tarjetas pasan a estar escritos **en claro por defecto**, con el oscuro en
  `html.theme-dark`. `.boot-choice`/`.boot-choice-sub` usaban
  `color: var(--text)`, que sin clase es casi blanco: sobre tarjeta blanca
  desaparecían (se ve en la captura del usuario, donde los dos títulos de las
  opciones no se leen). Ahora heredan el color del gate.
- **"Dos versiones distintas de tus datos" era un falso positivo, y era
  permanente.** Al cerrar la pestaña con cambios sin subir, `flushOnExit()`
  manda el snapshot con `keepalive`: el servidor lo guarda, pero la pestaña ya
  no vive para anotar el `updated_at` nuevo. En el arranque siguiente
  `lastSyncedUpdatedAt` quedaba viejo y `dirty` seguía en `true` → divergencia
  aparente → se preguntaba. Con el MISMO dato de los dos lados, y en cada
  arranque. Por eso el aviso decía "desde Windows", la misma máquina del usuario.
- **Fix en `resolveBoot()`**: antes de declarar conflicto, dos descartes.
  (1) Si los dos snapshots son el mismo dato, se adopta el de la nube y se
  realinea la marca, sin preguntar — la comparación ordena las claves porque
  Postgres reordena `jsonb` al guardar y un `JSON.stringify` directo nunca
  hubiera dado igual. (2) Si `user_data.device_id` es el de este mismo
  navegador, la versión de la nube salió de acá: lo local es esa misma más lo
  que se haya editado después, así que gana lo local y se sube forzado
  (`boot.js` ya hacía ese push para `USE_LOCAL`). `fetchCloud()` ahora también
  trae `device_id`. La pregunta queda solo para la divergencia real entre dos
  dispositivos distintos — ver LIMITACIONES.
- **Entrar a `/` con sesión abierta lleva directo a la app.** `landing.js` ya no
  muestra la tarjeta "Abrir la app": si hay sesión (y no se está recuperando
  contraseña), `location.replace()` al destino. Dos frenos para que esto no se
  vuelva una trampa: `?quedarse=1` para ver la landing a propósito, y un
  anti-rebote de 10 s en `sessionStorage` — si la app devuelve a la landing
  enseguida (sesión que no pudo abrirse), la segunda vez ya no se redirige, se
  muestra la tarjeta de sesión y el subtítulo explica qué pasó, en vez de quedar
  rebotando entre las dos páginas. Cerrar sesión limpia esa marca.
- **Las páginas públicas siguen el tema de la app.** `index.html` gana el mismo
  `<script>` inline que ya tenían `privacidad.html`/`terminos.html` (lee
  `settings.theme` antes de pintar; sin nada guardado, claro — que es el default
  de `tokens.css` desde v541). Y como en oscuro había cuatro colores fijos que
  desaparecían — `.header-cta` y `.topbar .link-btn.primary` son texto `#fff`
  sobre `var(--text)`, que en oscuro es casi blanco, y `.form-msg.ok`/`.pill`
  usan un verde `#15803d` ilegible sobre fondo oscuro — se agregaron sus
  correcciones al final de `css/tokens.css`.
- No se tocó: ni una línea del script de la app, ni `app.html`, ni
  `tools/build_app_html.py`, ni el SQL. Los cambios son 4 archivos del
  envoltorio (`css/app-shell.css`, `css/tokens.css`, `js/sync.js`,
  `js/landing.js`) más 5 líneas nuevas en el `<head>` de `index.html`.
- Verificado acá: `node --check` limpio en `js/sync.js` y `js/landing.js`;
  llaves balanceadas en los 2 CSS; los 31 ids que `landing.js` busca siguen
  existiendo en `index.html` y no se agregó ninguno nuevo; los selectores que
  toca el parche de tema claro (`.storage-conflict-banner`,
  `.storage-conflict-dismiss-btn`, `#bootGate`, `.boot-card`, `.boot-choice`)
  existen tal cual en `app.html`/`app-shell.css`.
- **Sin probar todavía**: el descarte de conflictos falsos exige cerrar la
  pestaña con cambios sin subir y volver a abrir — hay que confirmarlo contra
  el proyecto real. Prueba mínima: entrar, cambiar algo, cerrar la pestaña de
  golpe, volver a abrir `/app` → debe montar directo, sin preguntar nada.

**v541** — Primer contacto real del usuario con la puesta en marcha: la guía no
servía, la landing se veía pobre y la app abría oscura. Nada de esto toca el
script de la app.

- **Confusión de seguridad, que NO era un bug.** El usuario reportó "no aparece
  el candado y puedo ver los datos de los demás". El Table Editor y el SQL
  Editor del panel de Supabase corren como dueño de la base y **se saltan RLS
  a propósito**: ver todas las filas desde ahí es lo esperado. El error fue mío,
  por mandar a comprobar la seguridad mirando un indicador de la interfaz que
  además cambia de forma entre versiones.
- **`supabase/migrations/0002_verificar_seguridad.sql`** (nuevo): primero REPARA
  (vuelve a aplicar `enable`+`force row level security` y las 6 políticas, y
  revoca otra vez `email_for_login_identifier` a anon/authenticated) y después
  IMPRIME una tabla legible en español con ✅/❌ por cada revisión, incluida una
  que detecta políticas sin `auth.uid()` — el error que de verdad dejaría ver
  datos ajenos. Idempotente, se puede correr siempre.
- **`EMPEZAR-AQUI.md`** (nuevo, creado una versión antes y reescrito acá): guía
  clic por clic para alguien que nunca usó Supabase, GitHub ni Vercel, con
  diccionario de términos. Se le agregó el paso 3.4 (la verificación de arriba,
  con la aclaración del panel bien destacada) y el **paso 11 de Google completo**
  — antes remitía a `SETUP.md`, que es la guía para quien ya sabe. Incluye el
  campo donde todo el mundo se equivoca (la URI de redirección es la de
  Supabase, no la del sitio) y una tabla de los 4 errores típicos.
- **Landing rehecha.** `index.html` + `css/landing.css` nuevos: hero a dos
  columnas con aurora animada de fondo, **vista previa de la app dibujada con
  divs** (barras que se llenan al entrar en pantalla, reloj corriendo, pastilla
  "En curso" parpadeando) — resuelve el pendiente de las capturas sin poder
  correr la app, y nunca queda desactualizada. Además: 8 tarjetas de funciones
  con hover, 3 pasos, bloque de privacidad, cierre en degradado, aparición al
  hacer scroll (`js/landing-ui.js`, nuevo) y cabecera que gana sombra al bajar.
  El indicador de las pestañas Entrar/Crear cuenta se mueve con `:has()` leyendo
  el `aria-selected` que ya toggleaba `landing.js` — sin estado duplicado.
- **Todo en modo claro.** `css/tokens.css` invierte la base: el claro pasa a ser
  `:root` y el oscuro queda en `html.theme-dark`. Se quitó
  `@media (prefers-color-scheme)`: la landing no debe cambiar de color según
  cómo tenga configurado el sistema quien la visita.
- **La app abre en claro.** `applyLightThemeDefault()` (en `sync.js`, llamada por
  `boot.js` después de hidratar y antes de montar) pisa `theme: 'auto'` por
  `'light'`. Es seguro porque el único control de tema de la interfaz es el
  switch del sidebar, que solo produce `'light'` o `'dark'` — o sea, `'auto'`
  nunca fue una elección del usuario, solo el valor de fábrica. En cuanto toque
  el switch, la función deja de intervenir.
- **Sin parpadeo al arrancar.** `syncThemeClass()` pone `.theme-light`/
  `.theme-dark` en el `<html>` de `/app` en la primera línea de `boot.js`: el
  gate hereda los tokens de la app, cuyo default es navy, y se veía oscuro medio
  segundo antes de saltar a claro.
- Otros: `config.js` acepta también las **publishable keys** nuevas de Supabase
  (`sb_publishable_…`, más cortas que el JWT — el umbral de longitud las
  rechazaba); las páginas legales pasan a rutas relativas, como la landing;
  `legal.css` recupera los estilos de su cabecera.
- Verificado: `node --check` en los 9 módulos; los 31 ids que pide `landing.js`
  existen en el `index.html` nuevo y ninguno está duplicado; los 5 anclajes que
  `boot.js` usa dentro de `app.html` siguen ahí; todos los enlaces internos de
  las 4 páginas resuelven a un archivo real; llaves de CSS balanceadas en los 4
  archivos; `$$` en pares en los 2 SQL; `build_app_html.py --check` confirma que
  `app.html` sigue revirtiendo al v539 byte por byte.
