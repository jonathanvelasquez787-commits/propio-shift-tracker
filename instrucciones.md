**NOTA DE MANTENIMIENTO DE ESTE ARCHIVO (leer antes de editar este .md)**

Este archivo se reescribe en cada versión nueva y NO debe crecer indefinidamente:
- PENDIENTES: sin límite — se conservan TODOS los bugs/tareas pendientes mientras
  sigan sin resolver, con el detalle que haga falta para retomarlos sin releer
  código.
- ÚLTIMOS FIXES: máximo 3 entradas (las 3 versiones más recientes). Al agregar
  una versión nueva, se BORRA la más antigua de las 3 (no se compacta a una
  línea, se elimina por completo).
- RESUELTO / historial viejo: no se conserva.
- Ejemplos puntuales de excepciones a un protocolo (ver LAYOUT abajo) se
  mantienen genéricos, sin listar cada versión histórica una por una — si algo
  ya no aporta como referencia futura, se recorta en la siguiente edición de
  este archivo. Este recorte lo pidió el usuario explícitamente (v546): "hay
  muchas cosas en el .md que ya están demás".
- El protocolo de LAYOUT, el protocolo de COMENTARIOS, el protocolo de
  DIAGNÓSTICO DE OVERFLOW, el protocolo de MONEDA SECUNDARIA y el FLUJO DE
  TRABAJO CON ESTE REPOSITORIO de abajo son la excepción: son referencia
  permanente, se mantienen siempre.

---

**ESTILO DE LAYOUT DE LA APP (leer antes de cualquier rediseño visual)**

Todo rediseño 100% visual de esta app sigue el mismo protocolo:

1. Mockup VISUAL (no texto/ASCII) de la sección a rediseñar, reutilizando los
   colores/variables reales de la app (`--panel-navy`, `--cyan`, `--line`,
   etc.) para que se vea lo más parecido posible al resultado final.
2. Dos vistas del mockup: celular y escritorio.
3. Esperar aprobación explícita del usuario antes de escribir una sola línea
   de HTML/CSS.
4. CERO cambios funcionales: mismos ids, mismos listeners, mismo JS — el
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
- Cuando el usuario trae el mockup YA armado y aprobado en el mismo mensaje
  (las dos vistas), o renuncia explícitamente al mockup para un cambio
  puntual — vale solo para ese cambio, no cambia el protocolo por defecto.
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

- **`app.html` es el ÚNICO archivo de la app y la única fuente de verdad.**
  No existe (ni debe volver a existir) un archivo "congelado" de referencia
  ni un script generador ni verificación "byte por byte".
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

---

**ESTADO DEL ROADMAP A PRODUCCIÓN**

Fases 0 (proceso de trabajo), 1 (Supabase: tablas, RLS, triggers, alta/login
reales) y 2 (landing pública, los 3 métodos de login, páginas legales) están
**cerradas y funcionando en producción**, verificado por el usuario.

Pendientes, en orden:
- **Fase 3 — Modularizar.** Partir `app.html` en módulos ES con una
  herramienta de build (ej. Vite). Riesgo real: hoy `state`/`settings`/
  `calls` son variables globales de módulo y ~300 funciones se llaman entre
  sí sin imports; partirlo exige decidir cómo se comparte el estado mutable.
  Antes de encarar esta fase hay que resolver cómo se entrega el resultado
  sin que el usuario ejecute ningún comando de build — o evaluar si vale la
  pena dado que rompe el patrón de "un solo archivo que se edita y se sube
  tal cual" (ver FLUJO DE TRABAJO arriba). Al modularizar hay que desmontar
  los andamios que hoy vive en `js/boot.js` (monta la app inyectando
  `#appMainScript`, inyecta a mano el panel de cuenta, el borrado de cuenta y
  el bloque de Proyección del ciclo) y mover a su origen todo el afinado de
  tema que hoy vive como capa en `css/app-shell.css`.
