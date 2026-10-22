# Cierre de los ocho pedidos directos del 22 de octubre

Esta lista responde al reclamo de ocho pedidos dados por cerrados de forma
prematura. No sustituye el inventario de 79 mejoras: 59 publicadas y 20 abiertas.

- [x] **Azul original:** web 640. Fechas de pago recupera la fecha azul a la
  derecha y el distintivo del ciclo; mismo token histórico, recepción manual.
- [x] **Ganancias del ciclo:** web 640. El hueco bajo Racha/meta contiene el
  desglose existente, junto a Proyección; conserva las tarjetas originales.
- [x] **Desglose compacto:** web 640. Día y ciclo juntos, filas compactas y
  ancho útil completo. En móvil se apilan, con sus conversiones.
- [x] **ACW con segundos:** web 639. Hover con inicio/final observado de la
  última llamada, separado del ancla del contador después de una pausa.
- [x] **Galería actual:** web 641. 25 secciones y 59 mejoras, captura vigente,
  ubicación, motivo, configuración y ejemplo; ambas paletas y cuatro anchos.
- [x] **Lenguaje claro:** web 641 y popup 2.3.4. Aplicación, portal y extensión
  diferenciados. Guías con rutas actuales y explicación precisa de segundos.
- [x] **Comprobación visual:** web 641. Once vistas inspeccionadas, recorridos
  reales con datos ficticios, flechas móviles corregidas y evidencia fechada.
- [x] **Guía práctica completa:** web 639, revisada en 641. 79 funciones con
  qué hace, qué se configura y ejemplo; no una lista de nombres.

## Publicación, instalación y activación

La web se publica por la integración Git de Vercel. La comprobación final
externa cierre-641-production.json identifica el commit público y verifica
ocho archivos servidos. PR anteriores: #101 (639) y #102 (640).

Extensión 2.3.4: archivos instalados con respaldo completo; preferencias y
worker conservados. La activación requiere recargarla en Chrome y confirmar
su versión. La copia de archivos no se presenta como recarga confirmada.

## Evidencia y pendientes

Ver [control visual](control-visual-11-vistas.md),
[guía práctica](guia-practica-tool-y-extension.md) y
[plan completo](plan-mejoras-integrales.md). Galería y ZIP se entregan fuera de
Git; no se agregan capturas ni instaladores al repositorio.

Validación: 969 pruebas, ocho contextos compilados en claro/oscuro a
320/390/1200/1800 px, 248 capturas; popup real con API simulada en ambos temas.
La galería verifica sus imágenes, búsqueda y anchos. Siguen abiertas las veinte
mejoras funcionales del plan; este cierre no declara terminada toda la hoja de ruta.
