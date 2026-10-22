# Logros: reglas, equipo y premios

Alcance de la fase 9 del plan aprobado: puntos 53–60. Se amplían los
componentes existentes de Logros y la batalla de Inicio; no se cambia la
composición general ni el cálculo de llamadas, pagos o Finanzas.

- **53, activación:** Preferencias de Logros explica el progreso y la separación
  del refuerzo positivo. Apagar conserva el progreso; si falla el guardado se
  revierte la preferencia y ambos controles vuelven al estado guardado.
- **54, armas y práctica:** Gamificación → Armas, práctica y duelo explica el
  acceso en Inicio, teclado y controles móviles. Se mantiene el catálogo de
  armas y sus efectos; jugar no produce llamadas, ingresos ni XP laboral.
- **55, XP y reglas:** Nivel conserva el XP acumulado y añade el XP del día,
  componentes, elegibilidad, tope y correcciones en su detalle existente. El
  nivel usa el acumulado; la racha usa cumplimiento; los récords consultan las
  llamadas guardadas. Una importación histórica no abre XP retroactivo.
- **56, cofre:** el mismo panel distingue meta pendiente, disponible, reclamado
  y ajustado por corrección. No se añade otra fuente de premios. La acción
  canónica de Inicio conserva su clave por día, persistencia y reversión.
- **57, colección:** el filtro existente separa obtenido/equipado/disponible/
  bloqueado. Cada pieza permite desplegar una vista previa sin equiparla ni
  escribir estado. Equipar continúa usando la acción canónica; las vistas
  previas abiertas sobreviven al render de actualización.
- **58, premios personales:** el editor sencillo conserva sus opciones avanzadas
  plegadas y permite pausar un premio sin retirar lo ganado. La lista muestra
  por separado pendientes y realizados cuando ambos existen. No registra
  gastos, compras ni dinero al realizar un premio personal.
- **59, duelo:** solo se inicia en Break/Lunch o fuera de turno. Volver al
  trabajo lo pausa y vuelve a Automático; el regreso al duelo requiere una
  acción explícita y conserva puntos/vidas/tiempo de esa ronda en la escena
  montada. Recargar o cambiar los registros puede reiniciar la ronda de juego;
  no se promete persistir una partida fuera de esa escena.
- **60, ciclo:** el jefe identifica el intervalo del ciclo actual. Un premio
  pendiente identifica su propio cierre aunque corresponda al ciclo anterior;
  después de elegir se conserva una constancia visible del último premio
  reclamado. Cumplir una meta de juego no confirma un depósito bancario.

## Verificación

Pruebas de `game-battle`, `game-phase6`, `game-review`, `super-audit-game` y
`reward-editor-owner`: separación juego/trabajo, pausa/reanudación, cierres,
correcciones, idempotencia y reversión ante rechazo de guardado. Regresión
añadida para fallo al guardar activación y conservación del progreso al apagar.

La matriz visual compilada de esta entrega usa cuentas y llamadas ficticias.
La evidencia y el estado de publicación se registran en el plan y en el cierre
general de la entrega. No certifica dispositivos físicos, audibilidad ni una
partida humana real.