- **Fase 4 — Protección del código fuente.** Ya hecho: gate de sesión
  (`#appMainScript` + `js/boot.js`), licencia + términos + privacidad en el
  repo (falta rellenar los marcadores, ver PENDIENTES). Pendiente: minificar/
  bundlear sin sourcemaps (depende de Fase 3), mover al servidor el motor de
  Adherencia/reportes agregados (rompe el offline de esa parte), repo privado
  en GitHub (pendiente del usuario). Explícitamente descartado: bloquear
  click derecho, deshabilitar F12, ofuscadores agresivos.
- **Fase 5 — Opcionales.** `calls` en tabla propia para reportes del lado del
  servidor, PWA instalable con service worker, monitoreo de errores (Sentry),
  backup automático diario. Borrado de cuenta y exportación de datos ya están
  hechos (adelantados en Fase 2).

---

**PENDIENTES**

- **Categorías de Finanzas propias (con su nombre).** El usuario mencionó de
  pasada la idea de poder crear sus propias categorías (además de las 7 fijas
  de `FINANCE_CATEGORIES`) en vez de solo elegir entre las existentes. No
  pedido todavía en firme — en la v548 se optó por la alternativa más chica
  (sugerir nombre por categoría, ver ÚLTIMOS FIXES). Si se pide: toca el
  protocolo de LAYOUT completo (mockup + aprobación) porque agrega UI nueva
  (alta/edición/borrado de categoría) y cambia el modelo de datos de
  `settings.financeCategories` (hoy son 7 claves fijas, no una lista
  dinámica) — repasar también qué pasa con los colores/íconos fijos por
  categoría (`rgb`, `icon` en `FINANCE_CATEGORIES`) que una categoría nueva no
  tendría.
- **Rellenar los marcadores legales.** `LICENSE`, `privacidad.html` y
  `terminos.html` siguen con `[TU NOMBRE O RAZÓN SOCIAL]`, `[TU CORREO DE
  CONTACTO]` y `[TU PAÍS]`. El nombre del titular en `LICENSE` se deja tal
  cual a propósito (es el dueño legal del copyright, no un dato de UI).
- **El interruptor de tema solo está en la landing.** `js/theme-toggle.js` ya
  es genérico (engancha cualquier `[data-theme-toggle]`). Para ponerlo
  también en `privacidad.html`/`terminos.html`: copiar el
  `<button class="theme-toggle" data-theme-toggle>` dentro de
  `.topbar-actions` y agregar `<script type="module" src="js/theme-toggle.js">`
  al final — los estilos ya los tienen porque ambas cargan `landing.css`.
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
  cada tema — se unifica en la Fase 3.
- **La landing ya no se puede ver con la sesión abierta.** Entrar a `/` con
  sesión redirige a `/app.html`. Para verla igual: `/?quedarse=1`.
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
- **Moneda secundaria, decisiones conscientes (NO agregar):** ver protocolo
  de MONEDA SECUNDARIA arriba.

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
  pero sin ningún render que lo lea.
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

**ÚLTIMOS FIXES (máx. 3, los más recientes)**

**v549** — El usuario reportó que Bronce y Gold de Higher Rate se ven casi
iguales en todos los lugares donde aparecen (selector de tarifa en
llamadas, botones de nivel en ventanas, badge de "Ganancias de hoy",
estado en vivo, chips de reportes). Causa raíz: en tema claro `--tier-gold`
era literalmente un alias de `var(--break-orange)`, la misma variable que ya
usa `--warn` — Bronce (`#C2410C`) y Gold (`#F97316`) terminaban siendo el
mismo naranja con apenas distinta luminosidad. El `colorRgb` que usan los
badges/tintes (independiente de tema) tenía el mismo problema en menor
grado: bronce `205,127,50` y gold `201,162,39` — mismo R, poca diferencia
de G/B.

