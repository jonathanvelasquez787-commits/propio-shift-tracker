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

**PROTOCOLO DE AUDITORÍA PROFUNDA (SOLO BAJO COMANDO EXPLÍCITO)**

Este protocolo unifica las auditorías funcionales, estructurales y de uso real
de toda la app. Es deliberadamente costoso y NO forma parte del QA normal de
cada cambio.

**ACTIVACIÓN ESTRICTA**
- Ejecutar este protocolo completo **solo** cuando el usuario escriba
  explícitamente la frase exacta `haz una auditoria profunda`.
- Se puede ignorar únicamente mayúsculas/minúsculas y puntuación alrededor de
  la frase. No se activa por sinónimos ni por frases parecidas.
- Pedidos como "revisa este bug", "haz QA", "prueba estos botones", "revisa
  Higher Rate", "comprueba que funcione", "testea la app" o "corrige todo lo
  de esta feature" NO activan la Auditoría Profunda por sí solos: en esos
  casos se trabaja únicamente el alcance pedido por el usuario.
- Nunca convertir automáticamente un fix normal en esta auditoría completa.

**QUÉ SIGNIFICA "HAZ UNA AUDITORIA PROFUNDA"**

Cuando se active, hacer UNA sola auditoría integral que combine todo lo
siguiente, sin esperar que el usuario vuelva a describir estas reglas:

1. **Simulación realista de uso durante al menos un mes**
   - Usar la app como lo haría un usuario normal durante muchos días, no como
     una colección de pruebas aisladas.
   - Iniciar/finalizar turnos, entrar temprano, tarde y a tiempo; trabajar
     antes y después del horario planeado.
   - Iniciar/terminar llamadas live.
   - Agregar llamadas manuales.
   - Pegar/importar llamadas y probar importaciones normales, tardías,
     históricas, duplicadas, solapadas y corregidas.
   - Tomar llamadas antes del turno, después del turno, durante Break y
     durante Lunch.
   - Iniciar, terminar, continuar y descartar Break/Lunch; probar pausas
     accidentales y llamadas que interrumpen pausas.
   - Editar llamadas pasadas, borrar llamadas individuales y borrar todas las
     llamadas de un día.
   - Editar horarios, bloques, metas, Higher Rate, Finanzas, Avisos, Ajustes,
     Calendario, Reportes, Gamificación y cualquier otro estado editable.
   - Refrescar/reabrir la app en puntos importantes para comprobar que lo
     guardado persiste y que no aparecen estados fantasma.
   - Probar días libres, turnos sin llamadas, múltiples sesiones el mismo día,
     cruces de medianoche cuando apliquen y cualquier escenario extremo que
     pueda surgir de combinar funciones.
   - Pensar activamente en usos adicionales que el usuario no haya mencionado;
     no limitarse a la lista anterior.

2. **Auditoría estructural de TODOS los controles y funciones**
   - Revisar todos los botones, inputs, selects, toggles, tabs, chips,
     steppers, enlaces de navegación, menús, modales y acciones dinámicas.
   - Revisar listeners directos y delegados, `data-*`, ids, `aria-controls`,
     apertura/cierre de modales, navegación y elementos creados por JS.
   - Verificar imports/exports, helpers llamados desde handlers, referencias
     globales y dependencias entre módulos.
   - Buscar expresamente el patrón de bug donde la UI reacciona parcialmente
     pero el handler falla después por `ReferenceError`, helper no importado,
     función inexistente o excepción silenciosa.
   - Buscar botones que visualmente cambian algo pero no guardan; funciones que
     guardan parcialmente; estados que solo se arreglan tras reabrir; UI que
     muestra datos viejos después de editar/borrar; y acciones que fallan sin
     feedback.
   - Revisar desktop y mobile cuando el comportamiento pueda cambiar por
     layout, sidebar, overlays, modales o controles responsivos.

3. **Persistencia e integridad de estado**
   - Después de cada flujo importante, comprobar memoria/UI, almacenamiento
     local y sincronización/nube cuando corresponda.
   - Confirmar que editar, borrar, cancelar, descartar, resetear, importar,
     cerrar/reabrir y refrescar conservan exactamente el estado esperado.
   - Revisar interacciones entre features: Horario ↔ Adherencia, Llamadas ↔
     Break/Lunch, Higher Rate ↔ ganancias, Finanzas ↔ ganancias, Gamificación
     ↔ llamadas/turnos, metas ↔ reportes/calendario y cualquier otro acople.
   - Buscar duplicación de recompensas, bonos, eventos, llamadas, pausas,
     ganancias o acciones al repetir operaciones o refrescar.

