# Entrega 642: fases finales del plan

Corte: 22 de octubre de 2026, America/Tegucigalpa. Base `718457d`, web 641 y
extensión 2.3.4 confirmada. Las veinte mejoras restantes están implementadas;
el plan distingue las publicadas en web de las que requieren activar 2.3.5.
La publicación se acredita por CI, commit y lectura del dominio, no por este texto.

Publicación comprobada: [PR #105](https://github.com/jonathanvelasquez787-commits/propio-shift-tracker/pull/105),
main `6266db30531e32422d3438abab2583c561c4f28c`. CI del PR y de main correctos, despliegue
Vercel completado y dominio público `/api/health` con ese SHA y `ok: true`.
Se compararon diez archivos servidos con el build local del mismo commit:
aplicación, vista, detalles, gate, idiomas, cuatro estilos y service worker.
Coinciden sus hashes normalizando únicamente finales de línea. CSP, HSTS y
`no-store` de `/app` comprobados. El plan cierra 16 mejoras web: 75 publicadas,
cuatro de extensión probadas e instaladas pendientes de activación.

La revisión posterior de #105 encontró que una ayuda ya descartada seguía
consumiendo Escape mientras retenía el foco. Se excluye ese estado para que
el segundo Escape llegue al modal padre, con regresión y recorrido compilado.
La frase conserva blanco/negro exactos en todas las paletas, según la decisión
previa del propietario. El cierre de publicación incorpora estas correcciones.

## Cambios y conservación

- **53–60, Logros:** activación reversible ante fallo de guardado, introducción
  plegada, reglas de XP/racha/misiones, cuatro estados del cofre, vista previa
  del equipo sin guardado y con foco estable, pendientes y premios realizados
  juntos, duelo con pausa/reanudación explícita y ciclo identificado en premio
  pendiente o reclamado. [Reglas y evidencia](logros-reglas-y-premios.md).
- **61–62 y 78–79, presentación:** vista esencial configurable y reversible,
  contraste de paletas, fecha/frase en anchos pequeños, mismo estado de llamada
  pendiente en barra y tarjeta, teclado/foco, ayudas táctiles/Escape, reflow y
  movimiento reducido. Modales sobre el menú lateral, conservando avisos encima.
  [Alcance y límites](presentacion-esencial-y-accesibilidad.md).
- **65–66, 70 y 72, cuenta:** Google/correo/usuario claramente separados,
  detalle local/nube/red/caché y reconexión; orden de llamadas independiente de
  su contenido completo al reconocer una subida. Se conservan divergencias
  reales, claves especiales y arrays ordenados de estado. PWA con límites
  visibles y exportación antes de borrar, retención y propietario revalidado.
  [Reproducción y pruebas](cuenta-sincronizacion-y-recuperacion.md).
- **14, 63–64 y 74, compatibilidad:** permiso exclusivo por cuenta con
  vencimiento PostgreSQL, bloqueo de órdenes/lecturas atrasadas, Solo registro,
  componente original de Propio diagnosticado y asistente para preparar otra PC.
  [Arquitectura y pruebas](compatibilidad-instalacion-y-disponibilidad.md).

Se mantienen los registros observados y oficiales, precisión de duración,
umbral personal inclusivo de 40 segundos, reglas monetarias, bonos, reservas,
premios previos, historial, identidad y revisiones. No se restauraron datos
antiguos ni se cambió Auth/SMTP, la organización personal de Windows o el texto
de las notas. Se corrigió la errata `records.aplicación` a `records.tool` en su
guía; el contrato del código no cambió. El plan distingue recargas históricas.

## Verificación

- **1.000 pruebas completas correctas**, 89 suites inventariadas, 34 criterios;
  imports/exports, wiring, idiomas y build correctos. Los fixtures antiguos de
  disponibilidad ahora incluyen observación fechada y permiso explícito; se
  conserva su lógica de pausas/ACW. Tras reiniciar el worker, la primera lectura
  confirma el permiso y una posterior puede cerrar la pausa: no se omite la guarda.
- **12 recorridos Logros** ES/EN, claro/oscuro y 320/390/1200 px: controles
  táctiles, pausa al trabajar, reanudación, ninguna llamada/ganancia/XP laboral
  por jugar, equipo/vista previa sin guardado, premio pausado persistente y
  elección de ciclo guardada una sola vez al recargar.
- **96 combinaciones** ES/EN, claro/oscuro, ocho paletas y 320/640/1280 px:
  vista esencial guardada y restaurada, contraste de tokens, fecha/frase,
  teclado y reflow. **Ocho recorridos adicionales** de llamada pendiente
  comprueban barra/tarjeta, duración congelada y formulario canónico.
- **15 escenarios cuenta/PWA:** doce vistas ES/EN/temas/320/390/1200, perfil,
  local/nube, reconexión, descarga efectiva de JSON y cancelación sin POST de
  borrado; dos conflictos reales de igual conteo conservan ambas versiones;
  uno usa service worker real aislado, reabre sin red, edita y luego sincroniza.
- **Seis contextos de extensión**, ambos temas y 320/400/1000 px: popup y
  asistente reales con API Chrome simulada. Componente ausente explicado,
  Solo registro conserva opciones, configuración persiste y guardar no abre
  ventanas. Popup conserva 400 px habituales y permite reflow a 320 px.
- Migración `20261022224307_automation_availability_lease.sql` aplicada en el
  proyecto Supabase correcto. RLS privado, anon sin ejecución, clientes sin
  acceso directo a la tabla. Ensayo alojado de adquisición, exclusión,
  renovación y vencimiento en transacción con usuario sintético y rollback.
  No se usaron ni alteraron llamadas reales para ese ensayo.
- Instalador Windows `-PlanOnly` probado con acceso/notas sintéticos y C#
  compilado; archivos 2.3.5 instalados con copia de respaldo y hashes
  verificados, conservando `workspace-preferences.json` y almacenamiento Chrome.

Se revisaron los presupuestos de bundles por las funciones y textos ES/EN
añadidos: app principal máximo 825.000 bytes y catálogo inicial 245.000; gate
y detalles conservan sus límites. No se eliminó ningún control de tamaño ni
la separación entre gate, aplicación autenticada y detalles diferidos.

Artefactos fuera de Git: `logros-fase9-qa.json`, `phase10-browser-qa.json`,
`phase10-pending-qa.json`, `phase11-browser-qa.json`, `extension-2.3.5-qa.json`,
`extension-2.3.5-install.json`, capturas y evidencia de producción de 642.

## Activación y límites

**Archivos instalados no equivalen a extensión recargada.** El control de
Windows rechazó Google Chrome con «Computer Use was not approved to use Google
Chrome». Tras cambiar los permisos del entorno, la herramienta detuvo de nuevo
el control porque no pudo verificar la URL actual con suficiente confianza para
aplicar su política. Se suspendieron las acciones de interfaz. No se hizo clic
en Recargar ni se certificó 2.3.5 activa. 2.3.4 sigue
siendo la última confirmación humana. Los puntos 14, 63, 64 y 74 permanecen
probados, con archivos instalados, hasta confirmar la activación; no se anuncian
79 mejoras plenamente publicadas o todo el entorno listo.

Las simulaciones no certifican dos PCs físicas, audibilidad, un lector humano,
otro monitor/reinicio físico, todas las variantes propietarias de Save ni
automatismos con el equipo suspendido. Un cliente antiguo no respeta el lease;
ambas PCs deben actualizarse para la exclusión. Google/SEO, facturación oficial
de segundos y Locize mantienen sus estados externos, sin nuevas solicitudes,
compras o reactivación de automatizaciones.
