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

- **Mejoras integrales aprobadas el 18/10:** ejecutar las recomendaciones de la
  evaluación de 79 funciones por fases; alcance y estado completo en
  [plan de mejoras](docs/plan-mejoras-integrales.md). Inicio y preparación publicados:
  15 mejoras cerradas; 33–35 resueltas en orden. Higher Rate en curso: siguen 36
  y después 37, con limpieza protegida y recálculo pendiente. No perder las fases posteriores al
  entregar una parte ni considerar pendiente la instalación ya confirmada.
- **Segundos oficiales de Propio:** confirmar con evidencia si el último minuto
  incompleto se incluye en duración y pago. El formato de hora visible no lo demuestra.
  No cambiar ACW ni alargar llamadas por esa suposición.
- **Visibilidad por nombre en Google:** pendiente de procesamiento externo. La
  comprobación del 8/10 encontró la raíz indexada con canonical correcto, pero
  todavía el título anterior y sin posición en primera página por la marca.
  Hubo rechazo por cuota; no repetir solicitudes ni activar otro reintento sin
  petición. Conservar verificación y lastmod reales. Detalle en [SEO](docs/seo.md).
- **Traducción automática opcional:** Locize está preparado, sin cuenta/proveedor
  activo confirmado. Solo falta contratar/configurar la cuenta y sus secretos si
  el propietario decide activarlo. ES/EN funcionan localmente sin ese servicio;
  ver [idiomas y temas](docs/idiomas-y-temas.md).

**CONFIRMACIONES Y CONFIGURACIÓN LOCAL VIGENTES**

- El usuario confirmó inicio automático de llamadas, regreso tras Break y arranque
  correcto después de reiniciar. La recarga de Propio/tracker está confirmada;
  después confirmó 2.2.10 tanto en Chrome como en el popup. No volver a presentar
  esa instalación como pendiente.
- Chrome Jonathan se abre al iniciar Windows y se organiza también al abrirlo
  manualmente, a cualquier hora. Propio y https://app.useinterpreter.com/ quedan
  a la izquierda; tracker y Linguee arriba a la derecha; Notas debajo, ancho 5/16
  y proporción de altura .612. No hay franjas horarias para ese organizador.
- El inicio de Chrome sigue apuntando a chrome.exe con Default, restore-last-session
  y el organizador. Escritorio usa Open-Chrome-And-Notes.exe; inicio de Notas usa
  el mismo iniciador con --notes-only. Código en windows/ e instalador en scripts/.
  Binario/configuración personal: Documents/Propio Workspace, fuera del repositorio,
  evitando redirección MSIX de LocalAppData. Reutiliza la ventana de notas y no
  modifica su texto. Accesos originales respaldados.
- El usuario confirmó resueltos el puente y entregas anteriores; no inferir desde
  eso una versión instalada nueva ni una ficha pública de Chrome Web Store.
  La extensión actual se distribuye desde archivo según el propietario.
- La automatización de reintentar indexación quedó PAUSED. No reactivarla ni
  publicar mensajes en comunidades sin autorización.

**ALCANCE DE VALIDACIÓN**

- La auditoría solicitada del 15–17/10 está cerrada: siete grupos corregidos,
  798 pruebas en su cierre y 32 días con cuenta ficticia. CI y publicación en
  PR #73; confirmación de recarga conservada. Los diez informes anteriores están
  [consolidados con originales inmutables](docs/auditoria-profunda-2026-10-17.md).
- App y extensión conservan pruebas de persistencia, aislamiento, contabilidad,
  regresiones y SQL local. No confundir fixtures con dos PCs Google humanos,
  OAuth humano nuevo, cron alojado, dispositivos físicos o audibilidad real.
- Las capturas de todas las variantes nativas de llamada/Save siguen sin
  certificación completa; el funcionamiento confirmado por el usuario no prueba
  cada variante. No provocar llamadas para comprobarlo.
- No hay exclusión global entre PCs ni reloj servidor independiente para cambios
  arbitrarios de hora/zona. Usar iniciadores en una PC. Chrome puede demorar
  alarmas, congelar páginas y no ejecuta automatismos con la PC suspendida.
- El iniciador pasó --verify, 32 geometrías, 38 pruebas de workspace y posición
  real de Notas; no se certificó otro monitor físico ni un nuevo reinicio físico.
- PostgreSQL alojado se actualizó el 12/10 a 17.11.0.003 con nueve migraciones y
  tablas RLS. Perfil/ajustes/estado se compararon con copia fresca; cero llamadas
  en nube era intencional según el usuario. No restaurar datos antiguos encima
  de actividad nueva. Controles, recuperación y fechas en docs/production-*.md.

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
- `possiblePauseTotal` continúa en los resultados contables por compatibilidad
  con sus consumidores y regresiones; no se elimina un contrato por carecer de render.
- Importación: `parseCalls` guarda `pay` tal como viene en el texto pegado,
  sin clampear negativos (a diferencia del editor/modal manual, que sí lo
  hacen) — no se tocó a propósito porque cambiaría `callDedupeKey` y con eso
  la detección de duplicados de llamadas ya guardadas.
