# Control visual de las once vistas aprobadas

Aprobación original: «Aprobadas», 20/10/2026. Referencia vigente posterior:
«propio-misma-interfaz.html», aprobada para conservar identidad y distribución.
Los reclamos posteriores de tamaño y azul se corrigieron en 640. Una aprobación
de maqueta no certifica la implementación ni sustituye esta comprobación.

## Resultado actual: web 641 y popup 2.3.4

Inspección de capturas de la aplicación compilada en claro y oscuro, a 320,
390, 1200 y 1800 px. El popup usa su HTML/CSS/JS reales a 400 px, con API de
Chrome simulada. Los datos son ficticios: no se modificaron llamadas reales.
Galería externa: guia-visual-cambios.html, 25 secciones y 59 mejoras.

- [x] **Logros.** Nivel, XP y avance dentro de su panel existente;
  captura achievements. Las reglas de juego no se cambiaron en esta entrega.
- [x] **Avisos.** Próximo aviso, volumen y opciones agrupadas; g21.
  Carga de audio ficticio y revisión del archivo guardado: g22.
- [x] **Restaurar respaldo.** Comparación y alcance antes de confirmar; g18.
  Se abrió la vista previa y se canceló sin sustituir datos.
- [x] **Disponibilidad automática.** Inicio conserva estado breve; preparación
  completa en Ajustes, con intento 2:10 en una línea y horarios consultables; g0.
- [x] **Ganancias.** Desglose día/ciclo dentro del hueco bajo Racha/meta,
  junto a Proyección; g10. Filas compactas, USD y conversión secundaria visibles.
- [x] **Higher Rate.** Bono y elegibilidad en la revisión existente; g11.
  Corrección con vista previa y cancelación: g12. Limpiar conserva bonos.
- [x] **Proyección.** Mantiene su tarjeta; g16. Promedio y ritmo necesario
  diferenciados, supuestos plegados e importes con conversión secundaria.
- [x] **Popup de Chrome.** Conexión, cola y pausa separados; popup-dark/light.
  Opciones desplegadas, cola vencida y botón de reconexión comprobados.
- [x] **Horario.** Vista previa de alcance antes de aplicar; g9.
  Se recorrieron los controles y se canceló la confirmación.
- [x] **Meta desde Finanzas.** Meta actual/propuesta e impacto consultable;
  g15. Se canceló antes de modificar la meta; no se confunde con una reserva.
- [x] **Borrar cuenta.** Alcance, respaldo y advertencia irreversible visibles;
  account. No se ejecutó la eliminación de una cuenta.

La fecha azul de pago aparece a la derecha, con el distintivo del ciclo actual:
pay-dates. El token coincide con weekly-summary.js anterior a 37d8ee9:
var(--accent-blue-2, var(--cyan)). No se usó un azul aproximado de fondo.
Jornada se revisa dentro de Adherencia; Inicio abre el mismo nodo, no una copia.

## Evidencia fuera de Git

Todos los nombres siguientes están dentro de outputs/ del espacio de trabajo:

- cierre-641-capturas.json: ocho contextos, 248 capturas y errores vacíos.
- cierre-641-<vista>-<tema>-<ancho>.png: capturas nativas, no maquetas.
- cierre-641-inspeccion-<tema>-<ancho>.png: hojas de inspección de las once vistas.
- cierre-641-popup-qa.json: interacción del popup y API simulada en ambos temas.
- guia-visual-qa.json: 25 secciones, 59 puntos, imágenes y búsqueda verificadas.
- integrado-640-qa.json: integración de jornada, disposición y azul histórico.
- cierre-641-production.json: commit público y comparación de ocho archivos
  servidos con el build del mismo commit; se genera al verificar la publicación.
- cierre-641-extension-install.json: instalación, respaldo, preferencias y
  worker conservados. No confirma por sí sola una recarga en Chrome.

Las 969 pruebas funcionales pasan. El control visual incluye inspección de las
capturas y recorridos; no se cierra solo por build o ausencia de desbordamiento.
Las veinte mejoras funcionales abiertas siguen en plan-mejoras-integrales.md.
