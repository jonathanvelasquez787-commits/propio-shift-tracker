**NOTA DE MANTENIMIENTO DE ESTE ARCHIVO (leer antes de editar este .md)**

Este archivo tiene dos partes:

1. **PROTOCOLOS** (de "ESTILO DE LAYOUT" a "FLUJO DE TRABAJO CON ESTE
   REPOSITORIO"). Reglas permanentes — casi no cambian, y NO se tocan al
   cerrar una versión. Solo se editan si el usuario pide explícitamente
   modificar un protocolo.
2. **ESTADO DEL PROYECTO** (de "PENDIENTES" en adelante). Estado actual,
   pendientes, limitaciones conocidas y el historial de las últimas versiones.
   Esta parte SÍ se reescribe en cada cambio nuevo (desde el PR #283 el número
   de versión web quedó en 666 y las entradas se identifican por número de PR):

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

Preferencia permanente del propietario: las interfaces deben verse cuidadas,
atractivas y fáciles de entender. Evitar pantallas planas, bloques enormes de
texto y controles sin jerarquía. Priorizar un resumen breve, acciones claras,
espaciado consistente y detalles extensos plegados, sin esconder información
necesaria. Reutilizar la identidad de la app y comprobar el resultado visual
en móvil/escritorio y claro/oscuro; funcionar correctamente no basta.

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

**PROTOCOLO DE COMENTARIOS EN EL CÓDIGO (leer antes de tocar app.html, js/ o css/)**

Este proyecto es una app de miles de líneas repartidas en `app.html`, módulos
ES en `js/` y estilos en `css/`. El historial de
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
   comentario en el código.
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
- El agente sube cada cambio a una rama nueva y abre un PR (un PR a la vez);
  cuando la revisión automática sale verde, el usuario hace solo dos clics en
  GitHub ("Merge pull request" y "Confirm merge") y el agente confirma por API
  que quedó mezclado. A veces el usuario mezcla sin avisar: revisar antes de
  pedirle los clics. El despliegue a producción ocurre al mezclar.
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

**REGLAS DE TRABAJO CON EL PROPIETARIO (leer siempre — regla permanente)**

Aprendidas con uso real; el propietario se ha molestado cuando se rompieron.

1. **Idioma y tono:** siempre en español, simple y SIN JERGA (decir "se sale de
   la barra", no "desborde"; "al pasar el mouse", no "hover"). Mensajes
   cortos, una cosa por vez. Cuando le toca hacer algo, solo pasos de clics
   (link directo del PR, "Merge pull request", "Confirm merge"), nunca comandos.
2. **Hacer exactamente lo pedido, sin ampliar.** Si algo más debería acompañar,
   preguntar antes. Si en un dibujo se cambia algo que no pidió (colores,
   tamaños, textos que se quitan o se cierran), avisarlo antes de que pregunte.
   Si una orden es ambigua ("los textos", "eso", "lo mismo pero al revés"),
   hacer UNA pregunta mostrando una captura, antes de programar.
3. **Protocolo visual:** (1) captura real de HOY, (2) dibujo real de la
   PROPUESTA dentro de la app (HOY | PROPUESTA, con alto y ancho en px),
   (3) preguntar "¿Lo hago así?" con las imágenes YA mostradas en ese mismo
   mensaje, (4) programar solo tras su "Dale" o la elección de una variante.
   Si responde "No me gusta", dibujar 3 variantes reales. Si elige varias
   opciones a la vez ("1, 2 y 3"), dibujar 3 variantes reales que combinen y
   que elija una. Los bugs, desbordes y colores invisibles se arreglan directo,
   con prueba real, mostrando HOY vs PROPUESTA y avisando.
4. **Si algo del dibujo aprobado NO se va a programar** (porque falta un dato,
   p. ej. una dirección web que no existe en el código), decirlo en la primera
   frase del mensaje, o no dibujarlo. Nunca inventar datos para completarlo.
5. **Auto-revisión antes de mostrar cualquier imagen:** abrir cada PNG y
   revisarla como si fuera el propietario (textos cortados o encimados, iconos
   tapados, bordes cortados por el recorte, piezas que cambian de tamaño);
   comparar HOY vs PROPUESTA con números; probar oscuro Y claro y los anchos que
   apliquen; rehacer el dibujo si hay errores. Imágenes grandes (1300-1470 px de
   ancho), una idea por imagen, con nombre nuevo en cada versión. Si el
   propietario manda la captura de un "error" que no se puede reproducir,
   decirlo con honestidad y no cambiar nada.
6. **Verificar antes de afirmar:** con `git grep`/`git log` y capturas reales;
   nunca decir "ya está hecho" o "no lo pediste" sin mirar.
7. **Pendientes:** si pregunta qué falta, listar TODO lo pendiente con honestidad
   (lista corta numerada, sin lo que ya se quitó).
8. **Extensión:** cada cambio sube la versión (manifest.json, README.md de la
   extensión y extension-lista/LEEME.txt), reemplaza
   extension-lista/propio-bridge.zip y se le manda el zip; pasos para él:
   descomprimir, quitar la anterior en Chrome, "Cargar descomprimida".
9. **Secretos:** nunca escribir tokens ni contraseñas en el repositorio (este
   archivo incluido); `scripts/scan-secrets.mjs` lo vigila.
10. **Gasto de tokens:** trabajar por partes, un PR por parte; si avisa que se
    acaban, entregar el contexto actualizado y actualizar este archivo.

---

**PENDIENTES**

- **Botón «Abrir historial de Propio» en el popup de la extensión (2.3.21):** estaba en el dibujo B que el propietario aprobó el 18/11, pero NO se programó porque la dirección de esa página no existe en ningún archivo de `extension/propio-bridge/` (solo aparece propio.com). Hacerlo solo cuando el propietario pegue la dirección exacta del historial de llamadas de Propio; no inventarla. El resto de la variante B (lista «Ver las N señales», botón «Descartar señales revisadas», aviso al descartar) ya está publicado (PR #334).
- **Aviso de seguridad de la revisión automática:** `pnpm.auditConfig.ignoreGhsas: ["GHSA-fc5q-39xc-vjpf"]` (picomatch, solo desarrollo) se agregó en package.json con permiso del propietario; quitarlo cuando exista una versión corregida.
- **Siguiente rediseño a elegir con el propietario:** Finanzas, Fechas de pago, Calendario o Ayuda (el Horario y sus tarjetas ya están rediseñados). Se pregunta con capturas reales antes de programar.
- **Decidido el 18/11:** la cola de eventos pendientes de la extensión se queda como está (el propietario descartó quitarla y descartó que las señales viejas se borren solas).

- **Ocho pedidos directos del 22/10:** implementación y evidencia reunidas en
  docs/cierre-ocho-pedidos.md. Web 639 aporta el hover con segundos; 640 integra
  Reportes y restaura la fecha azul; 641 cierra galería, lenguaje y control
  visual. Confirmar el commit público con cierre-641-production.json fuera de
  Git. Este cierre no completa las veinte mejoras funcionales del plan.

- **Mejoras integrales aprobadas el 18/10:** 79 de 79 publicadas. Las veinte restantes están implementadas y probadas en web 642 / extensión 2.3.5. El propietario aportó una captura del popup con 2.3.5 el 22/10; confirma su activación y cierra 14, 63, 64 y 74. Inventario y límites en [plan](docs/plan-mejoras-integrales.md) y [cierre 642](docs/cierre-642.md).
- **Ancho del popup:** corregida la regresión responsive de 2.3.5 que permitía un popup estrecho. Se restaura el ancho intrínseco de 400 px; la versión y el worker no cambian. La corrección de CSS se instala conservando preferencias y se carga al volver a abrir el popup. No reabrir por ello los cuatro puntos ya confirmados.
- **Segundos oficiales de Propio:** confirmar con evidencia si el último minuto
  incompleto se incluye en duración y pago. El formato de hora visible no lo demuestra.
  No cambiar ACW ni alargar llamadas por esa suposición.
  El 21/10 el propietario eligió para las nuevas estimaciones personales el umbral
  inclusivo de 40 s: 7:39 → 7 min y 7:40 → 8 min. Implementado en web 636,
  publicada en PR #98 (main 7cf6016a3512aaf314655e6971fcc2f86c19c1d2); conserva duración real, importes anteriores y prioridad de los
  datos importados. Ver docs/redondeo-de-estimaciones.md. La regla oficial sigue
  sin confirmar; no confundir ambos estados.
- **Visibilidad por nombre en Google:** pendiente de procesamiento externo. La
  comprobación del 8/10 encontró la raíz indexada con canonical correcto, pero
  todavía el título anterior y sin posición en primera página por la marca.
  Hubo rechazo por cuota; no repetir solicitudes ni activar otro reintento sin
  petición. Conservar verificación y lastmod reales. Detalle en [SEO](docs/seo.md).
- **Traducción automática opcional:** Locize está preparado, sin cuenta/proveedor
  activo confirmado. Solo falta contratar/configurar la cuenta y sus secretos si
  el propietario decide activarlo. ES/EN funcionan localmente sin ese servicio;
  ver [idiomas y temas](docs/idiomas-y-temas.md).

- **PR #332 — Cápsula de una sola pieza (solo CSS).** Desde 480 px se quita la línea que partía el icono de la píldora en Break, Lunch y Llamada, y el borde blanco al pasar el mouse rodea solo botón + píldora; el basurero conserva su borde. Por dentro siguen siendo dos piezas (`#...ControlBtn` y `#heroBlockCard`); unirlas del todo se evaluó y no se hizo por riesgo. Bloque `/* capsula una pieza */` al final de `css/app-shell.css`; prueba `tests/capsula-una-pieza.test.mjs`.

- **PR #333 y #334 — Popup de la extensión (2.3.20 y 2.3.21).** El botón «Descartar señales revisadas» solo estaba dentro de Estado de conexión → Detalles para soporte; ahora vive también al final de «Eventos pendientes». #334 agrega «Ver las N señales» (tipo y hora; el worker manda `queueItems` con solo `type` y `at`, máximo 50), deja «Cómo resolverlos» cerrado y muestra «Señales descartadas. Volvió el modo de observación.» tras descartar. Prueba `tests/senales-pendientes-lista.test.mjs`. Verificado con un popup real y una API Chrome simulada, tema claro y oscuro.

- **PR #330 y #331 — Barra en celular angosto y tema claro.** A 320 px los botones de la barra de acciones se achican de 40 a 36 px y ya no se salen (`/* barra en celular angosto */`). En tema claro el riel del Volumen y el fondo del anillo de % de la meta usan `var(--line-2)` (`/* riel y anillo en tema claro */`). Pruebas `barra-celular-angosto` y `riel-anillo-claro`.