4. **Corrección durante la auditoría**
   - Corregir TODOS los bugs reproducibles encontrados dentro de la auditoría,
     salvo que el usuario diga explícitamente que solo quiere diagnóstico.
   - No hacer rollback general ni deshacer fixes previos para simplificar la
     reparación. Partir siempre del estado actual y preservar todo lo ya
     corregido.
   - Si un bug nuevo fue causado por un fix reciente, arreglar la interacción
     sin reintroducir el bug anterior.
   - Evitar "arreglos" que solo oculten el síntoma visual; reparar la causa y
     mantener consistente el modelo de datos.

5. **Regresión y validación obligatorias**
   - Agregar o actualizar una prueba de regresión por cada fallo corregido
     cuando sea técnicamente razonable.
   - Ejecutar la suite de tests, checks de imports/exports, checks de wiring,
     sintaxis/build y cualquier validación específica del área tocada.
   - Verificar que producción/deployment/CI termina correctamente cuando el
     entorno permita comprobarlo.
   - Repetir los escenarios que originalmente fallaron después del fix.
   - No declarar "todo funciona" solo porque el build pasa: distinguir entre
     validación estructural/automática y pruebas interactivas reales que sí se
     hayan podido ejecutar.

6. **Entrega**
   - Al terminar, dar un resumen compacto pero exacto con:
     - bugs encontrados;
     - causa de cada uno;
     - corrección aplicada;
     - pruebas de regresión agregadas/actualizadas;
     - tests/checks/build/deployment que pasaron;
     - cualquier escenario que no se haya podido probar de forma real.
   - No pedir al usuario que ejecute scripts ni haga verificaciones técnicas:
     esas tareas pertenecen al agente según el flujo permanente del repo.

Este protocolo sustituye cualquier versión anterior de "auditoría mensual",
"auditoría de todos los botones" o instrucciones equivalentes: para el futuro,
la frase `haz una auditoria profunda` significa ejecutar TODO este bloque.

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

El 8/10/2026 el usuario confirmó que todos los pendientes anteriores ajenos
a Google ya quedaron resueltos, incluidos la conexión Propio → tracker, los
ZIPs del puente/resumen y la publicación en Chrome Web Store. Esta es una
confirmación del usuario; no se verificaron nuevamente estos pasos ni se
infieren versiones instaladas o una URL pública de tienda. No volver a
presentarlos como tareas abiertas. Se conserva únicamente la visibilidad por
nombre en Google como pendiente actual.

Sitemap: el 8/10/2026 se agregó lastmod 2026-10-05 a las dos portadas,
fecha verificada del cambio de identidad de v595. La cuota de solicitud
manual no impide el rastreo normal. Mantener fechas de cambios significativos
reales; no actualizarlas en cada despliegue ni inventar cambios. XML válido,
seis checks SEO y build correctos. Señal para el rastreo, sin garantía de
plazo ni posición; no se solicitó indexación manual de nuevo. Mantener
visibilidad por nombre como pendiente hasta comprobar resultados.
Publicación confirmada: bb70132, Vercel y CI correctos; sitemap público con
ambas fechas. Se reenvió una sola vez el sitemap actualizado en Search Console
y Google confirmó «Se ha enviado el sitemap correctamente», sin error de
cuota. Esto acredita el envío, no nuevo rastreo ni mejora de posición.
Evidencia: outputs/google-sitemap-enviado-2026-10-08.jpg de este chat.

Visibilidad en Google: pendiente único vigente tras la confirmación del usuario
del 8/10/2026. Comprobación directa de Google ese día: no aparece en la primera
página por `propio shift tracker`. Search Console confirma raíz indexada,
rastreo/indexación permitidos, obtención correcta y canonical seleccionada
igual a la raíz. Último rastreo sigue siendo el 4/10/2026 a las 14:03:12;
el HTML guardado conserva el título anterior «Interpreter Shift & Earnings
Tracker | Propio Shift Tracker», anterior a v595. Esto confirma que todavía
no procesó la portada nueva, sin establecer la causa completa de la falta
de posición por nombre. Se intentó una sola actualización durante esta revisión:
rechazada de nuevo por «Cuota superada». No se repitió, no se solicitó /es ni
se creó automatización. Evidencia en outputs de este chat:
google-cuota-2026-10-08.jpg. Las verificaciones del 5/10 siguientes son historial.

