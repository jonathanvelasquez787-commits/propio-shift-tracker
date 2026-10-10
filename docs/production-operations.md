# Operación de producción

## Salud y alertas

`GET /api/health` devuelve solo `ok` y el SHA del despliegue; nunca devuelve claves, cuentas ni detalles de SQL.
Responde 503 si faltan variables, la RPC falla, RLS o permisos no son correctos,
el backup diario lleva más de 26 horas sin éxito, la limpieza más de 20 minutos
sin éxito, falta un backup reciente para una cuenta de más de 26 horas o hay
10 errores de ejecución en 15 minutos. Las comprobaciones están en
`public.production_readiness()`, ejecutable solo por `service_role`.
El endpoint limita consultas mediante caché breve por instancia y deduplica
peticiones simultáneas; esto es un control de coste, no un limitador de login.

`Production health` se ejecuta cada 15 minutos y manualmente. Comprueba salud,
CSP, HSTS y no-store de /app. Una falla marca GitHub Actions en rojo: las
notificaciones dependen de las preferencias de Actions del propietario.
No se ha creado ningún destinatario de correo ni webhook externo.
La planificación de GitHub puede retrasarse; no equivale a vigilancia continua.

## Restauración de una cuenta

La migración 0005 incorpora `restore_user_backup(uuid,date,timestamptz)`.
Solo el operador/backend puede ejecutarla. Se bloquea la fila del usuario y se
requiere su revisión exacta vigente. Una revisión distinta devuelve conflicto.
Se valida el snapshot y las llamadas; borrado, inserción y estado se restauran
en una única transacción. Un error, incluyendo el límite de tamaño de una
llamada, revierte toda la operación. Los triggers mantienen la cuota.

Antes de una recuperación real: identificar cuenta y fecha, guardar una copia
del estado actual y confirmar la pérdida de cambios posteriores con la persona
afectada. Nunca usar una revisión nula para forzar una restauración.
`scripts/verify-recovery.sql` ensaya contenido, cuota, conflicto, rollback y
permisos; su cuenta sintética y sus escrituras se revierten dentro del mismo SQL.

## Copia fuera del proyecto

La copia local cifrada del chat incluye usuarios e identidades de Auth, perfiles,
estado, llamadas y snapshots diarios, excluyendo las cuentas de prueba. Contiene
hashes de contraseñas y datos privados: no subir datos descifrados al repositorio.
El código y las migraciones permanecen en GitHub como parte separada de la
recuperación. La copia de datos no sustituye un pg_dump completo de todos los
esquemas, Storage, configuración de OAuth/SMTP ni secretos de infraestructura.

AES-256-GCM cifra el archivo y la clave queda protegida con Windows DPAPI para
el usuario que lo creó. `scripts/recover-encrypted-backup.mjs` verifica la copia
sin escribir datos descifrados por defecto; un tercer argumento permite exportar
a una ruta nueva. La pérdida del perfil de Windows puede volver irrecuperable la
clave. Una copia portable requiere acordar y guardar una clave de recuperación.
Esta copia es puntual; los snapshots diarios automáticos siguen en Supabase.
El plan Free no incluye los backups diarios de plataforma de los planes de pago.

## Rollback de Vercel

Anotar el deployment READY previo antes de publicar. Usar el rollback de Vercel
hacia ese ID y comprobar la landing y /app. Volver a promover el nuevo deployment
y comprobar /api/health y su SHA. Esto revierte código, no datos ni migraciones:
0005 es aditiva y compatible con la versión anterior. Durante la reversión a
una versión que no tiene /api/health, ese endpoint puede dar 404.
Ante un incidente real, priorizar la versión estable y reparar hacia delante
las migraciones de datos. No restaurar la base completa para revertir código.

## Pruebas alojadas

`scripts/production-smoke.mjs` usa dos cuentas con direcciones reservadas
`pst-production-check-…@example.invalid`; verifica login, renovación, aislamiento,
concurrencia real entre dos conexiones y eliminación por delta. No manda correos
ni usa cuentas reales. Las cuentas se aprovisionan administrativamente:
esta prueba no acredita el formulario público de registro ni entrega de correo.
La entrega de confirmación y recuperación exige un buzón controlado y un envío
expresamente autorizado. Google se comprueba mediante el navegador.

## Control de cambios

main exige `test-and-build`, rama actualizada y resolución de conversaciones.
Se impiden force push y borrado de rama; la regla también se aplica a admins.
Se usan PRs; el propietario único no necesita una aprobación de sí mismo.
Se mantiene el repositorio público por decisión del propietario. En GitHub Free,
volverlo privado desactiva esta protección.

## Evidencia del trabajo del 9 de octubre de 2026

- 402 pruebas locales correctas, build, módulos, traducciones, wiring y ambas extensiones.
- Dos cuentas sintéticas: login directo y de la app por correo/usuario, renovación
  real, lecturas y escrituras ajenas rechazadas, dos conexiones concurrentes
  con una escritura y un conflicto, delta de borrado persistido.
- Cron de backups y retención activo, últimas ejecuciones succeeded y 12 días de snapshots.
- Ensayo SQL de recuperación correcto, incluyendo fallo atómico y rollback del laboratorio.
- Se revocó ejecución innecesaria de handle_new_user y wipe_my_data para anon;
  se fijó search_path de touch_updated_at y slugify_username.
- Google regresó a /app y autenticó la cuenta existente. El dispositivo mostró
  un conflicto previo entre copia local y nube; no se eligió ninguna versión.
- Los avisos restantes de username_available y wipe_my_data autenticado son
  funciones intencionalmente expuestas; tablas internas sin políticas deniegan
  acceso a clientes. La protección de contraseñas filtradas está desactivada.
- SMTP, confirmación/recuperación de correo, carga esperada, dispositivos físicos
  y recuperación de un proyecto completo permanecen sujetos a verificación específica.

Referencias: [backups Supabase](https://supabase.com/docs/guides/platform/backups),
[SMTP para producción](https://supabase.com/docs/guides/auth/auth-smtp),
[avisos de funciones](https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable).
