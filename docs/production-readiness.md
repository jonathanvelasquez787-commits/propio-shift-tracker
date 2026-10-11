# Criterios de publicación

La versión actual se evalúa como registro personal de turnos, llamadas y
ganancias, con Google como único acceso público. Email/SMTP queda deshabilitado
por decisión del propietario. No exige comprar un dominio ni activar correo.

## Condiciones para publicar

- Ningún fallo reproducido abierto de pérdida de datos, aislamiento, importes
  incorrectos o éxito anunciado después de un guardado rechazado.
- Todas las pruebas pasan, incluyendo PostgreSQL con migraciones y RLS reales,
  simulación cronológica, invariantes independientes y casos de fallo.
- Build, contratos de módulos, controles, ES/EN, extensiones, escaneo de
  credenciales y auditoría de dependencias pasan en CI sobre el commit del PR.
- `main` protegida y publicación por PR; SHA del despliegue y de `/api/health`
  coinciden; páginas y activos responden correctamente con CSP/HSTS y no-store
  en `/app`. Los controles públicos de seguridad pasan 18/18.
- Readiness alojada confirma RLS, privilegios, copias, retención, monitor y
  backup externo. La cuenta conserva su contenido después de publicar.

[production-criteria.json](production-criteria.json) relaciona 17 áreas con
criterios concretos, 56 módulos de navegador/API/librerías y 51 suites con
nombres de regresiones reales. El build rechaza módulos o suites sin asignar y
referencias a pruebas retiradas. Este control comprueba la trazabilidad: no
sustituye las pruebas ni acredita todas las combinaciones de la interfaz.

## Corrección final de guardado

Una escritura rechazada por cuota, tamaño de ajustes o revisión antigua podía
dejar cambios únicamente en memoria mientras la cuenta aún indicaba guardado
en la nube. Ahora el indicador mantiene el motivo del rechazo aunque llegue un
acuse de nube anterior, cambie la conexión o se actualice el texto relativo.
La señal se comparte entre los bundles separados de boot y app, sin escribir
datos ni alterar revisiones de sincronización. Sólo un guardado válido la retira.

Los ajustes que exceden el presupuesto también mantienen el snapshot completo
pendiente: guardar después sólo estado no puede omitir sus llamadas o ajustes.
Una pestaña antigua continúa sin poder reemplazar el disco reciente. Las pruebas
de cuota, presupuesto, reintento completo y dos instancias de módulo cubren
estos contratos. Ese cierre pasó 455 pruebas; el siguiente incidente añadió
cinco regresiones y la suite actual pasa 460 pruebas sin fallos.

El build real se comprobó con backend aislado y cuenta ficticia: rechazar las
escrituras muestra «No se pudo guardar — almacenamiento lleno», conserva la
revisión de nube y deja el cambio en la sesión; permitirlas y guardar después
sube el snapshot pendiente. La interfaz vuelve a «Guardado en la nube» sólo
después del acuse. No se introducen datos de prueba en producción.

## Reinicio completo después de la protección de pestañas

El botón «Borrar todos los datos» eliminaba las tres claves antes de guardar
los valores iniciales. El guardado detectaba ese mismo borrado como una
revisión externa y lo rechazaba. Ahora comprueba la revisión y escribe el
snapshot inicial mediante el escritor completo; si falla, restaura también
el estado en memoria y no anuncia éxito ni abre la bienvenida.

Cinco regresiones cubren reinicio confirmado, cambios externos durante la
confirmación, fallo de escritura con reintento, cancelación y bajas de llamadas
en nube al abrir una sesión nueva. El build real se verificó con una cuenta
ficticia y backend local: exportación recuperable de dos llamadas, confirmación
del reinicio, cero llamadas en servidor y bienvenida con cero llamadas después
de recargar. No se ejecutó el borrado de la cuenta del propietario.

## Evidencia previa que sigue vigente

La siguiente auditoría de controles pasó 500 pruebas y añadió recorridos
con cuenta ficticia y recuperación JSON; ver
[button-audit-2026-10-11.md](button-audit-2026-10-11.md) para correcciones,
inventario, evidencia y límites. Las cifras 455/460 anteriores corresponden
a sus cierres históricos.

La [auditoría del 11 de octubre](auditoria-super-profunda-2026-10-11.md) documenta
los ocho grupos de fallos corregidos, 31 días cronológicos, 161 reconciliaciones,
31 exportaciones/snapshots y 17.000 casos independientes. Esas pruebas vuelven
a ejecutarse en la suite; las capturas de interfaz y ensayos alojados conservan
su fecha original y no se presentan como nuevas sesiones humanas.

La [operación y recuperación](production-recovery.md) documenta copias externas
cifradas diarias, retención de 31 días, recuperación alojada y Google comprobado.
El monitor de Supabase y el de Codex conservan sus funciones distintas.

## Alcance y límites aceptados

- Hay una cuenta Google real disponible. El aislamiento se verifica con
  identidades sintéticas, PostgreSQL y políticas reales, además de la cuenta real.
- Las pruebas de interfaz usan un backend controlado. Adaptación de ancho y
  pruebas del service worker no certifican gestos ni una sesión en cada teléfono.
- Se probó recuperación de contenido, Auth y uso de la app alojada; no se midió
  el tiempo total para aprovisionar infraestructura y cambiar DNS.
- El monitor local depende de Codex y del equipo disponibles. Las copias diarias
  tienen un intervalo de pérdida posible; no ofrecen pérdida cero ni vigilancia
  local cuando el equipo está apagado.
- La posición por nombre en Google es una mejora externa de difusión, no un
  requisito de funcionamiento de la aplicación.

Estos límites no son fallos reproducidos pendientes ni justifican afirmar
ausencia absoluta de bugs. Un incidente nuevo se investiga con su reproducción,
se corrige y se añade a esta misma matriz antes de la próxima publicación.