Visibilidad en Google: propiedad real verificada por etiqueta HTML el 4/10/2026.
Comprobación real en Search Console el 5/10/2026: sitemap «Correcto», cuatro
páginas descubiertas y última lectura el 4/10/2026. La inspección de la raíz
inglesa `/` y de `/es` muestra «La URL está en Google» y «La página está indexada».
No fue necesario repetir la solicitud que ayer falló por cuota; no se enviaron
solicitudes nuevas ni se reenvió el sitemap. Este estado acredita indexación,
no una posición garantizada ni tráfico en resultados.
El reintento único autorizado se completó antes de la hora programada,
a pedido del usuario. La automatización `reintentar-indexaci-n-de-propio-shift-tracker`
quedó PAUSED para que no vuelva a ejecutarse a las 13:00 de Tegucigalpa.
Evidencia conservada en outputs: google-sitemap-correcto-2026-10-05.jpg,
google-portada-en-indexada-2026-10-05.jpg y google-portada-es-indexada-2026-10-05.jpg.
No quitar la etiqueta real de verificación ni crear otro reintento sin solicitud.
Desde v590 hay URLs públicas por idioma (`/` en inglés y `/es` en español),
contenido, metadatos, hreflang y datos estructurados coherentes. Nuevas guías
públicas y difusión en comunidades pertinentes siguen siendo mejoras posteriores.
El 5/10/2026 Google sí muestra la raíz al buscar el dominio, pero no apareció
en la primera página por `propio shift tracker`. Desde v595 la marca encabeza
el título, H1, descripción y presentación en ambos idiomas; `og:site_name` y
WebSite refuerzan su identidad. No confundir esta mejora publicada con una
posición ya conseguida. No publicar mensajes en comunidades sin autorización.
Vercel y CI de v595 correctos. Google probó `/` y `/es` el 5/10/2026 a las
9:31 y 9:34 de Tegucigalpa y recibió los títulos/descripciones nuevos; ambas
son aptas para indexar. La solicitud única de actualizar la raíz fue rechazada
por «Cuota superada» ese mismo día. No repetir ni intentar la española tras
el rechazo; no hay nuevo reintento automático autorizado. El rastreo normal
sigue permitido. Evidencia en outputs: google-html-publicado-v595-en.jpg,
google-html-publicado-v595-es.jpg y google-solicitud-v595-cuota-2026-10-05.jpg.
Ver docs/seo.md.

La auditoría profunda de v576 quedó cerrada: 31 días simulados, 108 llamadas,
ambos recorridos QA y siete fallos reparados de persistencia, sincronización,
Finanzas y exportaciones. No quedan fallos reproducidos pendientes de esa
auditoría. La nube se probó con respuestas controladas, sin certificar una
sesión real en dos dispositivos. Véase `docs/auditoria-profunda-2026-09-30.md`.

No quedan tareas abiertas del refuerzo positivo enumerado en la versión
anterior. Los siete requisitos se completaron en v573; las limitaciones
del apartado siguiente conservan su alcance deliberado.

La revisión posterior quedó terminada en v575. Monstruo y misiones vuelven
a Inicio, con la fecha seleccionada visible. Pegar llamadas de ayer actualiza
y puede derrotar al monstruo de ayer; no daña al de hoy ni concede XP tardío.
La derrota histórica queda en el bestiario y persiste sin duplicar recibos;
corregir o retirar ganancias revoca esa derrota cuando deja de alcanzar la meta.
Los días cerrados conservan su XP congelado. Las animaciones de hoy no pasan
al cambiar a otra fecha.

