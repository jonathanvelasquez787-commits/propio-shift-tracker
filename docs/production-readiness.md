# Criterios de publicación

La app se evalúa como registro personal de turnos, llamadas y ganancias, con
Google como único acceso público. Email/SMTP queda deshabilitado por decisión
del propietario. No exige comprar un dominio ni activar correo.

## Condiciones para publicar

- Ningún fallo reproducido abierto de pérdida de datos, aislamiento, importes
  incorrectos o éxito anunciado después de un guardado rechazado.
- Pruebas correctas, incluyendo PostgreSQL local con migraciones y RLS reales,
  simulaciones cronológicas, invariantes independientes y casos de fallo.
- Build, contratos de módulos, controles, ES/EN, extensión activa, escaneo de
  credenciales y auditoría de dependencias correctos en CI sobre el commit del PR.
- `main` protegida y publicación por PR. SHA del despliegue y de `/api/health`
  coincidentes; páginas y activos correctos con CSP/HSTS y no-store en `/app`.
- Para cambios de infraestructura, comprobar además readiness alojada, RLS,
  privilegios, copias, retención y recuperación. Los controles públicos de
  seguridad tienen 18 comprobaciones; registrar cuándo y sobre qué release
  se ejecutan, sin presentar evidencia histórica como una comprobación nueva.

[production-criteria.json](production-criteria.json) relaciona 23 áreas con
criterios concretos, 74 módulos fuente y 69 suites. El build rechaza módulos o
suites sin asignar y referencias a pruebas retiradas. Comprueba trazabilidad;
no sustituye las pruebas ni acredita todas las combinaciones de la interfaz.

## Contratos que deben conservarse

- Cuota, tamaño excesivo o revisión antigua no pueden anunciar guardado exitoso.
  Un acuse de nube anterior no borra un error local posterior. El reintento conserva
  el snapshot completo pendiente, incluidas llamadas y ajustes.
- Las pestañas antiguas no reemplazan un estado más reciente. Borrar todos los
  datos valida la revisión y guarda el snapshot inicial mediante el escritor
  completo; si falla, restaura memoria y no abre una bienvenida de éxito.
- Identidad de cuenta y revisión se revalidan después de operaciones asíncronas.
  Correcciones de llamadas, Higher Rate, Finanzas y premios mantienen persistencia
  atómica y no duplican importes o recompensas.
- Historial oficial y registro automático siguen funcionando al retirar el
  resumen independiente. Se conserva su lógica compartida y sus regresiones.

## Evidencia y operación

La [auditoría del 18 de octubre](auditoria-profunda-2026-10-18.md) registra
reparaciones de persistencia y perfil y sus verificaciones actuales.
La [auditoría del 17 de octubre y sus antecedentes consolidados](auditoria-profunda-2026-10-17.md)
conserva correcciones, evidencia fechada y enlaces inmutables a los diez informes
anteriores. Sus cantidades de pruebas corresponden a sus cierres originales;
no son el resultado de una ejecución actual.

La [operación](production-operations.md) y
[recuperación](production-recovery.md) documentan controles alojados y copias
externas cifradas diarias con retención de 31 días. La actualización autorizada
del 12/10/2026 a PostgreSQL 17.11.0.003 se comprobó entonces con comparación de
contenido, nueve migraciones y nueve tablas con RLS; no implica una comprobación
alojada nueva al editar documentación.

## Alcance y límites aceptados

- Hay una cuenta Google real disponible. El aislamiento también se verifica con
  identidades sintéticas, PostgreSQL local y políticas reales; no equivale a dos
  usuarios humanos en dos dispositivos escribiendo simultáneamente.
- Las pruebas de interfaz usan un backend controlado. Adaptación de ancho y
  pruebas del service worker no certifican gestos ni una sesión en cada teléfono.
- La recuperación de contenido, Auth y uso alojado se ha comprobado; no se midió
  el tiempo total para aprovisionar infraestructura y cambiar DNS.
- El monitor local depende de Codex y del equipo disponibles. Las copias diarias
  tienen un intervalo de pérdida posible; no ofrecen pérdida cero ni vigilancia
  local cuando el equipo está apagado.
- La posición por nombre en Google depende de procesamiento externo y no es un
  requisito de funcionamiento de la aplicación.

Estos límites no acreditan ausencia absoluta de bugs. Cada incidente nuevo se
investiga con su reproducción y regresiones antes de publicarlo.
