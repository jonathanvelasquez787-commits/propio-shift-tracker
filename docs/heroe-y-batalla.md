# Héroe y batalla del día

La batalla aparece en Inicio al activar Logros y tener una meta diaria de
ganancias mayor que cero. Usa las llamadas, metas, misiones y XP reales de
la aplicación. Logros conserva su valor inicial desactivado para cuentas
nuevas.

## Llamadas y progreso

Manual, en vivo y pegado producen un ataque al registrar una llamada válida.
El registro y los cálculos ocurren antes de la animación: cerrar la escena,
silenciarla o usar movimiento reducido conserva el mismo dinero y progreso.
Los recibos existentes evitan repetir recompensas y ataques al reimportar.
Las importaciones grandes agrupan representaciones visuales y mantienen todas
las llamadas guardadas.

La vida procede de la relación entre ganancias y meta del día seleccionado.
Editar o borrar llamadas vuelve a calcularla y cancela sus efectos pendientes,
igual que cambiar la meta del día. Las llamadas históricas afectan
a su propio día y pueden registrar una derrota histórica; no generan un
ataque ni XP nuevo sobre el monstruo actual. Se conservan los límites,
elegibilidad y sellado de XP de la gamificación anterior.

## Combate automático y armas

Hay diez armas: Pistola, Subfusil, Escopeta, Lanzacohetes, Railgun,
Lanzallamas, Too Much, Dron, PSR B0531+21 y Varita mágica. Se seleccionan en
el selector o con las teclas 1–0 cuando el foco está dentro de la batalla.
La elección es visual y se guarda en `settings.game.weapon`, junto con los
ajustes exportables y sincronizados de la cuenta. Backups antiguos o valores
inválidos usan Pistola.

El héroe camina, dispara y salta automáticamente para esquivar contraataques.
Cada victoria abre otra ronda después de una celebración breve. Las vidas
HÉROE/MONSTRUO de la escena pertenecen exclusivamente a estas rondas: no
cambian llamadas, ganancias, XP ni recibos. La vida real de la meta permanece
debajo, identificada como VIDA DE LA META. El nivel y la barra de XP muestran
progreso real. Un monstruo dormido aparece despierto mientras combate,
conservando su estado financiero.

El especial comienza cargado al montar la batalla. Activarlo consume la carga
y causa daño temporal más fuerte. Las llamadas representadas recargan 25%
cada una, hasta 100%; los lotes usan su cantidad agrupada. El tiempo y los
disparos ambientales no recargan el poder. Rondas y carga son temporales,
no se exportan ni sincronizan. Pausar detiene el combate ambiental. Durante
una llamada live entra inmediatamente en modo tranquilo; al terminar vuelve
el combate si no se había pausado manualmente. Fechas anteriores y una meta
derrotada conservan resultados estáticos.

## Duelo opcional

Duelo · 60 s conserva tres vidas, puntos temporales, movimiento, salto,
disparos y granadas. Solo está disponible en descanso o fuera del turno.
Una llamada lo pausa y regresar exige Continuar duelo. Tocar al héroe o Enter
dispara; G o click derecho lanza una granada. Sus puntos no modifican dinero,
vida financiera, llamadas, productividad, combo ni XP.

A/D o las flechas permiten caminar; Espacio o el botón de salto permiten
saltar. Los controles táctiles ofrecen las mismas acciones. Las plataformas
del fondo son decorativas.

## Preferencias y recursos

El combate ambiental es silencioso. Los ataques por llamadas y el duelo
reutilizan Sonidos arcade y sus controles de volumen.
Las celebraciones importantes tienen prioridad sobre los disparos. Apagar
Logros retira la batalla y cancela efectos, avisos y sonidos pendientes,
conservando los datos. Silenciar cancela también las voces ya programadas.

La escena cancela rAF cuando deja de estar visible y cancela efectos al
cambiar de fecha. Desmontarla libera listeners, observadores y temporizadores.
La cola de representaciones y las partículas tienen límites. Movimiento
reducido conserva mensajes y resultados estáticos, sin rondas en segundo
plano ni simular el tiempo transcurrido al volver; si canvas no está
disponible, quedan el héroe SVG y los controles accesibles.

Los personajes y efectos usan arte original adaptado del mockup aprobado,
sin assets remotos ni una nueva dependencia de juego. Se conservan especies,
fases y accesorios del monstruo existente. La interfaz usa los temas y
paletas de la aplicación y sus catálogos español/inglés.