La distribución de Logros aprobada después de la auditoría quedó aplicada en
v577, simplificada en v579 y compactada en v580: «Activar Logros» visible en cabecera y menú lateral;
nivel/XP y racha/escudos juntos, sin duplicar el perfil; jefe del ciclo, última
victoria/cofre y récords; equipo, bestiario/trofeos e historial positivo.
Mis premios y desbloqueos por nivel son desplegables con todo su contenido.
El perfil de progreso aparece primero. Colecciones en filas completas evitan
huecos; preferencias de gamificación y refuerzo quedan reunidas debajo del
historial y antes del reinicio. Catálogo de 16 premios en una lista elegible,
con detalles de ventana y disparador y editor para personalizar.
XP, racha, escudos, jefe, cierre, equipo, colecciones y próximas recompensas
tienen tooltips accesibles y colocados dentro de la pantalla.
Se retiraron presupuesto, intensidad y Plan del día. Arcade es fijo; las
misiones evalúan automáticamente productividad, pausas y adherencia. Los
resultados sellados conservan sus enfoques anteriores por compatibilidad.
El reinicio queda al final; el Laboratorio QA se retiró en v578 por petición
del usuario. Los hitos de ganancias quedan justo
debajo de Misiones en Inicio, con cuatro marcadores conectados, hitos registrados
en verde y próximo hito/cantidad restante. Monstruo y misiones siguen en Inicio.
Shift, Break y Lunch se ven en una sola fila también en móvil, con todo su texto.

El estado accesible queda oculto visualmente y los avisos temporales desaparecen.
Manual, automático y pegado actuales actualizan vida, combo y efectos; importar
más de 30 minutos después de terminar no concede XP. Históricos, futuros y
Dropped no disparan golpes sobre el monstruo actual. Desactivar Logros retira
sus efectos sin borrar progreso; el movimiento reducido elimina animaciones.

El mockup HTML pixel art quedó aprobado y aplicado en v578: marcos escalonados,
sprites e iconos SVG nítidos, vida segmentada, armaduras e hitos cuadrados,
cofres y estrellas. Efectos breves de daño, misión, victoria y apertura;
Desde v579 Arcade es fijo y movimiento reducido no genera partículas. Se mantienen cálculos,
recompensas, recibos, controles, contenido y ubicación del monstruo en Inicio.
Se eliminaron el laboratorio, los recorridos y su código de la tool. Al
actualizar se retiran únicamente sus cuatro claves antiguas de simulación;
el arranque y la sincronización siempre consultan los snapshots reales.

El protocolo permanente de auditoría profunda se recuperó íntegro del commit
0d68200; d238d3c lo había eliminado al retirar el roadmap.
La auditoría integral se activó después por el comando
explícito del usuario y terminó en v576; el protocolo conserva su activación
estricta para futuras sesiones.

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
   Si hay menos evidencia, no se inventan frases. Apagar Logros suspende
   también los cierres y premios del refuerzo personal. No hay cierres
   automáticos duplicados y el premio físico espera a cerrar el resumen.
   Los importes del resumen usan la moneda secundaria vigente al consultarlo.
   El cierre nocturno conserva la proyección del día contable; las correcciones
   históricas no proyectan rachas nuevas. Cerrar siete días, restaurar backup
   y reabrir el turno conserva y revoca correctamente XP/escudo/metadatos.
7. Accesibilidad: catálogo común de variantes y canales personales/juego
   sujetos al interruptor maestro de Logros. Arcade es el modo fijo. Movimiento reducido conserva
   mensajes y resultados sin partículas ni animaciones. Máximo tres toasts;
   no se repite el último texto consecutivo. Apagar Logros conserva llamadas,
   XP, recibos, configuración e historial personal; oculta sus bloques,
   cierra sus modales y suspende avisos, efectos y sonidos arcade. El interruptor lateral y el de Logros
   comparten el mismo ajuste y guardado, independiente del tema.

Todo estado nuevo vive en el modelo game exportable/sincronizado, normalizado
para backups antiguos. El ledger admite hasta 30.000 recibos y los días
conservan su límite de 400. El Laboratorio QA y sus recorridos se retiraron.
Mis premios conserva catálogo, personalización, ventanas seguras, historial,
costos informativos e idempotencia; no existe límite semanal de presupuesto.

Verificación actual: 232 pruebas, contratos/ciclos de 29 módulos, wiring y build
de producción sin sourcemaps. Chrome aislado en claro/oscuro a 320, 390, 768
y 1365 px: Inicio/Logros sin overflow, llamadas manual/live/pegado/ayer/duplicado,
derrota, cierre, cofre idempotente, activación en ambas ubicaciones, progreso
conservado y movimiento reducido. Las pruebas no certifican una sesión real
autenticada en dos dispositivos. El mockup pixel art fue aprobado por el usuario.

