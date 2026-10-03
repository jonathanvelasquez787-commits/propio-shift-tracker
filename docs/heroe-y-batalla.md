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

## Armas y práctica

Hay diez armas: Pistola, Subfusil, Escopeta, Lanzacohetes, Railgun,
Lanzallamas, Too Much, Dron, PSR B0531+21 y Varita mágica. Se seleccionan en
las tarjetas o con las teclas 1–0 cuando el foco está dentro de la batalla.
La elección es visual y se guarda en `settings.game.weapon`, junto con los
ajustes exportables y sincronizados de la cuenta. Backups antiguos o valores
inválidos usan Pistola.

Tocar al héroe, usar el botón Práctica o Enter dispara sin modificar dinero,
vida, llamadas, productividad, combo ni XP. Cada tercera activación muestra
un aviso breve que explica que el daño requiere llamadas reales. Una ráfaga
cuenta como una activación. Granada se usa con su botón, G o click derecho
dentro de la escena; también es práctica.

A/D o las flechas permiten caminar; Espacio o el botón de salto permiten
saltar. Los controles táctiles ofrecen las mismas acciones. Las plataformas
del fondo son decorativas.

## Preferencias y recursos

Los sonidos de armas reutilizan Sonidos arcade y sus controles de volumen.
Las celebraciones importantes tienen prioridad sobre los disparos. Apagar
Logros retira la batalla y cancela efectos, avisos y sonidos pendientes,
conservando los datos. Silenciar cancela también las voces ya programadas.

La escena pausa su bucle cuando deja de estar visible y cancela efectos al
cambiar de fecha. Desmontarla libera listeners, observadores y temporizadores.
La cola de representaciones y las partículas tienen límites. Movimiento
reducido conserva mensajes y resultados estáticos; si canvas no está
disponible, quedan el héroe SVG y los controles accesibles.

Los personajes y efectos usan arte original adaptado del mockup aprobado,
sin assets remotos ni una nueva dependencia de juego. Se conservan especies,
fases y accesorios del monstruo existente. La interfaz usa los temas y
paletas de la aplicación y sus catálogos español/inglés.
