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
v577, simplificada en v579: «Activar Logros» visible en cabecera y menú lateral;
nivel/XP y racha/escudos juntos, sin duplicar el perfil; jefe del ciclo, última
victoria/cofre y récords; equipo, bestiario/trofeos e historial positivo.
Mis premios y desbloqueos por nivel son desplegables con todo su contenido.
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
   Si hay menos evidencia, no se inventan frases. El refuerzo personal solo
   muestra su cierre amable cuando el juego está apagado. No hay cierres
   automáticos duplicados y el premio físico espera a cerrar el resumen.
   Los importes del resumen usan la moneda secundaria vigente al consultarlo.
   El cierre nocturno conserva la proyección del día contable; las correcciones
   históricas no proyectan rachas nuevas. Cerrar siete días, restaurar backup
   y reabrir el turno conserva y revoca correctamente XP/escudo/metadatos.
7. Accesibilidad: catálogo común de variantes y canales personales/juego
   independientes. Arcade es el modo fijo. Movimiento reducido conserva
   mensajes y resultados sin partículas ni animaciones. Máximo tres toasts;
   no se repite el último texto consecutivo. Apagar Logros conserva llamadas,
   XP, recibos y refuerzo personal. El interruptor lateral y el de Logros
   comparten el mismo ajuste y guardado, independiente del tema.

Todo estado nuevo vive en el modelo game exportable/sincronizado, normalizado
para backups antiguos. El ledger admite hasta 30.000 recibos y los días
conservan su límite de 400. El Laboratorio QA y sus recorridos se retiraron.
Mis premios conserva catálogo, personalización, ventanas seguras, historial,
costos informativos e idempotencia; no existe límite semanal de presupuesto.

Verificación actual: 173 pruebas, contratos/ciclos de 19 módulos, wiring y build
de producción sin sourcemaps. Chrome aislado en claro/oscuro a 320, 390, 768
y 1365 px: Inicio/Logros sin overflow, llamadas manual/live/pegado/ayer/duplicado,
derrota, cierre, cofre idempotente, activación en ambas ubicaciones, progreso
conservado y movimiento reducido. Las pruebas no certifican una sesión real
autenticada en dos dispositivos. El mockup pixel art fue aprobado por el usuario.

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
- La versión actual es 579. Refuerzo positivo, Logros y auditoría profunda
  están terminados. Los siete fallos de la auditoría se corrigieron con
  regresiones; cobertura y límites constan en
  `docs/auditoria-profunda-2026-09-30.md`.

---

**ÚLTIMOS FIXES (máx. 3, los más recientes)**

**v579** — Ajustes simples y activación de Logros desde el menú lateral.

- «Activar Logros» reemplaza «Activar El Monstruo»; interruptores sincronizados
  en cabecera y menú lateral, junto a Modo oscuro, con un solo ajuste persistente.
  Desactivar/reactivar conserva XP, llamadas y recibos; el tema es independiente.
- Retirados selector de intensidad y Plan del día. Arcade fijo, también para
  preferencias antiguas. Misiones automáticas de productividad, pausas y
  adherencia; enfoques antiguos de resultados sellados se conservan.
- Mis premios pierde presupuesto y límites de gasto; preferencias antiguas
  no bloquean premios. Permanecen costo informativo, catálogo, personalización,
  acumulación, límites diarios, ventanas seguras e historial idempotente.
- 173 pruebas y build/wiring de 19 módulos correctos. Chrome en claro/oscuro,
  320–1365 px; controles reales de ambas ubicaciones, progreso intacto,
  llamadas y efectos pixel art, cierre/cofre y movimiento reducido verificados.

**v578** — Gamificación pixel art aprobada y retirada del Laboratorio QA.

- Marcos escalonados y colores claro/oscuro de la tool; sprites, iconos,
  armaduras, vida segmentada, estrellas y cofres SVG. Misiones e hitos
  compactos, equipo en filas legibles y preferencias al principio de Logros.
- Golpes con daño flotante y partículas acotadas, misiones, derrota, estrellas
  y apertura de cofre. Efectos breves respetan Sutil/Off y movimiento reducido.
  Ganancias, XP, recibos y reglas permanecen iguales; monstruo en Inicio.
- Eliminados panel, accesos, guía y módulos del Laboratorio QA. Limpieza de
  compatibilidad borra solo cuatro claves de simulación y conserva los datos
  reales incluso si una clave antigua es ilegible o no se puede eliminar.
- 171 pruebas, imports/ciclos y wiring de 19 módulos y build correctos.
  Chrome en claro/oscuro a 320, 390, 768 y 1365 px: Inicio/Logros sin overflow,
  fila de bloques, manual/live/pegado/ayer/duplicado, derrota, cierre, cofre
  idempotente y modos de movimiento verificados con datos locales aislados.

**v577** — Distribución coherente de Logros e hitos debajo de Misiones.

- Activación siempre visible arriba; nombre, enfoque, intensidad, refuerzo y
  cierre breve antes del progreso. Presupuesto, premios y catálogo desplegables.
- Nivel/XP y racha/escudos consolidan el perfil duplicado. Desbloqueos por nivel
  desplegables conservan las once entradas. Jefe del ciclo compacto; victoria,
  cofre y récords antes de equipo, bestiario, trofeos e historial positivo.
- QA y reinicio en paneles separados al final; acceso superior a QA abre y lleva
  al selector. Chevron correcto en acordeones anidados. Mismos IDs y listeners.
- Hitos de ganancias en un pie compacto inmediatamente después de Misiones,
  con cuatro marcadores conectados, registrados en verde y próximo hito/restante.
- 187 pruebas y build/wiring de 21 módulos correctos. Chrome en claro/oscuro y
  320, 390, 768 y 1365 px sin overflow; controles, despliegue de premios y
  desbloqueos, llamadas manual/automática/pegado/ayer/duplicado y ambos recorridos
  QA comprobados con datos aislados, incluyendo recarga, reinicio y restauración.