Selector lateral «Temas y colores»: Original claro/oscuro y siete paletas
aprobadas, cada una en claro y oscuro. Se guardan junto a los ajustes de la
cuenta; cambiar a Original elimina únicamente las variables de la paleta.
Idioma en Ajustes → Tu perfil; Temas y colores contiene solo apariencia.
Español e inglés completos sin API, incluidos interfaz, avisos, ayuda y
reportes; 2.064 textos comprobados. Cambiar idioma vuelve a la misma página,
sin modificar llamadas, nombres personales, recibos ni progreso. Mensajes
de juego guardados se presentan en el idioma seleccionado sin reescribirlos.
La PWA incluye ambos idiomas y el CSS de apariencia.
Integración Locize preparada: script, workflow y validación de textos nuevos,
variables e HTML. Sin credenciales no contacta servicios. Falta únicamente
que el usuario contrate/configure su cuenta y los secretos cuando decida
activar traducción automática; instrucciones en docs/idiomas-y-temas.md.
Chrome aislado ES/EN, siete paletas más Original en ambos modos y páginas
principales a 320, 390, 768 y 1365 px sin overflow. Tooltips, lista/editor,
cambio de idioma y conservación de llamadas/progreso verificados. Build
real comprobado con autenticación y nube simuladas: preferencias antes de
pintar, persistencia tras recarga, idioma y regreso a Logros. No certifica
una sesión real en dos dispositivos ni una cuenta Locize activa.

Desde v582 el idioma inicial es English cuando no hay preferencia válida;
Español elegido anteriormente se conserva. Desde v583, botón EN/ES en la
barra superior junto al modo claro/oscuro: cambia en vivo sin borrar campos ni cambiar la
vista activa de entrada, registro o recuperación. Preferencia pública y selección
pendiente viven fuera del snapshot de cuenta; la selección explícita se aplica
solo a language después de hidratar y conserva la base de sincronización.
Se alinean preferencias al entrar y cambiar idioma dentro de la app, sin bucles
de recarga ni conflictos causados por usar el selector antes del login.
Los mensajes dinámicos y sus valores personales cambian en ambos sentidos.
Logros permanece desactivado por defecto para cuentas nuevas.

El build de v582 publica app.html como shell pequeño: gate y scripts externos;
extrae el CSS a app-core.css y el marcado a app-view.js, cargado antes de boot.
app.html fuente sigue siendo la única verdad editable. No es ocultación ni
protección criptográfica: los archivos descargados siguen siendo inspeccionables.
CSS y vista nuevos están versionados y en la precarga de la PWA.

Desde v585, «Invítame un café»/«Buy me a coffee» al final compartido de la
app y de la landing, enlazado a https://ko-fi.com/jonathanvelasquez0624.
Abre en otra pestaña, reutiliza los botones existentes y adapta los temas.
Desde v586 el botón usa texto y espaciado compactos; se retiró del pie el
mensaje obsoleto que afirmaba que todos los datos permanecían solo locales.
Es apoyo voluntario; no condiciona funciones ni registra pagos en Finanzas.
No hay widgets, SDK externos ni procesamiento de pagos dentro de la tool.

