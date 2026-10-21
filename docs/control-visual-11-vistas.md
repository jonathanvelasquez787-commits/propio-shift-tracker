# Control visual de las once vistas aprobadas

Aprobación del propietario, 20/10/2026: «Aprobadas». Referencia: el archivo
externo `outputs/mockup-completo.html`, con once vistas y sus detalles.

**11 de 11 vistas implementadas y comprobadas con datos ficticios.** La maqueta aprobada se
comprobó en 66 combinaciones de tema/ancho; ese resultado pertenece a la
maqueta y no certifica la implementación. Ninguna casilla se cierra por un
build, una captura de la maqueta o la ausencia de desbordamiento solamente.

## Evidencia necesaria para cerrar cada vista

- Misma jerarquía que la referencia aprobada: dato principal, acción clara y
  explicación contextual. Sin volver a apilar párrafos largos en el resumen.
- Capturas de la aplicación compilada en claro y oscuro, a 320, 390 y 1200 px;
  el popup se comprueba en su ancho real de 400 px con API de Chrome simulada. Registrar los archivos de evidencia
  fuera de Git y enlazarlos desde la guía visual de la entrega.
- Inspección visual de esas capturas comparadas con la referencia: cifras y
  conversiones legibles, espaciado, saltos de línea, contraste y foco visibles.
  La ausencia de desbordamiento es una comprobación adicional.
- Abrir los detalles y ejecutar las acciones relevantes con una cuenta aislada.
  Conservar controles, estados de error, cálculos y resguardos de la función.
  Mostrar siempre las consecuencias necesarias antes de confirmar algo sensible.
- Revisar el conjunto después de cambiar estilos compartidos. Una modificación
  posterior que afecte una vista invalida su comprobación anterior hasta revisarla.

## Estado por vista

Todas tienen diseño aprobado. Las casillas siguientes se refieren al resultado
real implementado y comprobado, no a la aprobación.

- [x] **Logros.** XP y nivel protagonistas, estado del cofre y accesos breves.
  Comprobar también cero XP, juego desactivado y recompensa ajustada/reclamada.
- [x] **Avisos.** Progreso y volumen claros, configuraciones por grupos.
  Comprobar silencio, aviso desactivado y archivos de audio personalizados.
- [x] **Restaurar respaldo.** Comparación antes/después y alcance visible.
  Conservar copia previa, cancelación y rechazo de datos inválidos.
- [x] **Disponibilidad automática — tool web.** Próxima acción y espera claras.
  Comprobar conexión pendiente/antigua, pausa manual, horario y descansos.
- [x] **Ganancias.** Total y componentes distinguibles; conversión debajo.
  Comprobar moneda intercambiada, cero y estimación de una llamada activa.
- [x] **Higher Rate.** Bono, ventana y elegibilidad claros. Mantener separadas
  la limpieza que conserva bonos y la corrección con recálculo confirmado.
- [x] **Proyección.** Proyección y ritmo necesario diferenciados, importes
  sin cortes y supuestos consultables; comprobar días sin registros.
- [x] **Popup — extensión de Chrome.** Vinculación, pausa y cola comprensibles.
  Comprobar eventos pendientes/vencidos, desconexión y opciones desplegadas.
- [x] **Confirmación de horario.** Antes/después, días y alcance claros.
  Conservar registros reales y las reglas del desplazamiento del turno.
- [x] **Meta desde Finanzas.** Meta actual/propuesta y cálculo consultable.
  Conservar la distinción entre cambiar una meta y reservar dinero.
- [x] **Borrar cuenta.** Alcance, respaldo y carácter irreversible visibles.
  Conservar confirmación final y la información de retención necesaria.

## Cierre de la entrega

Además de las once comprobaciones visuales, registrar las pruebas funcionales
pertinentes, versiones de web y extensión por separado y evidencia de la
publicación. Las capturas deben identificar si son maqueta, aplicación real
o popup con API de Chrome simulada. El listado de 79 mejoras permanece en
`plan-mejoras-integrales.md`; aprobar estas once vistas no cierra sus pendientes.

Evidencia de la entrega preparada: `aprobadas-aplicadas-qa.json` (12 recorridos),
`aprobadas-popup-qa.json` (ambos temas) y `approved-visual-tests.log`
(947 pruebas correctas), fuera de Git. Capturas `aplicado-*` fuera de Git.
La disponibilidad compacta es el ajuste posterior pedido por el propietario.
Publicación verificada en PR #97 y producción del mismo commit. El propietario
confirmó la recarga y el popup 2.3.1.