- `app.html`: `--tier-gold` en tema claro deja de ser `var(--break-orange)` y
  pasa a su propio hex `#CA8A04` (dorado/ámbar real, no naranja); `--tier-
  bronze` en tema claro pasa de `#C2410C` a `#96591F` (bronce más marrón,
  aleja más su tono del nuevo dorado). Cambio hecho en los DOS bloques que
  redefinen estas variables en tema claro (el de `@media (prefers-color-
  scheme: light)` y el de `html.theme-light` — están duplicados a propósito,
  ver PENDIENTE "Los dos temas se afinan con una capa..."). Tema oscuro
  (`--tier-bronze: #e0a06b` tostado / `--tier-gold: #ffd76e` amarillo) no se
  tocó: ya eran razonablemente distintos entre sí. `HIGHER_RATE_TIERS.bronze
  .colorRgb` pasa a `181,101,29` y `.gold.colorRgb` a `234,179,8` — más
  separados en matiz/saturación, se usan en el badge de "Ganancias de hoy",
  el borde del estado de llamada en vivo, los chips de Reportes y el acento
  de la ventana dominante. `--warn` sigue apuntando a `--break-orange` sin
  cambios — solo se desacopló `--tier-gold` de esa variable compartida.
  `.hr-window-card[data-tier]` (tarjetas de ventana en Higher Rate) y
  `.hr-window-tier-btn` no se tocaron: ya usaban valores suficientemente
  distintos entre sí. Cero cambios de HTML — cae en la excepción de LAYOUT
  "cambios solo de valores/tokens de color sobre componentes que ya
  existen". Entregado completo y editado.

**v548** — El usuario pidió que, en "Agregar gasto" (Finanzas), el campo
Nombre se rellene solo con una sugerencia al elegir categoría (ej. Casa →
Renta), en vez de quedar siempre en blanco. Se descartó a propósito la otra
opción que ofreció el usuario en el mismo pedido (dejar crear categorías
propias con su nombre) — cambio de mayor alcance, pendiente si lo pide
después.

- `app.html`: nuevo `FINANCE_NAME_SUGGESTIONS` (junto a `FINANCE_CATEGORIES`)
  con un nombre sugerido por categoría — `casa: 'Renta'`, `servicios: 'Luz'`,
  `transporte: 'Gasolina'`, `comida: 'Despensa'`, `deuda: 'Préstamo'`; `otro`
  no sugiere nada. Nueva `financeApplyNameSuggestion(categoryId)`: solo
  escribe en `#financeRowNameInput` si el campo está vacío o todavía tiene la
  última sugerencia sin tocar (`financeRowNameSuggested`) — nunca pisa un
  nombre que el usuario ya haya escrito a mano. Se llama (1) al abrir el modal
  para una fila NUEVA que no es meta (con la categoría por default, "Casa"),
  y (2) en un listener `change` nuevo sobre `#financeRowCategoryInput`. Al
  abrir el modal para editar una fila existente, `financeRowNameSuggested` se
  resetea a `''` para que cambiar la categoría en modo edición nunca
  reemplace el nombre real ya guardado. Cero cambios de HTML/CSS — cae en la
  excepción de LAYOUT "cambios puramente de datos/valores por default".
  Entregado completo y editado.

**v547** — Se completó en `app.html` el retiro del nombre ("Jonathan") de la
UI, pendiente de la v546 porque el archivo llegó pegado en el chat y no como
adjunto. El usuario subió el archivo real y se editó con herramientas de
archivo (4 apariciones, no 3: había una más dentro de un texto de ayuda).

- `app.html`: `defaultSettings().userName` pasa de `'Jonathan'` a `''`;
  placeholder de `#userNameInput` (Ajustes → Tu perfil) y de
  `#onboardingNameInput` (popup de bienvenida) pasan de `"Ej. Jonathan"` a
  `"Tu nombre"`; el texto de ayuda junto al selector de emoji pasa de
  `"Buenas tardes, Jonathan 🙂"` a `"Buenas tardes, [tu nombre] 🙂"`.
  Entregado completo y editado — único cambio contra el archivo subido.