Desde v587 la batalla aprobada aparece en Inicio: ciudad pixel art, héroe,
monstruo existente con sus especies/fases/accesorios, vida financiera,
controles y diez armas; indicadores reales del día y Misiones/hitos debajo.
Pistola, Subfusil, Escopeta, Lanzacohetes, Railgun, Lanzallamas, Too Much,
Dron, PSR B0531+21 y Varita mágica son selecciones visuales persistidas en
settings.game.weapon; Granada es una acción de práctica. Tocar al héroe,
Enter y los controles táctiles disparan sin cambiar llamadas, dinero, vida,
combo, productividad ni XP. Cada tres activaciones muestra un aviso breve;
una ráfaga cuenta como una. Los atajos numéricos actúan solo con foco dentro
de la batalla, sin interceptar formularios de la tool.
Manual/live/pegado usan recibos existentes y registran datos antes del
ataque visual. Históricos, correcciones, duplicados y sellado conservan sus
reglas. La cola agrupa importaciones grandes en hasta seis representaciones;
editar/borrar llamadas, cambiar meta/fecha o desactivar/ocultar cancela efectos
viejos y sonidos pendientes.
Sonidos de once armas sintetizados, con prioridad inferior a celebraciones,
volúmenes existentes y cancelación inmediata de voces activas/programadas.
El componente pausa rAF fuera de vista, libera listeners/observadores y tiene
límites de partículas. Movimiento reducido y fallback sin canvas conservan
resultados estáticos. La PWA incluye el CSS nuevo. Inglés sigue por defecto
y Logros desactivado para cuentas nuevas. Véase docs/heroe-y-batalla.md.
Chrome aislado: recorridos manual/live/pegado/ayer/duplicado/editar/borrar,
200 llamadas importadas y práctica sin cambios contables; matriz final de
128 combinaciones ES/EN, 320/390/768/1365, ocho paletas y ambos temas sin
overflow. 141 comprobaciones finales de layout/lifecycle y capturas correctas.
Auth y nube usan fixtures; no certifica sincronización real en dos dispositivos.

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
- La dirección visible de la cuenta es `/` después de montar con sesión.
  `/app` sigue siendo el punto de carga y `/app.html` redirige conservando
  parámetros. La raíz conserva la landing pública indexable; al recargar,
  detecta la sesión y reabre la app. La PWA mantiene su identidad y precarga.
- Gamificación compacta: modo automático tranquilo durante llamadas, ataque al
  guardar una llamada y duelo opcional solo en descanso o fuera del turno. Las
  diez armas, misiones, hitos y progreso financiero se conservan.
- Landing bilingüe estática, canonical/hreflang y sitemap de cuatro páginas,
  preguntas frecuentes e imagen social. Un bundle público evita cargar tres
  copias de las traducciones; las fuentes no bloquean el primer render.
- La versión actual de la app es 597; el puente es 1.3.0 y el resumen independiente
  1.0.3. Refuerzo positivo y Logros están terminados. La auditoría profunda del
  8 de octubre corrigió seis fallos; la ampliación corrigió cinco más en arranque,
  concurrencia y PWA. Cobertura y límites constan en
  `docs/auditoria-profunda-2026-10-08.md` y
  `docs/auditoria-ampliada-2026-10-08.md`. La aparición por nombre en Google sigue
  pendiente de procesamiento externo; no se repitieron solicitudes por cuota.

---

**ÚLTIMOS FIXES (máx. 3, los más recientes)**

**v597** — Auditoría ampliada con SQL aislado y fallos de red.

- Arranque: subidas con revisión, base protegida para cuentas nuevas y elección
  local que completa la subida sin pisar escrituras posteriores.
- PWA: reabre la copia local de la misma cuenta sin red, conserva la base y
  gestiona fallos de actualización/cuota de caché sin rechazos sin manejar.
- 319 pruebas, 17.000 casos contra modelos independientes, 15 escenarios SQL,
  500 llamadas en trabajador/receptor y descarga simulada de 100.000 llamadas.
  Navegador real con SQL local: conflicto, offline, reconexión y respuesta perdida.
  Sin entorno Supabase de pruebas; OAuth, cron alojado y dispositivos físicos
  siguen fuera de la certificación. Datos reales intactos.

**v596** — Auditoría profunda de integridad y uso mensual.

- Nube: historial completo paginado, compatibilidad antigua solo ante tabla/RPC
  ausente y comprobación de revisión antes de adoptar datos descargados.
- Puente: una pestaña desactualizada bloquea eventos automáticos hasta recargar,
  conservando llamadas nuevas. Hitos monetarios toleran errores decimales mínimos.
- 31 días simulados, 35 comprobaciones adicionales, 48 layouts y 298 pruebas
  correctas. Checks/build de app y extensiones pasan. Datos reales intactos;
  autenticación/nube entre dispositivos físicos no certificadas.

**v595** — Identidad de la portada para búsquedas por nombre.

- Propio Shift Tracker al inicio del título y en el H1/presentación, en inglés
  y español. Descripciones, Open Graph y WebSite usan la misma identidad.
- Seis checks SEO y build completos; revisión de traducción, acceso y ancho
  móvil. CI completa y Vercel correctos; Google confirma el HTML nuevo de
  ambos idiomas. Solicitud de actualización rechazada por cuota, sin bucles.
  Sin posición garantizada: Google debe volver a procesar la portada.