- `parseMoney` conserva la semántica de los pagos antiguos importados para no
  cambiar su deduplicación. Las entradas manuales de asignación de Finanzas
  usan otro parser estricto: `"12,50"` corresponde a 12.50, también en moneda local.
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

- App 626; extensión unificada 2.2.10 (versión visible y recarga confirmadas).
  Diseño compacto aprobado: resumen cerrado y preparación al pulsarlo.
  El panel de disponibilidad está en la tool;
  el popup de Chrome configura la extensión y esta transmite el estado a la web.
  Resumen independiente retirado, sin build
  mantenido. El historial oficial compartido y las funciones del tracker siguen
  activos. Guía de 73 funciones en docs/guia-practica-tool-y-extension.md.
- Google es la entrada pública. Formularios deshabilitados de login/registro y
  solicitud de contraseña retirados; se conserva recuperación de enlaces emitidos,
  perfil, cierre de sesión y el endpoint heredado protegido con sus regresiones.
  No se cambió configuración de Auth ni esquema alojado. Email/SMTP siguen apagados.
- app.html mantiene el marcado; css/app-core.css contiene sus estilos, en el
  mismo lugar de la cascada. js/app-main.js coordina módulos; weekly-summary.js
  recibe entradas actuales sin poseer estado. Boot verifica cuenta antes de montar.
- Traducciones fuente en locales/; js/locales.generated.js se genera antes de
  pruebas/build y no se versiona. No se suben salidas de work/, outputs/, artifacts/
  ni instaladores generados. README concentra la documentación de entrada.
- Cuenta y llamadas sincronizadas bajo RLS, revisiones y propietario local. No
  mezclar automáticamente conflictos ni anunciar éxito tras rechazar guardado.
  Migraciones, lockfile, pruebas, presupuestos y protecciones se conservan.
- Funciones y reglas de Finanzas, premios, Higher Rate, fechas contables, idiomas,
  sonidos y organización se documentan en sus guías actuales; los informes y Git
  preservan la evidencia histórica. No recrear un diario de versiones aquí.
- Frase fija del saludo blanca en oscuro y negra en claro. Menú mantiene Horario
  después de Finanzas; botón de moneda recuerda la preferencia y equivalencia
  debajo. El cambio interno no rediseña la interfaz.

---

**ÚLTIMOS FIXES (máx. 3, los más recientes)**

**v626 — Ganancias, moneda y tarifa, en el orden aprobado.**

- Desglose plegado del día/ciclo: base registrada, estimada en vivo, bono
  Higher Rate y total. Incluye bonos conservados y se actualiza con la
  corrección oficial, sin duplicar ni reescribir pagos.
- Tasa manual consultable y preferencia de moneda conservada. Ajustes explica
  el alcance de cambiar tarifa y conversión sin alterar pagos históricos.
- Renderizadores de detalle en módulo versionado y precargado offline;
  recuperación ante descarga fallida comprobada en Chrome aislado, sin
  reintentos en cada actualización del reloj. Presupuestos originales intactos.
- 854 pruebas, builds y recorridos ES/EN, claro/oscuro y cuatro anchos. Alcance
  y evidencia en docs/ganancias-desglose.md. Siguen 36 y 37; extensión sin cambios.

**v625 — Limpiar Higher Rate conserva llamadas y bonos.**

- Limpieza de ventanas terminadas con vista previa de cantidades e importe
  conservado, incluida moneda secundaria. No altera pago base, asignaciones
  de Finanzas ni recompensas; conserva el nivel del bono en cada llamada.
- Confirmación ligada a los datos y cuenta actuales, guardado completo con
  reversión ante rechazo y protección contra ejecutar dos veces el mismo clic.
- 846 pruebas y 12 recorridos ficticios ES/EN, claro/oscuro y tres anchos,
  con cancelar, limpiar y reabrir conservando ganancias. Build y presupuestos
  correctos. Evidencia y límites en docs/higher-rate-limpieza.md.
- El recálculo explícito sigue pendiente y nunca formará parte de limpiar.
  La extensión continúa en 2.2.10; esta entrega modifica solo la tool web.

**v624 — Resumen compacto y estilos de la misma publicación.**

- El panel web identifica el estado de la extensión, muestra el motivo y el
  contador sin desplegar toda la explicación. Preparación y ayuda plegadas,
  sin perder los datos existentes; mismo JS, ids y decisiones automáticas.
- Mockup claro/oscuro aprobado y diseño único responsive. 336 vistas aisladas
  ES/EN, cuatro anchos y 21 estados, con apertura por teclado y sin desbordes.
- El build versiona los cinco CSS de la app junto con HTML y precarga offline.
  Evita reutilizar una entrada vieja sin versión; regresiones de mezcla de
  estilos y funcionamiento offline. No se inspeccionó el caché del usuario.
- La extensión se conserva en 2.2.10: no es una nueva entrega de su motor.
- 838 pruebas completas, build ES/EN, wiring y presupuestos correctos.
