# Héroe y batalla del día

La tarjeta compacta aparece en Inicio al activar Logros y tener una meta diaria
positiva. Una misma composición funciona en móvil y escritorio, con los temas
y paletas de la app. Logros sigue desactivado para cuentas nuevas.

## Llamadas y progreso

La única barra representa ganancias reales frente a la meta del día seleccionado.
No hay rondas ambientales, contraataques ni vidas independientes. El héroe
acompaña el trabajo; entre llamadas permanece tranquilo.

Manual, live y pegado animan un ataque por llamada válida guardada del día
actual. Higher Rate produce un crítico. Cada tres llamadas representadas
activan automáticamente el especial del arma; los lotes agrupados conservan
su cantidad. No hay botón manual de especial ni carga visible.

La app guarda y calcula antes de animar. Los recibos evitan repetir ataques y
premios por duplicados, correcciones o reimportaciones. Los lotes limitan las
representaciones visuales sin perder llamadas. Editar/borrar llamadas o cambiar
meta/fecha recalcula el progreso y cancela efectos pendientes. Los históricos
actualizan su propio día sin atacar al monstruo actual ni conceder XP nuevo.
Las reglas de elegibilidad, límites y sellado de XP permanecen vigentes.

## Cofre de la meta

Al cumplir la meta del día actual, la escena muestra «¡Cofre ganado!» y permite
abrirlo sin modal. Requiere Logros activo y ninguna llamada live en curso. El
premio se guarda inmediatamente en el único recibo `chest:fecha` de ese día.
Repetir, recargar, cerrar el turno o continuarlo no concede otro cofre diario.
Una meta cero y los días históricos no habilitan esta apertura.

El primer premio es Visor violeta si aún no está obtenido; se puede equipar en
la cara desde nivel 1. Después se concede un cosmético no obtenido disponible
por nivel o 25 XP si no hay ninguno. Abrir el cofre deja un aviso compacto con
el premio real y permite ver al héroe con su equipo.

Si una corrección, borrado o cambio de meta elimina el cumplimiento, se revoca
solo el recibo de meta y su accesorio/equipo o XP. Volver a cumplir permite
recuperar el premio sin acumular XP por alternar correcciones. Los recibos y
cofres pendientes anteriores conservan su comportamiento y bloquean premios
duplicados del mismo día. Ninguna recompensa modifica las ganancias.

## Logros, armas y duelo

El botón Logros abre un panel inicialmente cerrado con nivel y XP reales,
colección, equipo, selector de arma y acceso a Logros completos. Misiones e
hitos se consultan en Logros completos; no añaden barras ni indicadores al
encabezado de Inicio.

Las diez armas son Pistola, Subfusil, Escopeta, Lanzacohetes, Railgun,
Lanzallamas, Too Much, Dron, PSR B0531+21 y Varita mágica. La selección visual
se guarda en `settings.game.weapon`, junto con los ajustes exportables y
sincronizados. Las teclas 1–0 funcionan con foco en la batalla. Los valores
antiguos o inválidos usan Pistola.

Duelo · 60 s es opcional, disponible en descanso o fuera del turno. Conserva
vidas, puntos temporales, movimiento, salto, disparos y granadas; muestra sus
controles solo al seleccionarlo. Una llamada lo pausa y regresar exige
Continuar duelo. A/D o flechas mueven, Espacio salta, Enter o tocar al héroe
dispara, y G o click derecho lanza granada. Los controles táctiles equivalen a
las teclas. El duelo no modifica llamadas, dinero, productividad, combo ni XP.

## Preferencias y recursos

La cabecera permite pausar la animación y cambiar Sonidos arcade. Durante una
llamada live la escena entra en modo tranquilo inmediatamente. Los ataques y
el duelo respetan los volúmenes existentes; las celebraciones tienen prioridad.
Silenciar cancela voces activas y programadas. Apagar Logros cancela efectos,
avisos y sonidos pendientes y conserva los datos.

Fuera de vista se suspende rAF; desmontar libera listeners, observadores y
temporizadores. La cola y las partículas tienen límites. Movimiento reducido
mantiene mensajes y resultados estáticos sin recuperar animaciones atrasadas.
Si canvas no está disponible, quedan héroe SVG y controles accesibles.

Se mantienen las especies, fases y accesorios originales del monstruo, con
arte pixel adaptado del mockup aprobado, sin assets remotos ni dependencias
nuevas. La interfaz usa los catálogos español/inglés de la aplicación.
