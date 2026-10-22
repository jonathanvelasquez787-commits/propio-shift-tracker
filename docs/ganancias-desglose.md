# Desglose de ganancias, moneda y tarifa

Puntos 33–35 del plan integral, en ese orden. App web 626; la extensión
continúa en 2.2.10, sin cambios de permisos ni automatismos.

## Qué muestra

En Reportes → Ganancias del ciclo, el desglose del día y del ciclo ocupa
el espacio bajo Racha y la meta, junto a Proyección. Las tres partes son:

- **Base registrada:** importaciones, montos manuales y registros antiguos sin
  marca de estimación. Registrada no equivale a pago confirmado por Propio.
- **Base estimada en vivo:** llamadas marcadas como estimadas, o llamadas live
  que todavía no tienen una confirmación explícita de pago importado.
- **Higher Rate calculado:** bonos calculados con las ventanas, incluidos los
  conservados en llamadas al limpiar el historial. No modifica el pago base.

El total principal de Inicio suma esas tres partes con el mismo conjunto de
llamadas. No confirma que el dinero se haya recibido.

Una corrección oficial sustituye la estimación y se presenta en base
registrada. El bono se calcula una vez. El día corresponde al día activo; el
ciclo corresponde al seleccionado con Anterior/Actual/Siguiente y sigue
siendo independiente del día activo.

## Moneda y tarifa

Cada importe incluye la moneda secundaria cuando está configurada. El detalle
muestra la tasa manual utilizada; no consulta una cotización externa. El
intercambio de moneda principal conserva la preferencia existente y deja la
equivalencia debajo, en ambas tarjetas, al reabrir la app.

El texto junto a Tasa y moneda explica que la tarifa base calcula nuevas
estimaciones y la meta general. Cambiarla conserva pagos guardados, bonos y
metas especiales. Cambiar la conversión conserva los importes en dólares;
tasa cero o moneda vacía oculta esa conversión.

## Implementación y validación

El detalle reutiliza el patrón visual existente de Finanzas. No agrega
controles financieros ni cambia cálculos, reservas o permisos. La apertura se
recuerda como los demás acordeones. No anuncia de nuevo un contenido idéntico
en cada actualización del reloj.

Los renderizadores de detalle se cargan como un módulo independiente, con el
mismo identificador de publicación y entrada offline. El resumen de Higher
Rate mantiene su composición y cálculos anteriores en ese módulo. Esto reduce
el JavaScript inicial y conserva los presupuestos existentes, también el de
traducciones. Un fallo de descarga no repite solicitudes en cada tick: cerrar
y abrir reintenta sin reutilizar el import fallido que Chrome conserva.

Ocho regresiones nuevas cubren separación de importes, reconciliación,
registros vacíos/negativos antiguos, traducción y moneda, tarifa conservadora,
empaquetado versionado y reintento. La suite completa tiene 854 pruebas.
La comprobación del navegador usa datos ficticios y la app compilada:
ES/EN, claro/oscuro y 320/390/768/1365 px, con día/ciclo, cambio de período,
corrección oficial, consulta de Higher Rate, cambio de moneda persistente,
conversión/tarifa y recarga. También se interrumpe una descarga y se reintenta.
No se modifican llamadas reales, Auth, RLS ni la base alojada.

## Siguiente paso

App 627 completa 36 y 37: [revisión y corrección explícita](higher-rate-revision.md).
«Limpiar historial» conserva los bonos registrados y permanece independiente.
La fase siguiente es recuperación y trazabilidad, en el orden del plan.
